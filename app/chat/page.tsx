"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { Conversation, Document, Message } from "@/lib/database/db";
import { ResponseMode } from "@/lib/ai/prompts";
import { Download, Trash2, Globe, PanelLeft, Plus } from "lucide-react";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ResponseMode>("DEEP_SEARCH");
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isSubmittingRef = useRef(false);
  const justCreatedConvIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations and documents on mount
  useEffect(() => {
    fetchConversations();
    fetchDocuments();
  }, []);

  // When active conversation changes, load its messages
  useEffect(() => {
    if (justCreatedConvIdRef.current === activeConversationId) {
      // Skip refetching if this conversation was just initialized by our local streaming flow
      justCreatedConvIdRef.current = null;
      return;
    }

    if (activeConversationId) {
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  }

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setAvailableDocuments(data.documents || []);
      }
    } catch (e) {
      console.error("Failed to load documents:", e);
    }
  }

  async function fetchMessages(convId: string) {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.conversation?.teachingMode) {
          setCurrentMode(data.conversation.teachingMode as ResponseMode);
        }
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  }

  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    try {
      await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPinned: !currentPin }),
      });
      fetchConversations();
    } catch (e) {
      console.error("Failed to toggle pin:", e);
    }
  };

  const handleToggleDocument = (docId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // Main Send Message Handler with strict single-response and idempotency locking
  const handleSendMessage = async (
    text: string,
    attachments?: { type: string; data: string; name: string }[],
    modelOverride?: string,
    isRegeneration = false
  ) => {
    const effectiveText =
      text.trim() ||
      (attachments && attachments.length > 0
        ? "Please analyze this uploaded image in comprehensive detail (extract text, mathematics, code, or visual diagrams and explain/solve step-by-step)."
        : "");

    if (!effectiveText || isStreaming || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsStreaming(true);

    const now = Date.now();
    const requestId = "req-" + now + "-" + Math.random().toString(36).substring(2, 7);

    // If NOT regenerating, add the optimistic user message
    if (!isRegeneration) {
      const tempUserMsg: Message = {
        id: "user-" + now,
        conversationId: activeConversationId || "temp",
        role: "user",
        content: text.trim() || "Uploaded Visual for Analysis",
        attachments,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
    }

    // Add exactly one placeholder for the streaming assistant response
    const tempAssistantId = "ast-" + now;
    setCurrentStreamingId(tempAssistantId);

    const tempAssistantMsg: Message = {
      id: tempAssistantId,
      conversationId: activeConversationId || "temp",
      role: "assistant",
      content: "",
      modelUsed: "EXAM MIND AI",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempAssistantMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          prompt: effectiveText,
          mode: currentMode,
          model: modelOverride && modelOverride !== "auto" ? modelOverride : undefined,
          documentIds: selectedDocumentIds,
          regenerate: isRegeneration,
          requestId,
          attachments,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat API request failed with status ${response.status}`);
      }

      const returnedConvId = response.headers.get("X-Conversation-Id");
      if (returnedConvId && returnedConvId !== activeConversationId) {
        justCreatedConvIdRef.current = returnedConvId;
        setActiveConversationId(returnedConvId);
        fetchConversations();
      }

      const rawCitations = response.headers.get("X-Citations");
      let parsedCitations = [];
      if (rawCitations) {
        try {
          parsedCitations = JSON.parse(decodeURIComponent(rawCitations));
        } catch {
          // ignore parsing error
        }
      }

      const returnedModelUsed = response.headers.get("X-Model-Used") || "EXAM MIND AI";
      const returnedVerification = response.headers.get("X-Verification-Status");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedContent = "";

      if (reader) {
        let lastRenderTime = 0;
        let pendingFrameId: number | null = null;

        const updateUi = (content: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantId
                ? {
                    ...msg,
                    content,
                    modelUsed: returnedModelUsed,
                    citations: parsedCitations.length > 0 ? parsedCitations : undefined,
                    verificationBadge: returnedVerification || undefined,
                  }
                : msg
            )
          );
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          streamedContent += chunk;

          const now = Date.now();
          if (now - lastRenderTime > 35) {
            lastRenderTime = now;
            updateUi(streamedContent);
          } else if (!pendingFrameId) {
            pendingFrameId = requestAnimationFrame(() => {
              pendingFrameId = null;
              lastRenderTime = Date.now();
              updateUi(streamedContent);
            });
          }
        }

        if (pendingFrameId) cancelAnimationFrame(pendingFrameId);
        updateUi(streamedContent);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Streaming error:", err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    "An error occurred while connecting to the inference engine. Please check model connectivity in Admin settings.",
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setCurrentStreamingId(null);
      isSubmittingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  // Regeneration: Replaces the existing assistant response without duplicating user message
  const handleRegenerate = (assistantMsgId: string) => {
    if (isStreaming || isSubmittingRef.current) return;

    const assistantIdx = messages.findIndex((m) => m.id === assistantMsgId);
    if (assistantIdx === -1) return;

    // Find previous user message
    const priorUser = messages
      .slice(0, assistantIdx)
      .reverse()
      .find((m) => m.role === "user");

    if (!priorUser) return;

    // Remove the assistant message from state
    setMessages((prev) => prev.filter((_, idx) => idx !== assistantIdx));

    // Re-issue with regenerate flag
    handleSendMessage(priorUser.content, undefined, undefined, true);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setCurrentStreamingId(null);
      isSubmittingRef.current = false;
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const text = messages
      .map(
        (m) =>
          `[${m.role.toUpperCase()}] (${new Date(m.createdAt).toLocaleTimeString()}):\n${
            m.content
          }\n\n`
      )
      .join("---\n\n");

    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam-mind-session-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] bg-white overflow-hidden text-zinc-900">
      <Navbar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Desktop persistent + Mobile overlay) */}
        <ChatSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={(id) => {
            setActiveConversationId(id);
            setMobileSidebarOpen(false);
          }}
          onNewChat={handleNewChat}
          onDelete={handleDeleteConversation}
          onTogglePin={handleTogglePin}
          selectedMode={currentMode}
          onSelectMode={(m) => setCurrentMode(m as ResponseMode)}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Conversation Canvas (Light Pure White) */}
        <main className="flex-1 flex flex-col bg-white relative overflow-hidden w-full min-w-0">
          {/* Subtle Ambient Illumination */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] chatgpt-ambient-glow pointer-events-none" />

          {/* Mobile Top Bar */}
          <div className="flex md:hidden items-center justify-between px-3 py-2 border-b border-zinc-200 bg-white/95 backdrop-blur-xl z-20 text-xs gap-1.5">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 font-medium active:scale-95 transition-all text-xs flex-shrink-0"
              aria-label="Open chats list"
            >
              <PanelLeft className="w-3.5 h-3.5 text-[#10a37f]" />
              <span className="hidden min-[360px]:inline">Chats</span>
              {conversations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 font-mono text-[10px] border border-emerald-200 font-medium">
                  {conversations.length}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 truncate font-medium">
                <Globe className="w-3 h-3 text-[#10a37f] flex-shrink-0" />
                <span className="truncate">Deep Search</span>
              </span>

              {messages.length > 0 && (
                <button
                  onClick={handleExportChat}
                  className="p-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-900 flex-shrink-0 active:scale-95 transition-colors"
                  title="Export"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleNewChat}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white flex-shrink-0 active:scale-95 transition-colors shadow-xs"
                title="New chat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Desktop Top Bar for active session */}
          {messages.length > 0 && (
            <div className="hidden md:flex items-center justify-between px-6 py-2 border-b border-zinc-200 bg-white/80 backdrop-blur-xl z-10 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-zinc-900 truncate max-w-sm">
                  {conversations.find((c) => c.id === activeConversationId)?.title ||
                    "Current Session"}
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                  <Globe className="w-3 h-3 text-[#10a37f]" />
                  <span>Deep Search Active</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border border-zinc-200 transition-colors font-medium shadow-2xs"
                  title="Export Markdown transcript"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border border-zinc-200 transition-colors font-medium shadow-2xs"
                  title="Clear chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </div>
            </div>
          )}

          {/* Conversation Stream or Welcome Screen */}
          <div className="flex-1 overflow-y-auto bg-white">
            {messages.length === 0 ? (
              <WelcomeScreen
                onSelectPrompt={(p) => {
                  handleSendMessage(p);
                }}
              />
            ) : (
              <div className="divide-y divide-zinc-100">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && msg.id === currentStreamingId}
                    mode={currentMode}
                    onRegenerate={() => handleRegenerate(msg.id)}
                    onFollowUpClick={(q) => handleSendMessage(q)}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Composer Input Area */}
          <ChatComposer
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            onStop={handleStopStreaming}
            currentMode={currentMode}
            onSelectMode={(m) => setCurrentMode(m)}
            availableDocuments={availableDocuments}
            selectedDocumentIds={selectedDocumentIds}
            onToggleDocument={handleToggleDocument}
            onDocumentUploaded={(doc) => setAvailableDocuments((prev) => [doc, ...prev])}
          />
        </main>
      </div>
    </div>
  );
}
