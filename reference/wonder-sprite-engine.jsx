import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ============================================================
   WONDER — Sprite Engine + Delivery QA Harness
   Built against the locked production spec:
     cell 128×176 · anchor (64,172) · facing right · portrait 128×144
     12-color palette, 3 reserved accent hexes, no mask strips

   Two exports:
     <CharacterSprite/>  — drop-in replacement for <Wanderer/> in
                           Wonder-ArtUpdate-v4.jsx (same props)
     default export      — the QA harness. Load a delivered strip,
                           get a pass/fail report before you pay for it.
   ============================================================ */

/* ---------------- SPEC ---------------- */

export const SPEC = {
  cell: { w: 128, h: 176 },
  anchor: { x: 64, y: 172 },
  facing: "right",
  portrait: { w: 128, h: 144 },
  bodyTarget: 124,
  paletteMax: 12,
  // The three reserved accent slots. Nothing else in the sheet may use these.
  accent: ["#f0d69a", "#c9a227", "#7a5f14"], // highlight · midtone · shadow
};

export const ANIMS = {
  idle: { frames: 3, fps: 3 },
  walk: { frames: 4, fps: 8 },
  vigil: { frames: 4, fps: 6 },
};

export const AVATARS = [
  { id: "rowan", name: "Rowan", cls: "the wanderer" },
  { id: "wren", name: "Wren", cls: "the wayfarer" },
  { id: "aldric", name: "Ser Aldric", cls: "the paladin" },
  { id: "osric", name: "Brother Osric", cls: "the monk" },
  { id: "lyra", name: "Lyra", cls: "the enchantress" },
  { id: "thorn", name: "Thorn", cls: "the ranger" },
  { id: "finch", name: "Finch", cls: "the bard" },
];

// Drop real sheets here as they arrive. Anything missing falls back to
// a procedural placeholder drawn to the same spec.
export const SHEETS = {
  // aldric: { idle: "/art/aldric_idle.png", walk: "/art/aldric_walk.png", vigil: "/art/aldric_vigil.png" },
};

/* ---------------- color ---------------- */

const hex2rgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb2hex = (r, g, b) =>
  "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");

function rgb2hsl(r, g, b) {
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
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [h, s, l];
}

function hsl2rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((v) => clamp((v + m) * 255));
}

/* Build a 3-step ramp from a single accent color, matching the relative
   luminance spacing of the reserved slots so tinted art keeps its form. */
function accentRamp(hex) {
  const [h, s, l] = rgb2hsl(...hex2rgb(hex));
  return [
    hsl2rgb(h, Math.max(0, s - 0.1), Math.min(0.92, l + 0.2)),
    hsl2rgb(h, s, l),
    hsl2rgb(h, Math.min(1, s + 0.06), Math.max(0.06, l - 0.24)),
  ];
}

/* ---------------- sheet cache + tinting ---------------- */

const sheetCache = new Map(); // key -> HTMLCanvasElement

function canvasFromImageData(id) {
  const c = document.createElement("canvas");
  c.width = id.width; c.height = id.height;
  c.getContext("2d").putImageData(id, 0, 0);
  return c;
}

/* Remap the three reserved accent hexes to the ramp derived from `accent`.
   Exact-match only — that is the whole reason the hexes are reserved. */
function tintSheet(baseImageData, accent) {
  const src = baseImageData;
  const out = new ImageData(
    new Uint8ClampedArray(src.data),
    src.width,
    src.height
  );
  const reserved = SPEC.accent.map(hex2rgb);
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
  return canvasFromImageData(out);
}

function getTinted(key, baseImageData, accent) {
  const ck = `${key}::${accent}`;
  if (sheetCache.has(ck)) return sheetCache.get(ck);
  const c = tintSheet(baseImageData, accent);
  sheetCache.set(ck, c);
  return c;
}

/* ---------------- placeholder generator ---------------- */

/* Procedural stand-in drawn to the exact production grid, then quantized
   to a 12-color palette with hard alpha. It passes its own validator,
   which is how you know the validator works. */

