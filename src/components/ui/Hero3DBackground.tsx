import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, Box, Torus, Float, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

const AnimatedScene = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, pointer } = useThree();

  // Mouse parallax effect (3-5% shift)
  useFrame(() => {
    if (groupRef.current) {
      gsap.to(groupRef.current.rotation, {
        x: (pointer.y * Math.PI) / 40,
        y: (pointer.x * Math.PI) / 40,
        duration: 2,
        ease: 'power2.out',
      });
      gsap.to(camera.position, {
        x: pointer.x * 0.5,
        y: pointer.y * 0.5,
        duration: 2,
        ease: 'power2.out',
      });
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1.5} castShadow />
      
      {/* Studio Environment for Pixar-quality lighting */}
      <Environment preset="studio" />

      <group ref={groupRef}>
        {/* Main Centerpiece Placeholder (Dog/Cat) */}
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
          <Sphere visible args={[1.5, 64, 64]} position={[0, 0, 0]}>
            <meshPhysicalMaterial 
              color="#ffffff"
              transmission={1} 
              opacity={1} 
              metalness={0.1} 
              roughness={0.1} 
              ior={1.5} 
              thickness={2} 
              envMapIntensity={2} 
            />
          </Sphere>
        </Float>

        {/* Toy 1 (Bone/Ball) */}
        <Float speed={2} rotationIntensity={2} floatIntensity={1.5}>
          <Box visible args={[0.5, 0.5, 0.5]} position={[-3, 1, -2]}>
            <meshPhysicalMaterial color="#9333ea" metalness={0.8} roughness={0.2} envMapIntensity={1} />
          </Box>
        </Float>

        {/* Toy 2 (Cat Toy) */}
        <Float speed={2.5} rotationIntensity={2.5} floatIntensity={2}>
          <Torus visible args={[0.4, 0.15, 16, 32]} position={[3, -1, -1]}>
            <meshPhysicalMaterial color="#db2777" metalness={0.5} roughness={0.1} clearcoat={1} envMapIntensity={1.5} />
          </Torus>
        </Float>

        {/* Small floating accents */}
        <Float speed={3} rotationIntensity={1} floatIntensity={2}>
          <Sphere visible args={[0.3, 32, 32]} position={[-2, -2, 1]}>
            <meshPhysicalMaterial color="#3b82f6" transmission={0.8} roughness={0.2} ior={1.4} />
          </Sphere>
        </Float>
      </group>

      {/* Ground soft shadows */}
      <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={20} blur={2} far={4} />
    </>
  );
};

export const Hero3DBackground = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(241,245,249,0.9) 100%)' }}>
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
        <AnimatedScene />
      </Canvas>
    </div>
  );
};
