export type Rgb = [number, number, number];
export type Hsl = [number, number, number];

export const hx = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const lift = (c: Rgb, t: number): Rgb => mix(c, [255, 245, 220], t);
export const sink = (c: Rgb, t: number): Rgb => mix(c, [8, 6, 14], t);
export const shadeCss = (hex: string, f: number): string => {
  const [r, g, b] = hx(hex);
  const m = (v: number) => Math.round(Math.min(255, v * f));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
};
export function ramp(stops: Rgb[], n: number): Rgb[] {
  const out: Rgb[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (stops.length - 1);
    const j = Math.min(Math.floor(t), stops.length - 2);
    out.push(mix(stops[j], stops[j + 1], t - j));
  }
  return out;
}

const sHex2rgb = (h: string): Rgb => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
];
const sClamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export function sRgb2hsl(r: number, g: number, b: number): Hsl {
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

export function sHsl2rgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let v: Rgb;
  if (h < 60) v = [c, x, 0]; else if (h < 120) v = [x, c, 0];
  else if (h < 180) v = [0, c, x]; else if (h < 240) v = [0, x, c];
  else if (h < 300) v = [x, 0, c]; else v = [c, 0, x];
  return v.map((q) => sClamp((q + m) * 255)) as Rgb;
}

/* Three steps derived from the card accent, spaced to match the reserved
   slots so tinted art keeps its modelling. */
export function accentRamp(hex: string): [Rgb, Rgb, Rgb] {
  const [h, s, l] = sRgb2hsl(...sHex2rgb(hex));
  return [
    sHsl2rgb(h, Math.max(0, s - 0.1), Math.min(0.92, l + 0.2)),
    sHsl2rgb(h, s, l),
    sHsl2rgb(h, Math.min(1, s + 0.06), Math.max(0.06, l - 0.24)),
  ];
}
