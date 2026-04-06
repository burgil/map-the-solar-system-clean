import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { SolarSystem, AU } from './SolarSystem';
import { BlackHole } from './BlackHole';
import { Galaxy } from './Galaxy';
import { Multiverse } from './Multiverse';
import { Label3DSystem } from './Label3D';
import { FlyControls } from './FlyControls';
import { SolarFlares } from './SolarFlares';
import { PostProcessing, createSunLensFlare } from './PostProcessing';
// Boundary distance for multiverse transition
const MULTIVERSE_BOUNDARY = 120000; // Match SKYBOX_RADIUS for seamless transition
const SKYBOX_RADIUS = 120000; // Just inside the multiverse boundary
const GALACTIC_CENTER_Z = -26000; // Distance to galactic center from solar system (at 0,0,0)

export interface SceneConfig {
  container: HTMLElement;
  onObjectSelected?: (name: string, position: THREE.Vector3) => void;
  onControlsLocked?: (locked: boolean) => void;
  onTrackingChange?: (isTracking: boolean, target: string | null) => void;
}

export class SceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: FlyControls;
  private clock: THREE.Clock;
  private stats: Stats;

  private solarSystem: SolarSystem;
  private blackHole: BlackHole;
  private galaxy: Galaxy;
  private labelSystem: Label3DSystem;
  private solarFlares: SolarFlares;
  private postProcessing: PostProcessing;
  private sunLensFlare: { lensflare: THREE.Object3D; light: THREE.PointLight } | null = null;

  // Universe skybox
  private universeSkybox: THREE.Mesh | null = null;
  private textureLoader: THREE.TextureLoader;

  // Multiverse
  private multiverse: Multiverse;
  private inMultiverse = false;

  private isRunning = false;
  private animationId: number | null = null;

  // Post-processing toggle
  private usePostProcessing = true;

  // Frustum culling for entire scene
  private frustum = new THREE.Frustum();
  private frustumMatrix = new THREE.Matrix4();
  private useFrustumCulling = true;
  private freeze = false;

  // Tracking mode
  private trackingTarget: string | null = null;
  private trackingOffset: THREE.Vector3 = new THREE.Vector3(0, 20, 50);

  // Callbacks
  private onObjectSelected?: (name: string, position: THREE.Vector3) => void;
  private onControlsLocked?: (locked: boolean) => void;
  private onTrackingChange?: (isTracking: boolean, target: string | null) => void;

  constructor(config: SceneConfig) {
    this.container = config.container;
    this.onObjectSelected = config.onObjectSelected;
    this.onControlsLocked = config.onControlsLocked;
    this.onTrackingChange = config.onTrackingChange;

    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000005);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500000 // Extended far plane for galaxy and distant objects
    );
    this.camera.position.set(0, 50, 200);
    this.camera.lookAt(0, 0, 0);

    // Renderer - disable shadows to avoid Earth shadow issues
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    // FPS Stats
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.top = '0px';
    this.stats.dom.style.left = '0px';
    this.container.appendChild(this.stats.dom);

    // Clock
    this.clock = new THREE.Clock();

    // Texture loader
    this.textureLoader = new THREE.TextureLoader();

    // Controls
    this.controls = new FlyControls(this.camera, this.renderer.domElement);
    // Note: movement speed is set in FlyControls.ts (movementSpeed property)
    this.controls.onLock = () => this.onControlsLocked?.(true);
    this.controls.onUnlock = () => this.onControlsLocked?.(false);
    this.controls.onUserInput = () => this.stopTracking();  // Break tracking on user input

    // Create solar system
    console.time('⏱️ SceneController: SolarSystem');
    this.solarSystem = new SolarSystem(this.scene);
    console.timeEnd('⏱️ SceneController: SolarSystem');

    // Create solar flares (particle explosions from the sun)
    console.time('⏱️ SceneController: SolarFlares');
    this.solarFlares = new SolarFlares(this.scene, new THREE.Vector3(0, 0, 0));
    console.timeEnd('⏱️ SceneController: SolarFlares');

    // Create black hole (at galactic center)
    console.time('⏱️ SceneController: BlackHole');
    this.blackHole = new BlackHole(
      this.scene,
      new THREE.Vector3(0, 0, GALACTIC_CENTER_Z),
      2000
    );
    console.timeEnd('⏱️ SceneController: BlackHole');

    // Create galaxy centered on the black hole
    // The Solar System is at (0,0,0), so it will be ~26k units from the center, placing it in a spiral arm
    console.time('⏱️ SceneController: Galaxy');
    this.galaxy = new Galaxy(this.scene, new THREE.Vector3(0, 0, GALACTIC_CENTER_Z));
    console.timeEnd('⏱️ SceneController: Galaxy');

    // Create multiverse (hidden until camera goes beyond boundary)
    console.time('⏱️ SceneController: Multiverse');
    this.multiverse = new Multiverse(this.scene);
    console.timeEnd('⏱️ SceneController: Multiverse');

    // Create universe edge skybox
    console.time('⏱️ SceneController: UniverseSkybox');
    this.createUniverseSkybox();
    console.timeEnd('⏱️ SceneController: UniverseSkybox');

    // Create label system (3D sprite-based labels)
    console.time('⏱️ SceneController: LabelSystem');
    this.labelSystem = new Label3DSystem(this.scene, this.camera);
    this.createLabels();
    console.timeEnd('⏱️ SceneController: LabelSystem');

    // Create post-processing (bloom effects)
    console.time('⏱️ SceneController: PostProcessing');
    this.postProcessing = new PostProcessing({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
    });
    console.timeEnd('⏱️ SceneController: PostProcessing');

    // Add lens flare to the sun
    console.time('⏱️ SceneController: LensFlare');
    this.sunLensFlare = createSunLensFlare(
      this.scene,
      new THREE.Vector3(0, 0, 0),
      new THREE.Color(0xffffee)
    );
    console.timeEnd('⏱️ SceneController: LensFlare');

    // Event listeners
    window.addEventListener('resize', this.handleResize);

    // Start animation
    console.log('🚀 SceneController: Constructor complete, starting animation loop');
    this.start();
  }

  private createUniverseSkybox(): void {
    // Create a massive sphere with the universe texture on the inside
    const skyboxGeometry = new THREE.SphereGeometry(SKYBOX_RADIUS, 64, 64);

    // Load the logarithmic universe texture
    const universeTexture = this.textureLoader.load(
      '/textures/Photoshoped_Logarhitmic_radial_photo_of_the_universe_by_pablo_budassi_9MFK.png',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        console.log('Universe skybox texture loaded');
      },
      undefined,
      (err) => console.error('Failed to load universe texture:', err)
    );

    const skyboxMaterial = new THREE.MeshBasicMaterial({
      map: universeTexture,
      side: THREE.BackSide, // Render on the inside of the sphere
      fog: false,
    });

    this.universeSkybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    this.universeSkybox.name = 'UniverseSkybox';
    this.universeSkybox.renderOrder = -1000; // Render first (behind everything)
    this.scene.add(this.universeSkybox);
  }

  private createLabels(): void {
    // Sun label
    this.labelSystem.createLabel({
      name: 'Sun',
      position: new THREE.Vector3(0, 20, 0),
      type: 'star',
    });

    // Planet labels (including dwarf planets)
    const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Eris', 'Makemake', 'Haumea'];
    planets.forEach(name => {
      const position = this.solarSystem.getPosition(name);
      if (position) {
        position.y += 8;
        this.labelSystem.createLabel({
          name,
          position,
          type: 'planet',
        });
      }
    });

    // Moon labels for major moons
    const moons = [
      { planet: 'Earth', moon: 'Moon' },
      { planet: 'Mars', moon: 'Phobos' },
      { planet: 'Mars', moon: 'Deimos' },
      { planet: 'Jupiter', moon: 'Io' },
      { planet: 'Jupiter', moon: 'Europa' },
      { planet: 'Jupiter', moon: 'Ganymede' },
      { planet: 'Jupiter', moon: 'Callisto' },
      { planet: 'Saturn', moon: 'Titan' },
      { planet: 'Saturn', moon: 'Enceladus' },
    ];
    moons.forEach(({ planet, moon }) => {
      const moonObj = this.solarSystem.getObject(`${planet}/${moon}`);
      if (moonObj) {
        this.labelSystem.createLabel({
          name: moon,
          position: moonObj.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)),
          type: 'moon',
          color: 0xaaaaaa,
        });
      }
    });

    // Region labels
    this.labelSystem.createLabel({
      name: 'Main Asteroid Belt',
      position: new THREE.Vector3(2.7 * AU, 30, 0),
      type: 'region',
      color: 0x888888,
    });

    this.labelSystem.createLabel({
      name: 'Kuiper Belt',
      position: new THREE.Vector3(40 * AU, 80, 0),
      type: 'region',
      color: 0x666688,
    });

    // Saturn's rings label
    const saturnPos = this.solarSystem.getPosition('Saturn');
    if (saturnPos) {
      this.labelSystem.createLabel({
        name: "Saturn's Rings",
        position: saturnPos.clone().add(new THREE.Vector3(50, 5, 0)),
        type: 'region',
        color: 0xd4b896,
      });
    }

    this.labelSystem.createLabel({
      name: 'Black Hole',
      position: this.blackHole.getPosition().clone().add(new THREE.Vector3(0, 100, 0)),
      type: 'blackhole',
    });
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.postProcessing.setSize(width, height);
  };

  flyTo(name: string): void {
    // Handle Multiverse navigation
    if (name === 'Multiverse') {
      this.flyToMultiverse();
      return;
    }

    let targetPosition: THREE.Vector3 | null = null;

    if (name === 'BlackHole') {
      targetPosition = this.blackHole.getPosition();
      this.trackingOffset = new THREE.Vector3(0, 500, 2000);
    } else if (name === 'MainAsteroidBelt') {
      targetPosition = new THREE.Vector3(2.7 * AU, 0, 0);
      this.trackingTarget = null;  // Don't track belts
    } else if (name === 'KuiperBelt') {
      targetPosition = new THREE.Vector3(40 * AU, 0, 0);
      this.trackingTarget = null;  // Don't track belts
    } else {
      targetPosition = this.solarSystem.getPosition(name);
      // Set appropriate offset based on object size
      const obj = this.solarSystem.getObject(name);
      if (obj) {
        const scale = name === 'Sun' ? 100 : (name.includes('Jupiter') || name.includes('Saturn') ? 80 : 30);
        this.trackingOffset = new THREE.Vector3(0, scale * 0.5, scale);
      }
    }

    if (!targetPosition) return;

    // Enable tracking mode (except for belts)
    this.trackingTarget = name;
    if (name !== 'MainAsteroidBelt' && name !== 'KuiperBelt') {
      this.onTrackingChange?.(true, name);
    }

    // Animate camera position
    const startPosition = this.camera.position.clone();
    const duration = 2000;
    const startTime = performance.now();

    const animateFly = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease in-out
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Get updated target position (planet may have moved)
      let currentTarget = targetPosition!;
      if (this.trackingTarget === 'BlackHole') {
        currentTarget = this.blackHole.getPosition();
      } else if (this.trackingTarget) {
        const pos = this.solarSystem.getPosition(this.trackingTarget);
        if (pos) currentTarget = pos;
      }

      const currentCameraTarget = currentTarget.clone().add(this.trackingOffset);
      this.camera.position.lerpVectors(startPosition, currentCameraTarget, eased);
      this.camera.lookAt(currentTarget);

      if (progress < 1) {
        requestAnimationFrame(animateFly);
      } else {
        this.onObjectSelected?.(name, currentTarget);
      }
    };

    requestAnimationFrame(animateFly);
  }

  // Stop tracking and return to free flight
  stopTracking(): void {
    if (this.trackingTarget !== null) {
      this.trackingTarget = null;
      this.onTrackingChange?.(false, null);
    }
  }

  // Check if currently tracking
  isTracking(): boolean {
    return this.trackingTarget !== null;
  }

  // Get tracking target name
  getTrackingTarget(): string | null {
    return this.trackingTarget;
  }

  // Generic fly to position (helper for flyToMultiverse etc)
  // private flyToPosition(target: THREE.Vector3, offset: THREE.Vector3 = new THREE.Vector3(0, 20, 50)): void {
  //   this.stopTracking();

  //   const startPosition = this.camera.position.clone();
  //   const finalPosition = target.clone().add(offset);
  //   const duration = 2000;
  //   const startTime = performance.now();

  //   const animate = (now: number) => {
  //     const elapsed = now - startTime;
  //     const progress = Math.min(elapsed / duration, 1);

  //     // Ease in-out
  //     const val = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

  //     this.camera.position.lerpVectors(startPosition, finalPosition, val);
  //     this.controls.lookAt(target.x, target.y, target.z);

  //     if (progress < 1) {
  //       requestAnimationFrame(animate);
  //     }
  //   };
  //   requestAnimationFrame(animate);
  // }

  // private flyToRegion(position: THREE.Vector3, name: string): void {
  //   this.flyToPosition(position);
  //   this.onObjectSelected?.(name, position);
  // }

  setTimeScale(scale: number): void {
    this.solarSystem.setTimeScale(scale);
  }

  // Get current camera movement speed for HUD
  getCurrentSpeed(): number {
    return this.controls.getCurrentSpeed();
  }

  // Get simulated time elapsed in seconds
  getSimulatedTime(): number {
    return this.solarSystem.getSimulatedTime();
  }

  // Toggle post-processing (bloom, lens flare)
  setPostProcessingEnabled(enabled: boolean): void {
    this.usePostProcessing = enabled;
  }

  // Toggle labels visibility
  setLabelsVisible(visible: boolean): void {
    this.labelSystem.setVisible(visible);
  }

  // Toggle galaxy visibility
  setGalaxyVisible(visible: boolean): void {
    this.galaxy.setVisible(visible);
  }

  // Toggle frustum culling for entire scene
  setFrustumCullingEnabled(enabled: boolean): void {
    this.useFrustumCulling = enabled;

    // If disabling, show all objects
    if (!enabled) {
      this.showAllObjects();
    }
  }

  // Show all scene objects (when culling disabled)
  private showAllObjects(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh || object instanceof THREE.Sprite) {
        object.visible = true;
      }
    });
  }




  // Reusable temp objects for frustum checks (avoid per-frame allocations)
  private tempSphere = new THREE.Sphere();
  private tempWorldPos = new THREE.Vector3();

  // Perform frustum culling on all scene objects
  private performSceneCulling(): void {
    if (!this.useFrustumCulling || this.freeze) return;

    // Update frustum from camera
    this.camera.updateMatrixWorld();
    this.frustumMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.frustumMatrix);

    const cameraPos = this.camera.position;

    // Traverse scene and cull ALL objects
    this.scene.traverse((object) => {
      // Skip the scene itself
      if (object === this.scene) return;

      // Skip starfield (always visible - it's the background)
      if (object.name === 'Starfield') return;

      // Skip orbit lines - they should always be visible
      // Orbit lines are THREE.Line objects whose parent name ends with 'Orbit'
      if (object instanceof THREE.Line && object.parent?.name?.endsWith('Orbit')) {
        object.visible = true;
        return;
      }

      // Handle renderable objects
      if (object instanceof THREE.Mesh ||
        object instanceof THREE.Sprite ||
        object instanceof THREE.Points ||
        object instanceof THREE.Line) {

        // Reuse pre-allocated vector to avoid GC pressure
        object.getWorldPosition(this.tempWorldPos);

        // Get bounding radius — read cached value, never recompute per-frame
        let radius = 10;
        if (object instanceof THREE.Mesh && object.geometry.boundingSphere) {
          radius = object.geometry.boundingSphere.radius * Math.max(
            object.scale.x, object.scale.y, object.scale.z
          );
        } else if (object instanceof THREE.Sprite) {
          radius = Math.max(object.scale.x, object.scale.y) / 2;
        }

        // Frustum check
        this.tempSphere.center.copy(this.tempWorldPos);
        this.tempSphere.radius = Math.max(radius, 1);

        const inFrustum = this.frustum.intersectsSphere(this.tempSphere);

        // Distance check - cull very far objects (except Sun)
        const distSq = cameraPos.distanceToSquared(this.tempWorldPos);
        const maxDistSq = 1000000000; // ~31623 units
        const inRange = distSq < maxDistSq || object.name === 'Sun';

        object.visible = inFrustum && inRange;
      }

      // Handle InstancedMesh (rings, etc.)
      if (object instanceof THREE.InstancedMesh &&
        object !== this.universeSkybox) {

        object.getWorldPosition(this.tempWorldPos);

        this.tempSphere.center.copy(this.tempWorldPos);
        this.tempSphere.radius = 500; // Generous radius for rings

        const inFrustum = this.frustum.intersectsSphere(this.tempSphere);
        object.visible = inFrustum;

        // Also set count to 0 if not visible
        if (!inFrustum) {
          object.count = 0;
        }
      }
    });
  }

  // Check if camera is beyond the universe boundary and toggle multiverse
  private checkMultiverseBoundary(): void {
    const distanceFromCenter = this.camera.position.length();

    if (distanceFromCenter > MULTIVERSE_BOUNDARY && !this.inMultiverse) {
      // Entering multiverse
      this.inMultiverse = true;
      this.multiverse.setVisible(true);
      console.log('Entering Multiverse at distance:', distanceFromCenter);
    } else if (distanceFromCenter < MULTIVERSE_BOUNDARY * 0.8 && this.inMultiverse) {
      // Leaving multiverse (with hysteresis to prevent flickering)
      this.inMultiverse = false;
      this.multiverse.setVisible(false);
      console.log('Leaving Multiverse');
    }
  }

  // Navigate to multiverse
  flyToMultiverse(): void {
    // Position camera far from origin to enter multiverse
    const targetPos = new THREE.Vector3(MULTIVERSE_BOUNDARY * 1.5, 0, 0);
    this.camera.position.copy(targetPos);
    this.camera.lookAt(0, 0, 0);
    this.controls.lookAt(0, 0, 0);
    this.inMultiverse = true;
    this.multiverse.setVisible(true);
  }

  private update(): void {
    const delta = this.clock.getDelta();

    // Only update controls if not tracking
    if (!this.trackingTarget) {
      this.controls.update(delta);
    }

    this.solarSystem.update(delta);
    this.blackHole.update(delta);
    this.solarFlares.update(delta);
    this.galaxy.update(delta);
    this.multiverse.update(delta);

    // Check for multiverse boundary transition
    this.checkMultiverseBoundary();

    // Track target if in tracking mode
    if (this.trackingTarget) {
      let targetPosition: THREE.Vector3 | null = null;

      if (this.trackingTarget === 'BlackHole') {
        targetPosition = this.blackHole.getPosition();
      } else {
        targetPosition = this.solarSystem.getPosition(this.trackingTarget);
      }

      if (targetPosition) {
        const desiredCameraPos = targetPosition.clone().add(this.trackingOffset);
        this.camera.position.lerp(desiredCameraPos, 0.05);  // Smooth follow
        this.camera.lookAt(targetPosition);
      }
    }

    // Update planet labels to follow their planets (including dwarf planets)
    const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Eris', 'Makemake', 'Haumea'];
    planets.forEach(name => {
      const position = this.solarSystem.getPosition(name);
      if (position) {
        position.y += 8;
        this.labelSystem.updateLabel(name, position);
      }
    });

    // Update moon labels to follow their moons
    const moons = [
      { planet: 'Earth', moon: 'Moon' },
      { planet: 'Mars', moon: 'Phobos' },
      { planet: 'Mars', moon: 'Deimos' },
      { planet: 'Jupiter', moon: 'Io' },
      { planet: 'Jupiter', moon: 'Europa' },
      { planet: 'Jupiter', moon: 'Ganymede' },
      { planet: 'Jupiter', moon: 'Callisto' },
      { planet: 'Saturn', moon: 'Titan' },
      { planet: 'Saturn', moon: 'Enceladus' },
    ];
    moons.forEach(({ planet, moon }) => {
      const position = this.solarSystem.getPosition(`${planet}/${moon}`);
      if (position) {
        position.y += 2; // Smaller offset for moons
        this.labelSystem.updateLabel(moon, position);
      }
    });

    // Update all labels (scale based on camera distance)
    this.labelSystem.update();

    // Perform frustum culling on entire scene
    this.performSceneCulling();

    // Render with or without post-processing
    if (this.usePostProcessing) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.stats.update();
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.stats.begin();
    this.animationId = requestAnimationFrame(this.animate);
    this.update();
    this.stats.end();
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getNavigationItems(): Array<{ name: string; type: string }> {
    const items: Array<{ name: string; type: string }> = [
      { name: 'Sun', type: 'star' },
    ];

    // Add planets
    const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
    planets.forEach(name => {
      items.push({ name, type: 'planet' });
    });

    // Add dwarf planets
    const dwarfPlanets = ['Pluto', 'Eris', 'Makemake', 'Haumea'];
    dwarfPlanets.forEach(name => {
      items.push({ name, type: 'planet' });
    });

    // Add regions
    items.push({ name: 'Main Asteroid Belt', type: 'region' });
    items.push({ name: 'Kuiper Belt', type: 'region' });
    items.push({ name: 'BlackHole', type: 'blackhole' });
    items.push({ name: 'Multiverse', type: 'multiverse' });

    return items;
  }

  // Toggle post-processing effects
  setPostProcessing(enabled: boolean): void {
    this.usePostProcessing = enabled;
  }

  // Adjust bloom parameters
  setBloomParams(params: { threshold?: number; strength?: number; radius?: number }): void {
    this.postProcessing.setBloomParams(params);
  }

  dispose(): void {
    this.stop();

    window.removeEventListener('resize', this.handleResize);

    this.controls.disconnect();
    this.labelSystem.dispose();
    this.blackHole.dispose();
    this.solarFlares.dispose();
    this.galaxy.dispose();
    this.multiverse.dispose();
    this.postProcessing.dispose();

    if (this.sunLensFlare) {
      this.scene.remove(this.sunLensFlare.light);
    }

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
