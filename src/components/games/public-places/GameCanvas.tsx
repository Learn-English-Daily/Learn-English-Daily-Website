"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Direction, GameSnapshot, GameState, Interaction, MissionId, Point, Rect, SceneId } from "@/components/games/public-places/game-types";
import { scenes } from "@/components/games/public-places/worlds";

export type GameCanvasHandle = { interact: () => void; setDirection: (direction: Direction, pressed: boolean) => void };
type Props = { onSnapshot: (snapshot: GameSnapshot) => void };

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 600;
const PLAYER_SPEED = 205;
const PLAYER_RADIUS = 15;
const finalRoute: Array<SceneId | "park"> = ["supermarket", "park", "library", "home"];

function initialState(): GameState {
  return {
    scene: "home", player: { ...scenes.home.spawn, direction: "down", moving: false, walkFrame: 0 },
    inventory: { apples: 0, milk: 0, libraryBook: 1, animalBook: 0, medicine: 0, ball: 0 },
    money: 20, completed: [], visited: [], supermarketPaid: false, libraryReturned: false, friendMet: false,
    ballPlayed: false, medicineCollected: false, finalRouteActive: false, finalRouteIndex: 0, won: false,
    speaker: "Wisey", message: "Good morning! Let's explore the town today. Use the arrow keys or WASD to move.", learningPhrase: ""
  };
}

