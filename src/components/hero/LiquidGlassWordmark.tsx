import React, { useEffect, useRef, useState } from 'react';

interface LiquidGlassWordmarkProps {
  isActive?: boolean;
  isHovered?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

interface GlyphBox {
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const LETTERS: { char: string; k: number; idx: number }[] = [
  { char: 'V', k: 1.5, idx: -2.5 },
  { char: 'A', k: -3.0, idx: -1.5 },
  { char: 'I', k: 0.5, idx: -0.5 },
  { char: 'U', k: 1.5, idx: 0.5 },
  { char: 'R', k: 1.0, idx: 1.5 },
  { char: 'E', k: -1.0, idx: 2.5 },
];

const VERTEX_SHADER_SRC = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uGlyphMap;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPointer;
uniform float uHover;
uniform float uMotion;

// Polynomial smooth minimum for organic liquid surface-tension blending
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / max(k, 0.0001), 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Smooth analytical studio environment for optical liquid glass & crystal reflections
vec3 sampleStudioEnv(vec2 dir, float t, vec2 ptr) {
  float v = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 zenith = vec3(0.98, 0.99, 1.00);
  vec3 horizon = vec3(0.52, 0.62, 0.76);
  vec3 nadir = vec3(0.14, 0.20, 0.30);

  vec3 base = mix(nadir, horizon, smoothstep(0.04, 0.52, v));
  base = mix(base, zenith, smoothstep(0.46, 0.95, v));

  // Soft architectural studio softbox bands curving with fluid curvature
  float band1 = exp(-pow((dir.y - 0.34 + 0.18 * sin(dir.x * 2.1 + t * 0.45)) * 4.0, 2.0));
  float band2 = exp(-pow((dir.y + 0.26 + 0.16 * cos(dir.x * 2.4 - t * 0.38)) * 4.8, 2.0));

  // Slow traveling diagonal specular ribbon
  float sweepCoord = dir.x * 0.78 + dir.y * 0.48 - sin(t * 0.34) * 0.62 - ptr.x * 0.24;
  float sweepRibbon = exp(-pow(sweepCoord * 3.3, 2.0));

  vec3 col = base;
  col += vec3(0.98, 0.99, 1.00) * band1 * 0.48;
  col += vec3(0.72, 0.82, 0.94) * band2 * 0.28;
  col += vec3(1.00, 0.99, 0.98) * sweepRibbon * 0.36;
  return col;
}

// Smooth, seamless C-infinity multi-harmonic liquid wave & spatial gradient
vec3 computeFluidWave(vec2 p, float t, float motionScale) {
  float a1 = p.x * 2.9 + p.y * 2.2 + t * 0.95;
  float a2 = p.x * 4.4 - p.y * 3.1 - t * 0.72;
  float a3 = p.x * 1.7 + p.y * 5.2 + t * 0.58;
  float a4 = p.x * 6.1 - p.y * 4.7 + t * 1.18;

  float h = (
    sin(a1) * 0.40 +
    cos(a2) * 0.30 +
    sin(a3) * 0.20 +
    cos(a4) * 0.10
  ) * motionScale;

  float dHdx = (
    cos(a1) * 2.9 * 0.40 -
    sin(a2) * 4.4 * 0.30 +
    cos(a3) * 1.7 * 0.20 -
    sin(a4) * 6.1 * 0.10
  ) * motionScale;

  float dHdy = (
    cos(a1) * 2.2 * 0.40 +
    sin(a2) * 3.1 * 0.30 +
    cos(a3) * 5.2 * 0.20 +
    sin(a4) * 4.7 * 0.10
  ) * motionScale;

  return vec3(dHdx, dHdy, h);
}

// Evaluates organic immersed liquid shapes & beads orbiting along/through VAIURE
float sampleLiquidShapesSDF(vec2 p, float aspect, float t, float motionScale, float hover, vec2 ptr) {
  float halfW = aspect * 0.39;
  float minD = 10.0;

  // 6 smooth elliptical liquid beads gliding across the wordmark to form meniscus bridges
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float speed = 0.26 + mod(fi * 0.11, 0.24);
    float phase = fi * 1.37 + t * speed * motionScale;

    float cx = sin(phase * 0.85 + fi) * halfW + ptr.x * (0.04 * (mod(fi, 2.0) - 0.5));
    float cy = cos(phase * 1.35 + fi * 2.1) * 0.145 + sin(t * 0.52 * motionScale + fi) * 0.045;

    // Gentle breathing squash & stretch along flow velocity
    float stretch = 1.15 + 0.25 * sin(t * 0.9 * motionScale + fi * 1.9);
    vec2 q = p - vec2(cx, cy);
    q.x /= stretch;
    q.y *= stretch;

    float radius = (0.068 + 0.024 * sin(fi * 2.3 + t * 0.65 * motionScale)) * (1.0 + 0.14 * hover);
    float d = length(q) - radius;
    minD = smin(minD, d, 0.095);
  }

