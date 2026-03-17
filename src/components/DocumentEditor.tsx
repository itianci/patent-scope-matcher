import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  createElement } from
'react';
import {
  SaveIcon,
  BoldIcon,
  ItalicIcon,
  Heading1Icon,
  Heading2Icon,
  ListIcon,
  ImageIcon,
  Wand2Icon,
  Loader2Icon,
  CheckIcon,
  ArrowLeftIcon,
  UndoIcon,
  RedoIcon,
  StrikethroughIcon,
  LinkIcon,
  QuoteIcon,
  MinusIcon,
  ListOrderedIcon,
  SendIcon,
  SparklesIcon,
  FileTextIcon,
  SquareIcon } from
'lucide-react';
import { Document, Project, AppView, DocumentType } from '../types';
import { AIService } from '../services/ai';
import { toast } from './Toast';
import { InputModal } from './InputModal';
import {
  FolderOpenIcon,
  ChevronRightIcon,
  ClockIcon,
  SearchIcon } from
'lucide-react';
import { motion } from 'framer-motion';
import mermaid from 'mermaid';
// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'system-ui, -apple-system, sans-serif'
});
let mermaidIdCounter = 0;
async function renderMermaidToSvg(code: string): Promise<string> {
  try {
    const id = `mermaid-${Date.now()}-${mermaidIdCounter++}`;
    const { svg } = await mermaid.render(id, code);
    return svg;
  } catch (e) {
    console.error('Mermaid render error:', e);
    return '';
  }
}
const DOC_TYPE_LABELS: Record<string, string> = {
  [DocumentType.FUNCTION_SPEC]: '功能说明书',
  [DocumentType.DESIGN_SPEC]: '设计说明书',
  [DocumentType.USER_MANUAL]: '用户手册',
  [DocumentType.SOFTWARE_BRIEF]: '软件简介',
  [DocumentType.TECH_DESCRIPTION]: '技术说明',
  [DocumentType.MODULE_DESCRIPTION]: '模块说明',
  [DocumentType.SOURCE_CODE]: '源代码文档'
};
interface OutlineItem {
  id: string;
  tag: string;
  text: string;
  level: number;
  element: HTMLElement;
}
interface FloatingToolbarState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  range: Range | null;
}
interface DocumentEditorProps {
  document: Document | null;
  projects: Project[];
  documents: Document[];
  onSave: (id: string, updates: Partial<Document>) => void;
  onNavigate: (view: AppView, projectId?: string, documentId?: string) => void;
}
export function DocumentEditor({
  document,
  projects,
  documents: allDocuments,
  onSave,
  onNavigate
}: DocumentEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<string>(document?.content || '');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  // Outline state
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
  const [activeOutlineId, setActiveOutlineId] = useState<string>('');
  // Floating toolbar state — x/y are now VIEWPORT (fixed) coordinates
  const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbarState>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    range: null
  });
  const [floatingInput, setFloatingInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isFloatingAiLoading, setIsFloatingAiLoading] = useState(false);
  const floatingToolbarRef = useRef<HTMLDivElement>(null);
  // Ref to track the highlight <span>s we inject to keep selection visible
  const highlightSpansRef = useRef<HTMLSpanElement[]>([]);
  // AbortController for stopping AI streaming
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopAiGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);
  // --- Highlight helpers: wrap / unwrap selected text so it stays visible when input steals focus ---
  const removeSelectionHighlight = useCallback(() => {
    for (const span of highlightSpansRef.current) {
      if (span && span.parentNode) {
        const parent = span.parentNode;
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        parent.normalize();
      }
    }
    highlightSpansRef.current = [];
  }, []);
  const addSelectionHighlight = useCallback(
    (range: Range) => {
      removeSelectionHighlight();
      const spans: HTMLSpanElement[] = [];
      try {
        // Try simple surroundContents first (works when selection is within one element)
        const span = window.document.createElement('span');
        span.className = 'bg-indigo-100 rounded';
        span.setAttribute('data-ai-highlight', 'true');
        range.surroundContents(span);
        spans.push(span);
      } catch {
        // Cross-element selection: wrap each text node individually
        try {
          const ancestor = range.commonAncestorContainer;
          const walker = window.document.createTreeWalker(
            ancestor.nodeType === Node.TEXT_NODE ?
            ancestor.parentNode! :
            ancestor,
            NodeFilter.SHOW_TEXT
          );
          const textNodes: Text[] = [];
          while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            if (range.intersectsNode(node) && node.textContent?.trim()) {
              textNodes.push(node);
            }
          }
          for (let i = 0; i < textNodes.length; i++) {
            const textNode = textNodes[i];
            const span = window.document.createElement('span');
            span.className = 'bg-indigo-100 rounded';
            span.setAttribute('data-ai-highlight', 'true');
            // For first node, may need to split at range start
            if (
            i === 0 &&
            textNode === range.startContainer &&
            range.startOffset > 0)
            {
              const splitNode = textNode.splitText(range.startOffset);
              splitNode.parentNode?.insertBefore(span, splitNode);
              span.appendChild(splitNode);
              // If this is also the last node, we may need to split again
              if (textNode === range.endContainer) {

                // Already handled by the range end offset relative to the split
              }}
            // For last node, may need to split at range end
            else if (
            i === textNodes.length - 1 &&
            textNode === range.endContainer &&
            range.endOffset < textNode.length)
            {
              textNode.splitText(range.endOffset);
              textNode.parentNode?.insertBefore(span, textNode);
              span.appendChild(textNode);
            }
            // Middle nodes: wrap entirely
            else {
              textNode.parentNode?.insertBefore(span, textNode);
              span.appendChild(textNode);
            }
            spans.push(span);
          }
        } catch {

          // If all else fails, no visual highlight but toolbar still works via saved range
        }}
      highlightSpansRef.current = spans;
    },
    [removeSelectionHighlight]
  );
  // --- Outline parsing (unchanged) ---
  const parseOutline = useCallback(() => {
    if (!editorRef.current) return;
    const headings = editorRef.current.querySelectorAll('h1, h2, h3, h4');
    const items: OutlineItem[] = [];
    headings.forEach((heading, index) => {
      const el = heading as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || '';
      if (!text) return;
      const levelMap: Record<string, number> = {
        h1: 0,
        h2: 1,
        h3: 2,
        h4: 3
      };
      // Ensure each heading has an id for scrolling
      if (!el.id) {
        el.id = `outline-heading-${index}-${Date.now()}`;
      }
      items.push({
        id: el.id,
        tag,
        text,
        level: levelMap[tag] ?? 0,
        element: el
      });
    });
    setOutlineItems(items);
  }, []);
  const updateActiveOutline = useCallback(() => {
    if (!editorScrollRef.current || outlineItems.length === 0) return;
    const scrollContainer = editorScrollRef.current;
    const scrollTop = scrollContainer.scrollTop;
    const containerTop = scrollContainer.getBoundingClientRect().top;
    let activeId = outlineItems[0]?.id || '';
    for (const item of outlineItems) {
      const el = item.element;
      if (!el) continue;
      const elTop = el.getBoundingClientRect().top - containerTop;
      if (elTop <= 80) {
        activeId = item.id;
      } else {
        break;
      }
    }
    setActiveOutlineId(activeId);
  }, [outlineItems]);
  useEffect(() => {
    if (document) {
      contentRef.current = document.content;
      if (editorRef.current) {
        editorRef.current.innerHTML = document.content;
      }
      setTimeout(() => parseOutline(), 50);
    }
  }, [document?.id, parseOutline]);
  useEffect(() => {
    const scrollEl = editorScrollRef.current;
    if (!scrollEl) return;
    const handleScroll = () => updateActiveOutline();
    scrollEl.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [updateActiveOutline]);
  const syncContent = useCallback(() => {
    if (editorRef.current) {
      contentRef.current = editorRef.current.innerHTML;
    }
    parseOutline();
  }, [parseOutline]);
  const execCommand = (
  command: string,
  value: string | undefined = undefined) =>
  {
    if (!document?.id) return;
    editorRef.current?.focus();
    window.document.execCommand(command, false, value);
    syncContent();
  };
  const handleSave = () => {
    if (!document) return;
    syncContent();
    setIsSaving(true);
    onSave(document.id, {
      content: contentRef.current
    });
    setTimeout(() => setIsSaving(false), 1000);
  };
  const handleInsertImage = () => {
    setImageModalOpen(true);
  };
  const handleInsertLink = () => {
    setLinkModalOpen(true);
  };
  const confirmInsertImage = (url: string) => {
    setImageModalOpen(false);
    editorRef.current?.focus();
    window.document.execCommand(
      'insertHTML',
      false,
      `<img src="${url}" alt="插入图片" style="max-width:100%;height:auto;margin:12px 0;border-radius:8px;" />`
    );
    syncContent();
  };
  const confirmInsertLink = (url: string) => {
    setLinkModalOpen(false);
    editorRef.current?.focus();
    window.document.execCommand('createLink', false, url);
    syncContent();
  };
  // ============================================================
  // FLOATING TOOLBAR — selection handling (FIXED positioning + highlight)
  // ============================================================
  const handleSelectionChange = useCallback(() => {
    if (isFloatingAiLoading) return;
    const selection = window.getSelection();
    if (
    !selection ||
    selection.isCollapsed ||
    !selection.rangeCount ||
    !editorRef.current)
    {
      // Delay hide so clicking inside toolbar doesn't dismiss it
      setTimeout(() => {
        if (floatingToolbarRef.current?.contains(window.document.activeElement))
        return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          removeSelectionHighlight();
          setFloatingToolbar((prev) => ({
            ...prev,
            visible: false
          }));
        }
      }, 200);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      return;
    }
    const selectedText = selection.toString().trim();
    if (!selectedText) {
      removeSelectionHighlight();
      setFloatingToolbar((prev) => ({
        ...prev,
        visible: false
      }));
      return;
    }
    // Use VIEWPORT coordinates (for fixed positioning)
    const rect = range.getBoundingClientRect();
    const toolbarWidth = 340;
    const toolbarHeight = 90; // approximate height
    // Center horizontally on selection, clamp to viewport
    let x = rect.left + rect.width / 2;
    x = Math.max(
      toolbarWidth / 2 + 8,
      Math.min(x, window.innerWidth - toolbarWidth / 2 - 8)
    );
    // Position above selection; if not enough room, go below
    let y = rect.top - 12;
    if (y < toolbarHeight + 8) {
      y = rect.bottom + 12;
    }
    // Clone range before we wrap it in a highlight
    const savedRange = range.cloneRange();
    // Add visual highlight so selection stays visible when input gets focus
    addSelectionHighlight(range);
    setFloatingToolbar({
      visible: true,
      x,
      y,
      selectedText,
      range: savedRange
    });
  }, [isFloatingAiLoading, addSelectionHighlight, removeSelectionHighlight]);
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 10);
    };
    const editorEl = editorRef.current;
    if (editorEl) {
      editorEl.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      if (editorEl) {
        editorEl.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [handleSelectionChange, document?.id]);
  // Hide floating toolbar on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
      floatingToolbarRef.current &&
      !floatingToolbarRef.current.contains(e.target as Node) &&
      editorRef.current &&
      !editorRef.current.contains(e.target as Node))
      {
        removeSelectionHighlight();
        setFloatingToolbar((prev) => ({
          ...prev,
          visible: false
        }));
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () =>
    window.document.removeEventListener('mousedown', handleClickOutside);
  }, [removeSelectionHighlight]);
  // Floating toolbar AI action
  const handleFloatingAiAction = async (action: string) => {
    if (!floatingToolbar.selectedText) return;
    const selectedText = floatingToolbar.selectedText;
    setIsFloatingAiLoading(true);
    setFloatingToolbar((prev) => ({
      ...prev,
      visible: false
    }));
    setFloatingInput('');
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      // Always remove visual highlights first, then use saved range for replacement
      removeSelectionHighlight();
      if (floatingToolbar.range) {
        const range = floatingToolbar.range;
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        const streamContainer = window.document.createElement('span');
        streamContainer.className = 'bg-indigo-50 text-indigo-700 rounded px-1';
        streamContainer.textContent = '[AI 正在处理...]';
        range.deleteContents();
        range.insertNode(streamContainer);
        await AIService.optimizeContentStream(
          selectedText,
          action,
          (text) => {
            streamContainer.innerHTML = text;
            streamContainer.className =
            'bg-indigo-50 text-indigo-900 rounded px-1';
          },
          controller.signal
        );
        setTimeout(() => {
          streamContainer.className = '';
        }, 1500);
      }
      syncContent();
      if (controller.signal.aborted) {
        toast.warning('已停止生成', '已保留当前已生成的内容');
      } else {
        toast.success('AI处理完成', `「${action}」操作已完成`);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        toast.warning('已停止生成', '已保留当前已生成的内容');
        syncContent();
      } else {
        console.error('Floating AI Tool Error:', error);
        toast.error('AI处理失败', '请检查网络连接后重试');
      }
    } finally {
      abortControllerRef.current = null;
      setIsFloatingAiLoading(false);
    }
  };
  const handleFloatingSubmit = () => {
    if (!floatingInput.trim()) return;
    handleFloatingAiAction(floatingInput.trim());
  };
  const applyAiTool = async (toolName: string, action: string) => {
    if (!editorRef.current) return;
    setAiLoading(toolName);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      if (action === '继续生成') {
        const fullContent =
        editorRef.current.innerText || editorRef.current.textContent || '';
        const loadingDiv = window.document.createElement('div');
        loadingDiv.className =
        'bg-indigo-50 text-indigo-500 p-4 my-4 rounded-lg text-center text-sm';
        loadingDiv.textContent = '[AI 正在继续生成中...]';
        editorRef.current.appendChild(loadingDiv);
        editorRef.current.scrollTop = editorRef.current.scrollHeight;
        const resultDiv = window.document.createElement('div');
        resultDiv.className = 'ai-streaming-result';
        loadingDiv.replaceWith(resultDiv);
        await AIService.optimizeContentStream(
          fullContent.slice(-2000),
          action,
          (text) => {
            resultDiv.innerHTML = text;
            editorRef.current!.scrollTop = editorRef.current!.scrollHeight;
          },
          controller.signal
        );
        setTimeout(() => {
          resultDiv.className = '';
        }, 500);
      } else {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const selectedText = selection.toString();
          const range = selection.getRangeAt(0);
          const streamContainer = window.document.createElement('span');
          streamContainer.className =
          'bg-indigo-50 text-indigo-700 rounded px-1';
          streamContainer.textContent = `[AI 正在${action}...]`;
          range.deleteContents();
          range.insertNode(streamContainer);
          let finalMermaidCode = '';
          await AIService.optimizeContentStream(
            selectedText,
            action,
            (text) => {
              if (action === '生成流程图') {
                finalMermaidCode = text.
                replace(/```mermaid\n?|\n?```/g, '').
                trim();
                streamContainer.className =
                'block bg-slate-50 border border-slate-200 p-4 rounded-xl my-4 overflow-x-auto';
                streamContainer.innerHTML = `<div class="flex items-center gap-2 mb-3"><div class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div><span class="text-xs font-medium text-indigo-600">流程图生成中...</span></div><pre class="text-xs text-slate-500 font-mono whitespace-pre-wrap">${finalMermaidCode}</pre>`;
              } else {
                streamContainer.innerHTML = text;
                streamContainer.className =
                'bg-indigo-50 text-indigo-900 rounded px-1';
              }
            },
            controller.signal
          );
          // After streaming completes, render mermaid diagram if it's a flowchart
          if (action === '生成流程图' && finalMermaidCode) {
            streamContainer.className =
            'block bg-white border border-slate-200 rounded-xl my-4 overflow-hidden shadow-sm';
            streamContainer.innerHTML = `<div class="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-500"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><span class="text-xs font-bold text-slate-600">流程图</span></div><div class="p-4 flex justify-center items-center text-sm text-slate-400">正在渲染图表...</div>`;
            try {
              const svg = await renderMermaidToSvg(finalMermaidCode);
              if (svg) {
                streamContainer.innerHTML = `<div class="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-500"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><span class="text-xs font-bold text-slate-600">流程图</span></div><div class="p-6 flex justify-center overflow-x-auto">${svg}</div>`;
              } else {
                // Fallback to code display if render fails
                streamContainer.innerHTML = `<div class="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span class="text-xs font-bold text-amber-700">流程图渲染失败，显示源代码</span></div><pre class="p-4 text-xs text-slate-600 font-mono whitespace-pre-wrap bg-slate-50">${finalMermaidCode}</pre>`;
              }
            } catch {
              streamContainer.innerHTML = `<div class="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span class="text-xs font-bold text-amber-700">流程图渲染失败，显示源代码</span></div><pre class="p-4 text-xs text-slate-600 font-mono whitespace-pre-wrap bg-slate-50">${finalMermaidCode}</pre>`;
            }
          } else if (action !== '生成流程图') {
            setTimeout(() => {
              streamContainer.className = '';
            }, 1500);
          }
        } else {
          toast.warning(
            '请先选中文本',
            '在编辑器中选中需要优化的文本后再使用此功能'
          );
          return;
        }
      }
      syncContent();
      if (controller.signal.aborted) {
        toast.warning('已停止生成', '已保留当前已生成的内容');
      } else {
        toast.success('AI处理完成', `「${action}」操作已完成`);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        toast.warning('已停止生成', '已保留当前已生成的内容');
        syncContent();
      } else {
        console.error('AI Tool Error:', error);
        toast.error('AI处理失败', '请检查网络连接后重试');
      }
    } finally {
      abortControllerRef.current = null;
      setAiLoading(null);
    }
  };
  const aiTools = [
  {
    id: 'continue',
    label: '继续生成',
    desc: 'AI断点续写，从末尾继续补全',
    action: '继续生成'
  },
  {
    id: 'expand',
    label: '内容扩写',
    desc: '增加细节与篇幅',
    action: '扩写'
  },
  {
    id: 'simplify',
    label: '内容精简',
    desc: '提取核心要点',
    action: '精简'
  },
  {
    id: 'professional',
    label: '专业化表达',
    desc: '转换为书面语',
    action: '专业化'
  },
  {
    id: 'technical',
    label: '技术化描述',
    desc: '增加技术深度',
    action: '技术化'
  },
  {
    id: 'logic',
    label: '逻辑优化',
    desc: '梳理上下文结构',
    action: '优化逻辑'
  },
  {
    id: 'flowchart',
    label: '生成流程图',
    desc: '自动生成可视化流程图',
    action: '生成流程图'
  }];

  // Scroll to heading when clicking outline item
  const scrollToHeading = (item: OutlineItem) => {
    const el = item.element;
    if (!el || !editorScrollRef.current) return;
    const scrollContainer = editorScrollRef.current;
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const elTop =
    el.getBoundingClientRect().top - containerTop + scrollContainer.scrollTop;
    scrollContainer.scrollTo({
      top: elTop - 20,
      behavior: 'smooth'
    });
    setActiveOutlineId(item.id);
  };
  if (!document) {
    // Group documents by project
    const projectsWithDocs = projects.
    map((proj) => ({
      project: proj,
      docs: allDocuments.
      filter((d) => d.projectId === proj.id).
      sort(
        (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    })).
    filter((g) => g.docs.length > 0);
    // No documents at all — show empty prompt
    if (projectsWithDocs.length === 0) {
      return (
        <div className="flex items-center justify-center text-slate-500 p-20 h-full">
          <motion.div
            className="text-center max-w-md"
            initial={{
              opacity: 0,
              y: 16
            }}
            animate={{
              opacity: 1,
              y: 0
            }}>
            
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileTextIcon className="w-8 h-8 text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              暂无可编辑的文档
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              您还没有生成过任何文档，请先创建项目并通过文档生成模块生成文档后再来编辑。
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => onNavigate(AppView.DOC_GENERATOR)}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                
                <Wand2Icon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                去生成文档
              </button>
              <button
                onClick={() => onNavigate(AppView.DASHBOARD)}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                
                返回工作台
              </button>
            </div>
          </motion.div>
        </div>);

    }
    // Has documents — show document browser
    return (
      <motion.div
        className="p-8 max-w-4xl mx-auto"
        initial={{
          opacity: 0,
          y: 16
        }}
        animate={{
          opacity: 1,
          y: 0
        }}>
        
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mr-3">
              <FileTextIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                选择文档进行编辑
              </h1>
              <p className="text-sm text-slate-500">
                共 {projectsWithDocs.length} 个项目，
                {projectsWithDocs.reduce(
                  (sum, g) => sum + g.docs.length,
                  0
                )}{' '}
                份文档
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {projectsWithDocs.map(({ project: proj, docs }, groupIdx) =>
          <motion.div
            key={proj.id}
            initial={{
              opacity: 0,
              y: 12
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: groupIdx * 0.06
            }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            
              {/* Project header */}
              <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <FolderOpenIcon className="w-4.5 h-4.5 text-indigo-500 mr-2.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm truncate">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {proj.version} · {proj.devLanguage} · {docs.length} 份文档
                    </p>
                  </div>
                </div>
                <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${proj.status === '已完成' ? 'bg-emerald-50 text-emerald-600' : proj.status === '进行中' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                
                  {proj.status}
                </span>
              </div>

              {/* Document list */}
              <div className="divide-y divide-slate-100">
                {docs.map((doc, docIdx) =>
              <motion.button
                key={doc.id}
                initial={{
                  opacity: 0
                }}
                animate={{
                  opacity: 1
                }}
                transition={{
                  delay: groupIdx * 0.06 + docIdx * 0.03
                }}
                onClick={() =>
                onNavigate(AppView.DOC_EDITOR, proj.id, doc.id)
                }
                className="w-full flex items-center px-5 py-3.5 hover:bg-indigo-50/50 transition-colors text-left group">
                
                    <FileTextIcon className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0 group-hover:text-indigo-500 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 truncate transition-colors">
                          {doc.title}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          {DOC_TYPE_LABELS[doc.type] || doc.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400 flex items-center">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {new Date(doc.updatedAt).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                        </span>
                        <span
                      className={`text-xs font-medium ${doc.status === '已生成' ? 'text-emerald-500' : doc.status === '草稿' ? 'text-amber-500' : 'text-blue-500'}`}>
                      
                          {doc.status}
                        </span>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  </motion.button>
              )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>);

  }
  const charCount = contentRef.current.replace(/<[^>]*>?/gm, '').length;
  // Build numbered outline labels
  const buildOutlineLabel = (items: OutlineItem[], index: number): string => {
    const item = items[index];
    if (item.level === 0) {
      // Count h1s before this one
      let h1Count = 0;
      for (let i = 0; i <= index; i++) {
        if (items[i].level === 0) h1Count++;
      }
      return `${h1Count}.`;
    }
    // For sub-levels, find parent numbering
    let parentIdx = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (items[i].level < item.level) {
        parentIdx = i;
        break;
      }
    }
    // Count siblings at same level under same parent
    let siblingCount = 0;
    const startIdx = parentIdx >= 0 ? parentIdx + 1 : 0;
    for (let i = startIdx; i <= index; i++) {
      if (items[i].level === item.level) siblingCount++;
      if (items[i].level < item.level && i > startIdx) break;
    }
    const parentLabel =
    parentIdx >= 0 ? buildOutlineLabel(items, parentIdx) : '';
    return `${parentLabel}${siblingCount}`;
  };
  return (
    <div className="flex bg-slate-50 absolute inset-0">
      <InputModal
        isOpen={imageModalOpen}
        title="插入图片"
        placeholder="请输入图片URL地址，如 https://example.com/image.png"
        onConfirm={confirmInsertImage}
        onCancel={() => setImageModalOpen(false)} />
      
      <InputModal
        isOpen={linkModalOpen}
        title="插入链接"
        placeholder="请输入链接URL，如 https://example.com"
        onConfirm={confirmInsertLink}
        onCancel={() => setLinkModalOpen(false)} />
      

      {/* Left Outline Panel — Dynamic */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center">
          <button
            onClick={() => onNavigate(AppView.DOC_EDITOR)}
            className="mr-3 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="返回文档列表">
            
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-slate-800">文档大纲</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5 text-sm custom-scrollbar">
          {outlineItems.length > 0 ?
          outlineItems.map((item, index) => {
            const isActive = activeOutlineId === item.id;
            const paddingLeft = item.level * 16;
            const label = buildOutlineLabel(outlineItems, index);
            return (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item)}
                className={`w-full text-left py-1.5 px-2 rounded-md transition-all duration-150 truncate block ${isActive ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'} ${item.level === 0 ? 'font-medium' : ''}`}
                style={{
                  paddingLeft: `${paddingLeft + 8}px`
                }}
                title={item.text}>
                
                  <span className="text-slate-400 mr-1.5 text-xs font-normal">
                    {label}
                  </span>
                  {item.text}
                </button>);

          }) :

          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FileTextIcon className="w-8 h-8 mb-3 text-slate-300" />
              <p className="text-xs text-center leading-relaxed">
                文档中暂无标题
                <br />
                使用 H1/H2 工具添加标题后
                <br />
                大纲将自动生成
              </p>
            </div>
          }
        </div>
      </div>

      {/* Center Editor */}
      <div className="flex-1 flex flex-col w-full bg-white border-x border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-slate-200 bg-slate-50 flex items-center justify-between px-4 py-2 flex-wrap gap-1">
          <div className="flex items-center flex-wrap gap-0.5">
            <button
              onClick={() => onNavigate(AppView.DOC_EDITOR)}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors lg:hidden"
              title="返回文档列表">
              
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1 lg:hidden"></div>

            <button
              onClick={() => execCommand('undo')}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              title="撤销">
              
              <UndoIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCommand('redo')}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              title="重做">
              
              <RedoIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>

            <button
              onClick={() => execCommand('bold')}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              title="加粗">
              
              <BoldIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCommand('italic')}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              title="斜体">
              
              <ItalicIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCommand('strikeThrough')}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              title="删除线">
              
              <StrikethroughIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>

            <button
              onClick={handleInsertLink}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              title="插入链接">
              
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleInsertImage}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              title="插入图片">
              
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCommand('insertHorizontalRule')}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              title="分隔线">
              
              <MinusIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400">{charCount} 字</span>
            <button
              onClick={handleSave}
              className="flex items-center px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md text-sm font-medium transition-colors">
              
              {isSaving ?
              <CheckIcon className="w-4 h-4 mr-1.5" /> :

              <SaveIcon className="w-4 h-4 mr-1.5" />
              }
              {isSaving ? '已保存' : '保存'}
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div
          ref={editorScrollRef}
          className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
          
          <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            {document.title}
          </h1>
          <div
            ref={editorRef}
            className="prose prose-slate max-w-none focus:outline-none min-h-[500px]"
            contentEditable
            onInput={syncContent}
            suppressContentEditableWarning />
          
        </div>
      </div>

      {/* Right AI Panel */}
      <div className="w-72 bg-white border-l border-slate-200 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-200 bg-indigo-50/50 flex items-center">
          <Wand2Icon className="w-5 h-5 text-indigo-600 mr-2" />
          <h3 className="font-bold text-indigo-900">AI 写作助手</h3>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs text-slate-500 mb-4">
            选中文本后点击按钮进行AI处理，结果将实时流式输出。
          </p>
          {aiLoading &&
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-indigo-700 flex items-center">
                  <Loader2Icon className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  AI 正在生成中...
                </span>
              </div>
              <button
              onClick={stopAiGeneration}
              className="w-full flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors">
              
                <SquareIcon className="w-3 h-3 mr-1.5 fill-current" />
                停止生成
              </button>
            </div>
          }
          <div className="space-y-2">
            {aiTools.map((tool) =>
            <button
              key={tool.id}
              onClick={() => applyAiTool(tool.id, tool.action)}
              disabled={aiLoading !== null}
              className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed">
              
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium text-sm text-slate-800 group-hover:text-indigo-700">
                    {tool.label}
                  </span>
                  {aiLoading === tool.id ?
                <Loader2Icon className="w-4 h-4 text-indigo-600 animate-spin" /> :

                <Wand2Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                }
                </div>
                <p className="text-xs text-slate-500">{tool.desc}</p>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating AI Toolbar — FIXED positioning, outside scroll container */}
      {floatingToolbar.visible && !isFloatingAiLoading &&
      <div
        ref={floatingToolbarRef}
        className="fixed z-[9999]"
        style={{
          left: `${floatingToolbar.x}px`,
          top: `${floatingToolbar.y}px`,
          transform: 'translate(-50%, -100%)'
        }}
        onMouseDown={(e) => {
          // Prevent editor from losing highlight when clicking toolbar,
          // but allow the input to receive focus normally
          const target = e.target as HTMLElement;
          if (target.tagName !== 'INPUT') {
            e.preventDefault();
          }
          e.stopPropagation();
        }}>
        
          <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 p-2.5 w-[340px] backdrop-blur-sm">
            {/* Quick action chips */}
            <div className="flex items-center gap-1.5 mb-2">
              <SparklesIcon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFloatingAiAction('扩写')}
              className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100">
              
                扩写
              </button>
              <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFloatingAiAction('精简')}
              className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100">
              
                精简
              </button>
              <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFloatingAiAction('专业化')}
              className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100">
              
                专业化
              </button>
              <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFloatingAiAction('技术化')}
              className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100">
              
                技术化
              </button>
            </div>
            {/* Custom input */}
            <div className="flex items-center gap-1.5">
              <input
              type="text"
              value={floatingInput}
              onChange={(e) => setFloatingInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (
                e.key === 'Enter' &&
                !isComposing &&
                !e.nativeEvent.isComposing)
                {
                  e.preventDefault();
                  handleFloatingSubmit();
                }
              }}
              placeholder="输入AI优化指令..."
              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 placeholder:text-slate-400" />
            
              <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleFloatingSubmit}
              disabled={!floatingInput.trim()}
              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title="发送">
              
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Arrow pointer */}
          <div className="flex justify-center">
            <div className="w-3 h-3 bg-white border-r border-b border-slate-200 transform rotate-45 -mt-1.5 shadow-sm"></div>
          </div>
        </div>
      }
      {isFloatingAiLoading &&
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]">
          <button
          onClick={stopAiGeneration}
          className="flex items-center px-5 py-2.5 bg-slate-900 text-white rounded-full shadow-xl text-sm font-medium hover:bg-slate-800 transition-colors">
          
            <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
            AI 处理中...
            <span className="ml-3 px-2 py-0.5 bg-red-500 rounded text-xs">
              停止
            </span>
          </button>
        </div>
      }
    </div>);

}