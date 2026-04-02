import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'undo';
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

let toastId = 0;
let toastCallbacks: ((toast: ToastMessage) => void)[] = [];

export const showToast = (message: string, type: 'success' | 'error' | 'undo' = 'success', duration: number = 3000, action?: ToastMessage['action']) => {
  const id = String(toastId++);
  const toast: ToastMessage = {
    id,
    message,
    type,
    duration,
    action
  };
  toastCallbacks.forEach(cb => cb(toast));
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: ToastMessage) => {
    setToasts(prev => [...prev, toast]);
    
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  toastCallbacks = [addToast];

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 pointer-events-none max-w-md mx-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`mb-3 p-4 rounded-2xl backdrop-blur-md shadow-lg border pointer-events-auto flex items-center justify-between gap-3 ${
              toast.type === 'success'
                ? 'bg-green-50/80 border-green-200 text-green-800'
                : toast.type === 'error'
                ? 'bg-red-50/80 border-red-200 text-red-800'
                : 'bg-blue-50/80 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              {toast.type === 'success' && <CheckCircle2 size={20} className="flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle size={20} className="flex-shrink-0" />}
              {toast.type === 'undo' && <AlertCircle size={20} className="flex-shrink-0" />}
              <span className="font-medium text-sm">{toast.message}</span>
            </div>
            
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.callback();
                  removeToast(toast.id);
                }}
                className="font-bold text-xs px-3 py-1.5 bg-white/60 rounded-lg hover:bg-white transition-all active:scale-95"
              >
                {toast.action.label}
              </button>
            )}
            
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
