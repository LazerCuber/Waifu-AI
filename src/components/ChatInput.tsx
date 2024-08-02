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
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const synthesizeSentence = useCallback(async (sentence: string): Promise<AudioBuffer | null> => {
    try {
      const voiceResponse = await fetch("/api/synthasize", {
        method: "POST",
        body: JSON.stringify({ message: { content: sentence, role: "assistant" } }),
        headers: { "Content-Type": "application/json" },
      });
      if (!voiceResponse.ok) {
        throw new Error(`Failed to synthesize sentence: ${voiceResponse.statusText}`);
      }
      const arrayBuffer = await voiceResponse.arrayBuffer();
      return await audioContextRef.current!.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error("Error in synthesizeSentence:", error);
      return null;
    }
  }, []);

  const playSentence = useCallback((audioBuffer: AudioBuffer): Promise<void> => {
    return new Promise((resolve) => {
      if (!audioContextRef.current) {
        resolve();
        return;
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      }

      sourceNodeRef.current = audioContextRef.current.createBufferSource();
      sourceNodeRef.current.buffer = audioBuffer;
      sourceNodeRef.current.connect(audioContextRef.current.destination);

      sourceNodeRef.current.onended = () => resolve();
      sourceNodeRef.current.start();
    });
  }, []);

  const playNextSentence = useCallback(async (): Promise<void> => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const audio = audioQueueRef.current.shift();
    if (audio) {
      await playSentence(audio);
    }

    return playNextSentence();
  }, [playSentence]);

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
        headers: { "Content-Type": "application/json" },
      });
      const textResult = (await textResponse.json()) as CoreMessage;

      setLastMessage(textResult);
      setIsLoading(false);
      setMessages([...newMessages, textResult]);

      if (typeof textResult.content !== 'string') return;

      const sentences = textResult.content.split(/(?<=\.|\?|!)/).map(s => s.trim()).filter(s => s.length > 0);

      for (const sentence of sentences) {
        const audioBuffer = await synthesizeSentence(sentence);
        if (audioBuffer) {
          audioQueueRef.current.push(audioBuffer);
          if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            playNextSentence();
          }
        }
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setIsLoading(false);
    }
  }, [messages, input, setMessages, setLastMessage, setIsLoading, synthesizeSentence, playNextSentence]);

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