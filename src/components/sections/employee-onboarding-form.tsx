"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  employeeEmploymentTypeOptions,
  employeeGenderOptions,
  employeeRoleOptions,
  employeeStatusOptions,
  employeeWorkModeOptions
} from "@/lib/employee-onboarding";

const inputClass =
  "focus-ring w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy shadow-sm outline-none transition placeholder:text-slate-400 focus:border-lead-blue";

export function EmployeeOnboardingForm() {
  const [sent, setSent] = useState(false);
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSent(false);
    setGeneratedUsername("");
    setEmployeeId("");
    setError("");
    setSubmitting(true);

    const formData = new FormData(form);
    const payload = {
      fullName: String(formData.get("fullName") || ""),
      preferredName: String(formData.get("preferredName") || ""),
      email: String(formData.get("email") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
      address: String(formData.get("address") || ""),
      cityCountry: String(formData.get("cityCountry") || ""),
      dateOfBirth: String(formData.get("dateOfBirth") || ""),
      gender: String(formData.get("gender") || ""),
      role: String(formData.get("role") || ""),
      employeeStatus: String(formData.get("employeeStatus") || ""),
      employmentType: String(formData.get("employmentType") || ""),
      workMode: String(formData.get("workMode") || ""),
      expectedStartDate: String(formData.get("expectedStartDate") || ""),
      availability: String(formData.get("availability") || ""),
      education: String(formData.get("education") || ""),
      experience: String(formData.get("experience") || ""),
      skills: String(formData.get("skills") || ""),
      languages: String(formData.get("languages") || ""),
      emergencyContactName: String(formData.get("emergencyContactName") || ""),
      emergencyContactRelation: String(formData.get("emergencyContactRelation") || ""),
      emergencyContactPhone: String(formData.get("emergencyContactPhone") || ""),
      idNumber: String(formData.get("idNumber") || ""),
      taxNumber: String(formData.get("taxNumber") || ""),
      bankName: String(formData.get("bankName") || ""),
      bankAccountName: String(formData.get("bankAccountName") || ""),
      bankAccountNumber: String(formData.get("bankAccountNumber") || ""),
      documentLinks: String(formData.get("documentLinks") || ""),
      notes: String(formData.get("notes") || ""),
      consent: formData.get("consent") === "on"
    };

    try {
      const response = await fetch("/api/employee-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; employeeId?: string; username?: string } | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to submit right now. Please try again.");
      }

      form.reset();
      setEmployeeId(result.employeeId || "");
      setGeneratedUsername(result.username || "");
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <FormSection
        eyebrow="Step 1"
        title="Personal Information"
        description="Basic details we need to create the employee record."
      >
        <TextField name="fullName" label="Full legal name" required />
        <TextField name="preferredName" label="Preferred name" />
        <TextField name="email" label="Email address" type="email" required />
        <TextField name="whatsapp" label="WhatsApp / phone number" placeholder="+62..." required />
        <TextArea name="address" label="Full address" rows={3} required />
        <TextField name="cityCountry" label="City / country" placeholder="Example: Jakarta, Indonesia" required />
        <TextField name="dateOfBirth" label="Date of birth" type="date" required />
        <SelectField name="gender" label="Gender" options={employeeGenderOptions} required />
      </FormSection>

      <FormSection
        eyebrow="Step 2"
        title="Role & Work Setup"
        description="Helps LEAD prepare access, schedules, and onboarding tasks."
      >
        <SelectField name="role" label="Role joining as" options={employeeRoleOptions} required />
        <SelectField name="employeeStatus" label="Employee status" options={employeeStatusOptions} defaultValue="Active" required />
        <SelectField name="employmentType" label="Employment type" options={employeeEmploymentTypeOptions} required />
        <SelectField name="workMode" label="Work mode" options={employeeWorkModeOptions} required />
        <TextField name="expectedStartDate" label="Expected start date" type="date" required />
        <TextArea name="availability" label="Availability / working hours" placeholder="Example: Monday-Friday, 4 PM-9 PM Jakarta time" rows={3} required />
      </FormSection>

      <FormSection
        eyebrow="Step 3"
        title="Experience & Documents"
        description="Optional, but useful for teacher/admin placement and internal records."
      >
        <TextArea name="education" label="Education / certifications" rows={3} />
        <TextArea name="experience" label="Previous work experience" rows={3} />
        <TextArea name="skills" label="Skills / tools" placeholder="Example: teaching kids, Google Workspace, Canva, Zoom" rows={3} />
        <TextField name="languages" label="Languages spoken" placeholder="Example: English, Bahasa Indonesia" />
        <TextField name="idNumber" label="National ID / passport / KTP number" />
        <TextField name="taxNumber" label="Tax / NPWP number" />
        <TextArea name="documentLinks" label="Document links" placeholder="Paste Google Drive links for CV, ID, certificates, etc." rows={3} />
      </FormSection>

      <FormSection
        eyebrow="Step 4"
        title="Emergency & Payment Details"
        description="Used only for company records and employee payments."
      >
        <TextField name="emergencyContactName" label="Emergency contact name" required />
        <TextField name="emergencyContactRelation" label="Emergency contact relationship" required />
        <TextField name="emergencyContactPhone" label="Emergency contact phone" required />
        <TextField name="bankName" label="Bank name" />
        <TextField name="bankAccountName" label="Bank account name" />
        <TextField name="bankAccountNumber" label="Bank account number" />
        <TextArea name="notes" label="Notes for LEAD admin" rows={3} />
      </FormSection>

      <label className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-lead-navy">
        <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-lead-blue" />
        <span>I confirm this information is correct and allow LEAD to store it for employee onboarding and internal records.</span>
      </label>

      <Button type="submit" size="lg" disabled={submitting} className="w-full rounded-xl sm:w-auto">
        <Send className="h-4 w-4" />
        {submitting ? "Submitting..." : "Submit Employee Form"}
      </Button>

      {sent ? (
        <p className="flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Thank you. Your employee onboarding form has been submitted to LEAD.
            {employeeId ? <span className="block text-lead-navy">Your employee ID: {employeeId}</span> : null}
            {generatedUsername ? <span className="block text-lead-navy">Your username: {generatedUsername}</span> : null}
          </span>
        </p>
      ) : null}
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}
    </form>
  );
}

function FormSection({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-lead-blue">{eyebrow}</p>
        <h2 className="mt-2 font-heading text-xl font-extrabold text-lead-navy">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-lead-gray">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({
  name,
  label,
  required,
  placeholder,
  type = "text"
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: "date" | "email" | "text";
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-lead-navy">
      <span>
        {label} {required ? <span className="text-lead-blue">*</span> : null}
      </span>
      <input required={required} name={name} type={type} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

function TextArea({
  name,
  label,
  required,
  placeholder,
  rows
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  rows: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-lead-navy md:col-span-2">
      <span>
        {label} {required ? <span className="text-lead-blue">*</span> : null}
      </span>
      <textarea required={required} name={name} rows={rows} placeholder={placeholder} className={`${inputClass} resize-y`} />
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
  required,
  defaultValue = ""
}: {
  name: string;
  label: string;
  options: readonly string[];
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-lead-navy">
      <span>
        {label} {required ? <span className="text-lead-blue">*</span> : null}
      </span>
      <select required={required} name={name} defaultValue={defaultValue} className={inputClass}>
        <option value="" disabled>
          Choose an option
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
