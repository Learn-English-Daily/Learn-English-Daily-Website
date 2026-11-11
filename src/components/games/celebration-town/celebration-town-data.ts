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
  { key: "birthday", title: "Birthday", local: "Ulang Tahun", colors: [0xec4899, 0x7c3aed, 0xfacc15], icon: "cake", collectibles: ["cake", "balloons", "gift", "invitations", "party hats", "game box"], decorations: ["cake table", "balloon arch", "party chairs"], phrase: "We celebrated a birthday." },
  { key: "eid", title: "Eid al-Fitr", local: "Lebaran", colors: [0x0f766e, 0xfacc15, 0x65a30d], icon: "crescent", collectibles: ["ketupat", "food tray", "lanterns", "invitations", "guest cushions", "welcome sign"], decorations: ["food table", "welcome lanterns", "guest seating"], phrase: "We celebrated Eid al-Fitr." },
  { key: "christmas", title: "Christmas", local: "Natal", colors: [0xb91c1c, 0x16a34a, 0xfacc15], icon: "star", collectibles: ["star lights", "gift", "snack tray", "invitations", "music book", "garland"], decorations: ["star lights", "gift corner", "family tables"], phrase: "We celebrated Christmas." },
  { key: "independence", title: "Independence Day", local: "17 Agustus", colors: [0xdc2626, 0xffffff, 0x2563eb], icon: "flag", collectibles: ["red-white flag", "race sack", "prize box", "invitations", "game rope", "snack basket"], decorations: ["flag gate", "game station", "prize table"], phrase: "We celebrated Indonesian Independence Day." },
  { key: "graduation", title: "Graduation", local: "Hari Kelulusan", colors: [0x1d4ed8, 0xfacc15, 0x7c3aed], icon: "cap", collectibles: ["certificate", "flowers", "camera", "invitations", "speech notes", "ribbon"], decorations: ["certificate table", "photo wall", "speech podium"], phrase: "We celebrated graduation." },
  { key: "festival", title: "Cultural Festival", local: "Festival Budaya", colors: [0xea580c, 0x0891b2, 0xfacc15], icon: "pattern", collectibles: ["drum", "batik display", "food basket", "invitations", "craft box", "stage banner"], decorations: ["food stall", "arts stage", "culture signs"], phrase: "We celebrated an Indonesian cultural festival." }
];

export const levelSpeaking: Record<TownLevel, string[]> = {
  Foundation: ["Name three objects.", "There is… / There are…", "We celebrated…"],
  Confident: ["Describe the venue in 3–4 sentences.", "There was a problem with…", "We fixed it by…"],
  Fluent: ["Explain what happened and how you solved it.", "Compare this celebration with another tradition.", "What makes a celebration meaningful?"]
};

export function themeByKey(key: CelebrationKey) {
  return celebrationThemes.find((theme) => theme.key === key) || celebrationThemes[0];
}
