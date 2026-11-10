import { defaultTeacherAvatar, teacherAvatarFemaleHairStyles, teacherAvatarMaleHairStyles, teacherAvatarNeutralHairStyles, type TeacherEngagementDocument } from "@/lib/teacher-engagement";

const skinColors: Record<string, string> = { porcelain: "#F8D9C5", warm: "#E9B98F", golden: "#CF8D5D", brown: "#9B5F3F", deep: "#68402F" };
const hairColors: Record<string, string> = { black: "#17151A", espresso: "#38251F", chestnut: "#7B4128", blonde: "#D5A94C", violet: "#6D4ACB", rose: "#BE4770" };
const hijabColors: Record<string, string> = { "hijab-navy": "#26345F", "hijab-rose": "#B8757E", "hijab-sage": "#748B78", "hijab-mocha": "#806452", "hijab-lavender": "#8B7CB6", "hijab-cream": "#E8DDC8", "hijab-black": "#24242A" };
const outfitColors: Record<string, string> = { "lead-blue": "#2463EB", navy: "#172554", teal: "#0F8B8D", rose: "#DB4F79", violet: "#7447D6", amber: "#E59B24" };

export function avatarSettings(profile?: TeacherEngagementDocument | null) {
  const presentation = profile?.avatarPresentation || defaultTeacherAvatar.avatarPresentation;
  const compatibleHair = presentation === "female" ? teacherAvatarFemaleHairStyles : presentation === "male" ? teacherAvatarMaleHairStyles : teacherAvatarNeutralHairStyles;
  const savedHair = profile?.avatarHairStyle || "";
  return {
    avatarPresentation: presentation,
    avatarSkinTone: profile?.avatarSkinTone || defaultTeacherAvatar.avatarSkinTone,
    avatarFaceShape: profile?.avatarFaceShape || defaultTeacherAvatar.avatarFaceShape,
    avatarEyeStyle: profile?.avatarEyeStyle || defaultTeacherAvatar.avatarEyeStyle,
    avatarHairStyle: compatibleHair.includes(savedHair as never) ? savedHair : presentation === "female" ? "bob" : presentation === "male" ? "crop" : defaultTeacherAvatar.avatarHairStyle,
    avatarHairColor: profile?.avatarHairColor || defaultTeacherAvatar.avatarHairColor,
    avatarHijabColor: profile?.avatarHijabColor || defaultTeacherAvatar.avatarHijabColor,
    avatarFacialHair: profile?.avatarFacialHair || defaultTeacherAvatar.avatarFacialHair,
    avatarOutfit: profile?.avatarOutfit || defaultTeacherAvatar.avatarOutfit,
    avatarOutfitColor: profile?.avatarOutfitColor || defaultTeacherAvatar.avatarOutfitColor,
    avatarAccessory: profile?.avatarAccessory && profile.avatarAccessory !== "✨" ? profile.avatarAccessory : defaultTeacherAvatar.avatarAccessory
  };
}

export type TeacherAvatarSettings = ReturnType<typeof avatarSettings>;

