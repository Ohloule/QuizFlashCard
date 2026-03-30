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
        <p className="text-neutral-500">Chargement des statistiques...</p>
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
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Statistiques</h1>
          <Link
            href="/"
            className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-sm font-medium transition-colors"
          >
            Retour
          </Link>
        </div>

        {/* Global stats */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-neutral-200">
              <p className="text-2xl font-bold text-neutral-900">{totals.totalQuestions}</p>
              <p className="text-neutral-500 text-xs mt-0.5">Questions</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-neutral-200">
              <p className="text-2xl font-bold text-neutral-900">{totals.totalAnswered}</p>
              <p className="text-neutral-500 text-xs mt-0.5">Reponses</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-neutral-200">
              <p className="text-2xl font-bold text-emerald-600">
                {globalRate !== null ? `${globalRate}%` : "\u2014"}
              </p>
              <p className="text-neutral-500 text-xs mt-0.5">Reussite</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-neutral-200">
              <p className="text-2xl font-bold text-blue-500">
                {globalCashRate !== null ? `${globalCashRate}%` : "\u2014"}
              </p>
              <p className="text-neutral-500 text-xs mt-0.5">Cash</p>
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
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                sortBy === key
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Questions list */}
        <div className="flex flex-col gap-2.5">
          {sorted.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200">
              <p className="font-medium mb-2 text-sm leading-relaxed text-neutral-800">
                {q.question}
              </p>
              <div className="flex gap-4 text-xs text-neutral-500">
                <span>
                  Repondue{" "}
                  <span className="text-neutral-700 font-medium">{q.answered}x</span>
                </span>
                <span>
                  Reussite{" "}
                  <span
                    className={`font-medium ${
                      q.successRate !== null
                        ? q.successRate >= 70
                          ? "text-emerald-600"
                          : q.successRate >= 40
                          ? "text-amber-500"
                          : "text-red-500"
                        : "text-neutral-400"
                    }`}
                  >
                    {q.successRate !== null ? `${q.successRate}%` : "\u2014"}
                  </span>
                </span>
                <span>
                  Cash{" "}
                  <span className="text-blue-500 font-medium">
                    {q.cashGoodAnswer}/{q.answered || 0}
                  </span>
                </span>
              </div>
              {q.answered > 0 && (
                <div className="mt-2.5 h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
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
