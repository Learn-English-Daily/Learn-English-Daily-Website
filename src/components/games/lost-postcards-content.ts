export const levels = ["Foundation", "Confident", "Fluent"];
export const stages = ["Place Rush", "Mystery Place Detective", "Sky Islands", "Postcard Delivery", "Mystery Portal"];
export const places = [
  { name: "Beach", icon: "🏖️", objects: ["🐚", "🌊", "🪁"], clues: ["There is soft sand.", "There are rolling waves.", "A salty breeze drifts across the shore."] },
  { name: "Park", icon: "🌳", objects: ["🌳", "🦆", "🪑"], clues: ["There are many trees.", "There is a pond with ducks.", "People stroll along shaded paths to unwind."] },
  { name: "Library", icon: "📚", objects: ["📚", "📖", "💡"], clues: ["There are shelves of books.", "It is quiet here.", "Visitors borrow stories and read under soft lamps."] },
  { name: "Mountain", icon: "⛰️", objects: ["🪨", "🥾", "🌲"], clues: ["There is a high peak.", "There are steep trails.", "From the summit, the valley looks tiny."] },
  { name: "Café", icon: "☕", objects: ["☕", "🥐", "🪑"], clues: ["There are tables and cups.", "It smells like fresh bread.", "People chat over warm drinks."] },
  { name: "City", icon: "🏙️", objects: ["🏢", "🚌", "🚦"], clues: ["There are tall buildings.", "There are busy roads.", "Traffic and crowds make it feel bustling."] },
  { name: "Garden", icon: "🌷", objects: ["🌷", "🦋", "⛲"], clues: ["There are colorful flowers.", "There is a small fountain.", "Butterflies drift between rows of fragrant plants."] },
  { name: "Playground", icon: "🛝", objects: ["🛝", "⚽", "🎠"], clues: ["There is a slide.", "Children play here.", "Laughter makes this open space feel lively."] },
];
export const rush = [
  { word: "quiet", ids: [5, 2, 7], answer: 2, clue: "Find a place where people keep their voices low." },
  { word: "colorful", ids: [6, 3, 2], answer: 6, clue: "Look for a place filled with flowers of many colors." },
  { word: "bustling", ids: [3, 6, 5], answer: 5, clue: "Look for busy roads, traffic, and people on the move." },
  { word: "breezy", ids: [4, 0, 2], answer: 0, clue: "Find an open shore where you can feel the sea wind." },
  { word: "lively", ids: [2, 7, 3], answer: 7, clue: "Find a place full of movement and children’s laughter." },
];
export const sentences = [
  ["There", "are", "two", "tall", "trees", "in", "the", "park."],
  ["There", "is", "a", "peaceful", "garden", "with", "colorful", "flowers", "near", "my", "house."],
  ["I", "like", "the", "mountains", "because", "the", "quiet", "trails", "help", "me", "relax", "after", "a", "busy", "day."],
];
export const speaking = [
  ["What can you see?", "How does it look?", "My favorite place is… · There is… · There are…"],
  ["Why do you like it?", "What do you do there and how does it make you feel?", "I like this place because… · When I visit, I usually…"],
  ["Describe its atmosphere and share a memory.", "Why should someone else visit?", "This place holds special meaning for me because…"],
];
