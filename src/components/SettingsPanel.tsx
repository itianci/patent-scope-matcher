import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  SettingsIcon,
  KeyIcon,
  GlobeIcon,
  CpuIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  XCircleIcon,
  Loader2Icon,
  PlusIcon,
  ChevronRightIcon,
  SparklesIcon,
  ServerIcon,
  ZapIcon } from
'lucide-react';
import {
  getAISettings,
  saveAISettings,
  AISettings,
  AIProviderConfig } from
'../config/deepseek';
import { toast } from './Toast';
interface ProviderMeta {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  description: string;
  defaultUrl: string;
  defaultModel: string;
  models: string[];
}
const PROVIDERS: ProviderMeta[] = [
{
  id: 'deepseek',
  name: 'DeepSeek',
  icon: SparklesIcon,
  color: 'indigo',
  description: '国产大模型，性价比高，适合中文文档生成',
  defaultUrl: 'https://api.deepseek.com/chat/completions',
  defaultModel: 'deepseek-chat',
  models: ['deepseek-chat', 'deepseek-reasoner']
},
{
  id: 'openai',
  name: 'OpenAI',
  icon: ZapIcon,
  color: 'emerald',
  description: 'GPT 系列模型，全球领先的通用大语言模型',
  defaultUrl: 'https://api.openai.com/v1/chat/completions',
  defaultModel: 'gpt-4o',
  models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
},
{
  id: 'custom',
  name: '自定义接入',
  icon: ServerIcon,
  color: 'slate',
  description: '接入任意兼容 OpenAI 格式的 API 服务',
  defaultUrl: '',
  defaultModel: '',
  models: []
}];

