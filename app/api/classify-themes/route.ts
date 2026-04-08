import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const apiKey = process.env.API_CLAUDE;
  if (!apiKey) {
    return Response.json(
      { error: "API_CLAUDE non configuree" },
      { status: 500 }
    );
  }

  const { questions } = (await request.json()) as {
    questions: { question: string }[];
  };

  if (!questions?.length) {
    return Response.json({ error: "Aucune question" }, { status: 400 });
  }

  // Fetch existing themes to guide the AI
  const existingThemes = await prisma.theme.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const themeNames = existingThemes.map((t) => t.name);

  const numbered = questions
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Tu es un classificateur de questions de quiz.

Voici les themes existants : ${JSON.stringify(themeNames)}

Pour chaque question ci-dessous, attribue le theme le plus pertinent parmi les themes existants. Si aucun theme existant ne convient, propose un nouveau theme court (un seul mot ou deux).

Questions :
${numbered}

Reponds UNIQUEMENT avec un JSON array de strings, un theme par question, dans le meme ordre. Exemple : ["Philosophie", "Histoire", "Science"]
Pas d'explication, juste le JSON array.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `Erreur Claude: ${res.status} ${text}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const reply = data.content?.[0]?.text?.trim() ?? "[]";

  try {
    // Extract JSON array from response (may contain markdown code blocks)
    const match = reply.match(/\[[\s\S]*\]/);
    const themes: string[] = match ? JSON.parse(match[0]) : [];
    return Response.json({ themes, existingThemes: themeNames });
  } catch {
    return Response.json(
      { error: "Reponse IA invalide", raw: reply },
      { status: 502 }
    );
  }
}
