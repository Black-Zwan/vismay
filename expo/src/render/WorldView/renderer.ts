import type { ExpoWebGLRenderingContext } from 'expo-gl';

import { DAYPARTS } from '@/src/content/dayparts';
import { accentRamp, hx, lift, mix, ramp, sink, type Rgb } from '@/src/core/color';
import { BAYER } from '@/src/core/dither';
import type { Daypart } from '@/src/core/time';

export const BUFFER_WIDTH = 132;
export const BUFFER_HEIGHT = 254;

const PALETTE_WIDTH = 32;
const SKY_STEPS = 14;
const GROUND_STEPS = 10;
const PATH_STEPS = 8;
const COLOR_LERP = 0.045;

export interface RenderInputs {
  daypart: Daypart;
  walkProgress: number;
  accentHex: string;
}

export interface WorldRenderer {
  update(inputs: RenderInputs): void;
  dispose(): void;
}

interface Targets {
  palette: Float32Array;
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

const WORLD_FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 v_uv;
  uniform sampler2D u_palette;
  uniform sampler2D u_bayer;
  uniform float u_time;
  uniform float u_progress;
  uniform vec2 u_orb;
  uniform vec3 u_orb_color;
  uniform float u_stars;

  const float HZ = 0.54;
  const float PALETTE_W = 32.0;

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

  float bayerThreshold() {
    vec2 cell = mod(floor(gl_FragCoord.xy), 8.0);
    return texture2D(u_bayer, (cell + 0.5) / 8.0).r;
  }

  vec3 ditheredRamp(float offset, float count, float index, float threshold) {
    float bounded = clamp(index, 0.0, count - 1.0);
    float chosen = floor(bounded);
    if (fract(bounded) > threshold) chosen += 1.0;
    chosen = min(chosen, count - 1.0);
    return texture2D(u_palette, vec2((offset + chosen + 0.5) / PALETTE_W, 0.5)).rgb;
  }

