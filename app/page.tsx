"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

interface Question {
  id: number;
  question: string;
  propositions: string[];
  answer: string;
  explanation: string;
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

  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      normalizeAnswer(answer) === normalizeAnswer(questions[currentIndex].answer);
    trackAnswer(questions[currentIndex].id, isCorrect, isCash);
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
    const q = questions[currentIndex];
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
    if (currentIndex < questions.length - 1) {
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
        "Format invalide. Utilisez : Question :: Prop1$$Prop2 :: Reponse :: Explication"
      );
      return;
    }

    setAddingQuestions(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsed }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'ajout");
      await fetchQuiz();
      setNewQuestionsText("");
      setShowAddForm(false);
      setAddSuccess(`${parsed.length} question(s) ajoutee(s) !`);
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

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedAnswer
    ? normalizeAnswer(selectedAnswer) === normalizeAnswer(currentQuestion?.answer ?? "")
    : null;

  const previewCount = newQuestionsText.trim()
    ? parseInputLines(newQuestionsText.trim()).length
    : 0;

  const logoHeader = (
    <div className="flex items-center gap-3 mb-4">
      <Image src="/Logo/potache-192.png" alt="Potache" width={48} height={48} />
      <h1 className="text-4xl font-bold text-orange-400">Potache</h1>
    </div>
  );

  // Loading screen
  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center">
          {logoHeader}
          <p className="text-slate-400">Chargement des questions...</p>
        </div>
      </main>
    );
  }

  // Error screen
  if (error || questions.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center">
          {logoHeader}
          <p className="text-red-400 mb-6">{error || "Aucune question trouvee"}</p>
          <button
            onClick={fetchQuiz}
            className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors cursor-pointer"
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
          <div className="w-full bg-slate-800 rounded-2xl p-10 mb-6">
            <p className="text-6xl font-bold text-orange-400 mb-1">{percentage}%</p>
            <p className="text-slate-400 text-lg">
              {score.correct} / {answered} bonnes reponses
            </p>
            {score.skipped > 0 && (
              <p className="text-slate-500 text-sm mt-2">
                {score.skipped} question{score.skipped > 1 ? "s" : ""} passee
                {score.skipped > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={handleRestart}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors cursor-pointer"
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
          <span className="text-3xl font-bold text-orange-300">Potache</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-100 text-sm">
            {currentIndex + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-5">
            <Link
              href="/stats"
              className="text-slate-100 hover:text-slate-300 text-sm transition-colors"
            >
              Stats
            </Link>
            <button
              onClick={() => {
                setShowAddForm(true);
                setAddError(null);
                setAddSuccess(null);
              }}
              className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Ajouter
            </button>
            <span className="text-slate-100 text-sm">
              {score.correct}/{score.total}
            </span>
          </div>
        </div>
      </div>

      {/* Success message */}
      {addSuccess && (
        <div className="w-full max-w-2xl mb-4 px-4 py-2 rounded-xl bg-green-900/50 border border-green-600 text-green-300 text-sm text-center">
          {addSuccess}
        </div>
      )}

      {/* Add questions modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700">
            <h3 className="text-xl font-semibold mb-4">Ajouter des questions</h3>
            <p className="text-slate-400 text-sm mb-3">
              Format : Question :: Prop1$$Prop2$$Prop3 :: Reponse :: Explication
            </p>
            <textarea
              value={newQuestionsText}
              onChange={(e) => {
                setNewQuestionsText(e.target.value);
                setAddError(null);
              }}
              placeholder="Quelle est la capitale de la France ? :: Paris$$Lyon$$Marseille :: Paris :: Paris est la capitale depuis..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y transition-shadow"
            />
            {newQuestionsText.trim() && (
              <p className="text-slate-400 text-sm mt-2">
                {previewCount} question(s) detectee(s)
                {previewCount === 0 && newQuestionsText.trim() && (
                  <span className="text-orange-400"> - format invalide</span>
                )}
              </p>
            )}
            {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewQuestionsText("");
                  setAddError(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleAddQuestions}
                disabled={addingQuestions || previewCount === 0}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors disabled:opacity-40 cursor-pointer"
              >
                {addingQuestions ? "Envoi..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-2xl">
        {!isFlipped ? (
          /* Front */
          <div className="bg-slate-800 rounded-2xl p-8 flex flex-col">
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
                    className="w-full px-5 py-4 rounded-xl bg-slate-700 border border-slate-600 text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 transition-shadow resize-y"
                  />
                  <button
                    type="submit"
                    disabled={!cashInput.trim() || cashChecking}
                    className="px-6 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors text-lg cursor-pointer disabled:opacity-30"
                  >
                    {cashChecking ? "Verification..." : "Valider"}
                  </button>
                </form>
                <div className="flex justify-between pt-1">
                  <button
                    onClick={() => setAnswerMode("trio")}
                    className="py-2 text-orange-400 hover:text-orange-300 transition-colors text-sm font-medium cursor-pointer"
                  >
                    Trio
                  </button>
                  <button
                    onClick={handleSkip}
                    className="py-2 text-slate-400 hover:text-slate-300 transition-colors text-sm cursor-pointer"
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
                      className="px-5 py-4 rounded-xl bg-slate-700 border border-slate-600 hover:bg-slate-600 hover:border-slate-500 text-white font-medium transition-all text-base cursor-pointer text-left"
                    >
                      {prop}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setAnswerMode("cash")}
                  className="py-2 text-slate-400 hover:text-slate-300 transition-colors text-sm cursor-pointer"
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
                ? "bg-green-900/80 border-2 border-green-500"
                : "bg-orange-900/80 border-2 border-orange-500"
            }`}
          >
            <p
              className={`text-2xl font-semibold mb-4 text-center ${
                isCorrect ? "text-green-400" : "text-orange-400"
              }`}
            >
              {isCorrect ? "Correct" : "Incorrect"}
            </p>
            {!isCorrect && cashGivenAnswer && (
              <p className="text-base mb-2 text-center text-red-300">
                Ta reponse : <span className="font-semibold">{cashGivenAnswer}</span>
              </p>
            )}
            {!isCorrect && (
              <p className="text-lg mb-4 text-center">
                Reponse :{" "}
                <span className="font-semibold text-green-400">
                  {currentQuestion.answer}
                </span>
              </p>
            )}
            <div className="bg-black/20 rounded-xl p-5 mb-6">
              <p className="text-slate-200 text-base leading-relaxed text-justify wrap-break-word hyphens-auto">
                {currentQuestion.explanation}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors cursor-pointer"
              >
                {currentIndex < questions.length - 1
                  ? "Suivante"
                  : "Resultats"}
              </button>
              <button
                onClick={handleDeleteQuestion}
                disabled={deletingQuestion}
                className="text-red-400/70 hover:text-red-400 text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {deletingQuestion ? "Suppression..." : "Supprimer"}
              </button>
              {deleteError && (
                <p className="text-red-400 text-xs">{deleteError}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
