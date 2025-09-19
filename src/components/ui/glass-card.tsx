import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  hover?: boolean;
  delay?: number;
  className?: string;
  onClick?: () => void;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, hover = true, delay = 0, onClick }, ref) => {
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
          "glass-card p-6 transition-all duration-300",
          hover && "hover:shadow-glass cursor-pointer",
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

export { GlassCard };