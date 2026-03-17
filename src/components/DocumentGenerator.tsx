import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Wand2Icon,
  CheckCircleIcon,
  FileTextIcon,
  LayoutTemplateIcon,
  BookOpenIcon,
  AlignLeftIcon,
  CpuIcon,
  LayersIcon,
  CodeIcon,
  ArrowRightIcon,
  DownloadIcon,
  UploadIcon,
  EyeIcon,
  SquareIcon,
  Loader2Icon,
  XCircleIcon,
  RefreshCwIcon } from
'lucide-react';
import { AppView, Project, DocumentType, Document } from '../types';
import { AIService } from '../services/ai';
import { toast } from './Toast';
import JSZip from 'jszip';
function sanitizeHtml(html: string): string {
  let clean = html;
  // Remove markdown code block markers
  clean = clean.replace(/```html\s*/gi, '').replace(/```\s*$/gi, '');
  // Remove dangerous tags that could affect page layout
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<link[^>]*>/gi, '');
  clean = clean.replace(/<meta[^>]*>/gi, '');
  clean = clean.replace(/<\/?html[^>]*>/gi, '');
  clean = clean.replace(/<\/?head[^>]*>/gi, '');
  clean = clean.replace(/<\/?body[^>]*>/gi, '');
  clean = clean.replace(/<title[\s\S]*?<\/title>/gi, '');
  // Remove unclosed style/script tags (from streaming)
  clean = clean.replace(/<style[^>]*>[\s\S]*$/gi, '');
  clean = clean.replace(/<script[^>]*>[\s\S]*$/gi, '');
  return clean;
}
interface DocumentGeneratorProps {
  projects: Project[];
  documents: Document[];
  currentProjectId: string | null;
  onNavigate: (view: AppView, projectId?: string, documentId?: string) => void;
  onGenerateComplete: (
  projectId: string,
  docType: DocumentType,
  title: string)
  => void;
}
const DOC_TYPES = [
{
  id: DocumentType.FUNCTION_SPEC,
  title: '软件功能说明书',
  desc: '详细描述软件各项功能、业务流程及界面交互',
  icon: LayoutTemplateIcon,
  pages: '15-30页'
},
{
  id: DocumentType.DESIGN_SPEC,
  title: '软件设计说明书',
  desc: '包含系统架构、数据库设计、接口设计等技术细节',
  icon: CpuIcon,
  pages: '20-40页'
},
{
  id: DocumentType.USER_MANUAL,
  title: '用户操作手册',
  desc: '面向最终用户的系统安装、配置及使用指南',
  icon: BookOpenIcon,
  pages: '10-20页'
},
{
  id: DocumentType.SOFTWARE_BRIEF,
  title: '软件简介',
  desc: '300字左右的软件概述，用于软著申请表填报',
  icon: AlignLeftIcon,
  pages: '1页'
},
{
  id: DocumentType.TECH_DESCRIPTION,
  title: '技术实现说明',
  desc: '突出软件的技术创新点、核心算法及架构优势',
  icon: LayersIcon,
  pages: '3-5页'
},
{
  id: DocumentType.MODULE_DESCRIPTION,
  title: '软件模块说明',
  desc: '按功能模块拆解的详细说明文档',
  icon: FileTextIcon,
  pages: '10-15页'
},
{
  id: DocumentType.SOURCE_CODE,
  title: '源代码说明',
  desc: '提取代码结构，生成符合软著要求的前后30页代码',
  icon: CodeIcon,
  pages: '60页'
}];

