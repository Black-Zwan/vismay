import { useState, useEffect, useMemo, useRef } from "react";

/* ============================================================
   WONDER — Art Update V4 · "Hours & Waymarks"
   Changes from V3:
   · TIME OF DAY. The sky reads your real clock: six dayparts
     (dawn / morning / noon / afternoon / dusk / night), each with
     its own palette and its own sun or moon position. Log in at
     noon and the sun rides high; at five the light is going down
     the sky ahead of you. Card pulls tint the daypart palette
     rather than replacing it. Stars fade in at dusk; the shooting
     star only crosses a starry sky.
   · DEV CONSOLE. A strip beneath the device: pick any daypart
     (or "live"), and a ⏭ tomorrow button to simulate the loop.
   · END OF DAY. The panel now offers "the journal" and
     "divination reading" — and instead of a tomorrow button, a
     live countdown to the next pull (midnight).
   · SHARE CARDS. Sharing a journal passage now GENERATES AN
     IMAGE — a dithered, framed card with the day, the emblem of
     the pulled card, the passage and the reading — previewed in
     a modal with download / native-share / copy-text.
   · TWELVE UNMISTAKABLE WAYMARKS. Each location is now a large
     set-piece scene tied to its name: a three-roofed leaning
     pagoda with prayer flags; a real river with painted moving
     water, a bridge, reeds and lily pads; the High Church with a
     glowing rose window and gravestones; the Goblin Camp with
     hide tents, a burning fire ring, a skull totem and scattered
     bones; a ruined belfry over the Sunken Bell; and more.
   ============================================================ */

const SERIF = "'Iowan Old Style','Palatino Linotype','Palatino','Book Antiqua',Georgia,serif";

// ---- 8×8 Bayer ordered-dither matrix ----
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => v / 64);

// ---- color + noise helpers ----
const hx = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lift = (c, t) => mix(c, [255, 245, 220], t);
const sink = (c, t) => mix(c, [8, 6, 14], t);
const shadeCss = (hex, f) => {
  const [r, g, b] = hx(hex);
  const m = (v) => Math.round(Math.min(255, v * f));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
};
function ramp(stops, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (stops.length - 1);
    const j = Math.min(Math.floor(t), stops.length - 2);
    out.push(mix(stops[j], stops[j + 1], t - j));
  }
  return out;
}
const hash2 = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const smoothT = (t) => t * t * (3 - 2 * t);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = smoothT(xf), v = smoothT(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const STAR = [255, 244, 214];

// ---- Six dayparts: palette, orb position, orb color, star strength ----
const DAYPARTS = {
  dawn: { label: "dawn", sky: ["#2a2145", "#8a4a5c", "#e8a87a"], orb: [0.82, 0.42], orbC: "#f2b56a", stars: 0.25 },
  morning: { label: "morning", sky: ["#3a5c8a", "#6a8ab5", "#c8d8e8"], orb: [0.74, 0.24], orbC: "#ffe9b5", stars: 0 },
  noon: { label: "noon", sky: ["#4a7ab5", "#7aa8d9", "#d8e8f2"], orb: [0.5, 0.07], orbC: "#fff6d8", stars: 0 },
  afternoon: { label: "afternoon", sky: ["#3d6899", "#8a8ab5", "#e8c89a"], orb: [0.3, 0.2], orbC: "#ffd98a", stars: 0 },
  dusk: { label: "dusk", sky: ["#2a1a3e", "#6e3a5c", "#e8875a"], orb: [0.16, 0.4], orbC: "#f2915c", stars: 0.35 },
  night: { label: "night", sky: ["#0c0f24", "#1d2445", "#2e3a66"], orb: [0.68, 0.13], orbC: "#dfe2f2", stars: 1 },
};
const liveDaypart = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "noon";
  if (h >= 14 && h < 17) return "afternoon";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
};

// ---- Deck (6-card demo slice) — data unchanged ----
const CARDS = [
  {
    id: "sun", name: "THE SUN", numeral: "XIX", accent: "#f2c14e",
    sky: ["#2e1a3e", "#8a3d5c", "#e8875a"], plane: "#4a2440", path: "#8a5a4a",
    epigraph: "what is asked plainly is answered plainly",
    readings: {
      love: "What you asked about wants light, not analysis. The Sun says the thing you're overthinking is simpler than you're letting it be. Say the warm thing today.",
      work: "Clarity arrives on its own schedule, and today it's early. The Sun favors the direct move — the email sent plainly, the ask made out loud.",
      decision: "The Sun doesn't weigh options; it burns off fog. The choice you already know is right will feel obvious by afternoon. Trust the first answer.",
      self: "You've been rationing your own brightness. The Sun asks what you'd do today if you assumed it would go well.",
      open: "A day that rewards showing up undisguised. Whatever finds you in the light is meant to.",
    },
  },
  {
    id: "moon", name: "THE MOON", numeral: "XVIII", accent: "#9db4e8",
    sky: ["#0c0f2e", "#1d2452", "#3a4a8a"], plane: "#141a3d", path: "#2e3a6e",
    epigraph: "trust what is felt, not what is said",
    readings: {
      love: "Something unspoken is doing the talking. The Moon says the mood you're sensing is real, but your story about it may not be. Ask instead of assuming.",
      work: "Not everything on your desk is what it appears to be today. The Moon counsels reading twice before signing once.",
      decision: "This is not a deciding day; it's a listening day. The Moon hides the path on purpose so you'll stop and hear what you actually want.",
      self: "The feeling you can't name is still information. Let it stay unnamed a little longer and watch what it does.",
      open: "Walk carefully and take notes. What confuses you today will explain itself within three days.",
    },
  },
  {
    id: "tower", name: "THE TOWER", numeral: "XVI", accent: "#d95f6e",
    sky: ["#1a0e24", "#3d1a3e", "#6e2a4a"], plane: "#2a1230", path: "#5a2a44",
    epigraph: "what falls was already hollow",
    readings: {
      love: "A structure you've been maintaining out of habit may shake today. The Tower isn't cruel — it only takes what was already hollow. Notice what you don't miss.",
      work: "If a plan breaks today, let it break clean. The Tower clears ground faster than you ever would voluntarily, and something truer gets built on it.",
      decision: "Stop reinforcing the option you've already outgrown. The Tower says the disruption you fear is the answer arriving.",
      self: "The identity that cracked recently was a scaffold, not the building. You are what's still standing.",
      open: "Expect one jolt. Meet it standing, and by night you'll call it a favor.",
    },
  },
  {
    id: "star", name: "THE STAR", numeral: "XVII", accent: "#7ee8d2",
    sky: ["#0a1a2e", "#123452", "#1d5c6e"], plane: "#0e2435", path: "#1d4a55",
    epigraph: "repair is already underway",
    readings: {
      love: "After whatever the last stretch was, this is the quiet after. The Star says repair is already underway — your only job is not to reopen the wound to check on it.",
      work: "Play the long game today. The Star rewards the unglamorous consistent thing over the dramatic move.",
      decision: "Choose the option that still sounds good in five years, not five days. The Star sees far and asks you to.",
      self: "Refill before you pour. Today, rest counts as progress and you're allowed to log it that way.",
      open: "A small good omen crosses your path today. You'll know it when you see it. Keep it to yourself.",
    },
  },
  {
    id: "hermit", name: "THE HERMIT", numeral: "IX", accent: "#e8b46e",
    sky: ["#141020", "#241a35", "#3d2b4f"], plane: "#1c1428", path: "#3d2e4a",
    epigraph: "the lantern lights one step, and that is enough",
    readings: {
      love: "Solitude today isn't distance — it's focus. The Hermit says the connection you're tending grows best if you also tend yourself. Take the walk alone.",
      work: "The answer isn't in another meeting. The Hermit hands you a lantern and points at deep work. Close the door for one honest hour.",
      decision: "Nobody else's opinion will settle this, and collecting more of them is a stall. The Hermit says you already have the data. Sit with it.",
      self: "You've been performing okay-ness. Tonight, drop the performance for one hour and see what's actually there.",
      open: "A quiet day by design. What you find in the silence is the whole reading.",
    },
  },
  {
    id: "wheel", name: "WHEEL OF FORTUNE", numeral: "X", accent: "#c58ae8",
    sky: ["#1c0e2e", "#35175c", "#5c2b8a"], plane: "#241238", path: "#4a2a66",
    epigraph: "the turn favors open hands",
    readings: {
      love: "The dynamic is turning on its own — you don't need to push it. The Wheel says let the next move come to you today, and notice who reaches out.",
      work: "Luck favors the person already in motion. The Wheel spins for everyone; only some have their hands open when it stops.",
      decision: "Timing is the hidden variable in your question. The Wheel suggests the choice matters less than choosing this week rather than next month.",
      self: "The season you're in is temporary in both directions. Hold the good loosely and the hard even looser.",
      open: "Something outside your control shifts in your favor today. Say yes quickly.",
    },
  },
];

const QUESTIONS = [
  { id: "love", label: "LOVE", glyph: "♥" },
  { id: "work", label: "WORK", glyph: "⚒" },
  { id: "decision", label: "A DECISION", glyph: "⚖" },
  { id: "self", label: "MYSELF", glyph: "☉" },
  { id: "open", label: "OPEN PULL", glyph: "✦" },
];

// ---- Twelve waymarks along the long road ----
const LANDMARKS = [
  { name: "the Ashen Pines", depart: "The pines thinned behind them, needles gone grey with old smoke." },
  { name: "the Leaning Shrine", depart: "They left a coin at the shrine's crooked altar, as travelers do." },
  { name: "the Grey River crossing", depart: "The ferryman took no payment, only a long look at the card they carried." },
  { name: "the Standing Stones", depart: "The stones hummed low as they passed, the way stones remember." },
  { name: "the Lantern Tree", depart: "A hundred small flames swayed in the branches, none of them warm." },
  { name: "the High Church", depart: "The rose window burned with colors that exist nowhere else. No one sang inside. And yet." },
  { name: "the Hollow Gate", depart: "The gate stood open. It is always open. That is the unsettling part." },
  { name: "the Sunken Bell", depart: "They did not ring it. Some bells are buried facing down for a reason." },
  { name: "the Weeping Willow", depart: "The willow's long fronds brushed their shoulder, the way one says goodbye without words." },
  { name: "the Goblin Camp", depart: "The camp was empty but the fire was warm. Goblins are never far from a warm fire." },
  { name: "the Old Watchtower", depart: "No one watched from the tower. That is not the same as no one being there." },
  { name: "the Mushroom Hollow", depart: "The spores lit their footprints faintly for a mile after." },
];

// roadside prop mix per region
const REGION_KINDS = [
  ["pine", "stone", "post", "shrine", "stone", "lantern"],
  ["pine", "shrine", "stone", "shrine", "post", "lantern"],
  ["post", "stone", "pine", "post", "lantern", "shrine"],
  ["stone", "stone", "shrine", "post", "stone", "pine"],
  ["lantern", "stone", "lantern", "post", "shrine", "pine"],
  ["stone", "shrine", "stone", "post", "lantern", "pine"],
  ["stone", "shrine", "post", "lantern", "stone", "pine"],
  ["stone", "post", "lantern", "shrine", "stone", "pine"],
  ["pine", "stone", "post", "lantern", "stone", "shrine"],
  ["stone", "post", "shrine", "post", "lantern", "pine"],
  ["stone", "post", "shrine", "stone", "lantern", "pine"],
  ["shroom", "shroom", "lantern", "shroom", "stone", "pine"],
];
const RIVER_REGION = 2;

const OPENERS = [
  "On the {day} day, the wanderer came to {place} and asked of {q}.",
  "The road delivered them to {place} on the {day} day, where they knelt and asked of {q}.",
  "At {place}, beneath a strange sky, the wanderer drew breath and asked of {q}.",
  "The {day} day found them at {place}. The question they carried was one of {q}.",
];
const ANSWERS = [
  "The deck answered with {card} — \"{epi}.\"",
  "From the deck rose {card}, whispering that {epi}.",
  "{card} turned its face to them: {epi}.",
  "The card that came was {card}, and its counsel was this — {epi}.",
];

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const pad2 = (n) => String(n).padStart(2, "0");

const START_DAY = 128;
const START_STEPS = 3417;
const STRIP_W = 1200;

/* ---- v1.3 arrival clock ----
   Free legs run ~22h so a free player arrives about once a day. The
   blessed road (Plus) runs ~7h for three to four arrivals. Unclaimed
   arrivals bank to a cap of five so absence accumulates instead of
   breaking. Dev leg is short enough to actually watch the loop. */
const LEG_FREE_MS = 22 * 3600 * 1000;
const LEG_BLESSED_MS = 7 * 3600 * 1000;
const LEG_DEV_MS = 20 * 1000;
const BANK_CAP = 5;

const N_REGIONS = LANDMARKS.length;

/* ============================================================
   THE DITHERED WORLD — daypart-aware. Sun/moon position, star
   strength and river water all lerp smoothly.
   ============================================================ */
/* ============================================================
   WORLD SCALE — tuning knobs
   ------------------------------------------------------------
   CHARACTER_SCALE   the player sprite on the main stage (picker
                      thumbnails are unaffected — separate call site).
   PROP_SCALE        far/near/foreground trees, stones, shrines.
                      Kept equal to CHARACTER_SCALE so the character
                      doesn't end up oversized against unscaled props.
   HORIZON           sky/ground split, 0-1 from the top. Lower = more
                      sky above the skyline; higher = more sky below it
                      is compressed and more ground/landscape shows.
                      Was 0.6. Lowering it gives more visible landscape
                      and reads as "the sky moving up."
   ============================================================ */
const CHARACTER_SCALE = 1.65;
const PROP_SCALE = 1.0;   // global multiplier on top of the per-layer sizes
const HORIZON = 0.54;

