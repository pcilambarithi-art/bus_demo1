import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CyberShieldCoreProps {
  onHoverStateChange?: (isHovered: boolean) => void;
}

export const CyberShieldCore: React.FC<CyberShieldCoreProps> = ({ onHoverStateChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 600;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040a, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 10.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Master Group for mouse parallax
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // 1. CYBER SHIELD CREATION
    // Construct sharp futuristic cyber shield shape
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 2.2);
    shieldShape.lineTo(1.4, 1.7);
    shieldShape.lineTo(1.6, 0.2);
    shieldShape.lineTo(0.9, -1.2);
    shieldShape.lineTo(0, -2.3);
    shieldShape.lineTo(-0.9, -1.2);
    shieldShape.lineTo(-1.6, 0.2);
    shieldShape.lineTo(-1.4, 1.7);
    shieldShape.closePath();

    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };

    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    shieldGeo.center();

    // Shield Facet Front Material (translucent glass)
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x06152d,
      emissive: 0x003366,
      emissiveIntensity: 0.4,
      metalness: 0.85,
      roughness: 0.15,
      transparent: true,
      opacity: 0.75,
      transmission: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      wireframe: false,
    });

    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.scale.set(1.1, 1.1, 1.1);
    masterGroup.add(shieldMesh);

    // Glowing Wireframe border for the shield
    const wireGeo = new THREE.WireframeGeometry(shieldGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
    const shieldWire = new THREE.LineSegments(wireGeo, wireMat);
    shieldWire.scale.set(1.11, 1.11, 1.11);
    masterGroup.add(shieldWire);

    // 2. INNER PULSING CYBER CORE
    const coreGeo = new THREE.IcosahedronGeometry(0.85, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x7928ca,
      emissiveIntensity: 1.2,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    masterGroup.add(coreMesh);

    // Central glowing energy sphere
    const energySphereGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const energySphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.7,
    });
    const energySphere = new THREE.Mesh(energySphereGeo, energySphereMat);
    masterGroup.add(energySphere);

    // 3. DIGITAL GYROSCOPIC RINGS
    const createRing = (radius: number, tubeRadius: number, color: number) => {
      const ringGeo = new THREE.TorusGeometry(radius, tubeRadius, 6, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      });
      return new THREE.Mesh(ringGeo, ringMat);
    };

    const ring1 = createRing(2.6, 0.03, 0x00f0ff);
    const ring2 = createRing(3.1, 0.025, 0x8b5cf6);
    const ring3 = createRing(3.6, 0.02, 0x3b82f6);

    ring1.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    ring3.rotation.z = Math.PI / 6;

    masterGroup.add(ring1);
    masterGroup.add(ring2);
    masterGroup.add(ring3);

    // 4. NETWORK NODES & CONNECTING LINES
    const nodeCount = 45;
    const nodeCoords: THREE.Vector3[] = [];
    const nodeGroup = new THREE.Group();

    const nodeGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.4 + Math.random() * 2.2;

      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      nodeCoords.push(pos);

      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.copy(pos);
      nodeGroup.add(node);
    }
    masterGroup.add(nodeGroup);

    // Constellation lines between nearby nodes
    const linePositions: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodeCoords[i].distanceTo(nodeCoords[j]);
        if (dist < 1.7) {
          linePositions.push(
            nodeCoords[i].x, nodeCoords[i].y, nodeCoords[i].z,
            nodeCoords[j].x, nodeCoords[j].y, nodeCoords[j].z
          );
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.25,
    });
    const constellation = new THREE.LineSegments(lineGeo, lineMat);
    masterGroup.add(constellation);

    // 5. FLOATING DIGITAL DUST PARTICLES
    const particleCount = 280;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities: number[] = [];

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 14;
      particlePositions[i + 1] = (Math.random() - 0.5) * 14;
      particlePositions[i + 2] = (Math.random() - 0.5) * 10;
      particleVelocities.push((Math.random() - 0.5) * 0.004);
      particleVelocities.push((Math.random() - 0.5) * 0.004);
      particleVelocities.push((Math.random() - 0.5) * 0.004);
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Particle sprite texture canvas
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 16;
    pCanvas.height = 16;
    const pCtx = pCanvas.getContext('2d')!;
    const pGrad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    pGrad.addColorStop(0, 'rgba(0, 240, 255, 1)');
    pGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.6)');
    pGrad.addColorStop(1, 'rgba(0,0,0,0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 16, 16);
    const pTexture = new THREE.CanvasTexture(pCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.16,
      map: pTexture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 6. LIGHTING
    const ambientLight = new THREE.AmbientLight(0x0a1936, 1.8);
    scene.add(ambientLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 3.5, 20);
    cyanPointLight.position.set(4, 3, 5);
    scene.add(cyanPointLight);

    const violetPointLight = new THREE.PointLight(0x8b5cf6, 3.5, 20);
    violetPointLight.position.set(-4, -3, 5);
    scene.add(violetPointLight);

    const centerPointLight = new THREE.PointLight(0x00f0ff, 2.0, 8);
    centerPointLight.position.set(0, 0, 1);
    masterGroup.add(centerPointLight);

    // Interaction variables
    const targetRotation = { x: 0, y: 0 };
    const mouse = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();
    let hovered = false;
    let scrollYOffset = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      mouse.x = x;
      mouse.y = y;

      // Parallax rotation targets
      targetRotation.y = x * 0.55;
      targetRotation.x = -y * 0.45;
    };

    const handleMouseLeave = () => {
      mouse.x = -999;
      mouse.y = -999;
      targetRotation.x = 0;
      targetRotation.y = 0;
      if (hovered) {
        hovered = false;
        setIsHovered(false);
        onHoverStateChange?.(false);
      }
    };

    const handleScroll = () => {
      scrollYOffset = window.scrollY;
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth damping interpolation for mouse parallax
      masterGroup.rotation.y += (targetRotation.y - masterGroup.rotation.y) * 0.05;
      masterGroup.rotation.x += (targetRotation.x - masterGroup.rotation.x) * 0.05;

      // Auto gentle hover rotation
      shieldMesh.rotation.y = Math.sin(elapsedTime * 0.6) * 0.08;
      shieldWire.rotation.y = shieldMesh.rotation.y;

      // Inner core complex rotation & pulse
      coreMesh.rotation.x = elapsedTime * 0.8;
      coreMesh.rotation.y = elapsedTime * 1.1;
      const coreScale = 1.0 + Math.sin(elapsedTime * 3) * 0.08;
      coreMesh.scale.set(coreScale, coreScale, coreScale);

      // Energy sphere breathing
      const sphereScale = 1.0 + Math.sin(elapsedTime * 5) * 0.15;
      energySphere.scale.set(sphereScale, sphereScale, sphereScale);

      // Rings rotation
      ring1.rotation.x += 0.012;
      ring1.rotation.y += 0.008;
      ring2.rotation.y -= 0.014;
      ring2.rotation.z += 0.006;
      ring3.rotation.z += 0.01;
      ring3.rotation.x -= 0.008;

      // Node constellation gentle floating
      nodeGroup.rotation.y = -elapsedTime * 0.05;
      constellation.rotation.y = -elapsedTime * 0.05;

      // Particles subtle drift
      particleSystem.rotation.y = elapsedTime * 0.02;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.05) * 0.05;

      // Scroll camera zoom/scale transition
      const scrollFactor = Math.min(scrollYOffset / 800, 1.2);
      camera.position.z = 10.5 + scrollFactor * 3.5;
      camera.position.y = -scrollFactor * 2.0;

      // Raycasting for Shield Hover Glow Detection
      if (mouse.x !== -999) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(shieldMesh);

        if (intersects.length > 0) {
          if (!hovered) {
            hovered = true;
            setIsHovered(true);
            onHoverStateChange?.(true);
          }
          // Intensify glow on hover
          shieldMat.emissiveIntensity = THREE.MathUtils.lerp(shieldMat.emissiveIntensity, 1.2, 0.1);
          shieldMat.emissive.setHex(0x00f0ff);
          wireMat.color.setHex(0x00ffff);
          wireMat.opacity = THREE.MathUtils.lerp(wireMat.opacity, 1.0, 0.1);
          centerPointLight.intensity = THREE.MathUtils.lerp(centerPointLight.intensity, 5.0, 0.1);
        } else {
          if (hovered) {
            hovered = false;
            setIsHovered(false);
            onHoverStateChange?.(false);
          }
          shieldMat.emissiveIntensity = THREE.MathUtils.lerp(shieldMat.emissiveIntensity, 0.35, 0.05);
          shieldMat.emissive.setHex(0x003366);
          wireMat.color.setHex(0x00f0ff);
          wireMat.opacity = THREE.MathUtils.lerp(wireMat.opacity, 0.8, 0.05);
          centerPointLight.intensity = THREE.MathUtils.lerp(centerPointLight.intensity, 2.0, 0.05);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      shieldGeo.dispose();
      shieldMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      energySphereGeo.dispose();
      energySphereMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      pTexture.dispose();
    };
  }, [onHoverStateChange]);

  return (
    <div className="relative w-full h-[520px] md:h-[620px] flex items-center justify-center select-none pointer-events-auto">
      {/* Three.js canvas container */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Cyber Core Status Badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-300">
        <div className={`px-4 py-1.5 rounded-full text-xs font-mono tracking-widest flex items-center gap-2 border transition-all ${
          isHovered
            ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-neon-cyan'
            : 'bg-cyber-900/70 border-cyber-cyan/20 text-slate-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isHovered ? 'bg-cyber-cyan animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
          <span>{isHovered ? 'CYBER SHIELD ACTIVE • TELEMETRY LOCKED' : '3D CORE • INTERACTIVE PARALLAX'}</span>
        </div>
      </div>
    </div>
  );
};