  // Secondary undulating liquid tide ribbon immersed behind/across the lower midline
  float ribbonWave = 0.055 * sin(p.x * 2.6 - t * 0.85 * motionScale)
                   + 0.030 * cos(p.x * 4.8 + t * 0.62 * motionScale);
  float ribbonMask = smoothstep(halfW * 1.06, halfW * 0.72, abs(p.x));
  float ribbonDist = abs(p.y - ribbonWave) - (0.030 + 0.016 * sin(p.x * 3.1 + t * 0.7 * motionScale));
  ribbonDist = mix(0.25, ribbonDist, ribbonMask);

  return smin(minD, ribbonDist, 0.085);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);

  // Analytical liquid wave field for internal currents & fluid surface deformation
  vec3 wave = computeFluidWave(p, uTime, uMotion);
  vec3 waveFine = computeFluidWave(p * 1.75 + vec2(0.4, -0.3), uTime * 1.18, uMotion);

  // Advected fluid UV warp so the liquid mass organically flows along letter curves
  vec2 flowDisp = vec2(wave.x * 0.0022 + waveFine.x * 0.0008, wave.y * 0.0028 + waveFine.y * 0.0011)
                * (0.85 + 0.45 * uHover) * uMotion;

  vec4 rawSample = texture2D(uGlyphMap, vUv);
  vec4 flowSample = texture2D(uGlyphMap, clamp(vUv + flowDisp, 0.0, 1.0));

  // Sharp core typography anchor guarantees crystal-clear VAIURE legibility
  float coreMask = rawSample.r;
  float flowedMask = flowSample.r;
  float thickness = mix(rawSample.g, flowSample.g, 0.65);
  float potential = flowSample.b; // Wide continuous liquid gravitational field

  // Immersed liquid shapes SDF interacting via smooth surface-tension meniscus with letters
  float shapesD = sampleLiquidShapesSDF(p, aspect, uTime, uMotion, uHover, uPointer) + wave.z * 0.011;
  // Calibrated zero-crossing right at the sculpted letter edge so typography stays sleek & crisp
  float letterFieldD = (0.58 - potential) * 0.40;
  // Surface tension bridges form organically where liquid shapes pass near letterforms
  float combinedFluidD = smin(letterFieldD, shapesD, 0.085);

  // Crisp meniscus around immersed liquid shapes & surface-tension necks
  float liquidMeniscusMask = smoothstep(0.018, -0.014, combinedFluidD);
  // Subtle organic fluid contour around flowed letters & detached floating liquid beads
  float outerBeadMask = smoothstep(0.016, -0.016, shapesD) * (1.0 - coreMask);
  float liquidSwellMask = max(flowedMask * 0.85, liquidMeniscusMask * (0.42 + 0.58 * smoothstep(0.18, 0.62, potential)));

  // Master silhouette combines crisp core typography with flowing immersed liquid shapes
  float silhouette = clamp(max(coreMask, max(liquidSwellMask * 0.90, outerBeadMask * 0.90)), 0.0, 1.0);

