import { useEffect, useRef } from "react";
import { heatShaderConfig, type HeatShaderConfig } from "@/lib/heatShaderConfig";

type HeatShaderProps = Partial<HeatShaderConfig> & {
  className?: string;
};

const VERT = `
  attribute vec2 p;
  void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
  precision highp float;

  uniform vec2 R, M, TS;
  uniform float T, H;
  uniform sampler2D tx;
  uniform vec3 C0, C1, C2, C3, C4, C5, C6, C7;

  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float n(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + 1.0), f.x), f.y);
  }

  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 5; i++){
      v += a * n(p);
      p = p * 2.03 + 7.1;
      a *= 0.5;
    }
    return v;
  }

  vec3 heat(float x){
    x = clamp(x, 0.0, 1.0);
    vec3 c = mix(C0, C1, smoothstep(0.0, 0.14, x));
    c = mix(c, C2, smoothstep(0.12, 0.3, x));
    c = mix(c, C3, smoothstep(0.28, 0.46, x));
    c = mix(c, C4, smoothstep(0.44, 0.6, x));
    c = mix(c, C5, smoothstep(0.58, 0.72, x));
    c = mix(c, C6, smoothstep(0.7, 0.86, x));
    c = mix(c, C7, smoothstep(0.84, 0.98, x));
    return c;
  }

  float field(vec2 p, float t){
    vec2 q = p;
    q += 0.7 * vec2(fbm(q * 0.9 + vec2(0.0, t * 0.12)), fbm(q * 0.9 + vec2(5.2, -t * 0.1)));
    q += 0.5 * vec2(fbm(q * 1.4 - t * 0.08), fbm(q * 1.4 + 3.3 + t * 0.07));
    float v = sin((q.x * 3.2 + q.y * 1.1) * 1.6 + fbm(q * 2.0) * 2.5 - t * 0.25);
    return pow(smoothstep(-0.9, 1.0, v), 1.6);
  }

  vec4 ph(vec2 fc){
    vec2 s = min(R.x / TS.x, R.y / TS.y) * TS;
    vec2 u = (fc - R * 0.5) / s + 0.5;
    if(u.x < 0.0 || u.x > 1.0 || u.y < 0.0 || u.y > 1.0) return vec4(0.0);
    return texture2D(tx, u);
  }

  void main(){
    vec2 fc = gl_FragCoord.xy, uv = fc / R, asp = vec2(R.x / R.y, 1.0);
    vec2 p = (uv - 0.5) * asp * 1.5;

    float f = field(p, T);
    vec3 col = heat(f * (0.55 + 0.5 * H)) * (0.9 + 0.1 * H);
    col *= smoothstep(1.35, 0.2, length(uv - 0.5) * 1.2);

    vec2 mu = M / R;
    float prox = smoothstep(0.45, 0.0, length((uv - mu) * asp));
    vec2 w = vec2(fbm(uv * 7.0 + vec2(0.0, T * 0.5)), fbm(uv * 7.0 - T * 0.4 + 4.0)) - 0.5;
    float amt = (0.004 + 0.012 * H) * (1.0 + prox * 3.0);
    vec2 d = w * amt * R.y;

    float ab = (2.0 + 6.0 * prox) * H;
    vec4 a0 = ph(fc + d);
    vec3 pc = vec3(ph(fc + d + vec2(ab, 0.0)).r, a0.g, ph(fc + d - vec2(ab, 0.0)).b);
    float a = a0.a;

    float l = dot(pc, vec3(0.3, 0.59, 0.11));
    float g = 0.0;
    for(int i = 0; i < 12; i++){
      float an = float(i) * 0.5236;
      g += ph(fc + d + vec2(cos(an), sin(an)) * (14.0 + 8.0 * H)).a;
      g += ph(fc + d + vec2(cos(an), sin(an)) * 34.0).a * 0.6;
    }
    g /= 19.2;

    float rim = clamp(g - a * 0.6, 0.0, 1.0);
    float ht = l * 0.9 + fbm(uv * 5.0 - T * 0.3) * 0.35 * H + f * 0.2;
    vec3 hc = heat(ht * (0.5 + 0.6 * H) + rim * 0.4);
    vec3 gradedP = mix(pc, hc, 0.55 * H) + hc * rim * 0.9 * H + pow(l, 3.0) * vec3(1.0, 0.7, 0.4) * 0.35 * H;

    col += heat(0.35 + f * 0.5) * rim * (0.8 + H) * (1.0 - a) * 0.9;
    col = mix(col, gradedP, a);
    col += (h(fc + T) - 0.5) * 0.14;
    col = pow(col, vec3(0.95));

    gl_FragColor = vec4(col, 1.0);
  }
`;

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

