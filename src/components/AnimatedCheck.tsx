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
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ overflow: 'visible' }}
    >
      <motion.path
        d="M20 6 9 17l-5-5"
        initial={false}
        variants={{
          initial: { scale: 1, opacity: 1, pathLength: 1 },
          hover: {
            scale: [1, 0.45, 0.45, 1.06, 1],
            opacity: [1, 0, 0, 1, 1],
            pathLength: [1, 0, 0, 1, 1],
            transition: {
              duration: 0.68,
              times: [0, 0.28, 0.4, 0.78, 1],
              ease: [0.16, 1, 0.3, 1],
            },
          },
        }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </svg>
  );
};
