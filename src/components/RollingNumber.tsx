import React from 'react';
import { motion } from 'motion/react';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const RollingDigit = React.memo(({ digit }: { digit: number }) => (
  <span className="inline-block relative overflow-hidden h-[1em] leading-[1em] align-baseline select-none">
    <motion.span
      className="flex flex-col"
      initial={false}
      animate={{ y: `-${digit * 10}%` }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.8 }}
    >
      {DIGITS.map(n => <span key={n} className="h-[1em] flex items-center justify-center">{n}</span>)}
    </motion.span>
  </span>
));
RollingDigit.displayName = 'RollingDigit';

export interface RollingNumberProps {
  value: string | number;
  className?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const RollingNumber = React.memo(({ value, className = '', prefix, suffix }: RollingNumberProps) => {
  const str = String(value);
  return (
    <span className={`inline-flex items-baseline overflow-hidden ${className}`} aria-label={str}>
      {prefix}
      {str.split('').map((c, i) => (c >= '0' && c <= '9')
        ? <RollingDigit key={`${str.length - i}-${c}`} digit={parseInt(c, 10)} />
        : <span key={i} className="inline-block whitespace-pre">{c === ' ' ? '\u00A0' : c}</span>
      )}
      {suffix}
    </span>
  );
});
RollingNumber.displayName = 'RollingNumber';
