import { useEffect, useRef } from "react";
import { meltingTextConfig, meltingThemes, type MeltingTheme } from "@/lib/meltingTextConfig";

type MeltingTextProps = {
  lines: string[];
  theme?: MeltingTheme;
  className?: string;
};

const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main(){
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }`;

const FRAG = `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform vec2  uRes;
  uniform vec2  uMouse;
  uniform float uTime;
  uniform float uMelt;
  uniform float uWarp;
  uniform float uBend;
  uniform float uGrain;
  uniform vec3  uLo;
  uniform vec3  uMi;
  uniform vec3  uHi;
  uniform vec3  uOl;

  float hash(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 3; i++){
      v += a * noise(p);
      p = p * 2.03 + 1.7;
      a *= 0.5;
    }
    return v / 0.875;
  }

  float tex(vec2 uv){ return texture2D(uTex, uv).r; }

  vec2 warp(vec2 uv, vec2 mT){
    float aspect = uRes.x / uRes.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    float t = uTime * 0.35;

    p.y -= uBend * p.x * p.x * 2.0;

    p.x += sin(p.y * 9.0 + t * 1.7) * 0.028 * uWarp;
    p.y += sin(p.x * 7.0 - t * 1.3) * 0.028 * uWarp;

    vec2 n = vec2(
      fbm(p * 2.5 + vec2(t, 0.0)),
      fbm(p * 2.5 + vec2(0.0, t) + 5.2)
    ) - 0.5;
    p += n * 0.12 * uWarp;

    vec2 dm = p - mT;
    float k = exp(-dot(dm, dm) * 18.0);
    p -= dm * k * 0.55;

    return p / vec2(aspect, 1.0) + 0.5;
  }

  vec3 pal(float d, vec3 lo, vec3 mi, vec3 hi){
    vec3 c = mix(lo, mi, smoothstep(0.0, 0.45, d));
    c = mix(c, hi, smoothstep(0.4, 0.9, d));
    return mix(c, vec3(1.0), smoothstep(0.92, 1.0, d) * 0.5);
  }

  void main(){
    float aspect = uRes.x / uRes.y;
    vec2 mT = (uMouse - 0.5) * vec2(aspect, 1.0);

    vec2 uv = warp(vUv, mT);
    float mask = tex(uv);

    float t = uTime;
    float f  = fbm(vec2(uv.x * 10.0, t * 0.12));
    float f2 = fbm(vec2(uv.x * 28.0 + 9.0, t * 0.2));
    float len = uMelt * (0.9 + 0.1 * sin(t * 0.8)) * (0.04 + 0.75 * f * f + 0.12 * f2);

    float drip = 0.0;
    for(int i = 0; i < 40; i++){
      float k = float(i) / 39.0;
      float off = k * len;
      vec2 q = uv + vec2(sin(off * 38.0 + t * 1.2) * 0.006 * k, off);
      drip = max(drip, tex(q) * pow(1.0 - k, 1.6));
    }

    float glow = 0.0;
    for(int i = 0; i < 8; i++){
      float a = float(i) * 0.7854;
      vec2 d = vec2(cos(a), sin(a));
      glow += tex(uv + d * 0.012) + tex(uv + d * 0.03);
    }
    glow /= 16.0;

    float er = mask;
    for(int i = 0; i < 8; i++){
      float a = float(i) * 0.7854;
      er = min(er, tex(uv + vec2(cos(a), sin(a)) * 0.0045));
    }
    float outline = clamp(mask - er, 0.0, 1.0);
    float inside = smoothstep(0.4, 0.7, mask);

    vec3 lo = uLo;
    vec3 mi = uMi;
    vec3 hi = uHi;
    vec3 ol = uOl;

    vec3 col = mix(lo, mi, smoothstep(0.0, 0.6, mask));
    col = mix(col, hi, smoothstep(0.7, 1.0, mask) * 0.35);

    vec3 dripCol = pal(drip, lo, mi, hi);
    col = mix(col, dripCol, smoothstep(0.2, 0.85, drip) * (1.0 - inside * 0.75));
    col += lo * glow * 1.4 * (1.0 - inside);
    col += hi * outline * 0.9;
    col = mix(col, ol, outline * 0.25);

    float grain = hash(gl_FragCoord.xy + floor(uTime * 24.0) * 17.3) - 0.5;
    col += grain * 0.08 * uGrain;

    float alpha = clamp(max(mask, max(drip * 0.95, glow * 0.8)) + outline * 0.3, 0.0, 1.0);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), alpha);
  }`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value.padEnd(6, "0").slice(0, 6);
  const int = parseInt(full, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

function loadGoogleFont(family: string) {
  return new Promise<void>((resolve) => {
    const id = `melting-font-${family.replace(/\s+/g, "-").toLowerCase()}`;
    const existing = document.getElementById(id);
    if (existing) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}&display=swap`;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

function resolveFontFamily(value: string, probe: HTMLElement) {
  if (!value) return getComputedStyle(probe).fontFamily || "Impact, sans-serif";
  const variable = value.match(/^var\((--[^)]+)\)$/);
  if (variable) {
    const resolved = getComputedStyle(probe).getPropertyValue(variable[1]).trim();
    if (resolved) return resolved;
  }
  return value;
}