export default function HeatShader({
  className = "",
  imageSrc = heatShaderConfig.imageSrc,
  label = heatShaderConfig.label,
  title = heatShaderConfig.title,
  heat = heatShaderConfig.heat,
  palette = heatShaderConfig.palette
}: HeatShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleProbeRef = useRef<HTMLSpanElement>(null);
  const labelProbeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
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
    const posLoc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      res: gl.getUniformLocation(program, "R"),
      mouse: gl.getUniformLocation(program, "M"),
      texSize: gl.getUniformLocation(program, "TS"),
      time: gl.getUniformLocation(program, "T"),
      heat: gl.getUniformLocation(program, "H"),
      texture: gl.getUniformLocation(program, "tx"),
      palette: ["C0", "C1", "C2", "C3", "C4", "C5", "C6", "C7"].map((name) =>
        gl.getUniformLocation(program, name)
      )
    };

    uniforms.palette.forEach((location, index) => {
      const color = palette[index] ?? palette[palette.length - 1];
      if (location && color) gl.uniform3fv(location, hexToRgb(color));
    });

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(uniforms.texture, 0);

    const TEX_W = 1600;
    const TEX_H = 900;
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = TEX_W;
    textureCanvas.height = TEX_H;
    const textureCtx = textureCanvas.getContext("2d");
    if (!textureCtx) return;

    let loadedImage: HTMLImageElement | null = null;
    let disposed = false;

    const compose = () => {
      if (!textureCtx) return;
      const titleFamily = titleProbeRef.current
        ? getComputedStyle(titleProbeRef.current).fontFamily
        : "Impact, 'Arial Black', sans-serif";
      const labelFamily = labelProbeRef.current
        ? getComputedStyle(labelProbeRef.current).fontFamily
        : "ui-monospace, monospace";

      textureCtx.clearRect(0, 0, TEX_W, TEX_H);
      textureCtx.textAlign = "left";
      textureCtx.textBaseline = "top";
      textureCtx.fillStyle = "#fff";

      const spacingCtx = textureCtx as CanvasRenderingContext2D & { letterSpacing?: string };
      if ("letterSpacing" in textureCtx) spacingCtx.letterSpacing = "0.22em";

      textureCtx.font = `700 28px ${labelFamily}`;
      textureCtx.fillText(label.toUpperCase(), 74, 54);

      textureCtx.fillStyle = "#c9a24a";
      textureCtx.fillRect(74, 94, 88, 2);
      textureCtx.fillStyle = "#fff";

      if ("letterSpacing" in textureCtx) spacingCtx.letterSpacing = "0em";

      textureCtx.font = `400 100px ${titleFamily}`;
      const titleWidth = textureCtx.measureText(title.toUpperCase()).width;
      const titleSize = Math.min(230, (TEX_W * 0.62 * 100) / Math.max(titleWidth, 1));
      textureCtx.font = `400 ${titleSize}px ${titleFamily}`;
      textureCtx.fillText(title.toUpperCase(), 66, 118);

      if (loadedImage) {
        const maxW = TEX_W * 0.36;
        const maxH = TEX_H - 380;
        const scale = Math.min(maxW / loadedImage.width, maxH / loadedImage.height);
        const w = loadedImage.width * scale;
        const h = loadedImage.height * scale;
        textureCtx.drawImage(loadedImage, TEX_W - w - 56, TEX_H - h - 20, w, h);
      } else {
        textureCtx.fillStyle = "#14121a";
        textureCtx.beginPath();
        textureCtx.ellipse(TEX_W * 0.76, TEX_H * 0.44, 92, 112, 0, 0, 7);
        textureCtx.fill();
        textureCtx.beginPath();
        textureCtx.ellipse(TEX_W * 0.76, TEX_H * 0.84, 210, 340, 0, 0, 7);
        textureCtx.fill();
        textureCtx.fillStyle = "#8a8794";
        textureCtx.beginPath();
        textureCtx.ellipse(TEX_W * 0.76 - 38, TEX_H * 0.39, 20, 28, 0, 0, 7);
        textureCtx.fill();
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
    };

    compose();

    const image = imageSrc ? new window.Image() : null;
    if (image) {
      image.onload = () => {
        if (disposed) return;
        loadedImage = image;
        compose();
      };
      image.src = imageSrc;
    }

    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (!disposed) compose();
      });
    }

    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      pointerX = (event.clientX - rect.left) * scaleX;
      pointerY = (rect.bottom - event.clientY) * scaleY;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let raf = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (!pointerX && !pointerY) {
        pointerX = canvas.width / 2;
        pointerY = canvas.height / 2;
      }
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { rootMargin: "160px" });
    visibility.observe(canvas);

    const frame = (now: number) => {
      if (disposed) return;
      if (visible) {
        gl.uniform2f(uniforms.res, canvas.width, canvas.height);
        gl.uniform2f(uniforms.mouse, pointerX, pointerY);
        gl.uniform2f(uniforms.texSize, TEX_W, TEX_H);
        gl.uniform1f(uniforms.time, now * 0.001);
        gl.uniform1f(uniforms.heat, heat);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      if (image) image.onload = null;
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [heat, imageSrc, label, palette, title]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <canvas ref={canvasRef} aria-hidden='true' className='block h-full w-full' />
      <span ref={titleProbeRef} aria-hidden='true' className='jj-display sr-only'>
        NYAWIT LU
      </span>
      <span ref={labelProbeRef} aria-hidden='true' className='jj-mono sr-only'>
        HUMAI
      </span>
    </div>
  );
}
