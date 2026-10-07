export type RestaurantItem = { id: string; name: string; emoji: string; category: "food" | "drink"; article: "a" | "some"; difficulty: number };

export const restaurantItems: RestaurantItem[] = [
  { id: "burger", name: "burger", emoji: "🍔", category: "food", article: "a", difficulty: 1 },
  { id: "pizza", name: "pizza", emoji: "🍕", category: "food", article: "a", difficulty: 1 },
  { id: "fries", name: "fries", emoji: "🍟", category: "food", article: "some", difficulty: 1 },
  { id: "chicken", name: "chicken", emoji: "🍗", category: "food", article: "some", difficulty: 1 },
  { id: "water", name: "water", emoji: "💧", category: "drink", article: "some", difficulty: 1 },
  { id: "juice", name: "juice", emoji: "🧃", category: "drink", article: "some", difficulty: 1 },
  { id: "sandwich", name: "sandwich", emoji: "🥪", category: "food", article: "a", difficulty: 2 },
  { id: "rice", name: "rice", emoji: "🍚", category: "food", article: "some", difficulty: 2 },
  { id: "noodles", name: "noodles", emoji: "🍜", category: "food", article: "some", difficulty: 2 },
  { id: "salad", name: "salad", emoji: "🥗", category: "food", article: "a", difficulty: 2 },
  { id: "soup", name: "soup", emoji: "🥣", category: "food", article: "some", difficulty: 2 },
  { id: "cake", name: "cake", emoji: "🍰", category: "food", article: "some", difficulty: 2 },
  { id: "ice-cream", name: "ice cream", emoji: "🍨", category: "food", article: "some", difficulty: 2 },
  { id: "milk", name: "milk", emoji: "🥛", category: "drink", article: "some", difficulty: 2 },
  { id: "tea", name: "tea", emoji: "🍵", category: "drink", article: "some", difficulty: 2 }
];

export const restaurantStages = ["Order Catch", "Waiter Rush", "Order Builder", "Role-Play", "Dinner Rush"];
export const careerRanks = ["🥉 Trainee", "🍽️ Server", "⭐ Order Expert", "🎤 Restaurant Speaker", "🏆 Restaurant Star"];

export function requestFor(item: RestaurantItem, pattern: "can" | "like" = Math.random() > 0.5 ? "can" : "like") {
  const portion = `${item.article} ${item.name}`;
  return pattern === "can" ? `Can I have ${portion}, please?` : `I'd like ${portion}, please.`;
}

export function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}
