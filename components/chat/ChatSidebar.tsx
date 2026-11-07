"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquarePlus,
  Search,
  Pin,
  Trash2,
  Bookmark,
  X,
  Layers,
  ChevronLeft
} from "lucide-react";
import { Conversation } from "@/lib/database/db";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, currentPin: boolean) => void;
  selectedMode: string;
  onSelectMode: (mode: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onTogglePin,
  selectedMode,
  isOpenMobile = false,
  onCloseMobile,
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinned = filtered.filter((c) => c.isPinned);
  const recent = filtered.filter((c) => !c.isPinned);

  const handleSelectConv = (id: string) => {
    onSelect(id);
    onCloseMobile?.();
  };

  const handleCreateNew = () => {
    onNewChat();
    onCloseMobile?.();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleCreateNew();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat, onCloseMobile]);

  const sidebarContent = (
    <div className="w-full h-full flex flex-col justify-between bg-[#f9f9f9] text-zinc-800">
      {/* Top Header & Actions */}
      <div className="p-3 space-y-2.5">
        {/* Mobile top bar with close button */}
        <div className="flex md:hidden items-center justify-between pb-1.5 border-b border-zinc-200">
          <span className="font-semibold text-xs text-zinc-900">Chats &amp; Discussions</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button (ChatGPT Light Style) */}
        <button
          onClick={handleCreateNew}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 text-xs sm:text-[13px] font-medium shadow-2xs transition-all group"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-50 text-[#10a37f] border border-emerald-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageSquarePlus className="w-3.5 h-3.5" />
            </div>
            <span>New chat</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 border border-zinc-200 rounded px-1.5 py-0.5">⌘K</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-3 scrollbar-thin">
        {/* Pinned section */}
        {pinned.length > 0 && (
          <div className="space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Pin className="w-3 h-3 text-[#10a37f]" />
              <span>Pinned</span>
            </div>
            {pinned.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={() => handleSelectConv(conv.id)}
                onDelete={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                onTogglePin={(e) => {
                  e.stopPropagation();
                  onTogglePin(conv.id, conv.isPinned);
                }}
              />
            ))}
          </div>
        )}

        {/* Recent Section */}
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Bookmark className="w-3 h-3 text-zinc-400" />
            <span>Recent</span>
          </div>

          {recent.length === 0 && pinned.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">
              No conversations yet. Start a new session!
            </div>
          ) : (
            recent.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={() => handleSelectConv(conv.id)}
                onDelete={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                onTogglePin={(e) => {
                  e.stopPropagation();
                  onTogglePin(conv.id, conv.isPinned);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom Info Section */}
      <div className="p-3 pb-safe border-t border-zinc-200 bg-[#f9f9f9] text-xs space-y-1.5">
        <div className="flex items-center justify-between text-zinc-600 px-1">
          <span className="text-[11px]">Intelligence Mode</span>
          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
            {selectedMode.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-500 px-1 text-[10px]">
          <span>Engine Architecture</span>
          <span className="font-mono text-zinc-800 font-medium">CoralGenz Global</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 h-full border-r border-zinc-200 bg-[#f9f9f9]">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-In Overlay Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Body */}
          <aside className="relative w-4/5 max-w-xs h-[100dvh] bg-[#f9f9f9] border-r border-zinc-200 z-10 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 pb-safe">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onTogglePin,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs sm:text-[13px] transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
        isActive
          ? "bg-zinc-200/80 text-zinc-950 font-semibold border border-zinc-300/60"
          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/40"
      }`}
    >
      <div className="truncate pr-2 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-[#10a37f]" : "bg-zinc-300"}`}></span>
        <span className="truncate">{conversation.title}</span>
      </div>

      <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={onTogglePin}
          className="p-1 text-zinc-400 hover:text-[#10a37f] rounded transition-colors"
          title={conversation.isPinned ? "Unpin" : "Pin"}
        >
          <Pin className={`w-3.5 h-3.5 ${conversation.isPinned ? "fill-[#10a37f] text-[#10a37f]" : ""}`} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
          title="Delete chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
