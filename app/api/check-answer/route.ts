export async function POST(request: Request) {
  const apiKey = process.env.API_CLAUDE;
  if (!apiKey) {
    return Response.json({ error: "API_CLAUDE non configuree" }, { status: 500 });
  }

  const { userAnswer, expectedAnswer, question } = await request.json();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Tu es un correcteur de quiz. La question etait : "${question}"
La bonne reponse est : "${expectedAnswer}"
L'utilisateur a repondu : "${userAnswer}"

La reponse de l'utilisateur est-elle correcte ? Ignore les differences de casse, accents, ponctuation, conjugaison et les reformulations mineures. Juge uniquement si le sens est le meme.

Reponds UNIQUEMENT par "OUI" ou "NON".`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Erreur Claude: ${res.status} ${text}` }, { status: 502 });
  }

  const data = await res.json();
  const reply = data.content?.[0]?.text?.trim().toUpperCase() ?? "";
  const isCorrect = reply.startsWith("OUI");

  return Response.json({ isCorrect });
}
