"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/content";
import { classModeOptions, classTypeOptions, courseJoinedOptions, englishLevelOptions, learningGoalOptions } from "@/lib/student-registration";
import { getTodayInJakarta } from "@/lib/student-age";

const copy = {
  en: {
    required: "Required",
    choose: "Choose an option",
    sending: "Submitting...",
    submit: "Submit Registration",
    success: "Thank you. The student registration has been received.",
    consent: "I confirm the information is correct and agree to be contacted by LEAD.",
    fields: {
      studentName: "Student Name",
      whatsapp: "WhatsApp Number",
      email: "Email Address",
      parentName: "Parent Name",
      dateOfBirth: "Date of Birth",
      grade: "Grade",
      preferredSchedule: "Preferred Schedule",
      preferredTime: "Preferred Time",
      courseJoined: "Course Joined",
      classType: "Class Type",
      classMode: "Class Mode",
      englishLevel: "Current English Level",
      learningGoal: "Learning Goal",
      countryCity: "Country/City"
    },
    placeholders: {
      whatsapp: "+62...",
      email: "student@example.com",
      grade: "Example: Grade 5",
      preferredSchedule: "Example: Weekdays or weekend",
      preferredTime: "Example: 5 PM Jakarta time",
      countryCity: "Example: Indonesia, Jakarta"
    }
  },
  id: {
    required: "Wajib",
    choose: "Pilih opsi",
    sending: "Mengirim...",
    submit: "Kirim Registrasi",
    success: "Terima kasih. Registrasi siswa sudah diterima.",
    consent: "Saya memastikan informasi sudah benar dan setuju untuk dihubungi oleh LEAD.",
    fields: {
      studentName: "Nama Siswa",
      whatsapp: "Nomor WhatsApp",
      email: "Alamat Email",
      parentName: "Nama Orang Tua",
      dateOfBirth: "Tanggal Lahir",
      grade: "Kelas",
      preferredSchedule: "Jadwal yang Diinginkan",
      preferredTime: "Waktu yang Diinginkan",
      courseJoined: "Kursus yang Diikuti",
      classType: "Tipe Kelas",
      classMode: "Mode Kelas",
      englishLevel: "Level Bahasa Inggris Saat Ini",
      learningGoal: "Tujuan Belajar",
      countryCity: "Negara/Kota"
    },
    placeholders: {
      whatsapp: "+62...",
      email: "siswa@example.com",
      grade: "Contoh: Kelas 5",
      preferredSchedule: "Contoh: Weekdays atau weekend",
      preferredTime: "Contoh: 5 sore WIB",
      countryCity: "Contoh: Indonesia, Jakarta"
    }
  }
} as const;

export function StudentRegistrationForm({ locale }: { locale: Locale }) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const text = copy[locale] ?? copy.en;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSent(false);
    setError("");
    setSubmitting(true);

    const formData = new FormData(form);
    const payload = {
      studentName: String(formData.get("studentName") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
      email: String(formData.get("email") || ""),
      parentName: String(formData.get("parentName") || ""),
      dateOfBirth: String(formData.get("dateOfBirth") || ""),
      grade: String(formData.get("grade") || ""),
      preferredSchedule: String(formData.get("preferredSchedule") || ""),
      preferredTime: String(formData.get("preferredTime") || ""),
      courseJoined: String(formData.get("courseJoined") || ""),
      classType: String(formData.get("classType") || ""),
      classMode: String(formData.get("classMode") || ""),
      englishLevel: String(formData.get("englishLevel") || ""),
      learningGoal: String(formData.get("learningGoal") || ""),
      countryCity: String(formData.get("countryCity") || ""),
      consent: formData.get("consent") === "on",
      locale
    };

    try {
      const response = await fetch("/api/student-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to submit right now. Please try again.");
      }

      form.reset();
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="studentName" label={text.fields.studentName} requiredText={text.required} required />
        <TextField name="whatsapp" label={text.fields.whatsapp} requiredText={text.required} placeholder={text.placeholders.whatsapp} required />
        <TextField name="email" label={text.fields.email} requiredText={text.required} placeholder={text.placeholders.email} type="email" required />
        <TextField name="parentName" label={text.fields.parentName} requiredText={text.required} required />
        <TextField name="dateOfBirth" label={text.fields.dateOfBirth} requiredText={text.required} type="date" max={getTodayInJakarta()} required />
        <TextField name="grade" label={text.fields.grade} requiredText={text.required} placeholder={text.placeholders.grade} required />
        <TextField name="preferredSchedule" label={text.fields.preferredSchedule} requiredText={text.required} placeholder={text.placeholders.preferredSchedule} required />
        <TextField name="preferredTime" label={text.fields.preferredTime} requiredText={text.required} placeholder={text.placeholders.preferredTime} required />
        <TextField name="countryCity" label={text.fields.countryCity} placeholder={text.placeholders.countryCity} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SelectField name="courseJoined" label={text.fields.courseJoined} options={courseJoinedOptions} choose={text.choose} requiredText={text.required} />
        <SelectField name="classType" label={text.fields.classType} options={classTypeOptions} choose={text.choose} requiredText={text.required} />
        <SelectField name="classMode" label={text.fields.classMode} options={classModeOptions} choose={text.choose} requiredText={text.required} />
        <SelectField name="englishLevel" label={text.fields.englishLevel} options={englishLevelOptions} choose={text.choose} requiredText={text.required} />
        <SelectField name="learningGoal" label={text.fields.learningGoal} options={learningGoalOptions} choose={text.choose} requiredText={text.required} />
      </div>

      <label className="flex gap-3 rounded-lg bg-blue-50 p-4 text-sm font-semibold leading-6 text-lead-navy">
        <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-lead-blue" />
        <span>{text.consent}</span>
      </label>

      <Button type="submit" size="lg" disabled={submitting}>
        <Send className="h-4 w-4" />
        {submitting ? text.sending : text.submit}
      </Button>
      {sent ? <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-lead-blue">{text.success}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}
    </form>
  );
}

function TextField({
  name,
  label,
  required,
  requiredText,
  placeholder,
  max,
  type = "text"
}: {
  name: string;
  label: string;
  required?: boolean;
  requiredText?: string;
  placeholder?: string;
  max?: string;
  type?: "date" | "email" | "text";
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-lead-navy">
      <span>
        {label} {required ? <span className="text-lead-blue">* <span className="sr-only">{requiredText}</span></span> : null}
      </span>
      <input
        required={required}
        name={name}
        type={type}
        placeholder={placeholder}
        max={max}
        className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
  choose,
  requiredText
}: {
  name: string;
  label: string;
  options: readonly string[];
  choose: string;
  requiredText: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-lead-navy">
      <span>
        {label} <span className="text-lead-blue">* <span className="sr-only">{requiredText}</span></span>
      </span>
      <select
        required
        name={name}
        defaultValue=""
        className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
      >
        <option value="" disabled>
          {choose}
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
