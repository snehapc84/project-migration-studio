import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lecturerRegisterSchema, lecturerAccountEmail, loginSchema, namesMatch, normalizeName, normalizePhone, parseIdentifier } from "./validation";

type Role = "student" | "lecturer";
export type PhoneLoginResult = { ok: true; tokenHash: string; role: Role } | { ok: false; error: string };

const inputSchema = loginSchema.extend({ role: z.literal("student") });
const GENERIC_ERROR = "Something went wrong while signing you in. Please try again in a moment.";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

function accountEmail(role: Role, phone: string) {
  return `${role}.${phone}@lecturerconnect.app`;
}

/** Make sure an auth account exists, then mint a one-time sign-in token for it. */
async function issueSignInToken(admin: Admin, role: Role, phone: string, name: string) {
  const email = accountEmail(role, phone);
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name, role },
  });
  if (created.error && created.error.code !== "email_exists" && created.error.status !== 422) {
    throw created.error;
  }
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data.user || !link.data.properties?.hashed_token) {
    throw link.error ?? new Error("Could not create sign-in link");
  }
  await admin
    .from("user_roles")
    .upsert({ user_id: link.data.user.id, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
  return { userId: link.data.user.id, tokenHash: link.data.properties.hashed_token };
}

export const phoneLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<PhoneLoginResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    const name = normalizeName(data.name);

    try {
      const { data: existing, error } = await supabaseAdmin
        .from("students")
        .select("user_id, name")
        .eq("phone", phone)
        .maybeSingle();
      if (error) throw error;
      if (existing && !namesMatch(existing.name, name)) {
        return {
          ok: false,
          error: "This phone number is already registered under a different student name. Please use the name you signed up with.",
        };
      }
      const { userId, tokenHash } = await issueSignInToken(supabaseAdmin, "student", phone, name);
      if (!existing) {
        const { error: insertError } = await supabaseAdmin.from("students").insert({ user_id: userId, name, phone });
        if (insertError && insertError.code !== "23505") throw insertError;
      }
      return { ok: true, tokenHash, role: "student" };
    } catch (err) {
      console.error("phoneLogin failed", err);
      return { ok: false, error: GENERIC_ERROR };
    }
  });

export type RegisterResult = { ok: true; email: string } | { ok: false; error: string };

/** Lecturers create their own password account. A phone that matches a college-listed profile claims it. */
export const registerLecturer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => lecturerRegisterSchema.parse(input))
  .handler(async ({ data }): Promise<RegisterResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const name = normalizeName(data.name);
    const id = parseIdentifier(data.identifier);
    if (!id) return { ok: false, error: "Enter a valid email address or phone number." };
    const email = lecturerAccountEmail(id);

    try {
      let lecturerId: string | null = null;
      if (id.kind === "phone") {
        const { data: contact, error } = await supabaseAdmin
          .from("lecturer_contacts")
          .select("lecturer_id, lecturers(id, name, user_id)")
          .eq("phone", id.value)
          .maybeSingle();
        if (error) throw error;
        const existing = contact?.lecturers;
        if (existing) {
          if (existing.user_id) return { ok: false, error: "An account already exists for this phone number. Please log in instead." };
          if (!namesMatch(existing.name, name)) {
            return { ok: false, error: "This phone number belongs to a listed lecturer with a different name." };
          }
          lecturerId = existing.id;
        }
      }

      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name, role: "lecturer" },
      });
      if (created.error || !created.data.user) {
        if (created.error?.code === "email_exists" || created.error?.status === 422) {
          return { ok: false, error: "An account already exists for this email or phone. Please log in instead." };
        }
        if (created.error?.code === "weak_password") {
          return { ok: false, error: "This password is too weak. Choose a longer, less common password." };
        }
        throw created.error ?? new Error("Could not create account");
      }
      const userId = created.data.user.id;

      if (lecturerId) {
        await supabaseAdmin.from("lecturers").update({ user_id: userId }).eq("id", lecturerId).is("user_id", null);
      } else {
        const { data: row, error } = await supabaseAdmin
          .from("lecturers")
          .insert({ user_id: userId, name, department: "Department not set", designation: "Lecturer" })
          .select("id")
          .single();
        if (error) throw error;
        if (id.kind === "phone") {
          await supabaseAdmin.from("lecturer_contacts").insert({ lecturer_id: row.id, phone: id.value });
        }
      }
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "lecturer" });
      return { ok: true, email };
    } catch (err) {
      console.error("registerLecturer failed", err);
      return { ok: false, error: GENERIC_ERROR };
    }
  });
