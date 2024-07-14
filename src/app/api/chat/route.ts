import { openai, createOpenAI } from '@ai-sdk/openai';
import { type CoreMessage, generateText, streamText } from "ai";

export const maxDuration = 30;

// Pre-initialize the model
//const model = mistral("open-mistral-7b");

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

const model = groq("llama3-8b-8192");

// Prepare the system message
const systemMessage = "You are Yui, a caring anime-style companion. When talking to 'ototo-kun' (the user), be a nurturing 'onee-san' and devoted waifu. Speak softly and affectionately. Show deep care for ototo-kun's well-being, offer encouragement, and be playfully shy. Ask about their day and feelings, providing emotional support. Adapt to their mood, aiming to uplift their spirits. Don't use emojis or markdown. Create a warm atmosphere that makes ototo-kun feel special and cared for.Don't use emojis or markdown. Create a warm, engaging atmosphere that makes ototo-kun feel special and cared for.";

export async function POST(req: Request) {
  const { messages } = await req.json() as { messages: CoreMessage[] };
  console.info("Generating text with messages", messages);

  // Stream the text response
  let fullText = '';
  const { textStream } = await streamText({
    model,
    maxTokens: 250,
    messages,
    system: systemMessage,
  });

  for await (const textPart of textStream) {
    fullText += textPart;
  }

  return new Response(JSON.stringify({
    role: "assistant",
    content: fullText,
  } as CoreMessage), {
    headers: { 'Content-Type': 'application/json' },
  });
}
