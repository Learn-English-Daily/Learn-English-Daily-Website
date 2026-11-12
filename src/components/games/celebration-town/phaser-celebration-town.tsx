"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CelebrationKey, TownLevel } from "@/components/games/celebration-town/celebration-town-data";
import { themeByKey } from "@/components/games/celebration-town/celebration-town-data";

export type TownDirection = "up" | "down" | "left" | "right";
export type TownSnapshot = {
  mission: number;
  objective: string;
  phrase: string;
  nearby: string;
  collected: string[];
  delivered: number;
  placed: number;
  rescued: number;
  timer: number;
  paused: boolean;
  won: boolean;
  languageBadge: boolean;
  conversation: null | { npcIndex: number; name: string; step: number };
  challenge: null | { kind: "collect" | "decorate" | "rescue"; item: string; index: number };
};
export type CelebrationTownHandle = {
  interact: () => void;
  setDirection: (direction: TownDirection, pressed: boolean) => void;
  pause: (paused: boolean) => void;
  restartMission: () => void;
  skipMission: () => void;
  awardLanguageBadge: () => void;
  setSound: (enabled: boolean) => void;
  answerConversation: (correct: boolean, sentence: string) => void;
  resolveChallenge: (correct: boolean, sentence: string) => void;
};

type Props = { celebration: CelebrationKey; level: TownLevel; onSnapshot: (snapshot: TownSnapshot) => void };
type Bridge = CelebrationTownHandle & { destroy?: () => void };

