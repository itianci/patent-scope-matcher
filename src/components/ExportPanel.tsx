import React, { useState, createElement, Component } from 'react';
import { motion } from 'framer-motion';
import {
  DownloadIcon,
  FileTextIcon,
  FileIcon,
  CodeIcon,
  CheckCircleIcon } from
'lucide-react';
import { Project, Document } from '../types';
import JSZip from 'jszip';
import { toast } from './Toast';
import { CustomSelect } from './CustomSelect';
interface ExportPanelProps {
  projects: Project[];
  documents: Document[];
}
export function ExportPanel({ projects, documents }: ExportPanelProps) {
  const [selectedProject, setSelectedProject] = useState<string>(
    projects[0]?.id || ''
  );
  const [format, setFormat] = useState<'docx' | 'pdf' | 'md'>('docx');
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Get all docs for project, then deduplicate by type keeping the latest
  const rawProjectDocs = documents.filter(
    (d) => d.projectId === selectedProject
  );
  const uniqueProjectDocsMap = new Map<string, Document>();
  rawProjectDocs.forEach((doc) => {
    const existing = uniqueProjectDocsMap.get(doc.type);
    if (!existing || new Date(doc.updatedAt) > new Date(existing.updatedAt)) {
      uniqueProjectDocsMap.set(doc.type, doc);
    }
  });
  const projectDocs = Array.from(uniqueProjectDocsMap.values());
  const selectedProjectName =
  projects.find((p) => p.id === selectedProject)?.name || '软著文档';
  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.name
  }));
  const htmlToPlainText = (html: string): string => {
    const div = window.document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };
  const htmlToMarkdown = (html: string): string => {
    let md = html;
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    md = md.replace(/<[^>]+>/g, '');
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/\n{3,}/g, '\n\n');
    return md.trim();
  };
  // Convert SVG element to a self-contained base64 SVG data URI for Word/PDF embedding
  const svgToDataUri = (svgEl: SVGSVGElement): string => {
    try {
      // Ensure SVG has xmlns
      if (!svgEl.getAttribute('xmlns')) {
        svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
      // Ensure dimensions
      let w = parseFloat(svgEl.getAttribute('width') || '0');
      let h = parseFloat(svgEl.getAttribute('height') || '0');
      if (!w || !h) {
        const vb = svgEl.getAttribute('viewBox');
        if (vb) {
          const parts = vb.split(/[\s,]+/);
          w = parseFloat(parts[2]) || 600;
          h = parseFloat(parts[3]) || 400;
        } else {
          w = 600;
          h = 400;
        }
        svgEl.setAttribute('width', String(w));
        svgEl.setAttribute('height', String(h));
      }
      // Inline all computed styles to make SVG self-contained
      const allEls = svgEl.querySelectorAll('*');
      for (const el of Array.from(allEls)) {
        const computed = window.getComputedStyle(el);
        const fill = computed.getPropertyValue('fill');
        const stroke = computed.getPropertyValue('stroke');
        const fontSize = computed.getPropertyValue('font-size');
        const fontFamily = computed.getPropertyValue('font-family');
        if (fill && fill !== 'none') (el as HTMLElement).style.fill = fill;
        if (stroke && stroke !== 'none')
        (el as HTMLElement).style.stroke = stroke;
        if (fontSize) (el as HTMLElement).style.fontSize = fontSize;
        if (fontFamily) (el as HTMLElement).style.fontFamily = fontFamily;
      }
      // Add white background rect
      const bgRect = window.document.createElementNS(
        'http://www.w3.org/2000/svg',
        'rect'
      );
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', 'white');
      svgEl.insertBefore(bgRect, svgEl.firstChild);
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      return `data:image/svg+xml;base64,${base64}`;
    } catch (e) {
      console.error('SVG to data URI failed:', e);
      return '';
    }
  };
  // Try canvas-based PNG conversion as primary method, with SVG data URI fallback
  const svgToPngDataUrl = (svgEl: SVGSVGElement): Promise<string> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(''), 5000);
      try {
        let w = parseFloat(svgEl.getAttribute('width') || '0');
        let h = parseFloat(svgEl.getAttribute('height') || '0');
        if (!w || !h) {
          const vb = svgEl.getAttribute('viewBox');
          if (vb) {
            const parts = vb.split(/[\s,]+/);
            w = parseFloat(parts[2]) || 600;
            h = parseFloat(parts[3]) || 400;
          } else {
            w = 600;
            h = 400;
          }
        }
        // Serialize SVG with inline styles
        const cloned = svgEl.cloneNode(true) as SVGSVGElement;
        cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        cloned.setAttribute('width', String(w));
        cloned.setAttribute('height', String(h));
        // Remove foreignObject elements (they break canvas rendering) and replace with text
        const foreignObjects = cloned.querySelectorAll('foreignObject');
        for (const fo of Array.from(foreignObjects)) {
          const textContent = fo.textContent || '';
          const x = fo.getAttribute('x') || '0';
          const y = fo.getAttribute('y') || '0';
          const textEl = window.document.createElementNS(
            'http://www.w3.org/2000/svg',
            'text'
          );
          textEl.setAttribute(
            'x',
            String(
              parseFloat(x) + parseFloat(fo.getAttribute('width') || '0') / 2
            )
          );
          textEl.setAttribute(
            'y',
            String(
              parseFloat(y) + parseFloat(fo.getAttribute('height') || '0') / 2
            )
          );
          textEl.setAttribute('text-anchor', 'middle');
          textEl.setAttribute('dominant-baseline', 'central');
          textEl.setAttribute('font-size', '14');
          textEl.setAttribute('font-family', 'SimHei, sans-serif');
          textEl.setAttribute('fill', '#333');
          textEl.textContent = textContent.trim();
          fo.replaceWith(textEl);
        }
        const svgString = new XMLSerializer().serializeToString(cloned);
        const svgBlob = new Blob([svgString], {
          type: 'image/svg+xml;charset=utf-8'
        });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          clearTimeout(timeout);
          try {
            const scale = 2;
            const canvas = window.document.createElement('canvas');
            canvas.width = w * scale;
            canvas.height = h * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.scale(scale, scale);
              ctx.drawImage(img, 0, 0, w, h);
            }
            const dataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            resolve(dataUrl);
          } catch {
            URL.revokeObjectURL(url);
            resolve('');
          }
        };
        img.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          resolve('');
        };
        img.src = url;
      } catch {
        clearTimeout(timeout);
        resolve('');
      }
    });
  };
  // Process HTML content to convert SVG flowcharts to images for Word/PDF export
  const processContentForExport = async (content: string): Promise<string> => {
    if (!content.includes('<svg')) return content;
    try {
      // We need the SVGs in a live DOM to compute styles, so attach temporarily
      const tempDiv = window.document.createElement('div');
      tempDiv.style.cssText =
      'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
      tempDiv.innerHTML = content;
      window.document.body.appendChild(tempDiv);
      const svgs = tempDiv.querySelectorAll('svg');
      if (svgs.length === 0) {
        window.document.body.removeChild(tempDiv);
        return content;
      }
      for (const svg of Array.from(svgs)) {
        try {
          // Skip tiny icon SVGs (only process mermaid diagrams)
          const w = parseFloat(
            svg.getAttribute('width') || svg.getBoundingClientRect().width + ''
          );
          if (w < 50) continue;
          // Try PNG first (best Word compatibility)
          let dataUrl = await svgToPngDataUrl(svg as SVGSVGElement);
          // Fallback to SVG data URI if PNG fails
          if (!dataUrl) {
            dataUrl = svgToDataUri(svg as SVGSVGElement);
          }
          if (dataUrl) {
            const imgEl = window.document.createElement('img');
            imgEl.src = dataUrl;
            imgEl.style.maxWidth = '100%';
            imgEl.style.display = 'block';
            imgEl.style.margin = '16px auto';
            const parentContainer =
            svg.closest('span') || svg.closest('div') || svg.parentElement;
            if (parentContainer && parentContainer !== tempDiv) {
              const wrapper = window.document.createElement('div');
              wrapper.style.cssText = 'margin: 20px 0; text-align: center;';
              const titleEl = window.document.createElement('p');
              titleEl.style.cssText =
              'font-weight: bold; text-align: center; margin-bottom: 10px; text-indent: 0;';
              titleEl.textContent = '流程图';
              wrapper.appendChild(titleEl);
              wrapper.appendChild(imgEl);
              parentContainer.replaceWith(wrapper);
            } else {
              svg.replaceWith(imgEl);
            }
          }
        } catch (e) {
          console.error('Failed to convert SVG:', e);
        }
      }
      const result = tempDiv.innerHTML;
      window.document.body.removeChild(tempDiv);
      return result;
    } catch {
      return content;
    }
  };
  const wrapInWordDoc = (title: string, content: string): string => {
    const styleOpen = '<' + 'style>';
    const styleClose = '</' + 'style>';
    const css = [
    'body { font-family: SimSun, serif; font-size: 14pt; line-height: 1.5; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }',
    'h1 { font-family: SimHei, sans-serif; font-size: 22pt; text-align: center; margin-bottom: 30px; }',
    'h2 { font-family: SimHei, sans-serif; font-size: 18pt; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }',
    'h3 { font-family: SimHei, sans-serif; font-size: 16pt; margin-top: 18px; }',
    'h4 { font-family: SimHei, sans-serif; font-size: 14pt; margin-top: 14px; }',
    'p { text-indent: 2em; margin: 10pt 0; }',
    'ul { padding-left: 2em; }',
    'li { margin: 4pt 0; }',
    'img { max-width: 100%; height: auto; display: block; margin: 16px auto; }'].
    join(' ');
    const parts = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head>',
    '<meta charset="UTF-8">',
    '<title>' + title + '</title>',
    styleOpen + css + styleClose,
    '</head>',
    '<body>',
    '<h1>' + title + '</h1>',
    content,
    '</body>',
    '</html>'];

    return parts.join('\n');
  };
  const handleExport = async () => {
    if (projectDocs.length === 0) return;
    setIsExporting(true);
    try {
      if (format === 'pdf') {
        // For PDF, we create a printable window since client-side PDF generation needs heavy libs
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast.error('导出失败', '请允许浏览器弹出窗口');
          setIsExporting(false);
          return;
        }
        const printCss = [
        'body { font-family: SimSun, serif; line-height: 1.6; color: #000; max-width: 800px; margin: 0 auto; padding: 40px 20px; }',
        'h1 { font-family: SimHei, sans-serif; font-size: 24pt; text-align: center; margin-bottom: 40px; page-break-before: always; }',
        'h1:first-of-type { page-break-before: avoid; }',
        'h2 { font-family: SimHei, sans-serif; font-size: 18pt; margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }',
        'h3 { font-family: SimHei, sans-serif; font-size: 16pt; margin-top: 20px; }',
        'p { text-indent: 2em; margin: 12px 0; }',
        'ul, ol { padding-left: 2em; }',
        'li { margin: 8px 0; }',
        'table { width: 100%; border-collapse: collapse; margin: 20px 0; }',
        'th, td { border: 1px solid #000; padding: 8px; text-align: left; }',
        '@media print { body { padding: 0; } @page { margin: 2cm; } }'].
        join(' ');
        const styleOpen = '<' + 'style>';
        const styleClose = '</' + 'style>';
        let combinedHtml =
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
        selectedProjectName +
        ' - 软著材料</title>' +
        styleOpen +
        printCss +
        styleClose +
        '</head><body>';
        for (const doc of projectDocs) {
          const processedContent = await processContentForExport(doc.content);
          combinedHtml += `<h1>${doc.title}</h1>\n${processedContent}\n`;
        }
        combinedHtml += `
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }, 500);
              }
            </script>
          </body>
          </html>
        `;
        printWindow.document.write(combinedHtml);
        printWindow.document.close();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setIsExporting(false);
        return;
      }
      // ZIP export for docx and md
      const zip = new JSZip();
      const folder = zip.folder(selectedProjectName) || zip;
      for (const doc of projectDocs) {
        const safeTitle = doc.title.replace(/[/\\?%*:|"<>]/g, '-');
        if (format === 'md') {
          const mdContent = `# ${doc.title}\n\n${htmlToMarkdown(doc.content)}`;
          folder.file(`${safeTitle}.md`, mdContent);
        } else if (format === 'docx') {
          const processedContent = await processContentForExport(doc.content);
          const docContent = wrapInWordDoc(doc.title, processedContent);
          folder.file(`${safeTitle}.doc`, docContent);
        }
      }
      const blob = await zip.generateAsync({
        type: 'blob'
      });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${selectedProjectName}-软著材料.zip`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('导出失败', '请检查后重试');
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <DownloadIcon className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">导出中心</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          将生成的软著申请材料一键打包导出，支持多种标准格式，直接用于版权局申报。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              1. 选择项目
            </h2>
            {projects.length > 0 ?
            <CustomSelect
              value={selectedProject}
              onChange={setSelectedProject}
              options={projectOptions}
              placeholder="请选择项目" /> :


            <div className="text-slate-500 text-sm p-3 bg-slate-50 rounded-lg border border-slate-200">
                暂无项目，请先创建项目
              </div>
            }
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              2. 选择导出格式
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setFormat('docx')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${format === 'docx' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                
                <FileTextIcon
                  className={`w-10 h-10 mb-2 ${format === 'docx' ? 'text-blue-600' : 'text-slate-400'}`} />
                
                <h3 className="font-bold text-slate-900">Word (.doc)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  标准申报格式，可二次编辑
                </p>
              </div>
              <div
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${format === 'pdf' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'}`}>
                
                <FileIcon
                  className={`w-10 h-10 mb-2 ${format === 'pdf' ? 'text-red-600' : 'text-slate-400'}`} />
                
                <h3 className="font-bold text-slate-900">PDF</h3>
                <p className="text-xs text-slate-500 mt-1">
                  打印级排版，直接提交
                </p>
              </div>
              <div
                onClick={() => setFormat('md')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${format === 'md' ? 'border-slate-800 bg-slate-100' : 'border-slate-200 hover:border-slate-400'}`}>
                
                <CodeIcon
                  className={`w-10 h-10 mb-2 ${format === 'md' ? 'text-slate-800' : 'text-slate-400'}`} />
                
                <h3 className="font-bold text-slate-900">Markdown</h3>
                <p className="text-xs text-slate-500 mt-1">
                  纯文本格式，适合开发者归档
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              3. 导出设置
            </h2>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                
                <span className="text-slate-700">自动生成目录 (TOC)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                
                <span className="text-slate-700">添加页眉页脚及页码</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                
                <span className="text-slate-700">
                  按照软著规范调整字体字号 (宋体/黑体)
                </span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-slate-900 rounded-xl p-6 text-white sticky top-8 shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <FileTextIcon className="w-5 h-5 mr-2 text-indigo-400" />{' '}
              导出清单预览
            </h3>

            <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {projectDocs.length > 0 ?
              projectDocs.map((doc) =>
              <div
                key={doc.id}
                className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-start">
                
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{doc.title}</span>
                  </div>
              ) :

              <div className="text-slate-500 text-sm italic text-center py-4">
                  该项目暂无已生成的文档
                </div>
              }
            </div>

            <button
              onClick={handleExport}
              disabled={projectDocs.length === 0 || isExporting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-bold flex items-center justify-center transition-colors">
              
              {isExporting ?
              <>
                  <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  
                    <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4">
                  </circle>
                    <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                  </svg>{' '}
                  正在处理...
                </> :
              showSuccess ?
              <>
                  <CheckCircleIcon className="w-5 h-5 mr-2" /> 导出成功
                </> :

              <>
                  <DownloadIcon className="w-5 h-5 mr-2" />{' '}
                  {format === 'pdf' ? '生成 PDF' : '一键打包下载'}
                </>
              }
            </button>
            <p className="text-xs text-slate-500 text-center mt-4">
              {format === 'pdf' ?
              '将打开打印窗口，请选择"另存为PDF"' :
              '下载文件将保存为 .zip 压缩包'}
            </p>
          </div>
        </div>
      </div>
    </div>);

}