"use client";

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import ChatInput from "~/components/ChatInput";

// Dynamic imports without Suspense to minimize blocking
const ChatterBox = dynamic(() => import("~/components/ChatterBox"), { ssr: false });
const Model = dynamic(() => import("~/components/Model"), { ssr: false });

const Background = () => (
  <div className="absolute inset-0 z-0 overflow-hidden">
    <div className="background-container">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="background-image"></div>
      ))}
    </div>
  </div>
);

export default function Page() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/live2dcubismcore.min.js';
    script.async = true; // Load script asynchronously
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script); // Cleanup on unmount
    };
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <Background />
      <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
        <ChatterBox />
        <Model />
        <ChatInput />
      </div>
    </main>
  );
}