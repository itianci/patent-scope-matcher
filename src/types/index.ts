export enum AppView {
  DASHBOARD = 'DASHBOARD',
  PROJECT_LIST = 'PROJECT_LIST',
  PROJECT_FORM = 'PROJECT_FORM',
  DOC_GENERATOR = 'DOC_GENERATOR',
  DOC_EDITOR = 'DOC_EDITOR',
  EXPORT = 'EXPORT',
  SETTINGS = 'SETTINGS',
}

export enum DocumentType {
  FUNCTION_SPEC = 'FUNCTION_SPEC',
  DESIGN_SPEC = 'DESIGN_SPEC',
  USER_MANUAL = 'USER_MANUAL',
  SOFTWARE_BRIEF = 'SOFTWARE_BRIEF',
  TECH_DESCRIPTION = 'TECH_DESCRIPTION',
  MODULE_DESCRIPTION = 'MODULE_DESCRIPTION',
  SOURCE_CODE = 'SOURCE_CODE',
}

export interface Project {
  id: string;
  name: string;
  version: string;
  completionDate: string;
  softwareType: '系统软件' | '应用软件' | '平台软件';
  industry: string;
  mainFunctions: string;
  techArchitecture: string;
  devLanguage: string;
  runEnvironment: string;
  modules: string[];
  createdAt: string;
  status: '进行中' | '已完成' | '草稿';
}

export interface Document {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  content: string;
  status: '已生成' | '生成中' | '草稿';
  createdAt: string;
  updatedAt: string;
}