"use client";

import { useState } from "react";
import { saveTeacherClassroomProfile } from "@/app/teacher/actions";
import { avatarSettings, TeacherAvatar, type TeacherAvatarSettings } from "@/app/teacher/teacher-avatar";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";
import {
  teacherAvatarAccessories, teacherAvatarBeardStyles, teacherAvatarEyeStyles, teacherAvatarFaceShapes, teacherAvatarFemaleHairStyles, teacherAvatarHairColors, teacherAvatarHijabColors, teacherAvatarMoustacheStyles,
  teacherAvatarMaleHairStyles, teacherAvatarNeutralHairStyles, teacherAvatarOutfitColors, teacherAvatarOutfits, teacherAvatarPresentations,
  teacherAvatarSkinTones, teacherClassroomThemes, type TeacherEngagementDocument
} from "@/lib/teacher-engagement";

const labels: Record<string, string> = {
  female: "Woman", male: "Man", neutral: "Neutral", porcelain: "Porcelain", warm: "Warm", golden: "Golden", brown: "Brown", deep: "Deep",
  round: "Round", oval: "Oval", square: "Square", friendly: "Friendly", bright: "Bright", calm: "Calm", wink: "Wink",
  short: "Short", side: "Side sweep", waves: "Waves", curls: "Curls", bun: "Bun", ponytail: "Ponytail", hijab: "Hijab", bald: "Bald", bob: "Bob", pixie: "Pixie", braids: "Braids",
  crop: "Crop", fade: "Clean fade", quiff: "Modern quiff", long: "Long", "cap-hair": "Cap style", "buzz-cut": "Buzz cut", "crew-cut": "Crew cut", "textured-crop": "Textured crop", "classic-part": "Classic side part", pompadour: "Pompadour", "slick-back": "Slick back", "curly-top": "Curly top", "medium-flow": "Medium flow", "small-moustache": "Small moustache", moustache: "Moustache", "small-beard": "Small beard", "full-beard": "Full beard", "long-beard": "Long beard",
  black: "Black", espresso: "Espresso", chestnut: "Chestnut", blonde: "Blonde", violet: "Violet", rose: "Rose",
  blazer: "Blazer", sweater: "Sweater", shirt: "Shirt", dress: "Dress", hoodie: "Hoodie", none: "None", glasses: "Glasses",
  "round-glasses": "Round glasses", headphones: "Headphones", earrings: "Earrings", cap: "Cap", "lead-blue": "LEAD blue", navy: "Navy", teal: "Teal", amber: "Amber",
  "hijab-navy": "Navy", "hijab-rose": "Dusty rose", "hijab-sage": "Sage", "hijab-mocha": "Mocha", "hijab-lavender": "Lavender", "hijab-cream": "Cream", "hijab-black": "Black"
};
const swatches: Record<string, string> = {
  porcelain: "#F8D9C5", warm: "#E9B98F", golden: "#CF8D5D", brown: "#9B5F3F", deep: "#68402F", black: "#17151A", espresso: "#38251F",
  chestnut: "#7B4128", blonde: "#D5A94C", violet: "#6D4ACB", rose: "#DB4F79", "lead-blue": "#2463EB", navy: "#172554", teal: "#0F8B8D", amber: "#E59B24",
  "hijab-navy": "#26345F", "hijab-rose": "#B8757E", "hijab-sage": "#748B78", "hijab-mocha": "#806452", "hijab-lavender": "#8B7CB6", "hijab-cream": "#E8DDC8", "hijab-black": "#24242A"
};
const themeNames: Record<string, string> = { garden: "Garden", ocean: "Ocean", sunset: "Sunset", space: "Space" };

