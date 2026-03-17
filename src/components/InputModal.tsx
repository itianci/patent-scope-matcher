import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from 'lucide-react';
interface InputModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}
export function InputModal({
  isOpen,
  title,
  placeholder = '',
  defaultValue = '',
  onConfirm,
  onCancel
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);
  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value.trim());
      setValue('');
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };
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
          
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <button
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-4">
              <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" />
            
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-5">
              <button
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
              
                取消
              </button>
              <button
              onClick={handleConfirm}
              disabled={!value.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
              
                确定
              </button>
            </div>
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}