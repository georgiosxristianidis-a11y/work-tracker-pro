import React from 'react';
import { motion } from 'motion/react';

interface AnimatedWandProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  isHovered?: boolean;
  isTapped?: boolean;
}

export const AnimatedWand = ({ size = 24, className = "", strokeWidth = 2, isHovered = false, isTapped = false }: AnimatedWandProps) => {
  const getVariant = () => {
    if (isTapped) return 'tap';
    if (isHovered) return 'hover';
    return 'initial';
  };

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
      style={{ overflow: 'visible' }}
    >
      <motion.g
        animate={getVariant()}
        variants={{
          initial: { rotate: 0, scale: 1 },
          hover: { 
            rotate: [0, -12, 4, -8, 0],
            scale: [1, 1.05, 1],
            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          },
          tap: { 
            rotate: -40, 
            scale: 1.15,
            transition: { type: "spring", stiffness: 400, damping: 10 } 
          }
        }}
        style={{ transformOrigin: "2.36px 18.64px" }}
      >
        <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/>
        <path d="m14 7 3 3"/>
      </motion.g>

      {/* Elite Sparkle 1 */}
      <motion.path
        d="M18 4l1-2.5L21.5 0.5L19 2l-1 2.5L16.5 6L18 4z"
        fill="currentColor"
        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
        animate={getVariant()}
        variants={{
          initial: { opacity: 0, scale: 0, rotate: 0, x: 0, y: 0 },
          hover: { 
            opacity: [0, 1, 0], 
            scale: [0, 1.2, 0], 
            rotate: [0, 90], 
            x: [0, 6], 
            y: [0, -6],
            transition: { duration: 1.2, repeat: Infinity, delay: 0.1, ease: "easeInOut" } 
          },
          tap: { 
            opacity: [0, 1, 0], 
            scale: [0, 1.8, 0], 
            rotate: [0, 180], 
            x: [0, 12], 
            y: [0, -12],
            transition: { duration: 0.6, ease: "easeOut" } 
          }
        }}
      />
      
      {/* Elite Sparkle 2 */}
      <motion.path
        d="M21 9l0.8-1.5L23.5 7L21.5 7.8L21 9z"
        fill="currentColor"
        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
        animate={getVariant()}
        variants={{
          initial: { opacity: 0, scale: 0, rotate: 0, x: 0, y: 0 },
          hover: { 
            opacity: [0, 1, 0], 
            scale: [0, 1.5, 0], 
            rotate: [0, -90], 
            x: [0, 8], 
            y: [0, 4],
            transition: { duration: 1.4, repeat: Infinity, delay: 0.5, ease: "easeInOut" } 
          },
          tap: { 
            opacity: [0, 1, 0], 
            scale: [0, 2], 
            rotate: [0, -180], 
            x: [0, 16], 
            y: [0, 8],
            transition: { duration: 0.5, ease: "easeOut" } 
          }
        }}
      />

      {/* Elite Sparkle 3 */}
      <motion.path
        d="M14 2l0.8-1.5L16.5 0L14.5 0.8L14 2z"
        fill="currentColor"
        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
        animate={getVariant()}
        variants={{
          initial: { opacity: 0, scale: 0, rotate: 0, x: 0, y: 0 },
          hover: { 
            opacity: [0, 1, 0], 
            scale: [0, 1.3, 0], 
            rotate: [0, 45], 
            x: [0, -4], 
            y: [0, -4],
            transition: { duration: 1.1, repeat: Infinity, delay: 0.8, ease: "easeInOut" } 
          },
          tap: { 
            opacity: [0, 1, 0], 
            scale: [0, 1.6, 0], 
            rotate: [0, 90], 
            x: [0, -8], 
            y: [0, -8],
            transition: { duration: 0.4, ease: "easeOut" } 
          }
        }}
      />
    </svg>
  );
};

