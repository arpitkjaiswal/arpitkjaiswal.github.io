import { FramePacer } from './motion-core.mjs?v=20261110-layout';

const checkpoints = [
  { x: 0.79, y: 0.29 },
  { x: 0.22, y: 0.35 },
  { x: 0.59, y: 0.76 },
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class SignalFlight {
  constructor(projects) {
    this.projects = projects.slice(0, checkpoints.length);
    this.reset();
  }

  reset() {
    this.status = 'ready';
    this.x = 0.48;
    this.y = 0.55;
    this.vx = 0;
    this.vy = 0;
    this.index = 0;
    this.elapsed = 0;
    this.charge = 1;
    this.boostRemaining = 0;
    this.assist = false;
    this.waypoint = null;
  }

  get target() {
    return this.index < this.projects.length ? checkpoints[this.index] : null;
  }

  launch() {
    this.reset();
    if (this.target) this.status = 'flying';
  }

  boost() {
    if (this.status !== 'flying' || this.charge < 0.35 || this.boostRemaining > 0) return false;
    this.charge -= 0.35;
    this.boostRemaining = 0.6;
    return true;
  }

  step(seconds, horizontal, vertical) {
    if (this.status !== 'flying' || seconds <= 0) return null;
    this.elapsed += seconds;
    if (horizontal || vertical) {
      this.assist = false;
      this.waypoint = null;
    }
    let remaining = Math.min(seconds, 0.35);
    // Bound each movement step so a slow frame cannot skip a beacon.
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 30);
      remaining -= dt;
      const collected = this.move(dt, horizontal, vertical);
      if (collected !== null) return collected;
    }
    return null;
  }

  move(dt, horizontal, vertical) {
    const destination = this.assist ? this.target : this.waypoint;
    if (destination) {
      horizontal = destination.x - this.x;
      vertical = destination.y - this.y;
      if (!this.assist && Math.hypot(horizontal, vertical) < 0.033) {
        this.waypoint = null;
        horizontal = 0;
        vertical = 0;
      }
    }
    const direction = Math.hypot(horizontal, vertical) || 1;
    const speed = this.boostRemaining > 0 ? 0.78 : 0.37;
    const ease = 1 - Math.exp(-10 * dt);
    this.vx += (horizontal / direction * speed - this.vx) * ease;
    this.vy += (vertical / direction * speed - this.vy) * ease;
    this.x = clamp(this.x + this.vx * dt, 0.055, 0.945);
    this.y = clamp(this.y + this.vy * dt, 0.075, 0.925);
    this.charge = Math.min(1, this.charge + dt * 0.19);
    this.boostRemaining = Math.max(0, this.boostRemaining - dt);

    if (Math.hypot(this.target.x - this.x, this.target.y - this.y) > 0.063) return null;
    const collected = this.index++;
    this.vx *= 0.3;
    this.vy *= 0.3;
    this.assist = false;
    this.waypoint = null;
    if (!this.target) this.status = 'complete';
    return collected;
  }
}

const directionKeys = {
  a: [-1, 0], ArrowLeft: [-1, 0], d: [1, 0], ArrowRight: [1, 0],
  w: [0, -1], ArrowUp: [0, -1], s: [0, 1], ArrowDown: [0, 1],
};
const formatTime = seconds => `${seconds.toFixed(2)} s`;
const bestKey = 'arpit.signal-run.best.v1';
const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
let openFlight;

export function showSignalRun(projects, getBudget) {
  openFlight ??= mountSignalRun(getBudget);
  openFlight(projects);
}

