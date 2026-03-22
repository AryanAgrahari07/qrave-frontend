import React, { useEffect } from "react";
import { motion } from "framer-motion";

export function NativeSplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // End splash screen after animation completes
    const timer = setTimeout(() => {
      onComplete();
    }, 3500); // 3.5 seconds duration

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Orbiting dots configuration
  const orbitDots = Array.from({ length: 6 }, (_, i) => ({
    color: i % 2 === 0 ? "#DC2626" : "#F59E0B",
    delay: i * 0.2,
  }));

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#050505]">
      {/* Cinematic zoom bg pseudo */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 3, ease: "easeOut" }}
        style={{
          background: `
            radial-gradient(ellipse at 50% 45%, rgba(220,38,38,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 30% 70%, rgba(245,158,11,0.04) 0%, transparent 40%),
            radial-gradient(ellipse at 70% 30%, rgba(59,130,246,0.03) 0%, transparent 40%)
          `,
        }}
      />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow pulse */}
      <motion.div
        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[40px]"
        initial={{ width: 100, height: 100, opacity: 0 }}
        animate={{ width: [100, 300, 400], height: [100, 300, 400], opacity: [0, 0.5, 0.2] }}
        transition={{ duration: 3, ease: "easeOut" }}
        style={{
          background: `radial-gradient(circle, rgba(220,38,38,0.6) 0%, rgba(220,38,38,0) 70%)`,
        }}
      />

      {/* Rotating ring 1 */}
      <motion.div
        className="absolute left-1/2 top-[42%] h-[300px] w-[300px] md:h-[420px] md:w-[420px] rounded-full border-2 border-transparent border-t-red-600/50 border-r-amber-500/30"
        initial={{ scale: 0, rotate: 0, opacity: 0 }}
        animate={{ scale: 1, rotate: 360, opacity: [0, 0.7, 0.5, 0] }}
        transition={{ duration: 3.5, ease: "easeInOut" }}
        style={{ x: "-50%", y: "-50%" }}
      />
      
      {/* Rotating ring 2 */}
      <motion.div
        className="absolute left-1/2 top-[42%] h-[350px] w-[350px] md:h-[480px] md:w-[480px] rounded-full border border-transparent border-b-blue-500/30 border-l-red-600/20"
        initial={{ scale: 0, rotate: 0, opacity: 0 }}
        animate={{ scale: 1, rotate: -240, opacity: [0, 0.4, 0.3, 0] }}
        transition={{ duration: 3.5, ease: "easeInOut" }}
        style={{ x: "-50%", y: "-50%" }}
      />

      {/* Orbiting dots */}
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
        {orbitDots.map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 6,
              height: 6,
              background: dot.color,
              boxShadow: `0 0 12px ${dot.color}80`,
              originX: "140px", // Orbit radius
              originY: "140px",
              x: -140, // Base offset
              y: -140,
            }}
            initial={{ rotate: i * 60, opacity: 0 }}
            animate={{ 
              rotate: i * 60 + 180, 
              opacity: [0, 0.6, 0.4, 0] 
            }}
            transition={{ duration: 3.5, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Logo Wrapper */}
      <motion.div
        className="absolute left-1/2 top-[42%] z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          damping: 15, 
          stiffness: 100, 
          mass: 1.2,
          delay: 0.2
        }}
        style={{ x: "-50%", y: "-50%" }}
      >
        <img 
          src="/logo.png" 
          alt="Orderzi Logo" 
          className="w-32 h-32 md:w-48 md:h-48 object-contain drop-shadow-2xl" 
          style={{ filter: "drop-shadow(0px 0px 20px rgba(220, 38, 38, 0.4))" }}
        />
      </motion.div>

      {/* Tagline */}
      <motion.div
        className="absolute bottom-[20%] left-1/2 w-[90%] text-center"
        initial={{ y: 20, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          damping: 12, 
          stiffness: 100,
          delay: 1.5
        }}
        style={{ x: "-50%" }}
      >
        <p className="font-inter text-4xl md:text-5xl font-bold tracking-[0.2em] md:tracking-[0.25em] bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent uppercase">
          Orderzi
        </p>
      </motion.div>
    </div>
  );
}
