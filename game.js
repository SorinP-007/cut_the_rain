const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const shell = document.querySelector(".game-shell");
const welcome = document.querySelector("#welcome");
const gameover = document.querySelector("#gameover");
const instruction = document.querySelector("#instruction");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const livesEl = document.querySelector("#lives");
const finalScoreEl = document.querySelector("#finalScore");
const bestScoreEl = document.querySelector("#bestScore");
const soundButton = document.querySelector("#soundButton");

const words = ["ploaie", "râu", "mare", "nor", "val", "izvor", "ocean", "rouă", "lac", "strop", "abur", "gheață"];
let drops = [], particles = [], trails = [];
let score = 0, combo = 1, lives = 3, playing = false, slicing = false, muted = false;
let ending = false;
let lastSpawn = 0, spawnEvery = 850, lastSlice = 0, startedAt = 0;
let audioCtx;
const animal = { x: 0, y: 0, vx: 1.35, radius: 42, hitFlash: 0 };

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  animal.y = innerHeight - Math.max(58, innerHeight * .075);
  if (!animal.x) animal.x = innerWidth / 2;
}
addEventListener("resize", resize); resize();

function sound(freq = 440, duration = .08, type = "sine") {
  if (muted) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.7, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch {
    muted = true;
    soundButton.textContent = "🔇";
  }
}

class Drop {
  constructor() {
    this.r = 35 + Math.random() * 15;
    this.x = 60 + Math.random() * (innerWidth - 120);
    this.y = innerHeight + this.r * 2;
    this.vx = (Math.random() - .5) * 2.2;
    this.vy = -(10.5 + Math.random() * 4.2);
    this.gravity = .13 + Math.random() * .025;
    this.angle = (Math.random() - .5) * .3;
    this.spin = (Math.random() - .5) * .012;
    this.word = words[Math.floor(Math.random() * words.length)];
    this.hue = 190 + Math.random() * 18;
    this.dead = false;
  }
  update() {
    this.x += this.vx; this.y += this.vy; this.vy += this.gravity; this.angle += this.spin;
    const hitAnimal = this.vy > 0
      && this.y + this.r * 1.15 >= animal.y - animal.radius * .5
      && this.y - this.r < animal.y + animal.radius
      && Math.abs(this.x - animal.x) < animal.radius + this.r * .55;
    if (hitAnimal) {
      this.dead = true;
      animal.hitFlash = 1;
      splash(this.x, animal.y, this.hue, 24);
      missDrop();
      return;
    }
    if (this.y > innerHeight + this.r * 2 && this.vy > 0) {
      this.dead = true;
    }
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    ctx.shadowColor = "rgba(19,181,235,.45)"; ctx.shadowBlur = 22;
    const g = ctx.createLinearGradient(-this.r, -this.r, this.r, this.r);
    g.addColorStop(0, "#87efff"); g.addColorStop(.42, `hsl(${this.hue} 86% 55%)`); g.addColorStop(1, "#0876c7");
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(0, -this.r * 1.25);
    ctx.bezierCurveTo(this.r * .22, -this.r * .75, this.r, -.05 * this.r, this.r, this.r * .42);
    ctx.bezierCurveTo(this.r, this.r * 1.05, this.r * .55, this.r * 1.35, 0, this.r * 1.35);
    ctx.bezierCurveTo(-this.r * .55, this.r * 1.35, -this.r, this.r * 1.05, -this.r, this.r * .42);
    ctx.bezierCurveTo(-this.r, -.05 * this.r, -this.r * .22, -this.r * .75, 0, -this.r * 1.25);
    ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,.68)"; ctx.beginPath(); ctx.ellipse(-this.r*.34, -this.r*.25, this.r*.17, this.r*.34, -.45, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.textAlign = "center"; ctx.font = `800 ${Math.max(14, this.r*.39)}px Nunito`; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(4,25,40,.86)"; ctx.strokeText(this.word, this.x, this.y + this.r * 1.85); ctx.fillStyle = "white"; ctx.fillText(this.word, this.x, this.y + this.r * 1.85); ctx.restore();
  }
}

function spawnDrop() { drops.push(new Drop()); }

