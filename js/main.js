/* ============================================================
   朱雀 — Tokyocompass LP
   コンパス演出：
   1) 読み込み時、針が勢いよく回転し、バネ物理で揺れて静止
   2) 以降はカーソル方向を指して揺れる（idle時はゆったり回遊）
============================================================ */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 幕（ローディング）---------- */
  const curtain = document.getElementById("curtain");
  window.addEventListener("load", () => {
    setTimeout(() => curtain.classList.add("curtain--open"), reduceMotion ? 0 : 900);
    setTimeout(() => curtain.remove(), 2200);
  });

  /* ---------- 方位目盛の生成 ---------- */
  const ticks = document.getElementById("ticks");
  const NS = "http://www.w3.org/2000/svg";
  const CX = 512, CY = 512;
  for (let i = 0; i < 72; i++) {
    const deg = i * 5;
    const major = deg % 45 === 0;
    const north = deg === 0;
    const rOuter = 200;
    const rInner = major ? 178 : 190;
    const rad = (deg - 90) * Math.PI / 180;
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", CX + Math.cos(rad) * rInner);
    line.setAttribute("y1", CY + Math.sin(rad) * rInner);
    line.setAttribute("x2", CX + Math.cos(rad) * rOuter);
    line.setAttribute("y2", CY + Math.sin(rad) * rOuter);
    line.setAttribute("stroke-width", north ? 6 : major ? 4 : 2);
    line.setAttribute("stroke-linecap", "round");
    line.classList.add(north ? "tick--north" : major ? "tick--major" : "tick--minor");
    ticks.appendChild(line);
  }

  /* ---------- 針のバネ物理 ---------- */
  const compass = document.getElementById("compass");
  const needle = document.getElementById("needle");
  const rings = document.getElementById("rings");
  const ticksGroup = document.getElementById("ticks");
  const bearingDeg = document.getElementById("bearingDeg");
  const bearingDir = document.getElementById("bearingDir");

  const DIRS = [
    ["北 / N", 0], ["北東 / NE", 45], ["東 / E", 90], ["南東 / SE", 135],
    ["南 / S", 180], ["南西 / SW", 225], ["西 / W", 270], ["北西 / NW", 315],
  ];

  let angle = 0;          // 現在の針の角度
  let velocity = reduceMotion ? 0 : 1900; // 初速：勢いよく回る（deg/s）
  let target = 0;         // 目標角度
  let pointerActive = false;
  let idlePhase = Math.random() * Math.PI * 2;
  let lastTime = null;

  // マウス／タッチで針を導く
  const updateTargetFromPoint = (clientX, clientY) => {
    const rect = compass.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const raw = Math.atan2(clientX - cx, -(clientY - cy)) * 180 / Math.PI;
    // 最短経路で回るよう、現在角度に近い表現に正規化
    let t = raw;
    while (t - angle > 180) t -= 360;
    while (t - angle < -180) t += 360;
    target = t;
    pointerActive = true;
  };

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") updateTargetFromPoint(e.clientX, e.clientY);
  });
  compass.addEventListener("pointerdown", (e) => updateTargetFromPoint(e.clientX, e.clientY));
  window.addEventListener("pointerleave", () => { pointerActive = false; });

  const tick = (now) => {
    if (lastTime === null) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (!pointerActive) {
      // idle：ゆらゆらと回遊する目標
      idlePhase += dt * 0.35;
      const wander = Math.sin(idlePhase) * 50 + Math.sin(idlePhase * 2.7) * 14;
      let t = wander;
      while (t - angle > 180) t -= 360;
      while (t - angle < -180) t += 360;
      target = t;
    }

    // 減衰バネ（本物のコンパスの揺れ）
    const STIFFNESS = 14;
    const DAMPING = 2.1;
    const accel = (target - angle) * STIFFNESS - velocity * DAMPING;
    velocity += accel * dt;
    angle += velocity * dt;

    needle.style.transform = `rotate(${angle}deg)`;
    // 外環と目盛は逆方向へ僅かに漂う（浮遊感）
    rings.style.transform = `rotate(${-angle * 0.04}deg)`;
    ticksGroup.style.transform = `rotate(${-angle * 0.08}deg)`;

    // 方位表示
    const norm = ((angle % 360) + 360) % 360;
    bearingDeg.textContent = `${String(Math.round(norm)).padStart(3, "0")}°`;
    let nearest = DIRS[0];
    let best = 360;
    for (const d of DIRS) {
      const diff = Math.min(Math.abs(norm - d[1]), 360 - Math.abs(norm - d[1]));
      if (diff < best) { best = diff; nearest = d; }
    }
    bearingDir.textContent = nearest[0];

    requestAnimationFrame(tick);
  };

  if (reduceMotion) {
    bearingDeg.textContent = "000°";
    bearingDir.textContent = "北 / N";
  } else {
    requestAnimationFrame(tick);
  }

  /* ---------- スクロール出現 ---------- */
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 90}ms`;
    observer.observe(el);
  });
})();
