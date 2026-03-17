import { DEEPSEEK_CONFIG } from '../config/deepseek';
import { Project, DocumentType } from '../types';

export class AIService {
  private static async callAPI(
  systemPrompt: string,
  userPrompt: string)
  : Promise<string> {
    try {
      const response = await fetch(DEEPSEEK_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_CONFIG.model,
          messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }],

          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('DeepSeek API Error:', error);
      throw error;
    }
  }

  private static async callAPIStream(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal)
  : Promise<string> {
    try {
      const response = await fetch(DEEPSEEK_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_CONFIG.model,
          messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }],

          temperature: 0.7,
          max_tokens: 4000,
          stream: true
        }),
        signal
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (
            line.startsWith('data: ') &&
            line !== 'data: [DONE]\r' &&
            line !== 'data: [DONE]')
            {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0]?.delta?.content || '';
                fullText += content;
                onChunk(fullText);
              } catch (e) {

                // Ignore parse errors for incomplete chunks
              }}
          }
        }
      } catch (e) {
        // If aborted, cancel the reader and return what we have so far
        if (signal?.aborted) {
          reader.cancel();
          return fullText;
        }
        throw e;
      }
      return fullText;
    } catch (error) {
      if (signal?.aborted) {
        return ''; // Return empty on abort
      }
      console.error('DeepSeek API Stream Error:', error);
      throw error;
    }
  }

  static async parseProjectInfo(text: string): Promise<Partial<Project>> {
    const systemPrompt = `你是一个专业的软件需求分析师。请从用户的一句话描述中提取软件项目信息，并以JSON格式返回。
必须返回严格的JSON对象，包含以下字段：
{
  "name": "软件名称",
  "softwareType": "应用软件" | "系统软件" | "平台软件",
  "industry": "所属行业",
  "mainFunctions": "主要功能概述",
  "techArchitecture": "技术架构（推测）",
  "devLanguage": "开发语言（推测）",
  "runEnvironment": "运行环境（推测）",
  "modules": ["模块1", "模块2"]
}
只返回JSON，不要其他任何内容。如果无法推测，可以填入合理的默认值。`;

    const result = await this.callAPI(systemPrompt, text);
    try {
      const jsonStr = result.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', result);
      throw new Error('AI解析失败');
    }
  }

  static async generateDocument(
  project: Project,
  docType: DocumentType,
  onProgress?: (text: string) => void,
  baseContent?: string,
  signal?: AbortSignal)
  : Promise<string> {
    const systemPrompt = `你是一个专业的软件著作权文档编写专家。请根据用户提供的软件项目信息，生成符合中国国家版权局软著申请规范的文档。
输出格式要求：必须使用HTML格式，只使用<h1>, <h2>, <h3>, <h4>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <table>, <tr>, <td>, <th>等内容标签。严禁输出<style>, <script>, <html>, <head>, <body>, <meta>, <link>等标签。不要包含markdown代码块标记（如\`\`\`html）。直接输出HTML内容片段即可。`;

    const projectInfo = `
软件名称：${project.name}
版本号：${project.version}
软件类型：${project.softwareType}
所属行业：${project.industry}
开发语言：${project.devLanguage}
技术架构：${project.techArchitecture}
运行环境：${project.runEnvironment}
功能模块：${project.modules.join('、')}
主要功能概述：${project.mainFunctions}
`;

    let docTypeDesc = '';
    switch (docType) {
      case DocumentType.FUNCTION_SPEC:
        docTypeDesc =
        '软件功能说明书（包含软件概述、开发背景、设计目标、系统架构、功能模块详细说明、运行环境、使用流程等）';
        break;
      case DocumentType.DESIGN_SPEC:
        docTypeDesc =
        '软件设计说明书（包含系统总体设计、系统架构设计、模块设计、数据结构设计、接口设计、安全设计等）';
        break;
      case DocumentType.USER_MANUAL:
        docTypeDesc =
        '用户操作手册（包含系统安装、配置、登录说明及各功能模块的详细操作步骤）';
        break;
      case DocumentType.SOFTWARE_BRIEF:
        docTypeDesc =
        '软件简介（300字左右的软件概述，用于软著申请表填报，包含核心功能、技术特点、应用场景）';
        break;
      case DocumentType.TECH_DESCRIPTION:
        docTypeDesc =
        '技术实现说明（突出软件的技术创新点、核心算法、架构优势及性能指标）';
        break;
      case DocumentType.MODULE_DESCRIPTION:
        docTypeDesc =
        '软件模块说明（按功能模块详细拆解，说明每个模块的作用、处理流程和输入输出）';
        break;
      case DocumentType.SOURCE_CODE:
        docTypeDesc =
        '源代码说明文档（生成符合软著要求的前后30页代码结构说明及核心代码片段示例，包含详细注释）';
        break;
    }

    let userPrompt = '';
    if (baseContent) {
      userPrompt = `请基于以下软件项目信息，以及用户提供的【基础文档内容】，生成一份专业、完整的【${docTypeDesc}】。
要求：
1. 保留并优化用户提供的基础内容
2. 补充缺失的章节和细节，使其符合软著申请规范
3. 确保上下文连贯，专业术语准确

项目信息：
${projectInfo}

基础文档内容：
${baseContent}`;
    } else {
      userPrompt = `请基于以下软件项目信息，生成一份专业的【${docTypeDesc}】。\n\n项目信息：\n${projectInfo}`;
    }

    if (onProgress) {
      return this.callAPIStream(systemPrompt, userPrompt, onProgress, signal);
    }
    return this.callAPI(systemPrompt, userPrompt);
  }

  static async generateModuleDescription(
  project: Project,
  moduleName: string,
  onProgress?: (text: string) => void,
  signal?: AbortSignal)
  : Promise<string> {
    const systemPrompt = `你是一个专业的软件架构师和技术文档专家。请为特定的软件功能模块生成详细的技术说明。
输出格式要求：必须使用HTML格式，只使用<h4>, <p>, <ul>, <li>, <ol>, <strong>, <em>等内容标签。严禁输出<style>, <script>, <html>, <head>, <body>等标签。不要包含markdown代码块标记。直接输出HTML内容片段即可。`;

    const userPrompt = `
项目名称：${project.name}
整体架构：${project.techArchitecture}
开发语言：${project.devLanguage}

请为该项目的【${moduleName}】模块生成详细的说明，必须包含以下四个部分（使用<h4>标签作为小标题）：
1. 模块介绍（该模块的业务定位和核心价值）
2. 功能说明（使用<ul><li>列出具体功能点）
3. 处理流程（描述核心业务逻辑的流转过程）
4. 输入输出（描述接口或数据的输入输出格式）
`;

    if (onProgress) {
      return this.callAPIStream(systemPrompt, userPrompt, onProgress, signal);
    }
    return this.callAPI(systemPrompt, userPrompt);
  }

  static async optimizeContent(
  content: string,
  action: string)
  : Promise<string> {
    const systemPrompt = `你是一个专业的文字编辑和技术文档润色专家。请根据用户的要求对提供的文本进行优化。
直接返回优化后的文本，不要包含任何解释性的废话。`;

    let actionDesc = '';
    switch (action) {
      case '扩写':
        actionDesc =
        '对以下内容进行扩写，增加合理的细节、背景说明和具体例子，使其更加丰富详实。';
        break;
      case '精简':
        actionDesc =
        '对以下内容进行精简，去除冗余词汇，提取核心要点，使其更加简洁明了。';
        break;
      case '专业化':
        actionDesc =
        '将以下内容转换为专业的书面语和公文表达，使其符合正式技术文档的规范。';
        break;
      case '技术化':
        actionDesc =
        '为以下内容增加技术深度，使用更专业的技术术语描述其底层逻辑和实现机制。';
        break;
      case '优化逻辑':
        actionDesc =
        '梳理以下内容的上下文逻辑结构，使其条理更清晰，层次更分明。';
        break;
      case '生成流程图':
        actionDesc =
        '根据以下内容，提取核心业务流程，并生成一个Mermaid格式的流程图代码块。请只返回```mermaid ... ```代码块，不要其他废话。';
        break;
      case '继续生成':
        actionDesc =
        '以下是一份未完成的文档内容，请紧接着最后的内容继续往下写，补全剩余的部分。请保持上下文连贯，语气一致。直接输出续写的内容，不要重复已有的内容，也不要包含任何解释性的废话。';
        break;
      default:
        actionDesc = `对以下内容进行${action}处理。`;
    }

    const userPrompt = `${actionDesc}\n\n待优化内容（或未完成内容）：\n${content}`;

    return this.callAPI(systemPrompt, userPrompt);
  }

  static async optimizeContentStream(
  content: string,
  action: string,
  onProgress: (text: string) => void,
  signal?: AbortSignal)
  : Promise<string> {
    const systemPrompt = `你是一个专业的文字编辑和技术文档润色专家。请根据用户的要求对提供的文本进行优化。
输出格式要求：必须使用HTML格式，只使用<h2>, <h3>, <h4>, <p>, <ul>, <li>, <ol>, <strong>, <em>等内容标签。严禁输出<style>, <script>, <html>, <head>, <body>等标签。不要包含markdown代码块标记。直接输出HTML内容片段即可。`;

    let actionDesc = '';
    switch (action) {
      case '扩写':
        actionDesc =
        '对以下内容进行扩写，增加合理的细节、背景说明和具体例子，使其更加丰富详实。';
        break;
      case '精简':
        actionDesc =
        '对以下内容进行精简，去除冗余词汇，提取核心要点，使其更加简洁明了。';
        break;
      case '专业化':
        actionDesc =
        '将以下内容转换为专业的书面语和公文表达，使其符合正式技术文档的规范。';
        break;
      case '技术化':
        actionDesc =
        '为以下内容增加技术深度，使用更专业的技术术语描述其底层逻辑和实现机制。';
        break;
      case '优化逻辑':
        actionDesc =
        '梳理以下内容的上下文逻辑结构，使其条理更清晰，层次更分明。';
        break;
      case '生成流程图':
        actionDesc =
        '根据以下内容，提取核心业务流程，并生成一个Mermaid格式的流程图代码块。请只返回```mermaid ... ```代码块，不要其他废话。';
        break;
      case '继续生成':
        actionDesc =
        '以下是一份未完成的文档内容，请紧接着最后的内容继续往下写，补全剩余的部分。请保持上下文连贯，语气一致。直接输出续写的HTML内容，不要重复已有的内容，也不要包含任何解释性的废话。';
        break;
      default:
        actionDesc = `对以下内容进行${action}处理。`;
    }

    const userPrompt = `${actionDesc}\n\n待处理内容：\n${content}`;

    return this.callAPIStream(systemPrompt, userPrompt, onProgress, signal);
  }
}