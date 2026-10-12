export const stageNames = ["Price Scanner", "Basket Mission", "Toy Claw Shop", "Talk to the Shopkeeper", "Checkout Rush"];

export type Product = { id: string; name: string; emoji: string; price: number; size: "small" | "large" };
export const products: Product[] = [
  { id: "milk", name: "milk", emoji: "🥛", price: 3, size: "large" },
  { id: "bread", name: "bread", emoji: "🍞", price: 2, size: "large" },
  { id: "apple", name: "apple", emoji: "🍎", price: 1, size: "small" },
  { id: "juice", name: "juice", emoji: "🧃", price: 4, size: "small" },
  { id: "rice", name: "rice", emoji: "🍚", price: 5, size: "large" },
  { id: "cookie", name: "cookies", emoji: "🍪", price: 3, size: "small" },
  { id: "banana", name: "bananas", emoji: "🍌", price: 2, size: "large" },
  { id: "water", name: "water", emoji: "💧", price: 1, size: "small" }
];

export const priceRounds = [products[0], products[3], products[4], products[6]];
export const basketLists = [
  { items: ["bread", "apple", "water"], budget: 5 },
  { items: ["milk", "banana", "cookie"], budget: 8 }
];
export const toys = [
  { id: "robot", name: "robot", emoji: "🤖", price: 5 },
  { id: "teddy", name: "teddy bear", emoji: "🧸", price: 4 },
  { id: "kite", name: "kite", emoji: "🪁", price: 3 },
  { id: "ball", name: "ball", emoji: "⚽", price: 2 },
  { id: "train", name: "toy train", emoji: "🚂", price: 6 },
  { id: "puzzle", name: "puzzle", emoji: "🧩", price: 3 }
];
export const toyOrders = [
  { request: "I want the robot. Can I have it, please?", id: "robot" },
  { request: "Can I have the teddy bear, please?", id: "teddy" },
  { request: "I want the kite, please.", id: "kite" },
  { request: "Can I have the ball?", id: "ball" }
];
export const checkoutOrders = [
  { request: "I want milk and bread, please.", ids: ["milk", "bread"], paid: 10 },
  { request: "Can I have juice and an apple?", ids: ["juice", "apple"], paid: 10 },
  { request: "I want rice and bananas, please.", ids: ["rice", "banana"], paid: 10 }
];