export default function MeltingText({ lines, theme, className = "" }: MeltingTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const themeRef = useRef<MeltingTheme>(theme ?? meltingTextConfig.theme);

  useEffect(() => {
    themeRef.current = theme ?? meltingTextConfig.theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const probe = probeRef.current;
    if (!canvas || !probe) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false
    });
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    ["uTex", "uRes", "uMouse", "uTime", "uMelt", "uWarp", "uBend", "uGrain", "uLo", "uMi", "uHi", "uOl"].forEach((name) => {
      uniforms[name] = gl.getUniformLocation(program, name);
    });

    const initialPalette = meltingTextConfig.palette ?? meltingThemes[themeRef.current];
    const currentPalette = {
      lo: hexToRgb(initialPalette.low),
      mi: hexToRgb(initialPalette.mid),
      hi: hexToRgb(initialPalette.high),
      ol: hexToRgb(initialPalette.outline)
    };

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(uniforms.uTex, 0);

    const textCanvas = document.createElement("canvas");
    const textCtx = textCanvas.getContext("2d");
    if (!textCtx) return;

    let disposed = false;
    let raf = 0;
    let width = 0;
    let height = 0;

    const getFamily = () => {
      const fontConfig = meltingTextConfig.font;
      if (fontConfig.family) return resolveFontFamily(fontConfig.family, probe);
      const fallback = getComputedStyle(probe).fontFamily || "Impact, sans-serif";
      return fontConfig.googleFont ? `"${fontConfig.googleFont}", ${fallback}` : fallback;
    };

    const drawText = () => {
      if (disposed || !width || !height) return;

      const aspect = width / height;
      const texWidth = 1600;
      const texHeight = Math.max(360, Math.round(texWidth / aspect));
      textCanvas.width = texWidth;
      textCanvas.height = texHeight;

      textCtx.fillStyle = "#000";
      textCtx.fillRect(0, 0, texWidth, texHeight);
      textCtx.fillStyle = "#fff";
      textCtx.textAlign = "center";
      textCtx.textBaseline = "middle";

      const fontConfig = meltingTextConfig.font;
      const family = getFamily();
      const source = meltingTextConfig.lines ?? lines;
      const rows = source
        .map((line) => (fontConfig.uppercase ? line.trim().toUpperCase() : line.trim()))
        .filter(Boolean);
      if (!rows.length) rows.push("MAKE A PLAY");

      const spacingCtx = textCtx as CanvasRenderingContext2D & { letterSpacing?: string };
      if ("letterSpacing" in textCtx) spacingCtx.letterSpacing = `${fontConfig.letterSpacing}px`;

      textCtx.font = `${fontConfig.weight} 100px ${family}`;
      const widest = Math.max(...rows.map((row) => textCtx.measureText(row).width), 1);
      const widthLimit = (texWidth * 0.9 * 100) / widest;
      const heightLimit = (texHeight * 0.62) / (rows.length * Math.max(fontConfig.lineHeight, 0.5));
      const fontSize = Math.min(widthLimit, heightLimit);

      textCtx.font = `${fontConfig.weight} ${fontSize}px ${family}`;
      const lineHeight = fontSize * fontConfig.lineHeight;
      const centerY = texHeight * 0.38;
      rows.forEach((row, index) => {
        textCtx.fillText(row, texWidth / 2, centerY + (index - (rows.length - 1) / 2) * lineHeight);
      });

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      drawText();
    };

    const pointer = { x: -10, y: -10, tx: -10, ty: -10 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.tx = (event.clientX - rect.left) / rect.width;
      pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
      if (pointer.x < -5) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
    };
    const onPointerLeave = () => {
      pointer.tx = -10;
      pointer.ty = -10;
    };

    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const prepareFont = async () => {
      const fontConfig = meltingTextConfig.font;
      if (fontConfig.googleFont) await loadGoogleFont(fontConfig.googleFont);
      const family = getFamily();
      if (document.fonts) {
        await document.fonts.load(`${fontConfig.weight} 100px ${family}`).catch(() => {});
      }
      drawText();
    };
    prepareFont();

    const started = performance.now();
    let last = started;
    const frame = (now: number) => {
      if (disposed) return;
      const t = (now - started) / 1000;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;

      const target = meltingTextConfig.palette ?? meltingThemes[themeRef.current];
      const targetLo = hexToRgb(target.low);
      const targetMi = hexToRgb(target.mid);
      const targetHi = hexToRgb(target.high);
      const targetOl = hexToRgb(target.outline);
      const mix = 1 - Math.exp(-5 * dt);

      for (let i = 0; i < 3; i++) {
        currentPalette.lo[i] += (targetLo[i] - currentPalette.lo[i]) * mix;
        currentPalette.mi[i] += (targetMi[i] - currentPalette.mi[i]) * mix;
        currentPalette.hi[i] += (targetHi[i] - currentPalette.hi[i]) * mix;
        currentPalette.ol[i] += (targetOl[i] - currentPalette.ol[i]) * mix;
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.uRes, width, height);
      gl.uniform2f(uniforms.uMouse, pointer.x, pointer.y);
      gl.uniform1f(uniforms.uTime, t);
      gl.uniform1f(uniforms.uMelt, meltingTextConfig.melt + Math.sin(t * 0.6) * meltingTextConfig.meltPulse);
      gl.uniform1f(uniforms.uWarp, meltingTextConfig.warp);
      gl.uniform1f(uniforms.uBend, meltingTextConfig.bend);
      gl.uniform1f(uniforms.uGrain, meltingTextConfig.grain);
      gl.uniform3fv(uniforms.uLo, currentPalette.lo);
      gl.uniform3fv(uniforms.uMi, currentPalette.mi);
      gl.uniform3fv(uniforms.uHi, currentPalette.hi);
      gl.uniform3fv(uniforms.uOl, currentPalette.ol);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [lines]);

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} aria-hidden='true' className='block h-full w-full touch-pan-y' />
      <span ref={probeRef} aria-hidden='true' className='jj-display sr-only'></span>
    </div>
  );
}