function WorldCanvas({ target, walkRef }) {
  const cvsRef = useRef(null);
  const tgtRef = useRef(target);
  tgtRef.current = target;

  useEffect(() => {
    const cvs = cvsRef.current;
    if (!cvs) return;
    const W = 132, H = 254;
    cvs.width = W;
    cvs.height = H;
    const ctx = cvs.getContext("2d");
    const img = ctx.createImageData(W, H);
    const data = img.data;
    const cur = {
      sky: tgtRef.current.sky.map((c) => c.slice()),
      plane: tgtRef.current.plane.slice(),
      path: tgtRef.current.path.slice(),
      accent: tgtRef.current.accent.slice(),
      orb: tgtRef.current.orb.slice(),
      orbC: tgtRef.current.orbC.slice(),
      stars: tgtRef.current.stars,
      water: tgtRef.current.water,
    };
    let raf;
    const t0 = performance.now();

    const frame = (now) => {
      const time = (now - t0) / 1000;
      const tgt = tgtRef.current;
      const k = 0.045;
      for (let i = 0; i < 3; i++) cur.sky[i] = mix(cur.sky[i], tgt.sky[i], k);
      cur.plane = mix(cur.plane, tgt.plane, k);
      cur.path = mix(cur.path, tgt.path, k);
      cur.accent = mix(cur.accent, tgt.accent, k);
      cur.orbC = mix(cur.orbC, tgt.orbC, k);
      cur.orb[0] += (tgt.orb[0] - cur.orb[0]) * k;
      cur.orb[1] += (tgt.orb[1] - cur.orb[1]) * k;
      cur.stars += (tgt.stars - cur.stars) * k;
      cur.water += (tgt.water - cur.water) * k;
      const sw = walkRef.current;

      const SKY_N = 14, G_N = 10, P_N = 8;
      const skyRamp = ramp([sink(cur.sky[0], 0.35), cur.sky[0], cur.sky[1], cur.sky[2], lift(cur.sky[2], 0.3)], SKY_N);
      const groundRamp = ramp([sink(cur.plane, 0.55), cur.plane, mix(cur.plane, cur.sky[2], 0.45), mix(cur.plane, cur.sky[2], 0.8)], G_N);
      const pathRamp = ramp([sink(cur.path, 0.4), cur.path, mix(cur.path, cur.sky[2], 0.55)], P_N);
      const mFar = mix(mix(cur.sky[1], cur.plane, 0.5), cur.sky[2], 0.28);
      const mNear = mix(cur.plane, cur.sky[0], 0.4);
      const mHill = mix(mFar, mNear, 0.5);
      const fgDark = sink(cur.plane, 0.68);
      const orbCore = lift(cur.orbC, 0.25);
      const orbEdge = cur.orbC;
      const waterDeep = mix(mix(cur.sky[0], [40, 70, 130], 0.35), cur.plane, 0.3);
      const waterLit = mix(cur.sky[2], [160, 200, 255], 0.25);

      const HZ = HORIZON;
      let p = 0;
      for (let y = 0; y < H; y++) {
        const ny = y / H;
        for (let x = 0; x < W; x++, p += 4) {
          const nx = x / W;
          const bt = BAYER[((y & 7) << 3) | (x & 7)];
          let col;
          if (ny < HZ) {
            // ---- LIVING SKY ----
            let idx = (ny / HZ) * (SKY_N - 1);
            idx += Math.sin(nx * 9 + time * 0.55 + ny * 20) * 0.7 * (0.3 + ny);
            idx += (vnoise(nx * 2.6 + time * 0.045, ny * 5.2 + 40.4) - 0.5) * 3.2 * Math.max(0, 1 - Math.abs(ny - 0.34) / 0.34);
            const band = Math.max(0, 1 - Math.abs(ny - 0.3) / 0.27);
            if (band > 0.02) {
              const cn =
                vnoise(nx * 5 + time * 0.015 + sw * 0.00006, ny * 16 + 7.3) +
                0.5 * vnoise(nx * 11 - time * 0.021 + 3.1, ny * 30 + 1.7);
              idx += (cn / 1.5 - 0.5) * 4.4 * band;
            }
            // sun / moon at the hour's position
            const dxs = nx - cur.orb[0], dys = (ny - cur.orb[1]) * 1.55;
            const ds = Math.sqrt(dxs * dxs + dys * dys);
            idx += Math.max(0, 0.42 - ds) * 9;
            if (idx < 0) idx = 0;
            if (idx > SKY_N - 1) idx = SKY_N - 1;
            let i0 = Math.floor(idx);
            if (idx - i0 > bt && i0 < SKY_N - 1) i0++;
            col = skyRamp[i0];
            if (ds < 0.052) col = orbCore;
            else if (ds < 0.07 && bt < 0.55) col = orbEdge;
            // stars, by daypart
            if (ny < 0.42 && cur.stars > 0.03) {
              const sh = hash2(x * 1.7, y * 2.3);
              if (sh > 0.9935) {
                const tw = 0.5 + 0.5 * Math.sin(time * 1.8 + sh * 97);
                if (tw * (0.45 - ny) * 3.2 * cur.stars > bt) col = STAR;
              }
            }
            // far ridge → rolling hills → near ridge
            const d1 = nx + sw * 0.00008;
            const dhh = nx + sw * 0.00014;
            const d2 = nx + sw * 0.00022;
            const r1 = HZ - 0.1 - vnoise(d1 * 2.2, 3.1) * 0.085 - vnoise(d1 * 6, 9.4) * 0.024;
            const rh = HZ - 0.072 - (Math.sin(dhh * 5.1) * 0.5 + 0.5) * 0.04 - vnoise(dhh * 1.7, 55.5) * 0.028;
            const r2 = HZ - 0.03 - vnoise(d2 * 3.2, 17.7) * 0.055 - vnoise(d2 * 8.5, 27.2) * 0.018;
            const e = (bt - 0.5) * 0.008;
            if (ny + e > r2) col = mNear;
            else if (ny + e > rh) col = mHill;
            else if (ny + e > r1) col = mFar;
          } else {
            // ---- GROUND ----
            const d = (ny - HZ) / (1 - HZ);
            const u = (vnoise(nx * 1.4 + sw * 0.0016, 8.8) - 0.5) * 0.016;
            const rTop = 0.795 + u, rBot = 0.9 + u * 0.6;
            const e = (bt - 0.5) * 0.012;
            const fgTop = 0.952 + vnoise(nx * 5 + sw * 0.0028, 44.4) * 0.032;
            if (ny > fgTop) {
              col = fgDark;
            } else if (ny + e > rTop && ny + e < rBot) {
              const stone = vnoise(nx * 9 + sw * 0.0017, ny * 46);
              let pi = 3 + (stone - 0.5) * 2.6 + ((ny - rTop) / (rBot - rTop)) * 1.4;
              if (stone > 0.62) pi += 2.4;
              if (pi < 0) pi = 0;
              if (pi > P_N - 1) pi = P_N - 1;
              let ip = Math.floor(pi);
              if (pi - ip > bt && ip < P_N - 1) ip++;
              col = pathRamp[ip];
            } else {
              const scroll = sw * (0.0004 + d * d * 0.0022);
              const gn =
                vnoise(nx * 5 + scroll, d * 6 + 2.2) * 0.7 +
                vnoise(nx * 12 + scroll * 1.6, d * 14 + 7.7) * 0.3;
              let idx = (1 - d) * (G_N - 1) * 0.92 + (gn - 0.5) * 2.6;
              if (idx < 0) idx = 0;
              if (idx > G_N - 1) idx = G_N - 1;
              let i0 = Math.floor(idx);
              if (idx - i0 > bt && i0 < G_N - 1) i0++;
              col = groundRamp[i0];
              // river water fills the low meadow at the crossing
              if (cur.water > 0.02 && ny > 0.9) {
                const shimmer = vnoise(nx * 26 + time * 0.85 + sw * 0.003, ny * 80);
                let wcol = shimmer > 0.62 ? waterLit : waterDeep;
                if (shimmer > 0.62 && bt > 0.6) wcol = lift(wcol, 0.2);
                col = mix(col, wcol, cur.water * Math.min(1, (ny - 0.9) * 18));
              }
            }
          }
          data[p] = col[0];
          data[p + 1] = col[1];
          data[p + 2] = col[2];
          data[p + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      // shooting star — only across a starry sky
      if (cur.stars > 0.4) {
        const period = 11, ph = time % period;
        if (ph < 0.8) {
          const seed = Math.floor(time / period);
          const sx0 = 0.12 + hash2(seed, 1) * 0.55;
          const sy0 = 0.05 + hash2(seed, 2) * 0.14;
          const pr = ph / 0.8;
          ctx.fillStyle = "#fff4d6";
          for (let q = 0; q < 7; q++) {
            const pp = pr - q * 0.02;
            if (pp < 0) continue;
            ctx.globalAlpha = Math.max(0, 0.95 * (1 - q / 7) * (1 - pr) * cur.stars);
            ctx.fillRect(Math.floor((sx0 + pp * 0.3) * W), Math.floor((sy0 + pp * 0.17) * H), 1, 1);
          }
          ctx.globalAlpha = 1;
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [walkRef]);

  return (
    <canvas
      ref={cvsRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
}

/* ---- static dithered halo ---- */
function DitherGlow({ color, size = 96, alpha = 0.4, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const n = 40;
    const c = ref.current;
    if (!c) return;
    c.width = n;
    c.height = n;
    const ctx = c.getContext("2d");
    const im = ctx.createImageData(n, n);
    const [r, g, b] = hx(color);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = (x - n / 2 + 0.5) / (n / 2), dy = (y - n / 2 + 0.5) / (n / 2);
        const dd = Math.sqrt(dx * dx + dy * dy);
        const a = Math.max(0, 1 - dd);
        const bt = BAYER[((y & 7) << 3) | (x & 7)];
        const q = (y * n + x) * 4;
        if (a * a > bt) {
          im.data[q] = r;
          im.data[q + 1] = g;
          im.data[q + 2] = b;
          im.data[q + 3] = Math.round(255 * alpha);
        }
      }
    }
    ctx.putImageData(im, 0, 0);
  }, [color, alpha]);
  return <canvas ref={ref} style={{ width: size, height: size, imageRendering: "pixelated", ...style }} />;
}

/* ---- engraved card emblems (SVG for UI) ---- */
const EMBLEMS = {
  sun: (c) => (
    <g stroke={c} fill="none" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="30" cy="30" r="9.5" />
      <circle cx="30" cy="30" r="3.2" fill={c} stroke="none" />
      {[...Array(12)].map((_, i) => {
        const a = (i * Math.PI) / 6;
        const r1 = i % 2 ? 13 : 14.5, r2 = i % 2 ? 17 : 21;
        return (
          <line key={i} x1={30 + Math.cos(a) * r1} y1={30 + Math.sin(a) * r1} x2={30 + Math.cos(a) * r2} y2={30 + Math.sin(a) * r2} />
        );
      })}
    </g>
  ),
  moon: (c) => (
    <g>
      <path d="M34 10 A 17 17 0 1 0 34 50 A 13.5 13.5 0 1 1 34 10 Z" fill={c} fillOpacity="0.85" />
      <path d="M45 15 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z" fill={c} />
      <circle cx="49" cy="35" r="1.2" fill={c} />
    </g>
  ),
  tower: (c) => (
    <g stroke={c} fill="none" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M23 52 L25 22 L35 22 L37 52" />
      <path d="M23 22 L23 16 L26 16 L26 19 L29 19 L29 16 L31 16 L31 19 L34 19 L34 16 L37 16 L37 22 Z" fill={c} fillOpacity="0.45" />
      <path d="M31 4 L26 15 L32 13 L26 26" strokeWidth="1.8" />
      <line x1="27" y1="34" x2="33" y2="34" opacity="0.6" />
      <line x1="20" y1="52" x2="40" y2="52" />
    </g>
  ),
  star: (c) => (
    <g fill={c} stroke={c} strokeWidth="1">
      <path d="M30 8 L32.5 27.5 L52 30 L32.5 32.5 L30 52 L27.5 32.5 L8 30 L27.5 27.5 Z" fillOpacity="0.85" />
      <path d="M44 12 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1 Z" />
      <path d="M14 44 l0.8 2 2 0.8 -2 0.8 -0.8 2 -0.8 -2 -2 -0.8 2 -0.8 Z" />
    </g>
  ),
  hermit: (c) => (
    <g stroke={c} fill="none" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M26 14 Q30 8 34 14" />
      <path d="M23 18 L37 18 L35 44 L25 44 Z" />
      <line x1="30" y1="18" x2="30" y2="44" opacity="0.4" />
      <line x1="24" y1="30" x2="36" y2="30" opacity="0.4" />
      <path d="M30 25 Q33.5 30 30 35 Q26.5 30 30 25 Z" fill={c} />
      <path d="M25 44 L35 44 L34 48 L26 48 Z" fill={c} fillOpacity="0.4" />
    </g>
  ),
  wheel: (c) => (
    <g stroke={c} fill="none" strokeWidth="1.6">
      <circle cx="30" cy="30" r="18" />
      <circle cx="30" cy="30" r="11" opacity="0.7" />
      <circle cx="30" cy="30" r="2.5" fill={c} />
      {[...Array(8)].map((_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line key={i} x1={30 + Math.cos(a) * 2.5} y1={30 + Math.sin(a) * 2.5} x2={30 + Math.cos(a) * 18} y2={30 + Math.sin(a) * 18} opacity="0.8" />
        );
      })}
      {[...Array(4)].map((_, i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return <circle key={i} cx={30 + Math.cos(a) * 23} cy={30 + Math.sin(a) * 23} r="1.6" fill={c} stroke="none" />;
      })}
    </g>
  ),
};

function Emblem({ id, color, size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ overflow: "visible" }}>
      {EMBLEMS[id](color)}
    </svg>
  );
}

/* ---- canvas emblem renderer (for generated share images) ---- */
function drawEmblem(ctx, id, c) {
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const P = (d) => new Path2D(d);
  if (id === "sun") {
    ctx.beginPath(); ctx.arc(30, 30, 9.5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(30, 30, 3.2, 0, 7); ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6, r1 = i % 2 ? 13 : 14.5, r2 = i % 2 ? 17 : 21;
      ctx.beginPath();
      ctx.moveTo(30 + Math.cos(a) * r1, 30 + Math.sin(a) * r1);
      ctx.lineTo(30 + Math.cos(a) * r2, 30 + Math.sin(a) * r2);
      ctx.stroke();
    }
  } else if (id === "moon") {
    ctx.fill(P("M34 10 A 17 17 0 1 0 34 50 A 13.5 13.5 0 1 1 34 10 Z"));
    ctx.fill(P("M45 15 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z"));
  } else if (id === "tower") {
    ctx.stroke(P("M23 52 L25 22 L35 22 L37 52"));
    ctx.globalAlpha = 0.5;
    ctx.fill(P("M23 22 L23 16 L26 16 L26 19 L29 19 L29 16 L31 16 L31 19 L34 19 L34 16 L37 16 L37 22 Z"));
    ctx.globalAlpha = 1;
    ctx.stroke(P("M31 4 L26 15 L32 13 L26 26"));
    ctx.stroke(P("M20 52 L40 52"));
  } else if (id === "star") {
    ctx.fill(P("M30 8 L32.5 27.5 L52 30 L32.5 32.5 L30 52 L27.5 32.5 L8 30 L27.5 27.5 Z"));
    ctx.fill(P("M44 12 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1 Z"));
  } else if (id === "hermit") {
    ctx.stroke(P("M26 14 Q30 8 34 14"));
    ctx.stroke(P("M23 18 L37 18 L35 44 L25 44 Z"));
    ctx.fill(P("M30 25 Q33.5 30 30 35 Q26.5 30 30 25 Z"));
  } else {
    ctx.beginPath(); ctx.arc(30, 30, 18, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(30, 30, 11, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(30, 30, 2.5, 0, 7); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(30 + Math.cos(a) * 2.5, 30 + Math.sin(a) * 2.5);
      ctx.lineTo(30 + Math.cos(a) * 18, 30 + Math.sin(a) * 18);
      ctx.stroke();
    }
  }
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, cx, y);
      y += lh;
      line = w;
    } else line = t;
  }
  if (line) {
    ctx.fillText(line, cx, y);
    y += lh;
  }
  return y;
}

/* ---- generate a shareable image card for a journal entry ---- */
function makeShareCard(e) {
  const W2 = 540, H2 = 760;
  const cvs = document.createElement("canvas");
  cvs.width = W2;
  cvs.height = H2;
  const ctx = cvs.getContext("2d");

  // dithered sky background with halo + stars
  const lw = 135, lh = 190;
  const lo = document.createElement("canvas");
  lo.width = lw;
  lo.height = lh;
  const lctx = lo.getContext("2d");
  const im = lctx.createImageData(lw, lh);
  const sky = e.card.sky.map(hx);
  const rampC = ramp([sink(sky[0], 0.4), sky[0], sky[1], sky[2]], 12);
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const nx = x / lw, nyy = y / lh;
      const bt = BAYER[((y & 7) << 3) | (x & 7)];
      let idx = nyy * 11;
      const dxx = nx - 0.5, dyy = (nyy - 0.27) * 1.4;
      const dd = Math.sqrt(dxx * dxx + dyy * dyy);
      idx += Math.max(0, 0.36 - dd) * 8;
      if (idx < 0) idx = 0;
      if (idx > 11) idx = 11;
      let i0 = Math.floor(idx);
      if (idx - i0 > bt && i0 < 11) i0++;
      let col = rampC[i0];
      const sh = hash2(x * 1.7, y * 2.3);
      if (nyy < 0.5 && sh > 0.992) col = STAR;
      const q = (y * lw + x) * 4;
      im.data[q] = col[0];
      im.data[q + 1] = col[1];
      im.data[q + 2] = col[2];
      im.data[q + 3] = 255;
    }
  }
  lctx.putImageData(im, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lo, 0, 0, W2, H2);

  // frame
  ctx.strokeStyle = e.card.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, W2 - 32, H2 - 32);
  ctx.strokeStyle = e.card.accent + "55";
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, W2 - 48, H2 - 48);

  ctx.textAlign = "center";
  ctx.fillStyle = "#efe9ff";
  ctx.font = "600 21px Georgia";
  ctx.fillText("W O N D E R", W2 / 2, 62);
  ctx.fillStyle = "#cfc6e8";
  ctx.font = "italic 14px Georgia";
  ctx.fillText(`Day ${e.day} · ${e.place}`, W2 / 2, 88);

  // emblem
  ctx.save();
  ctx.translate(W2 / 2 - 66, 118);
  ctx.scale(2.2, 2.2);
  drawEmblem(ctx, e.card.id, e.card.accent);
  ctx.restore();

  ctx.fillStyle = e.card.accent;
  ctx.font = "17px Georgia";
  ctx.fillText(`${e.card.numeral} · ${e.card.name}`, W2 / 2, 292);
  ctx.fillStyle = "#cfc6e8";
  ctx.font = "italic 13px Georgia";
  ctx.fillText(`“${e.card.epigraph}”`, W2 / 2, 316);

  // passage
  const passage =
    e.opener.replace("{{Q}}", e.question.label.toLowerCase()) +
    " " +
    e.answer.replace("{{C}}", e.card.name) +
    " " +
    e.depart;
  ctx.fillStyle = "#e8e2f5";
  ctx.font = "15px Georgia";
  let yy = wrapText(ctx, passage, W2 / 2, 362, W2 - 120, 24);

  // divider
  ctx.fillStyle = e.card.accent;
  ctx.font = "12px Georgia";
  ctx.fillText("─── ✦ ───", W2 / 2, yy + 16);

  // reading
  ctx.fillStyle = "#b5a8d5";
  ctx.font = "italic 13.5px Georgia";
  yy = wrapText(ctx, e.card.readings[e.question.id], W2 / 2, yy + 46, W2 - 130, 21);

  ctx.fillStyle = "#8a7ab5";
  ctx.font = "12px Georgia";
  ctx.fillText("— the wanderer's chronicle —", W2 / 2, H2 - 44);

  return cvs.toDataURL("image/png");
}

