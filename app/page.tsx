"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

interface Question {
  id: number;
  question: string;
  propositions: string[];
  answer: string;
  explanation: string;
  theme: string | null;
  source: string | null;
}

function normalizeAnswer(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function parseInputLines(
  text: string
): { question: string; propositions: string; answer: string; explanation: string }[] {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const parsed = [];
  for (const line of lines) {
    const parts = line.split("::").map((p) => p.trim());
    if (parts.length >= 4) {
      parsed.push({
        question: parts[0],
        propositions: parts[1],
        answer: parts[2],
        explanation: parts[3],
      });
    }
  }
  return parsed;
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [answerMode, setAnswerMode] = useState<"cash" | "trio">("cash");
  const [cashInput, setCashInput] = useState("");
  const [cashChecking, setCashChecking] = useState(false);
  const [cashGivenAnswer, setCashGivenAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0, skipped: 0 });
  const [quizFinished, setQuizFinished] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestionsText, setNewQuestionsText] = useState("");
  const [addingQuestions, setAddingQuestions] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const [showReview, setShowReview] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [reviewItems, setReviewItems] = useState<
    { question: string; propositions: string; answer: string; explanation: string; theme: string; source: string }[]
  >([]);

  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showFilter, setShowFilter] = useState(false);
  const [filterTab, setFilterTab] = useState<"theme" | "source">("theme");
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<{
    type: "theme" | "source";
    values: Set<string>;
  } | null>(null);

  const allThemes = useMemo(
    () => ([...new Set(questions.map((q) => q.theme).filter(Boolean))] as string[]).sort((a, b) => a.localeCompare(b)),
    [questions]
  );
  const allSources = useMemo(
    () => ([...new Set(questions.map((q) => q.source).filter(Boolean))] as string[]).sort((a, b) => a.localeCompare(b)),
    [questions]
  );

  const filteredQuestions = useMemo(() => {
    if (!activeFilter) return questions;
    return questions.filter((q) => {
      const val = activeFilter.type === "theme" ? q.theme : q.source;
      return val != null && activeFilter.values.has(val);
    });
  }, [questions, activeFilter]);

  const fetchQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/questions");
      if (!response.ok) throw new Error("Impossible de charger les questions");
      const data: Question[] = await response.json();
      if (data.length === 0) throw new Error("Aucune question trouvee");
      setQuestions(
        shuffle(data).map((q) => ({ ...q, propositions: shuffle(q.propositions) }))
      );
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsFlipped(false);
      setScore({ correct: 0, total: 0, skipped: 0 });
      setQuizFinished(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const trackAnswer = (questionId: number, isCorrect: boolean, isCash: boolean) => {
    const body: Record<string, boolean> = { answered: true };
    if (isCorrect) {
      body.goodAnswer = true;
      if (isCash) body.cashGoodAnswer = true;
    }
    fetch(`/api/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  };

  const submitAnswer = (answer: string, isCash: boolean) => {
    setSelectedAnswer(answer);
    setIsFlipped(true);
    setDeleteError(null);
    const isCorrect =
      normalizeAnswer(answer) === normalizeAnswer(filteredQuestions[currentIndex].answer);
    trackAnswer(filteredQuestions[currentIndex].id, isCorrect, isCash);
    setScore((prev) => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleSelectAnswer = (proposition: string) => {
    if (selectedAnswer) return;
    submitAnswer(proposition, false);
  };

  const handleCashSubmit = async () => {
    if (!cashInput.trim()) return;
    const userAnswer = cashInput.trim();
    const q = filteredQuestions[currentIndex];
    setCashChecking(true);
    setCashGivenAnswer(userAnswer);
    try {
      const res = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAnswer,
          expectedAnswer: q.answer,
          question: q.question,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedAnswer(data.isCorrect ? q.answer : userAnswer);
      setIsFlipped(true);
      setDeleteError(null);
      trackAnswer(q.id, data.isCorrect, true);
      setScore((prev) => ({
        ...prev,
        correct: prev.correct + (data.isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch {
      submitAnswer(userAnswer, true);
    } finally {
      setCashChecking(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsFlipped(false);
      setAnswerMode("cash");
      setCashInput("");
      setCashChecking(false);
      setCashGivenAnswer(null);
      setDeleteError(null);
    } else {
      setQuizFinished(true);
    }
  };

  const openFilter = () => {
    setFilterTab("theme");
    setSelectedThemes(new Set(allThemes));
    setSelectedSources(new Set(allSources));
    setShowFilter(true);
  };

  const handleFilterTabChange = (tab: "theme" | "source") => {
    if (tab === "theme") {
      setSelectedSources(new Set(allSources));
    } else {
      setSelectedThemes(new Set(allThemes));
    }
    setFilterTab(tab);
  };

  const toggleFilterItem = (item: string) => {
    if (filterTab === "theme") {
      setSelectedThemes((prev) => {
        const next = new Set(prev);
        next.has(item) ? next.delete(item) : next.add(item);
        return next;
      });
    } else {
      setSelectedSources((prev) => {
        const next = new Set(prev);
        next.has(item) ? next.delete(item) : next.add(item);
        return next;
      });
    }
  };

  const applyFilter = () => {
    const values = filterTab === "theme" ? selectedThemes : selectedSources;
    const allValues = filterTab === "theme" ? allThemes : allSources;
    if (values.size === allValues.length) {
      setActiveFilter(null);
    } else {
      setActiveFilter({ type: filterTab, values: new Set(values) });
    }
    setShowFilter(false);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsFlipped(false);
    setAnswerMode("cash");
    setCashInput("");
    setCashGivenAnswer(null);
    setScore({ correct: 0, total: 0, skipped: 0 });
    setQuizFinished(false);
  };

  const handleRestart = () => {
    setQuestions((prev) =>
      shuffle(prev).map((q) => ({ ...q, propositions: shuffle(q.propositions) }))
    );
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsFlipped(false);
    setAnswerMode("cash");
    setCashInput("");
    setScore({ correct: 0, total: 0, skipped: 0 });
    setQuizFinished(false);
  };

  const handleSkip = () => {
    setScore((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    handleNext();
  };

  const handleAddQuestions = async () => {
    const newLines = newQuestionsText.trim();
    if (!newLines) return;

    const parsed = parseInputLines(newLines);
    if (parsed.length === 0) {
      setAddError(
        "Format invalide. Utilisez : Question :: Prop1;;Prop2 :: Reponse :: Explication"
      );
      return;
    }

    setClassifying(true);
    setAddError(null);
    try {
      const res = await fetch("/api/classify-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsed.map((q) => ({ question: q.question })) }),
      });
      if (!res.ok) throw new Error("Erreur lors de la classification");
      const { themes } = (await res.json()) as { themes: string[] };

      setReviewItems(
        parsed.map((q, i) => ({
          ...q,
          theme: themes[i] || "",
          source: "",
        }))
      );
      setShowAddForm(false);
      setShowReview(true);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setClassifying(false);
    }
  };

  const handleConfirmAdd = async () => {
    setAddingQuestions(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: reviewItems }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'ajout");
      await fetchQuiz();
      setNewQuestionsText("");
      setShowReview(false);
      setReviewItems([]);
      setAddSuccess(`${reviewItems.length} question(s) ajoutee(s) !`);
      setTimeout(() => setAddSuccess(null), 3000);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setAddingQuestions(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!window.confirm("Supprimer cette question ?")) return;

    setDeletingQuestion(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/questions/${currentQuestion.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");

      const newQuestions = [...questions];
      newQuestions.splice(currentIndex, 1);

      if (newQuestions.length === 0) {
        setQuestions([]);
        setQuizFinished(false);
        return;
      }

      setQuestions(newQuestions);
      if (currentIndex >= newQuestions.length) {
        setCurrentIndex(newQuestions.length - 1);
      }
      setSelectedAnswer(null);
      setIsFlipped(false);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setDeletingQuestion(false);
    }
  };

  const currentQuestion = filteredQuestions[currentIndex];
  const isCorrect = selectedAnswer
    ? normalizeAnswer(selectedAnswer) === normalizeAnswer(currentQuestion?.answer ?? "")
    : null;

  const previewCount = newQuestionsText.trim()
    ? parseInputLines(newQuestionsText.trim()).length
    : 0;

  const logoHeader = (
    <div className="flex items-center gap-3 mb-4">
      <Image src="/Logo/potache-192.png" alt="Potache" width={48} height={48} />
      <h1 className="text-4xl font-bold text-ds-accent">Potache</h1>
    </div>
  );

  // Loading screen
  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center">
          {logoHeader}
          <p className="text-ds-muted">Chargement des questions...</p>
        </div>
      </main>
    );
  }

  // Error screen
  if (error || filteredQuestions.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center">
          {logoHeader}
          <p className="text-ds-danger-light mb-6">{error || "Aucune question trouvee"}</p>
          <button
            onClick={fetchQuiz}
            className="px-6 py-3 rounded-xl bg-ds-accent hover:bg-ds-accent-dark text-white font-semibold transition-colors cursor-pointer"
          >
            Reessayer
          </button>
        </div>
      </main>
    );
  }

  // Quiz finished screen
  if (quizFinished) {
    const answered = score.total;
    const percentage = answered > 0 ? Math.round((score.correct / answered) * 100) : 0;
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center flex flex-col items-center">
          {logoHeader}
          <p className="text-2xl font-bold mb-4">Quiz termine</p>
          <div className="w-full bg-ds-dark rounded-2xl p-10 mb-6">
            <p className="text-6xl font-bold text-ds-accent mb-1">{percentage}%</p>
            <p className="text-ds-muted text-lg">
              {score.correct} / {answered} bonnes reponses
            </p>
            {score.skipped > 0 && (
              <p className="text-ds-muted text-sm mt-2">
                {score.skipped} question{score.skipped > 1 ? "s" : ""} passee
                {score.skipped > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={handleRestart}
            className="w-full py-3 rounded-xl bg-ds-accent hover:bg-ds-accent-dark text-white font-semibold transition-colors cursor-pointer"
          >
            Recommencer
          </button>
        </div>
      </main>
    );
  }

  // Quiz card screen
  return (
    <main className="flex-1 flex flex-col items-center justify-start py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 justify-center">
          <Image src="/Logo/potache.svg" alt="Potache" width={64} height={64} />
          <span className="text-3xl font-bold text-ds-accent-light">Potache</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-foreground text-sm">
            {currentIndex + 1} / {filteredQuestions.length}
          </span>
          <div className="flex items-center gap-5">
            <Link
              href="/stats"
              className="text-foreground hover:text-ds-text text-sm transition-colors"
            >
              Stats
            </Link>
            <button
              onClick={openFilter}
              className="relative text-foreground hover:text-ds-text text-sm transition-colors cursor-pointer"
              title="Filtrer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {activeFilter && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-ds-accent rounded-full" />
              )}
            </button>
            <button
              onClick={() => {
                setShowAddForm(true);
                setAddError(null);
                setAddSuccess(null);
              }}
              className="text-ds-accent hover:text-ds-accent-light text-sm font-medium transition-colors cursor-pointer"
            >
              Ajouter
            </button>
            <span className="text-foreground text-sm">
              {score.correct}/{score.total}
            </span>
          </div>
        </div>
      </div>

      {/* Success message */}
      {addSuccess && (
        <div className="w-full max-w-2xl mb-4 px-4 py-2 rounded-xl bg-ds-success-dark/50 border border-ds-success text-ds-success-light text-sm text-center">
          {addSuccess}
        </div>
      )}

      {/* Add questions modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-ds-dark rounded-2xl p-6 w-full max-w-lg border border-ds-surface">
            <h3 className="text-xl font-semibold mb-4">Ajouter des questions</h3>
            <p className="text-ds-muted text-sm mb-3">
              Format : Question :: Prop1;;Prop2;;Prop3 :: Reponse :: Explication
            </p>
            <textarea
              value={newQuestionsText}
              onChange={(e) => {
                setNewQuestionsText(e.target.value);
                setAddError(null);
              }}
              placeholder="Quelle est la capitale de la France ? :: Paris;;Lyon;;Marseille :: Paris :: Paris est la capitale depuis..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-ds-surface border border-ds-border text-white placeholder-ds-muted focus:outline-none focus:ring-2 focus:ring-ds-accent focus:border-transparent resize-y transition-shadow"
            />
            {newQuestionsText.trim() && (
              <p className="text-ds-muted text-sm mt-2">
                {previewCount} question(s) detectee(s)
                {previewCount === 0 && newQuestionsText.trim() && (
                  <span className="text-ds-accent"> - format invalide</span>
                )}
              </p>
            )}
            {addError && <p className="text-ds-danger-light text-sm mt-2">{addError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewQuestionsText("");
                  setAddError(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-ds-surface hover:bg-ds-border text-white font-medium transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleAddQuestions}
                disabled={classifying || previewCount === 0}
                className="flex-1 py-2.5 rounded-xl bg-ds-accent hover:bg-ds-accent-dark text-white font-semibold transition-colors disabled:opacity-40 cursor-pointer"
              >
                {classifying ? "Classification..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-ds-dark rounded-2xl p-6 w-full max-w-3xl border border-ds-surface max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-semibold mb-4">
              Verification ({reviewItems.length} question{reviewItems.length > 1 ? "s" : ""})
            </h3>

            <div className="overflow-auto flex-1 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ds-muted border-b border-ds-surface">
                    <th className="pb-2 pr-3">Question</th>
                    <th className="pb-2 pr-3 w-36">Theme</th>
                    <th className="pb-2 w-36">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewItems.map((item, i) => (
                    <tr key={i} className="border-b border-ds-surface/50">
                      <td className="py-2 pr-3 text-ds-text max-w-xs truncate" title={item.question}>
                        {item.question}
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={item.theme}
                          onChange={(e) =>
                            setReviewItems((prev) =>
                              prev.map((r, j) =>
                                j === i ? { ...r, theme: e.target.value } : r
                              )
                            )
                          }
                          className="w-full px-2 py-1 rounded-lg bg-ds-surface border border-ds-border text-white text-sm focus:outline-none focus:ring-1 focus:ring-ds-accent"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={item.source}
                          onChange={(e) =>
                            setReviewItems((prev) =>
                              prev.map((r, j) =>
                                j === i ? { ...r, source: e.target.value } : r
                              )
                            )
                          }
                          placeholder="Source..."
                          className="w-full px-2 py-1 rounded-lg bg-ds-surface border border-ds-border text-white text-sm placeholder-ds-muted focus:outline-none focus:ring-1 focus:ring-ds-accent"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {addError && <p className="text-ds-danger-light text-sm mb-3">{addError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReview(false);
                  setShowAddForm(true);
                  setAddError(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-ds-surface hover:bg-ds-border text-white font-medium transition-colors cursor-pointer"
              >
                Retour
              </button>
              <button
                onClick={handleConfirmAdd}
                disabled={addingQuestions}
                className="flex-1 py-2.5 rounded-xl bg-ds-accent hover:bg-ds-accent-dark text-white font-semibold transition-colors disabled:opacity-40 cursor-pointer"
              >
                {addingQuestions ? "Enregistrement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter modal */}
      {showFilter && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-ds-dark rounded-2xl p-6 w-full max-w-md border border-ds-surface">
            <h3 className="text-xl font-semibold mb-4">Filtrer les questions</h3>

            {/* Tabs */}
            <div className="flex rounded-xl bg-ds-surface p-1 mb-4">
              <button
                onClick={() => handleFilterTabChange("theme")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  filterTab === "theme"
                    ? "bg-ds-accent text-white"
                    : "text-ds-muted hover:text-white"
                }`}
              >
                Thèmes
              </button>
              <button
                onClick={() => handleFilterTabChange("source")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  filterTab === "source"
                    ? "bg-ds-accent text-white"
                    : "text-ds-muted hover:text-white"
                }`}
              >
                Sources
              </button>
            </div>

            {/* Checkboxes */}
            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {(filterTab === "theme" ? allThemes : allSources).map((item) => {
                const checked =
                  filterTab === "theme"
                    ? selectedThemes.has(item)
                    : selectedSources.has(item);
                return (
                  <label
                    key={item}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ds-surface cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFilterItem(item)}
                      className="w-4 h-4 accent-ds-accent cursor-pointer"
                    />
                    <span className="text-ds-text text-sm">{item}</span>
                  </label>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 py-2.5 rounded-xl bg-ds-surface hover:bg-ds-border text-white font-medium transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={applyFilter}
                disabled={
                  (filterTab === "theme" && selectedThemes.size === 0) ||
                  (filterTab === "source" && selectedSources.size === 0)
                }
                className="flex-1 py-2.5 rounded-xl bg-ds-accent hover:bg-ds-accent-dark text-white font-semibold transition-colors disabled:opacity-40 cursor-pointer"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-2xl">
        {!isFlipped ? (
          /* Front */
          <div className="bg-ds-dark rounded-2xl p-8 flex flex-col">
            <h2 className="text-2xl font-semibold mb-8 text-center leading-snug">
              {currentQuestion.question}
            </h2>

            {answerMode === "cash" && (
              <div className="flex flex-col gap-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCashSubmit();
                  }}
                  className="flex flex-col gap-3"
                >
                  <textarea
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCashSubmit();
                      }
                    }}
                    placeholder="Ta reponse... (Shift+Entree pour retour a la ligne)"
                    autoFocus
                    disabled={cashChecking}
                    rows={3}
                    className="w-full px-5 py-4 rounded-xl bg-ds-surface border border-ds-border text-white text-lg placeholder-ds-muted focus:outline-none focus:ring-2 focus:ring-ds-accent focus:border-transparent disabled:opacity-50 transition-shadow resize-y"
                  />
                  <button
                    type="submit"
                    disabled={!cashInput.trim() || cashChecking}
                    className="px-6 py-3.5 rounded-xl bg-ds-accent hover:bg-ds-accent-dark text-white font-semibold transition-colors text-lg cursor-pointer disabled:opacity-30"
                  >
                    {cashChecking ? "Verification..." : "Valider"}
                  </button>
                </form>
                <div className="flex justify-between pt-1">
                  <button
                    onClick={() => setAnswerMode("trio")}
                    className="py-2 text-ds-accent hover:text-ds-accent-light transition-colors text-sm font-medium cursor-pointer"
                  >
                    Trio
                  </button>
                  <button
                    onClick={handleSkip}
                    className="py-2 text-ds-muted hover:text-ds-text transition-colors text-sm cursor-pointer"
                  >
                    Passer
                  </button>
                </div>
              </div>
            )}

            {answerMode === "trio" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.propositions.map((prop, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectAnswer(prop)}
                      className="px-5 py-4 rounded-xl bg-ds-surface border border-ds-border hover:bg-ds-border hover:border-ds-hover text-white font-medium transition-all text-base cursor-pointer text-left"
                    >
                      {prop}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setAnswerMode("cash")}
                  className="py-2 text-ds-muted hover:text-ds-text transition-colors text-sm cursor-pointer"
                >
                  Retour
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Back */
          <div
            className={`rounded-2xl p-8 flex flex-col ${
              isCorrect
                ? "bg-ds-success-dark/80 border-2 border-ds-success"
                : "bg-ds-danger-dark/80 border-2 border-ds-danger"
            }`}
          >
            <p
              className={`text-2xl font-semibold mb-4 text-center ${
                isCorrect ? "text-ds-success-light" : "text-ds-danger-light"
              }`}
            >
              {isCorrect ? "Correct" : "Incorrect"}
            </p>
            {!isCorrect && cashGivenAnswer && (
              <p className="text-base mb-2 text-center text-ds-danger-light">
                Ta reponse : <span className="font-semibold">{cashGivenAnswer}</span>
              </p>
            )}
            {!isCorrect && (
              <p className="text-lg mb-4 text-center">
                Reponse :{" "}
                <span className="font-semibold text-ds-success-light">
                  {currentQuestion.answer}
                </span>
              </p>
            )}
            <div className="bg-black/20 rounded-xl p-5 mb-6">
              <p className="text-ds-text text-base leading-relaxed text-justify wrap-break-word hyphens-auto">
                {currentQuestion.explanation}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors cursor-pointer"
              >
                {currentIndex < filteredQuestions.length - 1
                  ? "Suivante"
                  : "Resultats"}
              </button>
              <button
                onClick={handleDeleteQuestion}
                disabled={deletingQuestion}
                className="text-ds-danger-light/70 hover:text-ds-danger-light text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {deletingQuestion ? "Suppression..." : "Supprimer"}
              </button>
              {deleteError && (
                <p className="text-ds-danger-light text-xs">{deleteError}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