const PLACEHOLDER_PALETTE = [
  "#efe6d2", "#c9b79a", "#8a7358", "#5c4a3a",
  "#3d3247", "#2a2135", "#1a1420", "#0e0a14",
  "#d9c4a8",
  ...SPEC.accent,
];

function quantize(ctx, w, h) {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const pal = PLACEHOLDER_PALETTE.map(hex2rgb);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) { d[i + 3] = 0; d[i] = d[i + 1] = d[i + 2] = 0; continue; }
    d[i + 3] = 255;
    let best = 0, bd = Infinity;
    for (let p = 0; p < pal.length; p++) {
      const dr = d[i] - pal[p][0], dg = d[i + 1] - pal[p][1], db = d[i + 2] - pal[p][2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bd) { bd = dist; best = p; }
    }
    d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2];
  }
  ctx.putImageData(id, 0, 0);
  return id;
}

function drawPlaceholderFrame(ctx, ox, anim, f, broken) {
  const { w } = SPEC.cell;
  const baseline = SPEC.anchor.y;
  const cx = ox + SPEC.anchor.x;

  // Deliberate anchor drift, for demonstrating what a bad delivery looks like.
  const drift = broken ? [0, 2, -1, 3][f % 4] : 0;
  const bob = anim === "walk" ? [0, -2, 0, -2][f % 4] : anim === "idle" ? [0, -1, 0][f % 3] : 0;

  const gy = baseline + drift;

  // staff — uses the headroom above the body, as a real prop would
  ctx.fillStyle = "#5c4a3a";
  ctx.fillRect(cx + 26, 22 + bob, 4, gy - 22 - bob);
  ctx.fillStyle = SPEC.accent[1];
  ctx.fillRect(cx + 23, 26 + bob, 10, 10);
  ctx.fillStyle = SPEC.accent[0];
  ctx.fillRect(cx + 25, 28 + bob, 3, 3);

  // legs — alternating stride, but contact foot stays on the baseline
  const stride = anim === "walk" ? [0, 7, 0, -7][f % 4] : 0;
  ctx.fillStyle = "#1a1420";
  ctx.fillRect(cx - 14 + stride, gy - 26, 11, 26);
  ctx.fillRect(cx + 3 - stride, gy - 26, 11, 26);

  // cloak
  const crown = gy - SPEC.bodyTarget + bob;
  ctx.fillStyle = "#3d3247";
  ctx.beginPath();
  ctx.moveTo(cx - 4, crown + 14);
  ctx.lineTo(cx - 30, gy - 14);
  ctx.lineTo(cx + 26, gy - 14);
  ctx.lineTo(cx + 6, crown + 14);
  ctx.closePath();
  ctx.fill();

  // tabard — the accent-bearing surface
  ctx.fillStyle = SPEC.accent[1];
  ctx.fillRect(cx - 13, crown + 30, 26, 52);
  ctx.fillStyle = SPEC.accent[2];
  ctx.fillRect(cx + 7, crown + 30, 6, 52);
  ctx.fillStyle = SPEC.accent[0];
  ctx.fillRect(cx - 13, crown + 30, 5, 52);

  // pauldrons
  ctx.fillStyle = "#8a7358";
  ctx.fillRect(cx - 20, crown + 24, 15, 12);
  ctx.fillRect(cx + 5, crown + 24, 15, 12);

  // head + hair
  ctx.fillStyle = "#d9c4a8";
  ctx.fillRect(cx - 10, crown + 6, 20, 20);
  ctx.fillStyle = "#c9b79a";
  ctx.fillRect(cx - 12, crown, 24, 10);
  ctx.fillRect(cx - 12, crown, 5, 18);

  // vigil flourish
  if (anim === "vigil" && f > 0) {
    ctx.fillStyle = SPEC.accent[0];
    for (let s = 0; s < f + 1; s++) {
      ctx.fillRect(cx + 24 + s * 7, crown + 4 + ((s * 11) % 22), 4, 4);
    }
  }
}

