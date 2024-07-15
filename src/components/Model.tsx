"use client";

import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useCallback } from "react";
import type { Live2DModel as Live2DModelType } from "pixi-live2d-display/cubism4";
import { useAtom } from "jotai";
import { lastMessageAtom, isLoadingAtom } from "~/atoms/ChatAtom";

if (typeof window !== "undefined") {
  (window as any).PIXI = PIXI;
}

const SENSITIVITY = 0.95;
const SMOOTHNESS = 0.1;
const RECENTER_DELAY = 1000;

const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);

interface Vector2D {
  x: number;
  y: number;
}

export default function Model() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastMessage] = useAtom(lastMessageAtom);
  const [isLoading] = useAtom(isLoadingAtom);

  const modelRef = useRef<Live2DModelType | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const lastMouseMoveRef = useRef<number>(0);
  const targetPositionRef = useRef<Vector2D>({ x: 0, y: 0 });
  const currentPositionRef = useRef<Vector2D>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const updateModelSize = useCallback(() => {
    const model = modelRef.current;
    const app = appRef.current;
    if (!model || !app?.screen) return;

    const scale = Math.min(app.screen.width / model.width, app.screen.height / model.height);
    model.scale.set(scale);
    model.position.set(app.screen.width / 2, app.screen.height * 0.85);
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    const app = appRef.current;
    if (!app?.view) return;

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
  }, []);

  const animateFrame = useCallback(() => {
    updateHeadPosition();
    appRef.current?.render();
    animationFrameRef.current = requestAnimationFrame(animateFrame);
  }, [updateHeadPosition]);

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
        powerPreference: "high-performance",
        backgroundColor: 0x00000000,
      });
      appRef.current = app;

      const model: Live2DModelType = await Live2DModel.from("/model/vanilla/vanilla.model3.json");
      modelRef.current = model;

      app.stage.addChild(model);
      model.anchor.set(0.5, 0.78);

      updateModelSize();
      window.addEventListener('mousemove', onMouseMove);
      animateFrame();

      const handleResize = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        updateModelSize();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', onMouseMove);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        app.destroy(true, { children: true, texture: true, baseTexture: true });
      };
    };

    init();
  }, [onMouseMove, updateModelSize, animateFrame]);

  useEffect(() => {
    const lipSync = () => {
      if (lastMessage?.role === 'assistant' && modelRef.current && !isLoading) {
        const duration = lastMessage.content.length * 50;
        const startTime = Date.now();

        const animate = () => {
          const model = modelRef.current;
          if (!model) return;

          if (Date.now() - startTime < duration) {
            const openness = Math.sin((Date.now() - startTime) / 100) * 0.5 + 0.5;
            (model.internalModel.coreModel as any).setParameterValueById('ParamMouthOpenY', openness);
            requestAnimationFrame(animate);
          } else {
            (model.internalModel.coreModel as any).setParameterValueById('ParamMouthOpenY', 0);
          }
        };

        animate();
      }
    };

    lipSync();
  }, [lastMessage, isLoading]);

  return <canvas ref={canvasRef}></canvas>;
}