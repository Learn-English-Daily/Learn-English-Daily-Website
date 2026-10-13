export type Person = { id: string; name: string; gender: "boy" | "girl"; hair: string; hairColor: string; eyes: string; feature: string; accessory: string; shirt: string };

export const stageNames = ["Face Factory", "Who Am I?", "Pronoun Power", "Flash Look", "Guess Who?"];

export const people: Person[] = [
  { id: "maya", name: "Maya", gender: "girl", hair: "long curly hair", hairColor: "black", eyes: "brown eyes", feature: "freckles", accessory: "purple glasses", shirt: "#a855f7" },
  { id: "leo", name: "Leo", gender: "boy", hair: "short straight hair", hairColor: "blond", eyes: "blue eyes", feature: "a big smile", accessory: "a red cap", shirt: "#ef4444" },
  { id: "sara", name: "Sara", gender: "girl", hair: "short curly hair", hairColor: "brown", eyes: "green eyes", feature: "dimples", accessory: "a yellow headband", shirt: "#eab308" },
  { id: "omar", name: "Omar", gender: "boy", hair: "short wavy hair", hairColor: "black", eyes: "brown eyes", feature: "a small moustache", accessory: "round glasses", shirt: "#2563eb" },
  { id: "nina", name: "Nina", gender: "girl", hair: "long straight hair", hairColor: "red", eyes: "blue eyes", feature: "freckles", accessory: "green earrings", shirt: "#10b981" },
  { id: "sam", name: "Sam", gender: "boy", hair: "curly hair", hairColor: "brown", eyes: "green eyes", feature: "dimples", accessory: "a blue cap", shirt: "#0ea5e9" }
];

export function description(person: Person) {
  const pronoun = person.gender === "boy" ? "He" : "She";
  return `${pronoun} has ${person.hairColor} ${person.hair}, ${person.eyes}, and ${person.feature}. ${pronoun} is wearing ${person.accessory}.`;
}
