"use strict";

window.siteEntered = false;

(() => {
  const entry = document.querySelector("#entry-screen");
  const main = document.querySelector(".page-center");
  const controls = document.querySelector(".music-control");
  const letters = document.querySelector("#letter-background");
  if (!entry) return;

  entry.addEventListener("click", () => {
    if (window.siteEntered) return;
    window.siteEntered = true;
    entry.disabled = true;
    entry.setAttribute("aria-hidden", "true");
    entry.inert = true;
    for (const element of [main, controls, letters]) {
      if (!element) continue;
      element.hidden = false;
      element.inert = false;
    }
    document.body.classList.remove("is-locked");
    document.body.classList.add("has-entered");
    // Dispatch synchronously inside the click gesture to allow audible playback.
    window.dispatchEvent(new Event("site:enter"));
    document.querySelector(".carousel-viewport")?.focus({ preventScroll: true });
    const remove = () => entry.remove();
    entry.addEventListener("transitionend", event => {
      if (event.target === entry && event.propertyName === "opacity") remove();
    });
    setTimeout(remove, 900);
  });
})();
