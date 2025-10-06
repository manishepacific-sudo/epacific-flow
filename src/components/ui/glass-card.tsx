import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  hover?: boolean;
  delay?: number;
  className?: string;
  onClick?: () => void;
  glass?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, hover = true, delay = 0, onClick, glass = false }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.6, 
          delay,
          type: "spring",
          stiffness: 100,
          damping: 20
        }}
        whileHover={hover ? { 
          scale: 1.02, 
          y: -4,
          transition: { duration: 0.2 }
        } : undefined}
        className={cn(
          // Base styles with theme-aware backgrounds
          "backdrop-blur-md rounded-2xl border transition-all duration-300",
          glass 
            ? "bg-card/60 dark:bg-card/40 border-border/50" 
            : "bg-card/95 border-border",
          hover && "hover:shadow-glow hover:bg-card/100 dark:hover:bg-card/60 cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";

<<<<<<< HEAD
=======
export { GlassCard };

>>>>>>> feature/settings-management
export { GlassCard };