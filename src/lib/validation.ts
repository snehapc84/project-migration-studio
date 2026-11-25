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
