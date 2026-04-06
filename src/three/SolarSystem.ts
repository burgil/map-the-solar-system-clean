import * as THREE from 'three';
import {
  createFresnelMaterial,
  createSunCoronaMaterial,
  createRingMaterial,
  createChromosphereMaterial,
  createEnhancedCoronaMaterial,
} from './shaders';

// Astronomical Unit in our scene scale (1 AU = 100 units)
export const AU = 100;

// Planet data with real relative sizes and distances
export interface PlanetData {
  name: string;
  radius: number;
  distance: number; // from sun in AU
  orbitalPeriod: number; // in Earth years
  rotationPeriod: number; // in Earth days
  axialTilt: number; // in degrees
  color: number;
  textureUrl?: string;
  bumpUrl?: string;
  specularUrl?: string; // Specular/gloss map
  lightsUrl?: string; // City lights texture (for night side)
  cloudsUrl?: string; // Clouds texture
  cloudsAlphaUrl?: string; // Clouds transparency map
  hasRings?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  ringColor?: number;
  ringTextureUrl?: string;
  moons?: MoonData[];
  atmosphere?: {
    color: number;
    opacity: number;
  };
}

interface MoonData {
  name: string;
  radius: number;
  distance: number;
  orbitalPeriod: number;
  color: number;
  textureUrl?: string;
  bumpUrl?: string;
}

