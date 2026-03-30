import { prisma } from "@/lib/prisma";

export async function GET() {
  const questions = await prisma.question.findMany({
    orderBy: { id: "asc" },
  });

  const stats = questions.map((q) => ({
    id: q.id,
    question: q.question,
    answered: q.answered,
    goodAnswer: q.goodAnswer,
    cashGoodAnswer: q.cashGoodAnswer,
    successRate: q.answered > 0 ? Math.round((q.goodAnswer / q.answered) * 100) : null,
    cashSuccessRate: q.answered > 0 ? Math.round((q.cashGoodAnswer / q.answered) * 100) : null,
  }));

  const totals = {
    totalQuestions: questions.length,
    totalAnswered: questions.reduce((s, q) => s + q.answered, 0),
    totalGoodAnswers: questions.reduce((s, q) => s + q.goodAnswer, 0),
    totalCashGoodAnswers: questions.reduce((s, q) => s + q.cashGoodAnswer, 0),
  };

  return Response.json({ totals, questions: stats });
}
