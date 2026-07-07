import { motion } from 'motion/react';
import { Logo } from './Logo';

export function SplashScreen() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[1000] bg-[var(--bg)] flex flex-col items-center justify-center gap-8"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Logo className="w-20 h-20 text-[var(--t1)] drop-shadow-sm" />
      </motion.div>
      
      <div className="flex flex-col items-center gap-6">
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-black uppercase tracking-[0.3em] text-[var(--t1)]"
        >
          Work Tracker Pro
        </motion.span>
        
        <div className="grid grid-cols-2 gap-1.5 w-6 h-6">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="bg-[var(--a)] rounded-[2px]"
              animate={{
                scale: [1, 0.5, 1],
                opacity: [1, 0.3, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: [0, 0.2, 0.6, 0.4][i], // Circular wave effect
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
