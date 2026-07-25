import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { PawPrint } from "lucide-react";

function AbstractShape() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <torusKnotGeometry args={[1, 0.3, 128, 16]} />
        <meshPhysicalMaterial 
          color="#5FA46A" 
          roughness={0.1} 
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
    </Float>
  );
}

export const DashboardHero = () => {
  return (
    <div className="relative w-full h-[320px] rounded-[24px] overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/30 border border-white/40 shadow-sm flex items-center mb-8">
      
      {/* 3D Canvas Background Element */}
      <div className="absolute right-0 top-0 w-1/2 h-full opacity-60 md:opacity-100 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <AbstractShape />
          <Environment preset="city" />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
        </Canvas>
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 md:px-12 w-full md:w-2/3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FDFBF7]/60 backdrop-blur-md border border-white/40 text-primary text-sm font-semibold mb-6 shadow-sm">
          <PawPrint size={16} />
          <span>Welcome back, Jane!</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-text leading-tight mb-4 tracking-tight">
          Your pets are doing <span className="text-primary">great today.</span>
        </h1>
        
        <p className="text-text-light text-lg mb-8 max-w-md">
          Bella has a grooming appointment at 2:00 PM. Don't forget to pack her favorite treats!
        </p>
        
        <button className="bg-text text-white px-8 py-3.5 rounded-[16px] font-medium hover:bg-primary transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95">
          View Appointments
        </button>
      </div>
      
      {/* Decorative Blur Orbs */}
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-accent/20 rounded-full blur-[80px]" />
      <div className="absolute top-10 right-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[60px]" />
    </div>
  );
};
