import React, { Children } from 'react';
import { motion } from 'framer-motion';
import {
  FolderKanbanIcon,
  FileTextIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  Wand2Icon,
  DownloadIcon,
  ChevronRightIcon,
  Edit3Icon } from
'lucide-react';
import { AppView, Project, Document } from '../types';
interface DashboardProps {
  projects: Project[];
  documents: Document[];
  onNavigate: (view: AppView, projectId?: string, documentId?: string) => void;
}
export function Dashboard({ projects, documents, onNavigate }: DashboardProps) {
  const stats = [
  {
    label: '项目总数',
    value: projects.length,
    icon: FolderKanbanIcon,
    color: 'text-blue-600',
    bg: 'bg-blue-100'
  },
  {
    label: '文档总数',
    value: documents.length,
    icon: FileTextIcon,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100'
  },
  {
    label: '本月生成',
    value: documents.filter((d) => {
      if (d.status !== '已生成') return false;
      const docDate = new Date(d.createdAt);
      const now = new Date();
      return (
        docDate.getMonth() === now.getMonth() &&
        docDate.getFullYear() === now.getFullYear());

    }).length,
    icon: CheckCircleIcon,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100'
  },
  {
    label: '待完善',
    value: projects.filter((p) => p.status === '草稿').length,
    icon: ClockIcon,
    color: 'text-amber-600',
    bg: 'bg-amber-100'
  }];

  const containerVariants = {
    hidden: {
      opacity: 0
    },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  };
  return (
    <motion.div
      className="p-8 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="show">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          欢迎回来，开发者 👋
        </h1>
        <p className="text-slate-500">
          这里是您的AI软著文档生成工作台，今天想处理哪个项目？
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex items-center">
              
              <div
                className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center mr-4`}>
                
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </h3>
              </div>
            </motion.div>);

        })}
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-bold text-slate-900 mb-4">快捷操作</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <motion.button
          variants={itemVariants}
          onClick={() => onNavigate(AppView.PROJECT_FORM)}
          className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all rounded-xl p-6 text-left group">
          
          <div className="w-10 h-10 bg-slate-100 group-hover:bg-indigo-50 rounded-lg flex items-center justify-center mb-4 transition-colors">
            <PlusIcon className="w-5 h-5 text-slate-600 group-hover:text-indigo-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
            创建新项目
          </h3>
          <p className="text-sm text-slate-500">
            录入软件基本信息，开启软著申请
          </p>
        </motion.button>

        <motion.button
          variants={itemVariants}
          onClick={() => onNavigate(AppView.DOC_GENERATOR)}
          className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all rounded-xl p-6 text-left group">
          
          <div className="w-10 h-10 bg-slate-100 group-hover:bg-indigo-50 rounded-lg flex items-center justify-center mb-4 transition-colors">
            <Wand2Icon className="w-5 h-5 text-slate-600 group-hover:text-indigo-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
            生成文档
          </h3>
          <p className="text-sm text-slate-500">
            一键生成说明书、手册等全套材料
          </p>
        </motion.button>

        <motion.button
          variants={itemVariants}
          onClick={() => onNavigate(AppView.EXPORT)}
          className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all rounded-xl p-6 text-left group">
          
          <div className="w-10 h-10 bg-slate-100 group-hover:bg-indigo-50 rounded-lg flex items-center justify-center mb-4 transition-colors">
            <DownloadIcon className="w-5 h-5 text-slate-600 group-hover:text-indigo-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
            导出文档
          </h3>
          <p className="text-sm text-slate-500">打包下载Word/PDF格式申报材料</p>
        </motion.button>
      </div>

      {/* Recent Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">最近项目</h3>
            <button
              onClick={() => onNavigate(AppView.PROJECT_LIST)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
              
              查看全部 <ChevronRightIcon className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {projects.slice(0, 4).map((project) =>
            <div
              key={project.id}
              className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
              onClick={() => onNavigate(AppView.PROJECT_FORM, project.id)}>
              
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">
                    {project.name}{' '}
                    <span className="text-xs text-slate-500 ml-2">
                      {project.version}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    {project.softwareType} · {project.modules.length} 个模块
                  </p>
                </div>
                <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${project.status === '已完成' ? 'bg-emerald-100 text-emerald-700' : project.status === '进行中' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                
                  {project.status}
                </span>
              </div>
            )}
            {projects.length === 0 &&
            <div className="p-8 text-center text-slate-500 text-sm">
                暂无项目，请先创建
              </div>
            }
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">最新文档</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {documents.slice(0, 4).map((doc) =>
            <div
              key={doc.id}
              className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
              onClick={() =>
              onNavigate(AppView.DOC_EDITOR, doc.projectId, doc.id)
              }>
              
                <div className="flex items-center">
                  <FileTextIcon className="w-8 h-8 text-indigo-400 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1 truncate max-w-[250px]">
                      {doc.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      更新于 {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-indigo-600 transition-colors p-2">
                  <Edit3Icon className="w-4 h-4" />
                </button>
              </div>
            )}
            {documents.length === 0 &&
            <div className="p-8 text-center text-slate-500 text-sm">
                暂无文档，请前往生成
              </div>
            }
          </div>
        </motion.div>
      </div>
    </motion.div>);

}