export function makePlaceholderSheet(anim, broken = false) {
  const { w, h } = SPEC.cell;
  const n = ANIMS[anim].frames;
  const c = document.createElement("canvas");
  c.width = w * n; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  for (let f = 0; f < n; f++) drawPlaceholderFrame(ctx, f * w, anim, f, broken);
  const id = quantize(ctx, c.width, c.height);
  return { canvas: c, imageData: id };
}

/* ---------------- validator ---------------- */

/* Everything the artist could get wrong, checked mechanically.
   Anchor drift is the one no amount of code can fix later. */
export function validateSheet(imageData, anim) {
  const { w, h } = SPEC.cell;
  const expectFrames = ANIMS[anim].frames;
  const checks = [];
  const add = (ok, label, detail) => checks.push({ ok, label, detail });

  const dimsOK = imageData.width === w * expectFrames && imageData.height === h;
  add(
    dimsOK,
    "Sheet dimensions",
    `${imageData.width}×${imageData.height} — expected ${w * expectFrames}×${h} (${expectFrames} frames @ ${w}×${h})`
  );
  if (!dimsOK) return { checks, frames: [], fatal: true };

  const d = imageData.data;
  const at = (x, y) => (y * imageData.width + x) * 4;

  // alpha discipline
  let soft = 0, opaque = 0;
  const colors = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;
    if (a !== 255) { soft++; continue; }
    opaque++;
    const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    colors.set(k, (colors.get(k) || 0) + 1);
  }
  add(soft === 0, "Hard alpha edges", soft === 0
    ? "No semi-transparent pixels"
    : `${soft.toLocaleString()} semi-transparent pixels — these halo when scaled`);

  add(colors.size <= SPEC.paletteMax, "Palette size",
    `${colors.size} unique opaque colors (max ${SPEC.paletteMax})`);

  // reserved accent presence + exclusivity
  const reservedKeys = SPEC.accent.map((x) => {
    const [r, g, b] = hex2rgb(x);
    return (r << 16) | (g << 8) | b;
  });
  const present = reservedKeys.filter((k) => colors.has(k));
  add(present.length === 3, "Reserved accent hexes",
    present.length === 3
      ? `All three present (${SPEC.accent.join(", ")})`
      : `Only ${present.length}/3 found — runtime tinting needs all three`);

  // near-miss detection: colors close to reserved but not exact
  let nearMiss = 0;
  for (const k of colors.keys()) {
    if (reservedKeys.includes(k)) continue;
    const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255;
    for (const rk of reservedKeys) {
      const rr = (rk >> 16) & 255, rg = (rk >> 8) & 255, rb = rk & 255;
      if (Math.abs(r - rr) + Math.abs(g - rg) + Math.abs(b - rb) < 24) nearMiss++;
    }
  }
  add(nearMiss === 0, "Accent exclusivity", nearMiss === 0
    ? "No colors sitting near the reserved hexes"
    : `${nearMiss} color(s) within tolerance of an accent hex — will tint unpredictably`);

  // transparent margins
  let cornerOpaque = 0;
  for (const [x, y] of [[0, 0], [imageData.width - 1, 0], [0, h - 1], [imageData.width - 1, h - 1]]) {
    if (d[at(x, y) + 3] !== 0) cornerOpaque++;
  }
  add(cornerOpaque === 0, "Transparent background",
    cornerOpaque === 0 ? "Corners clear" : `${cornerOpaque}/4 corners opaque — background not keyed out`);

  // per-frame geometry
  const frames = [];
  for (let f = 0; f < expectFrames; f++) {
    const x0 = f * w;
    let bottom = -1, top = -1, left = -1, right = -1;
    let footSum = 0, footCount = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[at(x0 + x, y) + 3] === 0) continue;
        if (top < 0) top = y;
        bottom = y;
        if (left < 0 || x < left) left = x;
        if (x > right) right = x;
      }
    }
    // horizontal centroid of the contact band (bottom 8 rows)
    for (let y = Math.max(0, bottom - 7); y <= bottom; y++) {
      for (let x = 0; x < w; x++) {
        if (d[at(x0 + x, y) + 3] !== 0) { footSum += x; footCount++; }
      }
    }
    frames.push({
      index: f, top, bottom, left, right,
      footX: footCount ? footSum / footCount : NaN,
      height: bottom - top + 1,
    });
  }

  const bottoms = frames.map((f) => f.bottom);
  const bSpread = Math.max(...bottoms) - Math.min(...bottoms);
  add(bSpread === 0, "Baseline registration",
    bSpread === 0
      ? `Every frame contacts row ${bottoms[0]}`
      : `Feet land on rows ${Math.min(...bottoms)}–${Math.max(...bottoms)} — ${bSpread}px of vertical drift`);

  const anchorHit = bottoms.every((b) => Math.abs(b - SPEC.anchor.y) <= 4);
  add(anchorHit, "Anchor alignment",
    `Contact rows vs. spec anchor y=${SPEC.anchor.y} — ${bottoms.join(", ")}`);

  const footXs = frames.map((f) => f.footX).filter((v) => !isNaN(v));
  const fSpread = footXs.length ? Math.max(...footXs) - Math.min(...footXs) : 0;
  add(fSpread <= 6, "Horizontal stability",
    `Contact-band centroid varies ${fSpread.toFixed(1)}px${fSpread > 6 ? " — character will slide" : ""}`);

  const tallest = Math.max(...frames.map((f) => f.height));
  add(tallest <= h, "Fits the cell", `Tallest frame occupies ${tallest}px of ${h}px`);

  return { checks, frames, fatal: false };
}

