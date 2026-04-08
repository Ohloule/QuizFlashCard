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
        <p className="text-ds-muted">Chargement des statistiques...</p>
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
          <h1 className="text-3xl font-bold text-ds-accent">Statistiques</h1>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-ds-surface hover:bg-ds-border text-ds-text text-sm font-medium transition-colors"
          >
            Retour
          </Link>
        </div>

        {/* Global stats */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-ds-dark rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{totals.totalQuestions}</p>
              <p className="text-ds-muted text-xs mt-0.5">Questions</p>
            </div>
            <div className="bg-ds-dark rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{totals.totalAnswered}</p>
              <p className="text-ds-muted text-xs mt-0.5">Reponses</p>
            </div>
            <div className="bg-ds-dark rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-ds-success-light">
                {globalRate !== null ? `${globalRate}%` : "\u2014"}
              </p>
              <p className="text-ds-muted text-xs mt-0.5">Reussite</p>
            </div>
            <div className="bg-ds-dark rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-ds-accent">
                {globalCashRate !== null ? `${globalCashRate}%` : "\u2014"}
              </p>
              <p className="text-ds-muted text-xs mt-0.5">Cash</p>
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
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                sortBy === key
                  ? "bg-ds-accent text-white"
                  : "bg-ds-surface text-ds-text hover:bg-ds-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Questions list */}
        <div className="flex flex-col gap-2.5">
          {sorted.map((q) => (
            <div key={q.id} className="bg-ds-dark rounded-2xl p-4">
              <p className="font-medium mb-2 text-sm leading-relaxed">
                {q.question}
              </p>
              <div className="flex gap-4 text-xs text-ds-muted">
                <span>
                  Repondue{" "}
                  <span className="text-ds-text font-medium">{q.answered}x</span>
                </span>
                <span>
                  Reussite{" "}
                  <span
                    className={`font-medium ${
                      q.successRate !== null
                        ? q.successRate >= 70
                          ? "text-ds-success-light"
                          : q.successRate >= 40
                          ? "text-ds-accent"
                          : "text-ds-danger-light"
                        : "text-ds-muted"
                    }`}
                  >
                    {q.successRate !== null ? `${q.successRate}%` : "\u2014"}
                  </span>
                </span>
                <span>
                  Cash{" "}
                  <span className="text-ds-accent font-medium">
                    {q.cashGoodAnswer}/{q.answered || 0}
                  </span>
                </span>
              </div>
              {q.answered > 0 && (
                <div className="mt-2.5 h-1 bg-ds-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ds-success rounded-full transition-all"
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
