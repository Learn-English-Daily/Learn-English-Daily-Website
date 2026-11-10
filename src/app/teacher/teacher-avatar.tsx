import { defaultTeacherAvatar, type TeacherEngagementDocument } from "@/lib/teacher-engagement";

const skinColors: Record<string, string> = { porcelain: "#F8D9C5", warm: "#E9B98F", golden: "#CF8D5D", brown: "#9B5F3F", deep: "#68402F" };
const hairColors: Record<string, string> = { black: "#17151A", espresso: "#38251F", chestnut: "#7B4128", blonde: "#D5A94C", violet: "#6D4ACB", rose: "#BE4770" };
const outfitColors: Record<string, string> = { "lead-blue": "#2463EB", navy: "#172554", teal: "#0F8B8D", rose: "#DB4F79", violet: "#7447D6", amber: "#E59B24" };

export function avatarSettings(profile?: TeacherEngagementDocument | null) {
  return {
    avatarPresentation: profile?.avatarPresentation || defaultTeacherAvatar.avatarPresentation,
    avatarSkinTone: profile?.avatarSkinTone || defaultTeacherAvatar.avatarSkinTone,
    avatarFaceShape: profile?.avatarFaceShape || defaultTeacherAvatar.avatarFaceShape,
    avatarEyeStyle: profile?.avatarEyeStyle || defaultTeacherAvatar.avatarEyeStyle,
    avatarHairStyle: profile?.avatarHairStyle || defaultTeacherAvatar.avatarHairStyle,
    avatarHairColor: profile?.avatarHairColor || defaultTeacherAvatar.avatarHairColor,
    avatarOutfit: profile?.avatarOutfit || defaultTeacherAvatar.avatarOutfit,
    avatarOutfitColor: profile?.avatarOutfitColor || defaultTeacherAvatar.avatarOutfitColor,
    avatarAccessory: profile?.avatarAccessory && profile.avatarAccessory !== "✨" ? profile.avatarAccessory : defaultTeacherAvatar.avatarAccessory
  };
}

export type TeacherAvatarSettings = ReturnType<typeof avatarSettings>;

