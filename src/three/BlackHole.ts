import * as THREE from 'three';
import { createBlackHoleMaterial, createAccretionDiskMaterial } from './shaders';

export class BlackHole {
  group: THREE.Group;
  eventHorizon: THREE.Mesh;
  accretionDisk: THREE.Mesh;
  diskMaterial: THREE.ShaderMaterial;
  beacon: THREE.Mesh;
  ultraBeacon: THREE.Mesh;
  beaconLight: THREE.PointLight;

  private time = 0;

  constructor(scene: THREE.Scene, position: THREE.Vector3, radius: number = 5) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = 'BlackHole';

    // Event horizon (completely black sphere)
    const horizonGeometry = new THREE.SphereGeometry(radius, 64, 64);
    const horizonMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });
    this.eventHorizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
    this.group.add(this.eventHorizon);

    // Gravitational lensing effect (distortion ring)
    const lensGeometry = new THREE.SphereGeometry(radius * 1.5, 64, 64);
    const lensMaterial = createBlackHoleMaterial();
    const lensRing = new THREE.Mesh(lensGeometry, lensMaterial);
    this.group.add(lensRing);

    // Accretion disk
    const diskGeometry = new THREE.RingGeometry(radius * 1.2, radius * 6, 128, 8);
    this.diskMaterial = createAccretionDiskMaterial();
    this.accretionDisk = new THREE.Mesh(diskGeometry, this.diskMaterial);
    this.accretionDisk.rotation.x = Math.PI / 2;
    this.group.add(this.accretionDisk);

    // Second tilted disk for visual depth
    const disk2 = new THREE.Mesh(diskGeometry.clone(), this.diskMaterial.clone());
    disk2.rotation.x = Math.PI / 2 + 0.3;
    disk2.rotation.z = 0.2;
    this.group.add(disk2);

    // Photon sphere glow
    const photonGeometry = new THREE.TorusGeometry(radius * 1.5, radius * 0.1, 16, 64);
    const photonMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const photonSphere = new THREE.Mesh(photonGeometry, photonMaterial);
    photonSphere.rotation.x = Math.PI / 2;
    this.group.add(photonSphere);

    // Large distant glow (visible from far away)
    const glowGeometry = new THREE.SphereGeometry(radius * 8, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const distantGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.group.add(distantGlow);

    // Outer halo for extreme distance visibility
    const haloGeometry = new THREE.SphereGeometry(radius * 15, 16, 16);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2200,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    this.group.add(halo);

    // MASSIVE beacon for extreme distance visibility (100x radius)
    const beaconGeometry = new THREE.SphereGeometry(radius * 100, 8, 8);
    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
    });
    this.beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
    this.beacon.name = 'BlackHoleBeacon';
    this.group.add(this.beacon);

    // Even larger ultra-distant beacon
    const ultraBeaconGeometry = new THREE.SphereGeometry(radius * 500, 6, 6);
    const ultraBeaconMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2200,
      transparent: true,
      opacity: 0.01,
      side: THREE.BackSide,
    });
    this.ultraBeacon = new THREE.Mesh(ultraBeaconGeometry, ultraBeaconMaterial);
    this.ultraBeacon.name = 'BlackHoleUltraBeacon';
    this.group.add(this.ultraBeacon);

    // Point light so black hole illuminates nearby objects
    this.beaconLight = new THREE.PointLight(0xff4400, 50, radius * 200, 1);
    this.group.add(this.beaconLight);

    // Jets (optional polar jets)
    this.createJets(radius);

    scene.add(this.group);
  }

  private createJets(radius: number): void {
    const jetGeometry = new THREE.ConeGeometry(radius * 0.3, radius * 10, 16, 1, true);
    const jetMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    // Top jet
    const topJet = new THREE.Mesh(jetGeometry, jetMaterial);
    topJet.position.y = radius * 5;
    this.group.add(topJet);

    // Bottom jet
    const bottomJet = new THREE.Mesh(jetGeometry, jetMaterial);
    bottomJet.position.y = -radius * 5;
    bottomJet.rotation.z = Math.PI;
    this.group.add(bottomJet);
  }

  update(delta: number): void {
    this.time += delta;

    // Rotate accretion disk
    this.accretionDisk.rotation.z += delta * 0.5;

    // Update shader time
    if (this.diskMaterial.uniforms?.time) {
      this.diskMaterial.uniforms.time.value = this.time;
    }

    // Pulse the beacons for visibility
    const pulse = 0.02 + Math.sin(this.time * 2) * 0.01;
    const beaconMat = this.beacon.material as THREE.MeshBasicMaterial;
    beaconMat.opacity = pulse;

    const ultraPulse = 0.008 + Math.sin(this.time * 1.5) * 0.004;
    const ultraBeaconMat = this.ultraBeacon.material as THREE.MeshBasicMaterial;
    ultraBeaconMat.opacity = ultraPulse;

    // Pulse the light intensity
    this.beaconLight.intensity = 30 + Math.sin(this.time * 3) * 20;
  }

  getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });
  }
}
