export const sculptVertexShader = /* glsl */ `
  uniform vec3 uModelCenter;
  uniform float uModelScale;
  uniform float uShatter;
  uniform float uShatterDistance;

  attribute vec3 aCenter;
  attribute vec3 aDir;
  attribute vec3 aAxis;
  attribute float aSpread;

  varying vec3 vObjPos;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  vec3 rotateAxis(vec3 v, vec3 axis, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
  }

  void main() {
    float angle = uShatter * (1.8 + aSpread * 4.6);
    vec3 localPos = position;
    vec3 localNormal = normal;

    if (uShatter > 0.0001) {
      localPos = aCenter +
        rotateAxis(position - aCenter, aAxis, angle) +
        aDir * (uShatter * uShatterDistance * aSpread);
      localNormal = rotateAxis(normal, aAxis, angle);
    }

    vObjPos = (localPos - uModelCenter) * uModelScale;

    vec4 worldPos = modelMatrix * vec4(localPos, 1.0);
    vWorldPos = worldPos.xyz;
    vNormalW = normalize(mat3(modelMatrix) * localNormal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const ringLightGLSL = /* glsl */ `
  uniform vec3 uRingCenter;
  uniform vec3 uRingNormal;
  uniform float uRingRadius;
  uniform vec3 uRingColor;
  uniform float uRingIntensity;

  vec3 ringLight(vec3 worldPos, vec3 N, vec3 V) {
    vec3 d = worldPos - uRingCenter;
    vec3 onPlane = d - dot(d, uRingNormal) * uRingNormal;
    float radial = length(onPlane);
    vec3 radialDir = radial > 0.0001 ? onPlane / radial : vec3(1.0, 0.0, 0.0);
    vec3 nearest = uRingCenter + radialDir * uRingRadius;
    vec3 toRing = nearest - worldPos;
    float dist = length(toRing);
    vec3 L = toRing / max(dist, 0.0001);

    float lambert = clamp(dot(N, L) * 0.62 + 0.38, 0.0, 1.0);
    float atten = 1.0 / (1.0 + dist * dist * 3.2);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 42.0);
    float broadSpec = pow(max(dot(N, H), 0.0), 10.0);
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);
    float planeDist = dot(d, uRingNormal);
    float band = exp(-planeDist * planeDist * 70.0);

    vec3 lit = uRingColor * uRingIntensity * atten *
      (lambert * 0.5 + rim * 0.24 + spec * 1.2 + broadSpec * 0.15);
    lit += uRingColor * uRingIntensity * band * (0.02 + rim * 0.05) * 0.28;

    return lit;
  }
`;

export const beamVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const beamFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uSeed;

  varying vec2 vUv;

  float bHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float bNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(bHash(i), bHash(i + vec2(1.0, 0.0)), f.x),
      mix(bHash(i + vec2(0.0, 1.0)), bHash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float bFbm(vec2 p) {
    float amplitude = 0.5;
    float total = 0.0;
    for (int i = 0; i < 3; i++) {
      total += amplitude * bNoise(p);
      p *= 2.05;
      amplitude *= 0.5;
    }
    return total;
  }

  void main() {
    vec2 uv = vUv;
    float centered = abs(uv.x - 0.5) * 2.0;
    float falloff = pow(max(0.0, 1.0 - centered), 1.7);

    float y = uv.y - 0.5;
    float d = y / 0.14;
    float core = exp(-d * d);
    float wideD = y / 0.42;
    float haze = exp(-wideD * wideD) * 0.22;

    float n = bFbm(
      vec2(uv.x * 5.0 - uTime * 0.3 + uSeed * 10.0, uSeed * 3.0 + uv.y * 3.0)
    );
    float ridges = 0.55 + 0.7 * smoothstep(0.35, 0.85, n);

    float alpha = falloff * (core + haze) * ridges;
    gl_FragColor = vec4(uColor * uIntensity * alpha, alpha);
  }
`;

