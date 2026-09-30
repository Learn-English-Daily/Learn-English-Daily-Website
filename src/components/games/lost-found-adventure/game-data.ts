export type AccessoryId = "watch" | "bag" | "cap" | "glasses" | "belt" | "scarf";

export type Accessory = {
  id: AccessoryId;
  name: string;
  color: string;
  description: string;
  clues: string[];
  sentence: string;
};

export const accessories: Accessory[] = [
  { id: "watch", name: "watch", color: "#2563eb", description: "You wear it on your wrist.", clues: ["You wear it.", "You wear it on your wrist.", "It can tell you the time."], sentence: "This is my watch." },
  { id: "bag", name: "bag", color: "#f59e0b", description: "You carry your things in it.", clues: ["You carry it.", "You can put things inside it.", "It can carry your books."], sentence: "This is my bag." },
  { id: "cap", name: "cap", color: "#ef4444", description: "You wear it on your head.", clues: ["You wear it.", "You wear it on your head.", "It can shade your face."], sentence: "This is my cap." },
  { id: "glasses", name: "glasses", color: "#7c3aed", description: "You wear them over your eyes.", clues: ["You wear them.", "They sit on your face.", "They can help you see."], sentence: "These are my glasses." },
  { id: "belt", name: "belt", color: "#92400e", description: "You wear it around your waist.", clues: ["You wear it.", "It goes around your waist.", "It can hold your trousers."], sentence: "This is my belt." },
  { id: "scarf", name: "scarf", color: "#ec4899", description: "You wear it around your neck.", clues: ["You wear it.", "It goes around your neck.", "It can keep you warm."], sentence: "This is my scarf." }
];

export const accessoryById = Object.fromEntries(accessories.map((item) => [item.id, item])) as Record<AccessoryId, Accessory>;
export const primaryAccessories = accessories.slice(0, 3);

