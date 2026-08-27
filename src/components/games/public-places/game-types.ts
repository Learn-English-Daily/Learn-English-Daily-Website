export type SceneId = "home" | "city" | "supermarket" | "library" | "hospital";
export type Direction = "up" | "down" | "left" | "right";
export type MissionId = "supermarket" | "library" | "park" | "hospital";

export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type InteractionKind = "door" | "item" | "npc" | "activity";

export type Interaction = {
  id: string;
  kind: InteractionKind;
  x: number;
  y: number;
  label: string;
  radius?: number;
  targetScene?: SceneId;
  targetSpawn?: Point;
  visible?: (state: GameState) => boolean;
};

export type SceneDefinition = {
  id: SceneId;
  name: string;
  width: number;
  height: number;
  spawn: Point;
  walls: Rect[];
  interactions: Interaction[];
};

export type Inventory = {
  apples: number;
  milk: number;
  libraryBook: number;
  animalBook: number;
  medicine: number;
  ball: number;
};

export type GameState = {
  scene: SceneId;
  player: Point & { direction: Direction; moving: boolean; walkFrame: number };
  inventory: Inventory;
  money: number;
  completed: MissionId[];
  visited: MissionId[];
  supermarketPaid: boolean;
  libraryReturned: boolean;
  friendMet: boolean;
  ballPlayed: boolean;
  medicineCollected: boolean;
  finalRouteActive: boolean;
  finalRouteIndex: number;
  won: boolean;
  message: string;
  speaker: string;
  learningPhrase: string;
};

export type GameSnapshot = Pick<GameState, "scene" | "inventory" | "money" | "completed" | "visited" | "finalRouteActive" | "finalRouteIndex" | "won" | "message" | "speaker" | "learningPhrase"> & {
  nearbyLabel: string;
};
