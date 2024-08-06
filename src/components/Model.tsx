"use client";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useCallback, memo } from "react";
import { useAtomValue } from "jotai";
import { lastMessageAtom } from "~/atoms/ChatAtom";

if (typeof window !== "undefined") (window as any).PIXI = PIXI;

const SENSITIVITY = 0.95, SMOOTHNESS = 0.1, RECENTER_DELAY = 1000;
let Live2DModel: any;

const preloadModules = async () => {
  Live2DModel = (await import("pixi-live2d-display/cubism4")).Live2DModel;
};

const Model: React.FC = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastMessage = useAtomValue(lastMessageAtom);
  const modelRef = useRef<any>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const mouseMoveRef = useRef({ last: 0, target: { x: 0, y: 0 }, current: { x: 0, y: 0 } });
  const animationFrameRef = useRef<number | null>(null);

  const updateModelSize = useCallback(() => {
    const model = modelRef.current;
    const app = appRef.current;
    if (model && app) {
      const scale = Math.min(app.screen.width / model.width, app.screen.height / model.height);
      model.scale.set(scale);
      model.position.set(app.screen.width / 2, app.screen.height * 0.85);
    }
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    const rect = appRef.current?.view.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = event;
      mouseMoveRef.current.target = {
        x: ((clientX - rect.left) / rect.width - 0.5) * 2 * SENSITIVITY,
        y: -(((clientY - rect.top) / rect.height - 0.5) * 2 * SENSITIVITY),
      };
      mouseMoveRef.current.last = Date.now();
    }
  }, []);

  const updateHeadPosition = useCallback(() => {
    const model = modelRef.current;
    if (model) {
      const now = Date.now();
      const factor = Math.max(0, Math.min((now - mouseMoveRef.current.last - RECENTER_DELAY) / 2000, 1));
      const targetX = mouseMoveRef.current.target.x * (1 - factor);
      const targetY = mouseMoveRef.current.target.y * (1 - factor);
      mouseMoveRef.current.current.x += (targetX - mouseMoveRef.current.current.x) * SMOOTHNESS;
      mouseMoveRef.current.current.y += (targetY - mouseMoveRef.current.current.y) * SMOOTHNESS;
      model.internalModel.focusController?.focus(mouseMoveRef.current.current.x, mouseMoveRef.current.current.y);
    }
  }, []);

  const animateFrame = useCallback(() => {
    updateHeadPosition();
    appRef.current?.renderer.render(appRef.current.stage);
    animationFrameRef.current = requestAnimationFrame(animateFrame);
  }, [updateHeadPosition]);

  useEffect(() => {
    (async () => {
      await preloadModules();
      const app = new PIXI.Application({
        view: canvasRef.current!,
        backgroundAlpha: 0,
        resizeTo: window,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      appRef.current = app;

      modelRef.current = await Live2DModel.from("/model/vanilla/vanilla.model3.json");
      app.stage.addChild(modelRef.current);
      modelRef.current.anchor.set(0.5, 0.78);
      updateModelSize();

      window.addEventListener('mousemove', onMouseMove, { passive: true });
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
    })();
  }, [onMouseMove, updateModelSize, animateFrame]);

  useEffect(() => {
    if (lastMessage?.role === 'assistant' && modelRef.current) {
      const duration = lastMessage.content.length * 50;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY',
          elapsed < duration ? Math.sin(elapsed / 100) * 0.5 + 0.5 : 0);
        if (elapsed < duration) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [lastMessage]);

  return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh', display: 'block' }} />;
});

export default Model;