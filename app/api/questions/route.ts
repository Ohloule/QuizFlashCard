import { prisma } from "@/lib/prisma";

export async function GET() {
  const questions = await prisma.question.findMany({
    include: { theme: true, source: true },
  });
  const mapped = questions.map((q) => ({
    id: q.id,
    question: q.question,
    propositions: q.propositions.split(";;").map((p) => p.trim()),
    answer: q.answer,
    explanation: q.explanation,
    theme: q.theme?.name ?? null,
    source: q.source?.name ?? null,
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
    theme?: string;
    source?: string;
  }> = Array.isArray(body.questions) ? body.questions : [body];

  let count = 0;
  for (const item of items) {
    let themeId: number | undefined;
    let sourceId: number | undefined;

    if (item.theme) {
      const theme = await prisma.theme.upsert({
        where: { name: item.theme },
        update: {},
        create: { name: item.theme },
      });
      themeId = theme.id;
    }
    if (item.source) {
      const source = await prisma.source.upsert({
        where: { name: item.source },
        update: {},
        create: { name: item.source },
      });
      sourceId = source.id;
    }

    await prisma.question.create({
      data: {
        question: item.question,
        propositions: item.propositions,
        answer: item.answer,
        explanation: item.explanation,
        themeId,
        sourceId,
      },
    });
    count++;
  }

  return Response.json({ count }, { status: 201 });
}
