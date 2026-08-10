import type { ExpoWebGLRenderingContext } from 'expo-gl';

import { DAYPARTS } from '@/src/content/dayparts';
import { hx, lift, mix, ramp, sink, type Rgb } from '@/src/core/color';
import { BAYER } from '@/src/core/dither';
import type { Daypart } from '@/src/core/time';
import { BIOMES } from '@/src/world/data';
import type { BiomeId, SceneId } from '@/src/world/types';

import { ROAD_SCROLL_PX_PER_SECOND } from './motion';
import { WORLD_COMPOSITION } from './composition';
import { resolveSceneFrame, type SceneFrame } from './scenes';

export const BUFFER_WIDTH = 132;
export const BUFFER_HEIGHT = 254;
export const BUFFER_ASPECT_RATIO = BUFFER_WIDTH / BUFFER_HEIGHT;

const SKY_STEPS = 14;
const GROUND_STEPS = 10;
const PATH_STEPS = 8;
const COLOR_LERP = 0.045;
const PALETTE_WIDTH = 41;
const LEG_SCROLL_DISTANCE = 480;
const STAR: Rgb = [255, 244, 214];

const PALETTE = {
  sky: 0,
  ground: SKY_STEPS,
  path: SKY_STEPS + GROUND_STEPS,
  far: 32,
  hill: 33,
  near: 34,
  foreground: 35,
  orbCore: 36,
  orbEdge: 37,
  waterDeep: 38,
  waterLit: 39,
  star: 40,
} as const;

export interface RenderInputs {
  daypart: Daypart;
  seed: number;
  biome: BiomeId;
  walkProgress: number;
  accentHex: string;
  tintHex?: string;
  sceneId: SceneId;
  walking: boolean;
}

export interface WorldRenderer {
  update(inputs: RenderInputs): void;
  dispose(): void;
}

export type FpsListener = (fps: number) => void;