export function TeacherAvatar({ settings, className = "h-60 w-52" }: { settings: TeacherAvatarSettings; className?: string }) {
  const skin = skinColors[settings.avatarSkinTone] || skinColors.golden;
  const hair = hairColors[settings.avatarHairColor] || hairColors.espresso;
  const hijabColor = hijabColors[settings.avatarHijabColor] || hijabColors["hijab-navy"];
  const outfit = outfitColors[settings.avatarOutfitColor] || outfitColors["lead-blue"];
  const round = settings.avatarFaceShape === "round";
  const square = settings.avatarFaceShape === "square";
  const hijab = settings.avatarHairStyle === "hijab";
  const bald = settings.avatarHairStyle === "bald";
  const glasses = settings.avatarAccessory === "glasses" || settings.avatarAccessory === "round-glasses";
  const male = settings.avatarPresentation === "male";
  const female = settings.avatarPresentation === "female";
  return <svg viewBox="0 0 240 280" className={className} role="img" aria-label={`Custom ${settings.avatarPresentation} teacher avatar`}>
    <ellipse cx="120" cy="264" rx="92" ry="12" fill="#172554" opacity=".12" />
    {["ponytail", "long"].includes(settings.avatarHairStyle) ? <ellipse cx="188" cy="116" rx="28" ry="46" fill={hair} /> : null}
    {settings.avatarHairStyle === "bun" ? <circle cx="120" cy="39" r="29" fill={hair} /> : null}
    <path d={settings.avatarOutfit === "hoodie" ? "M38 272c4-71 34-90 82-90s78 19 82 90z" : "M29 272c7-69 41-88 91-88s84 19 91 88z"} fill={outfit} />
    {settings.avatarOutfit === "blazer" ? <><path d="M52 205l46 67H39c1-31 5-52 13-67zm136 0l-46 67h59c-1-31-5-52-13-67z" fill="#fff" opacity=".22"/><path d="M98 190l22 26 22-26-6 82h-32z" fill="#fff"/></> : null}
    {settings.avatarOutfit === "shirt" ? <path d="M93 186l27 26 27-26-9 43h-36z" fill="#fff" /> : null}
    {settings.avatarOutfit === "sweater" ? <path d="M92 190q28 25 56 0v20q-28 25-56 0z" fill="#fff" opacity=".35" /> : null}
    {settings.avatarOutfit === "dress" ? <path d="M95 185l25 31 25-31 12 87H83z" fill="#fff" opacity=".2" /> : null}
    {settings.avatarOutfit === "hoodie" ? <path d="M73 208q47-42 94 0" fill="none" stroke="#fff" strokeWidth="8" opacity=".25" /> : null}
    <path d="M102 174h36v31q-18 14-36 0z" fill={skin} />
    {hijab ? <><path d="M53 111q0-86 67-86t67 86l9 126q-35-28-57-30-19 14-38 0-22 2-57 30z" fill={hijabColor}/><path d="M50 189q30-23 55-14l15 20 15-20q25-9 55 14l12 83H38z" fill={hijabColor}/></> : null}
    {!hijab && !bald && !male ? <ellipse cx="120" cy="104" rx="67" ry="73" fill={hair} /> : null}
    {!hijab ? <><ellipse cx="58" cy="121" rx="13" ry="18" fill={skin} /><ellipse cx="182" cy="121" rx="13" ry="18" fill={skin} /></> : null}
    {male ? <path d={square ? "M66 59h108v91q-13 38-54 43-41-5-54-43z" : "M64 58h112v91q-17 40-56 44-39-4-56-44z"} fill={skin} /> : <rect x={square ? 66 : 62} y="58" width={square ? 108 : 116} height="127" rx={round ? 55 : square ? 33 : 48} fill={skin} />}
    {hijab ? <><path fill={hijabColor} fillRule="evenodd" d="M120 25q-68 0-68 91v91q25-19 48-13l20 17 20-17q23-6 48 13v-91q0-91-68-91zm0 27q-47 0-47 66 0 56 47 69 47-13 47-69 0-66-47-66z"/><path d="M70 83q15-42 50-42 35 0 50 42" fill="none" stroke="#fff" strokeWidth="5" opacity=".18" strokeLinecap="round"/><path d="M57 174q25-17 45 4m81-4q-25-17-45 4" fill="none" stroke="#fff" strokeWidth="4" opacity=".14" strokeLinecap="round"/></> : null}
    {!hijab && !bald && settings.avatarHairStyle === "short" ? <path d="M61 101c-2-49 25-72 59-72 42 0 65 30 59 76-20-6-36-21-45-42-18 23-41 34-73 38z" fill={hair} /> : null}
    {!hijab && !bald && settings.avatarHairStyle === "side" ? <path d="M60 104c-1-50 22-76 61-76 40 0 62 29 59 74-29-7-49-26-58-49-16 28-36 42-62 51z" fill={hair} /> : null}
    {!hijab && !bald && settings.avatarHairStyle === "waves" ? <path d="M59 112c-7-47 16-84 61-84 48 0 68 41 60 91-11-17-20-32-28-48-22 25-48 37-78 38z" fill={hair} /> : null}
    {!hijab && !bald && settings.avatarHairStyle === "curls" ? <g fill={hair}>{[72,94,118,143,166].map((x,i)=><circle key={x} cx={x} cy={i%2?51:61} r="22"/>)}<circle cx="63" cy="87" r="20"/><circle cx="177" cy="87" r="20"/></g> : null}
    {!hijab && !bald && ["bun","ponytail"].includes(settings.avatarHairStyle) ? <path d="M61 102c0-48 24-74 59-74s59 26 59 74c-23-8-42-26-52-49-17 26-38 42-66 49z" fill={hair} /> : null}
    {settings.avatarHairStyle === "bob" ? <path d="M59 112c-4-54 18-84 61-84s65 30 61 84v48l-18-18V89q-21-5-43-34-20 29-44 37v50l-17 18z" fill={hair} /> : null}
    {settings.avatarHairStyle === "pixie" ? <path d="M61 99q1-70 59-70 49 0 59 59-24-8-41-36-30 31-77 47z" fill={hair} /> : null}
    {settings.avatarHairStyle === "braids" ? <><path d="M61 99q1-70 59-70t59 70q-29-9-50-43-24 32-68 43z" fill={hair}/><path d="M66 91q-20 45-6 91m114-91q20 45 6 91" fill="none" stroke={hair} strokeWidth="16" strokeLinecap="round" strokeDasharray="10 5"/></> : null}
    {settings.avatarHairStyle === "crop" ? <path d="M65 83q8-55 55-55t55 55q-54-18-110 0z" fill={hair} /> : null}
    {settings.avatarHairStyle === "fade" ? <path d="M67 86q2-57 53-57 49 0 53 57-25-15-53-16-28 1-53 16z" fill={hair} /> : null}
    {settings.avatarHairStyle === "quiff" ? <path d="M63 91q0-54 42-62 38-26 72 12-21 2-34 18 25 4 34 30-31-18-57-18-28 1-57 20z" fill={hair} /> : null}
    {settings.avatarHairStyle === "long" ? <path d="M60 108q-5-80 60-80t60 80q-27-12-52-51-25 33-68 51z" fill={hair} /> : null}
    {settings.avatarHairStyle === "cap-hair" ? <path d="M63 91q4-62 57-62t57 62q-57-20-114 0z" fill={hair} /> : null}
    {settings.avatarEyeStyle === "calm" ? <><path d="M82 119q13 12 26 0" fill="none" stroke="#34251F" strokeWidth="5" strokeLinecap="round"/><path d="M132 119q13 12 26 0" fill="none" stroke="#34251F" strokeWidth="5" strokeLinecap="round"/></> : <><ellipse cx="95" cy="121" rx={settings.avatarEyeStyle === "bright" ? 8 : 6} ry={settings.avatarEyeStyle === "bright" ? 10 : 8} fill="#34251F"/><ellipse cx="145" cy="121" rx={settings.avatarEyeStyle === "bright" ? 8 : 6} ry={settings.avatarEyeStyle === "bright" ? 10 : 8} fill="#34251F"/>{settings.avatarEyeStyle === "wink" ? <path d="M134 120q11 10 22 0" fill="none" stroke={skin} strokeWidth="14"/> : null}</>}
    {female ? <><path d="M79 108q16-10 31 0M130 108q16-10 31 0" fill="none" stroke={hair} strokeWidth="3" strokeLinecap="round"/><path d="M87 116l-6-5m72 5l6-5" stroke="#34251F" strokeWidth="2"/></> : <path d="M80 108q15-7 29 0M131 108q15-7 29 0" fill="none" stroke={hair} strokeWidth="5" strokeLinecap="round"/>}
    <path d={male ? "M110 142q10 8 20 0" : "M113 143q7 5 14 0"} fill="none" stroke="#9B6049" strokeWidth={male ? 4 : 3} strokeLinecap="round"/><path d={female ? "M98 157q22 18 44 0-22 28-44 0z" : "M96 156q24 24 48 0"} fill={female ? "#C95F70" : "#fff"} stroke="#9B4D55" strokeWidth="3" strokeLinejoin="round"/>
    {male && settings.avatarFacialHair === "small-moustache" ? <path d="M105 151q15-10 30 0-15 8-30 0z" fill={hair}/> : null}
    {male && settings.avatarFacialHair === "moustache" ? <path d="M91 152q15-18 29-3 14-15 29 3-16 14-29 2-13 12-29-2z" fill={hair}/> : null}
    {male && settings.avatarFacialHair === "small-beard" ? <path d="M91 166q29 25 58 0-8 30-29 32-21-2-29-32z" fill={hair} opacity=".95"/> : null}
    {male && settings.avatarFacialHair === "full-beard" ? <path d="M75 146q7 52 45 60 38-8 45-60-11 17-22 22-23 18-46 0-11-5-22-22z" fill={hair} opacity=".96"/> : null}
    {male && settings.avatarFacialHair === "long-beard" ? <path d="M74 145q5 58 46 88 41-30 46-88-16 22-29 25-17 9-34 0-13-3-29-25z" fill={hair} opacity=".97"/> : null}
    {glasses ? <g fill="none" stroke="#26334D" strokeWidth="5"><circle cx="94" cy="121" r={settings.avatarAccessory === "round-glasses" ? 18 : 17}/><circle cx="146" cy="121" r={settings.avatarAccessory === "round-glasses" ? 18 : 17}/><path d="M111 121h18M76 116l-14-5m102 5l14-5"/></g> : null}
    {settings.avatarAccessory === "headphones" ? <g fill="none" stroke="#172554" strokeWidth="9"><path d="M63 122V98q0-57 57-57t57 57v24"/><path d="M59 114v38m122-38v38"/></g> : null}
    {settings.avatarAccessory === "earrings" ? <g fill="#F6BE3B"><circle cx="66" cy="150" r="7"/><circle cx="174" cy="150" r="7"/></g> : null}
    {settings.avatarAccessory === "cap" ? <g fill={outfit}><path d="M61 80q6-53 59-53t59 53z"/><path d="M118 75h78q-12 22-55 12z"/></g> : null}
  </svg>;
}
