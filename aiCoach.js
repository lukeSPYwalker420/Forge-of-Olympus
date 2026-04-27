import AiCoachCache from "./models/AiCoachCache.js";
import { getRuleBasedPrompts } from "./coaching.js";
import dotenv from "dotenv";
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Build a summary string for sending to GPT.
 */
async function buildSummary(userId, prompts) {
  // We'll just convert the rule-based prompts into a structured format
  const parts = prompts.map(p => `${p.lift}: ${p.message}`).join("\n");
  return `Based on the following observations:\n${parts}\nProvide a concise, motivational, and personalised coaching tip for this lifter. Keep it under 3 sentences.`;
}

/**
 * Call GPT-4 with the user's data.
 */
async function callGPT4(userId) {
  const rulePrompts = await getRuleBasedPrompts(userId);
  const summary = await buildSummary(userId, rulePrompts);

  try {
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

    const data = await response.json();
    const aiMessage = data.choices[0].message.content.trim();

    // Combine with rule-based data? Actually we'll replace entirely
    return [{
      lift: "overall",
      type: "ai_coach",
      message: aiMessage
    }];
  } catch (err) {
    console.error("GPT-4 call failed, falling back to rules:", err);
    return rulePrompts;
  }
}

/**
 * Main function – returns cached AI prompts or fetches new ones.
 */
export async function getCoachingPrompts(userId) {
  const cached = await AiCoachCache.findOne({ userId });
  if (cached) return cached.prompts;

  const rulePrompts = await getRuleBasedPrompts(userId);

  let prompts;
  if (OPENAI_API_KEY) {
    prompts = await callGPT4(rulePrompts);
  } else {
    prompts = rulePrompts;
  }

  await AiCoachCache.findOneAndUpdate(
    { userId },
    { userId, prompts },       // prompts is already an array of objects
    { upsert: true, new: true }
  );

  return prompts;
}