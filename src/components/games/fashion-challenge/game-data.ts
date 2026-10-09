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
  { look: "👧 👗 👟", clue: "red dress + white shoes", answer: "She is wearing a red dress and white shoes.", choices: ["She is wearing a red dress and white shoes.", "She is wearing blue jeans and a hat.", "He is wearing a green jacket."] },
  { look: "👦 🧥 👖", clue: "green jacket + blue jeans", answer: "He is wearing a green jacket and blue jeans.", choices: ["He is wearing a yellow shirt.", "He is wearing a green jacket and blue jeans.", "She is wearing a red scarf."] },
  { look: "👧 👕 🧢", clue: "blue shirt + yellow hat", answer: "She is wearing a blue shirt and a yellow hat.", choices: ["She is wearing a blue shirt and a yellow hat.", "He is wearing white shoes.", "She is wearing a green dress."] },
  { look: "👦 🧣 👟", clue: "red scarf + white shoes", answer: "He is wearing a red scarf and white shoes.", choices: ["He is wearing purple socks.", "She is wearing blue jeans.", "He is wearing a red scarf and white shoes."] }
];

export const studioMissions = [
  { title: "Rainy-day explorer", need: ["jacket", "jeans", "shoes"], reason: "comfortable" },
  { title: "Sunny park party", need: ["shirt", "hat", "shoes"], reason: "cool" }
];

export const runwayRounds = [
  { look: "👕 🧢 👟", answer: "I'm wearing a blue shirt, a yellow hat, and white shoes.", choices: ["I'm wearing a blue shirt, a yellow hat, and white shoes.", "I'm wearing a red dress and a scarf.", "I'm wearing a jacket and jeans."] },
  { look: "🧥 👖 🧣", answer: "I'm wearing a green jacket, blue jeans, and a red scarf.", choices: ["I'm wearing a yellow hat and shoes.", "I'm wearing a green jacket, blue jeans, and a red scarf.", "I'm wearing a blue dress and socks."] },
  { look: "👗 🧦 👟", answer: "I'm wearing a red dress, purple socks, and white shoes.", choices: ["I'm wearing a red dress, purple socks, and white shoes.", "I'm wearing a shirt, jeans, and a hat.", "I'm wearing a green jacket and a scarf."] }
];
