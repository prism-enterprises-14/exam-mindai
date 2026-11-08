"use client";

import React from "react";
import {
  Sparkles,
  Globe,
  ArrowRight,
  Calculator,
  Code2,
  Database
} from "lucide-react";
import type { ResponseMode } from "@/lib/ai/prompts";

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string, mode?: ResponseMode) => void;
  currentMode?: ResponseMode;
  onSelectMode?: (mode: ResponseMode) => void;
}

export function WelcomeScreen({
  onSelectPrompt,
}: WelcomeScreenProps) {
  const suggestedCards = [
    {
      title: "Company Profile",
      desc: "What does the supplied profile say about unumancorps and its founder?",
      prompt: "What does the supplied profile say about unumancorps and its founder Darshan G.?",
      icon: Sparkles,
      mode: "DEEP_SEARCH" as ResponseMode,
      color: "from-blue-500/20 to-indigo-500/10",
      accent: "text-blue-400",
      badge: "CoralGenz Global",
    },
    {
      title: "Direct Answer & Fact Search",
      desc: "Who is the Chief Minister of Tamil Nadu? (Verified live data as of today)",
      prompt: "Who is the Chief Minister of Tamil Nadu?",
      icon: Globe,
      mode: "DEEP_SEARCH" as ResponseMode,
      color: "from-blue-500/20 to-cyan-500/10",
      accent: "text-cyan-400",
      badge: "Deep Search",
    },
    {
      title: "Step-by-Step Differentiation",
      desc: "Differentiate x^3 + 5x^2 + 2x with verified symbolic steps.",
      prompt: "Differentiate x^3 + 5x^2 + 2x with respect to x.",
      icon: Calculator,
      mode: "DEEP_SEARCH" as ResponseMode,
      color: "from-cyan-500/20 to-blue-500/10",
      accent: "text-cyan-400",
      badge: "Deep Search",
    },
    {
      title: "Lagrange's Mean Value Theorem",
      desc: "Exhaustive conditions, mathematical proof, geometric intuition & worked example.",
      prompt: "Explain and solve Lagrange's Mean Value Theorem with conditions and a solved example.",
      icon: Calculator,
      mode: "DEEP_SEARCH" as ResponseMode,
      color: "from-purple-500/20 to-indigo-500/10",
      accent: "text-purple-400",
      badge: "Deep Search",
    },
    {
      title: "Optimal Java Prime Checker",
      desc: "Executable Java program with O(sqrt(n)) complexity proof and boundary validation.",
      prompt: "Write a Java program to check whether a number is prime, with explanation and complexity.",
      icon: Code2,
      mode: "DEEP_SEARCH" as ResponseMode,
      color: "from-emerald-500/20 to-cyan-500/10",
      accent: "text-emerald-400",
      badge: "Deep Search",
    },
    {
      title: "Database Normalization (1NF to 3NF)",
      desc: "Deep-dive with real-world schemas, functional dependencies, and anomalies.",
      prompt: "Explain database normalization (1NF, 2NF, 3NF) with practical examples.",
      icon: Database,
      mode: "DEEP_SEARCH" as ResponseMode,
      color: "from-blue-500/20 to-cyan-500/10",
      accent: "text-cyan-400",
      badge: "Deep Search",
    },
    {
      title: "Live Web & Scientific Research",
      desc: "Who won the Nobel prize in Physics in 2024? (Multi-source research dossier)",
      prompt: "Who won the Nobel prize in Physics in 2024?",
      icon: Globe,
      mode: "DEEP_SEARCH" as ResponseMode,
      color: "from-indigo-500/20 to-blue-500/10",
      accent: "text-indigo-400",
      badge: "Deep Search",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-6 sm:py-12 flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[75vh]">
      <div className="max-w-3xl w-full space-y-6 sm:space-y-8 text-center">
        {/* ChatGPT Style Brand Emblem & Headline (Light Mode) */}
        <div className="space-y-3 sm:space-y-4 flex flex-col items-center">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-md border border-zinc-200 p-0.5 bg-white group hover:border-emerald-500/50 transition-all">
            <img
              src="/logo.png"
              alt="EXAM MIND AI Logo"
              className="w-full h-full object-cover rounded-[14px]"
            />
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-zinc-900 tracking-tight">
            What can I help with today?
          </h1>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">ExamMind AI • Engineered by CoralGenz Global</span>
          </div>
        </div>

        {/* Suggested Queries Grid - Clean ChatGPT Light Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5 pt-2 text-left">
          {suggestedCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => onSelectPrompt(card.prompt, card.mode)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectPrompt(card.prompt, card.mode);
                  }
                }}
                className="group p-3.5 sm:p-4 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50/80 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 backdrop-blur-xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-2.5 shadow-2xs hover:shadow-sm active:scale-[0.98]"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0 text-zinc-700 group-hover:text-emerald-700 group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 font-medium">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm text-zinc-900 group-hover:text-emerald-800 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[10px] sm:text-[11px] font-medium text-zinc-400 group-hover:text-emerald-700 transition-colors">
                  <span>Ask ExamMind</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