  // Extruded subtle volumetric depth shadow behind fluid & letters
  vec2 shadowUv = clamp(vUv - vec2(uTexel.x * 2.2, uTexel.y * 5.0), 0.0, 1.0);
  float depthShadow = texture2D(uGlyphMap, shadowUv).a;

  if (silhouette < 0.005 && depthShadow < 0.01) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Geometric bevel normal from letter thickness field
  float hL = texture2D(uGlyphMap, vUv + flowDisp - vec2(uTexel.x * 1.8, 0.0)).g;
  float hR = texture2D(uGlyphMap, vUv + flowDisp + vec2(uTexel.x * 1.8, 0.0)).g;
  float hU = texture2D(uGlyphMap, vUv + flowDisp - vec2(0.0, uTexel.y * 1.8)).g;
  float hD = texture2D(uGlyphMap, vUv + flowDisp + vec2(0.0, uTexel.y * 1.8)).g;
  vec2 letterBevelGrad = vec2(hL - hR, hD - hU) * 3.1;

  // Finite-difference surface normal of the immersed liquid metaball shapes
  float eps = 0.012;
  float sX1 = sampleLiquidShapesSDF(p + vec2(eps, 0.0), aspect, uTime, uMotion, uHover, uPointer);
  float sX0 = sampleLiquidShapesSDF(p - vec2(eps, 0.0), aspect, uTime, uMotion, uHover, uPointer);
  float sY1 = sampleLiquidShapesSDF(p + vec2(0.0, eps), aspect, uTime, uMotion, uHover, uPointer);
  float sY0 = sampleLiquidShapesSDF(p - vec2(0.0, eps), aspect, uTime, uMotion, uHover, uPointer);
  vec2 shapeGrad = vec2(sX0 - sX1, sY0 - sY1) / (2.0 * eps);
  float shapeSlopeWeight = smoothstep(0.05, -0.05, combinedFluidD) * 0.55;

  // Dynamic liquid wave normal perturbation stronger inside liquid bodies & ripples
  float interiorWeight = 0.35 + 0.65 * smoothstep(0.04, 0.62, max(thickness, liquidMeniscusMask * 0.7));
  float rippleStrength = (0.11 + 0.05 * uHover) * interiorWeight;

  vec3 N = normalize(vec3(
    letterBevelGrad.x * (0.75 + 0.25 * coreMask) + shapeGrad.x * shapeSlopeWeight + (wave.x + waveFine.x * 0.5) * rippleStrength,
    letterBevelGrad.y * (0.75 + 0.25 * coreMask) + shapeGrad.y * shapeSlopeWeight + (wave.y + waveFine.y * 0.5) * rippleStrength,
    0.70
  ));

  // View vector with subtle desktop pointer parallax tilt
  vec3 V = normalize(vec3(-uPointer.x * 0.16, uPointer.y * 0.13, 1.0));

  // Optical refraction with refined glass dispersion (subtle RGB chromatic separation)
  float opticalThickness = max(thickness, smoothstep(0.02, -0.06, combinedFluidD) * 0.82);
  vec2 refrBase = N.xy * (0.30 + 0.20 * opticalThickness) + vec2(wave.x, wave.y) * 0.018 * uMotion;
  float envR = sampleStudioEnv(refrBase * 0.94 + N.xy * 0.34, uTime, uPointer).r;
  float envG = sampleStudioEnv(refrBase * 1.00 + N.xy * 0.34, uTime, uPointer).g;
  float envB = sampleStudioEnv(refrBase * 1.06 + N.xy * 0.34, uTime, uPointer).b;
  vec3 refractedColor = vec3(envR, envG, envB);

  // Mirror-smooth Fresnel reflection
  vec3 R = reflect(-V, N);
  vec3 reflectedColor = sampleStudioEnv(R.xy * 0.88, uTime * 1.06, uPointer);

