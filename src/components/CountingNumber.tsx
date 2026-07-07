import React, { useEffect, useRef } from 'react';
import { animate } from 'motion/react';
import { formatMoney } from '../lib/utils';

interface CountingNumberProps {
  value: number;
  decimals?: number;
}

export function CountingNumber({ value, decimals = 0 }: CountingNumberProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const currentValue = useRef(value);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const startValue = currentValue.current;
    const controls = animate(startValue, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1], // Premium spring-like ease
      onUpdate(current) {
        currentValue.current = current;
        node.textContent = formatMoney(current, decimals);
      }
    });

    return () => controls.stop();
  }, [value, decimals]);

  return (
    <span ref={nodeRef} className="tabular-nums tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {formatMoney(value, decimals)}
    </span>
  );
}