function mountSignalRun(getBudget) {
  const $ = selector => document.querySelector(selector);
  const dialog = $('#flightDialog');
  const field = $('#flightField');
  const canvas = $('#flightCanvas');
  const context = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const keys = new Set();
  const pacer = new FramePacer(30);
  const stars = Array.from({ length: 110 }, (_, index) => ({
    x: (index * 0.618034) % 1,
    y: (index * 0.414214) % 1,
    size: index % 13 === 0 ? 2 : 1,
    alpha: 0.18 + (index % 6) * 0.085,
  }));
  const trail = [];
  let flight = new SignalFlight([]);
  let width = 1;
  let height = 1;
  let frame = 0;
  let last = null;
  let lastTelemetry = 0;
  let heading = -Math.PI / 2;
  let flash = null;
  let opener;
  let beacons = [];
  let routeRows = [];
  let best = null;
  let routeKey = bestKey;
  const sound = cue => emit('portfolio:sfx', { cue });
  const effectsAllowed = () => !motion.matches && !document.documentElement.classList.contains('motion-paused');

  function status(message) {
    $('#flightStatus').textContent = message;
  }

  function telemetry() {
    $('#flightTime').textContent = formatTime(flight.elapsed);
    $('#flightCharge').value = flight.charge;
    $('#flightBoost').disabled = flight.status !== 'flying' || flight.charge < 0.35 || flight.boostRemaining > 0;
    const label = flight.assist ? 'Cancel assist' : 'Flight assist';
    if ($('#flightAssist').textContent !== label) {
      $('#flightAssist').textContent = label;
      $('#flightAssist').setAttribute('aria-pressed', String(flight.assist));
    }
    const driveState = flight.boostRemaining > 0 ? 'Boost engaged' : flight.charge < 0.35 ? 'Recharging' : 'Ready';
    if ($('#flightDriveState').textContent !== driveState) $('#flightDriveState').textContent = driveState;
  }

  function paintControls() {
    const running = flight.status === 'flying';
    const paused = flight.status === 'paused';
    const complete = flight.status === 'complete';
    dialog.dataset.flightState = flight.status;
    $('#flightLaunch').hidden = running || paused;
    $('#flightLaunch').disabled = flight.projects.length === 0;
    $('#flightLaunch').textContent = complete ? 'Play again' : 'Launch run';
    $('#flightControls').hidden = !running && !paused;
    $('#flightPause').textContent = paused ? 'Resume run' : 'Pause run';
    $('#flightAssist').disabled = !running;
    $('#flightTarget').textContent = complete ? 'Route cleared' : flight.projects[flight.index]?.name ?? 'No signals available';
    field.style.setProperty('--flight-tint', flight.projects[flight.index]?.color ?? '#b9f986');
    $('#flightCount').textContent = `${flight.index} / ${flight.projects.length}`;
    $('#flightBest').textContent = best === null ? '—' : formatTime(best);
    for (const [index, beacon] of beacons.entries()) {
      beacon.disabled = !running || index !== flight.index;
      beacon.dataset.signal = index < flight.index ? 'recovered' : index === flight.index ? 'target' : 'waiting';
      routeRows[index].dataset.signal = beacon.dataset.signal;
      routeRows[index].querySelector('.flight-route-state').textContent = index < flight.index ? 'Recovered' : index === flight.index ? 'Target' : 'Queued';
    }
    telemetry();
  }

  function draw() {
    if (!context || !dialog.open || document.hidden) return;
    const ctx = context;
    const animated = effectsAllowed();
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = star.size === 2 ? '#d3b9ff' : '#a6d8ff';
      const x = (star.x * width - (animated ? flight.x * 14 : 0) + width) % width;
      const y = (star.y * height - (animated ? flight.y * 10 : 0) + height) % height;
      ctx.fillRect(x, y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    const x = flight.x * width;
    const y = flight.y * height;
    const course = flight.waypoint || flight.target;
    if (course) {
      ctx.beginPath();
      ctx.setLineDash([3, 8]);
      ctx.moveTo(x, y);
      ctx.lineTo(course.x * width, course.y * height);
      ctx.strokeStyle = '#9be9ff70';
      ctx.stroke();
      ctx.setLineDash([]);
      if (flight.waypoint) {
        ctx.beginPath();
        ctx.arc(course.x * width, course.y * height, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (animated) {
      if (flight.boostRemaining > 0) {
        const dx = Math.cos(heading);
        const dy = Math.sin(heading);
        ctx.strokeStyle = '#c5abff';
        ctx.globalAlpha = Math.min(0.45, flight.boostRemaining * 1.4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let index = 0; index < 22; index++) {
          const star = stars[index];
          const sx = star.x * width;
          const sy = star.y * height;
          const length = 15 + (index % 5) * 8;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - dx * length, sy - dy * length);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.lineCap = 'round';
      for (let index = 1; index < trail.length; index++) {
        const opacity = index / trail.length;
        ctx.globalAlpha = opacity * 0.44;
        ctx.strokeStyle = flight.boostRemaining ? '#ccaeff' : '#56e8ff';
        ctx.lineWidth = 1 + opacity * 4;
        ctx.beginPath();
        ctx.moveTo(trail[index - 1].x, trail[index - 1].y);
        ctx.lineTo(trail[index].x, trail[index].y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (flash) {
        const age = (performance.now() - flash.at) / 700;
        if (age < 1) {
          ctx.globalAlpha = (1 - age) * 0.75;
          ctx.strokeStyle = '#d7ff8f';
          ctx.lineWidth = 2;
          for (let index = 0; index < 3; index++) {
            ctx.beginPath();
            ctx.arc(flash.x * width, flash.y * height, 12 + age * 65 + index * 8, 0, 2 * Math.PI);
            ctx.stroke();
          }
          ctx.fillStyle = '#d7ff8f';
          for (let index = 0; index < 14; index++) {
            const angle = index * Math.PI * 2 / 14;
            const distance = 14 + age * (38 + index % 4 * 11);
            ctx.fillRect(flash.x * width + Math.cos(angle) * distance, flash.y * height + Math.sin(angle) * distance, 2, 2);
          }
          ctx.globalAlpha = 1;
        } else flash = null;
      }
    }

    if (Math.hypot(flight.vx, flight.vy) > 0.01) heading = Math.atan2(flight.vy * height, flight.vx * width);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#14374d';
    ctx.strokeStyle = '#d9f7ff';
    ctx.beginPath();
    ctx.moveTo(21, 0);
    ctx.lineTo(-11, -13);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-11, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = flight.boostRemaining ? '#d4a5ff' : '#66e9ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(flight.boostRemaining ? -29 : -17, 0);
    ctx.stroke();
    ctx.restore();
  }

  function fit() {
    if (!dialog.open) return;
    width = Math.max(1, field.clientWidth);
    height = Math.max(1, field.clientHeight);
    const dpr = Math.min(devicePixelRatio || 1, getBudget().dpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    trail.length = 0;
    draw();
  }

  function stopFrame() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
    pacer.reset();
    keys.clear();
  }

  function finish() {
    if (best === null || flight.elapsed < best) {
      best = flight.elapsed;
      try { localStorage.setItem(routeKey, String(best)); } catch { /* Storage is optional. */ }
    }
    const results = flight.projects.map(project => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${project.name} ↗`;
      button.dataset.handAction = `project:${project.id}`;
      button.addEventListener('click', () => emit('portfolio:project', { id: project.id }));
      return button;
    });
    $('#flightBuilds').replaceChildren(...results);
    $('#flightResults').hidden = false;
    status(`Run complete in ${formatTime(flight.elapsed)}. Your recovered builds are ready to open.`);
    paintControls();
    $('#flightLaunch').focus({ preventScroll: true });
  }

  function tick(now) {
    frame = 0;
    if (!dialog.open || document.hidden || flight.status !== 'flying') return;
    if (pacer.due(now)) {
      const seconds = last === null ? 0 : (now - last) / 1000;
      last = now;
      let horizontal = 0;
      let vertical = 0;
      for (const key of keys) {
        horizontal += directionKeys[key][0];
        vertical += directionKeys[key][1];
      }
      const collected = flight.step(seconds, horizontal, vertical);
      if (collected !== null) {
        flash = { ...checkpoints[collected], at: now };
        sound(flight.status === 'complete' ? 'finish' : 'signal');
        if (flight.status === 'complete') {
          trail.length = 0;
          flash = null;
          finish();
        }
        else {
          status(`Recovered ${flight.projects[collected].name}. Fly to ${flight.projects[flight.index].name} next.`);
          paintControls();
        }
      }
      if (effectsAllowed() && Math.hypot(flight.vx, flight.vy) > 0.02) {
        trail.push({ x: flight.x * width, y: flight.y * height });
        if (trail.length > 17) trail.shift();
      } else trail.shift();
      if (now - lastTelemetry > 90) {
        lastTelemetry = now;
        telemetry();
      }
      draw();
    }
    if (flight.status === 'flying') frame = requestAnimationFrame(tick);
  }

  function launch() {
    flight.launch();
    if (flight.status !== 'flying') return;
    stopFrame();
    trail.length = 0;
    flash = null;
    heading = -Math.PI / 2;
    $('#flightResults').hidden = true;
    status(`Fly to ${flight.projects[0].name}. Tap the beacon for flight assist or steer with the arrow keys.`);
    paintControls();
    field.focus({ preventScroll: true });
    sound('launch');
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    if (flight.status !== 'flying') return;
    flight.status = 'paused';
    stopFrame();
    status('Run paused. Resume whenever you are ready.');
    paintControls();
  }

  function togglePause() {
    if (flight.status === 'flying') pause();
    else if (flight.status === 'paused') {
      flight.status = 'flying';
      status(`Resumed. Fly to ${flight.projects[flight.index].name}.`);
      paintControls();
      field.focus({ preventScroll: true });
      frame = requestAnimationFrame(tick);
    }
  }

  function assist(enabled) {
    if (flight.status !== 'flying') return;
    keys.clear();
    flight.waypoint = null;
    flight.assist = enabled;
    status(enabled ? `Flight assist is guiding you to ${flight.projects[flight.index].name}.` : 'Manual steering. Use the arrow keys or tap a beacon.');
    telemetry();
    if (enabled) sound('lock');
  }

  function boost() {
    if (flight.boost()) {
      telemetry();
      sound('boost');
    }
  }

  function syncSound() {
    const source = $('#soundToggle');
    const enabled = source.getAttribute('aria-pressed') === 'true';
    const button = $('#flightSound');
    button.textContent = enabled ? 'Sound on' : 'Sound off';
    button.setAttribute('aria-pressed', String(enabled));
    button.disabled = source.disabled;
  }

  $('#flightLaunch').addEventListener('click', launch);
  $('#flightPause').addEventListener('click', togglePause);
  $('#flightAssist').addEventListener('click', () => assist(!flight.assist));
  $('#flightBoost').addEventListener('click', boost);
  $('#flightSound').addEventListener('click', () => $('#soundToggle').click());
  $('#flightStopInputs').addEventListener('click', () => $('#stopAllInputs').click());
  field.addEventListener('click', event => {
    if (flight.status !== 'flying' || event.target.closest('button')) return;
    const rect = field.getBoundingClientRect();
    flight.assist = false;
    keys.clear();
    flight.waypoint = {
      x: clamp((event.clientX - rect.left) / rect.width, 0.055, 0.945),
      y: clamp((event.clientY - rect.top) / rect.height, 0.075, 0.925),
    };
    status(`Course plotted. The next signal is ${flight.projects[flight.index].name}.`);
    telemetry();
    sound('lock');
  });
  document.addEventListener('portfolio:inputs', () => { $('#flightStopInputs').hidden = $('#inputBeacon').hidden; });
  new MutationObserver(syncSound).observe($('#soundToggle'), { attributes: true, attributeFilter: ['aria-pressed', 'disabled'] });
  new ResizeObserver(fit).observe(field);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('pagehide', stopFrame);
  dialog.addEventListener('close', () => {
    stopFrame();
    if (!document.querySelector('dialog[open]')) {
      const target = opener?.getClientRects().length ? opener : $('#deckCommand');
      target?.focus({ preventScroll: true });
    }
  });
  dialog.addEventListener('keydown', event => {
    if (flight.status !== 'flying' || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (Object.hasOwn(directionKeys, key)) {
      event.preventDefault();
      if (flight.assist) assist(false);
      keys.add(key);
    } else if (!event.repeat && (key === 'b' || (key === ' ' && event.target === field))) {
      event.preventDefault();
      boost();
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));

  return projects => {
    if (dialog.open) return;
    opener = document.activeElement;
    document.querySelectorAll('dialog[open]').forEach(panel => panel.close());
    flight = new SignalFlight(projects);
    routeKey = `${bestKey}:${flight.projects.length}`;
    try {
      const value = Number(localStorage.getItem(routeKey));
      best = Number.isFinite(value) && value > 0 ? value : null;
    } catch { best = null; }
    trail.length = 0;
    flash = null;
    heading = -Math.PI / 2;
    beacons = flight.projects.map((project, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'flight-beacon';
      button.textContent = String(index + 1).padStart(2, '0');
      button.setAttribute('aria-label', `Fly to ${project.name}`);
      button.style.left = `${checkpoints[index].x * 100}%`;
      button.style.top = `${checkpoints[index].y * 100}%`;
      button.style.setProperty('--beacon-color', project.color);
      button.dataset.handAction = 'flight:press';
      button.addEventListener('click', () => assist(true));
      return button;
    });
    routeRows = flight.projects.map((project, index) => {
      const row = document.createElement('li');
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const name = document.createElement('strong');
      name.textContent = project.name;
      const state = document.createElement('small');
      state.className = 'flight-route-state';
      row.append(number, name, state);
      return row;
    });
    $('#flightBeacons').replaceChildren(...beacons);
    $('#flightRoute').replaceChildren(...routeRows);
    $('#flightResults').hidden = true;
    $('#flightStopInputs').hidden = $('#inputBeacon').hidden;
    status(flight.projects.length ? 'Ready for launch. Fly at your own pace.' : 'No spotlight builds are available right now.');
    syncSound();
    paintControls();
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    fit();
    $('#flightLaunch').focus({ preventScroll: true });
  };
}
