"use strict";

const panel = document.querySelector(".glass-panel");
const stage = document.querySelector(".glass-stage");
const pointerEffects = window.matchMedia(
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
);

if (panel && stage) {
  const current = { x: 50, y: 30, tiltX: 0, tiltY: 0, glow: 0 };
  const target = { ...current };
  let frame = 0;
  let last = 0;
  let bounds;

  const render = () => {
    panel.style.setProperty("--light-x", `${current.x}%`);
    panel.style.setProperty("--light-y", `${current.y}%`);
    panel.style.setProperty("--tilt-x", `${current.tiltX}deg`);
    panel.style.setProperty("--tilt-y", `${current.tiltY}deg`);
    panel.style.setProperty("--light-strength", current.glow);
  };

  const animate = (time) => {
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60;
    last = time;
    const follow = 1 - Math.exp(-dt * 6);
    let moving = false;
    for (const key of Object.keys(current)) {
      current[key] += (target[key] - current[key]) * follow;
      if (Math.abs(target[key] - current[key]) < 0.001) current[key] = target[key];
      else moving = true;
    }
    render();
    frame = moving ? requestAnimationFrame(animate) : 0;
    if (!moving) last = 0;
  };

  const start = () => {
    if (!frame) frame = requestAnimationFrame(animate);
  };

  const resetPanel = () => {
    // Fade the highlight where the pointer left, without snapping its position.
    target.x = current.x;
    target.y = current.y;
    target.tiltX = target.tiltY = target.glow = 0;
    if (!pointerEffects.matches || document.hidden) {
      cancelAnimationFrame(frame);
      frame = last = 0;
      Object.assign(current, target);
      render();
    } else start();
    bounds = null;
  };

  // Listen on a stationary wrapper so tilting cannot repeatedly trigger leave/enter.
  stage.addEventListener("pointerenter", () => {
    bounds = stage.getBoundingClientRect();
  });
  stage.addEventListener("pointermove", (event) => {
    if (!pointerEffects.matches || event.pointerType === "touch") return;
    bounds ??= stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    target.x = x * 100;
    target.y = y * 100;
    target.tiltX = (0.5 - y) * 2.4;
    target.tiltY = (x - 0.5) * 2.4;
    target.glow = 1;
    start();
  });
  stage.addEventListener("pointerleave", resetPanel);
  stage.addEventListener("pointercancel", resetPanel);
  pointerEffects.addEventListener("change", resetPanel);
  window.addEventListener("blur", resetPanel);
  window.addEventListener("resize", resetPanel);
  window.addEventListener("scroll", resetPanel, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetPanel();
  });
}
