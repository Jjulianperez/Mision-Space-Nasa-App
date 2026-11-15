import { useEffect, useRef } from 'react';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

type DesignModel3DProps = {
  view: number;
  hasEST: boolean;
  hasSCI: boolean;
  hasCOM: boolean;
  resetKey: number;
  launching?: boolean;
  className?: string;
};

type ModelMaterials = {
  hull: THREE.MeshStandardMaterial;
  wireCyan: THREE.LineBasicMaterial;
  wireAmber: THREE.LineBasicMaterial;
  sky: THREE.MeshStandardMaterial;
  emerald: THREE.MeshStandardMaterial;
  fairing: THREE.MeshStandardMaterial;
};

type SceneUpdate = (delta: number) => void;

function createMaterials(): ModelMaterials {
  return {
    hull: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.72,
      roughness: 0.28,
    }),
    wireCyan: new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    }),
    wireAmber: new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.9,
    }),
    sky: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      roughness: 0.25,
    }),
    emerald: new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.75,
      roughness: 0.25,
    }),
    fairing: new THREE.MeshStandardMaterial({
      color: 0x131c31,
      metalness: 0.65,
      roughness: 0.3,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  };
}

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  edgeMaterial?: THREE.LineBasicMaterial,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  if (edgeMaterial) {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 24), edgeMaterial));
  }

  return mesh;
}

function addSatellite(
  materials: ModelMaterials,
  { hasSCI, hasCOM }: Pick<DesignModel3DProps, 'hasSCI' | 'hasCOM'>,
) {
  const satellite = new THREE.Group();
  addMesh(
    satellite,
    new THREE.BoxGeometry(0.42, 0.42, 0.5),
    materials.hull,
    [0, 0, 0],
    materials.wireCyan,
  );
  addMesh(
    satellite,
    new THREE.BoxGeometry(0.28, 0.27, 0.03),
    materials.sky,
    [0, 0, 0.27],
  );

  [-0.72, 0.72].forEach((x) => {
    addMesh(
      satellite,
      new THREE.BoxGeometry(1.05, 0.025, 0.32),
      hasCOM ? materials.emerald : materials.sky,
      [x, 0, 0],
      materials.wireCyan,
    );
  });

  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.45),
    hasCOM ? materials.emerald : materials.sky,
  );
  dish.rotation.x = Math.PI;
  dish.position.set(0, 0.3, 0);
  satellite.add(dish);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.24, 24),
    hasSCI ? materials.sky : materials.hull,
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(-0.1, -0.04, 0.32);
  satellite.add(lens);

  if (hasSCI) {
    const scanCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.15, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    scanCone.position.y = -0.68;
    satellite.add(scanCone);
  }

  addMesh(
    satellite,
    new THREE.CylinderGeometry(0.08, 0.16, 0.3, 20, 1, true),
    materials.hull,
    [0, -0.36, 0],
    materials.wireAmber,
  );

  return satellite;
}