export const GameCanvas = forwardRef<GameCanvasHandle, Props>(function GameCanvas({ onSnapshot }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initialState());
  const keysRef = useRef(new Set<string>());
  const nearbyRef = useRef<Interaction | null>(null);
  const lastSnapshotRef = useRef(0);

  function snapshot() {
    const state = stateRef.current;
    onSnapshot({
      scene: state.scene, inventory: { ...state.inventory }, money: state.money, completed: [...state.completed], visited: [...state.visited],
      finalRouteActive: state.finalRouteActive, finalRouteIndex: state.finalRouteIndex, won: state.won,
      message: state.message, speaker: state.speaker, learningPhrase: state.learningPhrase,
      nearbyLabel: nearbyRef.current?.label || ""
    });
  }

  function say(speaker: string, message: string, phrase = "") {
    const state = stateRef.current; state.speaker = speaker; state.message = message; state.learningPhrase = phrase; snapshot();
  }

  function visit(mission: MissionId) {
    const state = stateRef.current;
    if (!state.visited.includes(mission)) state.visited.push(mission);
  }

  function complete(mission: MissionId, phrase: string) {
    const state = stateRef.current;
    if (!state.completed.includes(mission)) state.completed.push(mission);
    state.learningPhrase = phrase;
    if (state.completed.length === 4 && !state.finalRouteActive) {
      state.finalRouteActive = true; state.finalRouteIndex = 0;
      say("Wisey", "All four missions are complete! Final route: Supermarket → Park → Library → Home.", phrase);
    } else snapshot();
  }

  function advanceFinal(location: SceneId | "park") {
    const state = stateRef.current;
    if (!state.finalRouteActive || state.won || finalRoute[state.finalRouteIndex] !== location) return;
    state.finalRouteIndex += 1;
    if (state.finalRouteIndex === finalRoute.length) {
      state.won = true; say("Wisey", "You completed the whole city adventure!", "I can get around the city.");
    } else say("Wisey", `Route stop complete. Next: ${finalRoute[state.finalRouteIndex]}.`);
  }

  function changeScene(interaction: Interaction) {
    if (!interaction.targetScene || !interaction.targetSpawn) return;
    const state = stateRef.current;
    state.scene = interaction.targetScene;
    Object.assign(state.player, interaction.targetSpawn);
    state.player.moving = false;
    const mission = interaction.targetScene === "supermarket" ? "supermarket" : interaction.targetScene === "library" ? "library" : interaction.targetScene === "hospital" ? "hospital" : null;
    if (mission) { visit(mission); say("Wisey", `You entered the ${scenes[interaction.targetScene].name}. Walk close to objects and press SPACE.` , `I go to the ${scenes[interaction.targetScene].name.toLowerCase()}.`); }
    if (interaction.targetScene === "city") say("Wisey", "You are back in town. Check today's missions and choose your route.");
    advanceFinal(interaction.targetScene);
    snapshot();
  }

  function handleInteraction(interaction: Interaction) {
    const state = stateRef.current;
    if (interaction.kind === "door") { changeScene(interaction); return; }
    if (interaction.id === "apple") {
      state.inventory.apples += 1; say("Boy", state.inventory.apples < 2 ? "Apple! I need one more." : "Two apples! Now I need milk.", "Apple"); return;
    }
    if (interaction.id === "milk") { state.inventory.milk = 1; say("Boy", "Milk! My shopping basket is ready.", "Milk"); return; }
    if (interaction.id === "cashier") {
      if (state.inventory.apples < 2 || state.inventory.milk < 1) { say("Cashier", "You still need two apples and one milk. Keep looking!"); return; }
      if (state.money < 5) { say("Cashier", "You need five dollars."); return; }
      state.money -= 5; state.supermarketPaid = true; complete("supermarket", "I go to the supermarket."); say("Cashier", "Thank you! Have a nice day!", "I go to the supermarket."); return;
    }
    if (interaction.id === "librarian") {
      if (!state.inventory.libraryBook) { say("Librarian", "Please bring me the library book."); return; }
      state.inventory.libraryBook = 0; state.libraryReturned = true; say("Librarian", "Thank you! Now find a book about animals.", "I return a library book."); return;
    }
    if (interaction.id === "animal-book") { state.inventory.animalBook = 1; complete("library", "I go to the library."); say("Boy", "Animal book! I found it.", "I go to the library."); return; }
    if (interaction.id === "park-friend") {
      visit("park"); state.friendMet = true; advanceFinal("park"); say("Friend", state.ballPlayed ? "That was fun!" : "Hi! Let's find the ball and play!", "I meet my friend at the park."); return;
    }
    if (interaction.id === "park-ball") { if (!state.friendMet) { say("Wisey", "Find and talk to your friend first."); return; } state.inventory.ball = 1; say("Boy", "I found the ball! Let's take it to the play area.", "Ball"); return; }
    if (interaction.id === "park-play") {
      if (!state.friendMet || !state.inventory.ball) { say("Wisey", "Meet your friend and pick up the ball first."); return; }
      state.inventory.ball = 0; state.ballPlayed = true; complete("park", "I play in the park."); say("Friend", "Great pass! We had fun at the park.", "I play in the park."); return;
    }
    if (interaction.id === "medicine") { state.inventory.medicine = 1; state.medicineCollected = true; say("Receptionist", "Please take this medicine to the doctor.", "Medicine"); return; }
    if (interaction.id === "doctor") {
      if (!state.inventory.medicine) { say("Doctor", "Please collect the medicine from reception first."); return; }
      state.inventory.medicine = 0; complete("hospital", "I go to the hospital."); say("Doctor", "Thank you for helping! Your friend is feeling better.", "I go to the hospital.");
    }
  }

  function interact() { const interaction = nearbyRef.current; if (interaction) handleInteraction(interaction); else say("Wisey", "Move closer to a person, object, or entrance. Look for the interaction prompt."); }
  useImperativeHandle(ref, () => ({
    interact,
    setDirection(direction, pressed) { const key = direction === "up" ? "arrowup" : direction === "down" ? "arrowdown" : direction === "left" ? "arrowleft" : "arrowright"; if (pressed) keysRef.current.add(key); else keysRef.current.delete(key); }
  }));

  useEffect(() => {
    function down(event: KeyboardEvent) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D", " "].includes(event.key)) event.preventDefault();
      if (event.key === " ") { if (!event.repeat) interact(); return; }
      keysRef.current.add(event.key.toLowerCase());
    }
    function up(event: KeyboardEvent) { keysRef.current.delete(event.key.toLowerCase()); }
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  });

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const context = canvas.getContext("2d"); if (!context) return;
    let frame = 0; let last = performance.now();
    function loop(now: number) {
      const delta = Math.min(.035, (now - last) / 1000); last = now;
      update(delta); draw(context!);
      if (now - lastSnapshotRef.current > 180) { lastSnapshotRef.current = now; snapshot(); }
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  function update(delta: number) {
    const state = stateRef.current; if (state.won) return;
    const keys = keysRef.current;
    let dx = 0; let dy = 0;
    if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
    if (keys.has("arrowright") || keys.has("d")) dx += 1;
    if (keys.has("arrowup") || keys.has("w")) dy -= 1;
    if (keys.has("arrowdown") || keys.has("s")) dy += 1;
    if (dx && dy) { dx *= .707; dy *= .707; }
    state.player.moving = Boolean(dx || dy);
    if (dx < 0) state.player.direction = "left"; else if (dx > 0) state.player.direction = "right"; else if (dy < 0) state.player.direction = "up"; else if (dy > 0) state.player.direction = "down";
    if (state.player.moving) state.player.walkFrame += delta * 9;
    const scene = scenes[state.scene];
    moveAxis("x", dx * PLAYER_SPEED * delta, scene.walls, scene.width, scene.height);
    moveAxis("y", dy * PLAYER_SPEED * delta, scene.walls, scene.width, scene.height);
    nearbyRef.current = nearestInteraction(scene.interactions, state);
    if (state.scene === "city" && state.finalRouteActive && state.finalRouteIndex < finalRoute.length && finalRoute[state.finalRouteIndex] === "park") {
      if (state.player.x > 610 && state.player.x < 1080 && state.player.y > 130 && state.player.y < 620) advanceFinal("park");
    }
  }

  function moveAxis(axis: "x" | "y", amount: number, walls: Rect[], width: number, height: number) {
    if (!amount) return;
    const player = stateRef.current.player; const next = { x: player.x, y: player.y }; next[axis] += amount;
    next.x = Math.max(PLAYER_RADIUS, Math.min(width - PLAYER_RADIUS, next.x)); next.y = Math.max(PLAYER_RADIUS, Math.min(height - PLAYER_RADIUS, next.y));
    const box = { x: next.x - 12, y: next.y - 18, width: 24, height: 34 };
    if (!walls.some((wall) => overlaps(box, wall))) player[axis] = next[axis];
  }

  return <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} className="block aspect-[16/10] w-full bg-slate-900 outline-none" tabIndex={0} aria-label="LEAD City Adventure game world" />;

  function draw(ctx: CanvasRenderingContext2D) {
    const state = stateRef.current; const scene = scenes[state.scene];
    const camera = { x: clamp(state.player.x - VIEW_WIDTH / 2, 0, Math.max(0, scene.width - VIEW_WIDTH)), y: clamp(state.player.y - VIEW_HEIGHT / 2, 0, Math.max(0, scene.height - VIEW_HEIGHT)) };
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT); ctx.save(); ctx.translate(-camera.x, -camera.y);
    if (state.scene === "city") drawCity(ctx); else drawInterior(ctx, state.scene);
    drawInteractions(ctx, scene.interactions, state); drawBoy(ctx, state.player.x, state.player.y, state.player.direction, state.player.moving ? Math.floor(state.player.walkFrame) % 2 : 0);
    ctx.restore();
  }
});

