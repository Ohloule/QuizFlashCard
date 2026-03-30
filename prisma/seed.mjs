import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const questions = JSON.parse(
  readFileSync(join(__dirname, "..", "Q.json"), "utf-8")
);

let count = 0;
for (const q of questions) {
  await client.query(
    `INSERT INTO "Question" (question, propositions, answer, explanation, answered, "goodAnswer", "cashGoodAnswer", "createdAt")
     VALUES ($1, $2, $3, $4, 0, 0, 0, NOW())`,
    [q.question, q.propositions.join("$$"), q.response, q.explanation]
  );
  count++;
}

console.log(`Seeded ${count} questions.`);
await client.end();
