// ---- routing ----
const routes = document.querySelectorAll('.route');
const navLinks = document.querySelectorAll('.nav-link');

function showRoute(hash){
  const path = (hash || '#/').replace('#','') || '/';
  const exists = document.querySelector('.route[data-route="'+path+'"]');
  const target = exists ? path : '/';
  routes.forEach(r => r.classList.toggle('is-active', r.dataset.route === target));
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.route === target));
}
window.addEventListener('hashchange', () => showRoute(location.hash));
showRoute(location.hash);

// ---- mobile menu ----
const navToggle = document.getElementById('navToggle');
const primaryNav = document.getElementById('primaryNav');
navToggle.addEventListener('click', () => {
  const isOpen = primaryNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
  navToggle.textContent = isOpen ? '[ CLOSE ]' : '[ NAV ]';
});
navLinks.forEach(l => l.addEventListener('click', () => {
  primaryNav.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.textContent = '[ NAV ]';
}));

// ---- footer year ----
document.getElementById('year').textContent = new Date().getFullYear();

// ---- audio toggle (self-contained low hum via WebAudio, no external file) ----
const audioBtn = document.getElementById('audioToggle');
let audioCtx = null, oscillator = null, gainNode = null, audioOn = false;

audioBtn.addEventListener('click', () => {
  if (!audioOn){
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 55;
    gainNode.gain.value = 0.0001;
    oscillator.connect(gainNode).connect(audioCtx.destination);
    oscillator.start();
    gainNode.gain.linearRampToValueAtTime(0.025, audioCtx.currentTime + 0.4);
    audioOn = true;
  } else {
    if (gainNode) gainNode.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
    if (oscillator) { const osc = oscillator; setTimeout(() => osc.stop(), 350); }
    audioOn = false;
  }
  audioBtn.textContent = 'AUDIO: ' + (audioOn ? 'ON' : 'OFF');
});

// ---- boot-sequence typing in hero terminal ----
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bootLines = [
  ['whoami', 'ARPIT KUMAR JAISWAL'],
  ['role', 'BACKEND ENGINEER — IN TRAINING'],
  ['base', 'MANIPAL, INDIA'],
  ['edu', 'B.TECH IT, MIT MANIPAL — 2028'],
  ['focus', 'DISTRIBUTED SYSTEMS · COMPETITIVE PROGRAMMING · AI PRODUCTS'],
  ['status', 'SHIPPING TOWARD SDE ROLES — TARGET 2028']
];

const term = document.getElementById('bootLines');

function buildLine(cmd, out){
  const wrap = document.createElement('div');
  wrap.className = 'term-line';
  const promptEl = document.createElement('div');
  promptEl.innerHTML = '<span class="term-prompt">guest@arpitkjaiswal:~$</span> ' + cmd;
  const outEl = document.createElement('div');
  outEl.className = 'term-out';
  outEl.textContent = out;
  wrap.appendChild(promptEl);
  wrap.appendChild(outEl);
  return wrap;
}

function bootInstant(){
  bootLines.forEach(([c, o]) => term.appendChild(buildLine(c, o)));
}

function bootType(){
  let i = 0;
  function next(){
    if (i >= bootLines.length){
      const cur = document.createElement('span');
      cur.className = 'cursor-blink';
      term.appendChild(cur);
      return;
    }
    const [c, o] = bootLines[i];
    term.appendChild(buildLine(c, o));
    i++;
    setTimeout(next, 220);
  }
  next();
}

if (reduceMotion){ bootInstant(); } else { bootType(); }
