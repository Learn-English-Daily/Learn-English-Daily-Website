export const stageNames = ["Closet Hunt", "Word Tailor", "Style Detective", "Outfit Studio", "Runway Recall"];

export const clothes = [
  { word: "shirt", emoji: "👕", color: "blue" },
  { word: "dress", emoji: "👗", color: "red" },
  { word: "jacket", emoji: "🧥", color: "green" },
  { word: "jeans", emoji: "👖", color: "blue" },
  { word: "shoes", emoji: "👟", color: "white" },
  { word: "hat", emoji: "🧢", color: "yellow" },
  { word: "scarf", emoji: "🧣", color: "red" },
  { word: "socks", emoji: "🧦", color: "purple" }
];

export const scrabbleWords = ["shirt", "dress", "jacket", "jeans", "shoes"];

export const detectiveRounds = [
  { person: "girl" as const, look: [{ word: "dress", color: "red" }, { word: "shoes", color: "white" }], answer: "She is wearing a red dress and white shoes.", choices: ["She is wearing a red dress and white shoes.", "She is wearing blue jeans and a yellow hat.", "He is wearing a green jacket."] },
  { person: "boy" as const, look: [{ word: "jacket", color: "green" }, { word: "jeans", color: "blue" }], answer: "He is wearing a green jacket and blue jeans.", choices: ["He is wearing a yellow shirt.", "He is wearing a green jacket and blue jeans.", "She is wearing a red scarf."] },
  { person: "girl" as const, look: [{ word: "shirt", color: "blue" }, { word: "hat", color: "yellow" }], answer: "She is wearing a blue shirt and a yellow hat.", choices: ["She is wearing a blue shirt and a yellow hat.", "He is wearing white shoes.", "She is wearing a green dress."] },
  { person: "boy" as const, look: [{ word: "scarf", color: "red" }, { word: "shoes", color: "white" }], answer: "He is wearing a red scarf and white shoes.", choices: ["He is wearing purple socks.", "She is wearing blue jeans.", "He is wearing a red scarf and white shoes."] }
];

export const studioMissions = [
  { title: "Rainy-day explorer", need: ["jacket", "jeans", "shoes"], reason: "comfortable" },
  { title: "Sunny park party", need: ["shirt", "hat", "shoes"], reason: "cool" }
];

export const runwayRounds = [
  { look: [{ word: "shirt", color: "blue" }, { word: "hat", color: "yellow" }, { word: "shoes", color: "white" }], answer: "I'm wearing a blue shirt, a yellow hat, and white shoes.", choices: ["I'm wearing a blue shirt, a yellow hat, and white shoes.", "I'm wearing a red dress and a red scarf.", "I'm wearing a green jacket and blue jeans."] },
  { look: [{ word: "jacket", color: "green" }, { word: "jeans", color: "blue" }, { word: "scarf", color: "red" }], answer: "I'm wearing a green jacket, blue jeans, and a red scarf.", choices: ["I'm wearing a yellow hat and white shoes.", "I'm wearing a green jacket, blue jeans, and a red scarf.", "I'm wearing a red dress and purple socks."] },
  { look: [{ word: "dress", color: "red" }, { word: "socks", color: "purple" }, { word: "shoes", color: "white" }], answer: "I'm wearing a red dress, purple socks, and white shoes.", choices: ["I'm wearing a red dress, purple socks, and white shoes.", "I'm wearing a blue shirt, blue jeans, and a yellow hat.", "I'm wearing a green jacket and a red scarf."] }
];
