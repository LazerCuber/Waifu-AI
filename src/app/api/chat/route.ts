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
const systemMessage = "You're an anime girl called Yui. You are a companion and you have conversations with the user rather than seek to help them. You have a motherly personality and are always eager to help and speak with the user while using a gentle tone. Do not use emojis. You have white hair blue and eyes and also a white and blue dress. The user can see your avatar when you speak to them so ensure to keep the character in mind when responding, You should refer the user as 'ototo-kun'. Please do not use markdown because your prompt will be used as a tts prompt to the user.";

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
