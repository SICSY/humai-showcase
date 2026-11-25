import { useEffect, useRef } from "react";
import { useQualityTier } from "@/hooks/useQualityTier";

const VERT = `
  attribute vec2 p;
  void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

function buildFragmentShader(octaves: number) {
  return `
  precision highp float;

  uniform vec2 R, M;
  uniform float T;

  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float n(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + 1.0), f.x), f.y);
  }

  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i = 0; i < ${octaves}; i++){
      v += a * n(p);
      p = p * 2.02 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy / R;
    vec2 asp = vec2(R.x / R.y, 1.0);
    vec2 p = (uv - 0.5) * asp;
    float t = T * 0.06;

    vec2 q = p * 1.7;
    q += 0.55 * vec2(fbm(q * 0.8 + vec2(0.0, t)), fbm(q * 0.8 + vec2(3.1, -t)));
    q += 0.32 * vec2(fbm(q * 1.5 - t * 0.6), fbm(q * 1.5 + 2.4 + t * 0.5));
    float field = fbm(q * 1.3 + 0.4 * vec2(fbm(q + t), fbm(q - t + 2.0)));

    float ribbon = smoothstep(0.34, 0.96, sin(p.x * 2.4 + field * 2.3 + t * 1.5));
    float ribbon2 = smoothstep(0.42, 1.0, sin(p.y * 3.1 - field * 1.9 - t * 1.1 + 1.5));

    vec3 base = vec3(0.018, 0.030, 0.075);
    vec3 purple = vec3(0.294, 0.188, 0.800);
    vec3 violet = vec3(0.616, 0.447, 1.000);
    vec3 gold = vec3(0.949, 0.780, 0.400);
    vec3 cyan = vec3(0.020, 0.850, 0.850);

    vec3 col = base;
    col += purple * field * 0.62;
    col += violet * pow(field, 2.0) * 0.34;
    col = mix(col, purple * 0.9, ribbon * 0.18);
    col = mix(col, cyan * 0.8, ribbon2 * 0.05);
    col += gold * pow(max(0.0, field - 0.56), 2.0) * 1.15;

    vec2 m = M / R;
    float prox = smoothstep(0.42, 0.0, length((uv - m) * asp));
    col += violet * prox * 0.09;

    col *= smoothstep(1.28, 0.12, length(uv - 0.5) * 1.12);
    col += (h(gl_FragCoord.xy + T) - 0.5) * 0.024;

    gl_FragColor = vec4(col, 1.0);
  }`;
}

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

export default function FoundationShader({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tier = useQualityTier();

  useEffect(() => {
    if (tier === "low") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, buildFragmentShader(4));
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

    const uRes = gl.getUniformLocation(program, "R");
    const uMouse = gl.getUniformLocation(program, "M");
    const uTime = gl.getUniformLocation(program, "T");

    let pointerX = 0;
    let pointerY = 0;
    let hasPointer = false;
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerX = ((event.clientX - rect.left) / rect.width) * canvas.width;
      pointerY = (1 - (event.clientY - rect.top) / rect.height) * canvas.height;
      hasPointer = true;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let raf = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (!hasPointer) {
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

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frame = (now: number) => {
      if (visible) {
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform2f(uMouse, pointerX, pointerY);
        gl.uniform1f(uTime, reduced ? 12 : now * 0.001);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [tier]);

  if (tier === "low") {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        <div
          aria-hidden='true'
          className='absolute inset-0'
          style={{
            background:
              "radial-gradient(80% 60% at 25% 20%, rgba(75,48,204,0.6) 0%, transparent 62%), radial-gradient(70% 55% at 78% 72%, rgba(157,109,233,0.32) 0%, transparent 66%), radial-gradient(50% 40% at 60% 88%, rgba(242,199,102,0.22) 0%, transparent 70%), #050814",
          }}
        />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      <canvas ref={canvasRef} aria-hidden='true' className='block h-full w-full' />
    </div>
  );
}
