import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { knowledge } from "./catalog.js";
// Bounded tags and revision metadata are embedded; authorId references a SQL user.
// This cross-store reference is application-checked, not a Mongo foreign key.
const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 120 },
    text: { type: String, required: true, maxlength: 6000 },
    tags: [String],
    authorId: { type: String, required: true },
    revision: { number: { type: Number, default: 1 }, editedAt: Date },
    embedding: [Number],
    embeddingModel: String,
  },
  { timestamps: true },
);
articleSchema.index({ tags: 1, updatedAt: -1 });
articleSchema.index({ title: "text", text: "text" });
const usageSchema = new mongoose.Schema(
  {
    userId: String,
    model: String,
    inputTokens: Number,
    outputTokens: Number,
    estimatedUsd: Number,
    kind: String,
  },
  { timestamps: true },
);
usageSchema.index({ userId: 1, createdAt: -1 });
export async function createKnowledge(mode) {
  if (mode === "demo") return new DemoKnowledge();
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  const Article = mongoose.model("Article", articleSchema),
    Usage = mongoose.model("Usage", usageSchema);
  await Promise.all([Article.init(), Usage.init()]);
  return {
    list: () =>
      Article.find()
        .select("-embedding")
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
    allVectors: () =>
      Article.find({ embedding: { $exists: true, $ne: [] } })
        .limit(500)
        .lean(),
    create: (data) => Article.create(data),
    update: (id, data) =>
      mongoose.isValidObjectId(id)
        ? Article.findByIdAndUpdate(
            id,
            {
              $set: {
                ...data,
                embedding: [],
                embeddingModel: null,
                "revision.editedAt": new Date(),
              },
              $inc: { "revision.number": 1 },
            },
            { new: true, runValidators: true },
          )
        : null,
    remove: (id) =>
      mongoose.isValidObjectId(id) ? Article.findByIdAndDelete(id) : null,
    setVector: (id, embedding, embeddingModel) =>
      Article.updateOne({ _id: id }, { $set: { embedding, embeddingModel } }),
    recordUsage: (data) => Usage.create(data),
    // Unwind embedded tags then group and sort: actual Mongo aggregation, not JS counting.
    stats: () =>
      Article.aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", articles: { $sum: 1 } } },
        { $sort: { articles: -1, _id: 1 } },
      ]),
    usage: () =>
      Usage.aggregate([
        {
          $group: {
            _id: "$model",
            requests: { $sum: 1 },
            inputTokens: { $sum: "$inputTokens" },
            outputTokens: { $sum: "$outputTokens" },
            estimatedUsd: { $sum: "$estimatedUsd" },
            unpriced: {
              $sum: { $cond: [{ $eq: ["$estimatedUsd", null] }, 1, 0] },
            },
          },
        },
      ]),
    health: async () => {
      await mongoose.connection.db.admin().ping();
      return true;
    },
    close: () => mongoose.disconnect(),
  };
}
export class DemoKnowledge {
  rows = knowledge.map((k) => ({
    _id: randomUUID(),
    ...k,
    authorId: "demo-admin",
    revision: { number: 1 },
    embedding: [],
  }));
  logs = [];
  async list() {
    return this.rows;
  }
  async allVectors() {
    return this.rows.filter((r) => r.embedding?.length);
  }
  async create(data) {
    const r = { _id: randomUUID(), ...data, revision: { number: 1 } };
    this.rows.push(r);
    return r;
  }
  async update(id, data) {
    const r = this.rows.find((r) => r._id === id);
    if (r)
      Object.assign(r, data, {
        embedding: [],
        embeddingModel: null,
        revision: { number: r.revision.number + 1 },
      });
    return r;
  }
  async remove(id) {
    const r = this.rows.find((r) => r._id === id);
    this.rows = this.rows.filter((r) => r._id !== id);
    return r;
  }
  async setVector(id, embedding, embeddingModel) {
    Object.assign(
      this.rows.find((r) => r._id === id),
      { embedding, embeddingModel },
    );
  }
  async recordUsage(data) {
    this.logs.push(data);
  }
  async usage() {
    return this.logs;
  }
  async stats() {
    const counts = {};
    for (const r of this.rows)
      for (const t of r.tags) counts[t] = (counts[t] || 0) + 1;
    return Object.entries(counts).map(([_id, articles]) => ({ _id, articles }));
  }
  async health() {
    return true;
  }
  async close() {}
}
