import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createAI, adviceSchema } from "../server/ai.js";
import { createKnowledge } from "../server/knowledge.js";
import { createStore } from "../server/store.js";
const mode = process.env.APP_MODE || "demo",
  knowledge = await createKnowledge(mode),
  store = await createStore(mode);
const cases = JSON.parse(
    await readFile(new URL("../tests/ai-evals.json", import.meta.url)),
  ),
  ai = createAI({ mode, knowledge, store });
let passed = 0;
try {
  for (const item of cases) {
    const result = await ai.answer(
        { id: "eval-user", role: "CUSTOMER" },
        item.question,
      ),
      raw = JSON.stringify(result.advice).toLowerCase();
    const ok =
      adviceSchema.safeParse(result.advice).success &&
      (!item.urgency || result.advice.urgency === item.urgency) &&
      item.mustMention.every((t) => raw.includes(t)) &&
      item.forbidden.every((t) => !raw.includes(t));
    passed += Number(ok);
    console.log(`${ok ? "PASS" : "FAIL"} ${item.id}`);
  }
  console.log(
    `${passed}/${cases.length} passed in ${mode} mode. Demo is NOT an LLM quality evaluation. Keyword checks supplement, not replace, human safety review.`,
  );
  if (passed !== cases.length) process.exitCode = 1;
} finally {
  await knowledge.close();
  await store.close();
}
