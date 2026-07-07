import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Rocket } from 'lucide-react';

export const AnimatedZero = ({ type, t, onClick }: { type: 'earnings' | 'hours', t: (k: string) => string, onClick?: () => void }) => {
  const [isTakingOff, setIsTakingOff] = useState(false);

  const handleClick = () => {
    if (onClick && !isTakingOff) {
      setIsTakingOff(true);
      setTimeout(() => {
        onClick();
        // Reset state after transition if the component stays mounted
        setTimeout(() => setIsTakingOff(false), 500);
      }, 500);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 h-[40px] px-4 rounded-[12px] bg-[var(--bg)] text-[var(--t1)] shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[var(--b)] ${onClick ? 'cursor-pointer pointer-events-auto' : ''}`}
      onClick={handleClick}
      title={type === 'earnings' ? t("Time is money!") : t("Start Work")}
      whileHover={onClick && !isTakingOff ? { scale: 1.05 } : {}}
      whileTap={onClick && !isTakingOff ? { scale: 0.95 } : {}}
    >
      <motion.div
        animate={
          isTakingOff 
            ? { y: -100, x: 100, opacity: 0, scale: 0.5, rotate: 45 } 
            : { y: [0, -3, 0], rotate: type === 'earnings' ? [0, 5, -5, 0] : 0 }
        }
        transition={
          isTakingOff 
            ? { duration: 0.5, ease: "easeIn" } 
            : { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {type === 'earnings' ? <Flame size={24} strokeWidth={2.5} /> : <Rocket size={24} strokeWidth={2.5} />}
      </motion.div>
      <span className="text-[12px] font-black uppercase tracking-wider text-[var(--t1)]">
        {type === 'earnings' ? t("Time is money!") : t("Start Work")}
      </span>
    </motion.div>
  );
};
