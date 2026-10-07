export type FamilyId = "mother" | "father" | "brother" | "sister" | "grandmother" | "grandfather" | "parents" | "grandparents";

export type FamilyMember = {
  id: FamilyId;
  word: string;
  emoji: string;
  pronoun: "he" | "she" | "they";
  sentence: string;
  difficulty: 1 | 2;
};

export const familyMembers: FamilyMember[] = [
  { id: "mother", word: "Mother", emoji: "👩", pronoun: "she", sentence: "She is my mother.", difficulty: 1 },
  { id: "father", word: "Father", emoji: "👨", pronoun: "he", sentence: "He is my father.", difficulty: 1 },
  { id: "brother", word: "Brother", emoji: "👦", pronoun: "he", sentence: "He is my brother.", difficulty: 1 },
  { id: "sister", word: "Sister", emoji: "👧", pronoun: "she", sentence: "She is my sister.", difficulty: 1 },
  { id: "grandmother", word: "Grandmother", emoji: "👵", pronoun: "she", sentence: "She is my grandmother.", difficulty: 2 },
  { id: "grandfather", word: "Grandfather", emoji: "👴", pronoun: "he", sentence: "He is my grandfather.", difficulty: 2 },
  { id: "parents", word: "Parents", emoji: "👩‍❤️‍👨", pronoun: "they", sentence: "They are my parents.", difficulty: 2 },
  { id: "grandparents", word: "Grandparents", emoji: "👵👴", pronoun: "they", sentence: "They are my grandparents.", difficulty: 2 }
];

export const sentenceChallenges = [
  { member: "mother" as FamilyId, sentence: "This is my mother.", words: ["This", "is", "my", "mother"] },
  { member: "father" as FamilyId, sentence: "This is my father.", words: ["This", "is", "my", "father"] },
  { member: "brother" as FamilyId, sentence: "He is my brother.", words: ["He", "is", "my", "brother"] },
  { member: "sister" as FamilyId, sentence: "She is my sister.", words: ["She", "is", "my", "sister"] },
  { member: "grandmother" as FamilyId, sentence: "She is my grandmother.", words: ["She", "is", "my", "grandmother"] }
];

export const stageNames = ["Family Slice", "Family Rush", "Sentence Flight", "Family TV", "Family Escape"];

export function shuffle<T>(values: T[]) {
  return [...values].sort(() => Math.random() - 0.5);
}

export function member(id: FamilyId) {
  return familyMembers.find((item) => item.id === id)!;
}
