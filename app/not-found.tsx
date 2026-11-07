import React from "react";
import Link from "next/link";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Search className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">404 - Page Not Found</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            The page or resource you requested could not be located on ExamMind AI.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#10a37f] hover:bg-[#0e8e6e] text-white font-medium text-sm transition-all shadow-md active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