  float NdotV = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = pow(1.0 - NdotV, 2.5);

  // Orbiting studio key light + gentle cursor-reactive optical highlight
  float keyOrbit = uTime * 0.42;
  vec3 L1 = normalize(vec3(
    0.42 * cos(keyOrbit) + uPointer.x * 0.68,
    0.58 + 0.20 * sin(keyOrbit * 0.72) - uPointer.y * 0.48,
    0.90
  ));
  vec3 H1 = normalize(L1 + V);
  float specSharp = pow(max(dot(N, H1), 0.0), 82.0);
  float specSoft = pow(max(dot(N, H1), 0.0), 14.0);

  // Secondary opposing rim light carving liquid edges & droplet contours
  vec3 L2 = normalize(vec3(-0.65 - uPointer.x * 0.25, -0.44 + uPointer.y * 0.22, 0.70));
  vec3 H2 = normalize(L2 + V);
  float specRim = pow(max(dot(N, H2), 0.0), 28.0);

  // Internal liquid caustic ribbons flowing through letterforms and droplets
  float causticPattern = 0.5 + 0.5 * sin(p.x * 4.8 + wave.z * 2.4 - uTime * 0.78);
  float causticVeins = pow(causticPattern, 3.0) * (0.35 + 0.65 * opticalThickness);

  // Core crystal tint vs more translucent ethereal outer liquid beads
  vec3 letterCoreTint = mix(vec3(0.76, 0.84, 0.92), vec3(0.96, 0.98, 1.00), opticalThickness * 0.72 + 0.28 * NdotV);
  vec3 beadTint = mix(vec3(0.58, 0.68, 0.82), vec3(0.90, 0.95, 1.00), fresnel * 0.75 + 0.25 * NdotV);
  vec3 bodyTint = mix(beadTint, letterCoreTint, smoothstep(0.05, 0.65, coreMask));

  vec3 glassColor = mix(bodyTint * (0.64 + 0.36 * refractedColor), reflectedColor, 0.32 + 0.54 * fresnel);
  glassColor += vec3(0.90, 0.96, 1.00) * causticVeins * (0.20 + 0.10 * uHover);
  glassColor += vec3(1.00, 0.99, 0.98) * (specSharp * (0.76 + 0.24 * uHover) + specSoft * 0.24);
  glassColor += vec3(0.80, 0.90, 1.00) * specRim * 0.32;

  // Razor-crisp edge bevel rim on core letters + liquid meniscus tension ring
  float coreEdgeRim = smoothstep(0.02, 0.34, thickness) * (1.0 - smoothstep(0.34, 0.82, thickness));
  float meniscusRim = exp(-pow(combinedFluidD * 48.0, 2.0)) * 0.55;
  glassColor += vec3(0.96, 0.99, 1.00) * (fresnel * 0.38 + coreEdgeRim * 0.22 + meniscusRim * 0.35);
  glassColor = clamp(glassColor * (1.0 + 0.12 * uHover), 0.0, 1.0);

  // Translucent glass alpha: crisp high-opacity VAIURE letters + semi-translucent liquid shapes/beads
  float coreOpacity = coreMask * clamp(0.88 + fresnel * 0.10 + specSharp * 0.12, 0.86, 0.99);
  float outerLiquidOpacity = silhouette * clamp(0.42 + fresnel * 0.46 + (specSharp + meniscusRim) * 0.32, 0.0, 0.94);
  float glassAlpha = max(coreOpacity, outerLiquidOpacity);

  // Soft volumetric depth shadow underneath
  float shadowAlpha = clamp(depthShadow * (1.0 - silhouette) * 0.30, 0.0, 0.30);
  vec3 outsideRgb = vec3(0.02, 0.03, 0.05) * shadowAlpha;

  vec3 finalRgb = mix(outsideRgb, glassColor, clamp(silhouette * 1.12, 0.0, 1.0));
  float finalAlpha = clamp(max(glassAlpha, shadowAlpha), 0.0, 1.0);

