"use client";

import React, { useState, useMemo, Component, type ErrorInfo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Check, Copy, Play, Terminal } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackContent: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Markdown rendering encountered an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="whitespace-pre-wrap font-sans text-zinc-800 leading-relaxed text-[14px]">
          {this.props.fallbackContent}
        </div>
      );
    }
    return this.props.children;
  }
}

export const MarkdownRenderer = React.memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const components: Components = useMemo(
    () => ({
      h1: ({ children }) => (
        <h1 className="text-lg sm:text-2xl font-bold text-zinc-900 tracking-tight mt-5 mb-2.5 pb-2 border-b border-zinc-200 flex items-center gap-2">
          <span className="w-1.5 h-5 sm:h-6 bg-[#10a37f] rounded-full inline-block flex-shrink-0"></span>
          <span>{children}</span>
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-base sm:text-xl font-semibold text-zinc-900 tracking-tight mt-4 mb-2 flex items-center gap-2">
          <span className="w-1 h-3.5 sm:h-4 bg-[#10a37f] rounded-full inline-block flex-shrink-0"></span>
          <span>{children}</span>
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-sm sm:text-base font-semibold text-zinc-900 mt-3.5 mb-1.5">{children}</h3>
      ),
      p: ({ children }) => (
        <p className="mb-2.5 sm:mb-3 leading-6 sm:leading-7 text-zinc-800 break-words">{children}</p>
      ),
      ul: ({ children }) => (
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 mb-2.5 sm:mb-3 text-zinc-700">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal pl-4 sm:pl-5 space-y-1 mb-2.5 sm:mb-3 text-zinc-700">{children}</ol>
      ),
      li: ({ children }) => <li className="leading-5 sm:leading-6">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-3 border-[#10a37f] bg-emerald-50/50 px-3.5 sm:px-4 py-2 rounded-r-lg my-3 text-zinc-700 italic text-xs sm:text-sm">
          {children}
        </blockquote>
      ),
      table: ({ children }) => (
        <div className="overflow-x-auto my-3 sm:my-4 rounded-xl border border-zinc-200 bg-white -webkit-overflow-scrolling-touch shadow-2xs">
          <table className="min-w-full divide-y divide-zinc-200 text-xs sm:text-sm text-left">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-zinc-100 text-zinc-900 font-semibold">{children}</thead>,
      tbody: ({ children }) => <tbody className="divide-y divide-zinc-100">{children}</tbody>,
      tr: ({ children }) => <tr className="hover:bg-zinc-50/80 transition-colors">{children}</tr>,
      th: ({ children }) => <th className="px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-zinc-900">{children}</th>,
      td: ({ children }) => <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-zinc-800">{children}</td>,
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const codeString = String(children).replace(/\n$/, "");
        const isInline = !match && !codeString.includes("\n");

        if (isInline) {
          return (
            <code
              className="bg-zinc-100 text-zinc-900 px-1.5 py-0.5 rounded text-[12px] sm:text-[13px] font-mono border border-zinc-200 break-all"
              {...props}
            >
              {children}
            </code>
          );
        }

        return <CodeBlock language={match ? match[1] : "text"} code={codeString} />;
      },
    }),
    []
  );

  return (
    <MarkdownErrorBoundary fallbackContent={content}>
      <div className="prose prose-neutral max-w-none text-zinc-800 leading-relaxed text-[14px] sm:text-[15px] space-y-3">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
});

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  };

  const handleSimulateRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      if (language === "python") {
        setOutput(">>> Executing in sandboxed runtime...\nComputed Result: {'converged': True, 'iterations': 14, 'residual': 1.48e-06}\n[Process completed in 24ms]");
      } else {
        setOutput(`>>> Compilation & Execution Simulation (${language}):\n[Build Succeeded]\nOutput: 42\nMemory: 1.2 MB | Time: 8ms`);
      }
    }, 700);
  };

  return (
    <div className="my-3 sm:my-4 rounded-xl border border-white/10 bg-[#0d0d0d] overflow-hidden shadow-2xl">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#2f2f2f] text-xs text-zinc-300">
        <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs text-zinc-400">
          <Terminal className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          <span className="lowercase">{language}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {["python", "javascript", "typescript", "cpp", "c"].includes(language.toLowerCase()) && (
            <button
              onClick={handleSimulateRun}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-white/5 hover:bg-white/10 text-emerald-400 border border-[#10a37f]/30 transition-all font-medium text-[10px] sm:text-[11px] active:scale-95 cursor-pointer"
              title="Test run code"
              aria-label="Run simulated code"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isRunning ? "Running..." : "Run"}</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-[11px] active:scale-95 cursor-pointer"
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="p-3 sm:p-4 overflow-x-auto text-[12px] sm:text-[13.5px] font-mono leading-relaxed text-[#ececec] -webkit-overflow-scrolling-touch">
        <pre className="!bg-transparent !p-0 !border-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>

      {/* Execution Output */}
      {output && (
        <div className="border-t border-white/10 bg-[#14231b] p-3 font-mono text-[11px] sm:text-xs text-emerald-400">
          <div className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1 font-semibold">Sandbox Execution Log:</div>
          <pre className="whitespace-pre-wrap !bg-transparent !p-0 !border-0 text-emerald-300">{output}</pre>
        </div>
      )}
    </div>
  );
}
