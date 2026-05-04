import AiCoachCache from "./models/AiCoachCache.js";
import { getRuleBasedPrompts } from "./coaching.js";
import dotenv from "dotenv";
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function buildSummary(prompts) {
  const parts = prompts.map(p => `${p.lift}: ${p.message}`).join("\n");
  return `Based on the following observations:\n${parts}\nProvide a concise, motivational, and personalised coaching tip for this lifter. Keep it under 3 sentences.`;
}

async function callGPT4(rulePrompts) {
  try {
    const summary = await buildSummary(rulePrompts);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an elite strength coach giving concise, actionable tips." },
          { role: "user", content: summary }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      return rulePrompts; // fallback
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("OpenAI response missing choices:", data);
      return rulePrompts;
    }

    const aiMessage = data.choices[0].message.content.trim();
    return [{
      lift: "overall",
      type: "ai_coach",
      message: aiMessage
    }];
  } catch (err) {
    console.error("GPT-4 call failed, falling back to rules:", err);
    return rulePrompts;   // fallback to rule‑based prompts
  }
}

export async function getCoachingPrompts(userId) {
  // 1. Check cache
  const cached = await AiCoachCache.findOne({ userId });
  if (cached) return cached.prompts;

  // 2. Always build rule‑based prompts first (uses real userId)
  const rulePrompts = await getRuleBasedPrompts(userId);

  let finalPrompts;
  if (OPENAI_API_KEY) {
    // Pass the array of prompts to GPT‑4 (not the userId)
    finalPrompts = await callGPT4(rulePrompts);
  } else {
    finalPrompts = rulePrompts;
  }

  // 3. Save to cache
  await AiCoachCache.findOneAndUpdate(
    { userId },
    { userId, prompts: finalPrompts },
    { upsert: true, new: true }
  );

  return finalPrompts;
}