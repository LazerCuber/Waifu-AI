"use client";

import type { CoreMessage } from "ai";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { IoSend } from "react-icons/io5";
import {
  isLoadingAtom,
  lastMessageAtom,
  messageHistoryAtom,
} from "~/atoms/ChatAtom";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default function ChatInput() {
  const [messages, setMessages] = useAtom(messageHistoryAtom);
  const [lastMessage, setLastMessage] = useAtom(lastMessageAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);

  const [input, setInput] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const newMessages: CoreMessage[] = [
      ...messages,
      { content: input, role: "user" },
    ];

    setMessages(newMessages);
    setInput("");

    const textResponse = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: newMessages }),
    });
    const textResult = (await textResponse.json()) as CoreMessage;

    setLastMessage(textResult);
    setIsLoading(false);
    setMessages([...newMessages, textResult]);

    const sentences = typeof textResult.content === 'string'
      ? textResult.content.split(/(?<=\.|\?|!)/).map(s => s.trim()).filter(s => s.length > 0)
      : [];

    const synthesizeSentence = async (sentence: string | undefined) => {
      const voiceResponse = await fetch("/api/synthasize", {
        method: "POST",
        body: JSON.stringify({ message: { content: sentence ?? '', role: textResult.role } }),
      });
      return await voiceResponse.arrayBuffer();
    };

    const playSentence = async (audioBuffer: ArrayBuffer): Promise<void> => {
      if (!audioContextRef.current) return;

      return new Promise((resolve) => {
        audioContextRef.current!.decodeAudioData(audioBuffer, (decodedBuffer) => {
          if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
          }

          sourceNodeRef.current = audioContextRef.current!.createBufferSource();
          sourceNodeRef.current.buffer = decodedBuffer;
          sourceNodeRef.current.connect(audioContextRef.current!.destination);

          sourceNodeRef.current.onended = () => resolve();
          sourceNodeRef.current.start();
        });
      });
    };

    const maxConcurrent = 3;
    let currentIndex = 0;
    let inProgress = 0;
    const audioQueue: ArrayBuffer[] = [];

    async function synthesizeNext() {
      if (currentIndex >= sentences.length || inProgress >= maxConcurrent) return;

      const sentenceIndex = currentIndex++;
      const sentence = sentences[sentenceIndex];
      inProgress++;

      try {
        const audio = await synthesizeSentence(sentence);
        audioQueue[sentenceIndex] = audio;
        inProgress--;

        if (sentenceIndex === 0) playNext(); // Start playing immediately for the first sentence
        synthesizeNext(); // Start next synthesis if possible
      } catch (error) {
        console.error(`Error synthesizing sentence: ${sentence}`, error);
        inProgress--;
        synthesizeNext(); // Try the next sentence
      }
    }

    async function playNext() {
      if (audioQueue.length === 0) {
        setTimeout(playNext, 50);
        return;
      }

      const audio = audioQueue.shift();
      if (audio) {
        await playSentence(audio);
      }

      if (audioQueue.length > 0 || inProgress > 0 || currentIndex < sentences.length) {
        playNext();
      }
    }

    // Start initial batch of concurrent syntheses
    for (let i = 0; i < maxConcurrent; i++) {
      synthesizeNext();
    }
  }

  return (
    <div className="absolute bottom-10 h-10 w-full max-w-lg px-5">
      <form onSubmit={handleSubmit}>
        <div className="flex w-full items-center overflow-hidden rounded-[12px] border-[3px] bg-white shadow">
          <input
            className=" h-full flex-1 px-5 py-2 pr-0 text-neutral-800 outline-none"
            type="text"
            placeholder="Enter your message..."
            onChange={(e) => setInput(e.target.value)}
            value={input}
            disabled={isLoading}
          />
          <div className="flex h-full items-center justify-center px-4">
            <button type="submit" disabled={isLoading}>
              <IoSend className="text-blue-400 transition-colors hover:text-blue-500" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}