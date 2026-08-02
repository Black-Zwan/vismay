export const hash2 = (x: number, y: number): number => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export const smoothT = (t: number): number => t * t * (3 - 2 * t);
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = smoothT(xf), v = smoothT(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
