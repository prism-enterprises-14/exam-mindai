import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">Loading ExamMind AI...</span>
      </div>
    </div>
  );
}

