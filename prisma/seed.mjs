import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "..", "dev.db"));

const QUIZ_RAW_URL =
  "https://raw.githubusercontent.com/Ohloule/FlashCard/main/Quiz.md";

const response = await fetch(QUIZ_RAW_URL);
if (!response.ok) throw new Error(`Failed to fetch Quiz.md: ${response.status}`);
const content = await response.text();

const lines = content.split("\n").filter((line) => line.trim() !== "");
const insert = db.prepare(
  "INSERT INTO Question (question, propositions, answer, explanation, createdAt) VALUES (?, ?, ?, ?, datetime('now'))"
);

let count = 0;
for (const line of lines) {
  const parts = line.split("::").map((p) => p.trim());
  if (parts.length >= 4) {
    insert.run(parts[0], parts[1], parts[2], parts[3]);
    count++;
  }
}

console.log(`Seeded ${count} questions.`);
db.close();
