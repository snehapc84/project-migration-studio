import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Lecturer } from "@/lib/queries";
import { Field } from "./TimetableEntryDialog";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100, "Name must be under 100 characters."),
  department: z.string().trim().min(2, "Enter your department.").max(100, "Department must be under 100 characters."),
  designation: z.string().trim().min(2, "Enter your designation.").max(100, "Designation must be under 100 characters."),
});
type Form = z.infer<typeof schema>;

export function EditProfileDialog({
  open,
  onOpenChange,
  lecturer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecturer: Lecturer;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>({ name: "", department: "", designation: "" });
  const [errors, setErrors] = useState<{ [K in keyof Form | "form"]?: string | undefined }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: lecturer.name, department: lecturer.department, designation: lecturer.designation });
      setErrors({});
    }
  }, [open, lecturer]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const i of parsed.error.issues) next[i.path[0] as keyof Form] ??= i.message;
      setErrors(next);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("lecturers").update(parsed.data).eq("id", lecturer.id);
    setSaving(false);
    if (error) {
      setErrors({ form: "Couldn't save your profile. Please try again." });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["lecturers"] });
    toast.success("Profile updated");
    onOpenChange(false);
  }

  const bind = (key: keyof Form) => ({
    value: form[key],
    maxLength: 100,
    "aria-invalid": !!errors[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((x) => ({ ...x, [key]: undefined, form: undefined }));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-navy">Edit profile</DialogTitle>
          <DialogDescription>
            If you change your name, use the new name the next time you log in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Full name" htmlFor="pf-name" error={errors.name}>
            <Input id="pf-name" {...bind("name")} />
          </Field>
          <Field label="Department" htmlFor="pf-dept" error={errors.department}>
            <Input id="pf-dept" {...bind("department")} />
          </Field>
          <Field label="Designation" htmlFor="pf-desig" error={errors.designation}>
            <Input id="pf-desig" {...bind("designation")} />
          </Field>
          {errors.form && (
            <p role="alert" className="rounded-xl bg-absent-soft px-3 py-2 text-sm text-absent-foreground">
              {errors.form}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
