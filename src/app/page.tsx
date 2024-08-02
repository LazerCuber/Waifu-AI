"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ChatInput from "~/components/ChatInput";

const ChatterBox = dynamic(() => import("~/components/ChatterBox"), { ssr: false, loading: () => null });
const Model = dynamic(() => import("~/components/Model"), { ssr: false, loading: () => null });

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
  const [live2dLoaded, setLive2dLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/live2dcubismcore.min.js';
    script.defer = true; 
    script.onload = () => setLive2dLoaded(true);
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script); 
    };
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <Background />
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full" style={{ position: 'relative', height: '100vh' }}> 
        <ChatInput />
        <div style={{ height: 'calc(100vh)', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          {live2dLoaded && (
            <>
              <ChatterBox />
              <Model />
            </>
          )}
        </div>
      </div>
    </main>
  );
}