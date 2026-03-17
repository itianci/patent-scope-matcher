import React, { useCallback, useState } from 'react';
import { useAppState } from './hooks/useAppState';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { ProjectForm } from './components/ProjectForm';
import { DocumentGenerator } from './components/DocumentGenerator';
import { DocumentEditor } from './components/DocumentEditor';
import { ExportPanel } from './components/ExportPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { LoginPage } from './components/LoginPage';
import { Toaster } from './components/Toast';
import { AppView } from './types';
import { UserIcon, LogOutIcon } from 'lucide-react';
function isAuthenticated(): boolean {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    const parsed = JSON.parse(token);
    return !!parsed?.user;
  } catch {
    return false;
  }
}
export function App() {
  const [authed, setAuthed] = useState(isAuthenticated);
  const handleLogin = useCallback(() => {
    setAuthed(true);
  }, []);
  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setAuthed(false);
  }, []);
  if (!authed) {
    return (
      <>
        <Toaster />
        <LoginPage onLogin={handleLogin} />
      </>);

  }
  return <AuthedApp onLogout={handleLogout} />;
}
function AuthedApp({ onLogout }: {onLogout: () => void;}) {
  const {
    isLoading,
    currentView,
    projects,
    documents,
    currentProject,
    currentDocument,
    navigate,
    addProject,
    updateProject,
    deleteProject,
    addDocument,
    updateDocument
  } = useAppState();
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>);

  }
  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return (
          <Dashboard
            projects={projects}
            documents={documents}
            onNavigate={navigate} />);


      case AppView.PROJECT_LIST:
        return (
          <ProjectList
            projects={projects}
            documents={documents}
            onNavigate={navigate}
            onDelete={deleteProject} />);


      case AppView.PROJECT_FORM:
        return (
          <ProjectForm
            project={currentProject}
            onSave={(data) => {
              if (currentProject) {
                updateProject(currentProject.id, data);
              } else {
                addProject(data);
              }
              navigate(AppView.PROJECT_LIST);
            }}
            onCancel={() => navigate(AppView.PROJECT_LIST)} />);


      case AppView.DOC_GENERATOR:
        return (
          <DocumentGenerator
            projects={projects}
            documents={documents}
            currentProjectId={currentProject?.id || null}
            onNavigate={navigate}
            onGenerateComplete={(projectId, type, title) => {
              const listener = (e: any) => {
                if (
                e.detail.projectId === projectId &&
                e.detail.type === type &&
                e.detail.title === title)
                {
                  addDocument({
                    projectId,
                    type,
                    title,
                    content: e.detail.content,
                    status: '已生成'
                  });
                  window.removeEventListener('documentGenerated', listener);
                }
              };
              window.addEventListener('documentGenerated', listener);
            }} />);


      case AppView.DOC_EDITOR:
        return (
          <DocumentEditor
            document={currentDocument}
            projects={projects}
            documents={documents}
            onSave={updateDocument}
            onNavigate={navigate} />);


      case AppView.EXPORT:
        return <ExportPanel projects={projects} documents={documents} />;
      case AppView.SETTINGS:
        return <SettingsPanel />;
      default:
        return (
          <Dashboard
            projects={projects}
            documents={documents}
            onNavigate={navigate} />);


    }
  };
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      <Toaster />
      <Sidebar currentView={currentView} onNavigate={navigate} />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-10 shadow-sm">
          <div className="text-sm font-medium text-slate-500">
            {currentView === AppView.DASHBOARD && '工作台 / 概览'}
            {currentView === AppView.PROJECT_LIST && '项目管理 / 所有项目'}
            {currentView === AppView.PROJECT_FORM &&
            `项目管理 / ${currentProject ? '编辑项目' : '创建项目'}`}
            {currentView === AppView.DOC_GENERATOR && '文档生成 / 智能向导'}
            {currentView === AppView.DOC_EDITOR && '文档编辑 / 富文本编辑器'}
            {currentView === AppView.EXPORT && '导出中心 / 打包下载'}
            {currentView === AppView.SETTINGS && '系统设置 / AI 服务配置'}
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 p-1.5 rounded-lg">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                <UserIcon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-700 hidden md:block">
                admin
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="退出登录">
              
              <LogOutIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative">
          {renderContent()}
        </main>
      </div>
    </div>);

}