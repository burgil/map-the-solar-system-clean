import * as THREE from 'three';

// Planet colors for labels
const PLANET_COLORS: Record<string, number> = {
  'Sun': 0xffdd44,
  'Mercury': 0x8c8c8c,
  'Venus': 0xe6c27a,
  'Earth': 0x6b93d6,
  'Mars': 0xc1440e,
  'Jupiter': 0xd8ca9d,
  'Saturn': 0xe6d9a8,
  'Uranus': 0x6dd8d8,
  'Neptune': 0x3e54e8,
  'Moon': 0xaaaaaa,
  'MainAsteroidBelt': 0x888888,
  'KuiperBelt': 0x666688,
  'BlackHole': 0xff0000,
};

export interface Label3DData {
  name: string;
  position: THREE.Vector3;
  type: 'star' | 'planet' | 'moon' | 'asteroid' | 'region' | 'blackhole';
  color?: number;
}

export class Label3D {
  sprite: THREE.Sprite;
  name: string;
  baseScale: number;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  
  constructor(data: Label3DData) {
    this.name = data.name;
    this.baseScale = this.getBaseScale(data.type);
    
    // Create canvas for text rendering
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d')!;
    this.context = ctx;
    
    // Determine color
    const color = data.color ?? PLANET_COLORS[data.name] ?? 0xffffff;
    const colorObj = new THREE.Color(color);
    const colorStr = `rgb(${Math.floor(colorObj.r * 255)}, ${Math.floor(colorObj.g * 255)}, ${Math.floor(colorObj.b * 255)})`;
    
    // Set canvas size based on text
    const fontSize = 64;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    const textWidth = ctx.measureText(data.name).width;
    
    const padding = 40;
    this.canvas.width = textWidth + padding * 2;
    this.canvas.height = fontSize + padding * 2;
    
    // Redraw with proper size
    this.drawLabel(data.name, colorStr, fontSize);
    
    // Create sprite material
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: true,
    });
    
    this.sprite = new THREE.Sprite(material);
    this.sprite.position.copy(data.position);
    this.sprite.name = `label_${data.name}`;
    
    // Set initial scale
    const aspect = this.canvas.width / this.canvas.height;
    this.sprite.scale.set(this.baseScale * aspect, this.baseScale, 1);
  }
  
  private drawLabel(text: string, color: string, fontSize: number): void {
    const ctx = this.context;
    const { width, height } = this.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background with transparency
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.roundRect(0, 0, width, height, 10);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.roundRect(2, 2, width - 4, height - 4, 8);
    ctx.stroke();
    
    // Draw text with outline
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 6;
    ctx.strokeText(text, width / 2, height / 2);
    
    // Fill
    ctx.fillStyle = color;
    ctx.fillText(text, width / 2, height / 2);
    
    // Add glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillText(text, width / 2, height / 2);
    ctx.shadowBlur = 0;
  }
  
  private getBaseScale(type: Label3DData['type']): number {
    switch (type) {
      case 'star': return 15;
      case 'planet': return 10;
      case 'moon': return 5;
      case 'region': return 20;
      case 'blackhole': return 25;
      case 'asteroid': return 3;
      default: return 8;
    }
  }
  
  update(camera: THREE.Camera): void {
    // Scale based on distance to camera for consistent visibility
    const distance = camera.position.distanceTo(this.sprite.position);
    
    // Clamp scale to reasonable range
    const minScale = 0.5;
    const maxScale = 5;
    const scaleFactor = Math.min(maxScale, Math.max(minScale, distance / 100));
    
    const aspect = this.canvas.width / this.canvas.height;
    this.sprite.scale.set(
      this.baseScale * aspect * scaleFactor,
      this.baseScale * scaleFactor,
      1
    );
  }
  
  setPosition(position: THREE.Vector3): void {
    this.sprite.position.copy(position);
  }
  
  dispose(): void {
    (this.sprite.material as THREE.SpriteMaterial).map?.dispose();
    (this.sprite.material as THREE.SpriteMaterial).dispose();
  }
}

export class Label3DSystem {
  private labels: Map<string, Label3D> = new Map();
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
  }
  
  createLabel(data: Label3DData): Label3D {
    const label = new Label3D(data);
    this.labels.set(data.name, label);
    this.scene.add(label.sprite);
    return label;
  }
  
  updateLabel(name: string, position: THREE.Vector3): void {
    const label = this.labels.get(name);
    if (label) {
      label.setPosition(position);
    }
  }
  
  update(): void {
    this.labels.forEach(label => {
      label.update(this.camera);
    });
  }
  
  getLabel(name: string): Label3D | undefined {
    return this.labels.get(name);
  }
  
  removeLabel(name: string): void {
    const label = this.labels.get(name);
    if (label) {
      this.scene.remove(label.sprite);
      label.dispose();
      this.labels.delete(name);
    }
  }
  
  setVisible(visible: boolean): void {
    this.labels.forEach(label => {
      label.sprite.visible = visible;
    });
  }
  
  dispose(): void {
    this.labels.forEach(label => {
      this.scene.remove(label.sprite);
      label.dispose();
    });
    this.labels.clear();
  }
}
