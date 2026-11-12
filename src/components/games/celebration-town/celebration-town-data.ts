export type TownLevel = "Foundation" | "Confident" | "Fluent";
export type CelebrationKey = "birthday" | "eid" | "christmas" | "independence" | "graduation" | "festival";

export type CelebrationTheme = {
  key: CelebrationKey;
  title: string;
  local: string;
  colors: [number, number, number];
  icon: "cake" | "crescent" | "star" | "flag" | "cap" | "pattern";
  collectibles: string[];
  decorations: string[];
  phrase: string;
};

export const celebrationThemes: CelebrationTheme[] = [
  { key: "birthday", title: "Birthday", local: "Ulang Tahun", colors: [0xec4899, 0x7c3aed, 0xfacc15], icon: "cake", collectibles: ["chocolate birthday cake", "three blue balloons", "red toy-car gift", "six pink invitations", "two yellow party hats", "animal guessing game"], decorations: ["cake table", "blue balloon arch", "colorful party chairs"], phrase: "We celebrated a birthday." },
  { key: "eid", title: "Eid al-Fitr", local: "Lebaran", colors: [0x0f766e, 0xfacc15, 0x65a30d], icon: "crescent", collectibles: ["green ketupat basket", "sweet cookie tray", "two golden lanterns", "six green invitations", "four blue guest cushions", "gold welcome sign"], decorations: ["cookie and food table", "golden welcome lanterns", "green guest seating"], phrase: "We celebrated Eid al-Fitr." },
  { key: "christmas", title: "Christmas", local: "Natal", colors: [0xb91c1c, 0x16a34a, 0xfacc15], icon: "star", collectibles: ["yellow star lights", "blue teddy-bear gift", "gingerbread snack tray", "six red invitations", "Christmas song book", "green leaf garland"], decorations: ["yellow star lights", "red gift corner", "green family tables"], phrase: "We celebrated Christmas." },
  { key: "independence", title: "Independence Day", local: "17 Agustus", colors: [0xdc2626, 0xffffff, 0x2563eb], icon: "flag", collectibles: ["large red-white flag", "brown race sack", "blue toy prize box", "six red-white invitations", "long game rope", "Indonesian snack basket"], decorations: ["red-white flag gate", "outdoor game station", "blue prize table"], phrase: "We celebrated Indonesian Independence Day." },
  { key: "graduation", title: "Graduation", local: "Hari Kelulusan", colors: [0x1d4ed8, 0xfacc15, 0x7c3aed], icon: "cap", collectibles: ["gold achievement certificate", "purple flower bouquet", "black instant camera", "six blue invitations", "short thank-you speech", "wide golden ribbon"], decorations: ["certificate table", "blue photo wall", "gold speech podium"], phrase: "We celebrated graduation." },
  { key: "festival", title: "Cultural Festival", local: "Festival Budaya", colors: [0xea580c, 0x0891b2, 0xfacc15], icon: "pattern", collectibles: ["red kendang drum", "blue batik shirt display", "traditional food basket", "six orange invitations", "wooden craft box", "large culture-stage banner"], decorations: ["traditional food stall", "music and dance stage", "colorful culture signs"], phrase: "We celebrated an Indonesian cultural festival." }
];

export const levelSpeaking: Record<TownLevel, string[]> = {
  Foundation: ["Name three objects.", "There is… / There are…", "We celebrated…"],
  Confident: ["Describe the venue in 3–4 sentences.", "There was a problem with…", "We fixed it by…"],
  Fluent: ["Explain what happened and how you solved it.", "Compare this celebration with another tradition.", "What makes a celebration meaningful?"]
};

export function themeByKey(key: CelebrationKey) {
  return celebrationThemes.find((theme) => theme.key === key) || celebrationThemes[0];
}
