export type ProfileField = "name" | "age" | "hobby" | "school";

export type NpcProfile = {
  id: string;
  name: string;
  age: number;
  hobby: string;
  school: string;
  pronoun: "He" | "She";
  colors: { shirt: string; hair: string; skin: string };
  position: { x: number; y: number };
};

export const hobbies = ["Football", "Drawing", "Reading", "Dancing", "Singing", "Gaming", "Swimming", "Cooking", "Cycling", "Music"];

export const interviewQuestions: Array<{ field: ProfileField; question: string }> = [
  { field: "name", question: "What is your name?" },
  { field: "age", question: "How old are you?" },
  { field: "hobby", question: "What is your hobby?" },
  { field: "school", question: "Where do you study?" }
];

export const npcProfiles: NpcProfile[] = [
  { id: "alex", name: "Alex", age: 10, hobby: "Football", school: "Green School", pronoun: "He", colors: { shirt: "#16a34a", hair: "#422006", skin: "#d99b72" }, position: { x: 73, y: 62 } },
  { id: "emma", name: "Emma", age: 11, hobby: "Drawing", school: "Sunshine School", pronoun: "She", colors: { shirt: "#db2777", hair: "#713f12", skin: "#f1c7a5" }, position: { x: 48, y: 25 } },
  { id: "leo", name: "Leo", age: 9, hobby: "Reading", school: "Green School", pronoun: "He", colors: { shirt: "#7c3aed", hair: "#1e293b", skin: "#b97850" }, position: { x: 22, y: 67 } },
  { id: "maya", name: "Maya", age: 12, hobby: "Swimming", school: "Bright Future School", pronoun: "She", colors: { shirt: "#0891b2", hair: "#292524", skin: "#c98761" }, position: { x: 82, y: 30 } }
];

export function answerFor(profile: NpcProfile, field: ProfileField) {
  if (field === "name") return `My name is ${profile.name}.`;
  if (field === "age") return `I am ${profile.age} years old.`;
  if (field === "hobby") return `I like ${profile.hobby.toLowerCase()}.`;
  return `I study at ${profile.school}.`;
}

export function introductionFor(profile: NpcProfile) {
  return [
    `This is ${profile.name}.`,
    `${profile.pronoun} is ${profile.age} years old.`,
    `${profile.pronoun} likes ${profile.hobby.toLowerCase()}.`,
    `${profile.pronoun} studies at ${profile.school}.`
  ];
}
