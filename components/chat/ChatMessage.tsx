"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RotateCw
} from "lucide-react";
import type { Message } from "@/lib/database/db";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { ResponseMode } from "@/lib/ai/prompts";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  mode?: ResponseMode;
  onRegenerate?: () => void;
  onFeedback?: (messageId: string, feedback: "LIKE" | "DISLIKE") => void;
  onFollowUpClick?: (question: string) => void;
}

/**
 * Strips raw internal thinking processes, chain-of-thought traces, prompt leakage, or <think> tags
 */
function stripThinkingTraces(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove <think>...</think> tags and unclosed <think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "");

  // 2. Remove internal planning / scratchpad echoes
  cleaned = cleaned.replace(
    /^(?:Thinking Process|Thought|Reasoning|Chain of Thought|Internal Plan|Scratchpad):[\s\S]*?(?=\n\n|\n[A-Z0-9#*-])/i,
    ""
  );

  // 3. Remove prompt directive echoes, model self-talk, and chain-of-thought preambles
  if (
    /^(?:User says\s+['"]|Likely they want|block\.\s*Provide answer|Must not |Ensure compliance|We need to |I need to |According to the ground truth|Let's answer|The user asks:?|Actually we can |Ok\.\s*We need to|Thinking Process:|Thought:)/i.test(
      cleaned
    )
  ) {
    // If a clean markdown header exists, start directly from the header
    const headerMatch = cleaned.match(/(?:^|\n)(#{1,4}\s+[A-Za-z0-9*][\s\S]*)/);
    if (headerMatch && headerMatch[1]) {
      cleaned = headerMatch[1].trim();
    } else {
      const boundaryMatch = cleaned.match(
        /(?:(?:start with answer block:?\s*["']?)|(?:start with:?\s*["']?)|(?:Cite sources\.?\s*)|(?:Provide explanation:?\s*["']?)|(?:No extra fluff\.?\s*)|(?:\n\n+)|(?:\s*(?=\*\*[A-Za-z0-9])))/i
      );
      if (boundaryMatch && boundaryMatch.index !== undefined) {
        const candidate = cleaned.slice(boundaryMatch.index + boundaryMatch[0].length).trim();
        if (candidate.length > 20) {
          cleaned = candidate;
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1).trim();
          }
        }
      }
    }
  }

  // 4. Cleanly unwrap :::answer tags into regular formatted markdown
  cleaned = cleaned.replace(/:::answer\s*/gi, "").replace(/\s*:::\s*/gi, "\n\n");
  cleaned = cleaned.replace(/\[HIGHLIGHTED ANSWER\]\s*/gi, "");

  return cleaned.trim();
}

export const ChatMessage = React.memo(function ChatMessage({
  message,
  isStreaming = false,
  mode = "DEEP_SEARCH",
  onRegenerate,
  onFeedback,
  onFollowUpClick,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<"LIKE" | "DISLIKE" | null>(
    message.feedback || null
  );

  useEffect(() => {
    setCurrentFeedback(message.feedback || null);
  }, [message.feedback]);

  const isAssistant = message.role === "assistant";

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(message.content)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  };

  const handleFeedback = (type: "LIKE" | "DISLIKE") => {
    const next = currentFeedback === type ? null : type;
    setCurrentFeedback(next);
    if (onFeedback) {
      onFeedback(message.id, next as any);
    }
  };

  const cleanedContent = isAssistant ? stripThinkingTraces(message.content) : message.content;

  const displayModelName = message.modelUsed
    ? message.modelUsed.replace(/gpt-oss|qwen|openai|deepseek|anthropic/gi, "ExamMind Core")
    : "ExamMind Core v4.0 (CoralGenz Global)";

  const suggestions =
    isAssistant && message.content.length > 50
      ? [
          "Explain the key intuition in simpler terms",
          "Give another real-world application or example",
          "Show the step-by-step mathematical proof",
        ]
      : [];

  // =========================================================================
  // USER MESSAGE: Iconic Right-Aligned ChatGPT Light Bubble
  // =========================================================================
  if (!isAssistant) {
    return (
      <div className="py-2.5 sm:py-3 px-3 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-auto flex justify-end">
          <div className="max-w-[85%] sm:max-w-[75%] rounded-[24px] rounded-br-[8px] bg-[#f4f4f4] border border-zinc-200/80 text-zinc-900 px-4 sm:px-5 py-2.5 sm:py-3 shadow-xs space-y-2">
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {message.attachments.map((att, i) => (
                  <div
                    key={i}
                    className="rounded-xl overflow-hidden border border-zinc-300 max-w-xs shadow-xs bg-white"
                  >
                    {att.data?.startsWith("data:image/") || att.type === "image" ? (
                      <img
                        src={att.data}
                        alt={att.name || "Attached Image"}
                        className="max-h-56 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="p-2 text-xs text-zinc-700 font-mono">{att.name}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words font-normal">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ASSISTANT MESSAGE: Iconic ChatGPT Left-Aligned Pure White Canvas
  // =========================================================================
  return (
    <div className="group py-4 sm:py-6 px-3 sm:px-6 md:px-8 border-b border-zinc-100 bg-white">
      <div className="max-w-3xl mx-auto flex gap-3 sm:gap-4 items-start">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 shadow-xs p-0.5">
            <img
              src="/logo.png"
              alt="EXAM MIND AI"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between text-xs gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-zinc-900 text-xs flex-shrink-0">
                ExamMind AI
              </span>
              <span
                className="text-[10px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200 truncate max-w-[120px] min-[360px]:max-w-[180px] sm:max-w-[280px]"
                title="ExamMind AI • Engineered by CoralGenz Global"
              >
                {displayModelName}
              </span>
              {message.verificationBadge && (
                <span
                  className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 truncate font-medium"
                  title="Independently verified"
                >
                  ✓ {message.verificationBadge}
                </span>
              )}
            </div>

            {/* Quick Actions (ChatGPT Hover Icons) */}
            <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={handleCopy}
                className="p-1 sm:p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors active:scale-95"
                title="Copy entire message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleFeedback("LIKE")}
                className={`p-1 sm:p-1.5 rounded-lg hover:bg-zinc-100 transition-colors active:scale-95 ${
                  currentFeedback === "LIKE" ? "text-emerald-600" : "text-zinc-400 hover:text-zinc-800"
                }`}
                title="Good explanation"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleFeedback("DISLIKE")}
                className={`p-1 sm:p-1.5 rounded-lg hover:bg-zinc-100 transition-colors active:scale-95 ${
                  currentFeedback === "DISLIKE" ? "text-rose-600" : "text-zinc-400 hover:text-zinc-800"
                }`}
                title="Needs improvement"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1 sm:p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors active:scale-95"
                  title="Regenerate answer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Citations Box (if RAG / Live Web sources were retrieved) */}
          {message.citations && message.citations.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-2.5 sm:p-3 text-xs mb-3 shadow-2xs backdrop-blur-sm">
              <button
                onClick={() => setShowCitations(!showCitations)}
                className="w-full flex items-center justify-between text-zinc-800 font-medium"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">
                    Grounded in {message.citations.length} Verified Source
                    {message.citations.length > 1 ? "s" : ""}
                  </span>
                </div>
                {showCitations ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>

              {showCitations && (
                <div className="mt-2.5 sm:mt-3 space-y-2 pt-2 border-t border-zinc-200">
                  {message.citations.map((cite, i) => (
                    <div
                      key={i}
                      className="p-2 sm:p-2.5 rounded-xl bg-white border border-zinc-200 space-y-1 shadow-2xs"
                    >
                      <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between font-mono text-[10px] sm:text-[11px] text-zinc-500 gap-0.5">
                        <span className="font-semibold text-zinc-900 truncate">{cite.documentName}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span>{cite.sourceUrl ? "Web Source" : `Page ${cite.pageNumber}`} {cite.section ? `(§${cite.section})` : ""}</span>
                          {cite.sourceUrl && (
                            <a
                              href={cite.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 underline text-[10px] flex items-center gap-0.5 font-medium"
                            >
                              <span>Visit</span>
                              <span>↗</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] sm:text-[12px] text-zinc-700 italic font-serif leading-relaxed">
                        &ldquo;{cite.excerpt}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Animated Thinking Indicator while waiting for tokens */}
          {!cleanedContent && isStreaming && (
            <ThinkingIndicator mode={mode} />
          )}

          {/* Clean Markdown Response */}
          {cleanedContent && (
            <div className="text-zinc-800 leading-relaxed relative">
              <MarkdownRenderer content={cleanedContent} />
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-emerald-600 rounded-sm animate-pulse ml-1.5 align-middle shadow-[0_0_8px_rgba(16,163,127,0.4)]" />
              )}
            </div>
          )}

          {/* Follow-up question pills */}
          {suggestions.length > 0 && onFollowUpClick && !isStreaming && (
            <div className="pt-3 flex flex-wrap gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onFollowUpClick(s)}
                  className="px-3 py-1 rounded-full text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border border-zinc-200 transition-all text-left shadow-2xs"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
