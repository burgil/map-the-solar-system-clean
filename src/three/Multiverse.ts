import * as THREE from 'three';

/**
 * Multiverse visualization - floating universe bubbles in the void
 * Appears when camera travels far beyond the solar system boundary
 */
export class Multiverse {
    private group: THREE.Group;
    private bubbles: THREE.Mesh[] = [];
    private bubbleMaterials: THREE.MeshBasicMaterial[] = [];
    private textureLoader: THREE.TextureLoader;
    private universeTexture: THREE.Texture | null = null;
    private time = 0;

    // Multiverse parameters
    private readonly bubbleCount = 50;
    private readonly bubbleMinRadius = 5000;
    private readonly bubbleMaxRadius = 20000;
    private readonly spreadRadius = 200000;
    private readonly driftSpeed = 0.1;

    constructor(scene: THREE.Scene) {
        this.group = new THREE.Group();
        this.group.name = 'Multiverse';
        this.group.visible = false; // Hidden until activated
        this.textureLoader = new THREE.TextureLoader();

        // Load universe texture for bubbles
        this.universeTexture = this.textureLoader.load(
            '/textures/Logarhitmic_radial_photo_of_the_universe_by_pablo_budassi_9MFK.jpg',
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                // Update all bubble materials with texture
                this.bubbleMaterials.forEach(mat => {
                    mat.map = texture;
                    mat.needsUpdate = true;
                });
            }
        );

        this.createBubbles();
        this.createAmbientParticles();

        scene.add(this.group);
    }

    private createBubbles(): void {
        for (let i = 0; i < this.bubbleCount; i++) {
            const radius = this.bubbleMinRadius + Math.random() * (this.bubbleMaxRadius - this.bubbleMinRadius);

            // Random position in a sphere around origin
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.random() * this.spreadRadius;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            // Create bubble sphere
            const geometry = new THREE.SphereGeometry(radius, 32, 32);

            // Create glowing bubble material
            const material = new THREE.MeshBasicMaterial({
                map: this.universeTexture,
                transparent: true,
                opacity: 0.6 + Math.random() * 0.3,
                side: THREE.FrontSide,
            });
            this.bubbleMaterials.push(material);

            const bubble = new THREE.Mesh(geometry, material);
            bubble.position.set(x, y, z);
            bubble.name = `Universe_${i}`;
            bubble.userData = {
                isUniverse: true,
                index: i,
                basePosition: new THREE.Vector3(x, y, z),
                driftOffset: new THREE.Vector3(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2
                ),
                radius: radius,
            };

            this.bubbles.push(bubble);
            this.group.add(bubble);

            // Add glowing halo around each bubble
            const glowGeometry = new THREE.SphereGeometry(radius * 1.1, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: this.getRandomUniverseColor(),
                transparent: true,
                opacity: 0.15,
                side: THREE.BackSide,
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(bubble.position);
            this.group.add(glow);
        }
    }

    private getRandomUniverseColor(): number {
        const colors = [
            0x88ccff, // Blue
            0xff88cc, // Pink
            0xcc88ff, // Purple
            0xffcc88, // Orange
            0x88ffcc, // Teal
            0xccff88, // Lime
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    private createAmbientParticles(): void {
        // Floating dust/energy particles in the void
        const particleCount = 10000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // Spread throughout the multiverse space
            positions[i * 3] = (Math.random() - 0.5) * this.spreadRadius * 3;
            positions[i * 3 + 1] = (Math.random() - 0.5) * this.spreadRadius * 3;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.spreadRadius * 3;

            // Subtle colored particles
            const color = new THREE.Color().setHSL(Math.random(), 0.5, 0.6);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 100,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.4,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const particles = new THREE.Points(geometry, material);
        this.group.add(particles);
    }

    update(delta: number): void {
        if (!this.group.visible) return;

        this.time += delta;

        // Animate bubble drifting
        this.bubbles.forEach((bubble) => {
            const data = bubble.userData;
            const drift = data.driftOffset as THREE.Vector3;
            const base = data.basePosition as THREE.Vector3;

            bubble.position.x = base.x + Math.sin(this.time * this.driftSpeed + drift.x) * 500;
            bubble.position.y = base.y + Math.sin(this.time * this.driftSpeed + drift.y) * 500;
            bubble.position.z = base.z + Math.cos(this.time * this.driftSpeed + drift.z) * 500;

            // Slow rotation
            bubble.rotation.y += delta * 0.05;
        });
    }

    setVisible(visible: boolean): void {
        this.group.visible = visible;
    }

    isVisible(): boolean {
        return this.group.visible;
    }

    // Check if a ray intersects any universe bubble
    checkIntersection(raycaster: THREE.Raycaster): THREE.Mesh | null {
        const intersects = raycaster.intersectObjects(this.bubbles);
        if (intersects.length > 0) {
            return intersects[0].object as THREE.Mesh;
        }
        return null;
    }

    // Get the "home" universe (first bubble)
    getHomeUniverse(): THREE.Mesh | null {
        return this.bubbles[0] || null;
    }

    dispose(): void {
        this.group.parent?.remove(this.group);
        this.bubbles.forEach((bubble) => {
            bubble.geometry.dispose();
            (bubble.material as THREE.Material).dispose();
        });
        this.bubbleMaterials.forEach(mat => mat.dispose());
        if (this.universeTexture) {
            this.universeTexture.dispose();
        }
    }
}