function nearestInteraction(interactions: Interaction[], state: GameState) {
  let nearest: Interaction | null = null; let nearestDistance = Infinity;
  for (const item of interactions) {
    if (item.visible && !item.visible(state)) continue;
    const value = Math.hypot(state.player.x - item.x, state.player.y - item.y);
    if (value <= (item.radius || 58) && value < nearestDistance) { nearest = item; nearestDistance = value; }
  }
  return nearest;
}
function overlaps(a: Rect, b: Rect) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

function drawCity(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#8fd16a"; ctx.fillRect(0, 0, 1800, 1200);
  ctx.fillStyle = "#cbd5e1"; ctx.fillRect(0, 485, 1800, 180); ctx.fillRect(735, 0, 170, 1200);
  ctx.fillStyle = "#64748b"; ctx.fillRect(0, 520, 1800, 110); ctx.fillRect(770, 0, 100, 1200);
  ctx.strokeStyle = "#facc15"; ctx.lineWidth = 5; ctx.setLineDash([28, 24]); ctx.beginPath(); ctx.moveTo(0, 575); ctx.lineTo(1800, 575); ctx.moveTo(820, 0); ctx.lineTo(820, 1200); ctx.stroke(); ctx.setLineDash([]);
  drawBuilding(ctx, 105, 100, 360, 250, "HOSPITAL", "#f8fafc", "#ef4444");
  drawBuilding(ctx, 1280, 120, 390, 250, "LIBRARY", "#f5f3ff", "#7c3aed");
  drawBuilding(ctx, 1220, 735, 440, 265, "SUPERMARKET", "#fffbeb", "#f59e0b");
  drawBuilding(ctx, 610, 905, 380, 225, "HOME", "#fff7ed", "#ea580c");
  drawBuilding(ctx, 110, 750, 330, 250, "BANK", "#eff6ff", "#2563eb");
  ctx.fillStyle = "#65a30d"; ctx.fillRect(540, 100, 560, 370); ctx.fillStyle = "#a3e635"; ctx.fillRect(565, 125, 510, 320);
  ctx.fillStyle = "#334155"; ctx.font = "bold 28px sans-serif"; ctx.fillText("CITY PARK", 740, 165);
  drawTree(ctx, 620, 230); drawTree(ctx, 1010, 250); drawTree(ctx, 650, 410); drawTree(ctx, 1030, 410); drawBench(ctx, 750, 300); drawSlide(ctx, 900, 355);
  drawCar(ctx, 315, 548, "#06b6d4"); drawCar(ctx, 1110, 585, "#f97316"); drawCar(ctx, 790, 720, "#a855f7");
}