function createRocketScene(
  scene: THREE.Scene,
  materials: ModelMaterials,
  props: Pick<DesignModel3DProps, 'hasEST' | 'hasSCI' | 'hasCOM' | 'launching'>,
): SceneUpdate {
  const grid = new THREE.GridHelper(8, 16, 0x1e293b, 0x0f172a);
  scene.add(grid);
  const padRing = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.48, 48),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
    }),
  );
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.y = 0.01;
  scene.add(padRing);

  const rocket = new THREE.Group();
  scene.add(rocket);
  addMesh(
    rocket,
    new THREE.CylinderGeometry(0.14, 0.26, 0.38, 24, 1, true),
    materials.hull,
    [0, 0.34, 0],
    materials.wireAmber,
  );
  addMesh(
    rocket,
    new THREE.CylinderGeometry(0.3, 0.3, 2.1, 28),
    materials.hull,
    [0, 1.56, 0],
    materials.wireCyan,
  );
  addMesh(
    rocket,
    new THREE.CylinderGeometry(0.37, 0.37, 2.12, 28),
    materials.hull,
    [0, 1.58, 0],
    materials.wireCyan,
  );

  [0.88, 1.58, 2.28].forEach((y) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.022, 10, 32), materials.sky);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    rocket.add(ring);
  });

  addMesh(
    rocket,
    new THREE.CylinderGeometry(0.31, 0.31, 0.92, 24),
    materials.hull,
    [0, 3.1, 0],
    materials.wireAmber,
  );
  addMesh(
    rocket,
    new THREE.CylinderGeometry(0.33, 0.33, 0.08, 24),
    materials.sky,
    [0, 2.65, 0],
  );

  const payload = new THREE.Group();
  payload.position.y = 3.92;
  rocket.add(payload);
  addMesh(
    payload,
    new THREE.BoxGeometry(0.34, 0.44, 0.34),
    materials.hull,
    [0, 0, 0],
    materials.wireCyan,
  );

  if (props.hasSCI) {
    const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), materials.sky);
    sensor.position.set(-0.2, -0.08, 0);
    payload.add(sensor);
  }
  if (props.hasCOM) {
    [-0.62, 0.62].forEach((x) => {
      const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.025, 0.28), materials.emerald);
      solarPanel.position.set(x, 0, 0);
      payload.add(solarPanel);
    });
  }

  addMesh(
    rocket,
    new THREE.ConeGeometry(0.38, 0.96, 28),
    materials.fairing,
    [0, 4.62, 0],
    materials.wireCyan,
  );

  if (props.hasEST) {
    [-0.58, 0.58].forEach((x) => {
      addMesh(
        rocket,
        new THREE.CylinderGeometry(0.15, 0.15, 1.9, 24),
        materials.hull,
        [x, 1.56, 0],
        materials.wireAmber,
      );
      addMesh(
        rocket,
        new THREE.ConeGeometry(0.15, 0.34, 24),
        materials.sky,
        [x, 2.68, 0],
      );
    });
  }

  const launchFlames: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }[] = [];
  if (props.launching) {
    const addFlame = (x: number, y: number, radius: number, height: number, color: number) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 20), material);
      mesh.position.set(x, y, 0);
      rocket.add(mesh);
      launchFlames.push({ mesh, material });
    };

    addFlame(0, -0.21, 0.16, 0.72, 0xf97316);
    addFlame(0, -0.16, 0.08, 0.5, 0xfef08a);
    if (props.hasEST) {
      [-0.58, 0.58].forEach((x) => {
        addFlame(x, 0.335, 0.1, 0.55, 0xfb923c);
      });
    }
  }

  const gantry = new THREE.Group();
  gantry.position.x = -1.35;
  const mast = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.28, 4.2, 0.28)),
    new THREE.LineBasicMaterial({ color: 0x334155 }),
  );
  mast.position.y = 2.1;
  gantry.add(mast);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), materials.hull);
  arm.position.set(0.55, 3.1, 0.12);
  arm.add(new THREE.LineSegments(new THREE.EdgesGeometry(arm.geometry), materials.wireCyan));
  gantry.add(arm);
  scene.add(gantry);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let launchTime = 0;
  return (delta) => {
    if (!props.launching) return;

    if (reducedMotion) {
      launchFlames.forEach(({ material }) => {
        material.opacity = 0.78;
      });
      return;
    }

    launchTime += delta;
    if (launchTime < 0.7) {
      rocket.position.x = Math.sin(launchTime * 62) * 0.035;
      rocket.rotation.z = Math.sin(launchTime * 57) * 0.012;
    } else {
      const ascent = Math.min(1, (launchTime - 0.7) / 2.2);
      rocket.position.y = ascent * 6;
      rocket.position.x = Math.sin(launchTime * 15) * 0.025 * (1 - ascent);
      rocket.rotation.z = Math.sin(launchTime * 13) * 0.004 * (1 - ascent);
    }

    const flamePulse = (Math.sin(launchTime * 44) + 1) / 2;
    launchFlames.forEach(({ mesh, material }, index) => {
      mesh.scale.y = 0.8 + flamePulse * (index === 1 ? 0.35 : 0.55);
      material.opacity = 0.66 + flamePulse * 0.3;
    });
  };
}

function createOrbiterScene(
  scene: THREE.Scene,
  materials: ModelMaterials,
  props: Pick<DesignModel3DProps, 'hasSCI' | 'hasCOM'>,
): SceneUpdate {
  const grid = new THREE.GridHelper(5, 12, 0x1e293b, 0x0f172a);
  grid.position.y = -1.15;
  scene.add(grid);

  const orbiter = addSatellite(materials, props);
  scene.add(orbiter);

  return () => {};
}

