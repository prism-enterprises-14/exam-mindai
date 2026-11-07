"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import {
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  ChevronRight,
  Download,
  AlertCircle
} from "lucide-react";
import { Quiz, QuizAttempt, Document } from "@/lib/database/db";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [attemptResult, setAttemptResult] = useState<QuizAttempt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Form states
  const [subject, setSubject] = useState("Computer Science");
  const [topic, setTopic] = useState("Algorithms & Complexity");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Olympiad">("Medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [availableDocs, setAvailableDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");

  useEffect(() => {
    fetchQuizzes();
    fetchDocuments();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || attemptResult) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, attemptResult]);

  // Handle auto-submit when timer expires
  useEffect(() => {
    if (timeLeft === 0 && !attemptResult && !isSubmitting && activeQuiz) {
      handleSubmitQuiz();
    }
  }, [timeLeft, attemptResult, isSubmitting, activeQuiz]);

  async function fetchQuizzes() {
    try {
      const res = await fetch("/api/quizzes");
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setAvailableDocs(data.documents || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setAttemptResult(null);

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic,
          difficulty,
          questionCount,
          sourceDocumentId: selectedDocId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveQuiz(data.quiz);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setTimeLeft((data.quiz.timeLimitMinutes || 10) * 60);
        fetchQuizzes();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    if (attemptResult) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const timeTaken = (activeQuiz.timeLimitMinutes * 60) - (timeLeft || 0);
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          quizId: activeQuiz.id,
          userAnswers: selectedAnswers,
          timeTakenSeconds: Math.max(15, timeTaken),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAttemptResult(data.attempt);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleRetake = () => {
    setAttemptResult(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    if (activeQuiz) {
      setTimeLeft(activeQuiz.timeLimitMinutes * 60);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Academic Examination & Quiz Generator
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Generate rigorous conceptual examinations, multiple-choice questions, and mathematical challenges grounded in curriculum or uploaded textbooks.
            </p>
          </div>
        </div>

        {/* If Active Quiz is taking place */}
        {activeQuiz ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-xl p-6 md:p-8 space-y-6 shadow-2xl">
            {/* Quiz Progress & Timer Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{activeQuiz.title}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Difficulty: <strong className="text-cyan-400">{activeQuiz.difficulty}</strong></span>
                  <span>•</span>
                  <span>Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</span>
                </div>
              </div>

              {/* Countdown Clock */}
              {timeLeft !== null && !attemptResult && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-sm font-semibold ${
                  timeLeft < 60 ? "bg-rose-950/60 border-rose-500/40 text-rose-400 animate-pulse" : "bg-slate-900 border-white/10 text-cyan-400"
                }`}>
                  <Clock className="w-4 h-4" />
                  <span>{formatTimer(timeLeft)}</span>
                </div>
              )}
            </div>

            {/* Results Screen if Attempt Completed */}
            {attemptResult ? (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900/40 border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      <Award className="w-4 h-4" />
                      <span>Assessment Complete</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      Score: {attemptResult.score} / {attemptResult.maxScore} (
                      {attemptResult.analysis?.masteryPercentage}%)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Completed in {Math.floor(attemptResult.timeTakenSeconds / 60)}m {attemptResult.timeTakenSeconds % 60}s
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRetake}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Quiz</span>
                    </button>
                    <button
                      onClick={() => setActiveQuiz(null)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all"
                    >
                      Create Another Quiz
                    </button>
                  </div>
                </div>

                {/* Diagnostic Insights */}
                {attemptResult.analysis && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 space-y-2">
                      <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Demonstrated Concept Mastery</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300">
                        {attemptResult.analysis.strongTopics.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/20 space-y-2">
                      <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>Identified Weak Concepts & Recommendations</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300">
                        {attemptResult.analysis.weakTopics.length > 0 ? (
                          attemptResult.analysis.weakTopics.map((wt, i) => <li key={i}>Review: {wt}</li>)
                        ) : (
                          <li>None! Full subject comprehension demonstrated.</li>
                        )}
                        {attemptResult.analysis.recommendations.map((rec, i) => (
                          <li key={i} className="text-cyan-300">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Full Question Review */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h4 className="font-semibold text-sm text-white">Detailed Answer Explanations:</h4>
                  {activeQuiz.questions.map((q, idx) => {
                    const ans = attemptResult.answers.find((a) => a.questionId === q.id);
                    const isCorrect = ans?.isCorrect;
                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          isCorrect ? "bg-emerald-950/20 border-emerald-500/30" : "bg-rose-950/20 border-rose-500/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">Question {idx + 1}:</span>
                          <span className={isCorrect ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                            {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                          </span>
                        </div>
                        <MarkdownRenderer content={q.question} />
                        <div className="text-slate-300">
                          Your Answer: <strong className="text-white">{ans?.userAnswer || "None"}</strong>
                        </div>
                        {!isCorrect && (
                          <div className="text-cyan-400">
                            Correct Answer: <strong>{q.correctAnswer}</strong>
                          </div>
                        )}
                        <div className="pt-2 text-slate-400 italic border-t border-white/5">
                          Rationale: {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Active Question View */
              <div className="space-y-6">
                {/* Question Text */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
                  <div className="text-xs uppercase font-mono tracking-wider text-cyan-400 font-semibold">
                    Question {currentQuestionIndex + 1}
                  </div>
                  <MarkdownRenderer content={activeQuiz.questions[currentQuestionIndex].question} />
                </div>

                {/* Options List */}
                <div className="space-y-3">
                  {activeQuiz.questions[currentQuestionIndex].options?.map((opt, i) => {
                    const qId = activeQuiz.questions[currentQuestionIndex].id;
                    const isSelected = selectedAnswers[qId] === opt;
                    return (
                      <div
                        key={i}
                        onClick={() => handleSelectOption(qId, opt)}
                        className={`p-4 rounded-xl border cursor-pointer text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-600/30 border-cyan-400 text-white font-medium shadow-md shadow-blue-500/20"
                            : "bg-slate-900/40 border-white/5 hover:border-white/20 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px] ${
                            isSelected ? "border-cyan-400 bg-cyan-400 text-black font-bold" : "border-slate-600"
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-semibold text-slate-300"
                  >
                    Previous
                  </button>

                  {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-600/20"
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30"
                    >
                      {isSubmitting ? "Scoring Assessment..." : "Submit Examination"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Quiz Generator Form & History */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-slate-950/70 p-6 space-y-5 h-fit">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Configure New Assessment</span>
              </h2>

              <form onSubmit={handleGenerateQuiz} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Subject Discipline</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Specific Academic Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Difficulty Level</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Easy", "Medium", "Hard", "Olympiad"] as const).map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                          difficulty === d
                            ? "bg-blue-600/30 border-cyan-400 text-cyan-300"
                            : "bg-slate-900 border-white/5 text-slate-400 hover:bg-white/5"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Number of Questions</label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={3}>3 Questions (Quick Sprint)</option>
                    <option value={5}>5 Questions (Standard Practice)</option>
                    <option value={10}>10 Questions (Comprehensive Exam)</option>
                  </select>
                </div>

                {availableDocs.length > 0 && (
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Ground in Uploaded Textbook</label>
                    <select
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">General Academic Knowledge</option>
                      {availableDocs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-40 transition-all"
                >
                  {generating ? "Generating Exam Questions..." : "Create & Start Quiz"}
                </button>
              </form>
            </div>

            {/* Saved Quizzes History */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-base font-semibold text-white">Previous Examinations</h2>
              {quizzes.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-slate-950/30 text-slate-400 space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium">No previous quizzes yet.</p>
                  <p className="text-xs text-slate-500">Configure your first examination using the form on the left.</p>
                </div>
              ) : (
                quizzes.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-white/10 bg-slate-950/60 hover:border-blue-500/30 transition-all flex items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-semibold text-sm text-white">{q.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>{q.subject}</span>
                        <span>•</span>
                        <span>{q.questions.length} Questions</span>
                        <span>•</span>
                        <span>Time Limit: {q.timeLimitMinutes}m</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveQuiz(q);
                        setCurrentQuestionIndex(0);
                        setSelectedAnswers({});
                        setTimeLeft(q.timeLimitMinutes * 60);
                        setAttemptResult(null);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all"
                    >
                      <span>Take Quiz</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
