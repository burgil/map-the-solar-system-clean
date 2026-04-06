import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

export interface PostProcessingConfig {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
}

export interface BloomParams {
  threshold: number;
  strength: number;
  radius: number;
}

export class PostProcessing {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private renderPass: RenderPass;

  // Bloom parameters
  private params: BloomParams = {
    threshold: 0.9,
    strength: 0.2,
    radius: 0.2,
  };

  constructor(config: PostProcessingConfig) {
    const { scene, camera, renderer } = config;

    // Create effect composer
    this.composer = new EffectComposer(renderer);

    // Render pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Unreal Bloom pass for sun glow
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.params.strength,
      this.params.radius,
      this.params.threshold
    );
    this.composer.addPass(this.bloomPass);

    // Output pass for proper color space
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  setBloomParams(params: Partial<BloomParams>): void {
    if (params.threshold !== undefined) {
      this.bloomPass.threshold = params.threshold;
      this.params.threshold = params.threshold;
    }
    if (params.strength !== undefined) {
      this.bloomPass.strength = params.strength;
      this.params.strength = params.strength;
    }
    if (params.radius !== undefined) {
      this.bloomPass.radius = params.radius;
      this.params.radius = params.radius;
    }
  }

  getBloomParams(): BloomParams {
    return { ...this.params };
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
  }
}

// Create lens flare for the sun
export function createSunLensFlare(
  scene: THREE.Scene,
  sunPosition: THREE.Vector3,
  color: THREE.Color = new THREE.Color(0xffffee)
): { lensflare: Lensflare; light: THREE.PointLight } {
  // Create a point light for the lens flare
  const light = new THREE.PointLight(color, 2, 0, 0);
  light.position.copy(sunPosition);

  // Load lens flare textures
  const textureLoader = new THREE.TextureLoader();

  // Create lens flare
  const lensflare = new Lensflare();

  // Main flare (bright center)
  textureLoader.load('/textures/lensflare/lensflare0.png', (texture) => {
    lensflare.addElement(new LensflareElement(texture, 800, 0, color));
  });

  // Secondary flares
  textureLoader.load('/textures/lensflare/lensflare3.png', (texture) => {
    lensflare.addElement(new LensflareElement(texture, 60, 0.6));
    lensflare.addElement(new LensflareElement(texture, 70, 0.7));
    lensflare.addElement(new LensflareElement(texture, 120, 0.9));
    lensflare.addElement(new LensflareElement(texture, 70, 1));
  });

  light.add(lensflare);
  scene.add(light);

  return { lensflare, light };
}
