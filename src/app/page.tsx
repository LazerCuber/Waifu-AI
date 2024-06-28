"use client";

import { Suspense, lazy } from 'react';
import dynamic from 'next/dynamic';
import ChatInput from "~/components/ChatInput";

// Dynamically import components with no SSR
const ChatterBox = dynamic(() => import("~/components/ChatterBox"), { ssr: false });
const Model = dynamic(() => import("~/components/Model"), { ssr: false });

// Lazy load the Script component
const LazyScript = lazy(() => import('next/script'));

// Separate background component
const Background = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="background-container">
        <div className="background-image"></div>
        <div className="background-image"></div>
        <div className="background-image"></div>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <Background />
      <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
        <Suspense fallback={<div>Loading script...</div>}>
          <LazyScript src="/live2dcubismcore.min.js" />
        </Suspense>
        <Suspense fallback={<div>Loading components...</div>}>
          <ChatterBox />
          <Model />
        </Suspense>
        <ChatInput />
      </div>
    </main>
  );
}