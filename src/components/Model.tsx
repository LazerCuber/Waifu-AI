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
  const lastMouseMoveRef = useRef(0);
  const targetPositionRef = useRef({ x: 0, y: 0 });
  const currentPositionRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const updateModelSize = useCallback(() => {
    const model = modelRef.current;
    const app = appRef.current;
    if (model && app?.screen) {
      const scale = Math.min(app.screen.width / model.width, app.screen.height / model.height);
      model.scale.set(scale);
      model.position.set(app.screen.width / 2, app.screen.height * 0.85);
    }
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    const rect = appRef.current?.view.getBoundingClientRect();
    if (rect) {
      targetPositionRef.current = {
        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2 * SENSITIVITY,
        y: -(((event.clientY - rect.top) / rect.height - 0.5) * 2 * SENSITIVITY),
      };
      lastMouseMoveRef.current = Date.now();
    }
  }, []);

  const updateHeadPosition = useCallback(() => {
    const model = modelRef.current;
    if (model) {
      const now = Date.now();
      const timeSinceLastMove = now - lastMouseMoveRef.current;
      const factor = timeSinceLastMove > RECENTER_DELAY ? Math.min((timeSinceLastMove - RECENTER_DELAY) / 2000, 1) : 0;
      const target = {
        x: targetPositionRef.current.x * (1 - factor),
        y: targetPositionRef.current.y * (1 - factor),
      };

      currentPositionRef.current.x += (target.x - currentPositionRef.current.x) * SMOOTHNESS;
      currentPositionRef.current.y += (target.y - currentPositionRef.current.y) * SMOOTHNESS;
      model.internalModel.focusController?.focus(currentPositionRef.current.x, currentPositionRef.current.y);
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
      if (!canvasRef.current) return;

      const app = new PIXI.Application({
        view: canvasRef.current,
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

  return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh' }} />;
});

export default Model;