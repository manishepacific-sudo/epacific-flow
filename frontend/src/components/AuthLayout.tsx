import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div 
      className="min-h-screen relative overflow-hidden cursor-gradient"
      style={{
        '--mouse-x': `${(mousePosition.x / window.innerWidth) * 100}%`,
        '--mouse-y': `${(mousePosition.y / window.innerHeight) * 100}%`,
      } as React.CSSProperties}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent animate-gradient" />
      
      {/* Floating Orbs */}
      <motion.div
        className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-xl"
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-xl"
        animate={{
          x: [0, -80, 0],
          y: [0, 60, 0],
          scale: [1, 0.8, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute top-1/2 left-1/3 w-24 h-24 bg-primary-glow/30 rounded-full blur-lg"
        animate={{
          x: [0, 60, -60, 0],
          y: [0, -40, 40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        {children}
      </div>
    </div>
  );
}