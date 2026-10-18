"use strict";

// Discord IDs must stay strings to preserve all digits.
const discordUserId = "705415549454385192";

(() => {
  const card = document.querySelector(".discord-profile");
  if (!card) return;
  const name = document.querySelector("#profile-name");
  const username = document.querySelector("#profile-username");
  const status = document.querySelector("#profile-status");
  const avatar = document.querySelector("#profile-avatar");
  const link = document.querySelector("#profile-link");
  const labels = { online: "ออนไลน์", idle: "ไม่อยู่", dnd: "ห้ามรบกวน", offline: "ออฟไลน์" };
  let timer, controller, active = true;
  let avatarKey = "2f50a2faddc2bd7c0e80b8af5c1e40f3";
  const setStatus = (value, text = labels[value]) => {
    card.dataset.presence = value;
    status.textContent = text;
  };
  if (!/^\d{17,20}$/.test(discordUserId)) return;

  link.href = `https://discord.com/users/${discordUserId}`;
  link.hidden = false;
  avatar.addEventListener("error", () => {
    if (avatar.src.endsWith("/assets/images/discord-avatar.webp")) { avatar.hidden = true; return; }
    avatar.src = "./assets/images/discord-avatar.webp";
    avatarKey = null;
  });
  async function refresh() {
    clearTimeout(timer);
    if (!active || document.hidden) return;
    controller?.abort();
    const request = new AbortController();
    controller = request;
    const timeout = setTimeout(() => request.abort(), 8000);
    let delay = 15000;
    try {
      const response = await fetch(`https://api.lanyard.rest/v1/users/${discordUserId}`, {
        signal: request.signal, cache: "no-store", credentials: "omit",
      });
      if (!response.ok) throw new Error("Presence unavailable");
      const result = await response.json();
      if (!active || document.hidden || controller !== request) return;
      if (!result.success || !result.data?.discord_user) throw new Error("Account not connected");
      const data = result.data;
      const user = data.discord_user;
      if (user.id !== discordUserId) throw new Error("Unexpected account");
      name.textContent = user.global_name || user.display_name || user.username || "Discord profile";
      username.textContent = user.username ? `@${user.username}` : "Discord";
      if (avatarKey !== user.avatar) {
        avatarKey = user.avatar;
        avatar.hidden = false;
        avatar.src = `https://api.lanyard.rest/${discordUserId}.png?avatar=${encodeURIComponent(user.avatar || "default")}`;
      }
      const presence = Object.hasOwn(labels, data.discord_status) ? data.discord_status : "unknown";
      setStatus(presence, labels[presence] || "ไม่ทราบสถานะ");
    } catch {
      if (!active || document.hidden || controller !== request) return;
      setStatus("unknown", "เชื่อมต่อสถานะไม่ได้");
      delay = 30000;
    } finally {
      clearTimeout(timeout);
      if (active && !document.hidden && controller === request) timer = setTimeout(refresh, delay);
    }
  }
  const stop = () => {
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    setStatus("unknown", "กำลังเชื่อมต่อ…");
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else void refresh();
  });
  window.addEventListener("pagehide", () => { active = false; stop(); });
  window.addEventListener("pageshow", () => { if (!active) { active = true; void refresh(); } });
  setStatus("unknown", "กำลังเชื่อมต่อ…");
  void refresh();
})();
