import * as THREE from 'three';

interface Explosion {
  points: THREE.Points;
  velocities: Float32Array;
  birth: number;
  life: number;
}

interface Shockwave {
  mesh: THREE.Mesh;
  birth: number;
  life: number;
}

export class SolarFlares {
  private scene: THREE.Scene;
  private sunPosition: THREE.Vector3;
  private explosions: Explosion[] = [];
  private shockwaves: Shockwave[] = [];
  private clock: THREE.Clock;
  private lastFlareTime = 0;
  private flareInterval = 0.3; // Time between flares in seconds

  constructor(scene: THREE.Scene, sunPosition: THREE.Vector3) {
    this.scene = scene;
    this.sunPosition = sunPosition.clone();
    this.clock = new THREE.Clock();

    // Start with a few flares
    this.createFlare();
  }

  private createFlare(): void {
    const count = 20 + Math.floor(Math.random() * 30);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Random direction on sphere
      let rx = (Math.random() - 0.5);
      let ry = (Math.random() - 0.5);
      let rz = (Math.random() - 0.5);
      const lenSq = rx * rx + ry * ry + rz * rz;
      if (lenSq === 0) {
        rx = 1; ry = 0; rz = 0;
      }
      const invLen = 1 / Math.sqrt(lenSq);
      const vx = rx * invLen;
      const vy = ry * invLen;
      const vz = rz * invLen;

      // Start position (slightly offset from sun surface)
      const sunRadius = 10; // Match sun radius in SolarSystem
      positions[3 * i + 0] = this.sunPosition.x + vx * sunRadius * 1.1;
      positions[3 * i + 1] = this.sunPosition.y + vy * sunRadius * 1.1;
      positions[3 * i + 2] = this.sunPosition.z + vz * sunRadius * 1.1;

      // Velocity (outward from sun)
      const speed = (6 + Math.random() * 12);
      velocities[3 * i + 0] = vx * speed;
      velocities[3 * i + 1] = vy * speed;
      velocities[3 * i + 2] = vz * speed;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      color: 0xffcc66,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.explosions.push({
      points,
      velocities,
      birth: 0,
      life: 4.6,
    });

    // Create shockwave
    this.createShockwave();

    // Create flash light
    this.createFlash();
  }

  private createShockwave(): void {
    const geometry = new THREE.SphereGeometry(10, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffeecc,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.sunPosition);
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      birth: 0,
      life: 2.5,
    });
  }

  private createFlash(): void {
    const flash = new THREE.PointLight(0xffeecc, 50, 100, 2);
    flash.position.copy(this.sunPosition);
    this.scene.add(flash);

    // Remove flash after short time
    setTimeout(() => {
      this.scene.remove(flash);
      flash.dispose();
    }, 200);
  }

  update(delta: number): void {
    const now = this.clock.getElapsedTime();

    // Spawn new flares periodically
    if (now - this.lastFlareTime > this.flareInterval) {
      this.createFlare();
      this.lastFlareTime = now;
    }

    // Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.birth += delta;

      const posAttr = e.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let j = 0; j < posAttr.count; j++) {
        // Apply velocity
        positions[3 * j + 0] += e.velocities[3 * j + 0] * delta;
        positions[3 * j + 1] += e.velocities[3 * j + 1] * delta;
        positions[3 * j + 2] += e.velocities[3 * j + 2] * delta;

        // Slow down over time
        e.velocities[3 * j + 0] *= 0.995;
        e.velocities[3 * j + 1] *= 0.995;
        e.velocities[3 * j + 2] *= 0.995;
      }

      posAttr.needsUpdate = true;

      // Fade out
      const t = e.birth / e.life;
      (e.points.material as THREE.PointsMaterial).opacity = Math.max(0, 0.95 * (1 - t));

      // Remove when expired
      if (e.birth > e.life) {
        this.scene.remove(e.points);
        e.points.geometry.dispose();
        (e.points.material as THREE.Material).dispose();
        this.explosions.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.birth += delta;

      const t = s.birth / s.life;
      s.mesh.scale.setScalar(1 + t * 3);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.3 * (1 - t));

      if (s.birth > s.life) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const e of this.explosions) {
      this.scene.remove(e.points);
      e.points.geometry.dispose();
      (e.points.material as THREE.Material).dispose();
    }
    this.explosions = [];

    for (const s of this.shockwaves) {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    }
    this.shockwaves = [];
  }
}