function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la textura del planeta.');

  context.fillStyle = '#071122';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  context.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 64) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 64) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  const continents = [
    [[135, 88], [255, 78], [295, 145], [242, 212], [210, 238], [172, 185]],
    [[260, 255], [328, 275], [348, 348], [302, 438], [276, 422], [254, 322]],
    [[468, 94], [562, 84], [578, 152], [492, 166], [464, 132]],
    [[474, 180], [576, 184], [608, 268], [556, 378], [512, 362], [464, 256]],
    [[586, 84], [824, 94], [858, 188], [768, 246], [646, 226], [590, 166]],
    [[766, 316], [858, 316], [868, 386], [776, 392]],
  ];
  continents.forEach((continent) => {
    context.beginPath();
    continent.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = 'rgba(14, 116, 144, 0.34)';
    context.fill();
    context.strokeStyle = '#38bdf8';
    context.lineWidth = 1.75;
    context.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createOrbitScene(
  scene: THREE.Scene,
  materials: ModelMaterials,
  props: Pick<DesignModel3DProps, 'hasSCI' | 'hasCOM'>,
  textures: THREE.Texture[],
): SceneUpdate {
  const starPositions = new Float32Array(220 * 3);
  for (let i = 0; i < starPositions.length; i += 3) {
    const radius = 10 + Math.random() * 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i + 1] = radius * Math.cos(phi);
    starPositions[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(
    new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.12, transparent: true, opacity: 0.45 }),
    ),
  );

  const earthRadius = 2.35;
  const earthTexture = createEarthTexture();
  textures.push(earthTexture);
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(earthRadius, 64, 64),
    new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.68,
      metalness: 0.18,
      emissive: 0x082f49,
      emissiveIntensity: 0.42,
    }),
  );
  earth.castShadow = true;
  earth.receiveShadow = true;
  scene.add(earth);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(earthRadius * 1.065, 64, 64),
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

  const lat = (35.247 * Math.PI) / 180;
  const lon = (-116.793 * Math.PI) / 180;
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x10b981 }),
  );
  marker.position.set(
    -Math.cos(lat) * Math.cos(lon) * (earthRadius + 0.02),
    Math.sin(lat) * (earthRadius + 0.02),
    Math.cos(lat) * Math.sin(lon) * (earthRadius + 0.02),
  );
  earth.add(marker);

  const scanFootprintMaterial = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: props.hasSCI ? 0.36 : 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const scanFootprint = new THREE.Mesh(new THREE.CircleGeometry(0.46, 48), scanFootprintMaterial);
  const scanOutline = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.5, 48),
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: props.hasSCI ? 0.95 : 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  earth.add(scanFootprint, scanOutline);

  const maxTrailPoints = 180;
  const scanTrailGeometry = new THREE.BufferGeometry();
  const scanTrailPositions = new Float32Array(maxTrailPoints * 3);
  const scanTrailAttribute = new THREE.BufferAttribute(scanTrailPositions, 3);
  scanTrailAttribute.setUsage(THREE.DynamicDrawUsage);
  scanTrailGeometry.setAttribute('position', scanTrailAttribute);
  scanTrailGeometry.setDrawRange(0, 0);
  const scanTrail = new THREE.Line(
    scanTrailGeometry,
    new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
  );
  scanTrail.renderOrder = 1;
  scanTrail.frustumCulled = false;
  earth.add(scanTrail);
  const scanTrailPoints: THREE.Vector3[] = [];

  const orbitPlane = new THREE.Group();
  orbitPlane.rotation.z = 1.36;
  scene.add(orbitPlane);
  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.15, 0.015, 12, 128),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 }),
  );
  orbitRing.rotation.x = Math.PI / 2;
  orbitPlane.add(orbitRing);

  const satellite = addSatellite(materials, props);
  satellite.scale.setScalar(0.72);
  orbitPlane.add(satellite);

  const scanBeamMaterial = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: props.hasSCI ? 0.28 : 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const scanBeam = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 1, 32, 1, true),
    scanBeamMaterial,
  );
  scanBeam.renderOrder = 2;
  scanBeam.scale.x = 1 / satellite.scale.x;
  scanBeam.scale.z = 1 / satellite.scale.z;
  satellite.add(scanBeam);

  let downlink: THREE.Line | null = null;
  if (props.hasCOM) {
    downlink = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.9 }),
    );
    scene.add(downlink);
  }

  const satellitePosition = new THREE.Vector3();
  const stationPosition = new THREE.Vector3();
  const scanTargetWorld = new THREE.Vector3();
  const scanTargetLocal = new THREE.Vector3();
  const scanTargetInSatellite = new THREE.Vector3();
  const scanDirection = new THREE.Vector3();
  const scanDirectionInSatellite = new THREE.Vector3();
  const scanNormalLocal = new THREE.Vector3();
  const coneAxis = new THREE.Vector3(0, 1, 0);
  let lastTrailPoint: THREE.Vector3 | null = null;
  let orbitAngle = 0.8;
  let scanTime = 0;
  return (delta) => {
    earth.rotation.y += delta * 0.085;
    orbitAngle += delta * 0.3;
    satellite.position.set(Math.cos(orbitAngle) * 4.15, 0, Math.sin(orbitAngle) * 4.15);
    satellite.lookAt(0, 0, 0);
    satellite.rotateX(Math.PI / 2);

    satellite.getWorldPosition(satellitePosition);
    scanDirection.copy(satellitePosition).normalize();
    scanTargetWorld.copy(scanDirection).multiplyScalar(earthRadius + 0.02);
    scanTargetInSatellite.copy(scanTargetWorld);
    satellite.worldToLocal(scanTargetInSatellite);
    scanBeam.position.copy(scanTargetInSatellite).multiplyScalar(0.5);
    scanBeam.scale.y = scanTargetInSatellite.length();
    scanDirectionInSatellite.copy(scanTargetInSatellite).normalize();
    scanBeam.quaternion.setFromUnitVectors(coneAxis, scanDirectionInSatellite);

    scanTargetLocal.copy(scanTargetWorld);
    earth.worldToLocal(scanTargetLocal);
    scanNormalLocal.copy(scanTargetLocal).normalize();
    scanFootprint.position.copy(scanNormalLocal).multiplyScalar(earthRadius + 0.025);
    scanFootprint.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      scanNormalLocal,
    );
    scanOutline.position.copy(scanFootprint.position);
    scanOutline.quaternion.copy(scanFootprint.quaternion);
    if (!lastTrailPoint || scanFootprint.position.distanceTo(lastTrailPoint) > 0.055) {
      const trailPoint = scanFootprint.position.clone();
      scanTrailPoints.push(trailPoint);
      if (scanTrailPoints.length > maxTrailPoints) scanTrailPoints.shift();
      scanTrailPoints.forEach((point, index) => {
        scanTrailPositions[index * 3] = point.x;
        scanTrailPositions[index * 3 + 1] = point.y;
        scanTrailPositions[index * 3 + 2] = point.z;
      });
      scanTrailAttribute.needsUpdate = true;
      scanTrailGeometry.setDrawRange(0, scanTrailPoints.length);
      lastTrailPoint = trailPoint;
    }
    scanTime += delta;
    const pulse = (Math.sin(scanTime * 5) + 1) / 2;
    scanFootprint.scale.setScalar(0.8 + pulse * 0.3);
    scanOutline.scale.setScalar(0.9 + pulse * 0.25);
    scanBeamMaterial.opacity = (props.hasSCI ? 0.25 : 0.17) + pulse * (props.hasSCI ? 0.14 : 0.1);

    if (downlink) {
      marker.getWorldPosition(stationPosition);
      downlink.geometry.setFromPoints([satellitePosition, stationPosition]);
    }
  };
}

