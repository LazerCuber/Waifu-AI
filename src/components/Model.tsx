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

// Improved easing function
function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

interface Vector2D {
  x: number;
  y: number;
}

export default function Model() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<Live2DModelType | null>(null);
  const [lastMessage] = useAtom(lastMessageAtom);
  const [isLoading] = useAtom(isLoadingAtom);
  const [isLipSyncing, setIsLipSyncing] = useState(false);
  const lastMouseMoveRef = useRef<number>(0);
  const targetPositionRef = useRef<Vector2D>({ x: 0, y: 0 });
  const currentPositionRef = useRef<Vector2D>({ x: 0, y: 0 });
  const velocityRef = useRef<Vector2D>({ x: 0, y: 0 });

  useEffect(() => {
    const init = async () => {
      if (!canvasRef.current || typeof window === "undefined") return;

      const { Live2DModel } = await import("pixi-live2d-display/cubism4");

      const app = new PIXI.Application({
        view: canvasRef.current,
        transparent: true,
        height: window.innerHeight,
        width: window.innerWidth,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
      });

      const model: Live2DModelType = await Live2DModel.from("/model/vanilla.model3.json");
      modelRef.current = model;

      app.stage.addChild(model);
      model.anchor.set(0.5, 0.78);

      let scale;
      if (app.screen.width / app.screen.height > model.width / model.height) {
        scale = app.screen.height / model.height;
      } else {
        scale = app.screen.width / model.width;
      }

      model.scale.set(scale * 1);
      model.position.set(app.screen.width / 2, app.screen.height * 0.85);

      const sensitivity = 0.95;
      const smoothness = 0.025; // Adjust this value to change smoothness (lower = smoother)

      const onMouseMove = (event: MouseEvent) => {
        if (!model) return;

        const rect = app.view.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const normalizedX = (mouseX / app.screen.width - 0.5) * 2;
        const normalizedY = (mouseY / app.screen.height - 0.5) * 2;

        targetPositionRef.current = {
          x: normalizedX * sensitivity,
          y: -normalizedY * sensitivity
        };

        lastMouseMoveRef.current = Date.now();
      };

      const updateHeadPosition = () => {
        if (!model) return;

        const now = Date.now();
        const timeSinceLastMove = now - lastMouseMoveRef.current;
        const recenterDelay = 1000;

        let target: Vector2D;
        if (timeSinceLastMove > recenterDelay) {
          const t = Math.min((timeSinceLastMove - recenterDelay) / 2000, 1);
          const easedT = easeOutQuint(t);
          target = {
            x: targetPositionRef.current.x * (1 - easedT),
            y: targetPositionRef.current.y * (1 - easedT)
          };
        } else {
          target = targetPositionRef.current;
        }

        // Calculate new position using smoothing
        currentPositionRef.current.x += (target.x - currentPositionRef.current.x) * smoothness;
        currentPositionRef.current.y += (target.y - currentPositionRef.current.y) * smoothness;

        // Apply the new position
        model.internalModel.focusController.focus(currentPositionRef.current.x, currentPositionRef.current.y);
      };

      app.view.addEventListener('mousemove', onMouseMove);
      app.ticker.add(updateHeadPosition);

      // Ensure the canvas size matches the display size
      app.renderer.resize(window.innerWidth, window.innerHeight);

      // Add window resize listener
      const handleResize = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        if (app.screen.width / app.screen.height > model.width / model.height) {
          scale = app.screen.height / model.height;
        } else {
          scale = app.screen.width / model.width;
        }
        model.scale.set(scale * 1);
        model.position.set(app.screen.width / 2, app.screen.height * 0.85);
      };

      window.addEventListener('resize', handleResize);

      // Clean up function
      return () => {
        window.removeEventListener('resize', handleResize);
        app.view.removeEventListener('mousemove', onMouseMove);
        app.ticker.remove(updateHeadPosition);
        app.destroy(true, { children: true, texture: true, baseTexture: true });
      };
    };

    void init();
  }, []);

  useEffect(() => {
    const lipSync = async () => {
      if (lastMessage && lastMessage.role === 'assistant' && modelRef.current && !isLoading) {
        setIsLipSyncing(true);
        const duration = lastMessage.content.length * 50;

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