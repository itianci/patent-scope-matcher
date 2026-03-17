import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PlusIcon,
  XIcon,
  SaveIcon,
  Wand2Icon,
  Loader2Icon } from
'lucide-react';
import { AppView, Project } from '../types';
import { AIService } from '../services/ai';
import { toast } from './Toast';
import { CustomSelect } from './CustomSelect';
interface ProjectFormProps {
  project: Project | null;
  onSave: (project: any) => void;
  onCancel: () => void;
}
export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    version: 'V1.0',
    completionDate: '',
    softwareType: '应用软件',
    industry: '',
    mainFunctions: '',
    techArchitecture: '',
    devLanguage: '',
    runEnvironment: '',
    modules: []
  });
  const [newModule, setNewModule] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const handleAiFill = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const parsedData = await AIService.parseProjectInfo(aiPrompt);
      setFormData((prev) => ({
        ...prev,
        name: parsedData.name || prev.name,
        softwareType: parsedData.softwareType as any || prev.softwareType,
        industry: parsedData.industry || prev.industry,
        mainFunctions: parsedData.mainFunctions || prev.mainFunctions,
        techArchitecture: parsedData.techArchitecture || prev.techArchitecture,
        devLanguage: parsedData.devLanguage || prev.devLanguage,
        runEnvironment: parsedData.runEnvironment || prev.runEnvironment,
        completionDate:
        prev.completionDate || new Date().toISOString().split('T')[0],
        modules:
        parsedData.modules && parsedData.modules.length > 0 ?
        parsedData.modules :
        prev.modules
      }));
      setAiPrompt('');
    } catch (error) {
      toast.error(
        'AI解析失败',
        '请尝试更详细的描述，例如"一个在线教育平台，支持视频课程和考试"'
      );
    } finally {
      setIsAiLoading(false);
    }
  };
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        version: project.version,
        completionDate: project.completionDate,
        softwareType: project.softwareType,
        industry: project.industry,
        mainFunctions: project.mainFunctions,
        techArchitecture: project.techArchitecture,
        devLanguage: project.devLanguage,
        runEnvironment: project.runEnvironment,
        modules: [...project.modules]
      });
    }
  }, [project]);
  const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  const addModule = () => {
    if (newModule.trim() && !formData.modules.includes(newModule.trim())) {
      setFormData((prev) => ({
        ...prev,
        modules: [...prev.modules, newModule.trim()]
      }));
      setNewModule('');
    }
  };
  const removeModule = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== index)
    }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  const softwareTypeOptions = [
  {
    value: '应用软件',
    label: '应用软件'
  },
  {
    value: '系统软件',
    label: '系统软件'
  },
  {
    value: '平台软件',
    label: '平台软件'
  }];

  return (
    <motion.div
      className="p-8 max-w-5xl mx-auto"
      initial={{
        opacity: 0,
        x: 20
      }}
      animate={{
        opacity: 1,
        x: 0
      }}>
      
      <div className="flex items-center mb-8">
        <button
          onClick={onCancel}
          className="mr-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {project ? '编辑项目' : '创建新项目'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            完善软件基本信息，以便AI更准确地生成文档
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* AI 一句话生成 */}
        {!project &&
        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
            <div className="flex items-center mb-3">
              <Wand2Icon className="w-5 h-5 text-indigo-600 mr-2" />
              <h2 className="text-lg font-bold text-indigo-900">
                AI 一句话极速创建
              </h2>
            </div>
            <p className="text-sm text-indigo-700 mb-4">
              太繁琐？只需输入一句话描述您的软件，AI将自动为您补全所有专业字段。
            </p>
            <div className="flex gap-3">
              <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleAiFill();
                }
              }}
              placeholder="例如：开发一个基于Vue和Spring Boot的医院挂号小程序，包含用户注册、医生排班、在线支付模块..."
              className="flex-1 px-4 py-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white" />
            
              <button
              type="button"
              onClick={handleAiFill}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors shadow-sm flex items-center whitespace-nowrap">
              
                {isAiLoading ?
              <>
                    <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />{' '}
                    解析中...
                  </> :

              <>
                    <Wand2Icon className="w-5 h-5 mr-2" /> 智能填充
                  </>
              }
              </button>
            </div>
          </div>
        }

        {/* 基本信息 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
            基本信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                软件名称 <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="例如：智能医疗影像辅助诊断系统" />
              
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                版本号 <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                name="version"
                value={formData.version}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="例如：V1.0" />
              
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                开发完成日期
              </label>
              <input
                type="date"
                name="completionDate"
                value={formData.completionDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
              
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                软件类型
              </label>
              <CustomSelect
                value={formData.softwareType}
                onChange={(value) => handleSelectChange('softwareType', value)}
                options={softwareTypeOptions} />
              
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                所属行业
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="例如：医疗健康、金融科技、电子商务" />
              
            </div>
          </div>
        </div>

        {/* 技术信息 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
            技术信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                开发语言
              </label>
              <input
                type="text"
                name="devLanguage"
                value={formData.devLanguage}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="例如：Java, Python, Vue.js" />
              
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                技术架构
              </label>
              <input
                type="text"
                name="techArchitecture"
                value={formData.techArchitecture}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="例如：B/S架构, 微服务" />
              
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                运行环境
              </label>
              <input
                type="text"
                name="runEnvironment"
                value={formData.runEnvironment}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="例如：Linux CentOS 7, MySQL 8.0, Nginx" />
              
            </div>
          </div>
        </div>

        {/* 功能描述 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
            功能描述
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                软件主要功能概述 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                name="mainFunctions"
                value={formData.mainFunctions}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                placeholder="请简要描述软件的核心业务价值和主要功能点...">
              </textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                功能模块拆解
              </label>
              <p className="text-xs text-slate-500 mb-3">
                添加软件包含的具体功能模块，AI将根据这些模块生成详细说明。
              </p>

              <div className="flex mb-4">
                <input
                  type="text"
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addModule())
                  }
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="输入模块名称，如：用户管理、数据分析" />
                
                <button
                  type="button"
                  onClick={addModule}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-r-lg border-y border-r border-slate-300 font-medium transition-colors flex items-center">
                  
                  <PlusIcon className="w-4 h-4 mr-1" /> 添加
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.modules.map((mod, index) =>
                <div
                  key={index}
                  className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center border border-indigo-100">
                  
                    {mod}
                    <button
                    type="button"
                    onClick={() => removeModule(index)}
                    className="ml-2 text-indigo-400 hover:text-indigo-600 focus:outline-none">
                    
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {formData.modules.length === 0 &&
                <span className="text-sm text-slate-400 italic">
                    暂无模块，请添加
                  </span>
                }
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors mr-4">
            
            取消
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center">
            
            <SaveIcon className="w-4 h-4 mr-2" />
            保存项目
          </button>
        </div>
      </form>
    </motion.div>);

}