function drawInterior(ctx: CanvasRenderingContext2D, scene: SceneId) {
  const palettes: Record<string, [string, string]> = { home: ["#fde68a", "#fff7ed"], supermarket: ["#dbeafe", "#eff6ff"], library: ["#ede9fe", "#faf5ff"], hospital: ["#cffafe", "#f0fdfa"] };
  const [floor, wall] = palettes[scene]; ctx.fillStyle = floor; ctx.fillRect(0, 0, 900, 600); ctx.fillStyle = wall; ctx.fillRect(0, 0, 900, 34); ctx.fillRect(0, 0, 34, 600); ctx.fillRect(866, 0, 34, 600); ctx.fillRect(0, 566, 390, 34); ctx.fillRect(510, 566, 390, 34);
  ctx.strokeStyle = "rgba(15,23,42,.08)"; ctx.lineWidth = 1; for (let x = 35; x < 866; x += 48) for (let y = 35; y < 566; y += 48) ctx.strokeRect(x, y, 48, 48);
  if (scene === "home") { drawFurniture(ctx, 95, 95, 210, 105, "BED", "#60a5fa"); drawFurniture(ctx, 620, 100, 165, 95, "DESK", "#a16207"); drawFurniture(ctx, 115, 390, 160, 80, "SOFA", "#f97316"); }
  if (scene === "supermarket") { drawShelf(ctx, 105, 140, 170, "FRUIT"); drawShelf(ctx, 105, 285, 170, "BREAD"); drawShelf(ctx, 620, 140, 170, "DAIRY"); drawShelf(ctx, 620, 285, 170, "WATER"); drawCounter(ctx, 335, 65, 230, "CHECKOUT"); drawNpc(ctx, 450, 155, "#f59e0b", "Cashier"); }
  if (scene === "library") { drawBookshelf(ctx, 85, 85, 70, 330); drawBookshelf(ctx, 230, 85, 70, 330); drawCounter(ctx, 600, 110, 190, "LIBRARIAN"); drawNpc(ctx, 695, 220, "#7c3aed", "Librarian"); drawFurniture(ctx, 570, 340, 230, 75, "READING TABLE", "#92400e"); }
  if (scene === "hospital") { drawCounter(ctx, 80, 90, 280, "RECEPTION"); drawFurniture(ctx, 590, 80, 210, 105, "BED", "#38bdf8"); drawFurniture(ctx, 95, 335, 190, 80, "WAITING", "#14b8a6"); drawNpc(ctx, 690, 235, "#0ea5e9", "Doctor"); drawFurniture(ctx, 600, 350, 190, 75, "EQUIPMENT", "#94a3b8"); }
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 22px sans-serif"; ctx.fillText(scenes[scene].name.toUpperCase(), 45, 68);
}

function drawInteractions(ctx: CanvasRenderingContext2D, items: Interaction[], state: GameState) {
  for (const item of items) {
    if (item.visible && !item.visible(state)) continue;
    if (item.kind === "door") { ctx.fillStyle = "#0f172a"; ctx.fillRect(item.x - 25, item.y - 12, 50, 24); ctx.fillStyle = "#facc15"; ctx.fillRect(item.x - 18, item.y - 8, 36, 8); }
    if (item.id === "apple") drawApple(ctx, item.x, item.y);
    if (item.id === "milk") drawMilk(ctx, item.x, item.y);
    if (item.id === "animal-book") drawBook(ctx, item.x, item.y, "ANIMALS");
    if (item.id === "medicine") drawMedicine(ctx, item.x, item.y);
    if (item.id === "park-ball") drawBall(ctx, item.x, item.y);
    if (item.id === "park-friend") drawNpc(ctx, item.x, item.y, "#22c55e", "Friend");
    if (item.id === "doctor") drawNpc(ctx, item.x, item.y, "#0ea5e9", "Doctor");
    if (item.kind === "activity") { ctx.strokeStyle = "#facc15"; ctx.lineWidth = 4; ctx.setLineDash([8, 8]); ctx.strokeRect(item.x - 55, item.y - 35, 110, 70); ctx.setLineDash([]); }
  }
}

