"use client";

import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useState, useCallback } from "react";
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

const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);

interface Vector2D {
  x: number;
  y: number;
}

const SENSITIVITY = 0.95;
const SMOOTHNESS = 0.1;
const RECENTER_DELAY = 1000;

export default function Model() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<Live2DModelType | null>(null);
  const [lastMessage] = useAtom(lastMessageAtom);
  const [isLoading] = useAtom(isLoadingAtom);
  const [isLipSyncing, setIsLipSyncing] = useState(false);
  const lastMouseMoveRef = useRef<number>(0);
  const targetPositionRef = useRef<Vector2D>({ x: 0, y: 0 });
  const currentPositionRef = useRef<Vector2D>({ x: 0, y: 0 });
  const appRef = useRef<PIXI.Application | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateModelSize = useCallback(() => {
    const model = modelRef.current;
    const app = appRef.current;
    if (!model || !app || !app.screen) return;
    const scale = Math.min(app.screen.width / model.width, app.screen.height / model.height);
    model.scale.set(scale * 1);
    model.position.set(app.screen.width / 2, app.screen.height * 0.85);
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    const model = modelRef.current;
    const app = appRef.current;
    if (!model || !app || !app.screen || !app.view) return;

    const rect = app.view.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const normalizedY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    targetPositionRef.current = {
      x: normalizedX * SENSITIVITY,
      y: -normalizedY * SENSITIVITY
    };

    lastMouseMoveRef.current = Date.now();
  }, []);

  const updateHeadPosition = useCallback(() => {
    const model = modelRef.current;
    if (!model) return;

    const now = Date.now();
    const timeSinceLastMove = now - lastMouseMoveRef.current;

    let target: Vector2D;
    if (timeSinceLastMove > RECENTER_DELAY) {
      const t = Math.min((timeSinceLastMove - RECENTER_DELAY) / 2000, 1);
      const easedT = easeOutQuint(t);
      target = {
        x: targetPositionRef.current.x * (1 - easedT),
        y: targetPositionRef.current.y * (1 - easedT)
      };
    } else {
      target = targetPositionRef.current;
    }

    currentPositionRef.current.x += (target.x - currentPositionRef.current.x) * SMOOTHNESS;
    currentPositionRef.current.y += (target.y - currentPositionRef.current.y) * SMOOTHNESS;

    model.internalModel.focusController?.focus(currentPositionRef.current.x, currentPositionRef.current.y);

    animationFrameRef.current = requestAnimationFrame(updateHeadPosition);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!canvasRef.current || typeof window === "undefined") return;

      const { Live2DModel } = await import("pixi-live2d-display/cubism4");

      const app = new PIXI.Application({
        view: canvasRef.current,
        transparent: true,
        resizeTo: window,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
      });
      appRef.current = app;

      const model: Live2DModelType = await Live2DModel.from("/model/vanilla/vanilla.model3.json");
      modelRef.current = model;

      app.stage.addChild(model);
      model.anchor.set(0.5, 0.78);

      updateModelSize();

      app.view.addEventListener('mousemove', onMouseMove);
      updateHeadPosition();

      const handleResize = () => {
        if (!app) return;
        app.renderer.resize(window.innerWidth, window.innerHeight);
        updateModelSize();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        app.view.removeEventListener('mousemove', onMouseMove);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        app.destroy(true, { children: true, texture: true, baseTexture: true });
      };
    };

    init();
  }, [onMouseMove, updateHeadPosition, updateModelSize]);

  useEffect(() => {
    let animationId: number;
    const lipSync = () => {
      if (lastMessage && lastMessage.role === 'assistant' && modelRef.current && !isLoading) {
        setIsLipSyncing(true);
        const duration = lastMessage.content.length * 50;
        const startTime = Date.now();

        const animate = () => {
          if (modelRef.current && Date.now() - startTime < duration) {
            const openness = Math.sin((Date.now() - startTime) / 100) * 0.5 + 0.5;
            (modelRef.current.internalModel.coreModel as any).setParameterValueById('ParamMouthOpenY', openness);
            animationId = requestAnimationFrame(animate);
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

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [lastMessage, isLoading]);

  return <canvas ref={canvasRef}></canvas>;
}