import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';
interface SelectOption {
  value: string;
  label: string;
}
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = '请选择...',
  className = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((o) => o.value === value);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node))
      {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-lg text-left transition-all ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-300 hover:border-slate-400'}`}>
        
        <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        
      </button>

      <AnimatePresence>
        {isOpen &&
        <motion.div
          initial={{
            opacity: 0,
            y: -4
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          exit={{
            opacity: 0,
            y: -4
          }}
          transition={{
            duration: 0.15
          }}
          className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg shadow-black/8 overflow-hidden">
          
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                  
                    <span>{option.label}</span>
                    {isSelected &&
                  <CheckIcon className="w-4 h-4 text-indigo-600" />
                  }
                  </button>);

            })}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}