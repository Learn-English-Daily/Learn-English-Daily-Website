export const stageNames = ["Price Scanner", "Basket Mission", "Compare Corner", "Talk to the Shopkeeper", "Checkout Rush"];

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
export const comparisons = [
  { left: products[2], right: products[3], question: "The juice costs $4, but I only have $2.", answer: "It's too expensive." },
  { left: products[7], right: products[0], question: "I need a big bottle for my family.", answer: "The water is too small." },
  { left: products[4], right: products[5], question: "I cannot carry the large bag of rice.", answer: "The rice is too heavy." },
  { left: products[2], right: products[6], question: "I need fruit for five students.", answer: "The apple is too small." }
];
export const checkoutOrders = [
  { request: "I want milk and bread, please.", ids: ["milk", "bread"], paid: 10 },
  { request: "Can I have juice and an apple?", ids: ["juice", "apple"], paid: 10 },
  { request: "I want rice and bananas, please.", ids: ["rice", "banana"], paid: 10 }
];
