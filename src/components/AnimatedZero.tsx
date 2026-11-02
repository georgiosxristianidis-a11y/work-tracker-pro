import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Rocket } from 'lucide-react';

interface AnimatedZeroProps {
  type: 'earnings' | 'hours';
  t: (k: string) => string;
  onClick?: () => void;
}

export const AnimatedZero = ({ type, t, onClick }: AnimatedZeroProps) => {
  const [isTakingOff, setIsTakingOff] = useState(false);

  const handleClick = () => {
    if (onClick && !isTakingOff) {
      setIsTakingOff(true);
      // Wait for smooth flight animation to complete before switching view
      setTimeout(() => {
        onClick();
        // Reset state after transition if screen stays mounted
        setTimeout(() => setIsTakingOff(false), 500);
      }, 420);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2.5 h-[42px] px-4 rounded-control apple-glass-pill text-[var(--t1)] border border-[var(--b)] shadow-sm ${onClick ? 'cursor-pointer pointer-events-auto' : ''}`}
      onClick={handleClick}
      title={type === 'earnings' ? t("Time is money!") : t("Start Work")}
      whileHover={onClick && !isTakingOff ? { scale: 1.03 } : {}}
      whileTap={onClick && !isTakingOff ? { scale: 0.96 } : {}}
    >
      <motion.div
        animate={
          isTakingOff 
            ? { y: -130, x: 130, opacity: 0, scale: 0.35, rotate: 45 } 
            : { y: [0, -2.5, 0], rotate: type === 'earnings' ? [0, 5, -5, 0] : 0 }
        }
        transition={
          isTakingOff 
            ? { duration: 0.45, ease: [0.32, 0, 0.67, 0] } 
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
        className="text-[var(--a)]"
      >
        {type === 'earnings' ? <Flame size={19} strokeWidth={2} /> : <Rocket size={19} strokeWidth={2} />}
      </motion.div>
      <motion.span 
        animate={isTakingOff ? { opacity: 0, x: -6 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="text-[11px] font-black uppercase tracking-wider text-[var(--t1)] select-none"
      >
        {type === 'earnings' ? t("Time is money!") : t("Start Work")}
      </motion.span>
    </motion.div>
  );
};
