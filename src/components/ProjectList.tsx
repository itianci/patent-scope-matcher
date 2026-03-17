import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  SearchIcon,
  FolderKanbanIcon,
  Trash2Icon,
  Edit2Icon,
  Wand2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircle2Icon,
  CircleIcon,
  FileTextIcon } from
'lucide-react';
import { AppView, Project, Document, DocumentType } from '../types';
import { ConfirmModal } from './ConfirmModal';
interface ProjectListProps {
  projects: Project[];
  documents: Document[];
  onNavigate: (view: AppView, projectId?: string, documentId?: string) => void;
  onDelete: (id: string) => void;
}
const DOC_TYPES = [
{
  id: DocumentType.FUNCTION_SPEC,
  title: '软件功能说明书'
},
{
  id: DocumentType.DESIGN_SPEC,
  title: '软件设计说明书'
},
{
  id: DocumentType.USER_MANUAL,
  title: '用户操作手册'
},
{
  id: DocumentType.SOFTWARE_BRIEF,
  title: '软件简介'
},
{
  id: DocumentType.TECH_DESCRIPTION,
  title: '技术实现说明'
},
{
  id: DocumentType.MODULE_DESCRIPTION,
  title: '软件模块说明'
},
{
  id: DocumentType.SOURCE_CODE,
  title: '源代码说明'
}];

export function ProjectList({
  projects,
  documents,
  onNavigate,
  onDelete
}: ProjectListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<string[]>([]);
  const filteredProjects = projects.filter(
    (p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const toggleDocs = (projectId: string) => {
    setExpandedDocs((prev) =>
    prev.includes(projectId) ?
    prev.filter((id) => id !== projectId) :
    [...prev, projectId]
    );
  };
  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      onDelete(projectToDelete);
      setProjectToDelete(null);
    }
  };
  return (
    <motion.div
      className="p-8 max-w-7xl mx-auto h-full flex flex-col"
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}>
      
      <ConfirmModal
        isOpen={!!projectToDelete}
        title="删除项目"
        message="确定要删除此项目及其所有生成的文档吗？此操作无法恢复。"
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProjectToDelete(null)} />
      

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">项目管理</h1>
          <p className="text-slate-500">管理您的所有软件著作权申请项目</p>
        </div>
        <button
          onClick={() => onNavigate(AppView.PROJECT_FORM)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors shadow-sm shadow-indigo-600/20">
          
          <PlusIcon className="w-5 h-5 mr-2" />
          创建项目
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center">
        <SearchIcon className="w-5 h-5 text-slate-400 mr-3" />
        <input
          type="text"
          placeholder="搜索项目名称或行业..."
          className="flex-1 outline-none text-slate-700 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} />
        
      </div>

      {filteredProjects.length > 0 ?
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {filteredProjects.map((project) => {
          // Calculate document progress
          const projectDocs = documents.filter(
            (d) => d.projectId === project.id
          );
          const uniqueDocTypes = new Set(projectDocs.map((d) => d.type));
          const generatedCount = uniqueDocTypes.size;
          const totalCount = DOC_TYPES.length;
          const progressPercent = Math.round(
            generatedCount / totalCount * 100
          );
          const isExpanded = expandedDocs.includes(project.id);
          return (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-fit">
              
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                      <FolderKanbanIcon className="w-5 h-5" />
                    </div>
                    <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${project.status === '已完成' ? 'bg-emerald-100 text-emerald-700' : project.status === '进行中' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                    
                      {project.status}
                    </span>
                  </div>
                  <h3
                  className="text-lg font-bold text-slate-900 mb-1 line-clamp-1"
                  title={project.name}>
                  
                    {project.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {project.version} · {project.softwareType}
                  </p>

                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">开发完成:</span>
                      <span>{project.completionDate || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">功能模块:</span>
                      <span>{project.modules.length} 个</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">开发语言:</span>
                      <span
                      className="truncate max-w-[120px]"
                      title={project.devLanguage}>
                      
                        {project.devLanguage || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Document Progress Section */}
                  <div className="pt-4 border-t border-slate-100">
                    <div
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => toggleDocs(project.id)}>
                    
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">
                            文档生成进度
                          </span>
                          <span
                          className={`${generatedCount === totalCount ? 'text-emerald-600' : 'text-indigo-600'} font-bold`}>
                          
                            {generatedCount}/{totalCount}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${generatedCount === totalCount ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{
                            width: `${progressPercent}%`
                          }} />
                        
                        </div>
                      </div>
                      <div className="ml-3 p-1 text-slate-400 group-hover:text-slate-600 transition-colors">
                        {isExpanded ?
                      <ChevronUpIcon className="w-4 h-4" /> :

                      <ChevronDownIcon className="w-4 h-4" />
                      }
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded &&
                    <motion.div
                      initial={{
                        height: 0,
                        opacity: 0
                      }}
                      animate={{
                        height: 'auto',
                        opacity: 1
                      }}
                      exit={{
                        height: 0,
                        opacity: 0
                      }}
                      transition={{
                        duration: 0.2
                      }}
                      className="overflow-hidden">
                      
                          <div className="pt-3 space-y-1.5">
                            {DOC_TYPES.map((docType) => {
                          const isGenerated = uniqueDocTypes.has(docType.id);
                          // Get the latest document of this type
                          const doc = projectDocs.
                          filter((d) => d.type === docType.id).
                          sort(
                            (a, b) =>
                            new Date(b.updatedAt).getTime() -
                            new Date(a.updatedAt).getTime()
                          )[0];
                          return (
                            <div
                              key={docType.id}
                              className="flex items-center justify-between text-xs py-1">
                              
                                  <div className="flex items-center">
                                    {isGenerated ?
                                <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-500 mr-2 flex-shrink-0" /> :

                                <CircleIcon className="w-3.5 h-3.5 text-slate-300 mr-2 flex-shrink-0" />
                                }
                                    <span
                                  className={
                                  isGenerated ?
                                  'text-slate-700' :
                                  'text-slate-400'
                                  }>
                                  
                                      {docType.title}
                                    </span>
                                  </div>
                                  {isGenerated && doc &&
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigate(
                                    AppView.DOC_EDITOR,
                                    project.id,
                                    doc.id
                                  );
                                }}
                                className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center">
                                
                                      <FileTextIcon className="w-3 h-3 mr-1" />
                                      预览
                                    </button>
                              }
                                </div>);

                        })}
                          </div>
                        </motion.div>
                    }
                    </AnimatePresence>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 flex justify-between items-center mt-auto rounded-b-xl">
                  <button
                  onClick={() =>
                  onNavigate(AppView.DOC_GENERATOR, project.id)
                  }
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                  
                    <Wand2Icon className="w-4 h-4 mr-1.5" /> 生成文档
                  </button>
                  <div className="flex space-x-2">
                    <button
                    onClick={() =>
                    onNavigate(AppView.PROJECT_FORM, project.id)
                    }
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="编辑">
                    
                      <Edit2Icon className="w-4 h-4" />
                    </button>
                    <button
                    onClick={() => setProjectToDelete(project.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="删除">
                    
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>);

        })}
        </div> :

      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-xl border border-slate-200 border-dashed">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <FolderKanbanIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">暂无项目</h3>
          <p className="text-slate-500 max-w-sm mb-6">
            您还没有创建任何软件项目，或者没有匹配搜索条件的项目。
          </p>
          <button
          onClick={() => onNavigate(AppView.PROJECT_FORM)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
          
            立即创建项目
          </button>
        </div>
      }
    </motion.div>);

}