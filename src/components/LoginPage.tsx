import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wand2Icon,
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  AlertCircleIcon } from
'lucide-react';
interface LoginPageProps {
  onLogin: () => void;
}
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin123';
export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setIsLoading(true);
    // Simulate a brief delay for UX
    await new Promise((r) => setTimeout(r, 600));
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem(
        'auth_token',
        JSON.stringify({
          user: username,
          loginAt: new Date().toISOString()
        })
      );
      onLogin();
    } else {
      setError('用户名或密码错误');
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{
          opacity: 0,
          y: 24
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          duration: 0.5
        }}>
        
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <motion.div
            className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30"
            initial={{
              scale: 0.8,
              rotate: -10
            }}
            animate={{
              scale: 1,
              rotate: 0
            }}
            transition={{
              delay: 0.2,
              type: 'spring',
              stiffness: 200
            }}>
            
            <Wand2Icon className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">
            CanJobAI 软著文档系统
          </h1>
          <p className="text-slate-400 text-sm">智能生成软件著作权申请材料</p>
        </div>

        {/* Login Card */}
        <motion.div
          className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl"
          initial={{
            opacity: 0,
            y: 12
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: 0.15
          }}>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                用户名
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" />
                
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                密码
              </label>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  
                  {showPassword ?
                  <EyeOffIcon className="w-4 h-4" /> :

                  <EyeIcon className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error &&
            <motion.div
              initial={{
                opacity: 0,
                y: -4
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              className="flex items-center px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              
                <AlertCircleIcon className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-400">{error}</span>
              </motion.div>
            }

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center">
              
              {isLoading ?
              <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  登录中...
                </> :

              '登 录'
              }
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-8">
          © 2026 CanJobAI 软著文档系统 · 仅限授权用户使用
        </p>
      </motion.div>
    </div>);

}