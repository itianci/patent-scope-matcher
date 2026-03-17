import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react';
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  variant = 'default'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen &&
      <div className="fixed inset-0 z-[9998] flex items-center justify-center">
          <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          transition={{
            duration: 0.15
          }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onCancel} />
        
          <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
            y: 10
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: 10
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 400
          }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          
            <div className="flex items-start px-6 pt-6 pb-4">
              <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
              
                {variant === 'danger' ?
              <AlertTriangleIcon className="w-5 h-5" /> :

              <InfoIcon className="w-5 h-5" />
              }
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {message}
                </p>
              </div>
              <button
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors absolute top-4 right-4">
              
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
              <button
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
              
                {cancelText}
              </button>
              <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}