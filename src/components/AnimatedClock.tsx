import React from 'react';
import { motion } from 'motion/react';

interface AnimatedClockProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  isHovered?: boolean;
}

export const AnimatedClock = ({ size = 24, className = "", strokeWidth = 2, isHovered = false }: AnimatedClockProps) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      {/* Minute hand rotates fully */}
      <motion.polyline 
        points="12 6 12 12"
        animate={{ rotate: isHovered ? 360 : 0 }}
        transition={{ duration: 1.5, ease: "linear", repeat: isHovered ? Infinity : 0 }}
        style={{ transformOrigin: "12px 12px" }}
      />
      {/* Hour hand springs slightly */}
      <motion.polyline 
        points="12 12 16 14"
        animate={{ rotate: isHovered ? [0, 15, -5, 0] : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut", repeat: isHovered ? Infinity : 0, repeatDelay: 0.5 }}
        style={{ transformOrigin: "12px 12px" }}
      />
    </svg>
  );
};