interface PaletteState {
  sky: [Rgb, Rgb, Rgb];
  plane: Rgb;
  path: Rgb;
  accent: Rgb;
  orb: [number, number];
  orbColor: Rgb;
  stars: number;
}

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_uv;
  varying vec2 v_uv;

  void main() {
    v_uv = a_uv;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Literal GLSL translation of Wonder-ArtUpdate-v6.jsx WorldCanvas lines 338–443.
// Branch order and arithmetic intentionally mirror the source loop.
const WORLD_FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 v_uv;
  uniform sampler2D u_palette;
  uniform sampler2D u_bayer;
  uniform float u_time;
  uniform float u_scroll;
  uniform float u_seed;
  uniform vec2 u_orb;
  uniform float u_stars;
  uniform vec4 u_ridges;
  uniform float u_ridgeDepth;
  uniform vec4 u_waterBand;
  uniform vec4 u_ground;
  uniform vec4 u_sky;
  uniform vec4 u_atmosphere;
  uniform vec3 u_road;

  const float W = 132.0;
  const float H = 254.0;
  const float HZ = 0.54;
  const float SKY_N = 14.0;
  const float G_N = 10.0;
  const float P_N = 8.0;
  const float PALETTE_W = 41.0;

  float hash2(float x, float y) {
    float n = sin(x * 127.1 + y * 311.7) * 43758.5453;
    return fract(n);
  }

  float smoothT(float t) {
    return t * t * (3.0 - 2.0 * t);
  }

  float vnoise(float x, float y) {
    vec2 cell = floor(vec2(x, y));
    vec2 f = fract(vec2(x, y));
    float a = hash2(cell.x, cell.y);
    float b = hash2(cell.x + 1.0, cell.y);
    float c = hash2(cell.x, cell.y + 1.0);
    float d = hash2(cell.x + 1.0, cell.y + 1.0);
    float u = smoothT(f.x);
    float v = smoothT(f.y);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  vec3 paletteColor(float index) {
    return texture2D(u_palette, vec2((index + 0.5) / PALETTE_W, 0.5)).rgb;
  }

  float bayerThreshold(vec2 pixel) {
    vec2 cell = mod(pixel, 8.0);
    return texture2D(u_bayer, (cell + 0.5) / 8.0).r * (255.0 / 64.0);
  }

  vec3 ditheredRamp(float offset, float count, float index, float bt) {
    float bounded = clamp(index, 0.0, count - 1.0);
    float chosen = floor(bounded);
    if (bounded - chosen > bt && chosen < count - 1.0) chosen += 1.0;
    return paletteColor(offset + chosen);
  }

  void main() {
    float nx = v_uv.x;
    float ny = 1.0 - v_uv.y;
    vec2 pixel = floor(vec2(nx * W, ny * H));
    float x = pixel.x;
    float y = pixel.y;
    float bt = bayerThreshold(pixel);
    float sw = u_scroll;
    float hz = HZ * u_sky.x;
    vec3 col;

    if (ny < hz) {
      // ---- LIVING SKY ----
      float skyNy = ny * HZ / hz;
      float idx = (skyNy / HZ) * (SKY_N - 1.0);
      idx += sin(nx * 9.0 + u_time * 0.55 + skyNy * 20.0) * 0.7 * (0.3 + skyNy);
      idx += (vnoise(nx * 2.6 + u_time * 0.045, skyNy * 5.2 + 40.4) - 0.5)
        * 3.2 * max(0.0, 1.0 - abs(skyNy - 0.34) / 0.34);
      float band = max(0.0, 1.0 - abs(skyNy - 0.3) / 0.27);
      if (band > 0.02) {
        float cn =
          vnoise(nx * 5.0 + u_time * 0.015 + sw * 0.00006, skyNy * 16.0 + 7.3) +
          0.5 * vnoise(nx * 11.0 - u_time * 0.021 + 3.1, skyNy * 30.0 + 1.7);
        idx += (cn / 1.5 - 0.5) * 4.4 * band;
      }

      // sun / moon at the hour's position
      float dxs = nx - u_orb.x;
      float dys = (skyNy - u_orb.y) * 1.55;
      float ds = sqrt(dxs * dxs + dys * dys);
      idx += max(0.0, 0.42 - ds) * 9.0;
      idx = clamp(idx, 0.0, SKY_N - 1.0);
      col = ditheredRamp(0.0, SKY_N, idx, bt);
      if (ds < 0.052) col = paletteColor(${PALETTE.orbCore}.0);
      else if (ds < 0.07 && bt < 0.55) col = paletteColor(${PALETTE.orbEdge}.0);

      // stars, by daypart
      if (skyNy < 0.42 && u_stars > 0.03) {
        float sh = hash2(x * 1.7, floor(skyNy * H) * 2.3);
        if (sh > 0.9935) {
          float tw = 0.5 + 0.5 * sin(u_time * 1.8 + sh * 97.0);
          if (tw * (0.45 - skyNy) * 3.2 * u_stars > bt) {
            col = paletteColor(${PALETTE.star}.0);
          }
        }
      }

      // far ridge → rolling hills → near ridge
      float d1 = nx + sw * 0.00008 + u_seed * 0.000013;
      float dhh = nx + sw * 0.00014 + u_seed * 0.000021;
      float d2 = nx + sw * 0.00022 + u_seed * 0.000034;
      float r1 = hz - u_ridges.y * (0.1 + vnoise(d1 * 2.2, 3.1 + u_seed * 0.000017) * 0.085 + vnoise(d1 * 6.0, 9.4) * 0.024 * u_ridges.z) + u_ridgeDepth;
      float rh = hz - u_ridges.y * (0.072 + (sin(dhh * 5.1) * 0.5 + 0.5) * 0.04 + vnoise(dhh * 1.7, 55.5 + u_seed * 0.000011) * 0.028 * u_ridges.z) + u_ridgeDepth;
      float r2 = hz - u_ridges.y * (0.03 + vnoise(d2 * 3.2, 17.7 + u_seed * 0.000019) * 0.055 + vnoise(d2 * 8.5, 27.2) * 0.018 * u_ridges.z) + u_ridgeDepth;
      float edge = (bt - 0.5) * 0.008;
      float farAlpha = clamp(u_ridges.x - 2.0, 0.0, 1.0) * (1.0 - u_ridges.w);
      float hillAlpha = clamp(u_ridges.x - 1.0, 0.0, 1.0);
      float nearAlpha = clamp(u_ridges.x, 0.0, 1.0);
      if (ny + edge > r1) col = mix(col, paletteColor(${PALETTE.far}.0), farAlpha);
      if (ny + edge > rh) col = mix(col, paletteColor(${PALETTE.hill}.0), hillAlpha);
      if (ny + edge > r2) col = mix(col, paletteColor(${PALETTE.near}.0), nearAlpha);

      // Scene atmosphere is still the same sky path: numbers only.
      float haze = u_sky.y * max(0.0, 1.0 - abs(ny - hz) / max(0.001, hz * 0.42));
      col = mix(col, paletteColor(${PALETTE.orbEdge}.0), haze * 0.22);
      if (u_atmosphere.y > 0.0) {
        float greenHaze = max(0.0, 1.0 - abs(ny - hz * 0.82) / max(0.001, hz * 0.32));
        col = mix(col, vec3(0.12, 0.25, 0.16), greenHaze * 0.34 * u_atmosphere.y);
      }
      if (u_atmosphere.x > 0.0) {
        float shaft = sin(nx * 7.3 + vnoise(nx * 2.0, 11.0) * 3.0);
        if (shaft > 0.72) {
          float shaftStrength = smoothstep(0.72, 0.98, shaft);
          col = mix(col, paletteColor(${PALETTE.orbEdge}.0), u_atmosphere.x * 0.32 * shaftStrength * (1.0 - ny / hz));
        }
      }
      if (u_sky.w > 0.0) {
        float canopyEdge = u_sky.w + (vnoise(nx * 8.0 + sw * 0.00008, 19.0) - 0.5) * 0.055;
        if (ny < canopyEdge) {
          float canopyDepth = clamp((canopyEdge - ny) / 0.13, 0.0, 1.0);
          col = mix(col, paletteColor(${PALETTE.foreground}.0), canopyDepth * 0.92);
        }
      }
    } else {
      // ---- GROUND ----
      float d = (ny - hz) / (1.0 - hz);
      // One ground-space coordinate keeps the road edge, its stones and the
      // span planks moving as one surface instead of sliding at unrelated
      // apparent speeds.
      float roadX = nx + sw * (0.0016 / 1.4);
      float u = (vnoise(roadX * 1.4, 8.8) - 0.5) * 0.016;
      float rTop = ${WORLD_COMPOSITION.pathTopFromTop} + u;
      float rBot = ${WORLD_COMPOSITION.pathBottomFromTop} + u * 0.6;
      float edge = (bt - 0.5) * 0.012;
      float fgTop = ${WORLD_COMPOSITION.foregroundTopFromTop} + vnoise(nx * 5.0 + sw * 0.0028, 44.4) * 0.024;
      if (ny > fgTop) {
        col = paletteColor(${PALETTE.foreground}.0);
      } else if (ny + edge > rTop && ny + edge < rBot) {
        float stone = vnoise(roadX * 9.0, ny * 46.0);
        float pi = 3.0 + (stone - 0.5) * 2.6 + ((ny - rTop) / (rBot - rTop)) * 1.4;
        if (stone > 0.62) pi += 2.4;
        pi = clamp(pi, 0.0, P_N - 1.0);
        col = ditheredRamp(${PALETTE.path}.0, P_N, pi, bt);
        if (u_road.y > 0.02) {
          float plank = step(0.72, vnoise(roadX * 42.0, ny * 7.0));
          col = mix(paletteColor(${PALETTE.foreground}.0), paletteColor(${PALETTE.path + 3}.0), 0.38 + plank * 0.34);
        }
      } else {
        float scroll = sw * (0.0004 + d * d * 0.0022);
        float gn =
          vnoise(nx * 5.0 + scroll, d * 6.0 + 2.2) * 0.7 +
          vnoise(nx * 12.0 + scroll * 1.6, d * 14.0 + 7.7) * 0.3;
        float idx = (1.0 - d) * (G_N - 1.0) * 0.92 + (gn - 0.5) * 2.6;
        if (u_ground.x > 0.5 && u_ground.x < 1.5) {
          idx = 4.5 + (1.0 - d) * 2.4 + (vnoise(nx * 20.0 + scroll, d * 9.0) - 0.5) * 1.2;
        } else if (u_ground.x >= 1.5 && u_ground.x < 2.5) {
          idx = 2.0 + (1.0 - d) * 3.0 + (vnoise(nx * 26.0 + scroll * 1.8, d * 31.0) - 0.5) * 4.0;
        } else if (u_ground.x >= 2.5 && u_ground.x < 3.5) {
          idx = 5.8 + (1.0 - d) * 2.0 + (vnoise(nx * 7.0 + scroll * 0.4, d * 4.0) - 0.5) * 0.8;
        } else if (u_ground.x >= 3.5 && u_ground.x < 4.5) {
          idx = 0.4 + (vnoise(nx * 3.0 + scroll * 0.2, d * 4.0) - 0.5) * 1.1 + u_ground.y * d * 2.0;
        } else if (u_ground.x >= 4.5 && u_ground.x < 5.5) {
          idx = 1.4 + (1.0 - d) * 2.2 + (vnoise(nx * 18.0 + scroll, d * 17.0) - 0.5) * 2.6;
        } else if (u_ground.x >= 5.5) {
          idx = 7.2 + (1.0 - d) * 1.4 + (vnoise(nx * 12.0 + scroll, d * 12.0) - 0.5) * 1.3;
        }
        idx = clamp(idx, 0.0, G_N - 1.0);
        col = ditheredRamp(${PALETTE.ground}.0, G_N, idx, bt);

        // Salt flats mirror the same sky, orb, stars and ridges below the horizon.
        if (u_ground.z > 0.02) {
          float reflectedNy = hz - (ny - hz) * u_ground.w + sin(nx * 70.0 + u_time * 0.35) * 0.0018;
          float reflectedSkyNy = reflectedNy * HZ / hz;
          float reflectedIdx = clamp((reflectedSkyNy / HZ) * (SKY_N - 1.0), 0.0, SKY_N - 1.0);
          vec3 reflection = ditheredRamp(0.0, SKY_N, reflectedIdx, bt);
          float rdx = nx - u_orb.x;
          float rdy = (reflectedSkyNy - u_orb.y) * 1.55;
          float rds = sqrt(rdx * rdx + rdy * rdy);
          if (rds < 0.052) reflection = paletteColor(${PALETTE.orbCore}.0);
          else if (rds < 0.07 && bt < 0.55) reflection = paletteColor(${PALETTE.orbEdge}.0);
          if (reflectedSkyNy < 0.42 && u_stars > 0.03) {
            float rsh = hash2(x * 1.7, floor(reflectedSkyNy * H) * 2.3);
            if (rsh > 0.9935) reflection = paletteColor(${PALETTE.star}.0);
          }
          float rd1 = nx + sw * 0.00008 + u_seed * 0.000013;
          float rr1 = hz - u_ridges.y * (0.1 + vnoise(rd1 * 2.2, 3.1 + u_seed * 0.000017) * 0.085 + vnoise(rd1 * 6.0, 9.4) * 0.024 * u_ridges.z) + u_ridgeDepth;
          if (reflectedNy > rr1) reflection = mix(reflection, paletteColor(${PALETTE.far}.0), clamp(u_ridges.x - 1.0, 0.0, 1.0));
          float mirrorFade = clamp(1.0 - (ny - hz) / max(0.001, 1.0 - hz), 0.18, 0.82);
          col = mix(col, reflection * 0.82, u_ground.z * mirrorFade);
        }

        // Water is a numeric band; the legacy river remains byte-for-byte the default branch.
        if (u_waterBand.x > 0.02 && ny > u_waterBand.y && ny < u_waterBand.z) {
          float depth = clamp((ny - u_waterBand.y) / max(0.001, u_waterBand.z - u_waterBand.y), 0.0, 1.0);
          float shimmer = vnoise(nx * 26.0 + u_time * 0.85 + sw * 0.003, ny * 80.0);
          if (u_waterBand.w > 0.5 && u_waterBand.w < 1.5) {
            float perspective = pow(max(depth, 0.001), 0.62) * 46.0;
            float wave = sin(perspective - u_time * 1.1 + nx * 2.2);
            float chop = vnoise(nx * 18.0 + u_time * 0.18, depth * 16.0 + sw * 0.0012);
            shimmer = wave * 0.5 + 0.5 + (chop - 0.5) * 0.72;
          } else if (u_waterBand.w >= 1.5) {
            shimmer = vnoise(nx * 44.0 + u_time * 0.12, ny * 150.0) * 0.55 + 0.22;
          }
          vec3 waterColor = shimmer > 0.62
            ? paletteColor(${PALETTE.waterLit}.0)
            : paletteColor(${PALETTE.waterDeep}.0);
          if (shimmer > 0.62 && bt > 0.6) {
            waterColor = mix(waterColor, vec3(1.0, 245.0 / 255.0, 220.0 / 255.0), 0.2);
          }
          float waterEdge = min(1.0, (ny - u_waterBand.y) * 18.0);
          if (u_waterBand.w > 0.5) waterEdge *= min(1.0, (u_waterBand.z - ny) * 24.0);
          col = mix(col, waterColor, u_waterBand.x * waterEdge);
        }
      }

      // The span's lower ridges remain visible through the void beneath the deck.
      if (u_ground.x > 3.5 && u_ground.x < 4.5 && u_ridgeDepth > 0.02 && !(ny + edge > rTop && ny + edge < rBot)) {
        float vd = nx + sw * 0.00017 + u_seed * 0.000029;
        float vr = hz + u_ridgeDepth - u_ridges.y * (0.035 + vnoise(vd * 3.1, 21.0) * 0.05);
        if (ny > vr && ny < rTop) col = mix(col, paletteColor(${PALETTE.near}.0), 0.68);
      }

      if (u_atmosphere.z > 0.02) {
        float glow = max(0.0, 1.0 - distance(vec2(nx, ny), vec2(0.62, hz + 0.12)) * 4.2);
        col = mix(col, paletteColor(${PALETTE.orbEdge}.0), glow * 0.28 * u_atmosphere.z);
      }

      if (u_road.z > 0.02) {
        float rail = min(abs(ny - (rTop - 0.018)), abs(ny - (rBot + 0.012)));
        if (rail < 0.006) col = mix(col, paletteColor(${PALETTE.path + 5}.0), u_road.z * 0.88);
      }
    }

    // shooting star — only across a starry sky
    if (u_stars > 0.4) {
      float period = 11.0;
      float ph = mod(u_time, period);
      if (ph < 0.8) {
        float seed = floor(u_time / period);
        float sx0 = 0.12 + hash2(seed, 1.0) * 0.55;
        float sy0 = 0.05 + hash2(seed, 2.0) * 0.14;
        float pr = ph / 0.8;
        for (int q = 0; q < 7; q++) {
          float fq = float(q);
          float pp = pr - fq * 0.02;
          if (pp >= 0.0) {
            vec2 starPixel = floor(vec2((sx0 + pp * 0.3) * W, (sy0 + pp * 0.17) * H));
            if (all(equal(pixel, starPixel))) {
              float alpha = max(0.0, 0.95 * (1.0 - fq / 7.0) * (1.0 - pr) * u_stars);
              col = mix(col, paletteColor(${PALETTE.star}.0), alpha);
            }
          }
        }
      }
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const DISPLAY_FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_world;

  void main() {
    gl_FragColor = texture2D(u_world, v_uv);
  }
`;

export function createWorldRenderer(
  gl: ExpoWebGLRenderingContext,
  initialInputs: RenderInputs,
  onFps?: FpsListener,
): WorldRenderer {
  const worldProgram = makeProgram(gl, VERTEX_SHADER, WORLD_FRAGMENT_SHADER);
  const displayProgram = makeProgram(gl, VERTEX_SHADER, DISPLAY_FRAGMENT_SHADER);
  const quad = makeQuad(gl);
  const worldTexture = makeTexture(gl, BUFFER_WIDTH, BUFFER_HEIGHT, null);
  const paletteTexture = makeTexture(gl, PALETTE_WIDTH, 1, new Uint8Array(PALETTE_WIDTH * 4));
  const bayerTexture = makeTexture(gl, 8, 8, bayerPixels());
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Unable to create WorldView framebuffer.');

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    worldTexture,
    0,
  );
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('WorldView framebuffer is incomplete.');
  }

  gl.disable(gl.DITHER);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  let inputs = initialInputs;
  let target = buildTarget(initialInputs);
  const current = clonePaletteState(target);
  let sceneTarget = resolveSceneFrame(initialInputs.sceneId, initialInputs.walkProgress, initialInputs.biome);
  const currentScene = cloneSceneFrame(sceneTarget);
  const framePalette = new Float32Array(PALETTE_WIDTH * 3);
  const palettePixels = new Uint8Array(PALETTE_WIDTH * 4);
  let animationFrame = 0;
  let disposed = false;
  const startedAt = performance.now();
  let lastFrameAt: number | null = null;
  let fpsWindowStartedAt = startedAt;
  let fpsFrames = 0;
  let scroll = scrollDistance(initialInputs);

  const worldLocations = {
    position: gl.getAttribLocation(worldProgram, 'a_position'),
    uv: gl.getAttribLocation(worldProgram, 'a_uv'),
    palette: requireUniform(gl, worldProgram, 'u_palette'),
    bayer: requireUniform(gl, worldProgram, 'u_bayer'),
    time: requireUniform(gl, worldProgram, 'u_time'),
    scroll: requireUniform(gl, worldProgram, 'u_scroll'),
    seed: requireUniform(gl, worldProgram, 'u_seed'),
    orb: requireUniform(gl, worldProgram, 'u_orb'),
    stars: requireUniform(gl, worldProgram, 'u_stars'),
    ridges: requireUniform(gl, worldProgram, 'u_ridges'),
    ridgeDepth: requireUniform(gl, worldProgram, 'u_ridgeDepth'),
    waterBand: requireUniform(gl, worldProgram, 'u_waterBand'),
    ground: requireUniform(gl, worldProgram, 'u_ground'),
    sky: requireUniform(gl, worldProgram, 'u_sky'),
    atmosphere: requireUniform(gl, worldProgram, 'u_atmosphere'),
    road: requireUniform(gl, worldProgram, 'u_road'),
  };
  const displayLocations = {
    position: gl.getAttribLocation(displayProgram, 'a_position'),
    uv: gl.getAttribLocation(displayProgram, 'a_uv'),
    world: requireUniform(gl, displayProgram, 'u_world'),
  };

  function draw(timestamp: number): void {
    if (disposed) return;
    if (lastFrameAt !== null && inputs.walking) {
      const elapsedSeconds = Math.min(100, timestamp - lastFrameAt) / 1_000;
      scroll += elapsedSeconds * ROAD_SCROLL_PX_PER_SECOND;
    }
    lastFrameAt = timestamp;
    lerpPaletteState(current, target, COLOR_LERP);
    lerpSceneFrame(currentScene, sceneTarget, COLOR_LERP);
    buildFramePalette(current, framePalette);
    uploadPalette(gl, paletteTexture, framePalette, palettePixels);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, BUFFER_WIDTH, BUFFER_HEIGHT);
    gl.useProgram(worldProgram);
    bindQuad(gl, quad, worldLocations.position, worldLocations.uv);
    bindTexture(gl, paletteTexture, 0, worldLocations.palette);
    bindTexture(gl, bayerTexture, 1, worldLocations.bayer);
    gl.uniform1f(worldLocations.time, (timestamp - startedAt) / 1000);
    gl.uniform1f(worldLocations.scroll, scroll);
    gl.uniform1f(worldLocations.seed, inputs.seed);
    gl.uniform2f(worldLocations.orb, current.orb[0], current.orb[1]);
    gl.uniform1f(worldLocations.stars, current.stars);
    gl.uniform4f(worldLocations.ridges, currentScene.ridgeCount, currentScene.ridgeAmp, currentScene.ridgeRough, currentScene.ridgeNearOnly);
    gl.uniform1f(worldLocations.ridgeDepth, currentScene.ridgeDepthOffset);
    gl.uniform4f(worldLocations.waterBand, currentScene.waterAmount, currentScene.waterFrom, currentScene.waterTo, currentScene.waterStyle);
    gl.uniform4f(worldLocations.ground, currentScene.groundTexture, currentScene.groundFog, currentScene.mirror, currentScene.mirrorSquash);
    gl.uniform4f(worldLocations.sky, currentScene.skyCompress, currentScene.hazeLift, currentScene.starBoost, currentScene.occludeTop);
    gl.uniform4f(worldLocations.atmosphere, currentScene.shafts, currentScene.hazeTint, currentScene.groundGlow, 0);
    gl.uniform3f(worldLocations.road, currentScene.roadAmount, currentScene.roadDeck, currentScene.roadRails);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Expo GL's native bridge does not implement
    // getParameter(FRAMEBUFFER_BINDING). Binding null is the portable WebGL
    // contract and Expo maps it to the GLView's presentation framebuffer.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(displayProgram);
    bindQuad(gl, quad, displayLocations.position, displayLocations.uv);
    bindTexture(gl, worldTexture, 0, displayLocations.world);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.endFrameEXP();

    fpsFrames += 1;
    if (timestamp - fpsWindowStartedAt >= 1_000) {
      onFps?.(Math.round(fpsFrames * 1_000 / (timestamp - fpsWindowStartedAt)));
      fpsFrames = 0;
      fpsWindowStartedAt = timestamp;
    }

    animationFrame = requestAnimationFrame(draw);
  }

  buildFramePalette(current, framePalette);
  uploadPalette(gl, paletteTexture, framePalette, palettePixels);
  animationFrame = requestAnimationFrame(draw);

  return {
    update(nextInputs) {
      const seedChanged = nextInputs.seed !== inputs.seed;
      const targetChanged =
        nextInputs.daypart !== inputs.daypart ||
        nextInputs.biome !== inputs.biome ||
        nextInputs.sceneId !== inputs.sceneId ||
        nextInputs.walkProgress !== inputs.walkProgress ||
        nextInputs.accentHex !== inputs.accentHex ||
        nextInputs.tintHex !== inputs.tintHex;
      inputs = nextInputs;
      if (seedChanged) scroll = scrollDistance(nextInputs);
      if (targetChanged) target = buildTarget(nextInputs);
      sceneTarget = resolveSceneFrame(nextInputs.sceneId, nextInputs.walkProgress, nextInputs.biome);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(worldTexture);
      gl.deleteTexture(paletteTexture);
      gl.deleteTexture(bayerTexture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(worldProgram);
      gl.deleteProgram(displayProgram);
    },
  };
}

function buildTarget(inputs: RenderInputs): PaletteState {
  const daypart = DAYPARTS[inputs.daypart];
  const biome = BIOMES[inputs.biome];
  const tint = inputs.tintHex ? hx(inputs.tintHex) : null;
  const sky = daypart.sky.map(hx) as [Rgb, Rgb, Rgb];
  const planeBase = mix(hx(biome.ground[1]), sky[2], 0.1 * biome.light);
  const pathBase = mix(hx(biome.path[1]), sky[2], 0.08 * biome.light);
  return {
    sky: tint ? sky.map((color) => mix(color, tint, 0.45)) as [Rgb, Rgb, Rgb] : sky,
    plane: tint ? mix(planeBase, tint, 0.32) : planeBase,
    path: tint ? mix(pathBase, tint, 0.32) : pathBase,
    accent: hx(inputs.accentHex),
    orb: [...daypart.orb],
    orbColor: tint ? mix(hx(daypart.orbC), tint, 0.35) : hx(daypart.orbC),
    stars: Math.min(2, daypart.stars + resolveSceneFrame(inputs.sceneId, inputs.walkProgress, inputs.biome).starBoost),
  };
}

function clonePaletteState(source: PaletteState): PaletteState {
  return {
    sky: source.sky.map((color) => [...color]) as [Rgb, Rgb, Rgb],
    plane: [...source.plane],
    path: [...source.path],
    accent: [...source.accent],
    orb: [...source.orb],
    orbColor: [...source.orbColor],
    stars: source.stars,
  };
}

function lerpPaletteState(current: PaletteState, target: PaletteState, amount: number): void {
  for (let index = 0; index < 3; index += 1) {
    current.sky[index] = mix(current.sky[index], target.sky[index], amount);
  }
  current.plane = mix(current.plane, target.plane, amount);
  current.path = mix(current.path, target.path, amount);
  current.accent = mix(current.accent, target.accent, amount);
  current.orbColor = mix(current.orbColor, target.orbColor, amount);
  current.orb[0] += (target.orb[0] - current.orb[0]) * amount;
  current.orb[1] += (target.orb[1] - current.orb[1]) * amount;
  current.stars += (target.stars - current.stars) * amount;
}

function cloneSceneFrame(source: SceneFrame): SceneFrame {
  return { ...source };
}

function lerpSceneFrame(current: SceneFrame, target: SceneFrame, amount: number): void {
  (Object.keys(current) as (keyof SceneFrame)[]).forEach((key) => {
    current[key] += (target[key] - current[key]) * amount;
  });
}

function buildFramePalette(current: PaletteState, output: Float32Array): void {
  const skyRamp = ramp([
    sink(current.sky[0], 0.35),
    current.sky[0],
    current.sky[1],
    current.sky[2],
    lift(current.sky[2], 0.3),
  ], SKY_STEPS);
  const groundRamp = ramp([
    sink(current.plane, 0.55),
    current.plane,
    mix(current.plane, current.sky[2], 0.45),
    mix(current.plane, current.sky[2], 0.8),
  ], GROUND_STEPS);
  const pathRamp = ramp([
    sink(current.path, 0.4),
    current.path,
    mix(current.path, current.sky[2], 0.55),
  ], PATH_STEPS);
  const mFar = mix(mix(current.sky[1], current.plane, 0.5), current.sky[2], 0.28);
  const mNear = mix(current.plane, current.sky[0], 0.4);
  const mHill = mix(mFar, mNear, 0.5);
  const fgDark = sink(current.plane, 0.68);
  const orbCore = lift(current.orbColor, 0.25);
  const orbEdge = current.orbColor;
  const waterDeep = mix(mix(current.sky[0], [40, 70, 130], 0.35), current.plane, 0.3);
  const waterLit = mix(current.sky[2], [160, 200, 255], 0.25);

  const colors = [
    ...skyRamp,
    ...groundRamp,
    ...pathRamp,
    mFar,
    mHill,
    mNear,
    fgDark,
    orbCore,
    orbEdge,
    waterDeep,
    waterLit,
    STAR,
  ];
  colors.forEach((color, index) => {
    output[index * 3] = color[0];
    output[index * 3 + 1] = color[1];
    output[index * 3 + 2] = color[2];
  });
}

function scrollDistance(inputs: RenderInputs): number {
  const seedOffset = (inputs.seed >>> 0) / 0x1_0000_0000;
  return (seedOffset + clamp01(inputs.walkProgress)) * LEG_SCROLL_DISTANCE;
}

function makeProgram(
  gl: ExpoWebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertex = makeShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = makeShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create WorldView shader program.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WorldView program link failed: ${gl.getProgramInfoLog(program) ?? 'unknown'}`);
  }
  return program;
}

function makeShader(
  gl: ExpoWebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create WorldView shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`WorldView shader compile failed: ${gl.getShaderInfoLog(shader) ?? 'unknown'}`);
  }
  return shader;
}