export const PhaserCelebrationTown = forwardRef<CelebrationTownHandle, Props>(function PhaserCelebrationTown({ celebration, level, onSnapshot }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<Bridge | null>(null);
  const directionsRef = useRef(new Set<TownDirection>());

  useImperativeHandle(ref, () => ({
    interact: () => bridgeRef.current?.interact(),
    setDirection(direction, pressed) { if (pressed) directionsRef.current.add(direction); else directionsRef.current.delete(direction); bridgeRef.current?.setDirection(direction, pressed); },
    pause: (paused) => bridgeRef.current?.pause(paused),
    restartMission: () => bridgeRef.current?.restartMission(),
    skipMission: () => bridgeRef.current?.skipMission(),
    awardLanguageBadge: () => bridgeRef.current?.awardLanguageBadge(),
    setSound: (enabled) => bridgeRef.current?.setSound(enabled),
    answerConversation: (correct, sentence) => bridgeRef.current?.answerConversation(correct, sentence),
    resolveChallenge: (correct, sentence) => bridgeRef.current?.resolveChallenge(correct, sentence)
  }));

  useEffect(() => {
    let disposed = false;
    let game: { destroy: (removeCanvas: boolean, noReturn?: boolean) => void } | null = null;
    async function boot() {
      const phaserModule = await import("phaser");
      if (disposed || !hostRef.current) return;
      const Phaser = phaserModule.default;
      const theme = themeByKey(celebration);
      const WORLD_W = 1280, WORLD_H = 720;

      class TownScene extends Phaser.Scene {
        player!: any;
        cursors!: any;
        keys!: Record<string, any>;
        obstacles!: any;
        mission = 1; phrase = "Find the celebration objects!"; nearby = ""; objective = "Collect 6 celebration objects"; collected: string[] = []; delivered = 0; placed = 0; rescued = 0; timer = 45; pausedGame = false; won = false; badge = false; soundOn = true; conversation: null | { npcIndex: number; name: string; step: number } = null; challenge: null | { kind: "collect" | "decorate" | "rescue"; item: string; index: number } = null; carry: null | { kind: "decor" | "rescue"; id: number; node: any } = null; lastEmit = 0;
        collectibles: Array<{ name: string; node: any; home: { x: number; y: number } }> = [];
        npcs: Array<{ name: string; node: any; delivered: boolean; home: { x: number; y: number } }> = [];
        decors: Array<{ name: string; node: any; spot: any; placed: boolean; home: { x: number; y: number } }> = [];
        rescues: Array<{ node: any; returned: boolean; home: { x: number; y: number } }> = [];
        shelter!: any;
        guests: any[] = [];
        confettiTimer?: any;

        constructor() { super("celebration-town"); }
        create() {
          this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
          this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
          this.drawWorld();
          this.obstacles = this.physics.add.staticGroup();
          this.addObstacle(55, 55, 260, 155); this.addObstacle(380, 45, 250, 170); this.addObstacle(970, 65, 255, 160); this.addObstacle(45, 495, 265, 175); this.addObstacle(970, 500, 255, 165);
          [[340, 92], [680, 85], [900, 90], [345, 630], [700, 625], [900, 620], [70, 350], [1200, 350]].forEach(([x, y]) => this.addTree(x, y));
          this.player = this.makePlayer(650, 430);
          this.physics.add.collider(this.player, this.obstacles);
          this.cameras.main.startFollow(this.player, true, .1, .1);
          this.cursors = this.input.keyboard!.createCursorKeys();
          this.keys = this.input.keyboard!.addKeys("W,A,S,D,E,SPACE") as Record<string, any>;
          this.input.keyboard!.on("keydown-E", () => this.interact());
          this.input.keyboard!.on("keydown-SPACE", (event: KeyboardEvent) => { event.preventDefault(); this.interact(); });
          this.spawnCollectibles(); this.spawnNpcs(); this.spawnDecor(); this.spawnRescue(); this.updateVisibility();
          bridgeRef.current = {
            interact: () => this.interact(), setDirection: () => undefined, pause: (value) => { this.pausedGame = value; this.physics.world.isPaused = value; this.emit(); }, restartMission: () => this.restartMission(), skipMission: () => this.skipMission(), awardLanguageBadge: () => { this.badge = true; this.phrase = "Language Champion badge awarded!"; this.feedback(true); this.emit(); }, setSound: (enabled) => { this.soundOn = enabled; }, answerConversation: (correct, sentence) => this.answerConversation(correct, sentence), resolveChallenge: (correct, sentence) => this.resolveChallenge(correct, sentence), destroy: () => this.scene.stop()
          };
          this.emit();
        }
        update(_time: number, delta: number) {
          if (this.pausedGame || this.won || this.conversation || this.challenge) { this.player.setVelocity(0); return; }
          const external = directionsRef.current; let dx = 0, dy = 0;
          if (this.cursors.left.isDown || this.keys.A.isDown || external.has("left")) dx -= 1;
          if (this.cursors.right.isDown || this.keys.D.isDown || external.has("right")) dx += 1;
          if (this.cursors.up.isDown || this.keys.W.isDown || external.has("up")) dy -= 1;
          if (this.cursors.down.isDown || this.keys.S.isDown || external.has("down")) dy += 1;
          const length = Math.hypot(dx, dy) || 1; this.player.setVelocity(dx / length * 190, dy / length * 190);
          if (dx || dy) { const direction = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "up" : "down"; this.player.setTexture(`player-${direction}-${Math.floor(this.time.now / 180) % 2}`); }
          if (this.carry) this.carry.node.setPosition(this.player.x, this.player.y - 42);
          this.findNearby();
          if (this.mission === 4) { this.timer = Math.max(0, this.timer - delta / 1000); if (this.timer <= 0) { this.phrase = "Time is up—try the rescue again!"; this.resetRescue(); } }
          if (this.time.now - this.lastEmit > 150) { this.lastEmit = this.time.now; this.emit(); }
        }
        drawWorld() {
          const g = this.add.graphics(); g.fillStyle(0x8fda75).fillRect(0, 0, WORLD_W, WORLD_H); g.fillStyle(0xf5d7a1).fillRoundedRect(0, 275, WORLD_W, 170, 24); g.fillStyle(0xeabf7a).fillRoundedRect(0, 320, WORLD_W, 80, 18); g.fillStyle(0xf5d7a1).fillRoundedRect(580, 0, 150, WORLD_H, 24); g.fillStyle(0xeabf7a).fillRoundedRect(615, 0, 80, WORLD_H, 18);
          this.drawBuilding(55, 55, 260, 155, "MARKET", 0x1e5eff, 0x13d8cf); this.drawBuilding(380, 45, 250, 170, "BLUE HOUSE", 0x7c3aed, 0xffdf3e); this.drawBuilding(970, 65, 255, 160, "PINK HOUSE", 0xff4e93, 0xf97316); this.drawBuilding(45, 495, 265, 175, "LEAD SCHOOL", 0x0ea5e9, 0xffdf3e); this.drawBuilding(970, 500, 255, 165, "TOWN HALL", 0xf97316, 0x7c3aed);
          g.fillStyle(theme.colors[2], .28).fillRoundedRect(755, 440, 195, 220, 20); g.lineStyle(6, theme.colors[0], .9).strokeRoundedRect(755, 440, 195, 220, 20); this.add.text(778, 453, "CELEBRATION\nVENUE", { fontFamily: "Arial", fontSize: "20px", fontStyle: "bold", color: "#071b4a", align: "center" });
          this.add.text(535, 334, "CELEBRATION TOWN", { fontFamily: "Arial", fontSize: "20px", fontStyle: "bold", color: "#7c2d12" }).setDepth(1);
        }
        drawBuilding(x: number, y: number, w: number, h: number, label: string, body: number, roof: number) { const g = this.add.graphics(); g.fillStyle(body).fillRoundedRect(x, y + 35, w, h - 35, 14); g.fillStyle(roof).fillTriangle(x - 12, y + 42, x + w / 2, y, x + w + 12, y + 42); g.fillStyle(0xffffff, .9).fillRoundedRect(x + w / 2 - 28, y + h - 60, 56, 60, 8); this.add.text(x + w / 2, y + 68, label, { fontFamily: "Arial", fontSize: "16px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5); }
        addObstacle(x: number, y: number, w: number, h: number) { const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0); this.physics.add.existing(rect, true); this.obstacles.add(rect); }
        addTree(x: number, y: number) { const g = this.add.graphics().setDepth(2); g.fillStyle(0x7c3f00).fillRect(x - 8, y, 16, 38); g.fillStyle(0x16a34a).fillCircle(x, y - 10, 30); g.fillStyle(0x4ade80).fillCircle(x - 17, y - 20, 18).fillCircle(x + 17, y - 18, 19); const hit = this.add.circle(x, y, 24, 0x000000, 0); this.physics.add.existing(hit, true); this.obstacles?.add(hit); }
        makePlayer(x: number, y: number) { ["down", "up", "left", "right"].forEach((direction) => [0, 1].forEach((frame) => this.makePlayerTexture(direction, frame))); const player = this.physics.add.sprite(x, y, "player-down-0").setDepth(20).setCollideWorldBounds(true); player.body!.setSize(24, 30).setOffset(12, 24); return player; }
        makePlayerTexture(direction: string, frame: number) { const key = `player-${direction}-${frame}`; if (this.textures.exists(key)) return; const g = this.make.graphics({ x: 0, y: 0 }, false); g.fillStyle(0x172554).fillRoundedRect(14 + (frame ? 2 : 0), 48, 9, 16, 3).fillRoundedRect(30 - (frame ? 2 : 0), 48, 9, 16, 3); g.fillStyle(0x1e5eff).fillRoundedRect(10, 22, 34, 34, 9); g.fillStyle(0xf0b98a).fillCircle(27, 15, 14); g.fillStyle(0x18213b).fillCircle(27, 10, 14); if (direction !== "up") { const shift = direction === "left" ? -3 : direction === "right" ? 3 : 0; g.fillStyle(0x071b4a).fillCircle(22 + shift, 16, 2).fillCircle(32 + shift, 16, 2); } g.fillStyle(0xffffff).fillRect(16, 31, 22, 10); g.generateTexture(key, 54, 66); g.destroy(); }
        iconFor(label: string) { const value = label.toLowerCase(); const icons: Array<[string, string]> = [["cake", "🎂"], ["balloon", "🎈"], ["gift", "🎁"], ["invitation", "💌"], ["hat", "🥳"], ["game", "🎯"], ["ketupat", "🍙"], ["food", "🍱"], ["lantern", "🏮"], ["cushion", "🛋️"], ["sign", "🪧"], ["star", "⭐"], ["snack", "🍪"], ["music", "🎵"], ["garland", "🎊"], ["flag", "🇮🇩"], ["sack", "🛍️"], ["rope", "🪢"], ["basket", "🧺"], ["certificate", "📜"], ["flower", "💐"], ["camera", "📷"], ["speech", "🎤"], ["ribbon", "🎀"], ["drum", "🥁"], ["batik", "👕"], ["craft", "🎨"], ["banner", "🪧"], ["table", "🪑"], ["chair", "🪑"], ["wall", "🖼️"], ["podium", "🎤"], ["stage", "🎭"], ["decor", "🎊"]]; return icons.find(([word]) => value.includes(word))?.[1] || "✨"; }
        makeObject(x: number, y: number, label: string, color: number, kind: "item" | "npc" | "decor" | "rescue") { const container = this.add.container(x, y).setDepth(10); const glow = this.add.circle(0, 0, kind === "npc" ? 30 : 32, 0xffdf3e, .35); const shape = this.add.rectangle(0, kind === "npc" ? 4 : 0, kind === "npc" ? 28 : 52, kind === "npc" ? 40 : 48, color).setStrokeStyle(3, 0xffffff); if (kind === "npc") container.add([glow, this.add.circle(0, -22, 13, 0xc98b5b), shape]); else container.add([glow, shape, this.add.text(0, -2, this.iconFor(label), { fontFamily: "Arial", fontSize: "28px" }).setOrigin(.5)]); const text = this.add.text(0, kind === "npc" ? 34 : 36, label, { fontFamily: "Arial", fontSize: "11px", fontStyle: "bold", color: "#071b4a", backgroundColor: "#ffffffee", padding: { x: 5, y: 3 }, align: "center", wordWrap: { width: 105 } }).setOrigin(.5); container.add(text); return container; }
        spawnCollectibles() { const points = [[350, 260], [760, 110], [1120, 285], [230, 390], [535, 585], [1080, 430]]; this.collectibles = theme.collectibles.map((name, index) => ({ name, node: this.makeObject(points[index][0], points[index][1], name, theme.colors[index % 3], "item"), home: { x: points[index][0], y: points[index][1] } })); }
        spawnNpcs() { const data = [["Ayu", 350, 455], ["Bima", 760, 255], ["Siti", 940, 330]] as const; this.npcs = data.map(([name, x, y], index) => ({ name, node: this.makeObject(x, y, name, [0xff4e93, 0x13d8cf, 0xf97316][index], "npc"), delivered: false, home: { x, y } })); }
        spawnDecor() { const homes = [[720, 500], [720, 555], [720, 610]]; const spots = [[820, 525], [895, 485], [875, 600]]; this.decors = theme.decorations.map((name, index) => ({ name, node: this.makeObject(homes[index][0], homes[index][1], name, theme.colors[index], "decor"), spot: this.add.circle(spots[index][0], spots[index][1], 28, theme.colors[index], .25).setStrokeStyle(4, theme.colors[index]), placed: false, home: { x: homes[index][0], y: homes[index][1] } })); }
        spawnRescue() { const points = [[420, 270], [1020, 385], [470, 640]]; this.shelter = this.add.circle(915, 565, 35, 0xffffff, .2).setStrokeStyle(5, 0xffdf3e); this.rescues = points.map(([x, y], index) => ({ node: this.makeObject(x, y, `wind-blown decor ${index + 1}`, theme.colors[index], "rescue"), returned: false, home: { x, y } })); }
        updateVisibility() { this.collectibles.forEach((item) => item.node.setVisible(this.mission === 1 && !this.collected.includes(item.name))); this.npcs.forEach((npc) => npc.node.setVisible(this.mission === 2 && !npc.delivered)); this.decors.forEach((decor) => { decor.node.setVisible(this.mission === 3 && !decor.placed); decor.spot.setVisible(this.mission === 3 && !decor.placed); }); this.rescues.forEach((item) => item.node.setVisible(this.mission === 4 && !item.returned)); this.shelter?.setVisible(this.mission === 4); }
        findNearby() { let label = ""; const close = (node: { x: number; y: number }, radius = 62) => Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y) < radius; if (this.mission === 1) { const item = this.collectibles.find((entry) => entry.node.visible && close(entry.node)); if (item) label = `Collect ${item.name}`; } else if (this.mission === 2) { const npc = this.npcs.find((entry) => entry.node.visible && close(entry.node)); if (npc) label = `Invite ${npc.name}`; } else if (this.mission === 3) { if (this.carry) { const decor = this.decors[this.carry.id]; if (close(decor.spot, 70)) label = `Place ${decor.name}`; } else { const decor = this.decors.find((entry) => entry.node.visible && close(entry.node)); if (decor) label = `Pick up ${decor.name}`; } } else if (this.mission === 4) { if (this.carry && close(this.shelter, 75)) label = "Return decoration"; else if (!this.carry) { const item = this.rescues.find((entry) => entry.node.visible && close(entry.node)); if (item) label = "Rescue decoration"; } } this.nearby = label; }
        interact() { if (this.pausedGame || this.won || this.conversation || this.challenge) return; const close = (node: { x: number; y: number }, radius = 68) => Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y) < radius;
          if (this.mission === 1) { const itemIndex = this.collectibles.findIndex((entry) => entry.node.visible && close(entry.node)); if (itemIndex < 0) return this.nudge(); const item = this.collectibles[itemIndex]; item.node.setVisible(false); this.collected.push(item.name); this.phrase = `English checkpoint: use “${item.name}” in a sentence.`; this.challenge = { kind: "collect", item: item.name, index: itemIndex }; this.feedback(true); }
          else if (this.mission === 2) { const npcIndex = this.npcs.findIndex((entry) => entry.node.visible && close(entry.node)); if (npcIndex < 0) return this.nudge(); const npc = this.npcs[npcIndex]; this.conversation = { npcIndex, name: npc.name, step: 0 }; this.player.setVelocity(0); this.phrase = `You entered ${npc.name}'s house. Speak in English!`; this.emit(); }
          else if (this.mission === 3) { if (this.carry) { const decorIndex = this.carry.id; const decor = this.decors[decorIndex]; if (!close(decor.spot, 75)) return this.nudge("Take it to the glowing spot!"); decor.node.setPosition(decor.spot.x, decor.spot.y).setVisible(true); decor.spot.setVisible(false); decor.placed = true; this.carry = null; this.placed += 1; this.phrase = "English checkpoint: describe the venue."; this.challenge = { kind: "decorate", item: decor.name, index: decorIndex }; this.feedback(true); } else { const index = this.decors.findIndex((entry) => entry.node.visible && close(entry.node)); if (index < 0) return this.nudge(); const decor = this.decors[index]; this.carry = { kind: "decor", id: index, node: decor.node }; this.phrase = `Put the ${decor.name} on the glowing spot.`; } }
          else if (this.mission === 4) { if (this.carry) { if (!close(this.shelter, 75)) return this.nudge("Return it to the yellow shelter!"); const rescueIndex = this.carry.id; const item = this.rescues[rescueIndex]; item.returned = true; item.node.setVisible(false); this.carry = null; this.rescued += 1; this.phrase = "English checkpoint: explain what happened."; this.challenge = { kind: "rescue", item: theme.decorations[rescueIndex], index: rescueIndex }; this.feedback(true); } else { const index = this.rescues.findIndex((entry) => entry.node.visible && close(entry.node)); if (index < 0) return this.nudge(); const item = this.rescues[index]; this.carry = { kind: "rescue", id: index, node: item.node }; this.phrase = `The wind blew the ${theme.decorations[index]} away! Take it to the shelter.`; } }
          this.emit();
        }
        article(value: string) { return `${/^[aeiou]/i.test(value) ? "an" : "a"} ${value}`; }
        answerConversation(correct: boolean, sentence: string) { if (!this.conversation) return; if (!correct) { this.phrase = "Try again—choose the friendly English sentence."; this.feedback(false); this.emit(); return; } const current = this.conversation; this.phrase = sentence; this.feedback(true); if (current.step < 2) { this.conversation = { ...current, step: current.step + 1 }; this.emit(); return; } const npc = this.npcs[current.npcIndex]; npc.delivered = true; npc.node.setVisible(false); this.delivered += 1; this.conversation = null; this.popText(npc.home.x, npc.home.y - 55, "INVITATION DELIVERED!", 0xff4e93); this.phrase = `${npc.name} said: Yes, I'd love to come!`; if (this.delivered === 3) this.startMission(3); this.emit(); }
        resolveChallenge(correct: boolean, sentence: string) { if (!this.challenge) return; if (!correct) { this.phrase = "Almost! Try the English challenge again."; this.feedback(false); this.emit(); return; } const kind = this.challenge.kind; this.challenge = null; this.phrase = sentence; this.feedback(true); if (kind === "collect" && this.collected.length === this.collectibles.length) this.startMission(2); else if (kind === "decorate" && this.placed === this.decors.length) this.startMission(4); else if (kind === "rescue" && this.rescued === this.rescues.length) this.startMission(5); this.emit(); }
        nudge(message = "Move closer to the glowing object and press E.") { this.phrase = message; this.feedback(false); }
        startMission(next: number) { this.mission = next; if (next === 2) { this.objective = "Deliver 3 invitations"; this.phrase = "Find the three glowing neighbors!"; } if (next === 3) { this.objective = "Carry 3 decorations to glowing spots"; this.phrase = "Decorate the venue!"; } if (next === 4) { this.objective = "Rescue 3 decorations before time runs out"; this.phrase = "There was a problem—the wind scattered decorations!"; this.timer = level === "Foundation" ? 60 : level === "Confident" ? 48 : 38; this.resetRescue(false); } if (next === 5) { this.objective = "Grand celebration complete"; this.phrase = `${theme.phrase} We fixed the problem!`; this.win(); } this.updateVisibility(); this.feedback(true); }
        restartMission() { this.carry = null; this.conversation = null; this.challenge = null; if (this.mission === 1) { this.collected = []; this.collectibles.forEach((item) => item.node.setPosition(item.home.x, item.home.y)); } if (this.mission === 2) { this.delivered = 0; this.npcs.forEach((npc) => npc.delivered = false); } if (this.mission === 3) { this.placed = 0; this.decors.forEach((decor) => { decor.placed = false; decor.node.setPosition(decor.home.x, decor.home.y); decor.spot.setVisible(true); }); } if (this.mission === 4) this.resetRescue(); this.updateVisibility(); this.phrase = "Mission restarted!"; this.emit(); }
        skipMission() { if (this.mission < 5) this.startMission(this.mission + 1); }
        resetRescue(emit = true) { this.carry = null; this.rescued = 0; this.timer = level === "Foundation" ? 60 : level === "Confident" ? 48 : 38; this.rescues.forEach((item) => { item.returned = false; item.node.setPosition(item.home.x, item.home.y); }); this.updateVisibility(); if (emit) this.emit(); }
        win() { this.won = true; this.player.setVelocity(0); this.npcs.forEach((npc, index) => { npc.node.setVisible(true).setPosition(790 + index * 55, 625); this.guests.push(npc.node); }); this.confettiTimer = this.time.addEvent({ delay: 130, loop: true, callback: () => { const colors = [0xff4e93, 0xffdf3e, 0x1e5eff, 0x13d8cf, 0xf97316]; const piece = this.add.rectangle(Phaser.Math.Between(750, 950), 440, 7, 13, Phaser.Utils.Array.GetRandom(colors)).setDepth(30); this.tweens.add({ targets: piece, y: 680, x: piece.x + Phaser.Math.Between(-80, 80), angle: 240, duration: Phaser.Math.Between(1100, 1900), onComplete: () => piece.destroy() }); } }); this.cameras.main.flash(600, 255, 223, 62); this.emit(); }
        popText(x: number, y: number, text: string, color: number) { const node = this.add.text(x, y, text, { fontFamily: "Arial", fontSize: "18px", fontStyle: "bold", color: `#${color.toString(16).padStart(6, "0")}`, backgroundColor: "#ffffffee", padding: { x: 8, y: 5 } }).setOrigin(.5).setDepth(40); this.tweens.add({ targets: node, y: y - 35, alpha: 0, duration: 1200, onComplete: () => node.destroy() }); }
        feedback(success: boolean) { if (this.soundOn) { const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (AudioContextCtor) { const context = new AudioContextCtor(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.setValueAtTime(success ? 620 : 180, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(success ? 980 : 120, context.currentTime + .12); gain.gain.setValueAtTime(.12, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .18); oscillator.start(); oscillator.stop(context.currentTime + .18); } } this.cameras.main.shake(success ? 80 : 120, success ? .001 : .004); }
        emit() { onSnapshot({ mission: this.mission, objective: this.objective, phrase: this.phrase, nearby: this.nearby, collected: [...this.collected], delivered: this.delivered, placed: this.placed, rescued: this.rescued, timer: Math.ceil(this.timer), paused: this.pausedGame, won: this.won, languageBadge: this.badge, conversation: this.conversation, challenge: this.challenge }); }
      }
      game = new Phaser.Game({ type: Phaser.CANVAS, parent: hostRef.current, width: 960, height: 540, backgroundColor: "#8fda75", physics: { default: "arcade", arcade: { debug: false } }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: TownScene, render: { antialias: true, pixelArt: false } });
    }
    boot();
    return () => { disposed = true; directionsRef.current.clear(); bridgeRef.current?.destroy?.(); bridgeRef.current = null; game?.destroy(true); };
  }, [celebration, level, onSnapshot]);

  return <div ref={hostRef} className="aspect-video w-full overflow-hidden rounded-2xl bg-[#071b4a] [&_canvas]:!h-auto [&_canvas]:!max-h-full [&_canvas]:!w-full" aria-label="LEAD Celebration Town 2D game" />;
});