export function SettingsPanel() {
  const [settings, setSettings] = useState<AISettings>(getAISettings);
  const [activeTab, setActiveTab] = useState<string>(settings.activeProvider);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    Record<string, 'success' | 'error' | null>>(
    {});
  const [hasChanges, setHasChanges] = useState(false);
  const updateProvider = (
  providerId: string,
  updates: Partial<AIProviderConfig>) =>
  {
    setSettings((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [providerId]: {
          ...prev.providers[providerId],
          ...updates
        }
      }
    }));
    setHasChanges(true);
  };
  const setActiveProvider = (providerId: string) => {
    setSettings((prev) => ({
      ...prev,
      activeProvider: providerId
    }));
    setHasChanges(true);
  };
  const handleSave = () => {
    saveAISettings(settings);
    setHasChanges(false);
    toast.success('设置已保存', 'AI 配置已更新，新的设置将立即生效');
  };
  const handleTest = async (providerId: string) => {
    const config = settings.providers[providerId];
    if (!config?.apiKey || !config?.apiUrl) {
      toast.warning('配置不完整', '请先填写 API Key 和 API 地址');
      return;
    }
    setTesting(providerId);
    setTestResult((prev) => ({
      ...prev,
      [providerId]: null
    }));
    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-3.5-turbo',
          messages: [
          {
            role: 'user',
            content: '你好，请回复"连接成功"'
          }],

          max_tokens: 20
        })
      });
      if (response.ok) {
        setTestResult((prev) => ({
          ...prev,
          [providerId]: 'success'
        }));
        toast.success(
          '连接成功',
          `${PROVIDERS.find((p) => p.id === providerId)?.name} API 连接正常`
        );
      } else {
        const errorData = await response.json().catch(() => null);
        setTestResult((prev) => ({
          ...prev,
          [providerId]: 'error'
        }));
        toast.error(
          '连接失败',
          errorData?.error?.message || `HTTP ${response.status}`
        );
      }
    } catch (error) {
      setTestResult((prev) => ({
        ...prev,
        [providerId]: 'error'
      }));
      toast.error('连接失败', '无法连接到 API 服务，请检查地址是否正确');
    } finally {
      setTesting(null);
    }
  };
  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••••••' + key.slice(-4);
  };
  return (
    <motion.div
      className="p-8 max-w-4xl mx-auto"
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}>
      
      <div className="mb-10">
        <div className="flex items-center mb-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mr-4">
            <SettingsIcon className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">系统设置</h1>
            <p className="text-slate-500 text-sm">
              配置 AI 服务接入，管理 API 密钥与模型参数
            </p>
          </div>
        </div>
      </div>

      {/* Provider Tabs */}
      <div className="flex gap-3 mb-8">
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon;
          const isActive = activeTab === provider.id;
          const isEnabled = settings.activeProvider === provider.id;
          const config = settings.providers[provider.id];
          const hasKey = !!config?.apiKey;
          return (
            <button
              key={provider.id}
              onClick={() => setActiveTab(provider.id)}
              className={`flex-1 p-4 rounded-xl border-2 transition-all relative ${isActive ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              
              {isEnabled &&
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                </div>
              }
              <Icon
                className={`w-6 h-6 mb-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              
              <div className="text-sm font-bold text-slate-900">
                {provider.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {hasKey ? '已配置' : '未配置'}
              </div>
            </button>);

        })}
      </div>

      {/* Active Provider Config */}
      {PROVIDERS.map((provider) => {
        if (activeTab !== provider.id) return null;
        const config = settings.providers[provider.id] || {
          apiKey: '',
          apiUrl: provider.defaultUrl,
          model: provider.defaultModel
        };
        const isEnabled = settings.activeProvider === provider.id;
        const Icon = provider.icon;
        return (
          <motion.div
            key={provider.id}
            initial={{
              opacity: 0,
              y: 10
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              duration: 0.2
            }}
            className="space-y-6">
            
            {/* Provider Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${isEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {provider.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {provider.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveProvider(provider.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isEnabled ? 'bg-emerald-100 text-emerald-700 cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  
                  {isEnabled ? '✓ 当前使用' : '启用此服务'}
                </button>
              </div>

              {/* API Key */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                    <KeyIcon className="w-4 h-4 mr-1.5 text-slate-400" />
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      value={config.apiKey}
                      onChange={(e) =>
                      updateProvider(provider.id, {
                        apiKey: e.target.value
                      })
                      }
                      placeholder="请输入 API Key..."
                      className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-mono text-sm" />
                    
                    <button
                      onClick={() =>
                      setShowKeys((prev) => ({
                        ...prev,
                        [provider.id]: !prev[provider.id]
                      }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                      
                      {showKeys[provider.id] ?
                      <EyeOffIcon className="w-4 h-4" /> :

                      <EyeIcon className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>

                {/* API URL */}
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                    <GlobeIcon className="w-4 h-4 mr-1.5 text-slate-400" />
                    API 地址
                  </label>
                  <input
                    type="text"
                    value={config.apiUrl}
                    onChange={(e) =>
                    updateProvider(provider.id, {
                      apiUrl: e.target.value
                    })
                    }
                    placeholder="https://api.example.com/v1/chat/completions"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-sm" />
                  
                </div>

                {/* Model */}
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                    <CpuIcon className="w-4 h-4 mr-1.5 text-slate-400" />
                    模型
                  </label>
                  {provider.models.length > 0 ?
                  <div className="flex flex-wrap gap-2">
                      {provider.models.map((model) =>
                    <button
                      key={model}
                      onClick={() =>
                      updateProvider(provider.id, {
                        model
                      })
                      }
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${config.model === model ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                      
                          {model}
                        </button>
                    )}
                    </div> :

                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) =>
                    updateProvider(provider.id, {
                      model: e.target.value
                    })
                    }
                    placeholder="输入模型名称，如 gpt-4o"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-sm" />

                  }
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
                <button
                  onClick={() => handleTest(provider.id)}
                  disabled={testing !== null || !config.apiKey}
                  className="flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  
                  {testing === provider.id ?
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> :
                  testResult[provider.id] === 'success' ?
                  <CheckCircleIcon className="w-4 h-4 mr-2 text-emerald-500" /> :
                  testResult[provider.id] === 'error' ?
                  <XCircleIcon className="w-4 h-4 mr-2 text-red-500" /> :

                  <ZapIcon className="w-4 h-4 mr-2" />
                  }
                  测试连接
                </button>

                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="flex items-center px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm">
                  
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  保存设置
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-amber-800 mb-2">
                💡 使用提示
              </h4>
              <ul className="text-xs text-amber-700 space-y-1.5 leading-relaxed">
                {provider.id === 'deepseek' &&
                <>
                    <li>
                      • 前往{' '}
                      <span className="font-medium">platform.deepseek.com</span>{' '}
                      注册并获取 API Key
                    </li>
                    <li>
                      • DeepSeek 模型对中文文档生成效果优秀，推荐使用
                      deepseek-chat
                    </li>
                    <li>
                      • 系统已内置默认 Key，您也可以替换为自己的 Key
                      以获得更稳定的服务
                    </li>
                  </>
                }
                {provider.id === 'openai' &&
                <>
                    <li>
                      • 前往{' '}
                      <span className="font-medium">platform.openai.com</span>{' '}
                      获取 API Key
                    </li>
                    <li>• 推荐使用 gpt-4o 模型，兼顾质量与速度</li>
                    <li>• 如果使用代理服务，请修改 API 地址为代理地址</li>
                  </>
                }
                {provider.id === 'custom' &&
                <>
                    <li>
                      • 支持任何兼容 OpenAI Chat Completions 格式的 API 服务
                    </li>
                    <li>
                      • 可接入 Claude、通义千问、文心一言等服务的 OpenAI
                      兼容接口
                    </li>
                    <li>
                      • 请确保 API 地址以{' '}
                      <span className="font-mono">/chat/completions</span> 结尾
                    </li>
                  </>
                }
              </ul>
            </div>
          </motion.div>);

      })}
    </motion.div>);

}