  // Premultiplied alpha output
  gl_FragColor = vec4(finalRgb * finalAlpha, finalAlpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

interface GlyphMapTextureData {
  width: number;
  height: number;
  data: Uint8Array;
}

/**
 * Generates a 4-channel texture directly from measured DOM typography bounds:
 * R = crisp antialiased glyph alpha
 * G = multi-radius sculpted inner bevel dome
 * B = wide liquid gravitational potential field (for surface-tension metaball merging)
 * A = soft outer depth shadow field
 */
function buildGlyphMapData(
  boxes: GlyphBox[],
  totalWidth: number,
  totalHeight: number,
  padX: number,
  padY: number,
  fontString: string,
  renderScale: number
): GlyphMapTextureData | null {
  const w = Math.max(64, Math.round((totalWidth + padX * 2) * renderScale));
  const h = Math.max(32, Math.round((totalHeight + padY * 2) * renderScale));

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return null;

  maskCtx.clearRect(0, 0, w, h);
  maskCtx.save();
  maskCtx.scale(renderScale, renderScale);
  maskCtx.font = fontString;
  maskCtx.textAlign = 'center';
  maskCtx.textBaseline = 'middle';
  maskCtx.fillStyle = '#ffffff';

  for (const b of boxes) {
    maskCtx.fillText(b.char, padX + b.x + b.width * 0.5, padY + b.y + b.height * 0.52);
  }
  maskCtx.restore();

  // Inverted mask (opaque black outside letters, transparent inside letters)
  const invCanvas = document.createElement('canvas');
  invCanvas.width = w;
  invCanvas.height = h;
  const invCtx = invCanvas.getContext('2d');
  if (!invCtx) return null;

  invCtx.fillStyle = '#000000';
  invCtx.fillRect(0, 0, w, h);
  invCtx.globalCompositeOperation = 'destination-out';
  invCtx.drawImage(maskCanvas, 0, 0);
  invCtx.globalCompositeOperation = 'source-over';

  // 1) Multi-radius smooth inner bevel thickness field
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = w;
  heightCanvas.height = h;
  const hCtx = heightCanvas.getContext('2d');
  if (!hCtx) return null;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tCtx = tempCanvas.getContext('2d');
  if (!tCtx) return null;

  const radii = [1.4, 3.0, 6.2, 11.5].map((r) => Math.max(1, r * renderScale));
  hCtx.fillStyle = '#000000';
  hCtx.fillRect(0, 0, w, h);

  radii.forEach((blurRadius, idx) => {
    tCtx.clearRect(0, 0, w, h);
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, w, h);
    tCtx.save();
    tCtx.shadowColor = '#000000';
    tCtx.shadowBlur = blurRadius;
    tCtx.shadowOffsetX = 0;
    tCtx.shadowOffsetY = 0;
    tCtx.drawImage(invCanvas, 0, 0);
    tCtx.restore();

    tCtx.globalCompositeOperation = 'destination-in';
    tCtx.drawImage(maskCanvas, 0, 0);
    tCtx.globalCompositeOperation = 'source-over';

    hCtx.save();
    hCtx.globalAlpha = idx === 0 ? 0.34 : 0.22;
    hCtx.globalCompositeOperation = 'lighter';
    hCtx.drawImage(tempCanvas, 0, 0);
    hCtx.restore();
  });

  // 2) Wide continuous liquid gravitational potential field (spills organically outward for metaball merging)
  const potentialCanvas = document.createElement('canvas');
  potentialCanvas.width = w;
  potentialCanvas.height = h;
  const pCtx = potentialCanvas.getContext('2d');
  if (!pCtx) return null;

  pCtx.fillStyle = '#000000';
  pCtx.fillRect(0, 0, w, h);

  const potentialBlurs = [
    { r: 2.0, a: 0.42 },
    { r: 6.5, a: 0.34 },
    { r: 14.0, a: 0.28 },
    { r: 24.0, a: 0.22 },
  ];
  potentialBlurs.forEach(({ r, a }) => {
    pCtx.save();
    pCtx.globalAlpha = a;
    pCtx.globalCompositeOperation = 'lighter';
    pCtx.shadowColor = '#ffffff';
    pCtx.shadowBlur = Math.max(2, r * renderScale);
    pCtx.shadowOffsetX = 0;
    pCtx.shadowOffsetY = 0;
    pCtx.drawImage(maskCanvas, 0, 0);
    pCtx.restore();
  });

  // 3) Outer depth shadow halo
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = w;
  haloCanvas.height = h;
  const haloCtx = haloCanvas.getContext('2d');
  if (!haloCtx) return null;

  haloCtx.clearRect(0, 0, w, h);
  haloCtx.save();
  haloCtx.shadowColor = '#ffffff';
  haloCtx.shadowBlur = Math.max(4, 10 * renderScale);
  haloCtx.shadowOffsetX = 0;
  haloCtx.shadowOffsetY = 0;
  haloCtx.drawImage(maskCanvas, 0, 0);
  haloCtx.restore();

  const maskData = maskCtx.getImageData(0, 0, w, h).data;
  const heightData = hCtx.getImageData(0, 0, w, h).data;
  const potentialData = pCtx.getImageData(0, 0, w, h).data;
  const haloData = haloCtx.getImageData(0, 0, w, h).data;

  const out = new Uint8Array(w * h * 4);
  const len = w * h * 4;

  for (let i = 0; i < len; i += 4) {
    out[i] = maskData[i + 3]; // R: sharp antialiased letter silhouette
    out[i + 1] = heightData[i]; // G: inner sculpted bevel dome
    out[i + 2] = potentialData[i]; // B: wide fluid potential field
    out[i + 3] = haloData[i + 3]; // A: outer depth shadow
  }

  return { width: w, height: h, data: out };
}

export const LiquidGlassWordmark: React.FC<LiquidGlassWordmarkProps> = ({
  isActive = true,
  isHovered = false,
  onPointerEnter,
  onPointerLeave,
}) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [webglReady, setWebglReady] = useState(false);
  const [padCss, setPadCss] = useState<{ x: number; y: number }>({ x: 26, y: 20 });

