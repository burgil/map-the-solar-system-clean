import * as THREE from 'three';

// Fresnel shader for atmospheric glow effects
export function createFresnelMaterial(options: {
  rimHex?: number;
  facingHex?: number;
  fresnelBias?: number;
  fresnelScale?: number;
  fresnelPower?: number;
} = {}): THREE.ShaderMaterial {
  const {
    rimHex = 0x0088ff,
    facingHex = 0x000000,
    fresnelBias = 0.1,
    fresnelScale = 1.0,
    fresnelPower = 4.0,
  } = options;

  const uniforms = {
    color1: { value: new THREE.Color(rimHex) },
    color2: { value: new THREE.Color(facingHex) },
    fresnelBias: { value: fresnelBias },
    fresnelScale: { value: fresnelScale },
    fresnelPower: { value: fresnelPower },
  };

  const vertexShader = `
    uniform float fresnelBias;
    uniform float fresnelScale;
    uniform float fresnelPower;
    varying float vReflectionFactor;
    
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vec3 worldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * normal);
      vec3 I = worldPosition.xyz - cameraPosition;
      vReflectionFactor = fresnelBias + fresnelScale * pow(1.0 + dot(normalize(I), worldNormal), fresnelPower);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform vec3 color1;
    uniform vec3 color2;
    varying float vReflectionFactor;
    
    void main() {
      float f = clamp(vReflectionFactor, 0.0, 1.0);
      gl_FragColor = vec4(mix(color2, color1, vec3(f)), f);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
  });
}

// Sun corona shader
export function createSunCoronaMaterial(): THREE.ShaderMaterial {
  const uniforms = {
    time: { value: 0 },
    color: { value: new THREE.Color(0xffaa22) },
  };

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    uniform vec3 color;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Noise function
    float noise(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
    }
    
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
      
      // Add some animated turbulence
      float n = noise(vPosition * 10.0 + time * 0.5);
      float corona = fresnel * (0.8 + 0.2 * n);
      
      gl_FragColor = vec4(color * corona * 2.0, corona * 0.6);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
}

// Enhanced realistic sun photosphere with granulation and limb darkening


// Chromosphere (thin reddish layer above photosphere)
export function createChromosphereMaterial(): THREE.ShaderMaterial {
  const uniforms = {
    time: { value: 0 },
  };

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Simple noise
    float noise(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
    }
    
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float NdotV = abs(dot(vNormal, viewDir));
      
      // Only visible at edges (during "eclipse" view)
      float rim = 1.0 - NdotV;
      rim = pow(rim, 3.0);
      
      // Reddish chromosphere color
      vec3 chromoColor = vec3(1.0, 0.2, 0.1);
      
      // Spicule-like variations (tiny jets)
      float spicules = noise(vPosition * 50.0 + time * 2.0);
      spicules = pow(spicules, 2.0);
      
      float alpha = rim * (0.5 + spicules * 0.5);
      
      gl_FragColor = vec4(chromoColor * (1.0 + spicules), alpha * 0.8);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

// Enhanced corona with streamers and structure
export function createEnhancedCoronaMaterial(): THREE.ShaderMaterial {
  const uniforms = {
    time: { value: 0 },
  };

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    // Noise for corona structure
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float NdotV = abs(dot(vNormal, viewDir));
      
      // Fresnel for edge glow
      float fresnel = pow(1.0 - NdotV, 4.0);
      
      // Corona streamers (radial patterns)
      float angle = atan(vPosition.y, vPosition.x);
      float streamerPattern = sin(angle * 12.0 + time * 0.5) * 0.5 + 0.5;
      streamerPattern += sin(angle * 7.0 - time * 0.3) * 0.3;
      
      // Coronal loops and plumes
      float loops = noise(vec2(angle * 5.0, length(vPosition.xy) * 2.0 + time * 0.2));
      
      // Combine
      float corona = fresnel * (0.6 + streamerPattern * 0.4) * (0.7 + loops * 0.6);
      
      // White-yellow corona color
      vec3 coronaColor = vec3(1.0, 0.95, 0.8);
      
      gl_FragColor = vec4(coronaColor * corona * 1.5, corona * 0.5);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

// Solar prominence material (loop-shaped plasma)


// Black hole gravitational lensing shader
export function createBlackHoleMaterial(): THREE.ShaderMaterial {
  const uniforms = {
    time: { value: 0 },
    accretionColor: { value: new THREE.Color(0xff4400) },
  };

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    uniform vec3 accretionColor;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float rim = 1.0 - abs(dot(vNormal, viewDir));
      rim = pow(rim, 4.0);
      
      // Completely black center
      float dist = length(vUv - 0.5) * 2.0;
      float black = smoothstep(0.0, 0.8, dist);
      
      vec3 color = mix(vec3(0.0), accretionColor * rim, black);
      float alpha = mix(1.0, rim * 0.5, 1.0 - black);
      
      gl_FragColor = vec4(color, alpha);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

// Accretion disk shader for black hole
export function createAccretionDiskMaterial(): THREE.ShaderMaterial {
  const uniforms = {
    time: { value: 0 },
    innerColor: { value: new THREE.Color(0xffffff) },
    outerColor: { value: new THREE.Color(0xff2200) },
  };

  const vertexShader = `
    varying vec2 vUv;
    varying float vDist;
    
    void main() {
      vUv = uv;
      vDist = length(position.xz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    uniform vec3 innerColor;
    uniform vec3 outerColor;
    varying vec2 vUv;
    varying float vDist;
    
    void main() {
      float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
      float dist = length(vUv - 0.5) * 2.0;
      
      // Spiral pattern
      float spiral = sin(angle * 4.0 + dist * 10.0 - time * 2.0) * 0.5 + 0.5;
      
      // Color gradient from inner to outer
      vec3 color = mix(innerColor, outerColor, dist);
      
      // Brightness variation
      float brightness = (0.7 + 0.3 * spiral) * (1.0 - dist * 0.5);
      
      // Fade out at edges
      float alpha = smoothstep(1.0, 0.7, dist) * smoothstep(0.0, 0.2, dist);
      alpha *= brightness;
      
      gl_FragColor = vec4(color * brightness * 2.0, alpha * 0.8);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

// Saturn ring shader
export function createRingMaterial(innerColor: number, outerColor: number): THREE.ShaderMaterial {
  const uniforms = {
    innerColor: { value: new THREE.Color(innerColor) },
    outerColor: { value: new THREE.Color(outerColor) },
  };

  const vertexShader = `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 innerColor;
    uniform vec3 outerColor;
    varying vec2 vUv;
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    void main() {
      float dist = length(vUv - 0.5) * 2.0;
      
      // Ring bands
      float bands = sin(dist * 50.0) * 0.3 + 0.7;
      float noise = random(vUv * 100.0) * 0.1;
      
      vec3 color = mix(innerColor, outerColor, dist);
      float alpha = smoothstep(1.0, 0.9, dist) * smoothstep(0.3, 0.4, dist);
      alpha *= bands + noise;
      
      // Cassini division
      float cassini = smoothstep(0.58, 0.6, dist) * smoothstep(0.65, 0.63, dist);
      alpha *= 1.0 - cassini * 0.8;
      
      gl_FragColor = vec4(color, alpha * 0.9);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

// Earth day/night shader with proper lighting based on sun direction


// Starfield shader for background


// Lava shader for Sun surface - based on Three.js lava example