export const sculptFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uGold;
  uniform vec3 uHot;
  uniform vec2 uPointer;

  ${ringLightGLSL}

  varying vec3 vObjPos;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 p) {
    float amplitude = 0.5;
    float total = 0.0;
    for (int i = 0; i < 5; i++) {
      total += amplitude * noise3(p);
      p *= 2.02;
      amplitude *= 0.5;
    }
    return total;
  }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    vec3 p = vObjPos;
    float t = uTime;

    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 3.0);
    float edge = smoothstep(0.18, 1.0, fresnel);

    float flow = fbm(p * vec3(7.0, 5.0, 7.0) + vec3(0.0, -t * 0.55, 0.0));
    float detail = fbm(p * vec3(20.0, 30.0, 20.0) + vec3(t * 0.18, -t * 1.4, t * 0.12));
    float filament = pow(detail, 3.2) * (0.72 + 0.28 * sin(t * 3.0 + p.y * 18.0));

    float up = smoothstep(0.5, 0.95, N.y);
    float crown = up * smoothstep(0.3, 0.47, p.y);
    float burn = smoothstep(0.5, 0.95, flow) * (0.12 + edge) * smoothstep(0.08, -0.4, p.y);

    float energy =
      edge * (0.34 + 0.5 * flow) +
      crown * (0.7 + 1.8 * filament) +
      burn * 0.9;

    energy *= 0.88 + 0.12 * sin(t * 1.6 + p.y * 6.0 + uPointer.x * 2.0);
    energy = clamp(energy, 0.0, 1.8);

    vec3 lightDir = normalize(vec3(-0.35 + uPointer.x * 0.25, 0.8, 0.6));
    float specular = pow(clamp(dot(reflect(-lightDir, N), V), 0.0, 1.0), 32.0);

    vec3 color = vec3(0.0025, 0.0018, 0.0012);
    color += uGold * energy * 0.78;
    color += uGold * specular * 0.16;

    float veins = smoothstep(0.58, 0.95, flow) * edge;
    color += uGold * veins * 0.12;

    float scanCycle = fract(t * 0.11);
    float scanY = mix(-0.58, 0.52, scanCycle);
    float scanBand = smoothstep(0.045, 0.0, abs(p.y - scanY));
    float scanFade = sin(scanCycle * 3.14159265);
    color += uGold * scanBand * (0.18 + edge * 0.85) * scanFade * 0.7;

    color += ringLight(vWorldPos, N, V);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const sculptFragmentShaderPrism = /* glsl */ `
  uniform float uTime;
  uniform vec3 uGold;
  uniform vec3 uHot;
  uniform vec2 uPointer;

  ${ringLightGLSL}

  varying vec3 vObjPos;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 p) {
    float amplitude = 0.5;
    float total = 0.0;
    for (int i = 0; i < 5; i++) {
      total += amplitude * noise3(p);
      p *= 2.02;
      amplitude *= 0.5;
    }
    return total;
  }

  float band(float x) {
    return 0.5 + 0.5 * cos(6.28318530718 * x);
  }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    vec3 p = vObjPos;
    float t = uTime;

    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 2.1);
    float edge = smoothstep(0.04, 0.85, fresnel);

    float flow = fbm(p * vec3(5.5, 4.2, 5.5) + vec3(t * 0.1, -t * 0.42, t * 0.06));
    float detail = fbm(p * vec3(23.0, 33.0, 23.0) + vec3(-t * 0.24, -t * 1.5, t * 0.18));

    float strands = pow(smoothstep(0.42, 0.92, detail), 1.6);
    float filament = strands * (0.55 + 0.45 * sin(t * 3.6 + p.y * 22.0 + flow * 7.0));
    float core = pow(smoothstep(0.72, 0.98, detail + flow * 0.2), 2.0);

    float phase = fresnel * 2.1 + flow * 1.35 + p.y * 1.1 - t * 0.05;
    float dispersion = 0.085;
    vec3 rainbow = vec3(
      band(phase),
      band(phase + dispersion),
      band(phase + dispersion * 2.0)
    );

    float crown =
      smoothstep(0.05, 0.9, N.y) * smoothstep(0.1, 0.55, p.y);
    float energy =
      edge * (0.28 + 0.85 * flow) +
      crown * (0.35 + 1.1 * filament) +
      filament * (0.12 + edge * 1.3);
    energy *= 0.85 + 0.15 * sin(t * 1.7 + p.y * 7.0 + uPointer.x * 2.0);
    energy = clamp(energy, 0.0, 1.9);

    vec3 lightDir = normalize(vec3(-0.35 + uPointer.x * 0.3, 0.8, 0.6));
    float spec = pow(clamp(dot(reflect(-lightDir, N), V), 0.0, 1.0), 40.0);

    vec3 color = vec3(0.003, 0.004, 0.007);
    color += rainbow * energy * 0.85;
    color += mix(rainbow, vec3(1.0), 0.55) * core * 1.0;
    color += uHot * spec * 0.32;
    color += uGold * fresnel * 0.08;

    color += ringLight(vWorldPos, N, V);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const sculptFragmentShaderChrome = /* glsl */ `
  uniform float uTime;
  uniform vec3 uGold;
  uniform vec3 uHot;
  uniform vec2 uPointer;

  ${ringLightGLSL}

  varying vec3 vObjPos;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 p) {
    float amplitude = 0.5;
    float total = 0.0;
    for (int i = 0; i < 4; i++) {
      total += amplitude * noise3(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return total;
  }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    vec3 p = vObjPos;
    float t = uTime;

    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 2.6);
    float edge = smoothstep(0.03, 0.8, fresnel);

    vec3 R = reflect(-V, N);
    float horizon = smoothstep(-0.4, 0.9, R.y);
    float sweep = 0.5 + 0.5 * sin(R.x * 2.6 + R.z * 2.0 + t * 0.18);
    float brushed = fbm(p * vec3(30.0, 4.0, 30.0) + vec3(0.0, t * 0.08, 0.0));

    vec3 env = mix(uGold, uHot, horizon);
    env = mix(env, uHot * 1.15, pow(sweep, 3.0) * 0.4);
    env *= 0.82 + 0.3 * brushed;

    vec3 lightDir = normalize(vec3(-0.35 + uPointer.x * 0.3, 0.8, 0.6));
    float spec = pow(clamp(dot(reflect(-lightDir, N), V), 0.0, 1.0), 34.0);
    float ridge = smoothstep(0.3, 0.98, abs(R.y)) * edge;

    vec3 color = vec3(0.002, 0.003, 0.006);
    color += env * (0.22 + fresnel * 1.05) * 0.45;
    color += uHot * ridge * 0.24;
    color += uHot * spec * 0.45;
    color *= 0.9 + 0.1 * sin(t * 1.3 + p.y * 5.0);

    color += ringLight(vWorldPos, N, V);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const ringVertexShader = /* glsl */ `
  varying vec3 vRingNormalW;
  varying vec3 vRingViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vRingNormalW = normalize(mat3(modelMatrix) * normal);
    vRingViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const ringFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;

  varying vec3 vRingNormalW;
  varying vec3 vRingViewDir;

  void main() {
    float flicker = 0.95 + 0.05 * sin(uTime * 2.0);
    gl_FragColor = vec4(uColor * uIntensity * flicker, 1.0);
  }
`;

export const ringHaloVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ringHaloFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uRadius;

  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float dist = abs(length(p) - uRadius);
    float mid = exp(-dist * dist * 140.0);
    float wide = exp(-dist * dist * 12.0);
    float flicker = 0.92 + 0.08 * sin(uTime * 1.8);

    float glow = mid * 0.5 + wide * 0.16;
    gl_FragColor = vec4(uColor * uIntensity * glow * flicker, glow);
  }
