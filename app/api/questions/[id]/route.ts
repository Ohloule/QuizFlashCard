import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/questions/[id]">
) {
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  const body: { answered?: boolean; goodAnswer?: boolean; cashGoodAnswer?: boolean } =
    await req.json();

  const increment: Record<string, { increment: number }> = {};
  if (body.answered) increment.answered = { increment: 1 };
  if (body.goodAnswer) increment.goodAnswer = { increment: 1 };
  if (body.cashGoodAnswer) increment.cashGoodAnswer = { increment: 1 };

  if (Object.keys(increment).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    await prisma.question.update({
      where: { id: numericId },
      data: increment,
    });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/questions/[id]">
) {
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  try {
    await prisma.question.delete({ where: { id: numericId } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }
}