// Solar system data (scaled for visibility)
const PLANETS: PlanetData[] = [
  {
    name: 'Mercury',
    radius: 0.38,
    distance: 0.5,  // Increased from 0.39 to prevent sun clipping
    orbitalPeriod: 0.24,
    rotationPeriod: 58.6,
    axialTilt: 0.03,
    color: 0x8c8c8c,
    textureUrl: '/textures/solar/mercury.jpg',
  },
  {
    name: 'Venus',
    radius: 0.95,
    distance: 0.72,
    orbitalPeriod: 0.62,
    rotationPeriod: -243,
    axialTilt: 177.4,
    color: 0xe6c27a,
    textureUrl: '/textures/solar/venus.jpg',
    atmosphere: { color: 0xffd699, opacity: 0.3 },
  },
  {
    name: 'Earth',
    radius: 1,
    distance: 1,
    orbitalPeriod: 1,
    rotationPeriod: 1,
    axialTilt: 23.4,
    color: 0x6b93d6,
    textureUrl: '/textures/solar/earth.jpg',
    lightsUrl: '/textures/03_earthlights1k.jpg',  // City lights on night side
    cloudsUrl: '/textures/solar/earth_clouds.jpg',
    atmosphere: { color: 0x88ccff, opacity: 0.2 },
    moons: [
      {
        name: 'Moon',
        radius: 0.27,
        distance: 0.025,
        orbitalPeriod: 0.075,
        color: 0xaaaaaa,
        textureUrl: '/textures/solar/moon.jpg',
      },
    ],
  },
  {
    name: 'Mars',
    radius: 0.53,
    distance: 1.52,
    orbitalPeriod: 1.88,
    rotationPeriod: 1.03,
    axialTilt: 25.2,
    color: 0xc1440e,
    textureUrl: '/textures/solar/mars.jpg',
    moons: [
      { name: 'Phobos', radius: 0.05, distance: 0.006, orbitalPeriod: 0.03, color: 0x8b7355 },
      { name: 'Deimos', radius: 0.03, distance: 0.015, orbitalPeriod: 0.05, color: 0x8b7355 },
    ],
  },
  {
    name: 'Jupiter',
    radius: 11.2,
    distance: 5.2,
    orbitalPeriod: 11.86,
    rotationPeriod: 0.41,
    axialTilt: 3.1,
    color: 0xd8ca9d,
    textureUrl: '/textures/solar/jupiter.jpg',
    moons: [
      { name: 'Io', radius: 0.29, distance: 0.028, orbitalPeriod: 0.005, color: 0xffff66 },
      { name: 'Europa', radius: 0.25, distance: 0.045, orbitalPeriod: 0.01, color: 0xc9b896 },
      { name: 'Ganymede', radius: 0.41, distance: 0.072, orbitalPeriod: 0.02, color: 0x8b7355 },
      { name: 'Callisto', radius: 0.38, distance: 0.126, orbitalPeriod: 0.046, color: 0x555555 },
    ],
  },
  {
    name: 'Saturn',
    radius: 9.45,
    distance: 9.58,
    orbitalPeriod: 29.46,
    rotationPeriod: 0.45,
    axialTilt: 26.7,
    color: 0xead6b8,
    textureUrl: '/textures/solar/saturn.jpg',
    hasRings: true,
    ringInnerRadius: 12,
    ringOuterRadius: 22,
    ringColor: 0xd4b896,
    ringTextureUrl: '/textures/solar/saturn_ring.png',
    moons: [
      { name: 'Titan', radius: 0.4, distance: 0.082, orbitalPeriod: 0.044, color: 0xd4a574 },
      { name: 'Enceladus', radius: 0.04, distance: 0.016, orbitalPeriod: 0.004, color: 0xffffff },
      { name: 'Mimas', radius: 0.03, distance: 0.012, orbitalPeriod: 0.003, color: 0xcccccc },
    ],
  },
  {
    name: 'Uranus',
    radius: 4,
    distance: 19.22,
    orbitalPeriod: 84.01,
    rotationPeriod: -0.72,
    axialTilt: 97.8,
    color: 0xd1e7e7,
    textureUrl: '/textures/solar/uranus.jpg',
    hasRings: true,
    ringInnerRadius: 5,
    ringOuterRadius: 8,
    ringColor: 0x445566,
    moons: [
      { name: 'Miranda', radius: 0.04, distance: 0.009, orbitalPeriod: 0.004, color: 0x888888 },
      { name: 'Ariel', radius: 0.09, distance: 0.013, orbitalPeriod: 0.007, color: 0xaaaaaa },
      { name: 'Titania', radius: 0.12, distance: 0.029, orbitalPeriod: 0.024, color: 0x999999 },
    ],
  },
  {
    name: 'Neptune',
    radius: 3.88,
    distance: 30.05,
    orbitalPeriod: 164.8,
    rotationPeriod: 0.67,
    axialTilt: 28.3,
    color: 0x5b5ddf,
    textureUrl: '/textures/solar/neptune.jpg',
    moons: [
      { name: 'Triton', radius: 0.21, distance: 0.024, orbitalPeriod: -0.016, color: 0xd4c4b0 },
    ],
  },
  // Dwarf planets
  {
    name: 'Pluto',
    radius: 0.18,
    distance: 39.48,  // Average distance in AU
    orbitalPeriod: 248,
    rotationPeriod: -6.39,  // Retrograde rotation
    axialTilt: 122.5,
    color: 0xd4c4b0,
    textureUrl: '/textures/moonmap1k.jpg',  // Use moon texture as fallback
    moons: [
      { name: 'Charon', radius: 0.09, distance: 0.0012, orbitalPeriod: 0.017, color: 0x888888 },
    ],
  },
  {
    name: 'Eris',
    radius: 0.18,
    distance: 67.78,
    orbitalPeriod: 558,
    rotationPeriod: 1.08,
    axialTilt: 78,
    color: 0xeeeeee,
  },
  {
    name: 'Makemake',
    radius: 0.11,
    distance: 45.79,
    orbitalPeriod: 310,
    rotationPeriod: 0.94,
    axialTilt: 0,
    color: 0xd4a574,
  },
  {
    name: 'Haumea',
    radius: 0.12,
    distance: 43.13,
    orbitalPeriod: 284,
    rotationPeriod: 0.16,  // Very fast rotator
    axialTilt: 126,
    color: 0xffffff,
    hasRings: true,
    ringInnerRadius: 0.15,
    ringOuterRadius: 0.2,
    ringColor: 0x888888,
  },
];

// Asteroid belt parameters


// Kuiper belt parameters


export interface CelestialObject {
  name: string;
  mesh: THREE.Object3D;
  orbitGroup: THREE.Group;
  updateFn?: (time: number, delta: number) => void;
}

export class SolarSystem {
  scene: THREE.Scene;
  objects: Map<string, CelestialObject> = new Map();
  sun!: THREE.Mesh;
  sunLight!: THREE.PointLight;
  coronaMaterials: THREE.ShaderMaterial[] = [];
  loader: THREE.TextureLoader;

  private time = 0;
  private timeScale = 0.00084; // Default simulation speed - slow but visible motion

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new THREE.TextureLoader();

