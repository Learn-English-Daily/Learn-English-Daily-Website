export type ProfessionId = "doctor" | "chef" | "teacher" | "firefighter" | "police" | "pilot" | "programmer" | "veterinarian";

export type Profession = {
  id: ProfessionId;
  name: string;
  workplace: string;
  description: string;
  vocabulary: string[];
  color: string;
  light: string;
  position: { x: number; y: number };
  mission: string;
  steps: Array<{ action: string; item: string; x: number; y: number }>;
};

export const professions: Profession[] = [
  { id: "doctor", name: "Doctor", workplace: "Hospital", description: "A doctor helps sick people.", vocabulary: ["doctor", "hospital", "patient", "medicine", "help"], color: "#0284c7", light: "#e0f2fe", position: { x: 15, y: 20 }, mission: "Help the patient!", steps: [{ action: "Pick up the stethoscope", item: "Stethoscope", x: 20, y: 72 }, { action: "Walk to the patient", item: "Patient", x: 73, y: 66 }, { action: "Check the patient", item: "Check", x: 73, y: 66 }, { action: "Find the medicine", item: "Medicine", x: 78, y: 25 }, { action: "Give medicine to the patient", item: "Patient", x: 73, y: 66 }] },
  { id: "chef", name: "Chef", workplace: "Restaurant", description: "A chef cooks food.", vocabulary: ["chef", "restaurant", "kitchen", "food", "cook", "customer"], color: "#ea580c", light: "#ffedd5", position: { x: 39, y: 20 }, mission: "Help the chef prepare a meal!", steps: [{ action: "Find the apple", item: "Apple", x: 18, y: 68 }, { action: "Find the egg", item: "Egg", x: 38, y: 28 }, { action: "Find the tomato", item: "Tomato", x: 70, y: 70 }, { action: "Bring ingredients to the kitchen", item: "Kitchen", x: 82, y: 25 }, { action: "Cook the food", item: "Pan", x: 82, y: 25 }, { action: "Serve the customer", item: "Customer", x: 25, y: 24 }] },
  { id: "teacher", name: "Teacher", workplace: "School", description: "A teacher teaches students.", vocabulary: ["teacher", "school", "student", "book", "classroom", "teach"], color: "#7c3aed", light: "#ede9fe", position: { x: 63, y: 20 }, mission: "Help the teacher prepare the class!", steps: [{ action: "Pick up the books", item: "Books", x: 18, y: 72 }, { action: "Give books to students", item: "Students", x: 70, y: 68 }, { action: "Go to the board", item: "Board", x: 78, y: 22 }, { action: "Place the word LEARN on the board", item: "LEARN", x: 78, y: 22 }, { action: "Find the student's pencil", item: "Pencil", x: 35, y: 28 }] },
  { id: "firefighter", name: "Firefighter", workplace: "Fire Station", description: "A firefighter helps people and puts out fires.", vocabulary: ["firefighter", "fire", "fire station", "truck", "hose", "helmet"], color: "#dc2626", light: "#fee2e2", position: { x: 87, y: 20 }, mission: "Help the firefighter!", steps: [{ action: "Pick up the helmet", item: "Helmet", x: 18, y: 25 }, { action: "Pick up the hose", item: "Hose", x: 30, y: 72 }, { action: "Enter the fire truck", item: "Fire Truck", x: 68, y: 68 }, { action: "Travel to the safe practice fire", item: "Practice Fire", x: 82, y: 25 }, { action: "Use the hose to put out the fire", item: "Practice Fire", x: 82, y: 25 }] },
  { id: "police", name: "Police Officer", workplace: "Police Station", description: "A police officer helps keep people safe.", vocabulary: ["police officer", "police station", "safe", "help", "road", "traffic"], color: "#1d4ed8", light: "#dbeafe", position: { x: 15, y: 78 }, mission: "Help a pedestrian cross safely!", steps: [{ action: "Find the police officer", item: "Officer", x: 20, y: 25 }, { action: "Pick up the safety sign", item: "Safety Sign", x: 30, y: 70 }, { action: "Walk to the crossing", item: "Crossing", x: 72, y: 67 }, { action: "Stop the traffic", item: "Traffic", x: 72, y: 67 }, { action: "Help the pedestrian cross", item: "Pedestrian", x: 82, y: 25 }] },
  { id: "pilot", name: "Pilot", workplace: "Airport", description: "A pilot flies an airplane.", vocabulary: ["pilot", "airplane", "airport", "passenger", "fly", "travel"], color: "#0f766e", light: "#ccfbf1", position: { x: 39, y: 78 }, mission: "Prepare the airplane for takeoff!", steps: [{ action: "Find the pilot area", item: "Pilot Area", x: 18, y: 28 }, { action: "Put on the pilot cap", item: "Pilot Cap", x: 28, y: 70 }, { action: "Enter the airplane", item: "Airplane", x: 70, y: 65 }, { action: "Check the controls", item: "Controls", x: 80, y: 25 }, { action: "Start the airplane", item: "Start", x: 80, y: 25 }, { action: "Follow the flight path", item: "Sky Route", x: 48, y: 20 }] },
  { id: "programmer", name: "Programmer", workplace: "Technology Office", description: "A programmer creates computer programs.", vocabulary: ["programmer", "computer", "code", "program", "keyboard", "technology"], color: "#4f46e5", light: "#e0e7ff", position: { x: 63, y: 78 }, mission: "Program the office robot!", steps: [{ action: "Find the computer", item: "Computer", x: 20, y: 28 }, { action: "Sit at the computer", item: "Chair", x: 20, y: 68 }, { action: "Connect the MOVE code block", item: "MOVE", x: 48, y: 28 }, { action: "Connect the TURN code block", item: "TURN", x: 68, y: 68 }, { action: "Run the program", item: "Robot", x: 82, y: 28 }] },
  { id: "veterinarian", name: "Veterinarian", workplace: "Animal Clinic", description: "A veterinarian helps sick animals.", vocabulary: ["veterinarian", "animal", "clinic", "pet", "medicine", "help"], color: "#059669", light: "#d1fae5", position: { x: 87, y: 78 }, mission: "Help the sick pet feel better!", steps: [{ action: "Find the sick pet", item: "Pet", x: 75, y: 67 }, { action: "Pick up the stethoscope", item: "Stethoscope", x: 18, y: 26 }, { action: "Check the pet", item: "Pet", x: 75, y: 67 }, { action: "Find the medicine", item: "Medicine", x: 82, y: 25 }, { action: "Give medicine to the pet", item: "Pet", x: 75, y: 67 }, { action: "Comfort the pet", item: "Pet", x: 75, y: 67 }] }
];

export const detectiveCases: Array<{ answer: ProfessionId; clues: string[] }> = [
  { answer: "doctor", clues: ["Stethoscope", "Hospital", "Medicine"] },
  { answer: "chef", clues: ["Pan", "Restaurant", "Kitchen"] },
  { answer: "firefighter", clues: ["Fire truck", "Fire", "Hose"] }
];

export const helpCases: Array<{ answer: ProfessionId; situation: string; hint: string }> = [
  { answer: "doctor", situation: "A child is sick. Who can help?", hint: "Think about where sick people go." },
  { answer: "firefighter", situation: "There is a safe practice fire. Who can help?", hint: "Look for the station with the red truck." },
  { answer: "veterinarian", situation: "An animal is sick. Who can help?", hint: "Find the clinic for pets." },
  { answer: "teacher", situation: "Children are learning. Who helps them?", hint: "Look for the school." }
];

export const careerReasons = ["I like helping people.", "I like animals.", "I like cooking.", "I like computers.", "I like teaching.", "I like flying.", "I like traveling.", "I like helping people stay safe."];

export function professionById(id: ProfessionId) {
  return professions.find((profession) => profession.id === id) ?? professions[0];
}
