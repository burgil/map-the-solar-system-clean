import * as THREE from 'three';

/**
 * Stunning particle-based spiral galaxy visualization
 * Creates a dramatic Milky Way-like galaxy surrounding the solar system
 * Inspired by three.js galaxy examples - uses dense particles with evolved positions
 */
export class Galaxy {
    private group: THREE.Group;
    private particles: THREE.Points;
    private particleMaterial: THREE.PointsMaterial;
    private time = 0;

    // Galaxy parameters - Tuned for realistic look
    private readonly particleCount = 500000; // Dense galaxy
    private readonly arms = 4;
    private readonly armSpread = 0.4;
    private readonly galaxyRadius = 50000;
    private readonly galaxyThickness = 3000;
    private readonly coreRadius = 5000;
    private readonly rotationSpeed = 0.0001;

    constructor(scene: THREE.Scene, position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        this.group = new THREE.Group();
        this.group.name = 'Galaxy';
        this.group.position.copy(position);

        // CRITICAL: Disable frustum culling so galaxy is ALWAYS rendered
        this.group.frustumCulled = false;

        // Create circular particle texture for soft glowing stars
        const particleTexture = this.createParticleTexture();

        // Create the galaxy particles with "evolved" positions (like after animation plays)
        const geometry = this.createGalaxyGeometry();

        // Particle material - small particles for crisp look
        this.particleMaterial = new THREE.PointsMaterial({
            size: 40, // Smaller for denser, crisper look
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.85,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            map: particleTexture,
            alphaMap: particleTexture,
        });

        this.particles = new THREE.Points(geometry, this.particleMaterial);
        this.particles.frustumCulled = false;
        this.particles.renderOrder = -1000; // Render behind everything
        this.group.add(this.particles);

        // Add central bulge glow
        this.createCentralBulge();

        scene.add(this.group);
    }

    // Create a soft circular gradient texture for particles
    private createParticleTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;

        // Create radial gradient (soft glow like a star)
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    private createGalaxyGeometry(): THREE.BufferGeometry {
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);

        // Vibrant color palette matching three.js galaxy example
        const coreColor = new THREE.Color(0xffcc77); // Warm golden core
        const midColor = new THREE.Color(0x88aaff);  // Blue-white mid region  
        const outerColor = new THREE.Color(0x5533aa); // Purple outer arms
        const nebulaColor1 = new THREE.Color(0xff4488); // Pink nebulae
        const nebulaColor2 = new THREE.Color(0x33ffaa); // Teal nebulae

        for (let i = 0; i < this.particleCount; i++) {
            const armIndex = i % this.arms;
            const armAngle = (armIndex / this.arms) * Math.PI * 2;

            // Distance from center with logarithmic distribution for denser core
            const distanceFactor = Math.random();
            const distance = Math.pow(distanceFactor, 0.5) * this.galaxyRadius;

            // Spiral angle increases with distance from center
            const spiralFactor = 4.0;
            const spiralAngle = armAngle + (distance / this.galaxyRadius) * Math.PI * spiralFactor;

            // Add randomness to spread arms - more spread at outer edges
            const spreadAmount = this.armSpread * (0.3 + distanceFactor * 0.7);
            const randomAngle = (Math.random() - 0.5) * spreadAmount * 2;
            const finalAngle = spiralAngle + randomAngle;

            // Calculate position
            const x = Math.cos(finalAngle) * distance;
            const z = Math.sin(finalAngle) * distance;

            // Height - thinner at edges, thicker at center
            const heightFactor = Math.exp(-distance / (this.galaxyRadius * 0.3));
            const y = (Math.random() - 0.5) * this.galaxyThickness * heightFactor;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Color based on distance from center
            const r = distance / this.galaxyRadius;
            let color: THREE.Color;

            if (r < 0.15) {
                // Core - bright golden
                color = coreColor.clone().lerp(midColor, r / 0.15);
            } else if (r < 0.5) {
                // Mid - blue white
                color = midColor.clone().lerp(outerColor, (r - 0.15) / 0.35);
            } else {
                // Outer - deep purple
                color = outerColor.clone();
            }

            // Add nebula color patches based on position
            const noiseX = Math.sin(x * 0.0003) * Math.cos(z * 0.0003);
            const noiseZ = Math.cos(x * 0.0004 + z * 0.0002);
            if (noiseX > 0.6) {
                color.lerp(nebulaColor1, 0.5);
            } else if (noiseZ > 0.7) {
                color.lerp(nebulaColor2, 0.4);
            }

            // Random brightness variation
            const brightness = 0.6 + Math.random() * 0.4;
            color.multiplyScalar(brightness);

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        return geometry;
    }

    private createCentralBulge(): void {
        // Bright central bulge glow
        const bulgeGeometry = new THREE.SphereGeometry(this.coreRadius, 32, 32);

        // Inner bright core
        const coreGlow = new THREE.Mesh(
            bulgeGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xffddaa,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide
            })
        );
        coreGlow.scale.setScalar(0.8);
        coreGlow.frustumCulled = false;
        this.group.add(coreGlow);

        // Outer halo
        const haloGlow = new THREE.Mesh(
            bulgeGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xffaa55,
                transparent: true,
                opacity: 0.05,
                side: THREE.BackSide
            })
        );
        haloGlow.scale.setScalar(2.5);
        haloGlow.frustumCulled = false;
        this.group.add(haloGlow);
    }

    update(delta: number): void {
        this.time += delta;
        // Very slow rotation - galaxy rotates majestically
        this.group.rotation.y += delta * this.rotationSpeed;
    }

    setVisible(visible: boolean): void {
        this.group.visible = visible;
    }

    isVisible(): boolean {
        return this.group.visible;
    }

    getPosition(): THREE.Vector3 {
        return this.group.position.clone();
    }

    dispose(): void {
        this.group.parent?.remove(this.group);
        this.particles.geometry.dispose();
        this.particleMaterial.map?.dispose();
        this.particleMaterial.dispose();
    }
}
