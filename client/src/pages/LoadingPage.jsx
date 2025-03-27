import { useState, useEffect, useMemo  } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Points, PointMaterial } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { Earth } from "../models/Earth"; 
import { motion } from "framer-motion";
import * as THREE from "three";
import '../index.css'; 

export default function LoadingPage({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 1500);
          }, 1000);
          return 100;
        }
        return oldProgress + 1.8;
      });
    }, 80);
    

    return () => clearInterval(interval);
  }, [onComplete]);


  const letters = useMemo(() => 
    "LOADING...".split("").map((char, idx) => ({
      char,
      initialX: (Math.random() - 0.5) * 500,
      initialY: (Math.random() - 0.5) * 500,
    })), []
  );
  //#a09595

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center 
                 bg-gradient-to-br from-[#a09595] to-[#141212] text-white transition-opacity duration-1000"
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
    >
      {/* 3D Space Scene */}
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Stars radius={150} depth={80} count={200} factor={6} fade />
        
        {/* Postprocessing Effects */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={400} />
          <Noise opacity={0.05} />
          <Vignette eskil={false} offset={0.2} darkness={0.7} />
        </EffectComposer>

        {/* Rotating Glowing Earth */}
        <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={1.8} />
        <ambientLight intensity={1.5} />
        <spotLight position={[5, 5, 5]} intensity={5} />
        <Earth scale={[1.1, 1.1, 1.1]} position={[0, 0.5, 0]}/>

        {/* Particle Orbit */}
        <Points
          limit={200}
          positions={new Float32Array(Array.from({ length: 600 }, () => (Math.random() - 0.5) * 8))}
        >
          <PointMaterial size={0.01} color="#a09897" opacity={0.9} />
        </Points>

        {/* Animated Glitchy Loading Text */}
        <Html position={[0, -0.3, 0]}>
          {/* Loading Text (outside Canvas to fix position) */}
            <motion.div
               className="absolute top-2 left-1 -translate-x-1/2 flex space-x-2 pointer-events-none"
            >
              {"LOADING...".split("").map((char, idx) => (
                <motion.span
                  key={idx}
                  initial={{
                    x: (Math.random() - 0.5) * 500,
                    y: (Math.random() - 0.5) * 500,
                    opacity: 0,
                    }}
                    animate={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                    color: ["#c2b8b0", "#c2b8b0", "#c2b8b0"][idx % 3],
                    textShadow: ["0 0 10px #5A4C50", "0 0 15px #5A4C50"][idx % 2],
                    }}
                    transition={{
                      duration: 1.2,
                      delay: idx * 0.1,
                      type: "spring",
                      stiffness: 70,
                  }}
                  style={{
                    fontSize: "3.8rem",
                    fontFamily: "monospace",
                    backdropFilter: "blur(4px)",
                    mixBlendMode: "screen",
                  }}
                >
                  {char}
                </motion.span>
              ))}
              </motion.div>
        </Html>
      </Canvas>

      {/* Progress Indicator */}
      <motion.div
        className="absolute bottom-27 text-sm tracking-widest text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {progress}% Loaded
      </motion.div>
    </motion.div>
  );
}