function splash(x, y, hue, count = 18) {
  for (let i = 0; i < count; i++) particles.push({
    x, y, vx: (Math.random()-.5)*9, vy: (Math.random()-.7)*9,
    life: 1, size: 3 + Math.random()*7, hue
  });
  if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function cut(drop) {
  drop.dead = true; combo = Date.now() - lastSlice < 900 ? Math.min(combo + 1, 8) : 1; lastSlice = Date.now();
  score += 10 * combo; scoreEl.textContent = score; comboEl.textContent = `×${combo}`;
  sound(320 + combo * 45, .09, "triangle");
  splash(drop.x, drop.y, drop.hue);
}

function missDrop() {
  if (!playing || ending) return;
  lives--; combo = 1; comboEl.textContent = "×1";
  livesEl.textContent = Array.from({length: 3}, (_, i) => i < lives ? "💙" : "🖤").join(" ");
  sound(130, .22, "sawtooth");
  if (lives <= 0) endGame();
}

function startGame() {
  drops = []; particles = []; trails = []; score = 0; combo = 1; lives = 3;
  spawnEvery = 850; startedAt = performance.now(); lastSpawn = performance.now(); ending = false; playing = true;
  animal.x = innerWidth / 2; animal.y = innerHeight - Math.max(58, innerHeight * .075); animal.vx = 1.35; animal.hitFlash = 0;
  scoreEl.textContent = "0"; comboEl.textContent = "×1"; livesEl.textContent = "💙 💙 💙";
  welcome.classList.add("hidden"); gameover.classList.add("hidden"); shell.classList.add("playing");
  instruction.classList.remove("hidden"); setTimeout(() => instruction.classList.add("hidden"), 2200);
  sound(380, .16, "triangle");
}

function endGame() {
  if (ending) return;
  ending = true;
  playing = false; slicing = false; shell.classList.remove("playing");
  drops = [];
  trails = [];
  finalScoreEl.textContent = score;
  const best = Math.max(score, Number(localStorage.getItem("taieApaBest") || 0));
  localStorage.setItem("taieApaBest", best); bestScoreEl.textContent = best;
  gameover.classList.remove("hidden");
}

function pointerPos(e) { return {x: e.clientX, y: e.clientY}; }
canvas.addEventListener("pointerdown", e => {
  if (!playing) return;
  slicing = true;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  trails.push({...pointerPos(e), life: 1});
});
canvas.addEventListener("pointerup", () => slicing = false);
canvas.addEventListener("pointercancel", () => slicing = false);
canvas.addEventListener("pointermove", e => {
  if (!slicing || !playing) return;
  const p = pointerPos(e), prev = trails[trails.length - 1] || p;
  trails.push({...p, life: 1});
  if (trails.length > 30) trails.splice(0, trails.length - 30);
  drops.forEach(d => {
    if (d.dead) return;
    const dx = p.x - prev.x, dy = p.y - prev.y;
    const len2 = dx*dx + dy*dy || 1;
    const t = Math.max(0, Math.min(1, ((d.x-prev.x)*dx + (d.y-prev.y)*dy)/len2));
    const dist = Math.hypot(d.x-(prev.x+t*dx), d.y-(prev.y+t*dy));
    if (dist < d.r * 1.18) cut(d);
  });
});

soundButton.addEventListener("click", () => { muted = !muted; soundButton.textContent = muted ? "🔇" : "🔊"; soundButton.setAttribute("aria-label", muted ? "Pornește sunetul" : "Oprește sunetul"); });
document.querySelector("#startButton").addEventListener("click", startGame);
document.querySelector("#restartButton").addEventListener("click", startGame);

function drawAnimal() {
  if (playing) {
    animal.x += animal.vx;
    if (animal.x < animal.radius + 20 || animal.x > innerWidth - animal.radius - 20) animal.vx *= -1;
  }
  animal.hitFlash = Math.max(0, animal.hitFlash - .045);
  ctx.save();
  ctx.translate(animal.x, animal.y);
  if (animal.hitFlash > 0) {
    ctx.shadowColor = "#ffca3a"; ctx.shadowBlur = 28;
    ctx.scale(1 + animal.hitFlash * .18, 1 + animal.hitFlash * .18);
  }
  ctx.fillStyle = "#6f412c";
  ctx.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = Math.PI + (Math.PI * i / 17);
    const r = i % 2 ? animal.radius * .78 : animal.radius * 1.12;
    const px = Math.cos(a) * r, py = Math.sin(a) * r * .72;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.lineTo(animal.radius * .9, animal.radius * .38);
  ctx.lineTo(-animal.radius * .8, animal.radius * .45);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#d9a16f";
  ctx.beginPath(); ctx.ellipse(animal.radius*.28, 2, animal.radius*.72, animal.radius*.55, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#24150f";
  ctx.beginPath(); ctx.arc(animal.radius*.9, -2, 5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(animal.radius*.38, -animal.radius*.18, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#efc08e";
  ctx.beginPath(); ctx.arc(animal.radius*.08, -animal.radius*.44, 8, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.font = "900 10px Nunito";
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.fillText("PROTEJEAZĂ-MĂ!", 0, animal.radius + 22);
  ctx.restore();
}

function frame(now) {
  requestAnimationFrame(frame);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  if (playing) {
    spawnEvery = Math.max(390, 850 - (now - startedAt) / 80);
    if (now - lastSpawn > spawnEvery) { spawnDrop(); lastSpawn = now; }
  }
  drops.forEach(d => { d.update(); d.draw(); }); drops = drops.filter(d => !d.dead);
  drawAnimal();
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += .18; p.life -= .025;
    ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = `hsl(${p.hue} 90% 64%)`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2); ctx.fill();
  }); particles = particles.filter(p => p.life > 0); ctx.globalAlpha = 1;
  trails.forEach(t => t.life -= .06); trails = trails.filter(t => t.life > 0);
  if (trails.length > 1) {
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowColor = "#7eeaff"; ctx.shadowBlur = 14;
    for (let i=1; i<trails.length; i++) {
      ctx.beginPath(); ctx.moveTo(trails[i-1].x, trails[i-1].y); ctx.lineTo(trails[i].x, trails[i].y);
      ctx.strokeStyle = `rgba(185,247,255,${trails[i].life})`; ctx.lineWidth = 2 + trails[i].life * 6; ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
}
requestAnimationFrame(frame);