export function AvatarBuilder({ profile }: { profile: TeacherEngagementDocument | null }) {
  const [settings, setSettings] = useState<TeacherAvatarSettings>(() => avatarSettings(profile));
  const [theme, setTheme] = useState(profile?.classroomTheme || "garden");
  const change = (key: keyof TeacherAvatarSettings, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  const hairStyles = settings.avatarPresentation === "female" ? teacherAvatarFemaleHairStyles : settings.avatarPresentation === "male" ? teacherAvatarMaleHairStyles : teacherAvatarNeutralHairStyles;
  const changePresentation = (value: string) => setSettings((current) => ({ ...current, avatarPresentation: value, avatarHairStyle: value === "female" ? "bob" : value === "male" ? "textured-crop" : "short", avatarMoustache: "none", avatarBeard: "none" }));
  return <ActionFeedbackForm action={saveTeacherClassroomProfile} successMessage="Your avatar and classroom have been saved." preserveValuesAfterSubmit className="mt-5 grid gap-6">
    <div className="sticky top-3 z-10 grid place-items-center rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-3 shadow-sm"><TeacherAvatar settings={settings} className="h-56 w-48 drop-shadow-lg" /><p className="-mt-2 rounded-full bg-white px-4 py-1 text-xs font-black text-lead-blue shadow-sm">LIVE PREVIEW</p></div>
    <OptionGroup title="Character" name="avatarPresentation" values={teacherAvatarPresentations} selected={settings.avatarPresentation} onChange={changePresentation} />
    <OptionGroup title="Skin tone" name="avatarSkinTone" values={teacherAvatarSkinTones} selected={settings.avatarSkinTone} onChange={(v) => change("avatarSkinTone", v)} swatch />
    <OptionGroup title="Face shape" name="avatarFaceShape" values={teacherAvatarFaceShapes} selected={settings.avatarFaceShape} onChange={(v) => change("avatarFaceShape", v)} />
    <OptionGroup title="Eyes" name="avatarEyeStyle" values={teacherAvatarEyeStyles} selected={settings.avatarEyeStyle} onChange={(v) => change("avatarEyeStyle", v)} />
    <OptionGroup title={`${labels[settings.avatarPresentation]} hairstyles`} name="avatarHairStyle" values={hairStyles} selected={settings.avatarHairStyle} onChange={(v) => change("avatarHairStyle", v)} />
    {settings.avatarHairStyle === "hijab" ? <><input type="hidden" name="avatarHairColor" value={settings.avatarHairColor} /><OptionGroup title="Hijab color" name="avatarHijabColor" values={teacherAvatarHijabColors} selected={settings.avatarHijabColor} onChange={(v) => change("avatarHijabColor", v)} swatch /></> : <><OptionGroup title="Hair color" name="avatarHairColor" values={teacherAvatarHairColors} selected={settings.avatarHairColor} onChange={(v) => change("avatarHairColor", v)} swatch /><input type="hidden" name="avatarHijabColor" value={settings.avatarHijabColor} /></>}
    {settings.avatarPresentation === "male" ? <><OptionGroup title="Moustache" name="avatarMoustache" values={teacherAvatarMoustacheStyles} selected={settings.avatarMoustache} onChange={(v) => change("avatarMoustache", v)} /><OptionGroup title="Beard" name="avatarBeard" values={teacherAvatarBeardStyles} selected={settings.avatarBeard} onChange={(v) => change("avatarBeard", v)} /></> : <><input type="hidden" name="avatarMoustache" value="none" /><input type="hidden" name="avatarBeard" value="none" /></>}
    <OptionGroup title="Outfit" name="avatarOutfit" values={teacherAvatarOutfits} selected={settings.avatarOutfit} onChange={(v) => change("avatarOutfit", v)} />
    <OptionGroup title="Outfit color" name="avatarOutfitColor" values={teacherAvatarOutfitColors} selected={settings.avatarOutfitColor} onChange={(v) => change("avatarOutfitColor", v)} swatch />
    <OptionGroup title="Accessories" name="avatarAccessory" values={teacherAvatarAccessories} selected={settings.avatarAccessory} onChange={(v) => change("avatarAccessory", v)} />
    <fieldset><legend className="text-sm font-black text-lead-navy">Classroom theme</legend><div className="mt-2 grid grid-cols-2 gap-2">{teacherClassroomThemes.map((value) => <label key={value} className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-bold ${theme === value ? "border-lead-blue bg-blue-50 text-lead-blue" : "border-slate-200"}`}><input type="radio" name="classroomTheme" value={value} checked={theme === value} onChange={() => setTheme(value)} className="sr-only" />{themeNames[value]}</label>)}</div></fieldset>
    <Button type="submit">Save My Avatar</Button>
  </ActionFeedbackForm>;
}

function OptionGroup({ title, name, values, selected, onChange, swatch = false }: { title: string; name: string; values: readonly string[]; selected: string; onChange: (value: string) => void; swatch?: boolean }) {
  return <fieldset><legend className="text-sm font-black text-lead-navy">{title}</legend><div className="mt-2 flex flex-wrap gap-2">{values.map((value) => <label key={value} title={labels[value] || value} className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-xs font-bold transition hover:-translate-y-0.5 ${selected === value ? "border-lead-blue bg-blue-50 text-lead-blue ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-600"}`}><input type="radio" name={name} value={value} checked={selected === value} onChange={() => onChange(value)} className="sr-only" />{swatch ? <span className="mx-auto mb-1 block h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: swatches[value] }} /> : null}{labels[value] || value}</label>)}</div></fieldset>;
}