export function DocumentGenerator({
  projects,
  documents,
  currentProjectId,
  onNavigate,
  onGenerateComplete
}: DocumentGeneratorProps) {
  const [step, setStep] = useState(1);
  const [selectedProject, setSelectedProject] = useState<string>(
    currentProjectId || ''
  );
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentGeneratingDoc, setCurrentGeneratingDoc] = useState('');
  const [streamedContent, setStreamedContent] = useState('');
  const [completedDocs, setCompletedDocs] = useState<DocumentType[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<DocumentType[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<
    Partial<Record<DocumentType, string>>>(
    {});
  const [failedDocs, setFailedDocs] = useState<DocumentType[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };
  const toggleDoc = (id: DocumentType) => {
    setSelectedDocs((prev) =>
    prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };
  const handleFileUpload = (
  e: React.ChangeEvent<HTMLInputElement>,
  docType: DocumentType) =>
  {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const processContent = (rawContent: string) => {
      let htmlContent = '';
      if (fileName.endsWith('.html') || fileName.endsWith('.doc')) {
        // Extract body content from HTML/Word-HTML files
        const bodyMatch = rawContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          htmlContent = bodyMatch[1];
        } else {
          // If no body tag, use the content as-is but strip dangerous tags
          htmlContent = rawContent.
          replace(/<html[\s\S]*?>/gi, '').
          replace(/<\/html>/gi, '').
          replace(/<head[\s\S]*?<\/head>/gi, '').
          replace(/<style[\s\S]*?<\/style>/gi, '').
          replace(/<script[\s\S]*?<\/script>/gi, '').
          replace(/<meta[^>]*>/gi, '').
          replace(/<link[^>]*>/gi, '');
        }
      } else if (fileName.endsWith('.md')) {
        // Basic markdown to HTML
        htmlContent = rawContent.
        replace(/^### (.*$)/gim, '<h3>$1</h3>').
        replace(/^## (.*$)/gim, '<h2>$1</h2>').
        replace(/^# (.*$)/gim, '<h1>$1</h1>').
        replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').
        replace(/\*(.*?)\*/g, '<em>$1</em>').
        replace(/^- (.*$)/gim, '<li>$1</li>').
        replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>').
        replace(/\n\n/g, '</p><p>').
        replace(/^(?!<[hulo])/gm, '<p>').
        replace(/(?<![>])$/gm, '</p>');
      } else {
        // Plain text (.txt, .pdf fallback, .docx fallback)
        htmlContent = rawContent.
        split('\n').
        filter((line) => line.trim()).
        map((line) => `<p>${line}</p>`).
        join('');
      }
      setUploadedDocs((prev) => ({
        ...prev,
        [docType]: htmlContent
      }));
      if (!selectedDocs.includes(docType)) {
        setSelectedDocs((prev) => [...prev, docType]);
      }
    };
    if (fileName.endsWith('.docx')) {
      // .docx files: unzip and parse word/document.xml
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const zip = await JSZip.loadAsync(arrayBuffer);
          const docXml = zip.file('word/document.xml');
          if (!docXml) {
            toast.error('Word文档解析失败', '无法找到文档内容，文件可能已损坏');
            return;
          }
          const xmlText = await docXml.async('string');
          // Parse XML to extract text content with basic formatting
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
          const ns =
          'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
          const paragraphs = xmlDoc.getElementsByTagNameNS(ns, 'p');
          let htmlContent = '';
          for (let i = 0; i < paragraphs.length; i++) {
            const para = paragraphs[i];
            // Check for heading style
            const pStyle = para.getElementsByTagNameNS(ns, 'pStyle')[0];
            const styleVal = pStyle?.getAttribute('w:val') || '';
            const runs = para.getElementsByTagNameNS(ns, 'r');
            let paraText = '';
            for (let j = 0; j < runs.length; j++) {
              const textNodes = runs[j].getElementsByTagNameNS(ns, 't');
              const bold = runs[j].getElementsByTagNameNS(ns, 'b').length > 0;
              for (let k = 0; k < textNodes.length; k++) {
                const t = textNodes[k].textContent || '';
                paraText += bold ? `<strong>${t}</strong>` : t;
              }
            }
            if (!paraText.trim()) continue;
            if (/Heading1|1/.test(styleVal)) {
              htmlContent += `<h1>${paraText}</h1>`;
            } else if (/Heading2|2/.test(styleVal)) {
              htmlContent += `<h2>${paraText}</h2>`;
            } else if (/Heading3|3/.test(styleVal)) {
              htmlContent += `<h3>${paraText}</h3>`;
            } else {
              htmlContent += `<p>${paraText}</p>`;
            }
          }
          if (htmlContent) {
            processContent(htmlContent);
            toast.success('文档导入成功', `已成功导入 ${file.name}`);
          } else {
            toast.warning('文档内容为空', '该Word文档似乎没有可提取的文本内容');
          }
        } catch (err) {
          console.error('DOCX parse error:', err);
          toast.error(
            'Word文档解析失败',
            '请确认文件未损坏，或尝试另存为纯文本格式后重新导入'
          );
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.doc')) {
      // .doc files: try reading as text (some are HTML-based)
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (
        content && (
        content.includes('<html') ||
        content.includes('<body') ||
        content.includes('<p')))
        {
          processContent(content);
          toast.success('文档导入成功', `已成功导入 ${file.name}`);
        } else {
          toast.warning(
            '旧版Word格式',
            '该.doc文件为旧版二进制格式，建议用Word打开后另存为.docx格式再导入'
          );
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.pdf')) {
      // PDF files: try extracting text
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content && content.length > 0) {
          const textParts: string[] = [];
          const matches = content.match(/\(([^)]+)\)/g);
          if (matches && matches.length > 5) {
            matches.forEach((m) => {
              const text = m.slice(1, -1).trim();
              if (text.length > 1 && !/^[\\\/\d.]+$/.test(text)) {
                textParts.push(text);
              }
            });
          }
          if (textParts.length > 0) {
            processContent(textParts.join('\n'));
            toast.success('PDF导入成功', `已从 ${file.name} 中提取文本内容`);
          } else {
            toast.warning(
              'PDF解析受限',
              '该PDF文件无法直接提取文本，建议先转换为Word或纯文本格式后再导入'
            );
          }
        }
      };
      reader.readAsText(file);
    } else {
      // .txt, .md, .html
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          processContent(content);
          toast.success('文档导入成功', `已成功导入 ${file.name}`);
        }
      };
      reader.readAsText(file);
    }
  };
  const handleStartGeneration = async () => {
    if (!selectedProject || selectedDocs.length === 0) return;
    const proj = projects.find((p) => p.id === selectedProject);
    if (!proj) return;
    setIsGenerating(true);
    setProgress(0);
    setCompletedDocs([]);
    setFailedDocs([]);
    setStreamedContent('');
    const totalDocs = selectedDocs.length;
    let completed = 0;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      for (const docType of selectedDocs) {
        if (controller.signal.aborted) break;
        const docInfo = DOC_TYPES.find((d) => d.id === docType);
        if (docInfo) {
          setCurrentGeneratingDoc(docInfo.title);
          setStreamedContent('');
          try {
            let content = '';
            const baseContent = uploadedDocs[docType] || undefined;
            content = await AIService.generateDocument(
              proj,
              docType,
              (text) => {
                setStreamedContent(sanitizeHtml(text));
              },
              baseContent,
              controller.signal
            );
            if (controller.signal.aborted) {
              // If stopped mid-document, still save what we have if content exists
              if (content) {
                setCompletedDocs((prev) => [...prev, docType]);
                onGenerateComplete(
                  selectedProject,
                  docType,
                  `${proj.name}-${docInfo.title}`
                );
                const event = new CustomEvent('documentGenerated', {
                  detail: {
                    projectId: selectedProject,
                    type: docType,
                    title: `${proj.name}-${docInfo.title}`,
                    content
                  }
                });
                window.dispatchEvent(event);
              }
              break;
            }
            setCompletedDocs((prev) => [...prev, docType]);
            onGenerateComplete(
              selectedProject,
              docType,
              `${proj.name}-${docInfo.title}`
            );
            const event = new CustomEvent('documentGenerated', {
              detail: {
                projectId: selectedProject,
                type: docType,
                title: `${proj.name}-${docInfo.title}`,
                content
              }
            });
            window.dispatchEvent(event);
          } catch (error) {
            if (controller.signal.aborted) break;
            console.error(`Failed to generate ${docInfo.title}:`, error);
            setFailedDocs((prev) => [...prev, docType]);
            toast.error(`${docInfo.title} 生成失败`, '请稍后重试');
          }
        }
        completed++;
        setProgress(Math.round(completed / totalDocs * 100));
      }
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
      setGeneratedDocs(selectedDocs);
      setStep(3);
      if (controller.signal.aborted) {
        toast.warning('已停止生成', `已完成 ${completedDocs.length} 份文档`);
      } else if (failedDocs.length === 0) {
        toast.success('全部生成完成', `成功生成 ${totalDocs} 份文档`);
      }
    }
  };
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Wand2Icon className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          AI 智能文档生成
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          基于大语言模型，自动解析您的软件项目信息，一键生成符合版权局规范的全套软著申请材料。
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center mb-12">
        <div className="flex items-center space-x-4">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            
            1
          </div>
          <span
            className={`font-medium ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
            
            选择项目
          </span>
          <div
            className={`w-12 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}>
          </div>

          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            
            2
          </div>
          <span
            className={`font-medium ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
            
            选择文档类型
          </span>
          <div
            className={`w-12 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}>
          </div>

          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            
            3
          </div>
          <span
            className={`font-medium ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
            
            生成与导出
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[400px]">
        {step === 1 &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          className="max-w-2xl mx-auto">
          
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
              请选择要生成文档的项目
            </h2>
            <div className="space-y-3">
              {projects.map((project) =>
            <div
              key={project.id}
              onClick={() => setSelectedProject(project.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedProject === project.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
              
                  <div>
                    <h3 className="font-bold text-slate-900">{project.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {project.softwareType} · {project.modules.length} 个模块
                    </p>
                  </div>
                  {selectedProject === project.id &&
              <CheckCircleIcon className="w-6 h-6 text-indigo-600" />
              }
                </div>
            )}
              {projects.length === 0 &&
            <div className="text-center py-8">
                  <p className="text-slate-500 mb-4">暂无项目，请先创建项目</p>
                  <button
                onClick={() => onNavigate(AppView.PROJECT_FORM)}
                className="text-indigo-600 font-medium hover:underline">
                
                    去创建项目
                  </button>
                </div>
            }
            </div>
            <div className="mt-8 flex justify-end">
              <button
              disabled={!selectedProject}
              onClick={() => setStep(2)}
              className="bg-indigo-600 disabled:bg-slate-300 text-white px-8 py-3 rounded-xl font-medium flex items-center transition-colors">
              
                下一步 <ArrowRightIcon className="w-5 h-5 ml-2" />
              </button>
            </div>
          </motion.div>
        }

        {step === 2 && !isGenerating &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}>
          
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                选择需要生成的文档
              </h2>
              <button
              onClick={() => setSelectedDocs(DOC_TYPES.map((d) => d.id))}
              className="text-sm text-indigo-600 font-medium hover:underline">
              
                全选
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {DOC_TYPES.map((doc) => {
              const Icon = doc.icon;
              const isSelected = selectedDocs.includes(doc.id);
              const isUploaded = !!uploadedDocs[doc.id];
              // Check if this doc type already has a generated document for the selected project
              const existingDoc = documents.
              filter(
                (d) => d.projectId === selectedProject && d.type === doc.id
              ).
              sort(
                (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
              )[0];
              const isGenerated = !!existingDoc;
              return (
                <div
                  key={doc.id}
                  className={`p-5 rounded-xl border-2 transition-all relative overflow-hidden ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : isGenerated ? 'border-slate-200 bg-white' : 'border-slate-200 hover:border-indigo-300'}`}>
                  
                    {isSelected &&
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white px-2 py-1 rounded-bl-xl shadow-sm z-10 flex items-center">
                        <CheckCircleIcon className="w-3.5 h-3.5 mr-1" />
                        <span className="text-[10px] font-bold">已选</span>
                      </div>
                  }
                    {!isSelected && isGenerated &&
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white px-2 py-1 rounded-bl-xl shadow-sm z-10 flex items-center">
                        <CheckCircleIcon className="w-3.5 h-3.5 mr-1" />
                        <span className="text-[10px] font-bold">已生成</span>
                      </div>
                  }
                    <div
                    className="cursor-pointer"
                    onClick={() => toggleDoc(doc.id)}>
                    
                      <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${isSelected ? 'bg-indigo-100 text-indigo-600' : isGenerated ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2 h-8">
                        {doc.desc}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded inline-block border border-slate-100">
                          预计 {doc.pages}
                        </div>
                        {isUploaded &&
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                            已上传
                          </span>
                      }
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-center">
                      {isGenerated ?
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(
                          AppView.DOC_EDITOR,
                          selectedProject,
                          existingDoc.id
                        );
                      }}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center">
                      
                          <EyeIcon className="w-3.5 h-3.5 mr-1" />
                          预览文档
                        </button> :

                    <div />
                    }
                      <label className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center">
                        <UploadIcon className="w-3.5 h-3.5 mr-1" />
                        {isUploaded ? '重新上传' : '导入已有文档'}
                        <input
                        type="file"
                        accept=".txt,.md,.html,.doc,.docx,.pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, doc.id)} />
                      
                      </label>
                    </div>
                  </div>);

            })}
            </div>
            <div className="flex justify-between">
              <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
              
                上一步
              </button>
              <button
              disabled={selectedDocs.length === 0}
              onClick={handleStartGeneration}
              className="bg-indigo-600 disabled:bg-slate-300 text-white px-8 py-3 rounded-xl font-medium flex items-center transition-colors shadow-md shadow-indigo-600/20">
              
                <Wand2Icon className="w-5 h-5 mr-2" /> 开始智能生成
              </button>
            </div>
          </motion.div>
        }

        {isGenerating &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          className="flex flex-col items-center justify-center py-20">
          
            <div className="relative w-24 h-24 mb-8">
              <svg
              className="animate-spin w-full h-full text-indigo-200"
              viewBox="0 0 24 24">
              
                <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none">
              </circle>
                <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
              </svg>
              <Wand2Icon className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              AI 正在奋笔疾书...
            </h2>
            <p className="text-slate-500 mb-6">
              正在生成：{currentGeneratingDoc}（{completedDocs.length}/
              {selectedDocs.length}）
            </p>

            {/* Per-doc checklist */}
            <div className="w-full max-w-md mb-6 space-y-2">
              {selectedDocs.map((docType) => {
              const docInfo = DOC_TYPES.find((d) => d.id === docType);
              const isDone = completedDocs.includes(docType);
              const isFailed = failedDocs.includes(docType);
              const isCurrent =
              currentGeneratingDoc === docInfo?.title &&
              !isDone &&
              !isFailed;
              return (
                <div
                  key={docType}
                  className={`flex items-center px-4 py-2.5 rounded-lg text-sm transition-all ${isDone ? 'bg-emerald-50 border border-emerald-200' : isFailed ? 'bg-red-50 border border-red-200' : isCurrent ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 border border-slate-100'}`}>
                  
                    {isDone ?
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" /> :
                  isFailed ?
                  <XCircleIcon className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" /> :
                  isCurrent ?
                  <Wand2Icon className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0 animate-pulse" /> :

                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 mr-3 flex-shrink-0" />
                  }
                    <span
                    className={`font-medium ${isDone ? 'text-emerald-700' : isFailed ? 'text-red-700' : isCurrent ? 'text-indigo-700' : 'text-slate-400'}`}>
                    
                      {docInfo?.title}
                    </span>
                    {isDone &&
                  <span className="ml-auto text-xs text-emerald-500 font-medium">
                        已完成
                      </span>
                  }
                    {isFailed &&
                  <span className="ml-auto text-xs text-red-500 font-medium">
                        生成失败
                      </span>
                  }
                    {isCurrent &&
                  <span className="ml-auto text-xs text-indigo-500 font-medium">
                        生成中...
                      </span>
                  }
                  </div>);

            })}
            </div>

            <div className="w-full max-w-md bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
              <motion.div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`
              }} />
            
            </div>

            <button
            onClick={stopGeneration}
            className="mb-6 flex items-center px-6 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors shadow-sm">
            
              <SquareIcon className="w-3.5 h-3.5 mr-2 fill-current" />
              停止生成
            </button>

            {streamedContent &&
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-left overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse"></div>
                <div className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wider">
                  实时生成预览
                </div>
                <div
              className="prose prose-sm prose-indigo max-w-none max-h-[300px] overflow-y-auto custom-scrollbar opacity-70"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(streamedContent)
              }} />
            
              </div>
          }
          </motion.div>
        }

        {step === 3 && !isGenerating &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          className="text-center py-8">
          
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              文档生成完成！
            </h2>
            <p className="text-slate-500 mb-8">
              成功为您生成了 {generatedDocs.length} 份软著申请材料
            </p>

            <div className="max-w-2xl mx-auto bg-slate-50 rounded-xl border border-slate-200 p-6 mb-8 text-left">
              <h3 className="font-bold text-slate-900 mb-4">已生成文档：</h3>
              <div className="space-y-3">
                {generatedDocs.map((docId, index) => {
                const docInfo = DOC_TYPES.find((d) => d.id === docId);
                // Find the actual document ID from the documents array
                const doc = documents.find(
                  (d) => d.projectId === selectedProject && d.type === docId
                );
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    
                      <div className="flex items-center">
                        <FileTextIcon className="w-5 h-5 text-indigo-500 mr-3" />
                        <span className="font-medium text-slate-700">
                          {docInfo?.title}
                        </span>
                      </div>
                      <button
                      onClick={() =>
                      onNavigate(
                        AppView.DOC_EDITOR,
                        selectedProject,
                        doc?.id
                      )
                      }
                      className="text-sm text-indigo-600 hover:underline font-medium">
                      
                        在线编辑
                      </button>
                    </div>);

              })}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
              onClick={() => onNavigate(AppView.DASHBOARD)}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
              
                返回工作台
              </button>
              <button
              onClick={() => onNavigate(AppView.EXPORT)}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium flex items-center transition-colors shadow-md hover:bg-indigo-700">
              
                <DownloadIcon className="w-5 h-5 mr-2" /> 前往导出中心
              </button>
            </div>
          </motion.div>
        }
      </div>
    </div>);

}