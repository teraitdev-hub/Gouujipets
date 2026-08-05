import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, PerspectiveCamera, Sparkles } from '@react-three/drei';

const AnimatedScene = () => {
  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
      <directionalLight position={[-10, -10, -5]} intensity={1} color="#f472b6" />
      
      {/* Primary prominent orb (Purple) */}
      <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
        <Sphere visible args={[1, 64, 64]} position={[-4, 1, -2]} scale={1.8}>
          <MeshDistortMaterial
            color="#9333ea"
            attach="material"
            distort={0.4}
            speed={2}
            roughness={0.2}
            metalness={0.1}
            transparent={true}
            opacity={0.8}
          />
        </Sphere>
      </Float>

      {/* Secondary orb (Pink) */}
      <Float speed={2.5} rotationIntensity={2} floatIntensity={1.5}>
        <Sphere visible args={[1, 64, 64]} position={[4, -1.5, -4]} scale={1.4}>
          <MeshDistortMaterial
            color="#db2777"
            attach="material"
            distort={0.5}
            speed={1.5}
            roughness={0.3}
            metalness={0.2}
            transparent={true}
            opacity={0.7}
          />
        </Sphere>
      </Float>
      
      {/* Small accent orb (Blue) */}
      <Float speed={3} rotationIntensity={2.5} floatIntensity={2.5}>
        <Sphere visible args={[1, 64, 64]} position={[2, 2.5, -3]} scale={0.8}>
          <MeshDistortMaterial
            color="#3b82f6"
            attach="material"
            distort={0.3}
            speed={3}
            roughness={0.1}
            metalness={0.1}
            transparent={true}
            opacity={0.8}
          />
        </Sphere>
      </Float>

      {/* Another small accent orb (Orange/Yellow) */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <Sphere visible args={[1, 64, 64]} position={[-2, -2.5, -5]} scale={1.1}>
          <MeshDistortMaterial
            color="#f59e0b"
            attach="material"
            distort={0.4}
            speed={2.5}
            roughness={0.2}
            metalness={0.1}
            transparent={true}
            opacity={0.6}
          />
        </Sphere>
      </Float>
      
      {/* Subtle sparkling particles in the background */}
      <Sparkles count={150} scale={15} size={2} speed={0.4} opacity={0.3} color="#6366f1" />
      <Sparkles count={100} scale={12} size={1.5} speed={0.3} opacity={0.2} color="#ec4899" />
    </>
  );
};

export const Hero3DBackground = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(241,245,249,0.8) 100%)' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
        <AnimatedScene />
      </Canvas>
    </div>
  );
};
