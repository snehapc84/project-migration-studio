import { z } from "zod";

const HONORIFICS = new Set(["dr", "prof", "professor", "mr", "mrs", "ms", "miss", "er", "sir"]);

/** Keep digits only; drop leading zeros and an Indian +91 prefix so "+91 90000 00001" matches "9000000001". */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return digits;
}

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Compare names ignoring case, punctuation and titles such as "Dr." or "Prof.". */
export function nameKey(raw: string): string {
  return normalizeName(raw)
    .toLowerCase()
    .replace(/[.,'’-]/g, " ")
    .split(/\s+/)
    .filter((part) => part && !HONORIFICS.has(part))
    .join(" ");
}

export function namesMatch(a: string, b: string): boolean {
  const ka = nameKey(a);
  return ka.length > 0 && ka === nameKey(b);
}

export const loginSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Please enter your full name." })
    .max(100, { message: "Name must be under 100 characters." })
    .regex(/^[\p{L}][\p{L} .'’-]*$/u, { message: "Name can only contain letters, spaces and . ' -" }),
  phone: z
    .string()
    .trim()
    .min(1, { message: "Please enter your phone number." })
    .refine((v) => /^[0-9+\-\s()]+$/.test(v), { message: "Phone number can only contain digits." })
    .refine(
      (v) => {
        const n = normalizePhone(v);
        return n.length >= 10 && n.length <= 15;
      },
      { message: "Enter a valid phone number (at least 10 digits)." },
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type Identifier = { kind: "email"; value: string } | { kind: "phone"; value: string };

/** An email (lowercased) or a phone number (digits only); null when it is neither. */
export function parseIdentifier(raw: string): Identifier | null {
  const v = raw.trim();
  if (v.includes("@")) {
    const email = v.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? { kind: "email", value: email } : null;
  }
  if (!/^[0-9+\-\s()]+$/.test(v)) return null;
  const phone = normalizePhone(v);
  return phone.length >= 10 && phone.length <= 15 ? { kind: "phone", value: phone } : null;
}

/** Sign-in address for a lecturer account; phone accounts get a private placeholder address. */
export function lecturerAccountEmail(id: Identifier): string {
  return id.kind === "email" ? id.value : `lecturer.${id.value}@phone.lecturerconnect.app`;
}

const nameField = loginSchema.shape.name;
const identifierField = z
  .string()
  .trim()
  .min(1, { message: "Please enter your email or phone number." })
  .refine((v) => parseIdentifier(v) !== null, { message: "Enter a valid email address or phone number." });

export const lecturerLoginSchema = z.object({
  name: nameField,
  identifier: identifierField,
  password: z.string().min(1, { message: "Please enter your password." }),
});

export const lecturerRegisterSchema = z.object({
  name: nameField,
  identifier: identifierField,
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .max(72, { message: "Password must be under 72 characters." }),
});
