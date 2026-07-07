import { useState, useCallback } from 'react';
import { ToastMessage, ToastAction } from '../components/Toasts';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => {
      const exists = prev.some(t => t.id === id);
      if (!exists) return prev;
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const addToast = useCallback((msg: string, type = 'info', action?: ToastAction) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type, action }]);
    setTimeout(() => removeToast(id), action ? 5000 : 2000);
  }, [removeToast]);

  return { toasts, addToast, removeToast };
}
