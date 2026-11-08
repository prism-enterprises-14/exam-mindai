"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Square,
  Paperclip,
  Image as ImageIcon,
  BookOpen,
  Globe,
  X,
  FileText,
  ArrowUp,
  Plus
} from "lucide-react";
import type { ResponseMode } from "@/lib/ai/prompts";
import type { Document } from "@/lib/database/db";

interface ChatComposerProps {
  onSendMessage: (
    message: string,
    attachments?: { type: string; data: string; name: string }[],
    model?: string
  ) => void;
  isStreaming: boolean;
  onStop: () => void;
  currentMode: ResponseMode;
  onSelectMode: (mode: ResponseMode) => void;
  availableDocuments: Document[];
  selectedDocumentIds: string[];
  onToggleDocument: (docId: string) => void;
  onDocumentUploaded?: (doc: Document) => void;
}

export function ChatComposer({
  onSendMessage,
  isStreaming,
  onStop,
  currentMode,
  onSelectMode,
  availableDocuments,
  selectedDocumentIds,
  onToggleDocument,
  onDocumentUploaded,
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ name: string; url: string } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const isSubmittingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachedImage) || isStreaming || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    const textToSend =
      input.trim() ||
      (attachedImage
        ? "Please analyze this uploaded image in comprehensive detail (extract text, mathematics, code, or visual diagrams and explain/solve step-by-step)."
        : "");

    const attachments = attachedImage
      ? [{ type: "image", data: attachedImage.url, name: attachedImage.name }]
      : undefined;

    setInput("");
    setAttachedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    onSendMessage(textToSend, attachments, undefined);

    // Release submit lock after small timeout to prevent rapid double-clicks
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Image must be smaller than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage({
          name: file.name,
          url: (event.target?.result as string) || "",
        });
      };
      reader.onerror = () => {
        console.error("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.document) {
          onDocumentUploaded?.(data.document);
          onToggleDocument(data.document.id);
        }
      }
    } catch (err) {
      console.error("Failed to upload document from chat:", err);
    } finally {
      setIsUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-2.5 sm:px-4 pb-2 sm:pb-3 pt-1">
      {/* Attached Image Preview */}
      {attachedImage && (
        <div className="mb-2 p-1.5 sm:p-2 rounded-2xl bg-zinc-100 border border-zinc-200 inline-flex items-center gap-2 max-w-full shadow-2xs backdrop-blur-xl">
          <img
            src={attachedImage.url}
            alt={attachedImage.name}
            className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-xl border border-zinc-200 flex-shrink-0"
          />
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-[11px] sm:text-xs text-zinc-800 font-medium truncate max-w-[180px] sm:max-w-xs">
              {attachedImage.name}
            </span>
            <span className="text-[10px] text-emerald-700 font-mono">Multimodal Vision Ready</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            className="p-1 text-zinc-400 hover:text-zinc-800 rounded-full flex-shrink-0 ml-1 active:scale-90"
            title="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected Textbooks Grounding Badges */}
      {selectedDocumentIds.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-zinc-600 font-medium flex items-center gap-1 text-[11px] sm:text-xs">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Grounded in {selectedDocumentIds.length} doc{selectedDocumentIds.length > 1 ? "s" : ""}:</span>
          </span>
          <div className="flex flex-wrap gap-1">
            {selectedDocumentIds.map((id) => {
              const doc = availableDocuments.find((d) => d.id === id);
              return (
                <span
                  key={id}
                  className="px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-[10px] sm:text-[11px] flex items-center gap-1 max-w-[140px] truncate"
                >
                  <span className="truncate">{doc?.name || "Textbook"}</span>
                  <button onClick={() => onToggleDocument(id)}>
                    <X className="w-3 h-3 hover:text-zinc-900 flex-shrink-0" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Iconic ChatGPT Pill Composer Box (Light Theme) */}
      <div className="relative rounded-[26px] border border-zinc-300 bg-white hover:border-zinc-400 focus-within:border-zinc-500 shadow-lg shadow-black/[0.04] transition-all p-2 sm:p-2.5 space-y-1.5">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, research a topic, or solve code..."
          aria-label="Ask anything, research a topic, or solve code"
          rows={1}
          className="w-full pt-1.5 pb-1 px-3 bg-transparent text-base sm:text-[15px] text-zinc-900 placeholder-zinc-400 focus:outline-none resize-none max-h-36 sm:max-h-48 leading-relaxed font-normal"
        />

        {/* Toolbar Row */}
        <div className="flex items-center justify-between px-1 sm:px-2 pt-0.5 gap-1.5">
          {/* Left: Attachments & Deep Search Active Badge */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Document Upload Input (.pdf, .txt, .docx, .md) */}
            <input
              type="file"
              ref={docInputRef}
              onChange={handleDocUpload}
              accept=".pdf,.txt,.md,.csv,.docx"
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploadingDoc}
              onClick={() => docInputRef.current?.click()}
              className="p-1.5 sm:p-2 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors disabled:opacity-50 active:scale-95"
              title="Upload PDF or notes to ground in conversation"
            >
              {isUploadingDoc ? (
                <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>

            {/* Image Upload Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 sm:p-2 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors active:scale-95"
              title="Upload image or screenshot"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Textbook Picker Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDocPicker(!showDocPicker)}
                className="p-1.5 sm:p-2 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors relative touch-manipulation active:scale-95"
                title="Ground answer in uploaded textbooks (RAG)"
              >
                <BookOpen className="w-4 h-4" />
                {selectedDocumentIds.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center">
                    {selectedDocumentIds.length}
                  </span>
                )}
              </button>

              {showDocPicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDocPicker(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute left-0 bottom-full mb-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-72 rounded-2xl border border-zinc-200 bg-white shadow-xl p-3 z-50 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <span>Select Textbook (RAG)</span>
                      <a href="/documents" className="text-emerald-700 hover:underline">
                        Library +
                      </a>
                    </div>
                    {availableDocuments.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-500">
                        No textbooks uploaded yet. Use the paperclip icon or visit Library to upload.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {availableDocuments.map((doc) => {
                          const isChecked = selectedDocumentIds.includes(doc.id);
                          return (
                            <div
                              key={doc.id}
                              onClick={() => onToggleDocument(doc.id)}
                              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs border transition-colors ${
                                isChecked
                                  ? "bg-zinc-100 border-emerald-500/50 text-zinc-900 font-medium"
                                  : "border-zinc-100 text-zinc-600 hover:bg-zinc-50"
                              }`}
                            >
                              <div className="truncate flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span className="truncate">{doc.name}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono flex-shrink-0">
                                {doc.pageCount}p
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Deep Search Active Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="hidden min-[420px]:inline">Deep Search</span>
            </div>
          </div>

          {/* Right: The Iconic ChatGPT Circular Send / Stop Button */}
          <div className="flex items-center flex-shrink-0">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 flex items-center justify-center transition-all shadow-md active:scale-95"
                title="Stop generating"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim() && !attachedImage}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300 shadow-xs"
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ChatGPT Disclaimer */}
      <p className="text-[11px] text-zinc-400 text-center pt-2 select-none">
        ExamMind AI can make mistakes. Verify important info. Engineered by CoralGenz Global.
      </p>
    </div>
  );
}