function CardFace({ card }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)",
        borderRadius: 10, border: `1px solid ${card.accent}`,
        boxShadow: `0 0 44px ${card.accent}44, inset 0 0 0 3px #120d20, inset 0 0 0 4px ${card.accent}55`,
        background: "linear-gradient(180deg,#151022,#0e0a18)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
        padding: "12px 8px", overflow: "hidden",
      }}
    >
      <div style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: 3, color: card.accent }}>{card.numeral}</div>
      <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <DitherGlow color={card.accent} size={96} alpha={0.3} style={{ position: "absolute", top: 0, left: 0 }} />
        <Emblem id={card.id} color={card.accent} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 13, letterSpacing: 2, color: "#efe9ff" }}>
          {card.name.toLowerCase()}
        </div>
        <div style={{ fontSize: 8, color: "#8a7ab5", marginTop: 3, letterSpacing: 4 }}>✦ ✦ ✦</div>
      </div>
    </div>
  );
}

function CardBackArt({ style }) {
  return (
    <div
      style={{
        borderRadius: 10, border: "1px solid #5c4a8a",
        background: "linear-gradient(160deg,#1a1230,#120c22)",
        boxShadow: "inset 0 0 0 3px #120d20, inset 0 0 0 4px #5c4a8a55",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden", ...style,
      }}
    >
      <DitherGlow color="#8a7ab5" size={110} alpha={0.2} style={{ position: "absolute" }} />
      <div style={{ fontFamily: SERIF, fontSize: 26, color: "#a99ac9" }}>✦</div>
      <div style={{ position: "absolute", top: 7, left: 10, color: "#5c4a8a", fontSize: 10 }}>✧</div>
      <div style={{ position: "absolute", top: 7, right: 10, color: "#5c4a8a", fontSize: 10 }}>✧</div>
      <div style={{ position: "absolute", bottom: 7, left: 10, color: "#5c4a8a", fontSize: 10 }}>✧</div>
      <div style={{ position: "absolute", bottom: 7, right: 10, color: "#5c4a8a", fontSize: 10 }}>✧</div>
    </div>
  );
}

/* ---- wayside scenery ---- */
function FaeTree({ h, fill, delay = 0 }) {
  return (
    <svg
      width={h * 0.62} height={h} viewBox="0 0 62 100"
      style={{ display: "block", transformOrigin: "50% 100%", animation: `sway 7s ${delay}s ease-in-out infinite` }}
    >
      <path
        d="M31 2 Q44 16 35 23 Q52 32 37 41 Q56 54 39 61 Q60 76 31 81 Q2 76 23 61 Q6 54 25 41 Q10 32 27 23 Q18 16 31 2 Z"
        fill={fill} style={{ transition: "fill 1.4s ease" }}
      />
      <path d="M29 80 L28 100 L34 100 L33 80 Z" fill={fill} style={{ transition: "fill 1.4s ease", filter: "brightness(0.65)" }} />
    </svg>
  );
}

function MossStone({ h, fill }) {
  return (
    <div
      style={{
        width: h * 0.55, height: h * 0.38, background: fill,
        borderRadius: "46% 54% 42% 44% / 62% 70% 30% 32%",
        boxShadow: "inset -5px -5px 10px rgba(0,0,0,.45)",
        transition: "background 1.4s ease",
      }}
    />
  );
}

function WayShrine({ h, fill, accent }) {
  return (
    <svg width={h * 0.72} height={h} viewBox="0 0 40 56" style={{ display: "block", filter: `drop-shadow(0 0 5px ${accent}88)` }}>
      <path d="M4 14 Q20 2 36 14 L33 18 Q20 8 7 18 Z" fill={fill} style={{ transition: "fill 1.4s ease" }} />
      <rect x="9" y="16" width="4" height="36" fill={fill} style={{ transition: "fill 1.4s ease" }} />
      <rect x="27" y="16" width="4" height="36" fill={fill} style={{ transition: "fill 1.4s ease" }} />
      <circle cx="20" cy="30" r="3" fill={accent} style={{ transition: "fill 1.4s ease" }} />
    </svg>
  );
}

function WayPost({ h, fill, accent }) {
  return (
    <svg width={h * 0.6} height={h} viewBox="0 0 30 60" style={{ display: "block" }}>
      <rect x="13" y="6" width="4" height="54" fill={fill} style={{ transition: "fill 1.4s ease" }} />
      <rect x="4" y="10" width="22" height="6" rx="2" fill={fill} style={{ transition: "fill 1.4s ease" }} />
      <circle cx="15" cy="4" r="2.5" fill={accent} style={{ transition: "fill 1.4s ease", filter: `drop-shadow(0 0 4px ${accent})` }} />
    </svg>
  );
}

function Shroom({ h, fill, accent }) {
  return (
    <svg width={h * 0.9} height={h} viewBox="0 0 36 40" style={{ display: "block" }}>
      <rect x="15" y="18" width="6" height="22" rx="2" fill={fill} style={{ transition: "fill 1.4s ease" }} />
      <path d="M2 20 Q 18 -6 34 20 Q 18 14 2 20 Z" fill={fill} style={{ transition: "fill 1.4s ease" }} />
      <circle cx="10" cy="14" r="1.8" fill={accent} opacity="0.85" style={{ transition: "fill 1.4s ease" }} />
      <circle cx="22" cy="10" r="1.5" fill={accent} opacity="0.85" style={{ transition: "fill 1.4s ease" }} />
      <circle cx="27" cy="15" r="1.2" fill={accent} opacity="0.85" style={{ transition: "fill 1.4s ease" }} />
    </svg>
  );
}

/* ============================================================
   THE TWELVE WAYMARKS — large set-piece scenes tied to their names
   ============================================================ */