  void main() {
    float nx = v_uv.x;
    float ny = 1.0 - v_uv.y;
    vec2 px = floor(gl_FragCoord.xy);
    float threshold = bayerThreshold();
    float sw = u_progress * 10000.0 + u_time * 0.7;

    float skyDrift = sin(nx * 9.0 + u_time * 0.55 + ny * 20.0)
      * 0.7 * (0.3 + ny);
    float cloudA = (vnoise(nx * 3.1 + u_time * 0.020, ny * 8.5 + 4.2) - 0.5) * 1.55;
    float cloudB = (vnoise(nx * 6.2 - u_time * 0.012, ny * 14.0 + 11.7) - 0.5) * 0.85;

    vec2 orbDelta = vec2(nx - u_orb.x, (ny - u_orb.y) * 1.55);
    float orbDistance = length(orbDelta);
    float orbLight = max(0.0, 0.42 - orbDistance) * 9.0;
    float skyIndex = (ny / HZ) * 13.0 + skyDrift + cloudA + cloudB + orbLight;
    vec3 color = ditheredRamp(0.0, 14.0, skyIndex, threshold);

    if (ny < 0.42 && u_stars > 0.03) {
      float starHash = hash2(px.x * 1.7, px.y * 2.3);
      if (starHash > 0.9935) {
        float twinkle = 0.5 + 0.5 * sin(u_time * 1.8 + starHash * 97.0);
        float visibility = twinkle * (0.45 - ny) * 3.2 * u_stars;
        if (visibility > threshold) color = mix(color, vec3(0.94, 0.91, 0.78), 0.92);
      }
    }

    if (orbDistance < 0.052) {
      color = mix(color, u_orb_color, 0.94);
    } else if (orbDistance < 0.070 && threshold < 0.55) {
      color = mix(color, u_orb_color, 0.56);
    }

    float farTop = HZ - 0.100
      + (vnoise(nx * 3.0 + sw * 0.00008, 6.1) - 0.5) * 0.070;
    float hillTop = HZ - 0.072
      + (vnoise(nx * 4.2 + sw * 0.00014, 17.3) - 0.5) * 0.082;
    float nearTop = HZ - 0.030
      + (vnoise(nx * 5.4 + sw * 0.00022, 31.9) - 0.5) * 0.092;

    if (ny > farTop) {
      float ridgeGrain = (vnoise(nx * 9.0 + sw * 0.00008, ny * 11.0) - 0.5) * 1.4;
      color = ditheredRamp(14.0, 10.0, 6.2 + ridgeGrain, threshold);
    }
    if (ny > hillTop) {
      float ridgeGrain = (vnoise(nx * 12.0 + sw * 0.00014, ny * 14.0) - 0.5) * 1.7;
      color = ditheredRamp(14.0, 10.0, 4.2 + ridgeGrain, threshold);
    }
    if (ny > nearTop) {
      float ridgeGrain = (vnoise(nx * 16.0 + sw * 0.00022, ny * 19.0) - 0.5) * 1.9;
      color = ditheredRamp(14.0, 10.0, 2.5 + ridgeGrain, threshold);
    }

    if (ny > HZ) {
      float groundDepth = (ny - HZ) / (1.0 - HZ);
      float groundNoise = (vnoise(nx * 18.0 + sw * 0.0016, ny * 20.0) - 0.5) * 2.3;
      color = ditheredRamp(14.0, 10.0, groundDepth * 8.0 + groundNoise, threshold);

      float bend = (vnoise(groundDepth * 3.2 + sw * 0.0017, 22.4) - 0.5) * 0.20;
      float pathCenter = 0.50 + bend * groundDepth;
      float pathHalfWidth = mix(0.018, 0.34, groundDepth);
      if (abs(nx - pathCenter) < pathHalfWidth) {
        float stone = vnoise(nx * 31.0 + sw * 0.0017, ny * 27.0);
        float pathIndex = groundDepth * 6.0 + (stone - 0.5) * 2.5;
        color = ditheredRamp(24.0, 8.0, pathIndex, threshold);
      }
    }

    float foregroundTop = 0.952 + vnoise(nx * 5.0 + sw * 0.0028, 44.4) * 0.032;
    if (ny > foregroundTop) {
      float foregroundGrain = (vnoise(nx * 29.0 + sw * 0.0028, ny * 23.0) - 0.5) * 1.3;
      color = ditheredRamp(14.0, 10.0, foregroundGrain, threshold);
    }

    // Temporary waymark silhouette. Set-piece art remains a later task.
    float markerX = abs(nx - 0.78);
    float markerBase = 0.89;
    float markerTop = 0.70 + vnoise(sw * 0.00004, 71.0) * 0.025;
    float markerWidth = mix(0.020, 0.046, (ny - markerTop) / (markerBase - markerTop));
    if (ny > markerTop && ny < markerBase && markerX < markerWidth) {
      color = ditheredRamp(14.0, 10.0, 1.1 + (ny - markerTop) * 7.0, threshold);
    }

    gl_FragColor = vec4(color, 1.0);
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
): WorldRenderer {
  const worldProgram = makeProgram(gl, VERTEX_SHADER, WORLD_FRAGMENT_SHADER);
  const displayProgram = makeProgram(gl, VERTEX_SHADER, DISPLAY_FRAGMENT_SHADER);
  const quad = makeQuad(gl);
  const worldTexture = makeTexture(gl, BUFFER_WIDTH, BUFFER_HEIGHT, null);
  const paletteTexture = makeTexture(gl, PALETTE_WIDTH, 1, new Uint8Array(PALETTE_WIDTH * 4));
  const bayerTexture = makeTexture(gl, 8, 8, bayerPixels());
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Unable to create WorldView framebuffer.');

  const defaultFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
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
  let targets = buildTargets(initialInputs.daypart, initialInputs.accentHex);
  const currentPalette = targets.palette.slice();
  const palettePixels = new Uint8Array(PALETTE_WIDTH * 4);
  let currentOrb: [number, number] = [...targets.orb];
  let currentOrbColor: Rgb = [...targets.orbColor];
  let currentStars = targets.stars;
  let animationFrame = 0;
  let disposed = false;
  const startedAt = performance.now();

  const worldLocations = {
    position: gl.getAttribLocation(worldProgram, 'a_position'),
    uv: gl.getAttribLocation(worldProgram, 'a_uv'),
    palette: requireUniform(gl, worldProgram, 'u_palette'),
    bayer: requireUniform(gl, worldProgram, 'u_bayer'),
    time: requireUniform(gl, worldProgram, 'u_time'),
    progress: requireUniform(gl, worldProgram, 'u_progress'),
    orb: requireUniform(gl, worldProgram, 'u_orb'),
    orbColor: requireUniform(gl, worldProgram, 'u_orb_color'),
    stars: requireUniform(gl, worldProgram, 'u_stars'),
  };
  const displayLocations = {
    position: gl.getAttribLocation(displayProgram, 'a_position'),
    uv: gl.getAttribLocation(displayProgram, 'a_uv'),
    world: requireUniform(gl, displayProgram, 'u_world'),
  };

  function draw(timestamp: number): void {
    if (disposed) return;
    for (let i = 0; i < currentPalette.length; i += 1) {
      currentPalette[i] += (targets.palette[i] - currentPalette[i]) * COLOR_LERP;
    }
    currentOrb = lerpPair(currentOrb, targets.orb, COLOR_LERP);
    currentOrbColor = mix(currentOrbColor, targets.orbColor, COLOR_LERP);
    currentStars += (targets.stars - currentStars) * COLOR_LERP;
    uploadPalette(gl, paletteTexture, currentPalette, palettePixels);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, BUFFER_WIDTH, BUFFER_HEIGHT);
    gl.useProgram(worldProgram);
    bindQuad(gl, quad, worldLocations.position, worldLocations.uv);
    bindTexture(gl, paletteTexture, 0, worldLocations.palette);
    bindTexture(gl, bayerTexture, 1, worldLocations.bayer);
    gl.uniform1f(worldLocations.time, (timestamp - startedAt) / 1000);
    gl.uniform1f(worldLocations.progress, clamp01(inputs.walkProgress));
    gl.uniform2f(worldLocations.orb, currentOrb[0], currentOrb[1]);
    gl.uniform3f(
      worldLocations.orbColor,
      currentOrbColor[0] / 255,
      currentOrbColor[1] / 255,
      currentOrbColor[2] / 255,
    );
    gl.uniform1f(worldLocations.stars, currentStars);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, defaultFramebuffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(displayProgram);
    bindQuad(gl, quad, displayLocations.position, displayLocations.uv);
    bindTexture(gl, worldTexture, 0, displayLocations.world);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.endFrameEXP();

    animationFrame = requestAnimationFrame(draw);
  }

