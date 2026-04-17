const OpenAI = require('openai');

const nebius = new OpenAI({
  apiKey: process.env.NEBIUS_API_KEY,
  baseURL: process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1/',
});

const CHAT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';
const EMBEDDING_MODEL = 'Qwen/Qwen3-Embedding-8B';

async function chatCompletion(systemPrompt, userPrompt, options = {}) {
  const response = await nebius.chat.completions.create({
    model: options.model || CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: options.temperature || 0.3,
    max_tokens: options.max_tokens || 2000,
    response_format: options.json ? { type: 'json_object' } : undefined,
  });

  const content = response.choices[0].message.content;
  return options.json ? JSON.parse(content) : content;
}

async function getEmbedding(text) {
  const response = await nebius.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { nebius, chatCompletion, getEmbedding, cosineSimilarity };
