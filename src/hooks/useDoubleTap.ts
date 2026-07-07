import { useState, useEffect } from 'react';

export function useDoubleTap(action: () => void, timeout = 3000) {
  const [isConfirming, setIsConfirming] = useState(false);
  
  useEffect(() => {
    let t: any;
    if (isConfirming) t = setTimeout(() => setIsConfirming(false), timeout);
    return () => clearTimeout(t);
  }, [isConfirming, timeout]);
  
  return {
    isConfirming,
    trigger: () => {
      if (isConfirming) {
        setIsConfirming(false);
        action();
      } else {
        setIsConfirming(true);
      }
    }
  };
}