function makeQuad(gl: ExpoWebGLRenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Unable to create WorldView vertex buffer.');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1, 0, 0,
      1, -1, 1, 0,
      -1, 1, 0, 1,
      -1, 1, 0, 1,
      1, -1, 1, 0,
      1, 1, 1, 1,
    ]),
    gl.STATIC_DRAW,
  );
  return buffer;
}

function bindQuad(
  gl: ExpoWebGLRenderingContext,
  buffer: WebGLBuffer,
  position: number,
  uv: number,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
}

function makeTexture(
  gl: ExpoWebGLRenderingContext,
  width: number,
  height: number,
  pixels: Uint8Array | null,
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Unable to create WorldView texture.');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels,
  );
  return texture;
}

function bindTexture(
  gl: ExpoWebGLRenderingContext,
  texture: WebGLTexture,
  unit: number,
  location: WebGLUniformLocation,
): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(location, unit);
}

function uploadPalette(
  gl: ExpoWebGLRenderingContext,
  texture: WebGLTexture,
  palette: Float32Array,
  pixels: Uint8Array,
): void {
  for (let index = 0; index < PALETTE_WIDTH; index += 1) {
    pixels[index * 4] = Math.round(clamp255(palette[index * 3]));
    pixels[index * 4 + 1] = Math.round(clamp255(palette[index * 3 + 1]));
    pixels[index * 4 + 2] = Math.round(clamp255(palette[index * 3 + 2]));
    pixels[index * 4 + 3] = 255;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    PALETTE_WIDTH,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels,
  );
}

function bayerPixels(): Uint8Array {
  const pixels = new Uint8Array(8 * 8 * 4);
  BAYER.forEach((threshold, index) => {
    // Store the original 0..63 matrix entry losslessly. The shader converts
    // the normalized texture sample back to entry / 64.
    const value = Math.round(threshold * 64);
    pixels[index * 4] = value;
    pixels[index * 4 + 1] = value;
    pixels[index * 4 + 2] = value;
    pixels[index * 4 + 3] = 255;
  });
  return pixels;
}

function requireUniform(
  gl: ExpoWebGLRenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (!location) throw new Error(`WorldView uniform ${name} is unavailable.`);
  return location;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, value));
}
