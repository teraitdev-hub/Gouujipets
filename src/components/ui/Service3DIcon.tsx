import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Torus, Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

export type ServiceType = 'boarding' | 'grooming' | 'veterinary' | 'health_tracking' | 'daycare' | 'shop' | 'taxi' | 'training';

interface Service3DIconProps {
  type: ServiceType;
}

const IconModel = ({ type }: { type: ServiceType }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Rotate slightly on hover
  useFrame((state, delta) => {
    if (meshRef.current) {
      if (hovered) {
        meshRef.current.rotation.y += delta * 1.5;
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -0.2, 0.1);
      } else {
        meshRef.current.rotation.y += delta * 0.2;
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 0.1);
      }
    }
  });

  const getGeometryAndMaterial = () => {
    const defaultMaterial = <meshPhysicalMaterial color="#9333ea" roughness={0.1} metalness={0.8} clearcoat={1} />;
    
    switch (type) {
      case 'boarding':
      case 'daycare':
        // A premium stylized house/kennel (Placeholder: Box)
        return (
          <Box args={[1.5, 1.5, 1.5]} ref={meshRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            {defaultMaterial}
          </Box>
        );
      case 'grooming':
        // Grooming tool (Placeholder: Torus + Cylinder like scissors)
        return (
          <group ref={meshRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <Torus args={[0.5, 0.2, 16, 32]} position={[-0.5, -0.5, 0]}>
              <meshPhysicalMaterial color="#ec4899" roughness={0.2} metalness={0.7} />
            </Torus>
            <Torus args={[0.5, 0.2, 16, 32]} position={[0.5, -0.5, 0]}>
              <meshPhysicalMaterial color="#ec4899" roughness={0.2} metalness={0.7} />
            </Torus>
          </group>
        );
      case 'veterinary':
      case 'health_tracking':
        // Medical Cross / Pill (Placeholder: Sphere)
        return (
          <Sphere args={[1, 32, 32]} ref={meshRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <meshPhysicalMaterial color="#3b82f6" roughness={0.1} metalness={0.3} transmission={0.9} ior={1.5} thickness={2} />
          </Sphere>
        );
      case 'shop':
        return (
          <Box args={[1.2, 1.5, 1.2]} ref={meshRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <meshPhysicalMaterial color="#f59e0b" roughness={0.2} metalness={0.5} />
          </Box>
        );
      case 'taxi':
        return (
          <Cylinder args={[1, 1, 0.5, 32]} ref={meshRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <meshPhysicalMaterial color="#10b981" roughness={0.3} metalness={0.8} />
          </Cylinder>
        );
      case 'training':
        return (
          <Torus args={[0.8, 0.3, 16, 64]} ref={meshRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <meshPhysicalMaterial color="#8b5cf6" roughness={0.1} metalness={0.9} />
          </Torus>
        );
      default:
        return (
          <Sphere args={[1, 32, 32]} ref={meshRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            {defaultMaterial}
          </Sphere>
        );
    }
  };

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      {getGeometryAndMaterial()}
    </Float>
  );
};

export const Service3DIcon = ({ type }: Service3DIconProps) => {
  return (
    <div className="w-full h-full min-h-[120px] pointer-events-auto">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <Environment preset="studio" />
        <IconModel type={type} />
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={5} blur={1.5} far={2} />
      </Canvas>
    </div>
  );
};
