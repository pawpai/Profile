"use strict";

(() => {
  const media = document.querySelector("#background-audio");
  const toggle = document.querySelector("#music-toggle");
  const label = document.querySelector("#music-label");
  const status = document.querySelector("#music-status");
  const meter = document.querySelector(".music-meter");
  const loopBridge = document.querySelector(".scene-loop-bridge");
  if (!media || !toggle) return;

  let wantedSound = true;
  let backgrounded = document.hidden;
  let attempt = 0;
  let loopFrame = null;
  const silence = { bass: 0, energy: 0, treble: 0, speed: 0.7 };
  media.volume = 0.45;
  media.loop = true;
  const soundPlaying = () => !media.paused && !media.muted && !backgrounded;
  function updateLoopBlend() {
    if (!Number.isFinite(media.duration) || media.duration <= 0) return;
    const remaining = Math.max(0, media.duration - media.currentTime);
    const progress = Math.max(0, Math.min(1, 1 - remaining / 0.36));
    const blend = progress * progress * (3 - 2 * progress);
    if (loopBridge) loopBridge.style.opacity = String(blend);
    // Short audio fades soften the cut without leaving a silent tail.
    const fade = Math.min(1, media.currentTime / 0.055, remaining / 0.055);
    media.volume = 0.45 * Math.max(0, fade);
  }
  function cancelLoopBlend() {
    if (loopFrame === null) return;
    if (media.cancelVideoFrameCallback) media.cancelVideoFrameCallback(loopFrame);
    else cancelAnimationFrame(loopFrame);
    loopFrame = null;
  }
  function animateLoopBlend() {
    loopFrame = null;
    updateLoopBlend();
    if (media.paused || backgrounded || document.hidden) return;
    loopFrame = media.requestVideoFrameCallback
      ? media.requestVideoFrameCallback(animateLoopBlend)
      : requestAnimationFrame(animateLoopBlend);
  }
  function updateButton() {
    const playing = soundPlaying();
    const text = playing ? "ปิดเสียงวิดีโอ" : "เปิดเสียงวิดีโอ";
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.setAttribute("aria-label", text);
    toggle.title = text;
    label.textContent = text;
    if (!playing) meter.style.setProperty("--level", "0");
  }
  function at(values, position) {
    const index = Math.min(values.length - 1, Math.max(0, position));
    const low = Math.floor(index), high = Math.min(low + 1, values.length - 1);
    return values[low] + (values[high] - values[low]) * (index - low);
  }
  // This curve was decoded from this video's own soundtrack. Native playback keeps
  // video, audio and the time-indexed letter motion together across every loop.
  window.backgroundMusic = {
    sample() {
      if (media.paused || backgrounded || document.hidden) return silence;
      const curve = window.musicCurve;
      if (!curve?.speed?.length) return silence;
      const position = media.currentTime * curve.rate;
      const bass = curve.bass ? at(curve.bass, position) : 0;
      if (soundPlaying()) meter.style.setProperty("--level", bass.toFixed(3));
      return { bass, energy: bass, treble: 0, speed: at(curve.speed, position) };
    },
  };
  async function startPlayback() {
    if (!window.siteEntered || backgrounded || document.hidden) return;
    const id = ++attempt;
    status.textContent = "";
    media.muted = !wantedSound;
    try {
      await media.play();
    } catch (error) {
      if (id !== attempt) return;
      if (error.name === "NotAllowedError" && wantedSound) {
        media.muted = true;
        status.textContent = "คลิกหรือแตะหน้าเว็บเพื่อเปิดเสียงวิดีโอ";
        try { await media.play(); }
        catch { status.textContent = "กดปุ่มมุมซ้ายบนเพื่อเริ่มวิดีโอ"; }
      } else {
        status.textContent = "เล่นวิดีโอไม่ได้ กรุณาลองอีกครั้ง";
      }
    } finally {
      if (backgrounded || document.hidden) media.pause();
      if (id === attempt) updateButton();
    }
  }
  toggle.addEventListener("click", () => {
    if (soundPlaying()) {
      wantedSound = false;
      ++attempt;
      media.muted = true;
      updateButton();
    } else {
      wantedSound = true;
      void startPlayback();
    }
  });
  function unlock(event) {
    if (!window.siteEntered || !wantedSound || soundPlaying() || backgrounded || document.hidden
      || event.target?.closest?.(".music-control")) return;
    if (event.type === "keydown" && (event.repeat || !["Enter", " "].includes(event.key))) return;
    if (event.type === "pointerdown" && event.button !== 0) return;
    void startPlayback();
  }
  document.addEventListener("pointerdown", unlock, { passive: true });
  document.addEventListener("keydown", unlock);
  media.addEventListener("play", () => {
    if (!window.siteEntered || backgrounded || document.hidden) media.pause();
    cancelLoopBlend();
    if (!media.paused) animateLoopBlend();
    updateButton();
  });
  media.addEventListener("pause", () => { cancelLoopBlend(); updateButton(); });
  media.addEventListener("seeked", updateLoopBlend);
  media.addEventListener("loadedmetadata", updateLoopBlend);
  media.addEventListener("volumechange", updateButton);
  media.addEventListener("error", () => {
    status.textContent = "โหลดวิดีโอไม่ได้ กรุณาตรวจสอบไฟล์วิดีโอ";
    updateButton();
  });
  function setForeground(visible) {
    if (!visible) {
      backgrounded = true;
      ++attempt;
      media.pause();
      updateButton();
    } else if (backgrounded) {
      backgrounded = false;
      void startPlayback();
    }
  }
  document.addEventListener("visibilitychange", () => setForeground(!document.hidden));
  window.addEventListener("pagehide", () => setForeground(false));
  window.addEventListener("pageshow", () => setForeground(!document.hidden));
  window.addEventListener("site:enter", () => { void startPlayback(); });
  media.pause();
})();
