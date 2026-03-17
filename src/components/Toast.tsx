import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  XIcon } from
'lucide-react';
export type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}
let toastListeners: Array<(toast: ToastItem) => void> = [];
function addToastListener(listener: (toast: ToastItem) => void) {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter((l) => l !== listener);
  };
}
function emitToast(toast: Omit<ToastItem, 'id'>) {
  const item: ToastItem = {
    ...toast,
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  };
  toastListeners.forEach((l) => l(item));
}
export const toast = {
  success: (title: string, description?: string) =>
  emitToast({
    type: 'success',
    title,
    description,
    duration: 3000
  }),
  error: (title: string, description?: string) =>
  emitToast({
    type: 'error',
    title,
    description,
    duration: 5000
  }),
  warning: (title: string, description?: string) =>
  emitToast({
    type: 'warning',
    title,
    description,
    duration: 4000
  }),
  info: (title: string, description?: string) =>
  emitToast({
    type: 'info',
    title,
    description,
    duration: 3500
  })
};
const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon
};
const colorMap = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-500',
    title: 'text-emerald-900',
    desc: 'text-emerald-700'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    title: 'text-red-900',
    desc: 'text-red-700'
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-900',
    desc: 'text-amber-700'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-900',
    desc: 'text-blue-700'
  }
};
export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => {
    return addToastListener((t) => {
      setToasts((prev) => [...prev, t]);
    });
  }, []);
  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
    setTimeout(() => dismiss(t.id), t.duration || 3500)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = iconMap[t.type];
          const colors = colorMap[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{
                opacity: 0,
                x: 80,
                scale: 0.95
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1
              }}
              exit={{
                opacity: 0,
                x: 80,
                scale: 0.95
              }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 350
              }}
              className={`pointer-events-auto ${colors.bg} ${colors.border} border rounded-xl px-4 py-3 shadow-lg shadow-black/5 flex items-start gap-3`}>
              
              <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${colors.title}`}>
                  {t.title}
                </p>
                {t.description &&
                <p className={`text-xs mt-0.5 ${colors.desc}`}>
                    {t.description}
                  </p>
                }
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 mt-0.5">
                
                <XIcon className="w-4 h-4" />
              </button>
            </motion.div>);

        })}
      </AnimatePresence>
    </div>);

}