function LandmarkArt({ idx, fill, accent }) {
  const tf = { transition: "fill 1.4s ease" };
  const ts = { transition: "stroke 1.4s ease" };
  const dark = { ...tf, filter: "brightness(0.78)" };
  const lite = { ...tf, filter: "brightness(1.15)" };
  switch (idx) {
    case 0: // the Ashen Pines — a whole burnt grove
      return (
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 1 }}>
          <FaeTree h={72} fill={fill} />
          <FaeTree h={112} fill={fill} delay={0.8} />
          <svg width="20" height="34" viewBox="0 0 20 34">
            <path d="M5 34 L6 16 L14 14 L15 34 Z" fill={fill} style={dark} />
            <path d="M6 16 L3 8" stroke={fill} strokeWidth="2.4" style={ts} />
          </svg>
          <FaeTree h={152} fill={fill} delay={1.6} />
          <FaeTree h={96} fill={fill} delay={2.4} />
          <svg width="16" height="24" viewBox="0 0 16 24">
            <path d="M3 24 L4 10 L11 9 L12 24 Z" fill={fill} style={dark} />
          </svg>
          <FaeTree h={58} fill={fill} delay={3.1} />
          {[[46, 24], [92, 2], [128, 34], [70, 50]].map(([lx, ty], i) => (
            <div key={i} style={{ position: "absolute", left: lx, top: ty, width: 5, height: 5, borderRadius: "50%", background: "#8a8598", opacity: 0.28, animation: `drift ${7 + i * 2}s ${i * 1.2}s ease-in-out infinite` }} />
          ))}
        </div>
      );
    case 1: // the Leaning Shrine — a three-roofed pagoda, tilted, with prayer flags
      return (
        <div style={{ position: "relative" }}>
          <div style={{ transform: "rotate(-4deg)", transformOrigin: "bottom center" }}>
            <svg width={132} height={172} viewBox="0 0 132 172">
              <path d="M12 36 Q66 4 120 36 L106 47 Q66 22 26 47 Z" fill={fill} style={tf} />
              <path d="M24 74 Q66 48 108 74 L97 84 Q66 62 35 84 Z" fill={fill} style={tf} />
              <path d="M34 110 Q66 88 98 110 L90 119 Q66 100 42 119 Z" fill={fill} style={tf} />
              <rect x="40" y="44" width="7" height="128" fill={fill} style={tf} />
              <rect x="85" y="44" width="7" height="128" fill={fill} style={tf} />
              <rect x="59" y="116" width="14" height="56" fill={fill} style={dark} />
              <line x1="66" y1="36" x2="66" y2="54" stroke={fill} strokeWidth="2" style={ts} />
              <circle cx="66" cy="59" r="5" fill={accent} style={{ ...tf, filter: `drop-shadow(0 0 6px ${accent})` }} />
              <rect x="48" y="152" width="36" height="9" rx="2" fill={fill} style={dark} />
              <circle cx="66" cy="148" r="2.6" fill={accent} style={{ ...tf, filter: `drop-shadow(0 0 4px ${accent})`, animation: "fadeGlow 4s ease-in-out infinite" }} />
            </svg>
          </div>
          <svg width={170} height={46} viewBox="0 0 170 46" style={{ position: "absolute", top: -8, left: -20 }}>
            <path d="M4 40 Q 85 6 166 34" stroke={fill} strokeWidth="1.4" fill="none" style={ts} />
            {[20, 46, 72, 98, 124, 148].map((fx, i) => {
              const fy = 40 - Math.sin(((fx - 4) / 162) * Math.PI) * 30 + 2;
              return <path key={i} d={`M${fx} ${fy} l10 2 l-8 8 Z`} fill={i % 2 ? accent : fill} opacity={i % 2 ? 0.8 : 0.9} style={tf} />;
            })}
          </svg>
        </div>
      );
    case 2: // the Grey River crossing — real water, a bridge, reeds, lily pads
      return (
        <svg width={236} height={152} viewBox="0 0 236 152">
          <path
            d="M98 0 C 90 28, 112 48, 94 74 C 80 94, 58 110, 22 134 L 224 134 C 158 110, 146 88, 138 64 C 130 42, 138 20, 132 0 Z"
            fill="#22304d" opacity="0.94"
          />
          <path d="M98 0 C 90 28, 112 48, 94 74 C 80 94, 58 110, 22 134" stroke="#3d4f78" strokeWidth="2" fill="none" />
          <path d="M132 0 C 138 20, 130 42, 138 64 C 146 88, 158 110, 224 134" stroke="#3d4f78" strokeWidth="2" fill="none" />
          {[[60, 112, 30], [104, 92, 22], [150, 108, 26]].map(([wx, wy, wl], i) => (
            <path key={`w${i}`} d={`M${wx} ${wy} q ${wl / 2} -4 ${wl} 0`} stroke="#5a6e9e" strokeWidth="1.4" fill="none" opacity="0.7" />
          ))}
          <path d="M46 92 Q 118 66 190 92" stroke={fill} strokeWidth="8" fill="none" style={ts} />
          <path d="M46 101 Q 118 76 190 101" stroke={fill} strokeWidth="4" fill="none" opacity="0.85" style={ts} />
          {[52, 85, 118, 151, 184].map((bx, i) => {
            const by = 92 - Math.sin(((bx - 46) / 144) * Math.PI) * 21;
            return <line key={`b${i}`} x1={bx} y1={by + 2} x2={bx} y2={by + 11} stroke={fill} strokeWidth="2.4" style={ts} />;
          })}
          <rect x="42" y="90" width="6" height="30" fill={fill} style={tf} />
          <rect x="188" y="90" width="6" height="30" fill={fill} style={tf} />
          <circle cx="45" cy="86" r="4" fill={accent} style={{ ...tf, filter: `drop-shadow(0 0 6px ${accent})`, animation: "fadeGlow 5s ease-in-out infinite" }} />
          {[[74, 122, 10], [128, 116, 8], [166, 124, 11], [100, 128, 7]].map(([px, py, pr], i) => (
            <g key={`l${i}`}>
              <ellipse cx={px} cy={py} rx={pr} ry={pr * 0.42} fill="#2e4a35" />
              <path d={`M${px} ${py} L${px + pr * 0.9} ${py - pr * 0.28}`} stroke="#22304d" strokeWidth="1.6" />
            </g>
          ))}
          <circle cx="130" cy="114" r="2.2" fill={accent} style={{ ...tf, filter: `drop-shadow(0 0 3px ${accent})` }} />
          {[[14, 134], [212, 132], [26, 140]].map(([rx, ry], i) => (
            <g key={`r${i}`} style={{ transformOrigin: `${rx}px ${ry}px`, animation: `sway 5s ${i * 0.8}s ease-in-out infinite` }}>
              <path d={`M${rx} ${ry} C ${rx - 2} ${ry - 12}, ${rx - 1} ${ry - 22}, ${rx - 3} ${ry - 30}`} stroke={fill} strokeWidth="1.6" fill="none" style={ts} />
              <path d={`M${rx + 4} ${ry} C ${rx + 3} ${ry - 10}, ${rx + 5} ${ry - 18}, ${rx + 3} ${ry - 26}`} stroke={fill} strokeWidth="1.6" fill="none" style={ts} />
              <path d={`M${rx + 8} ${ry} C ${rx + 7} ${ry - 8}, ${rx + 9} ${ry - 14}, ${rx + 8} ${ry - 20}`} stroke={fill} strokeWidth="1.4" fill="none" style={ts} />
            </g>
          ))}
        </svg>
      );
    case 3: // the Standing Stones — a ring with waking runes
      return (
        <div style={{ position: "relative" }}>
          <svg width={190} height={130} viewBox="0 0 190 130">
            {[[8, 58, 20, 66, -8], [42, 34, 26, 92, -3], [86, 24, 30, 104, 0], [132, 36, 26, 90, 4], [166, 60, 18, 64, 9]].map(([x, y, w, h, r], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} rx={8} fill={fill} transform={`rotate(${r} ${x + w / 2} ${y + h})`} style={tf} />
            ))}
            <rect x="70" y="112" width="52" height="12" rx="4" fill={fill} style={dark} />
            {[[52, 78], [98, 62], [142, 76]].map(([gx, gy], i) => (
              <path key={`g${i}`} d={`M${gx} ${gy} l4 -7 l4 7 M${gx + 4} ${gy - 7} l0 16`} stroke={accent} strokeWidth="1.6" fill="none" opacity="0.9" style={{ ...ts, animation: `fadeGlow ${3 + i}s ${i * 0.6}s ease-in-out infinite` }} />
            ))}
          </svg>
          <div style={{ position: "absolute", left: "50%", top: 46, transform: "translateX(-50%)", width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 12px ${accent}`, animation: "fadeGlow 3.2s ease-in-out infinite" }} />
        </div>
      );
    case 4: // the Lantern Tree — hung with a hundred cold flames
      return (
        <div style={{ position: "relative" }}>
          <FaeTree h={196} fill={fill} />
          {[[34, 26], [70, 46], [24, 66], [78, 84], [44, 104], [58, 16], [16, 44], [86, 32], [30, 128], [66, 120], [50, 62], [12, 92]].map(([lx, ty], i) => (
            <div key={i} style={{ position: "absolute", left: lx, top: ty }}>
              <div style={{ width: 1.2, height: 7, background: fill, margin: "0 auto", opacity: 0.7 }} />
              <div style={{ width: 5, height: 7, borderRadius: 2, background: accent, boxShadow: `0 0 7px ${accent}`, animation: `fadeGlow ${2 + (i % 4)}s ${i * 0.33}s ease-in-out infinite`, transition: "background 1.4s ease" }} />
            </div>
          ))}
        </div>
      );
    case 5: // the High Church — spire, rose window, gravestones
      return (
        <svg width={168} height={204} viewBox="0 0 168 204">
          <rect x="38" y="116" width="96" height="88" fill={fill} style={tf} />
          <path d="M30 120 L86 84 L142 120 Z" fill={fill} style={dark} />
          <rect x="70" y="52" width="32" height="72" fill={fill} style={tf} />
          <path d="M66 56 L86 6 L106 56 Z" fill={fill} style={tf} />
          <circle cx="86" cy="2.5" r="3" fill={accent} style={{ ...tf, filter: `drop-shadow(0 0 6px ${accent})` }} />
          <circle cx="86" cy="92" r="10" fill={accent} style={{ ...tf, filter: `drop-shadow(0 0 8px ${accent})`, animation: "fadeGlow 6s ease-in-out infinite" }} />
          <circle cx="86" cy="92" r="10" fill="none" stroke={fill} strokeWidth="2.4" style={ts} />
          {[0, 1, 2].map((i) => {
            const a = (i * Math.PI) / 3;
            return <line key={i} x1={86 - Math.cos(a) * 10} y1={92 - Math.sin(a) * 10} x2={86 + Math.cos(a) * 10} y2={92 + Math.sin(a) * 10} stroke={fill} strokeWidth="1.4" style={ts} />;
          })}
          {[52, 108].map((wx, i) => (
            <path key={`w${i}`} d={`M${wx} 204 L${wx} 156 Q ${wx + 6} 144 ${wx + 12} 156 L${wx + 12} 204`} fill={accent} opacity="0.5" style={{ ...tf, animation: `fadeGlow ${7 + i}s ease-in-out infinite` }} />
          ))}
          <path d="M78 204 L78 168 Q 86 156 94 168 L94 204 Z" fill="#0a0812" opacity="0.6" />
          <path d="M38 204 L22 204 L38 148 Z" fill={fill} style={dark} />
          <path d="M134 204 L150 204 L134 148 Z" fill={fill} style={dark} />
          {[[6, 186, 12], [156, 182, 10], [148, 192, 8]].map(([gx, gy, gh], i) => (
            <path key={`t${i}`} d={`M${gx} 204 L${gx} ${gy + 4} Q ${gx + gh / 2} ${gy - 6} ${gx + gh} ${gy + 4} L${gx + gh} 204 Z`} fill={fill} style={dark} />
          ))}
        </svg>
      );
    case 6: // the Hollow Gate — a ruined wall pierced by an open arch
      return (
        <div style={{ position: "relative" }}>
          <svg width={190} height={158} viewBox="0 0 190 158">
            <path d="M0 158 L0 96 L14 92 L16 74 L30 78 L34 96 L52 100 L52 158 Z" fill={fill} style={dark} />
            <path d="M190 158 L190 100 L176 94 L172 78 L158 84 L156 100 L138 104 L138 158 Z" fill={fill} style={dark} />
            <path d="M52 158 L52 74 Q 95 22 138 74 L138 158 L118 158 L118 80 Q 95 46 72 80 L72 158 Z" fill={fill} style={tf} />
            <path d="M62 62 L68 56 M128 56 L122 62" stroke={fill} strokeWidth="2.4" style={ts} />
            <circle cx="95" cy="38" r="3.4" fill={accent} style={{ ...tf, filter: `drop-shadow(0 0 7px ${accent})` }} />
          </svg>
          <div style={{ position: "absolute", left: "50%", bottom: 2, transform: "translateX(-50%)", width: 44, height: 70, background: `radial-gradient(ellipse at 50% 100%, ${accent}26, transparent 75%)`, animation: "fadeGlow 5s ease-in-out infinite" }} />
        </div>
      );
    case 7: // the Sunken Bell — a ruined belfry over a half-buried bell
      return (
        <svg width={150} height={128} viewBox="0 0 150 128">
          <rect x="20" y="18" width="7" height="106" fill={fill} style={tf} />
          <rect x="110" y="30" width="7" height="94" fill={fill} style={tf} />
          <path d="M20 22 L74 14 L96 18" stroke={fill} strokeWidth="5" fill="none" style={ts} />
          <path d="M96 18 L104 26" stroke={fill} strokeWidth="3" fill="none" opacity="0.7" style={ts} />
          <path d="M60 20 Q 62 42 70 58" stroke={fill} strokeWidth="2" fill="none" style={ts} />
          <g transform="rotate(12 84 96)">
            <path d="M56 108 C 56 74, 66 58, 84 58 C 102 58, 112 74, 112 108 Z" fill={fill} style={tf} />
            <rect x="52" y="104" width="64" height="8" rx="3" fill={fill} style={dark} />
            <path d="M80 68 L84 82 L79 96" stroke="#0a0812" strokeWidth="1.8" fill="none" opacity="0.6" />
            <circle cx="84" cy="54" r="3" fill={accent} style={{ ...tf, filter: `drop-shadow(0 0 4px ${accent})` }} />
          </g>
          {[[10, 120], [128, 116], [140, 122], [40, 124]].map(([gx, gy], i) => (
            <path key={i} d={`M${gx} ${gy + 6} q 2 -9 4 0 q 2 -7 5 0 q 2 -5 4 0`} stroke={fill} strokeWidth="1.5" fill="none" style={ts} />
          ))}
        </svg>
      );
    case 8: // the Weeping Willow — over its own still pool
      return (
        <div style={{ position: "relative" }}>
          <svg width={170} height={168} viewBox="0 0 170 168" style={{ display: "block" }}>
            <ellipse cx="100" cy="158" rx="58" ry="9" fill="#22304d" opacity="0.85" />
            {[[76, 156, 8], [122, 160, 7]].map(([px, py, pr], i) => (
              <ellipse key={i} cx={px} cy={py} rx={pr} ry={pr * 0.4} fill="#2e4a35" />
            ))}
            <path d="M70 160 C 68 124, 66 94, 74 66 C 78 52, 84 44, 90 42" stroke={fill} strokeWidth="9" fill="none" strokeLinecap="round" style={ts} />
            <path d="M24 52 Q 84 2 148 54 Q 86 34 24 52 Z" fill={fill} style={tf} />
            <g style={{ transformOrigin: "85px 48px", animation: "sway 6s ease-in-out infinite" }}>
              {[[32, 52, 100], [50, 44, 120], [70, 38, 132], [90 , 38, 136], [110, 42, 124], [130, 48, 106], [146, 54, 86]].map(([x, y, len], i) => (
                <path key={i} d={`M${x} ${y} C ${x - 5} ${y + len * 0.4}, ${x + 5} ${y + len * 0.7}, ${x - 2} ${y + len}`} stroke={fill} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity={0.92 - i * 0.05} style={ts} />
              ))}
            </g>
          </svg>
          {[[46, 110], [100, 128], [76, 92], [126, 108]].map(([lx, ty], i) => (
            <div key={i} style={{ position: "absolute", left: lx, top: ty, width: 3, height: 3, borderRadius: "50%", background: accent, boxShadow: `0 0 5px ${accent}`, animation: `fadeGlow ${2.4 + i}s ${i * 0.7}s ease-in-out infinite` }} />
          ))}
        </div>
      );
    case 9: // the Goblin Camp — tents, fire ring, skull totem, scattered bones
      return (
        <div style={{ position: "relative" }}>
          <svg width={216} height={136} viewBox="0 0 216 136">
            <path d="M14 128 L52 56 L90 128 Z" fill={fill} style={tf} />
            <path d="M52 56 L52 128" stroke="#0a0812" strokeWidth="1.6" opacity="0.5" />
            {[[34, 96], [66, 92], [44, 74]].map(([sx, sy], i) => (
              <line key={i} x1={sx} y1={sy} x2={sx + 7} y2={sy - 3} stroke="#0a0812" strokeWidth="1.2" opacity="0.45" />
            ))}
            <path d="M38 128 L52 98 L66 128 Z" fill="#0a0812" opacity="0.55" />
            <path d="M150 130 L176 86 L202 130 Z" fill={fill} style={dark} />
            <path d="M176 86 L176 130" stroke="#0a0812" strokeWidth="1.4" opacity="0.5" />
            {[[100, 124], [112, 130], [126, 124], [134, 118], [104, 114]].map(([ex, ey], i) => (
              <ellipse key={`s${i}`} cx={ex} cy={ey} rx="6" ry="4" fill={fill} style={dark} />
            ))}
            <rect x="106" y="106" width="18" height="4" rx="2" fill={fill} style={dark} transform="rotate(24 115 108)" />
            <rect x="106" y="106" width="18" height="4" rx="2" fill={fill} style={dark} transform="rotate(-24 115 108)" />
            <path d="M115 84 Q 122 96 115 110 Q 108 96 115 84 Z" fill="#e8875a" style={{ animation: "flicker 1.6s ease-in-out infinite", transformOrigin: "115px 110px" }} />
            <path d="M115 92 Q 119 100 115 108 Q 111 100 115 92 Z" fill="#f2c14e" style={{ animation: "flicker 1.1s .3s ease-in-out infinite", transformOrigin: "115px 108px" }} />
            <rect x="140" y="58" width="6" height="66" fill={fill} style={tf} />
            <circle cx="143" cy="52" r="7" fill="#d9cfc0" opacity="0.9" />
            <circle cx="140.5" cy="51" r="1.6" fill="#0a0812" />
            <circle cx="145.5" cy="51" r="1.6" fill="#0a0812" />
            <path d="M136 44 L132 36 M150 44 L154 36" stroke="#d9cfc0" strokeWidth="2" opacity="0.8" />
            <rect x="18" y="116" width="16" height="12" rx="1" fill={fill} style={dark} />
            {[[80, 132], [160, 134], [96, 134]].map(([bx, by], i) => (
              <g key={`bn${i}`} opacity="0.55">
                <line x1={bx} y1={by} x2={bx + 9} y2={by - 2} stroke="#d9cfc0" strokeWidth="1.6" />
                <circle cx={bx} cy={by} r="1.4" fill="#d9cfc0" />
                <circle cx={bx + 9} cy={by - 2} r="1.4" fill="#d9cfc0" />
              </g>
            ))}
          </svg>
          <div style={{ position: "absolute", left: 103, top: 88, width: 24, height: 24, borderRadius: "50%", background: "radial-gradient(circle, #e8875a55, transparent 70%)", animation: "flicker 2s ease-in-out infinite" }} />
          {[[112, 60], [120, 44]].map(([sx, sy], i) => (
            <div key={i} style={{ position: "absolute", left: sx, top: sy, width: 4, height: 4, borderRadius: "50%", background: "#8a8598", opacity: 0.3, animation: `drift ${6 + i * 2}s ${i}s ease-in-out infinite` }} />
          ))}
        </div>
      );
    case 10: // the Old Watchtower — rubble, torn flag, one lit window
      return (
        <svg width={120} height={186} viewBox="0 0 120 186">
          <path d="M34 186 L42 44 L78 44 L86 186 Z" fill={fill} style={tf} />
          <path d="M42 44 L38 28 L48 36 L53 24 L61 34 L69 22 L74 36 L82 28 L78 44 Z" fill={fill} style={dark} />
          <line x1="44" y1="24" x2="44" y2="2" stroke={fill} strokeWidth="2" style={ts} />
          <path d="M44 4 L64 8 L52 13 L58 17 L44 18 Z" fill={accent} opacity="0.85" style={{ ...tf, transformOrigin: "44px 10px", animation: "sway 3.4s ease-in-out infinite" }} />
          <rect x="53" y="72" width="12" height="16" rx="5" fill={accent} style={{ ...tf, filter: `drop-shadow(0 0 7px ${accent})`, animation: "fadeGlow 6s ease-in-out infinite" }} />
          <rect x="55" y="118" width="9" height="12" rx="4" fill="#0a0812" opacity="0.55" />
          <path d="M36 176 C 42 152, 38 128, 44 106" stroke={fill} strokeWidth="1.8" fill="none" opacity="0.7" style={{ ...ts, filter: "brightness(1.3)" }} />
          {[[12, 176, 16], [96, 172, 14], [104, 180, 10], [20, 182, 9]].map(([rx, ry, rw], i) => (
            <ellipse key={i} cx={rx + rw / 2} cy={ry + 4} rx={rw / 2} ry={rw / 4} fill={fill} style={dark} />
          ))}
        </svg>
      );
    default: // the Mushroom Hollow — a glowing stand of giants
      return (
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 2 }}>
          <Shroom h={52} fill={fill} accent={accent} />
          <Shroom h={116} fill={fill} accent={accent} />
          <Shroom h={84} fill={fill} accent={accent} />
          <Shroom h={64} fill={fill} accent={accent} />
          {[[28, -12], [66, -28], [102, -10], [50, -44]].map(([lx, ty], i) => (
            <div key={i} style={{ position: "absolute", left: lx, top: ty + 44, width: 2.5, height: 2.5, borderRadius: "50%", background: accent, boxShadow: `0 0 5px ${accent}`, animation: `drift ${6 + i * 2}s ${i}s ease-in-out infinite, fadeGlow 3s ${i * 0.5}s ease-in-out infinite` }} />
          ))}
        </div>
      );
  }
}

/* ---- depth-aware parallax layers ----
   Four bands stacked between the road and the skyline. Depth drives BOTH
   size and screen height, so nothing further away is ever drawn larger than
   something in front of it. Size ranges are deliberately non-overlapping.

     fg    speed 1.50   biggest, sits below the road edge
     near  speed 0.85   just above the road
     mid   speed 0.55   fills the middle distance
     far   speed 0.28   smallest, sits on the skyline
*/
const HORIZON_PCT = (1 - HORIZON) * 100;

const LAYERS = {
  far:  { seed: 11.1, speed: 0.28, n: 15, size: [22, 36],  bottom: [HORIZON_PCT - 1.5, HORIZON_PCT + 2], opacity: 0.70 },
  mid:  { seed: 37.9, speed: 0.55, n: 12, size: [42, 68],  bottom: [29, 38.5], opacity: 0.88 },
  near: { seed: 63.3, speed: 0.85, n: 10, size: [82, 120], bottom: [20.5, 26], opacity: 1 },
  fg:   { seed: 91.7, speed: 1.50, n: 7,  size: [138, 200], bottom: [-4.5, -1], opacity: 0.95 },
};

/* Rendered height relative to a pine at the same layer size. Without this
   every kind draws at the same height and a roadside stone reads as tall as
   a tree. MossStone renders at 0.38x the h it is given, so its multiplier is
   raised to compensate; the rest render at their full h. */
const PROP_H_MUL = { pine: 1, lantern: 0.95, shrine: 0.62, post: 0.54, shroom: 0.32, stone: 0.58 };

function mkLayer(region, key) {
  const L = LAYERS[key];
  const table = REGION_KINDS[region % REGION_KINDS.length];
  return [...Array(L.n)].map((_, i) => {
    const r = (kk) => hash2(i * 17.3 + region * 71.7 + L.seed, kk);
    /* Guarantee a tree every third slot so no band ever looks bare, and let
       the region table supply character in between. */
    const kind = i % 4 === 0 ? "pine" : table[Math.floor(r(2) * table.length)];
    const size = L.size[0] + r(3) * (L.size[1] - L.size[0]);
    return {
      x: (i / L.n) * STRIP_W + r(1) * (STRIP_W / L.n) * 0.7,
      kind,
      h: size * (PROP_H_MUL[kind] ?? 1) * PROP_SCALE,
      bottom: L.bottom[0] + r(4) * (L.bottom[1] - L.bottom[0]),
      delay: r(5) * 6,
    };
  });
}

/* ============================================================
   AVATARS
   ============================================================ */
const AVATARS = [
  { id: "rowan", name: "Rowan", cls: "the wanderer" },
  { id: "wren", name: "Wren", cls: "the wayfarer" },
  { id: "aldric", name: "Ser Aldric", cls: "the paladin" },
  { id: "osric", name: "Brother Osric", cls: "the monk" },
  { id: "lyra", name: "Lyra", cls: "the enchantress" },
  { id: "thorn", name: "Thorn", cls: "the ranger" },
  { id: "finch", name: "Finch", cls: "the bard" },
];

/* ============================================================
   SPRITE ENGINE  —  real-art path
   ------------------------------------------------------------
   Normalized strips: cell 128x176, anchor (64,172), body 124px,
   facing right, 12 colors with 3 reserved accent hexes.

   Frame count is INFERRED from sheet width, so 4-, 8- and
   24-frame animations all work with no code change here.

   Produced by wonder-sprite-engine.jsx (Import tab). See
   WONDER-sprite-pipeline.md for the format contract.
   ============================================================ */

const SPRITE = {
  cell: { w: 128, h: 176 },
  anchor: { x: 64, y: 172 },
  accent: ["#f0d69a", "#c9a227", "#7a5f14"], // highlight - midtone - shadow
};

/* Legacy SVG avatars stand about 84px tall; the production sprite body is
   124. Scale the old ones up so the roster reads at one size on stage.
   Delete this constant once all seven characters ship real art. */
const LEGACY_SCALE = 1.45;

const ALDRIC_WALK = "data:image/png;base64,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";
const LYRA_WALK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADAAAAACwCAMAAAAchQ2SAAADAFBMVEUAAAAKBg0VERkhHCMsJjA8ND5TSUx0aGh6XxSgkY3Joifex7Tw1poAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACyoAq0AAAAAXRSTlMAQObYZgAA8tdJREFUeNrsvYuW6ziuJGoRIGll5v9/7xUiAJKynbtnTDrrrjXiOd1dj+6iLJEBROB1u13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWta51rWtd61rXuta1rnWta13rWte61rWuda1rXeta17rWtf5/vHLO10u41rWuda3/Nw3A9Q6uda1rXes/csD/MwTOemxejpX/wx9/7H6ZoGtd61oX/v8n+HsB8LWu5Uux/vIGFq7/bP98acD/Jf7m8ev/8VHP/fj9B4/Q6Yf9/3UarvX/Iv777at9/+Ne/OX+F/7/9wbgv4G/Ef7/KwC+3I9rPQJwzvqnB3AAYPgkx9K/eYS4f7W6B4adbX/Vv0WAWk8W6E9f/38tgfxn++c8QnD9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";

/* Characters with real art. Anything absent falls through to the legacy
   SVG below, so a half-finished roster never breaks the app.
   fps 0 means hold frame 0 — used for idle until a real idle sheet lands. */
const SHEETS = {
  aldric: {
    walk: { src: ALDRIC_WALK, fps: 10 },
    idle: { src: ALDRIC_WALK, fps: 0 },
  },
  lyra: {
    walk: { src: LYRA_WALK, fps: 10 },
    idle: { src: LYRA_WALK, fps: 0 },
  },
};

const inferFrames = (id) => Math.max(1, Math.round(id.width / SPRITE.cell.w));

const sHex2rgb = (h) => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
];
const sClamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

function sRgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h *= 60; if (h < 0) h += 360;
  const l = (mx + mn) / 2;
  return [h, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
}

function sHsl2rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let v;
  if (h < 60) v = [c, x, 0]; else if (h < 120) v = [x, c, 0];
  else if (h < 180) v = [0, c, x]; else if (h < 240) v = [0, x, c];
  else if (h < 300) v = [x, 0, c]; else v = [c, 0, x];
  return v.map((q) => sClamp((q + m) * 255));
}

/* Three steps derived from the card accent, spaced to match the reserved
   slots so tinted art keeps its modelling. */
function accentRamp(hex) {
  const [h, s, l] = sRgb2hsl(...sHex2rgb(hex));
  return [
    sHsl2rgb(h, Math.max(0, s - 0.1), Math.min(0.92, l + 0.2)),
    sHsl2rgb(h, s, l),
    sHsl2rgb(h, Math.min(1, s + 0.06), Math.max(0.06, l - 0.24)),
  ];
}

/* Keyed on the ImageData object, not a string: two sheets of identical
   dimensions would otherwise collide and render stale art. */
const tintCache = new WeakMap();

function getTinted(base, accent) {
  let byAccent = tintCache.get(base);
  if (!byAccent) { byAccent = new Map(); tintCache.set(base, byAccent); }
  if (byAccent.has(accent)) return byAccent.get(accent);
  const out = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
  const reserved = SPRITE.accent.map(sHex2rgb);
  const ramp = accentRamp(accent);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    for (let k = 0; k < 3; k++) {
      const [rr, gg, bb] = reserved[k];
      if (d[i] === rr && d[i + 1] === gg && d[i + 2] === bb) {
        d[i] = ramp[k][0]; d[i + 1] = ramp[k][1]; d[i + 2] = ramp[k][2];
        break;
      }
    }
  }
  const c = document.createElement("canvas");
  c.width = out.width; c.height = out.height;
  c.getContext("2d").putImageData(out, 0, 0);
  byAccent.set(accent, c);
  return c;
}

function useSheet(src) {
  const [id, setId] = useState(null);
  useEffect(() => {
    if (!src) { setId(null); return; }
    let dead = false;
    const img = new Image();
    img.onload = () => {
      if (dead) return;
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const cx = c.getContext("2d", { willReadFrequently: true });
      cx.imageSmoothingEnabled = false;
      cx.drawImage(img, 0, 0);
      setId(cx.getImageData(0, 0, c.width, c.height));
    };
    img.src = src;
    return () => { dead = true; };
  }, [src]);
  return id;
}

/* The element's BOTTOM EDGE is the anchor row, matching how the legacy SVG
   sat, so both paths mount identically at left:22% bottom:12.5%. */
function SpriteWanderer({ entry, accent, walking, scale = 1 }) {
  const sheet = useSheet(entry.src);
  const cvs = useRef(null);
  const raf = useRef(0);
  const fade = useRef({ from: accent, to: accent, t: 1 });
  const prev = useRef(accent);

  useEffect(() => {
    if (accent === prev.current) return;
    fade.current = { from: prev.current, to: accent, t: 0 };
    prev.current = accent;
  }, [accent]);

  useEffect(() => {
    if (!sheet || !cvs.current) return;
    const { w, h } = SPRITE.cell;
    const n = inferFrames(sheet);
    const fps = entry.fps ?? 8;
    const ctx = cvs.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const t0 = performance.now();
    const tick = (now) => {
      const frame = fps > 0 ? Math.floor(((now - t0) / 1000) * fps) % n : 0;
      if (fade.current.t < 1) fade.current.t = Math.min(1, fade.current.t + 1 / (1.4 * 60));
      const { from, to, t } = fade.current;
      ctx.clearRect(0, 0, w * scale, h * scale);
      const sx = frame * w;
      if (t < 1) {
        ctx.globalAlpha = 1 - t;
        ctx.drawImage(getTinted(sheet, from), sx, 0, w, h, 0, 0, w * scale, h * scale);
        ctx.globalAlpha = t;
      }
      ctx.drawImage(getTinted(sheet, to), sx, 0, w, h, 0, 0, w * scale, h * scale);
      ctx.globalAlpha = 1;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [sheet, entry, scale]);

  const { w, h } = SPRITE.cell;
  return (
    <div
      style={{
        position: "relative",
        width: w * scale,
        height: SPRITE.anchor.y * scale,
        animation: walking ? "trot .36s ease-in-out infinite" : "bob 3.6s ease-in-out infinite",
      }}
    >
      <canvas
        ref={cvs}
        width={w * scale}
        height={h * scale}
        style={{ position: "absolute", left: 0, top: 0, imageRendering: "pixelated" }}
      />
      <div
        style={{
          position: "absolute", left: "50%", bottom: -3, transform: "translateX(-50%)",
          width: 54 * scale, height: 10 * scale, background: "rgba(0,0,0,.4)",
          borderRadius: "50%", filter: "blur(3px)", pointerEvents: "none",
        }}
      />
    </div>
  );
}

function AvatarBody({ id, accent }) {
  const SKIN = "#f2d5b0";
  switch (id) {
    case "wren":
      return (
        <g>
          <path d="M30 17 C 19 22, 16 40, 16 56 C 15 70, 11 80, 16 87 C 25 91, 37 90, 42 86 C 44 72, 43 56, 42 42 C 40 27, 37 18, 30 17 Z" fill="#2e1b3a" stroke="#523a66" strokeWidth="1.2" />
          <path d="M25 30 C 22 48, 21 64, 20 82" stroke="#523a66" strokeWidth="0.8" fill="none" opacity="0.55" />
          <path d="M27 32 C 31 44, 33 54, 31 66" stroke={accent} strokeWidth="3" fill="none" opacity="0.85" style={{ transition: "stroke 1.4s ease" }} />
          <path d="M38 40 Q 48 38 52 42" stroke="#2e1b3a" strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="54" cy="43" r="3.2" fill={SKIN} />
          <path d="M23 10 C 18 16, 16 26, 18 36 C 20 30, 20 24, 22 19 C 21 27, 21 34, 23 40 C 25 32, 26 24, 28 18 Z" fill="#6e3a28" />
          <circle cx="31" cy="15" r="7.5" fill={SKIN} />
          <path d="M25 12 C 26 7, 34 6, 38 11 C 38 14, 36 15, 35 13 C 32 10, 28 11, 27 14 Z" fill="#6e3a28" />
          <circle cx="34.5" cy="15" r="1" fill="#221530" />
          <path d="M36 19 q -2 1.5 -4 0.5" stroke="#c88a6a" strokeWidth="0.8" fill="none" />
        </g>
      );
    case "aldric":
      return (
        <g>
          <path d="M14 46 L20 84 L24 84 L20 46 Z" fill="#6a7086" />
          <rect x="12" y="42" width="10" height="7" rx="2" fill="#9aa0b5" />
          <path d="M28 26 C 18 30, 16 44, 17 58 C 16 72, 13 81, 17 87 C 26 91, 38 90, 44 86 C 46 72, 45 56, 43 44 C 42 32, 38 27, 28 26 Z" fill="#9aa0b5" stroke="#5c6278" strokeWidth="1.2" />
          <path d="M27 30 C 25 48, 24 66, 24 84 L 36 84 C 37 66, 37 48, 36 30 Z" fill={accent} opacity="0.75" style={{ transition: "fill 1.4s ease" }} />
          <circle cx="19" cy="32" r="6.5" fill="#8a90a8" stroke="#5c6278" strokeWidth="1.2" />
          <circle cx="43" cy="32" r="6" fill="#8a90a8" stroke="#5c6278" strokeWidth="1.2" />
          <path d="M38 40 Q 48 38 52 42" stroke="#8a90a8" strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="54" cy="43" r="3.2" fill="#9aa0b5" />
          <path d="M28 5 C 20 8, 18 17, 21 23 L 40 23 C 42 16, 39 6, 28 5 Z" fill="#9aa0b5" stroke="#5c6278" strokeWidth="1.2" />
          <rect x="24" y="14" width="14" height="2.6" rx="1.3" fill="#221530" />
          <path d="M30 4 C 24 -2, 14 -2, 10 6 C 16 4, 22 5, 26 9 Z" fill={accent} style={{ transition: "fill 1.4s ease" }} />
        </g>
      );
    case "osric":
      return (
        <g>
          <path d="M29 22 C 18 27, 16 44, 16 58 C 15 72, 11 81, 16 87 C 25 91, 38 90, 44 86 C 46 72, 45 56, 43 44 C 42 30, 39 23, 29 22 Z" fill="#8a5432" stroke="#5c3820" strokeWidth="1.2" />
          <path d="M22 26 C 30 38, 36 52, 38 68" stroke="#5c3820" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M17 58 Q 30 63 43 57" stroke="#d9c39a" strokeWidth="2.4" fill="none" />
          <path d="M31 60 L30 70" stroke="#d9c39a" strokeWidth="1.6" />
          {[[33, 34], [35.5, 39], [37, 44.5]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1.6" fill={accent} style={{ transition: "fill 1.4s ease" }} />
          ))}
          <path d="M38 40 Q 48 38 52 42" stroke="#8a5432" strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="54" cy="43" r="3.2" fill="#e8bc8a" />
          <circle cx="31" cy="14" r="8" fill="#e8bc8a" />
          <path d="M23 12 C 24 8, 28 6, 31 6 C 34 6, 38 8, 39 12 C 36 10, 33 9.5, 31 9.5 C 29 9.5, 26 10, 23 12 Z" fill="#d9a878" opacity="0.5" />
          <circle cx="34.5" cy="14" r="1" fill="#221530" />
          <path d="M36 18.5 q -2.5 2 -5 0.8" stroke="#b5825c" strokeWidth="0.8" fill="none" />
        </g>
      );
    case "lyra":
      return (
        <g>
          <path d="M24 12 C 15 18, 12 34, 13 50 C 14 62, 12 72, 14 80 C 17 68, 16 56, 18 44 C 18 54, 19 64, 22 72 C 23 56, 22 38, 26 24 Z" fill="#3d2352" />
          <path d="M30 20 C 25 24, 23 30, 24 36 C 21 41, 20 47, 22 54 C 19 66, 14 78, 19 87 C 28 92, 40 92, 46 86 C 48 76, 44 66, 41 56 C 43 48, 42 42, 39 37 C 40 29, 36 22, 30 20 Z" fill="#4a2a66" stroke="#6e4a8a" strokeWidth="1.2" />
          <path d="M25 36 Q 31 40 39 37" stroke="#6e4a8a" strokeWidth="1" fill="none" opacity="0.8" />
          <path d="M22 54 Q 32 58 41 56" stroke={accent} strokeWidth="2.4" fill="none" opacity="0.9" style={{ transition: "stroke 1.4s ease" }} />
          <path d="M26 62 C 25 70, 24 78, 25 86 M 34 62 C 35 70, 36 78, 35 87" stroke="#38204d" strokeWidth="1" fill="none" opacity="0.7" />
          <path d="M38 40 Q 48 37 52 42" stroke="#4a2a66" strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="54" cy="43" r="3.2" fill={SKIN} />
          <circle cx="31" cy="14" r="7.5" fill={SKIN} />
          <path d="M24 11 C 25 6, 33 4, 38 9 C 39 12, 37 13, 35 11 C 32 8, 28 9, 26 13 Z" fill="#3d2352" />
          <path d="M25 10.5 Q 31 8 37 10.5" stroke={accent} strokeWidth="1.4" fill="none" style={{ transition: "stroke 1.4s ease" }} />
          <circle cx="34.5" cy="14.5" r="1" fill="#221530" />
          <path d="M36 19 q -2 1.6 -4.5 0.6" stroke="#c88a6a" strokeWidth="0.8" fill="none" />
          <circle cx="31" cy="24" r="1.3" fill={accent} style={{ transition: "fill 1.4s ease" }} />
        </g>
      );
    case "thorn":
      return (
        <g>
          <path d="M12 26 Q 26 18 40 30 L 36 66 Q 30 60 24 64 Z" fill="#1c3020" opacity="0.9" />
          <path d="M14 24 C 10 40, 12 58, 20 70" stroke="#7a5c38" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M14 24 L 20 70" stroke="#d9c39a" strokeWidth="0.8" />
          <rect x="34" y="22" width="9" height="20" rx="3" fill="#4a3520" transform="rotate(14 38 32)" />
          {[0, 3.4, 6.8].map((o, i) => (
            <path key={i} d={`M${37 + o} 20 l2 -5 l2 5`} stroke="#8a8fa8" strokeWidth="1.2" fill="none" transform="rotate(14 38 32)" />
          ))}
          <path d="M29 20 C 19 24, 17 40, 17 54 C 16 68, 12 79, 17 86 C 26 90, 38 89, 43 85 C 45 70, 44 54, 42 42 C 41 28, 38 21, 29 20 Z" fill="#24402a" stroke="#3d5c42" strokeWidth="1.2" />
          <path d="M18 56 Q 30 60 42 55" stroke="#7a5c38" strokeWidth="2.6" fill="none" />
          <rect x="28" y="55" width="5" height="4" rx="1" fill={accent} style={{ transition: "fill 1.4s ease" }} />
          <path d="M38 40 Q 48 38 52 42" stroke="#24402a" strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="54" cy="43" r="3.2" fill={SKIN} />
          <path d="M28 5 C 19 7, 16 18, 20 24 C 25 28, 34 28, 39 23 C 41 14, 37 5, 28 5 Z" fill="#1c3020" stroke="#3d5c42" strokeWidth="1.2" />
          <path d="M33 11 Q 39 13 38 20 Q 33 23 30 20 Q 30 14 33 11 Z" fill={SKIN} />
          <circle cx="35.4" cy="15.2" r="1" fill="#221530" />
        </g>
      );
    case "finch":
      return (
        <g>
          <ellipse cx="18" cy="46" rx="11" ry="14" fill="#7a5c38" transform="rotate(-18 18 46)" />
          <ellipse cx="18" cy="46" rx="6" ry="8" fill="#4a3520" transform="rotate(-18 18 46)" />
          <path d="M24 34 L 34 16" stroke="#7a5c38" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M22 40 L 32 20 M 25 42 L 35 22" stroke="#d9c39a" strokeWidth="0.6" />
          <path d="M29 22 C 20 26, 18 42, 18 56 C 17 70, 13 80, 18 87 C 27 91, 39 90, 44 86 C 46 71, 45 55, 43 43 C 42 30, 38 23, 29 22 Z" fill="#7a3a4a" stroke="#a05468" strokeWidth="1.2" />
          {[36, 46, 56].map((cy, i) => (
            <circle key={i} cx="31" cy={cy} r="1.2" fill="#e8c87a" />
          ))}
          <path d="M18 62 Q 31 66 43 61" stroke="#4a2230" strokeWidth="2.4" fill="none" />
          <path d="M38 40 Q 48 38 52 42" stroke="#7a3a4a" strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="54" cy="43" r="3.2" fill={SKIN} />
          <circle cx="31" cy="15" r="7.5" fill={SKIN} />
          <path d="M23 12 C 23 7, 31 4, 38 8 L 40 13 C 34 10, 27 10, 23 14 Z" fill="#5c2a3a" />
          <path d="M37 8 C 40 3, 45 1, 49 3 C 45 5, 42 8, 41 12 Z" fill={accent} style={{ transition: "fill 1.4s ease" }} />
          <circle cx="34.5" cy="15.5" r="1" fill="#221530" />
          <path d="M36 19.5 q -2 2 -4.5 0.8" stroke="#c88a6a" strokeWidth="0.8" fill="none" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M30 16 C 16 22, 12 40, 12 56 C 11 70, 6 80, 12 87 C 22 91, 38 90, 44 86 C 47 72, 46 56, 44 42 C 42 26, 38 17, 30 16 Z" fill="#221530" stroke="#4a3560" strokeWidth="1.2" />
          <path d="M24 30 C 21 48, 20 64, 19 82" stroke="#4a3560" strokeWidth="0.8" fill="none" opacity="0.55" />
          <path d="M36 26 C 37 46, 38 64, 40 82" stroke="#120b18" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M27 32 C 31 44, 33 54, 31 66" stroke={accent} strokeWidth="3" fill="none" opacity="0.85" style={{ transition: "stroke 1.4s ease" }} />
          <path d="M38 40 Q 48 38 52 42" stroke="#221530" strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="54" cy="43" r="3.2" fill={SKIN} />
          <path d="M28 5 C 19 7, 16 18, 20 24 C 25 28, 34 28, 39 23 C 41 14, 37 5, 28 5 Z" fill="#2b1a3e" stroke="#4a3560" strokeWidth="1.2" />
          <path d="M33 11 Q 39 13 38 20 Q 33 23 30 20 Q 30 14 33 11 Z" fill={SKIN} />
          <circle cx="35.4" cy="15.2" r="1" fill="#221530" />
        </g>
      );
  }
}

function LegacyWanderer({ avatar = "rowan", accent, walking, scale = 1 }) {
  return (
    <div className={walking ? "walking" : ""} style={{ position: "relative", transform: `scale(${LEGACY_SCALE * scale})`, transformOrigin: "bottom center", animation: walking ? "trot .36s ease-in-out infinite" : "bob 3.6s ease-in-out infinite" }}>
      <div
        style={{
          position: "absolute", right: -14, top: 12, width: 32, height: 32, borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}66 0%, transparent 70%)`,
          animation: "flicker 2.6s ease-in-out infinite", pointerEvents: "none", transition: "background 1.4s ease",
        }}
      />
      <svg width="70" height="96" viewBox="0 0 70 96">
        <line x1="54" y1="10" x2="54" y2="92" stroke="#3a2a20" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M54 10 q6 -5 10 2" stroke="#3a2a20" strokeWidth="2" fill="none" strokeLinecap="round" />
        <line x1="61" y1="13" x2="61" y2="20" stroke="#3a2a20" strokeWidth="1.5" />
        <rect x="57" y="20" width="8" height="11" rx="2" fill="#241a12" stroke="#3a2a20" strokeWidth="1.2" />
        <circle cx="61" cy="25.5" r="2.6" fill={accent} style={{ transition: "fill 1.4s ease" }} />
        <g className="bootB">
          <path d="M36 84 L34 94 L43 94 L42 84 Z" fill="#1a1020" />
        </g>
        <g className="bootA">
          <path d="M22 84 L20 94 L29 94 L28 84 Z" fill="#1a1020" />
        </g>
        <AvatarBody id={avatar} accent={accent} />
      </svg>
      <div style={{ width: 50, height: 9, background: "rgba(0,0,0,.4)", borderRadius: "50%", margin: "0 auto", marginTop: -5, filter: "blur(3px)" }} />
    </div>
  );
}

