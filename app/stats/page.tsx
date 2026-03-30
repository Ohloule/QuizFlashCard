"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface QuestionStat {
  id: number;
  question: string;
  answered: number;
  goodAnswer: number;
  cashGoodAnswer: number;
  successRate: number | null;
  cashSuccessRate: number | null;
}

interface Totals {
  totalQuestions: number;
  totalAnswered: number;
  totalGoodAnswers: number;
  totalCashGoodAnswers: number;
}

export default function StatsPage() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [questions, setQuestions] = useState<QuestionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"default" | "worst" | "best" | "most">("default");

  useEffect(() => {
    fetch("/api/questions/stats")
      .then((res) => res.json())
      .then((data) => {
        setTotals(data.totals);
        setQuestions(data.questions);
      })
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...questions].sort((a, b) => {
    if (sortBy === "worst") return (a.successRate ?? 101) - (b.successRate ?? 101);
    if (sortBy === "best") return (b.successRate ?? -1) - (a.successRate ?? -1);
    if (sortBy === "most") return b.answered - a.answered;
    return a.id - b.id;
  });

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <p className="text-slate-400">Chargement des statistiques...</p>
      </main>
    );
  }

  const globalRate =
    totals && totals.totalAnswered > 0
      ? Math.round((totals.totalGoodAnswers / totals.totalAnswered) * 100)
      : null;
  const globalCashRate =
    totals && totals.totalAnswered > 0
      ? Math.round((totals.totalCashGoodAnswers / totals.totalAnswered) * 100)
      : null;

  return (
    <main className="flex-1 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Statistiques</h1>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
          >
            Retour au quiz
          </Link>
        </div>

        {/* Global stats */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{totals.totalQuestions}</p>
              <p className="text-slate-400 text-sm">Questions</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{totals.totalAnswered}</p>
              <p className="text-slate-400 text-sm">Reponses</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">
                {globalRate !== null ? `${globalRate}%` : "—"}
              </p>
              <p className="text-slate-400 text-sm">Reussite globale</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">
                {globalCashRate !== null ? `${globalCashRate}%` : "—"}
              </p>
              <p className="text-slate-400 text-sm">Reussite cash</p>
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            ["default", "Par defaut"],
            ["worst", "Les pires"],
            ["best", "Les meilleures"],
            ["most", "Plus repondues"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors cursor-pointer ${
                sortBy === key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Questions list */}
        <div className="flex flex-col gap-3">
          {sorted.map((q) => (
            <div key={q.id} className="bg-slate-800 rounded-xl p-4">
              <p className="font-medium mb-2 text-sm leading-relaxed">
                {q.question}
              </p>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>
                  Repondue{" "}
                  <span className="text-white font-medium">{q.answered}x</span>
                </span>
                <span>
                  Reussite{" "}
                  <span
                    className={`font-medium ${
                      q.successRate !== null
                        ? q.successRate >= 70
                          ? "text-green-400"
                          : q.successRate >= 40
                          ? "text-amber-400"
                          : "text-red-400"
                        : "text-slate-500"
                    }`}
                  >
                    {q.successRate !== null ? `${q.successRate}%` : "—"}
                  </span>
                </span>
                <span>
                  Cash{" "}
                  <span className="text-amber-400 font-medium">
                    {q.cashGoodAnswer}/{q.answered || 0}
                  </span>
                </span>
              </div>
              {q.answered > 0 && (
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${q.successRate ?? 0}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
