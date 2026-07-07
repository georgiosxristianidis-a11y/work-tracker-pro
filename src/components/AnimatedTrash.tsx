import React from 'react';
import { motion } from 'motion/react';

interface AnimatedTrashProps {
  isConfirming?: boolean;
  isHovered?: boolean;
  size?: number;
  className?: string;
}

export const AnimatedTrash = ({ isConfirming = false, isHovered = false, size = 24, className = "" }: AnimatedTrashProps) => {
  const isOpen = isConfirming || isHovered;
  
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      style={{ overflow: 'visible' }}
    >
      <motion.g
        variants={{
          initial: { rotate: 0, x: 0, y: 0 },
          hover: { rotate: 15, x: 1, y: -2 }
        }}
        initial="initial"
        animate={isOpen ? "hover" : undefined}
        style={{ originX: "21px", originY: "6px" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <path d="M3 6h18"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      </motion.g>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    </svg>
  );
};