function drawBoy(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, frame: number) {
  ctx.save(); ctx.translate(x, y); const leg = frame ? 5 : -5;
  ctx.strokeStyle = "#172554"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-6, 13); ctx.lineTo(-7 + leg, 27); ctx.moveTo(6, 13); ctx.lineTo(7 - leg, 27); ctx.stroke();
  ctx.fillStyle = "#2563eb"; rounded(ctx, -13, -10, 26, 30, 7); ctx.fill();
  ctx.fillStyle = "#f2bd8c"; ctx.beginPath(); ctx.arc(0, -20, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#172554"; ctx.beginPath(); ctx.arc(0, -25, 13, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "white"; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center"; ctx.fillText("LEAD", 0, 7);
  if (direction !== "up") { ctx.fillStyle = "#0f172a"; const eyeShift = direction === "left" ? -3 : direction === "right" ? 3 : 0; ctx.beginPath(); ctx.arc(-4 + eyeShift, -19, 1.5, 0, Math.PI * 2); ctx.arc(4 + eyeShift, -19, 1.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, label: string, body: string, roof: string) { ctx.fillStyle = body; ctx.fillRect(x, y + 45, width, height - 45); ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - 18, y + 48); ctx.lineTo(x + width / 2, y); ctx.lineTo(x + width + 18, y + 48); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#334155"; ctx.fillRect(x + width / 2 - 28, y + height - 70, 56, 70); ctx.fillStyle = "white"; ctx.font = "bold 24px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + width / 2, y + 85); }
function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#78350f"; ctx.fillRect(x - 8, y, 16, 45); ctx.fillStyle = "#15803d"; ctx.beginPath(); ctx.arc(x, y - 8, 35, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x - 16, y - 20, 20, 0, Math.PI * 2); ctx.arc(x + 18, y - 17, 22, 0, Math.PI * 2); ctx.fill(); }
function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) { ctx.fillStyle = color; rounded(ctx, x, y, 80, 38, 10); ctx.fill(); ctx.fillStyle = "#dbeafe"; ctx.fillRect(x + 20, y + 5, 38, 14); ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(x + 18, y + 38, 9, 0, Math.PI * 2); ctx.arc(x + 63, y + 38, 9, 0, Math.PI * 2); ctx.fill(); }
function drawBench(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#92400e"; ctx.fillRect(x, y, 90, 16); ctx.fillRect(x, y + 23, 90, 12); ctx.fillRect(x + 10, y + 35, 8, 25); ctx.fillRect(x + 70, y + 35, 8, 25); }
function drawSlide(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 35, y + 70, x + 95, y + 80); ctx.stroke(); ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 80); ctx.stroke(); }
function drawFurniture(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, label: string, color: string) { ctx.fillStyle = color; rounded(ctx, x, y, width, height, 12); ctx.fill(); ctx.fillStyle = "white"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + width / 2, y + height / 2); }
function drawShelf(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, label: string) { ctx.fillStyle = "#92400e"; rounded(ctx, x, y, width, 48, 7); ctx.fill(); ctx.fillStyle = "#fef3c7"; ctx.fillRect(x + 8, y + 9, width - 16, 8); ctx.fillRect(x + 8, y + 30, width - 16, 8); ctx.fillStyle = "#0f172a"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + width / 2, y - 8); }
function drawCounter(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, label: string) { ctx.fillStyle = "#475569"; rounded(ctx, x, y, width, 60, 8); ctx.fill(); ctx.fillStyle = "white"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + width / 2, y + 34); }
function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) { ctx.fillStyle = "#78350f"; ctx.fillRect(x, y, width, height); for (let row = 18; row < height; row += 52) { ctx.fillStyle = "#f59e0b"; ctx.fillRect(x + 7, y + row, width - 14, 7); ctx.fillStyle = row % 104 ? "#60a5fa" : "#f43f5e"; for (let book = 10; book < width - 10; book += 14) ctx.fillRect(x + book, y + row - 28, 10, 28); } }
function drawNpc(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) { ctx.fillStyle = color; rounded(ctx, x - 13, y - 8, 26, 32, 7); ctx.fill(); ctx.fillStyle = "#efc099"; ctx.beginPath(); ctx.arc(x, y - 20, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#0f172a"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x, y + 42); }
function drawApple(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#166534"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 4, y - 23); ctx.stroke(); }
function drawMilk(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "white"; ctx.fillRect(x - 12, y - 18, 24, 38); ctx.fillStyle = "#2563eb"; ctx.fillRect(x - 12, y - 18, 24, 11); ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center"; ctx.fillText("MILK", x, y + 7); }
function drawBook(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) { ctx.fillStyle = "#16a34a"; rounded(ctx, x - 24, y - 17, 48, 34, 4); ctx.fill(); ctx.fillStyle = "white"; ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x, y + 3); }
function drawMedicine(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "white"; ctx.fillRect(x - 17, y - 15, 34, 30); ctx.fillStyle = "#ef4444"; ctx.fillRect(x - 5, y - 11, 10, 22); ctx.fillRect(x - 12, y - 5, 24, 10); }
function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); }
