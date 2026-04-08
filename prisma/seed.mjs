import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try .env.local first, then fall back to DATABASE_URL from dotenv
const envLocal = readFileSync(join(__dirname, "..", ".env.local"), "utf-8");
const dbUrl =
  envLocal.match(/DATABASE_URL=(.+)/)?.[1] || process.env.DATABASE_URL;

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

// Read Excel file
const workbook = XLSX.readFile(join(__dirname, "..", "Question.xlsx"));
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

// Clear existing data (questions first due to FK constraints)
await client.query('DELETE FROM "Question"');
await client.query('DELETE FROM "Theme"');
await client.query('DELETE FROM "Source"');

// Reset sequences
await client.query("ALTER SEQUENCE \"Theme_id_seq\" RESTART WITH 1");
await client.query("ALTER SEQUENCE \"Source_id_seq\" RESTART WITH 1");
await client.query("ALTER SEQUENCE \"Question_id_seq\" RESTART WITH 1");

// Extract unique themes and sources
const themes = [...new Set(rows.map((r) => r.theme).filter(Boolean))];
const sources = [...new Set(rows.map((r) => r.source).filter(Boolean))];

// Insert themes
const themeMap = {};
for (const name of themes) {
  const res = await client.query(
    'INSERT INTO "Theme" (name) VALUES ($1) RETURNING id',
    [name]
  );
  themeMap[name] = res.rows[0].id;
}
console.log(`Seeded ${themes.length} themes.`);

// Insert sources
const sourceMap = {};
for (const name of sources) {
  const res = await client.query(
    'INSERT INTO "Source" (name) VALUES ($1) RETURNING id',
    [name]
  );
  sourceMap[name] = res.rows[0].id;
}
console.log(`Seeded ${sources.length} sources.`);

// Insert questions
let count = 0;
for (const q of rows) {
  const themeId = q.theme ? themeMap[q.theme] : null;
  const sourceId = q.source ? sourceMap[q.source] : null;

  await client.query(
    `INSERT INTO "Question" (question, propositions, answer, explanation, answered, "goodAnswer", "cashGoodAnswer", "createdAt", "themeId", "sourceId")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      q.question,
      q.propositions,
      q.answer,
      q.explanation,
      q.answered || 0,
      q.goodAnswer || 0,
      q.cashGoodAnswer || 0,
      q.createdAt ? new Date(q.createdAt) : new Date(),
      themeId,
      sourceId,
    ]
  );
  count++;
}

console.log(`Seeded ${count} questions.`);
await client.end();