  // Animation & interaction mutable refs (zero React re-renders per frame)
  const isHoveredRef = useRef(isHovered);
  isHoveredRef.current = isHovered;

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const isInViewRef = useRef(true);
  const pointerTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerSmoothRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverSmoothRef = useRef(0);
  const reducedMotionRef = useRef(false);

  const glStateRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    texture: WebGLTexture | null;
    uTexel: WebGLUniformLocation | null;
    uResolution: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
    uPointer: WebGLUniformLocation | null;
    uHover: WebGLUniformLocation | null;
    uMotion: WebGLUniformLocation | null;
    uGlyphMap: WebGLUniformLocation | null;
    texW: number;
    texH: number;
    renderFrame: (timeSec: number) => void;
  } | null>(null);

  // Sync reduced motion media query
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Track coarse/touch device capability and gentle desktop pointer lighting
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
    if (isCoarsePointer) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!isActiveRef.current || reducedMotionRef.current) return;
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      // Normalized -1..1 clamped gently around hero center
      const nx = Math.max(-1, Math.min(1, (e.clientX / vw - 0.5) * 2));
      const ny = Math.max(-1, Math.min(1, (e.clientY / vh - 0.5) * 2));
      pointerTargetRef.current.x = nx;
      pointerTargetRef.current.y = ny;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // Observe container visibility so WebGL pauses when scrolled/hidden
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        isInViewRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Initialize WebGL pipeline + context loss recovery + glyph heightmap sync
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || typeof window === 'undefined') return;

    let disposed = false;
    let rafId = 0;
    let startTimeMs = performance.now();

    // Hardware-aware pixel density cap for smooth 60 FPS
    const cores = navigator.hardwareConcurrency || 4;
    const devMem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    const maxDpr = cores >= 6 && devMem >= 4 ? 2.0 : 1.5;

    const initWebGL = (): boolean => {
      const gl =
        (canvas.getContext('webgl', {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: true,
          powerPreference: 'high-performance',
        }) as WebGLRenderingContext | null) ||
        (canvas.getContext('experimental-webgl', {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: true,
        }) as WebGLRenderingContext | null);

      if (!gl) return false;

      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      if (!vs || !fs) {
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
        return false;
      }

      const program = gl.createProgram();
      if (!program) return false;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return false;
      }

      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );

      const aPos = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);

      const uGlyphMap = gl.getUniformLocation(program, 'uGlyphMap');
      const uTexel = gl.getUniformLocation(program, 'uTexel');
      const uResolution = gl.getUniformLocation(program, 'uResolution');
      const uTime = gl.getUniformLocation(program, 'uTime');
      const uPointer = gl.getUniformLocation(program, 'uPointer');
      const uHover = gl.getUniformLocation(program, 'uHover');
      const uMotion = gl.getUniformLocation(program, 'uMotion');

      const state = {
        gl,
        program,
        texture,
        uTexel,
        uResolution,
        uTime,
        uPointer,
        uHover,
        uMotion,
        uGlyphMap,
        texW: 1,
        texH: 1,
        renderFrame: (timeSec: number) => {
          if (!state.texture || gl.isContextLost()) return;
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(program);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, state.texture);
          gl.uniform1i(uGlyphMap, 0);
          gl.uniform2f(uTexel, 1 / state.texW, 1 / state.texH);
          gl.uniform2f(uResolution, canvas.width, canvas.height);
          gl.uniform1f(uTime, timeSec);
          gl.uniform2f(uPointer, pointerSmoothRef.current.x, pointerSmoothRef.current.y);
          gl.uniform1f(uHover, hoverSmoothRef.current);
          gl.uniform1f(uMotion, reducedMotionRef.current ? 0.0 : 1.0);

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        },
      };

      glStateRef.current = state;
      return true;
    };

    const rebuildGlyphTexture = () => {
      if (disposed) return;
      const state = glStateRef.current;
      if (!state || state.gl.isContextLost()) return;

      const wordW = container.offsetWidth;
      const wordH = container.offsetHeight;
      if (wordW <= 2 || wordH <= 2) return;

      const computed = window.getComputedStyle(container);
      const fontSizePx = parseFloat(computed.fontSize) || 46;
      const fontWeight = computed.fontWeight || '400';
      const fontFamily = computed.fontFamily || '"Plus Jakarta Sans", sans-serif';
      const fontString = `${fontWeight} ${fontSizePx}px ${fontFamily}`;

      const padX = Math.max(28, Math.round(fontSizePx * 0.86));
      const padY = Math.max(24, Math.round(fontSizePx * 0.68));
      setPadCss({ x: padX, y: padY });

      const boxes: GlyphBox[] = LETTERS.map((item, i) => {
        const el = charRefs.current[i];
        return {
          char: item.char,
          x: el ? el.offsetLeft : (wordW / LETTERS.length) * i,
          y: el ? el.offsetTop : 0,
          width: el ? el.offsetWidth : wordW / LETTERS.length,
          height: el ? el.offsetHeight : wordH,
        };
      });

      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const canvasW = Math.round((wordW + padX * 2) * dpr);
      const canvasH = Math.round((wordH + padY * 2) * dpr);

      if (canvas.width !== canvasW || canvas.height !== canvasH) {
        canvas.width = canvasW;
        canvas.height = canvasH;
      }

      // Supersampled texture scale capped nicely for crisp crystal edges & minimal memory
      const texScale = Math.min(2.5, Math.max(1.5, dpr * (fontSizePx < 36 ? 1.6 : 1.25)));
      const packed = buildGlyphMapData(boxes, wordW, wordH, padX, padY, fontString, texScale);
      if (!packed) return;

      const { gl, texture } = state;
      if (!texture) return;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        packed.width,
        packed.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        packed.data
      );

      state.texW = packed.width;
      state.texH = packed.height;

      setWebglReady(true);
      state.renderFrame((performance.now() - startTimeMs) * 0.001);
    };

    const ok = initWebGL();
    if (!ok) {
      setWebglReady(false);
      return;
    }

    // Wait for display font metrics & viewport scale tokens, then bake crisply
    rebuildGlyphTexture();
    const mountBakeRaf = requestAnimationFrame(() => {
      if (!disposed) rebuildGlyphTexture();
    });
    const handleFontsDone = () => {
      if (!disposed) rebuildGlyphTexture();
    };
    document.fonts?.ready.then(handleFontsDone);
    document.fonts?.addEventListener?.('loadingdone', handleFontsDone);

    // ResizeObserver for crisp responsive adaptation across desktop, tablet & mobile
    let resizeTimer = 0;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
              rebuildGlyphTexture();
            }, 60);
          })
        : null;
    ro?.observe(container);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglReady(false);
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const handleContextRestored = () => {
      if (disposed) return;
      if (initWebGL()) {
        rebuildGlyphTexture();
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const tick = (now: number) => {
      if (disposed) return;
      rafId = requestAnimationFrame(tick);

      if (
        !isActiveRef.current ||
        !isInViewRef.current ||
        document.visibilityState === 'hidden' ||
        reducedMotionRef.current
      ) {
        return;
      }

      // Smooth exponential damping on pointer & hover energy
      pointerSmoothRef.current.x += (pointerTargetRef.current.x - pointerSmoothRef.current.x) * 0.08;
      pointerSmoothRef.current.y += (pointerTargetRef.current.y - pointerSmoothRef.current.y) * 0.08;

      const hoverTarget = isHoveredRef.current ? 1 : 0;
      hoverSmoothRef.current += (hoverTarget - hoverSmoothRef.current) * 0.08;

      const tSec = (now - startTimeMs) * 0.001;
      glStateRef.current?.renderFrame(tSec);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(mountBakeRaf);
      window.clearTimeout(resizeTimer);
      if (rafId) cancelAnimationFrame(rafId);
      ro?.disconnect();
      document.fonts?.removeEventListener?.('loadingdone', handleFontsDone);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      const st = glStateRef.current;
      if (st) {
        try {
          if (st.texture) st.gl.deleteTexture(st.texture);
          st.gl.deleteProgram(st.program);
        } catch {}
        glStateRef.current = null;
      }
    };
  }, []);

  // Re-render static frame immediately if reduced-motion or active visibility toggles back on
  useEffect(() => {
    if (isActive && glStateRef.current && webglReady) {
      glStateRef.current.renderFrame(0);
    }
  }, [isActive, webglReady]);

  return (
    <h1 className="title" aria-label="VAIURE">
      <span
        className="title-interactive"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <span
          ref={containerRef}
          className={`title-kinetic ${webglReady ? 'is-liquid-webgl' : 'is-liquid-fallback'}`}
        >
          {/* Real-time WebGL Liquid Glass Surface */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="title-liquid-canvas"
            style={{
              left: `-${padCss.x}px`,
              top: `-${padCss.y}px`,
              width: `calc(100% + ${padCss.x * 2}px)`,
              height: `calc(100% + ${padCss.y * 2}px)`,
            }}
          />

          {/* Accessible & Selectable Semantic Lettering (aligned 1:1 with WebGL geometry) */}
          {LETTERS.map((item, i) => (
            <span
              key={item.char}
              ref={(el) => {
                charRefs.current[i] = el;
              }}
              className="title-char"
              aria-hidden="true"
              style={{
                ['--k' as string]: item.k,
                ['--char-idx' as string]: item.idx,
              }}
            >
              {item.char}
            </span>
          ))}
        </span>
      </span>
    </h1>
  );
};
