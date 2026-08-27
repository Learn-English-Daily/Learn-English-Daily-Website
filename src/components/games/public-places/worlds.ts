import type { GameState, SceneDefinition } from "@/components/games/public-places/game-types";

const always = () => true;

export const scenes: Record<SceneDefinition["id"], SceneDefinition> = {
  home: {
    id: "home", name: "Home", width: 900, height: 600, spawn: { x: 450, y: 390 },
    walls: [
      { x: 0, y: 0, width: 900, height: 36 }, { x: 0, y: 0, width: 36, height: 600 },
      { x: 864, y: 0, width: 36, height: 600 }, { x: 0, y: 564, width: 390, height: 36 }, { x: 510, y: 564, width: 390, height: 36 },
      { x: 95, y: 95, width: 210, height: 105 }, { x: 620, y: 100, width: 165, height: 95 },
      { x: 115, y: 390, width: 160, height: 80 }
    ],
    interactions: [{ id: "home-exit", kind: "door", x: 450, y: 548, label: "Exit home", targetScene: "city", targetSpawn: { x: 800, y: 870 } }]
  },
  city: {
    id: "city", name: "LEAD Town", width: 1800, height: 1200, spawn: { x: 800, y: 870 },
    walls: [
      { x: 0, y: 0, width: 1800, height: 35 }, { x: 0, y: 0, width: 35, height: 1200 }, { x: 1765, y: 0, width: 35, height: 1200 }, { x: 0, y: 1165, width: 1800, height: 35 },
      { x: 105, y: 100, width: 360, height: 250 }, { x: 1280, y: 120, width: 390, height: 250 },
      { x: 1220, y: 735, width: 440, height: 265 }, { x: 610, y: 905, width: 380, height: 225 },
      { x: 110, y: 750, width: 330, height: 250 },
      { x: 535, y: 120, width: 40, height: 90 }, { x: 860, y: 160, width: 42, height: 85 },
      { x: 1020, y: 410, width: 55, height: 70 }, { x: 500, y: 560, width: 55, height: 70 }
    ],
    interactions: [
      { id: "hospital-door", kind: "door", x: 285, y: 370, label: "Enter hospital", targetScene: "hospital", targetSpawn: { x: 450, y: 505 } },
      { id: "library-door", kind: "door", x: 1470, y: 390, label: "Enter library", targetScene: "library", targetSpawn: { x: 450, y: 505 } },
      { id: "supermarket-door", kind: "door", x: 1440, y: 1020, label: "Enter supermarket", targetScene: "supermarket", targetSpawn: { x: 450, y: 505 } },
      { id: "home-door", kind: "door", x: 800, y: 885, label: "Enter home", targetScene: "home", targetSpawn: { x: 450, y: 520 } },
      { id: "park-friend", kind: "npc", x: 805, y: 360, label: "Talk to your friend", visible: always },
      { id: "park-ball", kind: "item", x: 945, y: 510, label: "Pick up the ball", visible: (state: GameState) => !state.ballPlayed && state.inventory.ball === 0 },
      { id: "park-play", kind: "activity", x: 720, y: 500, label: "Play with the ball", visible: (state: GameState) => !state.ballPlayed }
    ]
  },
  supermarket: {
    id: "supermarket", name: "Supermarket", width: 900, height: 600, spawn: { x: 450, y: 505 },
    walls: [
      { x: 0, y: 0, width: 900, height: 34 }, { x: 0, y: 0, width: 34, height: 600 }, { x: 866, y: 0, width: 34, height: 600 }, { x: 0, y: 566, width: 390, height: 34 }, { x: 510, y: 566, width: 390, height: 34 },
      { x: 105, y: 140, width: 170, height: 48 }, { x: 105, y: 285, width: 170, height: 48 },
      { x: 620, y: 140, width: 170, height: 48 }, { x: 620, y: 285, width: 170, height: 48 },
      { x: 335, y: 65, width: 230, height: 60 }
    ],
    interactions: [
      { id: "market-exit", kind: "door", x: 450, y: 548, label: "Exit supermarket", targetScene: "city", targetSpawn: { x: 1440, y: 1055 } },
      { id: "apple", kind: "item", x: 190, y: 215, label: "Pick up an apple", visible: (state) => state.inventory.apples < 2 },
      { id: "milk", kind: "item", x: 700, y: 215, label: "Pick up milk", visible: (state) => state.inventory.milk < 1 },
      { id: "cashier", kind: "npc", x: 450, y: 155, label: "Pay the cashier", visible: (state) => !state.supermarketPaid }
    ]
  },
  library: {
    id: "library", name: "Library", width: 900, height: 600, spawn: { x: 450, y: 505 },
    walls: [
      { x: 0, y: 0, width: 900, height: 34 }, { x: 0, y: 0, width: 34, height: 600 }, { x: 866, y: 0, width: 34, height: 600 }, { x: 0, y: 566, width: 390, height: 34 }, { x: 510, y: 566, width: 390, height: 34 },
      { x: 85, y: 85, width: 70, height: 330 }, { x: 230, y: 85, width: 70, height: 330 },
      { x: 600, y: 110, width: 190, height: 65 }, { x: 570, y: 340, width: 230, height: 75 }
    ],
    interactions: [
      { id: "library-exit", kind: "door", x: 450, y: 548, label: "Exit library", targetScene: "city", targetSpawn: { x: 1470, y: 425 } },
      { id: "librarian", kind: "npc", x: 695, y: 220, label: "Talk to the librarian", visible: (state) => !state.libraryReturned },
      { id: "animal-book", kind: "item", x: 190, y: 455, label: "Take the animal book", visible: (state) => state.libraryReturned && state.inventory.animalBook === 0 }
    ]
  },
  hospital: {
    id: "hospital", name: "Hospital", width: 900, height: 600, spawn: { x: 450, y: 505 },
    walls: [
      { x: 0, y: 0, width: 900, height: 34 }, { x: 0, y: 0, width: 34, height: 600 }, { x: 866, y: 0, width: 34, height: 600 }, { x: 0, y: 566, width: 390, height: 34 }, { x: 510, y: 566, width: 390, height: 34 },
      { x: 80, y: 90, width: 280, height: 65 }, { x: 590, y: 80, width: 210, height: 105 },
      { x: 95, y: 335, width: 190, height: 80 }, { x: 600, y: 350, width: 190, height: 75 }
    ],
    interactions: [
      { id: "hospital-exit", kind: "door", x: 450, y: 548, label: "Exit hospital", targetScene: "city", targetSpawn: { x: 285, y: 410 } },
      { id: "medicine", kind: "item", x: 220, y: 205, label: "Pick up the medicine", visible: (state) => !state.medicineCollected },
      { id: "doctor", kind: "npc", x: 690, y: 235, label: "Give medicine to the doctor", visible: (state) => !state.completed.includes("hospital") }
    ]
  }
};
