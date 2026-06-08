import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

const vertexShader = `
  uniform float uTime;
  uniform float uScrollSpeed;
  uniform float uCurveStrength;
  uniform float uCurveFrequency;
  varying vec2 vUv;
  #define PI 3.141592653

  mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat4(
      oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s, 0.0,
      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s, 0.0,
      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,          0.0,
      0.0, 0.0, 0.0, 1.0
    );
  }

  vec3 rotate(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
  }

  void main() {
    vec3 pos = position;
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    float xDisplacement = uCurveStrength * cos(worldPosition.y * uCurveFrequency) - uCurveStrength;
    pos.x += xDisplacement;
    pos.x -= uCurveStrength;

    float yDisplacement = -0.2 * sin(pos.x * 2.0 + pos.z * 2.0);
    yDisplacement += uScrollSpeed * sin(pos.z * 2.0 + uScrollSpeed * 6.0 + pos.x * 2.0);
    pos.y += yDisplacement;

    float angle = -PI * 0.5 * uScrollSpeed;
    pos = rotate(pos, vec3(1.0, 0.0, 0.0), angle);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vUv = uv;
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uScrollSpeed;
  uniform vec3 uColor;
  varying vec2 vUv;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    uv.y += uTime * uScrollSpeed;

    vec3 color = uColor;

    float grid = step(0.98, fract(uv.x * 15.0)) + step(0.98, fract(uv.y * 15.0));
    color += vec3(grid) * 0.2;

    float noise = rand(uv * vec2(43758.5453, 123.456));
    color += noise * 0.1;

    float scanline = step(0.98, fract(uv.y * 100.0 + uTime * 5.0));
    color += vec3(scanline) * 0.1;

    float horizontalLine = step(0.98, fract(uv.x * 20.0 + uTime * 2.0));
    color += vec3(horizontalLine) * 0.1;

    float glow = 1.0 - smoothstep(0.0, 0.8, distance(vUv, vec2(0.5)));
    color += vec3(glow) * 0.3;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function CorridorSpaces() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const tickerRef = useRef<((time: number) => void) | null>(null);
  const isActiveRef = useRef(true);

  useEffect(() => {
    if (!canvasRef.current) return;
    const container = canvasRef.current;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#0A0C10', 1, 9);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10
    );
    camera.position.set(0, 0.5, 4.5);

    const webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    webgl.setClearColor('#0A0C10', 1);
    webgl.setSize(window.innerWidth, window.innerHeight);
    webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(webgl.domElement);
    rendererRef.current = webgl;

    const corridorMaterial = (color: string, zMultiplier = 1) =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uScrollSpeed: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uCurveStrength: { value: 1.5 },
          uCurveFrequency: { value: 0.5 },
          uZMultiplier: { value: zMultiplier },
        },
      });

    // Walls
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 140, 140),
      corridorMaterial('#001F3F', 1)
    );
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 140, 140),
      corridorMaterial('#001F3F', 1)
    );

    const globalWallZPosition = 4;
    const wallXPosition = 1.5;
    const wallYPosition = 0;
    const wallXScale = 1;
    const wallYScale = 2;
    const wallZScale = 10;

    leftWall.scale.set(wallXScale, wallYScale, wallZScale);
    leftWall.position.set(wallXPosition, wallYPosition, globalWallZPosition);
    leftWall.rotation.y = Math.PI / 2;

    rightWall.scale.set(wallXScale, wallYScale, wallZScale);
    rightWall.position.set(-wallXPosition, wallYPosition, globalWallZPosition);
    rightWall.rotation.y = Math.PI / 2;

    scene.add(leftWall, rightWall);

    // Floor & Ceiling
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 140, 140),
      corridorMaterial('#00D9C0', 0.5)
    );
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 140, 140),
      corridorMaterial('#00D9C0', 0.5)
    );

    const floorCeilingYPosition = 1;
    const sharedZ = globalWallZPosition - wallZScale / 2;

    ceiling.rotation.x = Math.PI / 2;
    ceiling.scale.set(3, 1, wallZScale);
    ceiling.position.set(0, floorCeilingYPosition, sharedZ);

    floor.scale.set(3, 1, wallZScale);
    floor.position.set(0, floorCeilingYPosition, sharedZ);
    floor.position.y -= 0.5;
    floor.rotation.x = Math.PI / 2;

    scene.add(floor, ceiling);

    // Animation
    const ticker = (time: number) => {
      if (!isActiveRef.current) return;
      const uniforms = [
        leftWall.material,
        rightWall.material,
        floor.material,
        ceiling.material,
      ];
      uniforms.forEach((mat) => {
        if (mat instanceof THREE.ShaderMaterial) {
          mat.uniforms.uTime.value = time;
          mat.uniforms.uScrollSpeed.value = 0.005;
        }
      });

      const wave = Math.cos(time) * 2;
      camera.position.x += (wave - camera.position.x) * 0.05;
      camera.position.y += (0.2 - camera.position.y) * 0.05;
      camera.position.z -= 0.005;

      webgl.render(scene, camera);
    };

    tickerRef.current = ticker;
    gsap.ticker.add(ticker);

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      webgl.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Visibility
    const onVisibility = () => {
      isActiveRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isActiveRef.current = false;
      if (tickerRef.current) gsap.ticker.remove(tickerRef.current);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      webgl.dispose();
      if (container.contains(webgl.domElement)) {
        container.removeChild(webgl.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  );
}