    this.createSun();
    this.createPlanets();
    this.createStarfield();
  }

  private createSun(): void {
    const sunGroup = new THREE.Group();
    sunGroup.name = 'Sun';

    // Sun geometry - radius 30 to be visibly larger than Jupiter (11.2)
    // Real Sun:Jupiter ratio is ~10:1, using 30:11 ≈ 3:1 to avoid Mercury orbit collision
    const sunRadius = 30;
    const sunGeometry = new THREE.SphereGeometry(sunRadius, 128, 128);

    // Load sun texture
    const sunTexture = this.loader.load('/textures/solar/sun.jpg');
    sunTexture.colorSpace = THREE.SRGBColorSpace;

    // Sun surface with texture - emissive so it glows
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: sunTexture,
      // MeshBasicMaterial doesn't need lighting
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sunGroup.add(this.sun);

    // Chromosphere - thin reddish layer (visible at edges)
    const chromosphereMaterial = createChromosphereMaterial();
    this.coronaMaterials.push(chromosphereMaterial);
    const chromosphere = new THREE.Mesh(sunGeometry, chromosphereMaterial);
    chromosphere.scale.setScalar(1.01);
    sunGroup.add(chromosphere);

    // Inner corona (close to surface)
    const innerCoronaMaterial = createSunCoronaMaterial();
    this.coronaMaterials.push(innerCoronaMaterial);
    const innerCorona = new THREE.Mesh(sunGeometry, innerCoronaMaterial);
    innerCorona.scale.setScalar(1.1);
    sunGroup.add(innerCorona);

    // Enhanced outer corona with streamers
    const enhancedCoronaMaterial = createEnhancedCoronaMaterial();
    this.coronaMaterials.push(enhancedCoronaMaterial);

    const coronaScales = [1.3, 1.5, 1.8, 2.2, 2.8];
    coronaScales.forEach(scale => {
      const corona = new THREE.Mesh(sunGeometry, enhancedCoronaMaterial.clone());
      corona.scale.setScalar(scale);
      this.coronaMaterials.push(corona.material as THREE.ShaderMaterial);
      sunGroup.add(corona);
    });

    // Outer glow (fresnel effect) - use warm facing color to avoid dark center
    const glowMaterial = createFresnelMaterial({
      rimHex: 0xffaa22,
      facingHex: 0xff6600,  // Warm orange instead of near-black
      fresnelPower: 1.5,
    });
    const glowMesh = new THREE.Mesh(sunGeometry, glowMaterial);
    glowMesh.scale.setScalar(3.0);
    sunGroup.add(glowMesh);

    // Additional soft outer glow
    const softGlowMaterial = createFresnelMaterial({
      rimHex: 0xff6600,
      facingHex: 0x331100,  // Dim orange instead of pure black
      fresnelPower: 2.5,
    });
    const softGlowMesh = new THREE.Mesh(sunGeometry, softGlowMaterial);
    softGlowMesh.scale.setScalar(4.0);
    sunGroup.add(softGlowMesh);

    // Directional light from sun (like old project - no shadows, better lighting)
    const sunDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.2);  // Reduced from 2.5
    sunDirectionalLight.position.set(0, 0, 0);
    this.scene.add(sunDirectionalLight);

    // Point light for local illumination near sun
    this.sunLight = new THREE.PointLight(0xffffee, 40, 50000, 0.5);  // Reduced from 80
    sunGroup.add(this.sunLight);

    // Ambient light for overall scene visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);  // Reduced from 0.3
    this.scene.add(ambientLight);

    this.scene.add(sunGroup);

    this.objects.set('Sun', {
      name: 'Sun',
      mesh: sunGroup,
      orbitGroup: sunGroup,
    });
  }

  private createPlanets(): void {
    PLANETS.forEach(planetData => {
      const planetGroup = this.createPlanet(planetData);
      this.scene.add(planetGroup);
    });
  }

  private createPlanet(data: PlanetData): THREE.Group {
    const orbitGroup = new THREE.Group();
    orbitGroup.name = `${data.name} Orbit`;

    const planetGroup = new THREE.Group();
    planetGroup.name = data.name;

    // Planet radius (scaled for visibility, Earth = 1)
    const radius = data.radius * 3; // Increased scale factor for visibility
    const distance = data.distance * AU;

    // Position planet
    planetGroup.position.x = distance;

    // Planet geometry (higher detail for Earth like old project)
    const segments = data.name === 'Earth' ? 128 : 64;
    const geometry = new THREE.SphereGeometry(radius, segments, segments);

    // Planet material and mesh (declared outside blocks for later access)
    let material: THREE.Material;
    let planetMesh: THREE.Mesh;

    if (data.textureUrl) {
      const texture = this.loader.load(data.textureUrl);
      texture.colorSpace = THREE.SRGBColorSpace;

      const materialOptions: THREE.MeshPhongMaterialParameters = {
        map: texture,
        bumpScale: 0.04,
      };

      // Apply color tint for planets using fallback textures (like Mars using moon texture)
      // Mars specifically needs red tinting since it uses moon texture
      if (data.name === 'Mars' && data.color) {
        materialOptions.color = new THREE.Color(data.color);
      }

      if (data.bumpUrl) {
        materialOptions.bumpMap = this.loader.load(data.bumpUrl);
      }

      if (data.specularUrl) {
        materialOptions.specularMap = this.loader.load(data.specularUrl);
      }

      material = new THREE.MeshPhongMaterial(materialOptions);

      planetMesh = new THREE.Mesh(geometry, material);
      planetMesh.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
      planetGroup.add(planetMesh);

      // City lights layer (like old project - additive blending shows on dark side naturally)
      if (data.lightsUrl) {
        const lightsTexture = this.loader.load(data.lightsUrl);
        const lightsMat = new THREE.MeshBasicMaterial({
          map: lightsTexture,
          blending: THREE.AdditiveBlending,
        });
        const lightsMesh = new THREE.Mesh(geometry, lightsMat);
        lightsMesh.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
        planetGroup.add(lightsMesh);

        (planetGroup as THREE.Object3D & { lightsMesh?: THREE.Mesh }).lightsMesh = lightsMesh;
      }
    } else {
      // Use color for planets without textures
      material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.7,
        metalness: 0.2,
      });

      planetMesh = new THREE.Mesh(geometry, material);
      planetMesh.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
      planetGroup.add(planetMesh);
    }

    // Clouds layer (for Earth)
    if (data.cloudsUrl) {
      const cloudsTexture = this.loader.load(data.cloudsUrl);
      const cloudsMaterialOptions: THREE.MeshStandardMaterialParameters = {
        map: cloudsTexture,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      };

      if (data.cloudsAlphaUrl) {
        cloudsMaterialOptions.alphaMap = this.loader.load(data.cloudsAlphaUrl);
      }

      const cloudsMat = new THREE.MeshStandardMaterial(cloudsMaterialOptions);
      const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
      cloudsMesh.scale.setScalar(1.003);
      cloudsMesh.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
      planetGroup.add(cloudsMesh);

      // Store clouds mesh for rotation sync
      (planetGroup as THREE.Object3D & { cloudsMesh?: THREE.Mesh }).cloudsMesh = cloudsMesh;
    }

    // Atmosphere
    if (data.atmosphere) {
      const atmosMaterial = createFresnelMaterial({
        rimHex: data.atmosphere.color,
        facingHex: 0x000000,
        fresnelPower: 3.0,
      });
      const atmosMesh = new THREE.Mesh(geometry, atmosMaterial);
      atmosMesh.scale.setScalar(1.01);
      planetGroup.add(atmosMesh);
    }

    // Rings - scale to match planet (radius is in same units as planet radius)
    if (data.hasRings && data.ringInnerRadius && data.ringOuterRadius) {
      const ringGeometry = new THREE.RingGeometry(
        data.ringInnerRadius * 3,  // Match planet scale factor
        data.ringOuterRadius * 3,  // Match planet scale factor
        128
      );

      // Fix UV mapping for ring texture (map radius to UV)
      const pos = ringGeometry.attributes.position;
      const uv = ringGeometry.attributes.uv;
      const innerR = data.ringInnerRadius * 3;
      const outerR = data.ringOuterRadius * 3;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const r = Math.sqrt(x * x + y * y);
        const u = (r - innerR) / (outerR - innerR);
        uv.setXY(i, u, 0.5);
      }

      let ringMaterial: THREE.Material;
      if (data.ringTextureUrl) {
        const ringTexture = this.loader.load(data.ringTextureUrl);
        ringTexture.colorSpace = THREE.SRGBColorSpace;
        ringMaterial = new THREE.MeshBasicMaterial({
          map: ringTexture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        });
      } else {
        ringMaterial = createRingMaterial(
          data.ringColor || 0xd4b896,
          0x886644
        );
      }

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
      planetGroup.add(ring);
    }

    // Moons
    if (data.moons) {
      data.moons.forEach(moonData => {
        const moonOrbit = new THREE.Group();
        const moonRadius = moonData.radius * 3; // Match planet scale
        // Moon distance needs to be relative to planet size, not in AU
        // The distance values in data are in AU but we need them scaled for visibility
        // Use planet radius as base and add moon distance scaled appropriately
        const planetRadius = data.radius * 3;
        const moonDistance = planetRadius + (moonData.distance * 500); // Distance from planet surface

        const moonGeometry = new THREE.SphereGeometry(moonRadius, 32, 32);

        let moonMaterial: THREE.Material;
        if (moonData.textureUrl) {
          const moonTexture = this.loader.load(moonData.textureUrl);
          moonTexture.colorSpace = THREE.SRGBColorSpace;

          const moonMatOptions: THREE.MeshStandardMaterialParameters = {
            map: moonTexture,
            roughness: 0.9,
          };

          if (moonData.bumpUrl) {
            moonMatOptions.bumpMap = this.loader.load(moonData.bumpUrl);
            moonMatOptions.bumpScale = 0.02;
          }

          moonMaterial = new THREE.MeshStandardMaterial(moonMatOptions);
        } else {
          moonMaterial = new THREE.MeshStandardMaterial({
            color: moonData.color,
            roughness: 0.9,
          });
        }

        const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
        moonMesh.position.x = moonDistance;

        moonOrbit.add(moonMesh);
        planetGroup.add(moonOrbit);

        // Store moon reference
        this.objects.set(`${data.name}/${moonData.name}`, {
          name: moonData.name,
          mesh: moonMesh,
          orbitGroup: moonOrbit,
          updateFn: (time) => {
            // Moon orbital period is likely in Earth Years (consistent with planet orbits), not Days.
            const moonAngle = (time / moonData.orbitalPeriod) * Math.PI * 2;
            moonOrbit.rotation.y = moonAngle;
          },
        });
      });
    }

    // Create orbit path - always visible, higher opacity for visibility
    const orbitCurve = new THREE.EllipseCurve(0, 0, distance, distance, 0, Math.PI * 2, false, 0);
    const orbitPoints = orbitCurve.getPoints(128);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
      orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0x6688aa,
      transparent: true,
      opacity: 0.6,
    });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    orbitLine.frustumCulled = false; // Always render orbit paths
    orbitGroup.add(orbitLine);

    orbitGroup.add(planetGroup);

    // Store planet reference
    this.objects.set(data.name, {
      name: data.name,
      mesh: planetMesh,
      orbitGroup: orbitGroup,
      updateFn: (time) => {
        // Orbital motion
        const angle = (time / data.orbitalPeriod) * Math.PI * 2;
        planetGroup.position.x = Math.cos(angle) * distance;
        planetGroup.position.z = Math.sin(angle) * distance;

        // Rotation
        if (data.rotationPeriod !== 0) {
          // Convert rotation period from days to years (365.25 days/year)
          const rotationAngle = (time / (Math.abs(data.rotationPeriod) / 365.25)) * Math.PI * 2 * Math.sign(data.rotationPeriod);
          planetMesh.rotation.y = rotationAngle;

          // Rotate lights mesh in sync with planet
          const pg = planetGroup as THREE.Object3D & { lightsMesh?: THREE.Mesh; cloudsMesh?: THREE.Mesh };
          if (pg.lightsMesh) {
            pg.lightsMesh.rotation.y = rotationAngle;
          }

          // Rotate clouds slightly differently (slightly faster to simulate wind)
          if (pg.cloudsMesh) {
            pg.cloudsMesh.rotation.y = rotationAngle * 1.002;
          }
        }
      },
    });

    return orbitGroup;
  }

  private createStarfield(): void {
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Random position on a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 5000 + Math.random() * 3000;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random star colors (mostly white, some blue, yellow, red)
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.8) {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.9) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 0.7;
      } else {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 0.7;
      }

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(geometry, material);
    stars.name = 'Starfield';
    this.scene.add(stars);
  }

  update(delta: number): void {
    this.time += delta * this.timeScale;

    // Update corona shader time - use real time for sun animation, not simulation time
    // This keeps sun effects animating even when simulation is paused
    const sunAnimTime = performance.now() * 0.0001;  // Slow animation
    this.coronaMaterials.forEach(mat => {
      if (mat.uniforms?.time) {
        mat.uniforms.time.value = sunAnimTime;
      }
    });

    // Update all objects
    this.objects.forEach(obj => {
      obj.updateFn?.(this.time, delta);
    });
  }

  setTimeScale(scale: number): void {
    this.timeScale = scale;
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  getSimulatedTime(): number {
    return this.time;
  }

  getPosition(name: string): THREE.Vector3 | null {
    const obj = this.objects.get(name);
    if (!obj) return null;

    const position = new THREE.Vector3();
    obj.mesh.getWorldPosition(position);
    return position;
  }

  getObject(name: string): CelestialObject | undefined {
    return this.objects.get(name);
  }

  getAllNames(): string[] {
    return Array.from(this.objects.keys());
  }
}
