import { useEffect, useRef, useState, useCallback, PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { isLowPowerViewport } from "@/lib/devicePerf";

interface JJHero3DProps {
  className?: string;
  onLanded?: () => void;
  isZoomed?: boolean;
  onZoomChange?: (zoomed: boolean) => void;
  isMuted?: boolean;
  onToggleSound?: () => void;
  showControls?: boolean;
  shadesScale?: number;
  onShadesScaleChange?: (scale: number) => void;
}

export default function JJHero3D({ className = "", onLanded, isZoomed: externalZoomed, onZoomChange, isMuted: externalMuted, onToggleSound, showControls = false, shadesScale: externalShadesScale, onShadesScaleChange }: JJHero3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, moved: 0 });

  const [isReady, setIsReady] = useState(false);
  const [internalZoomed, setInternalZoomed] = useState(false);
  const [internalMuted, setInternalMuted] = useState(true);
  const [internalShadesScale, setInternalShadesScale] = useState(0.3); // Calibrated: PD 201px / lens-center-dist 665px ≈ 0.302
  const glassesScaleRef = useRef(internalShadesScale);

  const zoomed = externalZoomed !== undefined ? externalZoomed : internalZoomed;
  const isMuted = externalMuted !== undefined ? externalMuted : internalMuted;

  // Keep the latest props in refs so the mount effect stays dependency-free
  const onLandedRef = useRef(onLanded);
  const externalMutedRef = useRef(externalMuted);
  useEffect(() => {
    onLandedRef.current = onLanded;
    externalMutedRef.current = externalMuted;
  });
  const shadesScale = externalShadesScale !== undefined ? externalShadesScale : internalShadesScale;

  const setShadesScale = useCallback(
    (next: number) => {
      if (onShadesScaleChange) {
        onShadesScaleChange(next);
      } else {
        setInternalShadesScale(next);
      }
    },
    [onShadesScaleChange],
  );

  useEffect(() => {
    glassesScaleRef.current = shadesScale;
  }, [shadesScale]);

  // Animation state (0 = full video screen, 1 = landed into glasses on humai portrait)
  const stateRef = useRef({
    progress: 0, // Starts at 0 (full video on initial page!) then pulls into glasses
    targetProgress: 0,
    zoomTween: null as gsap.core.Tween | null,
    pointerX: 0,
    pointerY: 0,
    smoothPointerX: 0,
    smoothPointerY: 0,
    lastPointerX: 0,
    pointerVelocityX: 0,
    time: 0,
    hasAutoEased: false,
  });

  const toggleZoom = useCallback(() => {
    // Any manual interaction cancels the pending auto-landing intro
    stateRef.current.hasAutoEased = true;
    const next = !zoomed;
    if (onZoomChange) {
      onZoomChange(next);
    } else {
      setInternalZoomed(next);
    }
  }, [zoomed, onZoomChange]);

  const isGlassesHit = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return false;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (!width || !height) return false;

    const p = stateRef.current.progress;
    const landedScale = width < 768 ? 0.78 : 0.89;
    const scale = THREE.MathUtils.lerp(5.8, landedScale, p);
    const meshY = THREE.MathUtils.lerp(-1.1, -0.097, p) + Math.sin(stateRef.current.time * 1.2) * 0.012 * p;

    const visibleH = 2 * 2.75 * Math.tan(THREE.MathUtils.degToRad(10));
    const visibleW = visibleH * (width / height);
    const textureAspect = 1456 / 1080;

    const toScreen = (u: number, v: number) => {
      const localX = (u - 0.5) * textureAspect * scale;
      const localY = (v - 0.5) * scale + meshY;
      return {
        x: rect.left + (localX / (visibleW / 2) + 1) * 0.5 * width,
        y: rect.top + (1 - localY / (visibleH / 2)) * 0.5 * height,
      };
    };

    const centerU = 0.492;
    const centerV = 0.666;
    const half = glassesScaleRef.current / 2;
    const center = toScreen(centerU, centerV);
    const edgeX = toScreen(centerU + half, centerV);
    const edgeY = toScreen(centerU, centerV + half);
    const halfW = Math.abs(edgeX.x - center.x) * 1.15;
    const halfH = Math.abs(edgeY.y - center.y) * 1.15;

    return Math.abs(clientX - center.x) <= halfW && Math.abs(clientY - center.y) <= halfH;
  }, []);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag.active && e.pointerType !== "mouse") return;
    if (drag.active) {
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    stateRef.current.pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    stateRef.current.pointerY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }, []);

  const handlePointerCancel = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag.active) return;
      drag.active = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (drag.moved < 12 && isGlassesHit(e.clientX, e.clientY)) {
        toggleZoom();
      }
    },
    [isGlassesHit, toggleZoom],
  );

  const toggleSound = useCallback(() => {
    if (onToggleSound) {
      onToggleSound();
      return;
    }
    if (videoRef.current) {
      const next = !videoRef.current.muted;
      videoRef.current.muted = next;
      setInternalMuted(next);
    }
  }, [onToggleSound]);

  // Update zoom tween when `zoomed` state changes.
  // The initial value is ignored so the intro can play the full-screen video first
  // (also resilient to React StrictMode's double effect invocation).
  const lastZoomedRef = useRef(zoomed);
  useEffect(() => {
    if (lastZoomedRef.current === zoomed) return;
    lastZoomedRef.current = zoomed;
    const target = zoomed ? 0 : 1;
    stateRef.current.targetProgress = target;
    if (stateRef.current.zoomTween) {
      stateRef.current.zoomTween.kill();
    }
    stateRef.current.zoomTween = gsap.to(stateRef.current, {
      progress: target,
      duration: 1.8,
      ease: "power3.inOut",
      onComplete: () => {
        if (target === 1 && onLandedRef.current) {
          onLandedRef.current();
        }
      },
    });
  }, [zoomed, onLanded]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const lowPower = isLowPowerViewport();
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let mesh: THREE.Mesh | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let geometry: THREE.PlaneGeometry | null = null;
    let videoTexture: THREE.VideoTexture | null = null;
    let animationFrameId = 0;

    // Create & setup HTML5 video element for football highlight film
    const video = document.createElement("video");
    video.src = "/humai-video.mp4";
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = externalMutedRef.current ?? true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    videoRef.current = video;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const resumePlay = () => {
          video.play().catch(() => {});
          window.removeEventListener("pointerdown", resumePlay);
        };
        window.addEventListener("pointerdown", resumePlay, { once: true });
      });
    }

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.2 : 1.6));
    } catch (e) {
      console.warn("WebGL initialization failed:", e);
      return;
    }

    scene = new THREE.Scene();

    const fov = 20;
    camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 2.75);

    // Textures: User's portrait (humai.png), depth map (humai-depth.png), glasses frame, and lens mask
    const textureLoader = new THREE.TextureLoader();
    const loadTex = (url: string, isColor = true) => {
      const tex = textureLoader.load(url);
      if (isColor) {
        tex.colorSpace = THREE.SRGBColorSpace;
      } else {
        tex.colorSpace = THREE.NoColorSpace;
      }

      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      return tex;
    };

    const humaiTex = loadTex("/humai.png");
    const humaiDepthTex = loadTex("/humai-depth.png", false);
    const frameTex = loadTex("/frame-kacamata.png");
    const lensMaskTex = loadTex("/lens-mask.png", false);

    videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;

    // Aspect ratio of humai.png (1456 / 1080 = 1.348148)
    const aspect = 1456 / 1080;
    const segments = lowPower ? 64 : 128;
    geometry = new THREE.PlaneGeometry(aspect, 1, segments, segments);

    const vertexShader = `
      varying vec2 vUv;
      varying float vDepth;
      uniform sampler2D tDepth;
      uniform vec2 uPointer;
      uniform float uProgress;

      void main() {
        vUv = uv;
        
        // Sample depth map for genuine 3D relief extrusion
        float d = texture2D(tDepth, uv).r;
        vDepth = d;

        vec3 pos = position;

        // Depth extrusion: foreground pops forward, background recedes
        float depthDisplacement = (d - 0.38) * 0.12 * uProgress;
        pos.z += depthDisplacement;

        // Subtle 3D convex curvature on the portrait plane for organic volume
        float distFromCenter = length(uv - 0.5);
        pos.z += (1.0 - distFromCenter * 2.0) * 0.03 * uProgress;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      varying float vDepth;
      uniform sampler2D tHumai;
      uniform sampler2D tDepth;
      uniform sampler2D tFrame;
      uniform sampler2D tLensMask;
      uniform sampler2D tVideo;
      uniform float uProgress;       // 0 = full video cover, 1 = landed in glasses
      uniform vec2 uResolution;
      uniform vec2 uCrtSplit;
      uniform float uTime;
      uniform vec2 uPointer;
      uniform vec2 uGlassesCenter;
      uniform float uGlassesScale;

      // Fisheye curvature function for video inside glasses
      vec2 fisheye(vec2 uv, float strength) {
        vec2 centered = uv - 0.5;
        float r = length(centered);
        if (r == 0.0) return uv;
        float theta = atan(centered.y, centered.x);
        float distorted = r * (1.0 + strength * r * r);
        return vec2(cos(theta), sin(theta)) * distorted + 0.5;
      }

      // True screen-space cover for video when zoomed
      vec2 screenCoverUv(vec2 screenUv) {
        float sa = uResolution.x / uResolution.y;
        float va = 1920.0 / 1080.0;
        vec2 c = screenUv - 0.5;
        if (sa > va) {
          c.y *= va / sa;
        } else {
          c.x *= sa / va;
        }
        return c + 0.5;
      }

      void main() {
        // Cheap intro path: before the portrait lands, the frame is just the
        // full-screen highlight film. Skip depth, normals & glasses sampling.
        if (uProgress < 0.002) {
          vec2 introUv = screenCoverUv(gl_FragCoord.xy / uResolution);
          vec3 intro = texture2D(tVideo, clamp(introUv, 0.0, 1.0)).rgb;
          intro = pow(intro, vec3(0.92)) * 1.15;
          gl_FragColor = vec4(intro, 1.0);
          return;
        }

        // Multi-pass 2.5D parallax mapping using depth map
        float d0 = texture2D(tDepth, vUv).r;
        vec2 pOffset = uPointer * 0.024 * uProgress;
        vec2 parallaxUv = vUv - pOffset * (d0 - 0.38);
        float d1 = texture2D(tDepth, clamp(parallaxUv, 0.0, 1.0)).r;
        vec2 finalUv = clamp(vUv - pOffset * (mix(d0, d1, 0.5) - 0.38), 0.0, 1.0);

        vec4 humaiCol = texture2D(tHumai, finalUv);

        // Surface normal derived from depth map for tactile material lighting
        float dStep = 0.003;
        float dL = texture2D(tDepth, clamp(finalUv - vec2(dStep, 0.0), 0.0, 1.0)).r;
        float dR = texture2D(tDepth, clamp(finalUv + vec2(dStep, 0.0), 0.0, 1.0)).r;
        float dD = texture2D(tDepth, clamp(finalUv - vec2(0.0, dStep), 0.0, 1.0)).r;
        float dU = texture2D(tDepth, clamp(finalUv + vec2(0.0, dStep), 0.0, 1.0)).r;
        vec3 normal = normalize(vec3((dL - dR) * 2.4, (dD - dU) * 2.4, 1.0));

        // Dynamic directional lighting reacting to cursor position
        vec3 lightDir = normalize(vec3(-uPointer.x * 0.45, uPointer.y * 0.45 + 0.15, 1.1));
        float diffuse = max(dot(normal, lightDir), 0.0);
        float specular = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 12.0) * 0.22;
        float depthLight = mix(1.0, 0.90 + diffuse * 0.18 + specular * (d0 > 0.52 ? 1.0 : 0.0), uProgress);
        humaiCol.rgb *= depthLight;

        // Map glasses onto eye region of the face (calibrated scale & center)
        // using parallaxed UV coordinates so glasses stick to 3D head motion
        vec2 glassesUv = (finalUv - uGlassesCenter) / uGlassesScale + vec2(0.5, 0.5);

        vec4 frameCol = vec4(0.0);
        float lensMask = 0.0;

        // Only sample sunglasses within valid UV bounds
        if (glassesUv.x >= 0.0 && glassesUv.x <= 1.0 && glassesUv.y >= 0.0 && glassesUv.y <= 1.0) {
          frameCol = texture2D(tFrame, glassesUv);
          lensMask = texture2D(tLensMask, glassesUv).r;
        }

        // Screen-space UV for initial full video
        vec2 screenUv = gl_FragCoord.xy / uResolution;
        vec2 fullCoverUv = screenCoverUv(screenUv);

        // In-glasses lens video UV (centered inside scaled glasses with fisheye curve)
        vec2 inLensUv = (glassesUv - vec2(0.5, 0.5)) * 1.45 + vec2(0.5, 0.5);
        inLensUv = fisheye(inLensUv, 2.0);

        // Blend video sampling UV between full-screen and in-glasses
        vec2 videoUv = mix(fullCoverUv, inLensUv, uProgress);

        // Chromatic CRT aberration (red/blue offset)
        vec4 videoCol;
        videoCol.r = texture2D(tVideo, clamp(videoUv + uCrtSplit, 0.0, 1.0)).r;
        videoCol.g = texture2D(tVideo, clamp(videoUv, 0.0, 1.0)).g;
        videoCol.b = texture2D(tVideo, clamp(videoUv - uCrtSplit, 0.0, 1.0)).b;
        videoCol.a = 1.0;

        // Subtle CRT scanlines & phosphor aperture grille
        float scanline = 0.5 + 0.5 * sin(videoUv.y * 360.0);
        videoCol.rgb *= (1.0 - 0.12 * scanline);

        // Boost contrast & saturation for football film
        videoCol.rgb = pow(videoCol.rgb, vec3(0.92)) * 1.15;

        // Base composite on user portrait:
        vec3 portraitWithLenses = humaiCol.rgb;

        // Project video into the glasses lenses
        if (lensMask > 0.02) {
          portraitWithLenses = mix(portraitWithLenses, videoCol.rgb, lensMask);
        }

        // Overlay the stylish sunglasses frame on top
        if (frameCol.a > 0.02) {
          portraitWithLenses = mix(portraitWithLenses, frameCol.rgb, frameCol.a);
        }

        // Morph between full-screen video (uProgress = 0) and portrait with glasses (uProgress = 1)
        vec3 finalColor = mix(videoCol.rgb, portraitWithLenses, uProgress);
        float finalAlpha = mix(1.0, max(humaiCol.a, frameCol.a), uProgress);

        // Vignette at edges
        float vig = 1.0 - smoothstep(0.4, 0.9, length(vUv - 0.5)) * 0.3 * uProgress;
        finalColor *= vig;

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `;

    const uniforms = {
      tHumai: { value: humaiTex },
      tDepth: { value: humaiDepthTex },
      tFrame: { value: frameTex },
      tLensMask: { value: lensMaskTex },
      tVideo: { value: videoTexture },
      uProgress: { value: 0.0 }, // starts at 0 (full video), then eases to 1.0
      uResolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      uCrtSplit: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uGlassesCenter: { value: new THREE.Vector2(0.492, 0.666) },
      uGlassesScale: { value: 0.3 },
    };

    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      side: THREE.DoubleSide,
    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -0.05, 0);
    scene.add(mesh);

    // Initial cinematic opening: Video plays full-screen for 5s
    // before pulling into the glasses on the portrait
    const introTimer = setTimeout(() => {
      if (!stateRef.current.hasAutoEased) {
        stateRef.current.hasAutoEased = true;
        gsap.to(stateRef.current, {
          progress: 1.0,
          duration: 2.4,
          ease: "power3.inOut",
          onComplete: () => {
            if (onLandedRef.current) onLandedRef.current();
          },
        });
      }
    }, 5000);

    // Resize handler
    const onResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      // gl_FragCoord is in drawing-buffer pixels (CSS size × devicePixelRatio),
      // so uResolution must match the drawing buffer, otherwise the full-screen
      // video UV is cropped on HiDPI screens.
      uniforms.uResolution.value.set(canvas.width, canvas.height);
    };
    window.addEventListener("resize", onResize);
    onResize();

    // Stop the hero GPU work as soon as the pinned stage wipes over it.
    let heroVisible = true;
    const updateHeroVisibility = () => {
      const next = !document.hidden && window.scrollY < window.innerHeight * 1.25;
      if (next === heroVisible) return;
      heroVisible = next;
      if (!next) {
        if (!video.paused) video.pause();
      } else {
        video.play().catch(() => {});
      }
    };
    window.addEventListener("scroll", updateHeroVisibility, { passive: true });
    document.addEventListener("visibilitychange", updateHeroVisibility);
    updateHeroVisibility();

    // Animation frame render loop
    let lastTime = performance.now();
    let hasReady = false;
    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      if (!heroVisible) {
        lastTime = now;
        return;
      }

      // Mark canvas ready after the first real frame (avoids setState during effect body)
      if (!hasReady) {
        hasReady = true;
        setIsReady(true);
      }

      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      stateRef.current.time += delta;

      const state = stateRef.current;
      const p = state.progress;

      // Smooth pointer interpolation
      state.smoothPointerX += (state.pointerX - state.smoothPointerX) * 0.05;
      state.smoothPointerY += (state.pointerY - state.smoothPointerY) * 0.05;

      // Velocity for chromatic aberration
      const deltaX = state.smoothPointerX - state.lastPointerX;
      state.lastPointerX = state.smoothPointerX;
      state.pointerVelocityX += (deltaX - state.pointerVelocityX) * 0.1;
      uniforms.uCrtSplit.value.set(state.pointerVelocityX * 0.035, 0);

      // Camera scale & position:
      // When p = 0: scale is large, zoomed straight through glasses into full video
      // When p = 1: portrait sits on the cream editorial stage
      const landedScale = container.clientWidth < 768 ? 0.78 : 0.89;
      const zoomedScale = 5.8;
      const currentScale = THREE.MathUtils.lerp(zoomedScale, landedScale, p);

      if (mesh) {
        mesh.scale.setScalar(currentScale);

        // Breathing oscillation - shift Y so eye line (uv.y≈0.71) sits at screen center
        const breath = Math.sin(state.time * 1.2) * 0.012 * p;
        const targetMeshY = THREE.MathUtils.lerp(-1.1, -0.097, p) + breath;
        mesh.position.y += (targetMeshY - mesh.position.y) * 0.08;

        // 3D Parallax tilt from mouse
        const tiltX = -state.smoothPointerY * 0.12 * p;
        const tiltY = state.smoothPointerX * 0.22 * p;
        mesh.rotation.x += (tiltX - mesh.rotation.x) * 0.06;
        mesh.rotation.y += (tiltY - mesh.rotation.y) * 0.06;
      }

      if (camera) {
        const camX = state.smoothPointerX * 0.12 * p;
        const camY = state.smoothPointerY * 0.08 * p;
        camera.position.x += (camX - camera.position.x) * 0.06;
        camera.position.y += (camY - camera.position.y) * 0.06;
        camera.lookAt(0, 0, 0);
      }

      uniforms.uGlassesScale.value = glassesScaleRef.current;
      uniforms.uProgress.value = p;
      uniforms.uTime.value = state.time;
      uniforms.uPointer.value.set(state.smoothPointerX, state.smoothPointerY);

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      clearTimeout(introTimer);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", updateHeroVisibility);
      document.removeEventListener("visibilitychange", updateHeroVisibility);
      if (renderer) renderer.dispose();
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (humaiTex) humaiTex.dispose();
      if (humaiDepthTex) humaiDepthTex.dispose();
      if (frameTex) frameTex.dispose();
      if (lensMaskTex) lensMaskTex.dispose();
      if (videoTexture) videoTexture.dispose();
      if (video) {
        video.pause();
        video.src = "";
        video.load();
      }
    };
  }, []);

  // Keep the video element in sync with externally controlled mute state
  useEffect(() => {
    if (videoRef.current && externalMuted !== undefined) {
      videoRef.current.muted = externalMuted;
    }
  }, [externalMuted]);

  return (
    <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`block h-full w-full touch-pan-y transition-opacity duration-700 ${isReady ? "opacity-100" : "opacity-0"} ${zoomed ? "cursor-zoom-out" : "cursor-grab"}`}
      />

      {/* Floating Interactive Controls (Sound toggle / Dive / Close) */}
      {showControls && (
        <div className='pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-5 md:p-8'>
          {/* Top Controls: Sound Toggle, Shades Size Adjuster & Video toggles */}
          <div
            className='flex w-full items-center justify-between pointer-events-auto
        '
          >
            <div className='flex items-center gap-2.5'>
              <button
                type='button'
                onClick={toggleSound}
                aria-label={isMuted ? "Unmute football film audio" : "Mute audio"}
                className='flex items-center gap-2 rounded-full border border-jj-bone/20 bg-jj-ink/60 px-3.5 py-1.5 text-[10px] tracking-widest text-jj-bone uppercase backdrop-blur-md transition-all hover:border-jj-gold-bright hover:bg-jj-ink/90 active:scale-95'
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isMuted ? "bg-jj-bone/40" : "bg-jj-gold-bright animate-ping"}`} />
                <span>{isMuted ? "SOUND OFF" : "SOUND ON"}</span>
              </button>

              {!zoomed && (
                <div className='flex items-center gap-1 rounded-full border border-jj-bone/20 bg-jj-ink/60 px-2.5 py-1 text-[9px] text-jj-bone/70 backdrop-blur-md'>
                  <span className='jj-mono text-jj-bone/40 pr-1'>SHADES:</span>
                  <button
                    type='button'
                    onClick={() => setShadesScale(+(shadesScale - 0.02).toFixed(2))}
                    className='h-5 w-5 rounded hover:bg-jj-bone/20 flex items-center justify-center font-bold text-jj-gold-bright active:scale-90'
                    title='Kecilkan kacamata'
                  >
                    −
                  </button>
                  <span className='jj-mono font-bold text-jj-gold-bright min-w-[28px] text-center'>{Math.round(shadesScale * 100)}%</span>
                  <button
                    type='button'
                    onClick={() => setShadesScale(+(shadesScale + 0.02).toFixed(2))}
                    className='h-5 w-5 rounded hover:bg-jj-bone/20 flex items-center justify-center font-bold text-jj-gold-bright active:scale-90'
                    title='Besarkan kacamata'
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            <div className='flex items-center gap-3 pointer-events-auto'>
              {zoomed ? (
                <button
                  type='button'
                  onClick={toggleZoom}
                  className='flex items-center gap-2 rounded-full border border-jj-gold-bright/50 bg-jj-ink/80 px-4 py-1.5 text-[10px] tracking-widest text-jj-gold-bright uppercase backdrop-blur-xl transition-all hover:bg-jj-gold-bright hover:text-jj-ink active:scale-95 shadow-lg'
                >
                  <span>ENTER PORTRAIT</span>
                  <span>↘</span>
                </button>
              ) : null}

              {zoomed && (
                <button
                  type='button'
                  onClick={toggleZoom}
                  aria-label='Tutup pidéo zoom'
                  className='flex h-8 w-8 items-center justify-center rounded-full border border-jj-bone/25 bg-jj-bone/10 text-jj-bone shadow-2xl backdrop-blur-xl transition-transform hover:scale-110 active:scale-95'
                >
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M18 6L6 18M6 6l12 12' />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Center Prompt: "TEULEUM KA KACA PANON" / "MULANG KA POTRÉT" Pill */}
          <div className='flex justify-center pb-2 pointer-events-auto'>
            <button
              type='button'
              onClick={toggleZoom}
              className='group flex items-center gap-2.5 rounded-full border border-jj-gold-bright/35 bg-jj-ink/80 px-5 py-2.5 text-[10px] font-medium tracking-[0.25em] text-jj-gold-bright uppercase shadow-[0_4px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 hover:border-jj-gold-bright hover:bg-jj-gold/25 hover:shadow-[0_0_25px_rgba(212,162,74,0.45)] active:scale-95'
            >
              <span className='inline-block transition-transform duration-300 group-hover:scale-125'>✦</span>
              <span>{zoomed ? "MULANG KA POTRÉT" : "TEULEUM KA KACA PANON"}</span>
              <span className='text-[12px] opacity-70 group-hover:translate-x-0.5 transition-transform'>{zoomed ? "↗" : "↘"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
