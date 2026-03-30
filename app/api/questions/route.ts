import { prisma } from "@/lib/prisma";

export async function GET() {
  const questions = await prisma.question.findMany();
  const mapped = questions.map((q) => ({
    id: q.id,
    question: q.question,
    propositions: q.propositions.split("$$").map((p) => p.trim()),
    answer: q.answer,
    explanation: q.explanation,
  }));
  return Response.json(mapped);
}

export async function POST(request: Request) {
  const body = await request.json();
  const items: Array<{
    question: string;
    propositions: string;
    answer: string;
    explanation: string;
  }> = Array.isArray(body.questions) ? body.questions : [body];

  const created = await prisma.question.createMany({ data: items });
  return Response.json({ count: created.count }, { status: 201 });
}
