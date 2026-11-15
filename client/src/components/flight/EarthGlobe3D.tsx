import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createEarthTexture } from '../shared/createEarthTexture';

const MAX_FRAME_DELTA_SECONDS = 0.1;

export default function EarthGlobe3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 4.25);
    scene.add(new THREE.AmbientLight(0x8aa3b8, 1.35));

    const sunlight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
    sunlight.position.set(-4, 3, 5);
    scene.add(sunlight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(4, -1, -4);
    scene.add(rimLight);

    const texture = createEarthTexture();
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 64, 64),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.72,
        metalness: 0.08,
        emissive: 0x082f49,
        emissiveIntensity: 0.32,
      }),
    );
    earth.rotation.x = 0.18;
    scene.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.39, 64, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
            gl_FragColor = vec4(0.22, 0.74, 0.97, 0.65) * intensity;
          }
        `,
      }),
    );
    scene.add(atmosphere);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.width = '100%';
    container.appendChild(renderer.domElement);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rotationSpeed = reducedMotion ? 0.045 : 0.075;
    let previousFrameTime: number | null = null;
    let frameId = 0;
    let isDisposed = false;

    const renderFrame = (time: number) => {
      if (isDisposed) return;
      if (previousFrameTime !== null) {
        const delta = Math.min(MAX_FRAME_DELTA_SECONDS, (time - previousFrameTime) / 1000);
        earth.rotation.y += delta * rotationSpeed;
      }
      previousFrameTime = time;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderFrame);
    };

    const resize = () => {
      const { clientHeight: height, clientWidth: width } = container;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (reducedMotion) renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    frameId = window.requestAnimationFrame(renderFrame);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      container.removeChild(renderer.domElement);
    };
  }, []);

  if (webglUnavailable) return null;

  return <div ref={containerRef} className="h-full w-full" aria-hidden="true" />;
}