`;

export const quadVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const brightFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  uniform float uKnee;

  varying vec2 vUv;

  void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;
    float brightness = max(color.r, max(color.g, color.b));

    float soft = clamp(brightness - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 0.0001);
    float contribution = max(soft, brightness - uThreshold) / max(brightness, 0.0001);

    gl_FragColor = vec4(color * contribution, 1.0);
  }
`;

export const blurFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uDirection;

  varying vec2 vUv;

  void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
    color += texture2D(tDiffuse, vUv + uDirection * 1.3846153846).rgb * 0.3162162162;
    color += texture2D(tDiffuse, vUv - uDirection * 1.3846153846).rgb * 0.3162162162;
    color += texture2D(tDiffuse, vUv + uDirection * 3.2307692308).rgb * 0.0702702703;
    color += texture2D(tDiffuse, vUv - uDirection * 3.2307692308).rgb * 0.0702702703;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const compositeFragmentShader = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uBgColor;
  uniform vec3 uHaloColor;
  uniform vec3 uHazeColor;
  uniform vec3 uBloomTint;
  uniform vec3 uRayTint;
  uniform vec3 uSparkTint;
  uniform vec3 uStreakTint;
  uniform vec3 uFlashTint;
  uniform float uStreak;
  uniform float uCA;
  uniform float uVignette;
  uniform float uExposure;
  uniform float uGrain;
  uniform float uFlash;
  uniform float uTransition;
  uniform vec2 uTransitionOrigin;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm2(vec2 p) {
    float amplitude = 0.5;
    float total = 0.0;
    for (int i = 0; i < 3; i++) {
      total += amplitude * valueNoise(p);
      p *= 2.07;
      amplitude *= 0.5;
    }
    return total;
  }

  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    float tr = uTransition;

    vec2 originPix = (uv - uTransitionOrigin) * vec2(aspect, 1.0);
    float originDist = length(originPix);
    vec2 originDir = originPix / max(originDist, 0.0001);

    float shockBand = (originDist - tr * 0.95) * 6.5;
    float shock = exp(-shockBand * shockBand) * tr;
    uv += originDir * shock * 0.045 / vec2(aspect, 1.0);

    float ripple = sin(originDist * 42.0 - uTime * 9.0) * 0.0035 * tr * smoothstep(1.0, 0.15, originDist);
    uv += originDir * ripple / vec2(aspect, 1.0);

    float rowId = floor(uv.y * 36.0);
    float glitchNoise = hash21(vec2(rowId, floor(uTime * 26.0)));
    float glitchBand = step(0.78, glitchNoise) * tr;
    uv.x += (glitchNoise - 0.5) * 0.07 * glitchBand;
    uv = clamp(uv, 0.001, 0.999);

    vec2 caDir = uv - 0.5;
    float ca = uCA * (1.0 + tr * 7.0);
    float glitchShift = (glitchNoise - 0.5) * 0.02 * glitchBand;
    vec4 sceneR = texture2D(tScene, uv + caDir * ca + vec2(glitchShift, 0.0));
    vec4 sceneG = texture2D(tScene, uv);
    vec4 sceneB = texture2D(tScene, uv - caDir * ca - vec2(glitchShift, 0.0));
    vec4 sceneColor = vec4(sceneR.r, sceneG.g, sceneB.b, sceneG.a);

    vec2 bgP = uv - vec2(0.5, 0.62);
    bgP.x *= aspect * 0.85;
    float halo = smoothstep(0.8, 0.04, length(bgP));
    vec3 background = mix(uBgColor, uHaloColor, halo);
    background += uHaloColor * 0.2 * smoothstep(0.85, 0.1, length(bgP));

    float haze = fbm2(uv * vec2(aspect, 1.0) * 3.2 + vec2(uTime * 0.02, -uTime * 0.025));
    float hazeMask = smoothstep(1.0, 0.1, length(bgP));
    background += uHazeColor * pow(haze, 2.2) * hazeMask;

    float subject = smoothstep(0.35, 0.9, sceneColor.a);
    vec3 color = mix(background, sceneColor.rgb + background * 0.12, subject);

    float pulse = 0.85 + 0.15 * sin(uTime * 1.1);

    vec3 bloom = texture2D(tBloom, uv).rgb;
    color += bloom * uBloomTint * 0.45 * pulse;

    vec2 rayCenter = vec2(0.5 + sin(uTime * 0.23) * 0.008, 0.62);
    vec2 rayDir = uv - rayCenter;
    vec3 rays = vec3(0.0);
    float weightSum = 0.0;
    for (int i = 1; i <= 10; i++) {
      float stepT = float(i) / 10.0;
      vec2 sampleUv = clamp(uv - rayDir * stepT * 0.42, 0.001, 0.999);
      float weight = 1.0 - stepT;
      rays += texture2D(tBloom, sampleUv).rgb * weight;
      weightSum += weight;
    }
    rays /= max(weightSum, 0.0001);
    color += rays * uRayTint * 0.15 * pulse;

    vec3 streak = vec3(0.0);
    float streakWeight = 0.0;
    for (int i = -14; i <= 14; i++) {
      float k = float(i) / 14.0;
      float w = exp(-abs(k) * 3.2);
      vec2 streakUv = vec2(clamp(uv.x + k * 0.32, 0.001, 0.999), uv.y);
      streak += texture2D(tBloom, streakUv).rgb * w;
      streakWeight += w;
    }
    streak /= max(streakWeight, 0.0001);
    color += streak * uStreakTint * uStreak * pulse;

    vec2 grid = uv * vec2(aspect, 1.0) * 95.0;
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float rnd = hash21(cell);
    vec2 offset = (vec2(hash21(cell + 3.1), hash21(cell + 7.7)) - 0.5) * 0.72;
    float twinkle = 0.5 + 0.5 * sin(uTime * (1.0 + rnd * 2.4) + rnd * 21.0);
    float spark = smoothstep(0.055, 0.0, length(local - offset)) * step(0.972, rnd) * twinkle;
    color += uSparkTint * spark * 0.6;

    float grain = hash21(uv * uResolution + uTime * 60.0) - 0.5;
    color += grain * uGrain;

    vec2 vignetteP = (uv - 0.5) * vec2(aspect, 1.0);
    float vignette = smoothstep(1.2, 0.25, length(vignetteP));
    color *= mix(1.0 - uVignette, 1.0, vignette);

    float scan = 0.5 + 0.5 * sin(uv.y * 720.0 + uTime * 18.0);
    color *= 1.0 - tr * 0.08 * scan;
    color += uFlashTint * shock * 0.5;
    color += uFlashTint * uFlash;

    color = aces(color * uExposure);
    color = pow(color, vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
  }
`;
