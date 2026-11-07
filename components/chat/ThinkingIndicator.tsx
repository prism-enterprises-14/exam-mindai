"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Globe, Search, BookOpen, Check } from "lucide-react";
import { ResponseMode } from "@/lib/ai/prompts";

interface ThinkingIndicatorProps {
  mode?: ResponseMode;
  hasTextbookGrounding?: boolean;
}

const SEARCH_STEPS = [
  { label: "Analyzing query", icon: Search },
  { label: "Searching live web & sources", icon: Globe },
  { label: "Synthesizing answer", icon: Sparkles },
];

export function ThinkingIndicator({ mode }: ThinkingIndicatorProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < SEARCH_STEPS.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-2xl my-2 p-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 shadow-2xs backdrop-blur-sm transition-all animate-fadeIn">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Animated Status Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-white border border-emerald-200 text-emerald-600 shadow-2xs flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#10a37f]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
              <span>{SEARCH_STEPS[currentStep].label}</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-emerald-600 animate-bounce" />
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
              ExamMind AI is gathering facts and preparing a verified response
            </p>
          </div>
        </div>

        {/* Right: Step Badges */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {SEARCH_STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <span
                key={step.label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  isDone
                    ? "bg-emerald-100/80 text-emerald-800 border border-emerald-200"
                    : isCurrent
                    ? "bg-white text-zinc-900 border border-zinc-300 shadow-2xs"
                    : "bg-transparent text-zinc-400"
                }`}
              >
                {isDone ? (
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? "bg-emerald-600 animate-pulse" : "bg-zinc-300"}`} />
                )}
                <span>{step.label}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Subtle Progress Bar */}
      <div className="mt-2.5 w-full h-1 bg-zinc-200/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / SEARCH_STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
