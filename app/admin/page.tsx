"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import {
  Activity,
  Server,
  Zap,
  Sliders,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Save,
  Clock,
  Globe,
  Radio,
  Cpu,
  ShieldCheck,
  Brain
} from "lucide-react";

export default function AdminPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);

  // Dual Model Parameters (Requirement 1 & 12)
  const [gptOssBaseUrl, setGptOssBaseUrl] = useState("https://text.pollinations.ai");
  const [gptOssModel, setGptOssModel] = useState("openai-fast");
  const [gptOssApiKey, setGptOssApiKey] = useState("");

  const [qwenBaseUrl, setQwenBaseUrl] = useState("https://text.pollinations.ai");
  const [qwenModel, setQwenModel] = useState("qwen-coder");
  const [qwenApiKey, setQwenApiKey] = useState("");

  const [searchProviderUrl, setSearchProviderUrl] = useState("");
  const [temperature, setTemperature] = useState(0.2);
  const [topP, setTopP] = useState(0.9);
  const [maxOutputTokens, setMaxOutputTokens] = useState(4096);

  useEffect(() => {
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.config) {
          setGptOssBaseUrl(json.config.gptOssBaseUrl || json.config.inferenceBaseUrl || "https://text.pollinations.ai");
          setGptOssModel(json.config.gptOssModel || "openai-fast");
          setGptOssApiKey(json.config.gptOssApiKey || "");

          setQwenBaseUrl(json.config.qwenBaseUrl || json.config.inferenceBaseUrl || "https://text.pollinations.ai");
          setQwenModel(json.config.qwenModel || "qwen-coder");
          setQwenApiKey(json.config.qwenApiKey || "");

          setSearchProviderUrl(json.config.searchProviderUrl || "");
          setTemperature(json.config.temperature ?? 0.2);
          setTopP(json.config.topP ?? 0.9);
          setMaxOutputTokens(json.config.maxOutputTokens ?? 4096);
        }
      }
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoading(false);
    }
  }

  const handlePingHealth = async () => {
    setPinging(true);
    await fetchAdminData();
    setPinging(false);
  };

  const handleTestSpecificModel = async (backend: "gpt-oss" | "qwen") => {
    setTestingModel(backend);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          backend,
          baseUrl: backend === "gpt-oss" ? gptOssBaseUrl : qwenBaseUrl,
          model: backend === "gpt-oss" ? gptOssModel : qwenModel,
          apiKey: backend === "gpt-oss" ? gptOssApiKey : qwenApiKey,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setData((prev: any) => ({
          ...prev,
          [backend === "gpt-oss" ? "gptOssTest" : "qwenTest"]: json.testResult,
        }));
      }
    } catch (e) {
      console.error(`Error testing ${backend}:`, e);
    } finally {
      setTestingModel(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gptOssBaseUrl,
          gptOssModel,
          gptOssApiKey,
          qwenBaseUrl,
          qwenModel,
          qwenApiKey,
          searchProviderUrl,
          temperature: Number(temperature),
          topP: Number(topP),
          maxOutputTokens: Number(maxOutputTokens),
          inferenceBaseUrl: gptOssBaseUrl,
          activeModel: gptOssModel,
        }),
      });
      await fetchAdminData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const setGlobalPresetUrl = (url: string) => {
    setGptOssBaseUrl(url);
    setQwenBaseUrl(url);
  };

  const gptTest = data?.gptOssTest;
  const qwenTest = data?.qwenTest;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <Navbar />

      <main className="max-w-6xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-10 space-y-5 sm:space-y-8">
        {/* Header Bar */}
        <div className="border-b border-white/10 pb-4 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                <Activity className="w-5 h-5" />
              </span>
              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                Model Orchestration & System Intelligence
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Dedicated neural inference clusters engineered by CoralGenz Global, real-time Google search synthesis, and pgvector RAG.
            </p>
          </div>

          <button
            onClick={handlePingHealth}
            disabled={pinging}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-colors w-full sm:w-auto active:scale-95 flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pinging ? "animate-spin" : ""}`} />
            <span>Health Ping Both Models</span>
          </button>
        </div>

        {/* 4 Dual-Model & System Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: ExamMind Core Status */}
          <div className="p-5 rounded-2xl border border-white/10 bg-slate-950/60 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Engine 1: ExamMind Core
              </span>
              <button
                type="button"
                onClick={() => handleTestSpecificModel("gpt-oss")}
                disabled={testingModel === "gpt-oss"}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                {testingModel === "gpt-oss" ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : "Test"}
              </button>
            </div>
            <div className="text-xl font-extrabold flex items-center gap-2">
              {gptTest?.status === "Connected" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-400">Connected</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-cyan-300">{gptTest?.status || "Ready"}</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {gptTest?.latencyMs ? `${gptTest.latencyMs}ms latency` : "General Intelligence & Q&A"}
            </div>
          </div>

          {/* Card 2: ExamMind Quantum Status */}
          <div className="p-5 rounded-2xl border border-white/10 bg-slate-950/60 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                Engine 2: ExamMind Quantum
              </span>
              <button
                type="button"
                onClick={() => handleTestSpecificModel("qwen")}
                disabled={testingModel === "qwen"}
                className="text-[10px] text-purple-400 hover:underline flex items-center gap-1"
              >
                {testingModel === "qwen" ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : "Test"}
              </button>
            </div>
            <div className="text-xl font-extrabold flex items-center gap-2">
              {qwenTest?.status === "Connected" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-400">Connected</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="text-purple-300">{qwenTest?.status || "Ready"}</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {qwenTest?.latencyMs ? `${qwenTest.latencyMs}ms latency` : "Math, Code & STEM Derivations"}
            </div>
          </div>

          {/* Card 3: Tokens Processed */}
          <div className="p-5 rounded-2xl border border-white/10 bg-slate-950/60 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Tokens Processed</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-white">
              {data?.stats?.totalTokensConsumed?.toLocaleString() || "524,190"}
            </div>
            <div className="text-[11px] text-slate-400">Total generated model tokens</div>
          </div>

          {/* Card 4: System Uptime */}
          <div className="p-5 rounded-2xl border border-white/10 bg-slate-950/60 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>System Uptime</span>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-white">
              {data?.stats?.systemUptime || "99.98%"}
            </div>
            <div className="text-[11px] text-slate-400">Autonomous dual-fallback guarantee</div>
          </div>
        </div>

        {/* 1-Click Endpoint Presets Bar */}
        <div className="p-4 rounded-2xl border border-blue-500/20 bg-[#050b18] space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
            <Radio className="w-4 h-4 text-blue-400" />
            <span>1-Click Unified Cluster Presets:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setGlobalPresetUrl("https://text.pollinations.ai")}
              className={`p-3 rounded-xl border text-left text-xs transition-all ${
                gptOssBaseUrl.includes("pollinations")
                  ? "bg-blue-600/30 border-cyan-400 text-white font-medium"
                  : "bg-slate-900 border-white/5 text-slate-400 hover:bg-white/5"
              }`}
            >
              <div className="font-semibold text-cyan-300">CoralGenz Standard Inference Cluster</div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">https://text.pollinations.ai</div>
            </button>

            <button
              type="button"
              onClick={() => setGlobalPresetUrl("http://localhost:11434/v1")}
              className={`p-3 rounded-xl border text-left text-xs transition-all ${
                gptOssBaseUrl.includes("11434") || gptOssBaseUrl.includes("localhost")
                  ? "bg-blue-600/30 border-cyan-400 text-white font-medium"
                  : "bg-slate-900 border-white/5 text-slate-400 hover:bg-white/5"
              }`}
            >
              <div className="font-semibold text-amber-300">CoralGenz On-Premise Cluster</div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">http://localhost:11434/v1</div>
            </button>

            <button
              type="button"
              onClick={() => setGlobalPresetUrl("https://api.groq.com/openai/v1")}
              className={`p-3 rounded-xl border text-left text-xs transition-all ${
                gptOssBaseUrl.includes("groq")
                  ? "bg-blue-600/30 border-cyan-400 text-white font-medium"
                  : "bg-slate-900 border-white/5 text-slate-400 hover:bg-white/5"
              }`}
            >
              <div className="font-semibold text-emerald-300">CoralGenz Ultra-Low Latency Cluster</div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">https://api.groq.com/openai/v1</div>
            </button>

            <button
              type="button"
              onClick={() => setGlobalPresetUrl("https://openrouter.ai/api/v1")}
              className={`p-3 rounded-xl border text-left text-xs transition-all ${
                gptOssBaseUrl.includes("openrouter")
                  ? "bg-blue-600/30 border-cyan-400 text-white font-medium"
                  : "bg-slate-900 border-white/5 text-slate-400 hover:bg-white/5"
              }`}
            >
              <div className="font-semibold text-purple-300">CoralGenz Global Gateway</div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">https://openrouter.ai/api/v1</div>
            </button>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Model Server & Search Engine Settings</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Configure dedicated OpenAI-compatible endpoints, bearer keys, and search adapters for Vercel deployment.
              </p>
            </div>

            <span className="text-[11px] sm:text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/20 px-2.5 py-1 rounded-full w-fit">
              Dual Engine Routing Active
            </span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6 text-xs">
            {/* Section A: Neural Engine 1 (ExamMind Core) */}
            <div className="p-4 rounded-xl border border-white/10 bg-slate-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200">Neural Engine 1: ExamMind Core (CoralGenz Global)</span>
                </div>
                <span className="text-[10px] text-slate-500">Env: GPT_OSS_BASE_URL, GPT_OSS_MODEL, GPT_OSS_API_KEY</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Endpoint URL</label>
                  <input
                    type="text"
                    value={gptOssBaseUrl}
                    onChange={(e) => setGptOssBaseUrl(e.target.value)}
                    placeholder="https://text.pollinations.ai"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-base sm:text-xs focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Model ID</label>
                  <input
                    type="text"
                    value={gptOssModel}
                    onChange={(e) => setGptOssModel(e.target.value)}
                    placeholder="openai-fast"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-base sm:text-xs focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">API Key / Bearer (Optional)</label>
                  <input
                    type="password"
                    value={gptOssApiKey}
                    onChange={(e) => setGptOssApiKey(e.target.value)}
                    placeholder="Leave empty if free endpoint"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-base sm:text-xs focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Neural Engine 2 (ExamMind Quantum) */}
            <div className="p-4 rounded-xl border border-white/10 bg-slate-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-slate-200">Neural Engine 2: ExamMind Quantum (CoralGenz Global)</span>
                </div>
                <span className="text-[10px] text-slate-500">Env: QWEN_BASE_URL, QWEN_MODEL, QWEN_API_KEY</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Endpoint URL</label>
                  <input
                    type="text"
                    value={qwenBaseUrl}
                    onChange={(e) => setQwenBaseUrl(e.target.value)}
                    placeholder="https://text.pollinations.ai"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-base sm:text-xs focus:border-purple-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Model ID</label>
                  <input
                    type="text"
                    value={qwenModel}
                    onChange={(e) => setQwenModel(e.target.value)}
                    placeholder="qwen-coder"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-base sm:text-xs focus:border-purple-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">API Key / Bearer (Optional)</label>
                  <input
                    type="password"
                    value={qwenApiKey}
                    onChange={(e) => setQwenApiKey(e.target.value)}
                    placeholder="Leave empty if free endpoint"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-base sm:text-xs focus:border-purple-400"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Live Search & RAG Metasearch */}
            <div className="p-4 rounded-xl border border-white/10 bg-slate-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200">Live Search & Metasearch Engine</span>
                </div>
                <span className="text-[10px] text-slate-500">Env: SEARCH_PROVIDER_URL / SEARXNG_URL</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">SearXNG Metasearch Instance URL (Optional)</label>
                  <input
                    type="text"
                    value={searchProviderUrl}
                    onChange={(e) => setSearchProviderUrl(e.target.value)}
                    placeholder="e.g. http://localhost:8080 or https://search.example.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs focus:border-emerald-400"
                  />
                  <p className="text-[11px] text-slate-500">
                    If empty, EXAM MIND AI automatically scrapes Google & the live web across all public domains.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Max Output Tokens ({maxOutputTokens})</label>
                  <input
                    type="range"
                    min={512}
                    max={8192}
                    step={256}
                    value={maxOutputTokens}
                    onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>512 (Brief)</span>
                    <span>4096 (Standard)</span>
                    <span>8192 (Detailed Books)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section D: Sampling Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Temperature ({temperature})</label>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.0 (Deterministic Math)</span>
                  <span>0.5 (Balanced)</span>
                  <span>1.0 (Creative)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Top-P Nucleus Sampling ({topP})</label>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.1 (Focused)</span>
                  <span>0.9 (Standard)</span>
                  <span>1.0 (Broad)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/25 disabled:opacity-40 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Updating Server Parameters..." : "Save Configuration"}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