export function TeacherAvatar({ settings, className = "h-60 w-52" }: { settings: TeacherAvatarSettings; className?: string }) {
  const skin = skinColors[settings.avatarSkinTone] || skinColors.golden;
  const hair = hairColors[settings.avatarHairColor] || hairColors.espresso;
  const outfit = outfitColors[settings.avatarOutfitColor] || outfitColors["lead-blue"];
  const round = settings.avatarFaceShape === "round";
  const square = settings.avatarFaceShape === "square";
  const hijab = settings.avatarHairStyle === "hijab";
  const bald = settings.avatarHairStyle === "bald";
  const glasses = settings.avatarAccessory === "glasses" || settings.avatarAccessory === "round-glasses";
  return <svg viewBox="0 0 240 280" className={className} role="img" aria-label={`Custom ${settings.avatarPresentation} teacher avatar`}>
    <ellipse cx="120" cy="264" rx="92" ry="12" fill="#172554" opacity=".12" />
    {settings.avatarHairStyle === "ponytail" ? <ellipse cx="188" cy="116" rx="28" ry="46" fill={hair} /> : null}
    {settings.avatarHairStyle === "bun" ? <circle cx="120" cy="39" r="29" fill={hair} /> : null}
    {hijab ? <path d="M57 126c0-64 27-96 63-96s63 32 63 96v77H57z" fill={hair} /> : null}
    <path d={settings.avatarOutfit === "hoodie" ? "M38 272c4-71 34-90 82-90s78 19 82 90z" : "M29 272c7-69 41-88 91-88s84 19 91 88z"} fill={outfit} />
    {settings.avatarOutfit === "blazer" ? <><path d="M52 205l46 67H39c1-31 5-52 13-67zm136 0l-46 67h59c-1-31-5-52-13-67z" fill="#fff" opacity=".22"/><path d="M98 190l22 26 22-26-6 82h-32z" fill="#fff"/></> : null}
    {settings.avatarOutfit === "shirt" ? <path d="M93 186l27 26 27-26-9 43h-36z" fill="#fff" /> : null}
    {settings.avatarOutfit === "sweater" ? <path d="M92 190q28 25 56 0v20q-28 25-56 0z" fill="#fff" opacity=".35" /> : null}
    {settings.avatarOutfit === "dress" ? <path d="M95 185l25 31 25-31 12 87H83z" fill="#fff" opacity=".2" /> : null}
    {settings.avatarOutfit === "hoodie" ? <path d="M73 208q47-42 94 0" fill="none" stroke="#fff" strokeWidth="8" opacity=".25" /> : null}
    <path d="M102 174h36v31q-18 14-36 0z" fill={skin} />
    {!hijab && !bald ? <ellipse cx="120" cy="104" rx="67" ry="73" fill={hair} /> : null}
    <ellipse cx="58" cy="121" rx="13" ry="18" fill={skin} /><ellipse cx="182" cy="121" rx="13" ry="18" fill={skin} />
    <rect x={square ? 66 : 62} y="58" width={square ? 108 : 116} height="127" rx={round ? 55 : square ? 33 : 48} fill={skin} />
    {hijab ? <path d="M65 105c0-46 23-72 55-72s55 26 55 72c-16-13-27-27-34-43-19 23-43 33-76 36z" fill={hair} /> : null}
    {!hijab && !bald && settings.avatarHairStyle === "short" ? <path d="M61 101c-2-49 25-72 59-72 42 0 65 30 59 76-20-6-36-21-45-42-18 23-41 34-73 38z" fill={hair} /> : null}
    {!hijab && !bald && settings.avatarHairStyle === "side" ? <path d="M60 104c-1-50 22-76 61-76 40 0 62 29 59 74-29-7-49-26-58-49-16 28-36 42-62 51z" fill={hair} /> : null}
    {!hijab && !bald && settings.avatarHairStyle === "waves" ? <path d="M59 112c-7-47 16-84 61-84 48 0 68 41 60 91-11-17-20-32-28-48-22 25-48 37-78 38z" fill={hair} /> : null}
    {!hijab && !bald && settings.avatarHairStyle === "curls" ? <g fill={hair}>{[72,94,118,143,166].map((x,i)=><circle key={x} cx={x} cy={i%2?51:61} r="22"/>)}<circle cx="63" cy="87" r="20"/><circle cx="177" cy="87" r="20"/></g> : null}
    {!hijab && !bald && ["bun","ponytail"].includes(settings.avatarHairStyle) ? <path d="M61 102c0-48 24-74 59-74s59 26 59 74c-23-8-42-26-52-49-17 26-38 42-66 49z" fill={hair} /> : null}
    {settings.avatarEyeStyle === "calm" ? <><path d="M82 119q13 12 26 0" fill="none" stroke="#34251F" strokeWidth="5" strokeLinecap="round"/><path d="M132 119q13 12 26 0" fill="none" stroke="#34251F" strokeWidth="5" strokeLinecap="round"/></> : <><ellipse cx="95" cy="121" rx={settings.avatarEyeStyle === "bright" ? 8 : 6} ry={settings.avatarEyeStyle === "bright" ? 10 : 8} fill="#34251F"/><ellipse cx="145" cy="121" rx={settings.avatarEyeStyle === "bright" ? 8 : 6} ry={settings.avatarEyeStyle === "bright" ? 10 : 8} fill="#34251F"/>{settings.avatarEyeStyle === "wink" ? <path d="M134 120q11 10 22 0" fill="none" stroke={skin} strokeWidth="14"/> : null}</>}
    <path d="M113 143q7 5 14 0" fill="none" stroke="#9B6049" strokeWidth="3" strokeLinecap="round"/><path d="M96 156q24 24 48 0" fill="#fff" stroke="#9B4D55" strokeWidth="3" strokeLinejoin="round"/>
    {glasses ? <g fill="none" stroke="#26334D" strokeWidth="5"><circle cx="94" cy="121" r={settings.avatarAccessory === "round-glasses" ? 18 : 17}/><circle cx="146" cy="121" r={settings.avatarAccessory === "round-glasses" ? 18 : 17}/><path d="M111 121h18M76 116l-14-5m102 5l14-5"/></g> : null}
    {settings.avatarAccessory === "headphones" ? <g fill="none" stroke="#172554" strokeWidth="9"><path d="M63 122V98q0-57 57-57t57 57v24"/><path d="M59 114v38m122-38v38"/></g> : null}
    {settings.avatarAccessory === "earrings" ? <g fill="#F6BE3B"><circle cx="66" cy="150" r="7"/><circle cx="174" cy="150" r="7"/></g> : null}
    {settings.avatarAccessory === "cap" ? <g fill={outfit}><path d="M61 80q6-53 59-53t59 53z"/><path d="M118 75h78q-12 22-55 12z"/></g> : null}
  </svg>;
}
