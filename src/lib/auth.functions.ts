import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loginSchema, namesMatch, normalizeName, normalizePhone } from "./validation";

type Role = "student" | "lecturer";
export type PhoneLoginResult = { ok: true; tokenHash: string; role: Role } | { ok: false; error: string };

const inputSchema = loginSchema.extend({ role: z.enum(["student", "lecturer"]) });
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
      if (data.role === "lecturer") {
        const { data: contact, error } = await supabaseAdmin
          .from("lecturer_contacts")
          .select("lecturer_id, lecturers(id, name, user_id)")
          .eq("phone", phone)
          .maybeSingle();
        if (error) throw error;
        const lecturer = contact?.lecturers;
        if (!lecturer || !namesMatch(lecturer.name, name)) {
          return {
            ok: false,
            error:
              "We couldn't find a lecturer with this name and phone number. Check your details, or ask the college office to add you.",
          };
        }
        const { userId, tokenHash } = await issueSignInToken(supabaseAdmin, "lecturer", phone, lecturer.name);
        if (!lecturer.user_id) {
          await supabaseAdmin.from("lecturers").update({ user_id: userId }).eq("id", lecturer.id).is("user_id", null);
        } else if (lecturer.user_id !== userId) {
          return { ok: false, error: "This lecturer profile is linked to another account. Please contact the college office." };
        }
        return { ok: true, tokenHash, role: "lecturer" };
      }

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