export function DesignModel3D({
  view,
  hasEST,
  hasSCI,
  hasCOM,
  resetKey,
  launching = false,
  className = 'h-[280px] w-[280px] max-w-full drop-shadow-[0_0_12px_rgba(56,189,248,0.15)]',
}: DesignModel3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    if (view === 0) {
      camera.position.set(6.2, 4.8, 8.6);
      camera.lookAt(0, 2.5, 0);
    } else if (view === 1) {
      camera.position.set(4.6, 2.6, 6.6);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(2.4, 3.4, 14.2);
      camera.lookAt(0, 0, 0);
    }

    scene.add(new THREE.AmbientLight(0x94a3b8, 1.3));
    const keyLight = new THREE.DirectionalLight(0xf0f9ff, 1.85);
    keyLight.position.set(8, 14, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-8, 6, -9);
    scene.add(rimLight);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.rotateSpeed = 0.75;
    controls.minDistance = view === 0 ? 4.5 : view === 1 ? 2.8 : 8;
    controls.maxDistance = view === 2 ? 22 : 18;
    controls.target.set(0, view === 0 ? 2.5 : 0, 0);
    controls.update();
    controls.addEventListener('start', () => {
      renderer.domElement.style.cursor = 'grabbing';
    });
    controls.addEventListener('end', () => {
      renderer.domElement.style.cursor = 'grab';
    });

    const materials = createMaterials();
    const textures: THREE.Texture[] = [];
    let updateScene: SceneUpdate;
    if (view === 0) {
      updateScene = createRocketScene(scene, materials, { hasEST, hasSCI, hasCOM, launching });
    } else if (view === 1) {
      updateScene = createOrbiterScene(scene, materials, { hasSCI, hasCOM });
    } else {
      updateScene = createOrbitScene(scene, materials, { hasSCI, hasCOM }, textures);
    }

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let previousFrameTime: number | null = null;
    let frameId = 0;
    const animate = (time: number) => {
      frameId = window.requestAnimationFrame(animate);
      const delta = previousFrameTime === null ? 0 : (time - previousFrameTime) / 1000;
      previousFrameTime = time;
      updateScene(delta);
      controls.update();
      renderer.render(scene, camera);
    };
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
          objectMaterials.forEach((material) => material.dispose());
        }
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [hasCOM, hasEST, hasSCI, launching, resetKey, view]);

  const labels = ['lanzador', 'orbitador', 'planeta, orbitador y haz de escaneo'];
  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={`Modelo 3D del ${labels[view] ?? 'diseño de misión'}`}
    />
  );
}
