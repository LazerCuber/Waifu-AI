"use client";

import type { CoreMessage } from "ai";
import { useAtom } from "jotai";
import { useEffect, useRef, useState, useCallback } from "react";
import { IoSend } from "react-icons/io5";
import {
  isLoadingAtom,
  lastMessageAtom,
  messageHistoryAtom,
  displayedTextAtom,
} from "~/atoms/ChatAtom";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default function ChatInput() {
  const [messages, setMessages] = useAtom(messageHistoryAtom);
  const [, setLastMessage] = useAtom(lastMessageAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [, setDisplayedText] = useAtom(displayedTextAtom);

  const [input, setInput] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<{ audio: ArrayBuffer; text: string }[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playSentence = useCallback(async (audio: ArrayBuffer, text: string) => {
    if (!audioContextRef.current) return;

    return new Promise<void>((resolve) => {
      audioContextRef.current!.decodeAudioData(audio, (decodedBuffer) => {
        if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
          sourceNodeRef.current.disconnect();
        }

        sourceNodeRef.current = audioContextRef.current!.createBufferSource();
        sourceNodeRef.current.buffer = decodedBuffer;
        sourceNodeRef.current.connect(audioContextRef.current!.destination);

        setDisplayedText(text);
        sourceNodeRef.current.onended = () => resolve();
        sourceNodeRef.current.start();
      });
    });
  }, [setDisplayedText]);

  const playNextSentence = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const { audio, text } = audioQueueRef.current.shift()!;
    await playSentence(audio, text);
    playNextSentence();
  }, [playSentence]);

  const synthesizeAndQueue = useCallback(async (sentence: string) => {
    try {
      const voiceResponse = await fetch("/api/synthasize", {
        method: "POST",
        body: JSON.stringify({ message: { content: sentence, role: "assistant" } }),
      });
      const audio = await voiceResponse.arrayBuffer();
      audioQueueRef.current.push({ audio, text: sentence });

      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        playNextSentence();
      }
    } catch (error) {
      console.error(`Error synthesizing sentence: ${sentence}`, error);
    }
  }, [playNextSentence]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const newMessages: CoreMessage[] = [
      ...messages,
      { content: input, role: "user" },
    ];

    setMessages(newMessages);
    setInput("");

    try {
      const textResponse = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: newMessages }),
      });
      const textResult = await textResponse.json() as CoreMessage;

      setLastMessage(textResult);
      setMessages([...newMessages, textResult]);

      const sentences = typeof textResult.content === 'string'
        ? textResult.content.split(/(?<=\.|\?|!)/).map(s => s.trim()).filter(s => s.length > 0)
        : [];

      for (const sentence of sentences) {
        await synthesizeAndQueue(sentence);
      }

    } catch (error) {
      console.error("Error in handleSubmit:", error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, input, setMessages, setLastMessage, setIsLoading, synthesizeAndQueue]);

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