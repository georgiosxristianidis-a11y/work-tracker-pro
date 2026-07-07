import React from 'react';
import { motion } from 'motion/react';

interface AnimatedCheckProps {
  size?: number;
  className?: string;
}

export const AnimatedCheck = ({ size = 24, className = "" }: AnimatedCheckProps) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      style={{ overflow: 'visible' }}
    >
      <motion.g
        variants={{
          initial: { scale: 1, rotate: 0 },
          hover: { scale: 1.2, rotate: 10 }
        }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <path d="M20 6 9 17l-5-5"/>
      </motion.g>
    </svg>
  );
};
