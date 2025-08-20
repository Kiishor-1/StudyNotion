const Query = require('../models/Query');
const { hashSource, generateEmbedding } = require("./aiUtils");

/**
 * Helper: build a consistent source hash key
 */
function buildSourceHash(metadata, text) {
  if (!metadata.sourceType) {
    throw new Error("metadata.sourceType is required");
  }

  // FAQs are keyed by their actual text
  if (metadata.sourceType === "faq") {
    if (!text) {
      throw new Error("FAQ requires text to build sourceHash");
    }
    return hashSource(`${metadata.sourceType}:${text}`);
  }

  // Everything else should have a stable sourceId
  if (!metadata.sourceId) {
    throw new Error("metadata.sourceId is required for non-FAQ sources");
  }

  return hashSource(`${metadata.sourceType}:${metadata.sourceId}`);
}

/**
 * Insert or update a text chunk embedding into the Query collection.
 * Makes embeddings rich by combining provided text + metadata.
 */
async function upsertChunk({ text, metadata = {}, scope = "public", answer }) {
  const sourceHash = buildSourceHash(metadata, text);

  // look for existing
  const existing = await Query.findOne({ "metadata.sourceHash": sourceHash });
  if (existing) return existing;

  // generate embedding
  const embedding = await generateEmbedding(text);

  // insert
  return await Query.create({
    text,
    answer,
    embedding,
    metadata: { ...metadata, sourceHash },
    scope,
  });
}

/**
 * Update an existing chunk when text or metadata changes.
 * If no existing doc found, falls back to upsert.
 */
async function updateChunk({ text, metadata = {}, scope = "public", answer }) {
  const sourceHash = buildSourceHash(metadata, text);

  let doc = await Query.findOne({ "metadata.sourceHash": sourceHash });

  // if not found, behave like insert
  if (!doc) {
    return upsertChunk({ text, metadata, scope, answer });
  }

  const embedding = await generateEmbedding(text);

  doc.text = text;
  if (doc.answer) {
    doc.answer = answer || doc.answer;
  }
  doc.embedding = embedding;
  doc.metadata = { ...metadata, sourceHash };
  doc.scope = scope;

  await doc.save();
  return doc;
}

/**
 * Delete chunk(s) either by exact sourceHash or by metadata match
 */
async function deleteChunk({ metadata }) {
  const sourceHash = buildSourceHash(metadata);
  let query = {};

  if (sourceHash) {
    query["metadata.sourceHash"] = sourceHash;
  } else if (metadata) {
    query = Object.entries(metadata).reduce((acc, [k, v]) => {
      acc[`metadata.${k}`] = v;
      return acc;
    }, {});
  } else {
    throw new Error("deleteChunk requires either metadata or sourceHash");
  }

  return await Query.deleteMany(query);
}

module.exports = { upsertChunk, updateChunk, deleteChunk };