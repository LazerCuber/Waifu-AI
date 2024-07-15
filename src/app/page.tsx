"use client";

import { Suspense, lazy, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ChatInput from "~/components/ChatInput";

const ChatterBox = dynamic(() => import("~/components/ChatterBox"), { 
  ssr: false,
  loading: () => null
});
const Model = dynamic(() => import("~/components/Model"), { 
  ssr: false,
  loading: () => null
});

const LazyScript = lazy(() => import('next/script'));

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <Background />
      <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
        {isClient && (
          <Suspense fallback={null}>
            <LazyScript 
              src="/live2dcubismcore.min.js" 
            />
          </Suspense>
        )}
        <Suspense fallback={null}>
          <ChatterBox />
          <Model />
        </Suspense>
        <ChatInput />
      </div>
    </main>
  );
}