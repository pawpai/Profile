"use strict";

(() => {
  const canvas = document.querySelector("#letter-background");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mouse = { x: 0, y: 0, active: false };
  const camera = { x: 0, y: 0 };

  const beat = { level: 0, average: 0, peak: 0.25 };
  const baseSpeed = 0.7;
  const motion = { speed: baseSpeed };
  let width, height, letters, frame, last = 0;
  let bursts = [];
  const burstCount = 12;
  const maxBurstLetters = 48;
  const burstCooldown = 250;
  let lastBurstTime = -Infinity;
  const randomLetter = () => alphabet[Math.floor(Math.random() * alphabet.length)];

  function createLetter(depth = 0.28 + Math.random() * 3.7) {
    return {
      x: (Math.random() - 0.5) * 4.8 * width / height,
      y: (Math.random() - 0.5) * 4.8,
      z: depth,
      size: 30 + Math.random() * 20,
      speed: 0.12 + Math.random() * 0.11,
      angle: (Math.random() - 0.5) * 0.5,
      spin: (Math.random() - 0.5) * 0.22,
      brightness: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      ox: 0, oy: 0,
      char: randomLetter(),
    };
  }

  function draw(dt) {
    const sample = !reduced.matches && window.backgroundMusic
      ? window.backgroundMusic.sample() : { bass: 0, energy: 0, treble: 0 };
    // Follow bass continuously, including quieter passages and gradual bass rises.
    // An adaptive peak keeps the response useful throughout the entire song.
    const bassFollow = 1 - Math.exp(-dt * (sample.bass > beat.level ? 9 : 6));
    beat.level += (sample.bass - beat.level) * bassFollow;
    beat.average += (beat.level - beat.average) * (1 - Math.exp(-dt * 1.4));
    beat.peak += (Math.max(0.18, sample.bass) - beat.peak)
      * (1 - Math.exp(-dt * (sample.bass > beat.peak ? 8 : 0.35)));
    const audible = Math.max(0, beat.level - 0.025);
    const bassDrive = Math.min(1, audible / Math.max(0.15, beat.peak - 0.025));
    const accent = Math.min(1, Math.max(0, beat.level - beat.average)
      / Math.max(0.12, beat.peak - beat.average));
    const hasCurve = Number.isFinite(sample.speed);
    const targetSpeed = hasCurve ? sample.speed : baseSpeed + bassDrive * 1.8 + accent * bassDrive * 2.2;
    // The offline curve is already smoothed; track it closely without another long delay.
    const easeSpeed = 1 - Math.exp(-dt * (hasCurve ? 18 : targetSpeed > motion.speed ? 6 : 5));
    const speedChange = (targetSpeed - motion.speed) * easeSpeed;
    const maxChange = dt * (hasCurve ? 6.4 : 5);
    motion.speed += Math.max(-maxChange, Math.min(maxChange, speedChange));
    if (Math.abs(targetSpeed - baseSpeed) < 0.001 && Math.abs(motion.speed - baseSpeed) < 0.001) {
      motion.speed = baseSpeed;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const follow = 1 - Math.exp(-dt * 3);
    camera.x += ((mouse.active ? (mouse.x / width - 0.5) * 28 : 0) - camera.x) * follow;
    camera.y += ((mouse.active ? (mouse.y / height - 0.5) * 20 : 0) - camera.y) * follow;
    const unit = height * 0.7;

    for (const letter of letters) {
      letter.z -= letter.speed * dt * motion.speed;
      letter.y += dt * 0.035 * motion.speed;
      letter.phase += dt * 0.3 * motion.speed;
      letter.angle += letter.spin * dt * motion.speed;
      letter.ox *= Math.exp(-dt * 2.8);
      letter.oy *= Math.exp(-dt * 2.8);
      if (letter.z < 0.24) Object.assign(letter, createLetter(3.8));
    }

    // Paint distant letters first to preserve the sense of depth.
    letters.sort((a, b) => b.z - a.z);
    for (const letter of letters) {
      const scale = 1 / letter.z;
      const x = width / 2 + (letter.x + Math.sin(letter.phase) * 0.025) * unit * scale - camera.x * scale;
      const y = height / 2 + letter.y * unit * scale - camera.y * scale;
      if (x < -160 || x > width + 160 || y < -160 || y > height + 160) continue;
      const dx = x + letter.ox - mouse.x;
      const dy = y + letter.oy - mouse.y;
      const distance = Math.hypot(dx, dy);
      const influence = mouse.active ? Math.max(0, 1 - distance / 170) : 0;
      letter.ox += dx / (distance || 1) * influence * 240 * dt;
      letter.oy += dy / (distance || 1) * influence * 240 * dt;
      const depthOpacity = Math.pow(Math.max(0, 1 - letter.z / 4.2), 1.7);
      const fadeIn = Math.min(1, (4 - letter.z) / 0.5);
      const fadeOut = Math.min(1, (letter.z - 0.24) / 0.18);
      // Keep the character's face and silhouette legible through the letter field.
      const centerWeight = Math.exp(-(((x - width / 2) / (width * 0.24)) ** 2
        + ((y - height * 0.46) / (height * 0.4)) ** 2));
      const opacity = Math.min(0.95, depthOpacity * letter.brightness + influence * 0.55)
        * fadeIn * fadeOut * (1 - centerWeight * 0.6);
      const size = letter.size * scale;
      ctx.save();
      ctx.translate(x + letter.ox, y + letter.oy);
      ctx.rotate(letter.angle);
      ctx.font = `300 ${size}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, opacity)})`;
      // A slight soft edge on the nearest letters mimics depth of field.
      ctx.shadowColor = `rgba(255,255,255,${opacity * 0.5})`;
      ctx.shadowBlur = Math.max(0, size - 48) * 0.07 + influence * 5;
      ctx.fillText(letter.char, 0, 0);
      ctx.restore();
    }

    bursts = bursts.filter(particle => particle.age < particle.life);
    for (const particle of bursts) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-dt * 1.3);
      particle.vy *= Math.exp(-dt * 1.3);
      particle.vy += dt * 35;
      particle.angle += particle.spin * dt;
      const progress = Math.min(1, particle.age / particle.life);
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle);
      ctx.font = `300 ${particle.size * (1 - progress * 0.25)}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = `rgba(255,255,255,${Math.pow(1 - progress, 1.5) * 0.95})`;
      ctx.shadowColor = "rgba(255,255,255,0.3)";
      ctx.shadowBlur = 5 * (1 - progress);
      ctx.fillText(particle.char, 0, 0);
      ctx.restore();
    }
  }

  function animate(time) {
    draw(last ? Math.min((time - last) / 1000, 0.05) : 0);
    last = time;
    frame = requestAnimationFrame(animate);
  }
  function restart() {
    cancelAnimationFrame(frame);
    last = 0;
    if (document.hidden) return;
    if (reduced.matches) draw(0);
    else frame = requestAnimationFrame(animate);
  }
  function resize() {
    width = innerWidth;
    height = Math.max(1, innerHeight);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    letters = Array.from({ length: Math.min(300, Math.max(100, Math.floor(width * height / 4000))) }, () => createLetter());
    bursts = [];
    restart();
  }
  window.addEventListener("pointermove", event => {
    mouse.active = event.pointerType !== "touch" && !reduced.matches;
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }, { passive: true });
  const clearMouse = () => { mouse.active = false; };
  document.documentElement.addEventListener("pointerleave", clearMouse);
  window.addEventListener("pointercancel", clearMouse);
  window.addEventListener("blur", clearMouse);
  window.addEventListener("pointerdown", event => {
    if (event.target?.closest?.(".music-control")) return;
    if (reduced.matches || document.hidden || event.button !== 0) return;
    const now = performance.now();
    bursts = bursts.filter(particle => particle.age < particle.life);
    if (now - lastBurstTime < burstCooldown || bursts.length + burstCount > maxBurstLetters) return;
    lastBurstTime = now;
    for (let i = 0; i < burstCount; i++) {
      const direction = i / burstCount * Math.PI * 2 + Math.random() * 0.2;
      const speed = 90 + Math.random() * 220;
      bursts.push({
        x: event.clientX, y: event.clientY,
        vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
        size: 16 + Math.random() * 22,
        angle: (Math.random() - 0.5) * 0.8,
        spin: (Math.random() - 0.5) * 3,
        age: 0, life: 1 + Math.random() * 0.5,
        char: randomLetter(),
      });
    }
  }, { passive: true });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", restart);
  reduced.addEventListener("change", () => {
    clearMouse();
    camera.x = camera.y = 0;

    beat.level = beat.average = 0;
    beat.peak = 0.25;
    motion.speed = baseSpeed;
    bursts = [];
    restart();
  });
  resize();
})();