/* ---------------- <CharacterSprite/> ---------------- */

/* Drop-in for <Wanderer avatar accent walking /> from Wonder-ArtUpdate-v4.
   The ANCHOR is the layout origin — mount it exactly where the old one sat
   (left:22%, bottom:12.5%) and the feet land on the same spot regardless
   of which character or how tall their prop is. */
export function CharacterSprite({
  avatar = "rowan",
  accent = "#c9a227",
  walking = false,
  anim,
  scale = 1,
  debug = false,
  broken = false,
  sheetOverride = null,
}) {
  const active = anim || (walking ? "walk" : "idle");
  const cvs = useRef(null);
  const raf = useRef(0);
  const fade = useRef({ from: accent, to: accent, t: 1 });
  const prevAccent = useRef(accent);

  // base (untinted) sheet
  const base = useMemo(() => {
    if (sheetOverride) return sheetOverride;
    const real = SHEETS[avatar]?.[active];
    if (real) return null; // async path below
    return makePlaceholderSheet(active, broken).imageData;
  }, [avatar, active, broken, sheetOverride]);

  const [loaded, setLoaded] = useState(base);
  useEffect(() => {
    if (base) { setLoaded(base); return; }
    const url = SHEETS[avatar]?.[active];
    if (!url) return;
    let dead = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (dead) return;
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const cx = c.getContext("2d", { willReadFrequently: true });
      cx.imageSmoothingEnabled = false;
      cx.drawImage(img, 0, 0);
      setLoaded(cx.getImageData(0, 0, c.width, c.height));
    };
    img.src = url;
    return () => { dead = true; };
  }, [base, avatar, active]);

  // start a 1.4s crossfade whenever the world recolors
  useEffect(() => {
    if (accent === prevAccent.current) return;
    fade.current = { from: prevAccent.current, to: accent, t: 0 };
    prevAccent.current = accent;
  }, [accent]);

  const key = `${avatar}:${active}:${broken ? "b" : "g"}:${sheetOverride ? "o" : ""}`;

  useEffect(() => {
    if (!loaded || !cvs.current) return;
    const { w, h } = SPEC.cell;
    const n = Math.max(1, Math.round(loaded.width / w));
    const fps = ANIMS[active]?.fps || 6;
    const ctx = cvs.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    let t0 = performance.now();
    const tick = (now) => {
      const dt = (now - t0) / 1000;
      const frame = fps > 0 ? Math.floor(dt * fps) % n : 0;

      if (fade.current.t < 1) fade.current.t = Math.min(1, fade.current.t + 1 / (1.4 * 60));
      const { from, to, t } = fade.current;

      ctx.clearRect(0, 0, w * scale, h * scale);
      const sx = frame * w;
      if (t < 1) {
        ctx.globalAlpha = 1 - t;
        ctx.drawImage(getTinted(key, loaded, from), sx, 0, w, h, 0, 0, w * scale, h * scale);
        ctx.globalAlpha = t;
      }
      ctx.drawImage(getTinted(key, loaded, to), sx, 0, w, h, 0, 0, w * scale, h * scale);
      ctx.globalAlpha = 1;

      if (debug) {
        ctx.strokeStyle = "rgba(255,80,120,.85)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, SPEC.anchor.y * scale + 0.5);
        ctx.lineTo(w * scale, SPEC.anchor.y * scale + 0.5);
        ctx.moveTo(SPEC.anchor.x * scale + 0.5, 0);
        ctx.lineTo(SPEC.anchor.x * scale + 0.5, h * scale);
        ctx.stroke();
        ctx.strokeStyle = "rgba(120,200,255,.5)";
        ctx.strokeRect(0.5, 0.5, w * scale - 1, h * scale - 1);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [loaded, active, scale, debug, key]);

  const { w, h } = SPEC.cell;
  return (
    <div style={{ position: "relative", width: 0, height: 0 }}>
      <canvas
        ref={cvs}
        width={w * scale}
        height={h * scale}
        style={{
          position: "absolute",
          left: -SPEC.anchor.x * scale,
          top: -SPEC.anchor.y * scale,
          imageRendering: "pixelated",
          animation: walking
            ? "trot .36s ease-in-out infinite"
            : "bob 3.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ============================================================
   QA HARNESS — default export
   ============================================================ */

const INK = "#efe9ff", DIM = "#8a7ab5", FAINT = "#5c4f80";
const SERIF = "'Iowan Old Style','Palatino Linotype','Palatino','Book Antiqua',Georgia,serif";
const MONO = "ui-monospace,'SF Mono',Menlo,monospace";

export default function SpriteDeliveryHarness() {
  const [anim, setAnim] = useState("walk");
  const [broken, setBroken] = useState(false);
  const [accent, setAccent] = useState("#c9a227");
  const [scale, setScale] = useState(1);
  const [debug, setDebug] = useState(true);
  const [uploaded, setUploaded] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [scrub, setScrub] = useState(-1);

  const sheet = useMemo(() => {
    if (uploaded) return uploaded;
    return makePlaceholderSheet(anim, broken).imageData;
  }, [uploaded, anim, broken]);

  const report = useMemo(() => {
    try { return validateSheet(sheet, anim); } catch { return null; }
  }, [sheet, anim]);

  const onFile = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const cx = c.getContext("2d", { willReadFrequently: true });
      cx.imageSmoothingEnabled = false;
      cx.drawImage(img, 0, 0);
      setUploaded(cx.getImageData(0, 0, c.width, c.height));
      sheetCache.clear();
    };
    img.src = URL.createObjectURL(f);
  }, []);

  const passCount = report?.checks.filter((c) => c.ok).length ?? 0;
  const total = report?.checks.length ?? 0;
  const allPass = total > 0 && passCount === total;

  const btn = (on) => ({
    background: on ? "rgba(201,162,39,.16)" : "rgba(20,14,34,.9)",
    border: `1px solid ${on ? "#c9a227" : "#3d2f5c"}`,
    color: on ? "#e8c76b" : DIM,
    fontFamily: SERIF, fontSize: 12, letterSpacing: 1,
    padding: "7px 13px", borderRadius: 5, cursor: "pointer",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0812", color: INK, fontFamily: SERIF, padding: 24 }}>
      <style>{`
        @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes trot { 0%,100%{transform:translateY(0) rotate(-.6deg)} 50%{transform:translateY(-3px) rotate(.8deg)} }
        @media (prefers-reduced-motion: reduce){*{animation:none!important}}
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ fontVariant: "small-caps", fontSize: 24, letterSpacing: 1 }}>sprite delivery check</div>
        <div style={{ fontStyle: "italic", color: DIM, fontSize: 13, marginTop: 2, marginBottom: 20 }}>
          128×176 · anchor (64,172) · facing right · 12 colors · 3 reserved accent hexes
        </div>

        {/* controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 18 }}>
          {Object.keys(ANIMS).map((a) => (
            <button key={a} onClick={() => { setAnim(a); setScrub(-1); }} style={btn(anim === a)}>
              {a} · {ANIMS[a].frames}f @ {ANIMS[a].fps}fps
            </button>
          ))}
          <span style={{ width: 14 }} />
          <button onClick={() => setDebug(!debug)} style={btn(debug)}>anchor overlay</button>
          <button onClick={() => { setBroken(!broken); setUploaded(null); setFileName(null); }} style={btn(broken)}>
            {broken ? "showing broken sample" : "show broken sample"}
          </button>
          <span style={{ width: 14 }} />
          {[1, 2, 3].map((s) => (
            <button key={s} onClick={() => setScale(s)} style={btn(scale === s)}>{s}×</button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 24 }}>
          <label style={{ ...btn(false), display: "inline-block" }}>
            load delivered strip…
            <input type="file" accept="image/png" onChange={onFile} style={{ display: "none" }} />
          </label>
          {uploaded && (
            <button onClick={() => { setUploaded(null); setFileName(null); }} style={btn(false)}>
              back to placeholder
            </button>
          )}
          <span style={{ fontSize: 12, color: FAINT, fontFamily: MONO }}>
            {fileName || (broken ? "procedural placeholder — deliberately broken" : "procedural placeholder — spec-compliant")}
          </span>
          <span style={{ width: 14 }} />
          <span style={{ fontSize: 12, color: FAINT }}>accent</span>
          {["#c9a227", "#7ee8d2", "#d95f6e", "#9db4e8", "#c58ae8"].map((c) => (
            <button key={c} onClick={() => setAccent(c)}
              style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer",
                border: accent === c ? "2px solid #efe9ff" : "1px solid #3d2f5c" }} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,1fr) minmax(320px,1.1fr)", gap: 28, alignItems: "start" }}>

          {/* stage */}
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: FAINT, marginBottom: 8 }}>ON STAGE</div>
            <div style={{
              position: "relative", height: 420, borderRadius: 10, overflow: "hidden",
              border: "1px solid #2a2145",
              background: "linear-gradient(180deg,#151228 0%,#2a2145 55%,#4a3566 100%)",
            }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: "12.5%", height: 1, background: "rgba(255,255,255,.12)" }} />
              <div style={{ position: "absolute", left: "50%", bottom: "12.5%" }}>
                <CharacterSprite
                  avatar="aldric" accent={accent} walking={anim === "walk"}
                  anim={anim} scale={scale} debug={debug} broken={broken}
                  sheetOverride={uploaded || undefined}
                />
              </div>
            </div>
            <div style={{ fontSize: 12, color: DIM, marginTop: 10, lineHeight: 1.6 }}>
              The horizontal rule is the stage's ground line at <code style={{ fontFamily: MONO }}>bottom:12.5%</code>,
              where v4 mounts the wanderer. Feet should sit on it in every frame. Watch for bobbing or sliding.
            </div>
          </div>

          {/* filmstrip + report */}
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: FAINT, marginBottom: 8 }}>FRAMES</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
              {(report?.frames || []).map((fr) => (
                <FrameCell key={fr.index} sheet={sheet} fr={fr} accent={accent}
                  on={scrub === fr.index} onClick={() => setScrub(scrub === fr.index ? -1 : fr.index)} />
              ))}
            </div>

            <div style={{ fontSize: 11, letterSpacing: 2, color: FAINT, marginBottom: 8 }}>
              REPORT — {passCount}/{total} PASSED
            </div>
            <div style={{
              border: `1px solid ${allPass ? "#2f6b4f" : "#6b2f3f"}`,
              background: allPass ? "rgba(47,107,79,.1)" : "rgba(107,47,63,.1)",
              borderRadius: 8, padding: "6px 2px",
            }}>
              {(report?.checks || []).map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 14px", alignItems: "baseline" }}>
                  <span style={{ color: c.ok ? "#6bd39a" : "#e8697f", fontFamily: MONO, fontSize: 13 }}>
                    {c.ok ? "✓" : "✕"}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{c.label}</div>
                    <div style={{ fontSize: 11.5, color: DIM, fontFamily: MONO, marginTop: 2, lineHeight: 1.5 }}>{c.detail}</div>
                  </span>
                </div>
              ))}
            </div>

            {report?.frames?.length > 0 && (
              <div style={{ marginTop: 16, fontSize: 11.5, fontFamily: MONO, color: DIM, lineHeight: 1.8 }}>
                <div style={{ color: FAINT, letterSpacing: 1.5, marginBottom: 4 }}>PER-FRAME GEOMETRY</div>
                {report.frames.map((f) => (
                  <div key={f.index}>
                    f{f.index}  contact y={String(f.bottom).padStart(3)}  crown y={String(f.top).padStart(3)}
                    {"  "}body {String(f.height).padStart(3)}px  footX {f.footX.toFixed(1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 30, paddingTop: 18, borderTop: "1px solid #241c3d", fontSize: 12.5, color: DIM, lineHeight: 1.85, maxWidth: 760 }}>
          <div style={{ color: INK, fontVariant: "small-caps", fontSize: 15, marginBottom: 6 }}>wiring it into v4</div>
          Replace the <code style={{ fontFamily: MONO }}>Wanderer</code> function at line 1246 and swap both call sites
          (line 1630 on the stage, line 1692 in the avatar picker) for <code style={{ fontFamily: MONO }}>CharacterSprite</code> —
          the props are identical. Delete <code style={{ fontFamily: MONO }}>AvatarBody</code> and the
          {" "}<code style={{ fontFamily: MONO }}>.bootA/.bootB</code> keyframes; the walk is in the art now.
          Keep <code style={{ fontFamily: MONO }}>bob</code> and <code style={{ fontFamily: MONO }}>trot</code>, they still
          apply to the canvas. Add real sheets to the <code style={{ fontFamily: MONO }}>SHEETS</code> registry as they land;
          anything missing falls back to the placeholder so the app never breaks mid-delivery.
        </div>
      </div>
    </div>
  );
}

function FrameCell({ sheet, fr, accent, on, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const { w, h } = SPEC.cell;
    const s = 0.62;
    const ctx = ref.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w * s, h * s);
    const tinted = getTinted(`fc:${sheet.width}x${sheet.height}`, sheet, accent);
    ctx.drawImage(tinted, fr.index * w, 0, w, h, 0, 0, w * s, h * s);
    ctx.strokeStyle = "rgba(255,80,120,.8)";
    ctx.beginPath();
    ctx.moveTo(0, SPEC.anchor.y * s + 0.5);
    ctx.lineTo(w * s, SPEC.anchor.y * s + 0.5);
    ctx.stroke();
    ctx.strokeStyle = "rgba(107,211,154,.7)";
    ctx.beginPath();
    ctx.moveTo(0, fr.bottom * s + 0.5);
    ctx.lineTo(w * s, fr.bottom * s + 0.5);
    ctx.stroke();
  }, [sheet, fr, accent]);

  const drift = fr.bottom - SPEC.anchor.y;
  return (
    <button onClick={onClick} style={{
      background: "rgba(16,11,28,.9)", padding: 4, cursor: "pointer",
      border: `1px solid ${on ? "#c9a227" : Math.abs(drift) > 4 ? "#6b2f3f" : "#2a2145"}`,
      borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    }}>
      <canvas ref={ref} width={SPEC.cell.w * 0.62} height={SPEC.cell.h * 0.62}
        style={{ imageRendering: "pixelated", display: "block" }} />
      <span style={{ fontFamily: MONO, fontSize: 10, color: Math.abs(drift) > 4 ? "#e8697f" : "#5c4f80" }}>
        {String(fr.index).padStart(2, "0")} · {drift === 0 ? "on anchor" : `${drift > 0 ? "+" : ""}${drift}px`}
      </span>
    </button>
  );
}