  uploadPalette(gl, paletteTexture, currentPalette, palettePixels);
  animationFrame = requestAnimationFrame(draw);

  return {
    update(nextInputs) {
      const paletteChanged =
        nextInputs.daypart !== inputs.daypart || nextInputs.accentHex !== inputs.accentHex;
      inputs = nextInputs;
      if (paletteChanged) targets = buildTargets(nextInputs.daypart, nextInputs.accentHex);
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

function buildTargets(daypart: Daypart, accentHex: string): Targets {
  const source = DAYPARTS[daypart];
  const accent = accentRamp(accentHex);
  const skyStops = source.sky.map((hex, index) =>
    mix(hx(hex), accent[index], 0.45),
  ) as [Rgb, Rgb, Rgb];
  const earthBase = skyStops[2];
  const groundStops: Rgb[] = [
    sink(mix(earthBase, accent[2], 0.18), 0.80),
    sink(mix(earthBase, accent[1], 0.22), 0.66),
    lift(sink(earthBase, 0.56), 0.10),
  ];
  const pathStops: Rgb[] = [
    sink(mix(earthBase, accent[2], 0.10), 0.60),
    lift(sink(earthBase, 0.44), 0.14),
    lift(mix(earthBase, accent[0], 0.16), 0.26),
  ];
  const colors = [
    ...ramp(skyStops, SKY_STEPS),
    ...ramp(groundStops, GROUND_STEPS),
    ...ramp(pathStops, PATH_STEPS),
  ];
  const palette = new Float32Array(PALETTE_WIDTH * 3);
  colors.forEach((color, index) => {
    palette[index * 3] = color[0];
    palette[index * 3 + 1] = color[1];
    palette[index * 3 + 2] = color[2];
  });
  return {
    palette,
    orb: source.orb,
    orbColor: mix(hx(source.orbC), accent[0], 0.18),
    stars: source.stars,
  };
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
  for (let i = 0; i < PALETTE_WIDTH; i += 1) {
    pixels[i * 4] = Math.round(clamp255(palette[i * 3]));
    pixels[i * 4 + 1] = Math.round(clamp255(palette[i * 3 + 1]));
    pixels[i * 4 + 2] = Math.round(clamp255(palette[i * 3 + 2]));
    pixels[i * 4 + 3] = 255;
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
    const value = Math.round(threshold * 255);
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

function lerpPair(
  current: [number, number],
  target: [number, number],
  amount: number,
): [number, number] {
  return [
    current[0] + (target[0] - current[0]) * amount,
    current[1] + (target[1] - current[1]) * amount,
  ];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, value));
}
