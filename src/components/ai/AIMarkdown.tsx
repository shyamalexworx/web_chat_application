import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

interface AIMarkdownProps {
  content: string;
}

export const AIMarkdown: React.FC<AIMarkdownProps> = ({ content }) => {
  return (
    <div className="space-y-2 select-text text-inherit">
      {renderMarkdownContent(content)}
    </div>
  );
};

function renderMarkdownContent(rawText: string): React.ReactNode[] {
  if (!rawText) return [];

  // Split content by code blocks first
  // Pattern: ```optionalLang\ncode\n```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(rawText)) !== null) {
    const textBefore = rawText.slice(lastIndex, match.index);
    if (textBefore) {
      nodes.push(
        <div key={`text-${lastIndex}`} className="space-y-1.5">
          {renderTextSegments(textBefore)}
        </div>
      );
    }

    const language = match[1]?.trim() || 'code';
    const codeContent = match[2]?.replace(/\n$/, '') || '';
    nodes.push(
      <CodeBlockSnippet
        key={`code-${match.index}`}
        language={language}
        code={codeContent}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = rawText.slice(lastIndex);
  if (remainingText) {
    nodes.push(
      <div key={`text-end`} className="space-y-1.5">
        {renderTextSegments(remainingText)}
      </div>
    );
  }

  return nodes;
}

const CodeBlockSnippet: React.FC<{ language: string; code: string }> = ({
  language,
  code,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl border border-[#252B36] bg-[#12151C] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0B0D12]/70 border-b border-[#252B36] text-[11px] text-[#929BAA] font-mono">
        <span className="flex items-center gap-1.5 capitalize font-medium">
          <Code className="w-3.5 h-3.5 text-[#4F8CFF]" />
          {language}
        </span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1 hover:text-[#F5F7FA] transition-colors px-1.5 py-0.5 rounded hover:bg-[#181C25] cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#32C48D]" />
              <span className="text-[#32C48D]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed text-[#F5F7FA] selection:bg-[#4F8CFF]/30">
        <code>{code}</code>
      </pre>
    </div>
  );
};

function renderTextSegments(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      // Empty line -> spacing
      renderedElements.push(<div key={`empty-${i}`} className="h-1" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h4
          key={`h4-${i}`}
          className="font-bold text-sm text-[#F5F7FA] mt-2 mb-1"
        >
          {parseInlineFormatting(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h3
          key={`h3-${i}`}
          className="font-bold text-base text-[#F5F7FA] mt-2.5 mb-1"
        >
          {parseInlineFormatting(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h2
          key={`h2-${i}`}
          className="font-extrabold text-lg text-[#F5F7FA] mt-3 mb-1"
        >
          {parseInlineFormatting(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Bullet points: -, *, •
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemContent = trimmed.replace(/^[-*•]\s+/, '');
      renderedElements.push(
        <div key={`bullet-${i}`} className="flex items-start space-x-2 pl-1 my-0.5">
          <span className="text-[#4F8CFF] font-bold text-xs mt-0.5">•</span>
          <div className="flex-1 leading-relaxed">
            {parseInlineFormatting(itemContent)}
          </div>
        </div>
      );
      continue;
    }

    // Numbered lists: 1. 2. 3.
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      renderedElements.push(
        <div key={`num-${i}`} className="flex items-start space-x-2 pl-1 my-0.5">
          <span className="text-[#4F8CFF] font-semibold text-xs mt-0.5 font-mono">
            {numberedMatch[1]}.
          </span>
          <div className="flex-1 leading-relaxed">
            {parseInlineFormatting(numberedMatch[2])}
          </div>
        </div>
      );
      continue;
    }

    // Standard paragraph line
    renderedElements.push(
      <p key={`p-${i}`} className="leading-relaxed my-0.5">
        {parseInlineFormatting(line)}
      </p>
    );
  }

  return renderedElements;
}

/**
 * Parses bold (**bold**), inline code (`code`), and italic (*italic*)
 */
function parseInlineFormatting(str: string): React.ReactNode[] {
  // Regex splitting by bold, inline code, italic
  const parts: React.ReactNode[] = [];
  // Tokenizer pattern: (**bold**)|(`code`)|(\*italic\*)
  const inlineRegex = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\*[^*]+\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push(str.slice(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-[#F5F7FA]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-[#252B36]/80 text-[#4F8CFF] font-mono text-[11px] border border-[#252B36]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`em-${match.index}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIdx = match.index + token.length;
  }

  if (lastIdx < str.length) {
    parts.push(str.slice(lastIdx));
  }

  return parts.length > 0 ? parts : [str];
}

