import React from 'react';
import { motion } from 'motion/react';

interface AnimatedTrashProps {
  isConfirming?: boolean;
  isHovered?: boolean;
  openProgress?: number;
  size?: number;
  className?: string;
}

export const AnimatedTrash = ({ isConfirming = false, isHovered = false, openProgress = 0, size = 24, className = "" }: AnimatedTrashProps) => {
  const isOpen = isConfirming || isHovered;
  const clamped = Math.max(0, Math.min(1, openProgress));
  const lidAnimate = clamped > 0
    ? { rotate: 16 * clamped, x: 1 * clamped, y: -2.2 * clamped }
    : isOpen
      ? { rotate: 14, x: 0.9, y: -1.9 }
      : { rotate: 0, x: 0, y: 0 };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ overflow: 'visible' }}
    >
      <motion.g
        initial={false}
        animate={lidAnimate}
        style={{ originX: "20px", originY: "6px" }}
        transition={clamped > 0 ? { duration: 0.04 } : { duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
      >
        <path d="M3 6h18"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      </motion.g>
      <motion.path
        d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
        initial={false}
        animate={{
          y: isOpen || clamped > 0.3 ? 0.5 : 0,
          scale: isOpen || clamped > 0.3 ? 0.985 : 1
        }}
        transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
        style={{ originX: "12px", originY: "14px" }}
      />
    </svg>
  );
};
