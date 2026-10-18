"use strict";

const socialProfiles = {
  instagram: "https://www.instagram.com/pxw_pxi_/?hl=en",
  steam: "https://steamcommunity.com/profiles/76561198283913394/",
};

(() => {
  for (const [platform, address] of Object.entries(socialProfiles)) {
    if (!address) continue;
    try {
      const url = new URL(address);
      const allowed = platform === "instagram" ? ["instagram.com", "www.instagram.com"] : ["steamcommunity.com", "www.steamcommunity.com"];
      if (url.protocol !== "https:" || !allowed.includes(url.hostname) || url.username || url.password) continue;
      const parts = url.pathname.split("/").filter(Boolean);
      const handle = platform === "instagram" ? parts[0] : parts[1];
      if (!handle || (platform === "steam" && !["id", "profiles"].includes(parts[0]))) continue;
      const link = document.querySelector(`#${platform}-link`);
      link.href = url.href;
      link.removeAttribute("aria-disabled");
      link.removeAttribute("tabindex");
      document.querySelector(`#${platform}-username`).textContent = platform === "instagram" ? `@${handle}` : handle;
    } catch { /* Keep unconfigured links disabled. */ }
  }

  const carousel = document.querySelector(".profile-carousel");
  if (!carousel) return;
  const viewport = carousel.querySelector(".carousel-viewport");
  const track = carousel.querySelector(".carousel-track");
  const slides = [...track.children];
  const selectors = [...carousel.querySelectorAll("[data-slide]")];
  const announcement = carousel.querySelector("#carousel-announcement");
  let index = 1;
  let drag = null;
  let blockClick = false;

  function render(position) {
    const spacing = viewport.clientWidth < 480 ? 72 : 95;
    slides.forEach((slide, i) => {
      const offset = Math.max(-1.5, Math.min(1.5, i - position));
      const distance = Math.abs(offset);
      slide.style.setProperty("--slide-x", `${offset * spacing}%`);
      slide.style.setProperty("--slide-y", `${distance * 10}px`);
      slide.style.setProperty("--slide-z", `${-distance * 180}px`);
      slide.style.setProperty("--slide-angle", `${offset * -36}deg`);
      slide.style.setProperty("--slide-opacity", String(Math.max(0, 1 - distance * 0.72)));
      slide.style.setProperty("--slide-blur", `${distance * 0.7}px`);
      slide.style.zIndex = String(10 - Math.round(distance * 4));
    });
  }

  function show(requested, announce = true) {
    index = Math.max(0, Math.min(slides.length - 1, requested));
    if (slides.some((slide, i) => i !== index && slide.contains(document.activeElement))) {
      viewport.focus({ preventScroll: true });
    }
    render(index);
    slides.forEach((slide, i) => {
      slide.inert = i !== index;
      slide.setAttribute("aria-hidden", String(i !== index));
    });
    selectors.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    if (announce) announcement.textContent = slides[index].getAttribute("aria-label");
  }
  selectors.forEach(button => button.addEventListener("click", () => show(Number(button.dataset.slide))));
  carousel.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      show(index + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  viewport.addEventListener("pointerdown", event => {
    blockClick = false;
    if (event.button !== 0 || !event.isPrimary) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: 0, horizontal: false, startedAt: event.timeStamp };
  });
  viewport.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.horizontal) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 7) { drag = null; return; }
      if (Math.abs(dx) < 7) return;
      drag.horizontal = true;
      viewport.setPointerCapture(event.pointerId);
      carousel.classList.add("is-dragging");
    }
    drag.offset = dx;
    blockClick = true;
    const resistance = (index === 0 && dx > 0) || (index === slides.length - 1 && dx < 0) ? 0.22 : 1;
    const progress = Math.max(-1, Math.min(1, dx * resistance / Math.max(1, viewport.clientWidth)));
    render(index - progress);
  });
  function finish(event, cancel = false) {
    if (!drag || drag.id !== event.pointerId) return;
    const offset = event.clientX - drag.x;
    const horizontal = drag.horizontal;
    const elapsed = Math.max(1, event.timeStamp - drag.startedAt);
    const threshold = Math.min(54, Math.max(32, viewport.clientWidth * 0.12));
    const quickSwipe = horizontal && Math.abs(offset) >= 24 && elapsed <= 360 && Math.abs(offset) / elapsed >= 0.55;
    drag = null;
    carousel.classList.remove("is-dragging");
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    let direction = !cancel && (Math.abs(offset) > threshold || quickSwipe) ? (offset < 0 ? 1 : -1) : 0;
    if (!cancel && !horizontal) {
      const bounds = viewport.getBoundingClientRect();
      const position = (event.clientX - bounds.left) / bounds.width;
      if (position < 0.25) direction = -1;
      else if (position > 0.75) direction = 1;
    }
    if (cancel) blockClick = false;
    else if (horizontal) setTimeout(() => { blockClick = false; }, 500);
    show(index + direction);
  }
  viewport.addEventListener("pointerup", event => finish(event));
  viewport.addEventListener("pointercancel", event => finish(event, true));
  viewport.addEventListener("lostpointercapture", event => finish(event, true));
  viewport.addEventListener("dragstart", event => event.preventDefault());
  viewport.addEventListener("click", event => {
    if (blockClick) { event.preventDefault(); event.stopPropagation(); blockClick = false; }
  }, true);
  window.addEventListener("resize", () => {
    drag = null;
    carousel.classList.remove("is-dragging");
    show(index, false);
  });
  show(1, false);
})();
