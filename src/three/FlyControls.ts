import * as THREE from 'three';

export class FlyControls {
  camera: THREE.Camera;
  domElement: HTMLElement;

  // Movement
  movementSpeed = 5; // Base speed (1000x slower for fine control)
  rollSpeed = 0.5;
  maxBoostMultiplier = 500; // Maximum boost when holding shift
  boostAcceleration = 0.5; // How fast boost builds up per second

  // State
  private moveState = {
    forward: false,
    back: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  };

  private rotation = {
    x: 0,
    y: 0,
  };

  private isLocked = false;
  private enabled = true;
  private currentBoostMultiplier = 1; // Current boost level (builds up while holding shift)

  // Callbacks
  onLock?: () => void;
  onUnlock?: () => void;
  onUserInput?: () => void;  // Called when user provides input (to break tracking)

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.connect();
  }

  connect(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  disconnect(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);

    if (this.isLocked) {
      document.exitPointerLock();
    }
  }

  private onMouseDown = (event: MouseEvent): void => {
    if (!this.enabled) return;

    // Left click (0) or right click (2)
    if (event.button === 0 || event.button === 2) {
      this.domElement.requestPointerLock();
    }
  };

  private onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private onPointerLockChange = (): void => {
    this.isLocked = document.pointerLockElement === this.domElement;

    if (this.isLocked) {
      this.onLock?.();
    } else {
      this.onUnlock?.();
      // Reset movement when unlocked
      this.moveState = {
        forward: false,
        back: false,
        left: false,
        right: false,
        up: false,
        down: false,
        boost: false,
      };
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isLocked || !this.enabled) return;

    const sensitivity = 0.002;
    this.rotation.y -= event.movementX * sensitivity;
    this.rotation.x -= event.movementY * sensitivity;

    // Clamp vertical rotation
    this.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.rotation.x));

    // Apply rotation
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.rotation.y;
    this.camera.rotation.x = this.rotation.x;
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    // Notify of user input (breaks tracking mode)
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'].includes(event.code)) {
      this.onUserInput?.();
    }

    switch (event.code) {
      case 'KeyW':
        this.moveState.forward = true;
        break;
      case 'KeyS':
        this.moveState.back = true;
        break;
      case 'KeyA':
        this.moveState.left = true;
        break;
      case 'KeyD':
        this.moveState.right = true;
        break;
      case 'Space':
        this.moveState.up = true;
        event.preventDefault();
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.moveState.down = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.moveState.boost = true;
        break;
      case 'Escape':
        if (this.isLocked) {
          document.exitPointerLock();
        }
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyW':
        this.moveState.forward = false;
        break;
      case 'KeyS':
        this.moveState.back = false;
        break;
      case 'KeyA':
        this.moveState.left = false;
        break;
      case 'KeyD':
        this.moveState.right = false;
        break;
      case 'Space':
        this.moveState.up = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.moveState.down = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.moveState.boost = false;
        break;
    }
  };

  update(delta: number): void {
    if (!this.enabled) return;

    // Progressive boost: accelerate the longer shift is held
    if (this.moveState.boost) {
      // Increase boost multiplier over time (exponential feel)
      this.currentBoostMultiplier = Math.min(
        this.currentBoostMultiplier + this.boostAcceleration * delta * this.currentBoostMultiplier,
        this.maxBoostMultiplier
      );
    } else {
      // Quickly decay boost when shift is released
      this.currentBoostMultiplier = Math.max(
        this.currentBoostMultiplier - this.boostAcceleration * 5 * delta * this.currentBoostMultiplier,
        1
      );
    }

    const speed = this.movementSpeed * this.currentBoostMultiplier;
    const moveDistance = speed * delta;

    const direction = new THREE.Vector3();

    if (this.moveState.forward) direction.z -= 1;
    if (this.moveState.back) direction.z += 1;
    if (this.moveState.left) direction.x -= 1;
    if (this.moveState.right) direction.x += 1;
    if (this.moveState.up) direction.y += 1;
    if (this.moveState.down) direction.y -= 1;

    if (direction.length() > 0) {
      direction.normalize();
      direction.applyQuaternion(this.camera.quaternion);
      this.camera.position.addScaledVector(direction, moveDistance);
    }
  }

  // Get current speed for UI display
  getCurrentSpeed(): number {
    return this.movementSpeed * this.currentBoostMultiplier;
  }

  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  lookAt(x: number, y: number, z: number): void {
    this.camera.lookAt(x, y, z);

    // Update rotation from camera
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.rotation.x = euler.x;
    this.rotation.y = euler.y;
  }

  get locked(): boolean {
    return this.isLocked;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.isLocked) {
      document.exitPointerLock();
    }
  }
}
