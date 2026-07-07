import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star } from 'lucide-react';

export const SuccessSparkles = ({ active }: { active: boolean }) => {
  const [sparkles, setSparkles] = useState<{ id: number, x: number, y: number, scale: number }[]>([]);

  useEffect(() => {
    if (active) {
      const newSparkles = Array.from({ length: 6 }).map((_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        scale: Math.random() * 0.5 + 0.5
      }));
      setSparkles(newSparkles);
      const timer = setTimeout(() => setSparkles([]), 1500);
      return () => clearTimeout(timer);
    }
  }, [active]);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      <AnimatePresence>
        {sparkles.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 0], 
              scale: [0, s.scale, 0],
              x: s.x,
              y: s.y
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute text-[var(--a)]"
          >
            <Star size={16} fill="currentColor" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
