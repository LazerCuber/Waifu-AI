"use client";

import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useState } from "react";
import type { Live2DModel as Live2DModelType } from "pixi-live2d-display/cubism4";
import { useAtom } from "jotai";
import { lastMessageAtom, isLoadingAtom } from "~/atoms/ChatAtom";

declare global {
  interface Window {
    PIXI: typeof PIXI;
  }
}
if (typeof window !== "undefined") {
  window.PIXI = PIXI;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function Model() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<Live2DModelType | null>(null);
  const [lastMessage] = useAtom(lastMessageAtom);
  const [isLoading] = useAtom(isLoadingAtom);
  const [isLipSyncing, setIsLipSyncing] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!canvasRef.current) return;

      if (window) {
        const { Live2DModel } = await import("pixi-live2d-display/cubism4");

        const app = new PIXI.Application({
          view: canvasRef.current,
          transparent: true,
          height: window.innerHeight,
        });

        const model: Live2DModelType = await Live2DModel.from("/model/vanilla.model3.json");
        modelRef.current = model;

        app.stage.addChild(model);
        model.anchor.set(0.5, 0.78);

        let scale;
        if (app.view.width / app.view.height > model.width / model.height) {
          scale = app.view.height / model.height;
        } else {
          scale = app.view.width / model.width;
        }

        model.scale.set(scale * 1);
        model.position.set(app.view.width / 2, app.view.height * 0.85);
      }
    };

    void init();
  }, []);

  useEffect(() => {
    const lipSync = async () => {
      if (lastMessage && lastMessage.role === 'assistant' && modelRef.current && !isLoading) {
        setIsLipSyncing(true);
        const duration = lastMessage.content.length * 50; // Adjust this value to control lip sync duration

        const startTime = Date.now();
        const animate = () => {
          if (modelRef.current && Date.now() - startTime < duration) {
            const openness = Math.sin((Date.now() - startTime) / 100) * 0.5 + 0.5;
            (modelRef.current.internalModel.coreModel as any).setParameterValueById('ParamMouthOpenY', openness);
            requestAnimationFrame(animate);
          } else {
            if (modelRef.current) {
              (modelRef.current.internalModel.coreModel as any).setParameterValueById('ParamMouthOpenY', 0);
            }
            setIsLipSyncing(false);
          }
        };

        animate();
      }
    };

    lipSync();
  }, [lastMessage, isLoading]);

  return <canvas ref={canvasRef}></canvas>;
}