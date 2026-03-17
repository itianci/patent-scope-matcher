import React from 'react';
import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  Wand2Icon,
  Edit3Icon,
  DownloadIcon,
  SettingsIcon,
  HelpCircleIcon } from
'lucide-react';
import { AppView } from '../types';
interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}
export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItems = [
  {
    id: AppView.DASHBOARD,
    label: '工作台',
    icon: LayoutDashboardIcon
  },
  {
    id: AppView.PROJECT_LIST,
    label: '项目管理',
    icon: FolderKanbanIcon
  },
  {
    id: AppView.DOC_GENERATOR,
    label: '文档生成',
    icon: Wand2Icon
  },
  {
    id: AppView.DOC_EDITOR,
    label: '文档编辑',
    icon: Edit3Icon
  },
  {
    id: AppView.EXPORT,
    label: '导出中心',
    icon: DownloadIcon
  }];

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col text-slate-300 flex-shrink-0 transition-all duration-300">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
          <Wand2Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-wide">
          CanJobAI软著系统
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
          主菜单
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              
              <Icon
                className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-200' : 'text-slate-400 group-hover:text-slate-300'}`} />
              
              <span className="font-medium">{item.label}</span>
            </button>);

        })}
      </div>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <button
          onClick={() => onNavigate(AppView.SETTINGS)}
          className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${currentView === AppView.SETTINGS ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
          
          <SettingsIcon
            className={`w-5 h-5 mr-3 ${currentView === AppView.SETTINGS ? 'text-indigo-200' : 'text-slate-400'}`} />
          
          <span className="font-medium text-sm">系统设置</span>
        </button>
      </div>
    </div>);

}