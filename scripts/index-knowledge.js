import "dotenv/config";
import OpenAI from "openai";
import { createKnowledge } from "../server/knowledge.js";
if (!process.env.OPENAI_API_KEY)
  throw new Error("Set OPENAI_API_KEY; indexing makes paid embedding requests");
const knowledge = await createKnowledge("live"),
  client = new OpenAI(),
  model = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
try {
  for (const article of await knowledge.list()) {
    const result = await client.embeddings.create({
      model,
      input: `${article.title}\n${article.text}`,
    });
    await knowledge.setVector(article._id, result.data[0].embedding, model);
    const rate = process.env.AI_EMBEDDING_USD_PER_MILLION;
    await knowledge.recordUsage({
      userId: "indexer",
      model,
      inputTokens: result.usage.total_tokens,
      outputTokens: 0,
      estimatedUsd: rate?.trim()
        ? (result.usage.total_tokens * Number(rate)) / 1e6
        : null,
      kind: "indexing",
    });
    console.log(`Indexed: ${article.title}`);
  }
} finally {
  await knowledge.close();
}
