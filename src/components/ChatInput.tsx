"use client";

import type { CoreMessage } from "ai";
import { useAtom } from "jotai";
import { useEffect, useRef, useState, useCallback } from "react";
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const synthesizeSentence = useCallback(async (sentence: string): Promise<ArrayBuffer | null> => {
    const voiceResponse = await fetch("/api/synthasize", {
      method: "POST",
      body: JSON.stringify({ message: { content: sentence, role: "assistant" } }),
      headers: { "Content-Type": "application/json" },
    });
    if (!voiceResponse.ok) {
      console.error("Failed to synthesize sentence:", voiceResponse.statusText);
      return null;
    }
    return await voiceResponse.arrayBuffer();
  }, []);

  const playSentence = useCallback(async (audioBuffer: ArrayBuffer): Promise<void> => {
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
      }, (error) => {
        console.error("Error decoding audio data:", error);
        resolve(); // Continue even if there is an error
      });
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
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
      headers: { "Content-Type": "application/json" },
    });
    const textResult = (await textResponse.json()) as CoreMessage;

    setLastMessage(textResult);
    setIsLoading(false);
    setMessages([...newMessages, textResult]);

    if (typeof textResult.content !== 'string') return;

    const sentences = textResult.content.split(/(?<=\.|\?|!)/).map(s => s.trim()).filter(s => s.length > 0);

    const maxConcurrent = 3;
    let currentIndex = 0;
    const audioQueue: ArrayBuffer[] = [];
    let playingPromise: Promise<void> | null = null;

    const synthesizeAndPlay = async () => {
      while (currentIndex < sentences.length) {
        const sentenceBatch = sentences.slice(currentIndex, currentIndex + maxConcurrent);
        currentIndex += maxConcurrent;

        const audioBatch = await Promise.all(sentenceBatch.map(synthesizeSentence));
        audioQueue.push(...audioBatch.filter(a => a !== null)); // Filter out null responses

        if (!playingPromise) {
          playingPromise = playNextSentence();
        }
      }
    };

    const playNextSentence = async (): Promise<void> => {
      if (audioQueue.length === 0) {
        playingPromise = null;
        return;
      }

      const audio = audioQueue.shift();
      if (audio) {
        await playSentence(audio);
      }

      return playNextSentence();
    };

    synthesizeAndPlay();
  }, [messages, input, setMessages, setLastMessage, setIsLoading, synthesizeSentence, playSentence]);

  return (
    <div className="absolute bottom-10 h-10 w-full max-w-lg px-5">
      <form onSubmit={handleSubmit}>
        <div className="flex w-full items-center overflow-hidden rounded-[12px] border-[3px] bg-white shadow">
          <input
            className="h-full flex-1 px-5 py-2 pr-0 text-neutral-800 outline-none"
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