/* Real art where it exists, legacy SVG everywhere else. Same props, same
   mount point, so call sites do not care which path runs. */
function Wanderer({ avatar = "rowan", accent, walking, scale = 1 }) {
  const set = SHEETS[avatar];
  const entry = set ? (walking ? set.walk : set.idle || set.walk) : null;
  if (entry) return <SpriteWanderer entry={entry} accent={accent} walking={walking} scale={scale} />;
  return <LegacyWanderer avatar={avatar} accent={accent} walking={walking} scale={scale} />;
}

const FIREFLIES = [...Array(7)].map((_, i) => ({
  l: 8 + hash2(i, 1) * 84,
  b: 6 + hash2(i, 2) * 26,
  delay: hash2(i, 3) * 5,
  dur: 6 + hash2(i, 4) * 5,
}));

/* ============================================================
   MAIN
   ============================================================ */
export default function WonderArtUpdateV4() {
  const [phase, setPhase] = useState("avatar");
  const [avatar, setAvatar] = useState(null);
  const [question, setQuestion] = useState(null);
  const [card, setCard] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [walk, setWalk] = useState(0);
  const [steps, setSteps] = useState(START_STEPS);
  const [day, setDay] = useState(START_DAY);
  const [landmarkIdx, setLandmarkIdx] = useState(0);
  const [journal, setJournal] = useState([]);
  const [showJournal, setShowJournal] = useState(false);
  const [showReading, setShowReading] = useState(false);
  const [peek, setPeek] = useState(null);
  const [shareImg, setShareImg] = useState(null);
  const [timeOverride, setTimeOverride] = useState(null); // null = live clock
  /* arrival clock */
  const [blessed, setBlessed] = useState(false);   // Plus = the blessed road
  const [devFast, setDevFast] = useState(true);    // short legs for tuning
  const [banked, setBanked] = useState(1);         // arrivals waiting to be pulled
  const [arrivalAt, setArrivalAt] = useState(() => Date.now() + LEG_DEV_MS);
  const [returnNote, setReturnNote] = useState(null); // "you walked far while away"
  const [clock, setClock] = useState(Date.now());
  const walkTimer = useRef(null);

  const landmark = LANDMARKS[landmarkIdx % N_REGIONS];
  const nextLandmark = LANDMARKS[(landmarkIdx + 1) % N_REGIONS];
  const walking = phase === "walk";
  const departing = phase === "walk" || phase === "done";

  // ---- daypart (live clock or dev override) ----
  const daypart = timeOverride || liveDaypart();
  const tp = DAYPARTS[daypart];
  useEffect(() => {
    const iv = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  /* v1.3: the countdown is diegetic — the road is telling you, not a clock */
  const legMs = devFast ? LEG_DEV_MS : blessed ? LEG_BLESSED_MS : LEG_FREE_MS;
  const remain = Math.max(0, arrivalAt - clock);
  const countdown = `${pad2(Math.floor(remain / 3600000))}:${pad2(Math.floor((remain % 3600000) / 60000))}:${pad2(Math.floor((remain % 60000) / 1000))}`;


  /* Credit any arrivals that landed while the app was closed. Several may
     have accrued; they stack to BANK_CAP and then stop, which is what keeps
     a return session from becoming pull-spam. */
  useEffect(() => {
    if (clock < arrivalAt) return;
    let at = arrivalAt, n = banked, gained = 0;
    while (clock >= at && n < BANK_CAP) { n++; gained++; at += legMs; }
    if (n >= BANK_CAP) at = clock + legMs;
    if (gained > 0) {
      setBanked(n);
      setArrivalAt(at);
      if (gained > 1) setReturnNote("You walked far while away.");
    }
  }, [clock, arrivalAt, banked, legMs]);

  const bankedRef = useRef(banked);
  useEffect(() => { bankedRef.current = banked; }, [banked]);
  const legRef = useRef(legMs);
  useEffect(() => { legRef.current = legMs; }, [legMs]);

  // ---- one source of motion truth ----
  const walkTarget = useRef(0);
  useEffect(() => {
    walkTarget.current = walk;
  }, [walk]);
  const smoothRef = useRef(0);
  const farRef = useRef(null), midRef = useRef(null), nearRef = useRef(null), fgRef = useRef(null);
  useEffect(() => {
    let raf;
    const loop = () => {
      smoothRef.current += (walkTarget.current - smoothRef.current) * 0.07;
      const s = smoothRef.current;
      const set = (r, speed) => {
        if (r.current) r.current.style.transform = `translateX(${-((s * speed) % STRIP_W)}px)`;
      };
      set(farRef, LAYERS.far.speed);
      set(midRef, LAYERS.mid.speed);
      set(nearRef, LAYERS.near.speed);
      set(fgRef, LAYERS.fg.speed);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== "walk") return;
    let t = 0;
    walkTimer.current = setInterval(() => {
      t++;
      setWalk((x) => x + 16);
      setSteps((s) => s + 3);
      if (t >= 30) {
        clearInterval(walkTimer.current);
        /* v1.3 banked pacing rule: arrivals never fire back-to-back. The
           walk we just played IS the separator, so a queued pull lands on
           a fresh waymark with the full ceremony rather than stacking.
           Read the bank from a ref — this fires inside an interval whose
           closure was captured when the walk began. */
        const left = Math.max(0, bankedRef.current - 1);
        setBanked(left);
        if (left > 0) {
          setDay((d) => d + 1);
          setLandmarkIdx((i) => i + 1);
          setCard(null); setFlipped(false); setQuestion(null); setShowReading(false);
          setPhase("arrive");
        } else {
          /* the leg begins now — the pull blessed the road */
          setArrivalAt(Date.now() + legRef.current);
          setPhase("traveling");
        }
      }
    }, 105);
    return () => clearInterval(walkTimer.current);
  }, [phase]);

  const drawCard = () => {
    const c = CARDS[Math.floor(Math.random() * CARDS.length)];
    setCard(c);
    setPhase("reveal");
    setTimeout(() => setFlipped(true), 650);
  };

  const finishReading = () => {
    const opener = OPENERS[day % OPENERS.length]
      .replace("{day}", ordinal(day))
      .replace("{place}", landmark.name)
      .replace("{q}", "{{Q}}");
    const answer = ANSWERS[day % ANSWERS.length]
      .replace("{card}", "{{C}}")
      .replace("{epi}", card.epigraph);
    setJournal((j) => [...j, { day, card, question, place: landmark.name, opener, answer, depart: landmark.depart }]);
    setPhase("walk");
  };

  /* Kept as the transition into a claimed arrival. No longer a calendar
     day — v1.3 removed the midnight reset entirely. */
  const nextDay = () => {
    setDay((d) => d + 1);
    setLandmarkIdx((i) => i + 1);
    setCard(null);
    setFlipped(false);
    setQuestion(null);
    setShowReading(false);
    setPhase("arrive");
  };

  const devTomorrow = () => {
    if (phase === "walk" || phase === "avatar") return;
    if (phase === "done") nextDay();
    else {
      // skip whatever is mid-flight and jump to the next dawn
      clearInterval(walkTimer.current);
      nextDay();
    }
  };

  // ---- share: generate an image card ----
  const shareEntry = (e) => {
    try {
      setShareImg({ url: makeShareCard(e), entry: e });
    } catch (err) {
      /* canvas unavailable */
    }
  };
  const downloadShare = () => {
    if (!shareImg) return;
    const a = document.createElement("a");
    a.href = shareImg.url;
    a.download = `wonder-day-${shareImg.entry.day}.png`;
    a.click();
  };
  const nativeShare = async () => {
    if (!shareImg) return;
    try {
      const blob = await (await fetch(shareImg.url)).blob();
      const file = new File([blob], `wonder-day-${shareImg.entry.day}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Wonder" });
      } else downloadShare();
    } catch (err) {
      /* dismissed */
    }
  };
  const copyShareText = async () => {
    if (!shareImg) return;
    const e = shareImg.entry;
    const text =
      `WONDER — Day ${e.day} · ${e.place}\n\n` +
      e.opener.replace("{{Q}}", e.question.label.toLowerCase()) +
      " " +
      e.answer.replace("{{C}}", e.card.name) +
      " " +
      e.depart +
      `\n\n— The Wanderer's Chronicle`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      /* no-op */
    }
  };

  // ---- world palette: daypart base, card tint on top ----
  const flippedCard = card && flipped ? card : null;
  const world = {
    plane: flippedCard ? flippedCard.plane : "#1e1633",
    path: flippedCard ? flippedCard.path : "#3a2c55",
    accent: flippedCard ? flippedCard.accent : "#8a7ab5",
  };
  const targetPal = {
    sky: tp.sky.map((h, i) => (flippedCard ? mix(hx(flippedCard.sky[i]), hx(h), 0.45) : hx(h))),
    plane: hx(world.plane),
    path: hx(world.path),
    accent: hx(world.accent),
    orb: tp.orb,
    orbC: flippedCard ? mix(hx(tp.orbC), hx(flippedCard.accent), 0.35) : hx(tp.orbC),
    stars: tp.stars,
    water: (landmarkIdx % N_REGIONS) === RIVER_REGION ? 1 : 0,
  };
  const propFill = shadeCss(world.plane, 0.62);
  const propFillFar = shadeCss(world.plane, 0.88);
  const propFillFg = shadeCss(world.plane, 0.34);

  const region = landmarkIdx % N_REGIONS;
  const nextRegion = (landmarkIdx + 1) % N_REGIONS;
  const farProps = useMemo(() => mkLayer(region, "far"), [region]);
  const midProps = useMemo(() => mkLayer(region, "mid"), [region]);
  const nearProps = useMemo(() => mkLayer(region, "near"), [region]);
  const fgProps = useMemo(() => mkLayer(region, "fg"), [region]);

  const renderProp = (p, fill) => {
    if (p.kind === "pine") return <FaeTree h={p.h} fill={fill} delay={p.delay} />;
    if (p.kind === "stone") return <MossStone h={p.h} fill={fill} />;
    if (p.kind === "shrine") return <WayShrine h={p.h} fill={fill} accent={world.accent} />;
    if (p.kind === "post") return <WayPost h={p.h} fill={fill} accent={world.accent} />;
    if (p.kind === "shroom") return <Shroom h={p.h} fill={fill} accent={world.accent} />;
    return (
      <div style={{ position: "relative" }}>
        <FaeTree h={p.h} fill={fill} delay={p.delay} />
        {[[p.h * 0.2, p.h * 0.2], [p.h * 0.38, p.h * 0.48], [p.h * 0.14, p.h * 0.6]].map(([lx, ty], j) => (
          <div key={j} style={{ position: "absolute", left: lx, top: ty, width: 3, height: 3, borderRadius: "50%", background: world.accent, boxShadow: `0 0 5px ${world.accent}`, transition: "background 1.4s ease" }} />
        ))}
      </div>
    );
  };

  const Chip = ({ color, onClick, children }) => (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", borderBottom: `1px dotted ${color}`, color,
        padding: "0 1px", margin: 0, fontFamily: SERIF, fontVariant: "small-caps",
        fontSize: 13.5, letterSpacing: 1, cursor: "pointer", verticalAlign: "baseline",
      }}
    >
      {children}
    </button>
  );

  const renderEntry = (e, i) => {
    const parts1 = e.opener.split("{{Q}}");
    const parts2 = e.answer.split("{{C}}");
    const firstChar = parts1[0].charAt(0);
    const restFirst = parts1[0].slice(1);
    return (
      <div key={i} style={{ marginBottom: 30, animation: "riseIn .4s ease both" }}>
        <div style={{ fontFamily: SERIF, fontSize: 10, letterSpacing: 3, color: "#5c4f80", marginBottom: 10, textAlign: "center" }}>
          ─── ✦ DAY {e.day} · {e.place.toUpperCase()} ✦ ───
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 13.5, lineHeight: 2, color: "#cfc6e8" }}>
          <span style={{ float: "left", fontFamily: SERIF, fontSize: 36, lineHeight: 0.85, paddingRight: 7, paddingTop: 3, color: e.card.accent }}>
            {firstChar}
          </span>
          {restFirst}
          <Chip color="#e8b46e">
            {e.question.glyph} {e.question.label.toLowerCase()}
          </Chip>
          {parts1[1]}{" "}
          {parts2[0]}
          <Chip color={e.card.accent} onClick={() => setPeek(e)}>
            ✦ {e.card.name.toLowerCase()}
          </Chip>
          {parts2[1]}{" "}
          <span style={{ color: "#8a7ab5", fontStyle: "italic" }}>{e.depart}</span>
        </div>
        <div style={{ textAlign: "right", marginTop: 8, clear: "both" }}>
          <button
            onClick={() => shareEntry(e)}
            style={{
              background: "none", border: "none", borderBottom: "1px dotted #5c4f80",
              color: "#8a7ab5", fontFamily: SERIF, fontVariant: "small-caps",
              fontSize: 11.5, letterSpacing: 1.5, padding: "0 1px",
            }}
          >
            ✦ share this passage
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0812", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: SERIF, padding: 12 }}>
      <style>{`
        @keyframes riseIn { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 18px 2px var(--gc)} 50%{box-shadow:0 0 34px 8px var(--gc)} }
        @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes trot { 0%,100%{transform:translateY(0) rotate(-0.6deg)} 50%{transform:translateY(-3px) rotate(0.8deg)} }
        @keyframes sway { 0%,100%{transform:rotate(-1.4deg)} 50%{transform:rotate(1.4deg)} }
        @keyframes flicker { 0%,100%{opacity:.55; transform:scale(1)} 40%{opacity:1; transform:scale(1.12)} 62%{opacity:.7} 80%{opacity:.95} }
        @keyframes floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes drift { 0%,100%{transform:translate(0,0)} 25%{transform:translate(7px,-11px)} 50%{transform:translate(-5px,-19px)} 75%{transform:translate(6px,-8px)} }
        @keyframes fadeGlow { 0%,100%{opacity:.05} 50%{opacity:.85} }
        @keyframes approach { from{transform:translate(230px,-14px) scale(.24); opacity:0} 30%{opacity:.7} to{transform:translate(0,0) scale(.52); opacity:.9} }
        @keyframes landmarkArrive { from{transform:translate(95px,-40px) scale(.52); opacity:.9} to{transform:translate(0,0) scale(1); opacity:1} }
        .bootA, .bootB { transform-box: fill-box; transform-origin: center; }
        .walking .bootA { animation: stepA .36s linear infinite; }
        .walking .bootB { animation: stepB .36s linear infinite; }
        @keyframes stepA { 0%,100%{transform:translate(0,0)} 50%{transform:translate(5px,-2px)} }
        @keyframes stepB { 0%,100%{transform:translate(5px,-2px)} 50%{transform:translate(0,0)} }
        .rise { animation: riseIn .5s ease both; }
        .rise2 { animation: riseIn .5s .15s ease both; }
        .rise3 { animation: riseIn .5s .3s ease both; }
        button { cursor: pointer; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>

      <div
        style={{
          width: 390, maxWidth: "100%", height: 740, maxHeight: "88vh", borderRadius: 28, overflow: "hidden",
          position: "relative", background: "#0e0a18", border: "1px solid #2a2145",
          boxShadow: "0 24px 80px rgba(0,0,0,.7), inset 0 0 0 1px rgba(255,244,214,.04)",
        }}
      >
        {/* ============ DITHERED WORLD ============ */}
        <WorldCanvas target={targetPal} walkRef={smoothRef} />

        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {/* far treeline strip */}
          <div ref={farRef} style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: STRIP_W * 2, willChange: "transform" }}>
            {[0, STRIP_W].map((off) =>
              farProps.map((p, i) => (
                <div key={`${off}-${i}`} style={{ position: "absolute", left: p.x + off, bottom: `${p.bottom}%`, opacity: LAYERS.far.opacity }}>
                  {renderProp(p, propFillFar)}
                </div>
              ))
            )}
          </div>

          {/* NEXT landmark — appears on the horizon as you walk */}
          {departing && (
            <div key={`next-${landmarkIdx}`} style={{ position: "absolute", left: "66%", bottom: "33%", filter: "saturate(.8) brightness(.9)" }}>
              <div style={{ transformOrigin: "bottom center", animation: "approach 3.4s linear both" }}>
                <LandmarkArt idx={nextRegion} fill={propFillFar} accent={world.accent} />
              </div>
            </div>
          )}

          {/* CURRENT landmark — the full set-piece beside the road */}
          <div key={landmarkIdx} style={{ position: "absolute", left: "52%", bottom: "20%" }}>
            <div style={{ transformOrigin: "bottom center", animation: "landmarkArrive 2.2s ease-out both" }}>
              <div style={{ transform: departing ? "translateX(-660px)" : "translateX(0)", transition: departing ? "transform 3.4s linear" : "none" }}>
                <LandmarkArt idx={region} fill={propFill} accent={world.accent} />
              </div>
            </div>
          </div>

          {/* mid-distance strip — fills the band between road and skyline */}
          <div ref={midRef} style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: STRIP_W * 2, willChange: "transform" }}>
            {[0, STRIP_W].map((off) =>
              midProps.map((p, i) => (
                <div key={`${off}-${i}`} style={{ position: "absolute", left: p.x + off, bottom: `${p.bottom}%`, opacity: LAYERS.mid.opacity }}>
                  {renderProp(p, propFillFar)}
                </div>
              ))
            )}
          </div>

          {/* near roadside strip */}
          <div ref={nearRef} style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: STRIP_W * 2, willChange: "transform" }}>
            {[0, STRIP_W].map((off) =>
              nearProps.map((p, i) => (
                <div key={`${off}-${i}`} style={{ position: "absolute", left: p.x + off, bottom: `${p.bottom}%` }}>
                  {renderProp(p, propFill)}
                </div>
              ))
            )}
          </div>

          {/* fireflies — dusk & night only */}
          {tp.stars > 0.2 &&
            FIREFLIES.map((f, i) => (
              <div key={`ff${i}`} style={{ position: "absolute", left: `${f.l}%`, bottom: `${f.b + 14}%`, animation: `drift ${f.dur}s ${f.delay}s ease-in-out infinite` }}>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: world.accent, boxShadow: `0 0 6px ${world.accent}`, animation: `fadeGlow ${2 + (i % 3)}s ${f.delay}s ease-in-out infinite`, transition: "background 1.4s ease" }} />
              </div>
            ))}

          {/* the traveler */}
          {avatar && (
            <div style={{ position: "absolute", left: "22%", bottom: "12.5%" }}>
              <Wanderer avatar={avatar} accent={world.accent} walking={walking} scale={CHARACTER_SCALE} />
            </div>
          )}

          {/* foreground silhouettes */}
          <div ref={fgRef} style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: STRIP_W * 2, willChange: "transform" }}>
            {[0, STRIP_W].map((off) =>
              fgProps.map((p, i) => (
                <div key={`${off}-${i}`} style={{ position: "absolute", left: p.x + off, bottom: `${p.bottom}%`, opacity: LAYERS.fg.opacity }}>
                  {renderProp(p, propFillFg)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* vignette */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(8,6,14,.6) 100%)" }} />

        {/* HUD */}
        {phase !== "avatar" && (
          <div style={{ position: "absolute", top: 16, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "#cfc6e8", textShadow: "0 2px 8px rgba(0,0,0,.7)" }}>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 10, letterSpacing: 3, opacity: 0.7 }}>DAY {day} · {tp.label.toUpperCase()}</div>
              <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 14, letterSpacing: 1.5, marginTop: 2, color: world.accent, transition: "color 1.4s" }}>
                {walking ? "on the road..." : landmark.name}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: SERIF, fontSize: 10, letterSpacing: 2, opacity: 0.7 }}>{steps.toLocaleString()} STEPS</div>
              <button
                onClick={() => setShowJournal(true)}
                style={{ marginTop: 3, background: "none", border: "none", color: "#cfc6e8", fontFamily: SERIF, fontVariant: "small-caps", fontSize: 12, letterSpacing: 1.5, borderBottom: "1px dotted #8a7ab5", padding: 0 }}
              >
                journal ({journal.length})
              </button>
            </div>
          </div>
        )}

        {/* ---------- PHASES ---------- */}

        {phase === "avatar" && (
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(10,8,18,.55), rgba(8,6,14,.9))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 18px" }}>
            <div className="rise" style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 19, letterSpacing: 2, color: "#efe9ff", marginBottom: 4 }}>
              wonder
            </div>
            <div className="rise" style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: "#8a7ab5", marginBottom: 6 }}>
              Who walks the long road?
            </div>
            <div className="rise2" style={{ fontSize: 10, color: "#5c4f80", letterSpacing: 4, marginBottom: 18 }}>─── ✦ ───</div>
            <div className="rise3" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9, maxWidth: 360 }}>
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setAvatar(a.id); setPhase("arrive"); }}
                  style={{
                    width: 104, background: "rgba(20,14,34,.92)", border: "1px solid #3d2f5c", borderRadius: 8,
                    padding: "10px 4px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  }}
                >
                  <div style={{ height: 96, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <Wanderer avatar={a.id} accent="#8a7ab5" walking={false} scale={0.5} />
                  </div>
                  <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 13, letterSpacing: 1, color: "#efe9ff", marginTop: 4 }}>
                    {a.name.toLowerCase()}
                  </div>
                  <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 10, color: "#8a7ab5" }}>{a.cls}</div>
                </button>
              ))}
            </div>
            <div className="rise3" style={{ marginTop: 16, fontFamily: SERIF, fontStyle: "italic", fontSize: 10.5, color: "#5c4f80" }}>
              The road does not mind who walks it.
            </div>
          </div>
        )}

        {phase === "arrive" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", paddingBottom: 88 }}>
            <div className="rise" style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, letterSpacing: 1, color: "#cfc6e8", marginBottom: 14, textShadow: "0 2px 8px rgba(0,0,0,.8)", textAlign: "center" }}>
              {returnNote || "The path waits."}
              {banked > 1 && (
                <div style={{ fontSize: 11, color: "#8a7ab5", marginTop: 4 }}>
                  {banked} arrivals wait on the road.
                </div>
              )}
            </div>
            <button
              className="rise2"
              onClick={() => { setReturnNote(null); setPhase("question"); }}
              style={{
                "--gc": `${world.accent}55`,
                background: "rgba(10,8,18,.78)", border: `1px solid ${world.accent}`, color: world.accent,
                fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 3, fontSize: 15,
                padding: "13px 30px", borderRadius: 4,
                animation: "riseIn .5s .15s ease both, glowPulse 2.6s 1s infinite",
              }}
            >
              ✦ begin today's pull
            </button>
          </div>
        )}

        {phase === "question" && (
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(10,8,18,.7), rgba(8,6,14,.92))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
            <div className="rise" style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "#efe9ff", marginBottom: 8 }}>
              What do you carry today?
            </div>
            <div className="rise2" style={{ fontFamily: SERIF, fontSize: 12, color: "#8a7ab5", marginBottom: 8, textAlign: "center" }}>
              The card answers what you ask it.
            </div>
            <div className="rise2" style={{ fontSize: 10, color: "#5c4f80", letterSpacing: 4, marginBottom: 22 }}>─── ✦ ───</div>
            <div className="rise3" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 260 }}>
              {QUESTIONS.map((q) => (
                <button
                  key={q.id}
                  onClick={() => { setQuestion(q); setPhase("draw"); }}
                  style={{
                    background: "rgba(26,20,44,.9)", border: "1px solid #3d2f5c", color: "#dcd4f0",
                    fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 2.5, fontSize: 14,
                    padding: "12px 18px", borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <span>{q.label.toLowerCase()}</span>
                  <span style={{ opacity: 0.6 }}>{q.glyph}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "draw" && (
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(10,8,18,.7), rgba(8,6,14,.92))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div className="rise" style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 12, letterSpacing: 2, color: "#8a7ab5", marginBottom: 6 }}>
              you ask about · {question.label.toLowerCase()}
            </div>
            <div className="rise" style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "#efe9ff", marginBottom: 30 }}>
              Draw your card
            </div>
            <button
              className="rise2"
              onClick={drawCard}
              style={{ background: "none", border: "none", padding: 0, animation: "riseIn .5s .15s ease both, floaty 2.8s 1s ease-in-out infinite", filter: "drop-shadow(0 14px 30px rgba(0,0,0,.6))" }}
            >
              <CardBackArt style={{ width: 128, height: 196 }} />
            </button>
            <div className="rise3" style={{ marginTop: 22, fontFamily: SERIF, fontSize: 11, letterSpacing: 2, color: "#5c4f80" }}>
              tap the deck
            </div>
          </div>
        )}

        {(phase === "reveal" || phase === "reading") && card && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(8,6,14,.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ perspective: 900 }}>
              <div
                onClick={() => phase === "reveal" && flipped && setPhase("reading")}
                style={{
                  width: 148, height: 226, position: "relative", transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform .9s cubic-bezier(.4,0,.2,1)",
                  cursor: phase === "reveal" ? "pointer" : "default",
                }}
              >
                <CardBackArt style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }} />
                <CardFace card={card} />
              </div>
            </div>

            {phase === "reveal" && flipped && (
              <div className="rise" style={{ marginTop: 20, fontFamily: SERIF, fontSize: 11, letterSpacing: 2, color: "#8a7ab5" }}>
                tap the card
              </div>
            )}

            {phase === "reading" && (
              <>
                <div className="rise" style={{ marginTop: 20, maxWidth: 305, background: "rgba(18,13,32,.94)", border: `1px solid ${card.accent}55`, borderRadius: 6, padding: "16px 20px" }}>
                  <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 11, letterSpacing: 2, color: card.accent, marginBottom: 8 }}>
                    on the matter of {question.label.toLowerCase()}
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 13.5, lineHeight: 1.8, color: "#dcd4f0" }}>
                    {card.readings[question.id]}
                  </div>
                </div>
                <button
                  className="rise2"
                  onClick={finishReading}
                  style={{ marginTop: 18, background: card.accent, border: "none", color: "#120d20", fontFamily: SERIF, fontVariant: "small-caps", fontWeight: "bold", letterSpacing: 3, fontSize: 14, padding: "11px 28px", borderRadius: 4 }}
                >
                  walk on →
                </button>
              </>
            )}
          </div>
        )}

        {/* end-of-day: compact panel with countdown to the next pull */}

        {/* ============ TRAVELING — between arrivals ============ */}
        {/* v1.3 3c: a mid-walk open is never empty. The world, the sky and
            the countdown are always there, and the countdown is to arrival,
            not to midnight. */}
        {phase === "traveling" && (
          <div style={{ position: "absolute", top: 62, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <div className="rise" style={{ pointerEvents: "auto", background: "rgba(10,8,18,.8)", border: `1px solid ${world.accent}44`, borderRadius: 6, padding: "10px 16px", textAlign: "center", maxWidth: 268 }}>
              <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 10.5, letterSpacing: 2, color: world.accent, marginBottom: 5 }}>
                on the road
              </div>
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "#8a7ab5", lineHeight: 1.65 }}>
                {landmark.depart}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 10.5, letterSpacing: 1, color: "#cfc6e8", marginTop: 8, opacity: 0.9 }}>
                You reach {nextLandmark.name} in <span style={{ color: world.accent }}>{countdown}</span>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 9 }}>
                <button onClick={() => setShowJournal(true)} style={{ background: "none", border: "1px solid #5c4f80", color: "#cfc6e8", fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 1.5, fontSize: 10.5, padding: "6px 11px", borderRadius: 4 }}>
                  the journal
                </button>
                {card && (
                  <button onClick={() => setShowReading(true)} style={{ background: "none", border: `1px solid ${world.accent}66`, color: world.accent, fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 1.5, fontSize: 10.5, padding: "6px 11px", borderRadius: 4 }}>
                    last reading
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div style={{ position: "absolute", top: 62, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <div className="rise" style={{ pointerEvents: "auto", background: "rgba(10,8,18,.8)", border: `1px solid ${world.accent}44`, borderRadius: 6, padding: "10px 16px", textAlign: "center", maxWidth: 256 }}>
              <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 10.5, letterSpacing: 2, color: world.accent, marginBottom: 5 }}>
                day {day} · {card?.name.toLowerCase()}
              </div>
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "#8a7ab5", lineHeight: 1.65 }}>
                {landmark.depart} Ahead, {nextLandmark.name} waits on the horizon.
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 10, letterSpacing: 2, color: "#cfc6e8", marginTop: 8, opacity: 0.85 }}>
                {nextLandmark.name.toUpperCase()} IN <span style={{ color: world.accent }}>{countdown}</span>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 9 }}>
                <button onClick={() => setShowJournal(true)} style={{ background: "none", border: "1px solid #5c4f80", color: "#cfc6e8", fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 1.5, fontSize: 10.5, padding: "6px 11px", borderRadius: 4 }}>
                  the journal
                </button>
                <button onClick={() => setShowReading(true)} style={{ background: "none", border: `1px solid ${world.accent}66`, color: world.accent, fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 1.5, fontSize: 10.5, padding: "6px 11px", borderRadius: 4 }}>
                  divination reading
                </button>
              </div>
            </div>
          </div>
        )}

        {/* today's divination reading, revisited */}
        {showReading && card && question && (
          <div onClick={() => setShowReading(false)} style={{ position: "absolute", inset: 0, background: "rgba(8,6,14,.86)", display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#120d20", border: `1px solid ${card.accent}`, borderRadius: 8, padding: 22, maxWidth: 295, textAlign: "center", boxShadow: `0 0 60px ${card.accent}33`, animation: "riseIn .3s ease both" }}>
              <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 11, letterSpacing: 2, color: "#5c4f80", marginBottom: 8 }}>
                day {day} · asked of {question.label.toLowerCase()}
              </div>
              <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DitherGlow color={card.accent} size={90} alpha={0.28} style={{ position: "absolute", top: 0, left: 0 }} />
                <Emblem id={card.id} color={card.accent} size={64} />
              </div>
              <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 14, letterSpacing: 2, color: card.accent, marginBottom: 10 }}>
                {card.numeral} · {card.name.toLowerCase()}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.85, color: "#cfc6e8" }}>
                {card.readings[question.id]}
              </div>
              <button onClick={() => setShowReading(false)} style={{ marginTop: 14, background: "none", border: "1px solid #3d2f5c", color: "#8a7ab5", fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 2, fontSize: 11, padding: "8px 18px", borderRadius: 4 }}>
                close
              </button>
            </div>
          </div>
        )}

        {/* ============ CAMPAIGN JOURNAL ============ */}
        {showJournal && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(8,6,14,.97)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 26px 12px" }}>
              <div>
                <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 16, letterSpacing: 2, color: "#efe9ff" }}>
                  the wanderer's chronicle
                </div>
                <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "#5c4f80", marginTop: 3 }}>
                  A campaign written one day at a time
                </div>
              </div>
              <button onClick={() => { setShowJournal(false); setPeek(null); }} style={{ background: "none", border: "none", color: "#8a7ab5", fontFamily: SERIF, fontSize: 14 }}>
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 28px 30px" }}>
              {journal.length === 0 ? (
                <div style={{ fontFamily: SERIF, fontSize: 13, color: "#5c4f80", lineHeight: 2 }}>
                  The chronicle is unwritten. Each day you pull a card, a new passage is added — where you were, what you asked, and what the deck answered. Come back after your first pull.
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 2, color: "#8a7ab5", marginBottom: 26, fontStyle: "italic", textAlign: "center" }}>
                    ...and so the wanderer walked, asking the road one question each day.
                  </div>
                  {journal.map(renderEntry)}
                  <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#5c4f80", marginTop: 6, textAlign: "center" }}>
                    The next passage will be written tomorrow, near {nextLandmark.name}...
                  </div>
                </>
              )}
            </div>

            {/* card peek popover */}
            {peek && (
              <div onClick={() => setPeek(null)} style={{ position: "absolute", inset: 0, background: "rgba(8,6,14,.86)", display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}>
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ background: "#120d20", border: `1px solid ${peek.card.accent}`, borderRadius: 8, padding: 22, maxWidth: 295, textAlign: "center", boxShadow: `0 0 60px ${peek.card.accent}33`, animation: "riseIn .3s ease both" }}
                >
                  <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 11, letterSpacing: 2, color: "#5c4f80", marginBottom: 8 }}>
                    day {peek.day} · asked of {peek.question.label.toLowerCase()}
                  </div>
                  <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <DitherGlow color={peek.card.accent} size={90} alpha={0.28} style={{ position: "absolute", top: 0, left: 0 }} />
                    <Emblem id={peek.card.id} color={peek.card.accent} size={64} />
                  </div>
                  <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 14, letterSpacing: 2, color: peek.card.accent, marginBottom: 10 }}>
                    {peek.card.numeral} · {peek.card.name.toLowerCase()}
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.85, color: "#cfc6e8" }}>
                    {peek.card.readings[peek.question.id]}
                  </div>
                  <button onClick={() => setPeek(null)} style={{ marginTop: 14, background: "none", border: "1px solid #3d2f5c", color: "#8a7ab5", fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 2, fontSize: 11, padding: "8px 18px", borderRadius: 4 }}>
                    close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ SHARE-CARD MODAL ============ */}
        {shareImg && (
          <div onClick={() => setShareImg(null)} style={{ position: "absolute", inset: 0, background: "rgba(8,6,14,.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 5 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#120d20", border: `1px solid ${shareImg.entry.card.accent}`, borderRadius: 10, padding: 16, textAlign: "center", boxShadow: `0 0 60px ${shareImg.entry.card.accent}33`, animation: "riseIn .3s ease both" }}>
              <div style={{ fontFamily: SERIF, fontVariant: "small-caps", fontSize: 12, letterSpacing: 2, color: "#cfc6e8", marginBottom: 10 }}>
                share your passage
              </div>
              <img
                src={shareImg.url}
                alt={`Wonder day ${shareImg.entry.day} share card`}
                style={{ width: 226, borderRadius: 6, border: `1px solid ${shareImg.entry.card.accent}55`, display: "block", margin: "0 auto" }}
              />
              <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                <button onClick={nativeShare} style={{ background: shareImg.entry.card.accent, border: "none", color: "#120d20", fontFamily: SERIF, fontVariant: "small-caps", fontWeight: "bold", letterSpacing: 1.5, fontSize: 11, padding: "8px 14px", borderRadius: 4 }}>
                  share
                </button>
                <button onClick={downloadShare} style={{ background: "none", border: "1px solid #5c4f80", color: "#cfc6e8", fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 1.5, fontSize: 11, padding: "8px 14px", borderRadius: 4 }}>
                  download
                </button>
                <button onClick={copyShareText} style={{ background: "none", border: "1px solid #5c4f80", color: "#8a7ab5", fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 1.5, fontSize: 11, padding: "8px 14px", borderRadius: 4 }}>
                  copy text
                </button>
                <button onClick={() => setShareImg(null)} style={{ background: "none", border: "none", color: "#5c4f80", fontFamily: SERIF, fontVariant: "small-caps", letterSpacing: 1.5, fontSize: 11, padding: "8px 6px" }}>
                  close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============ DEV CONSOLE ============ */}
      <div style={{ marginTop: 12, width: 420, maxWidth: "100%", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#5c4f80", letterSpacing: 2 }}>DEV</span>
        {["live", ...Object.keys(DAYPARTS)].map((t) => {
          const active = t === "live" ? timeOverride === null : timeOverride === t;
          return (
            <button
              key={t}
              onClick={() => setTimeOverride(t === "live" ? null : t)}
              style={{
                background: active ? "#2a2145" : "rgba(20,14,34,.8)",
                border: `1px solid ${active ? "#8a7ab5" : "#3d2f5c"}`,
                color: active ? "#efe9ff" : "#8a7ab5",
                fontFamily: "monospace", fontSize: 10, letterSpacing: 1,
                padding: "5px 9px", borderRadius: 4,
              }}
            >
              {t}
            </button>
          );
        })}
        {(() => {
          const dev = (on, color) => ({
            background: on ? "#2a2145" : "rgba(20,14,34,.8)",
            border: `1px solid ${on ? "#8a7ab5" : "#3d2f5c"}`,
            color: color || (on ? "#efe9ff" : "#8a7ab5"),
            fontFamily: "monospace", fontSize: 10, letterSpacing: 1,
            padding: "5px 9px", borderRadius: 4,
          });
          return (
            <>
              {/* v1.3 §10: force arrival + fast walk alongside daypart forcing */}
              <button onClick={() => { setBanked((b) => Math.min(BANK_CAP, b + 1)); setArrivalAt(Date.now() + legMs); }}
                style={dev(false, "#7ee8d2")}>
                force arrival +1
              </button>
              <button onClick={() => setDevFast(!devFast)} style={dev(devFast, devFast ? "#e8b46e" : undefined)}>
                {devFast ? "fast walk (20s)" : `real leg (${blessed ? "7h" : "22h"})`}
              </button>
              <button onClick={() => { setBlessed(!blessed); setArrivalAt(Date.now() + (devFast ? LEG_DEV_MS : !blessed ? LEG_BLESSED_MS : LEG_FREE_MS)); }}
                style={dev(blessed, blessed ? "#c9a227" : undefined)}>
                {blessed ? "blessed road" : "free road"}
              </button>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#5c4f80" }}>
                banked {banked}/{BANK_CAP}
              </span>
            </>
          );
        })()}
      </div>
    </div>
  );
}
