'use strict';
(() => {
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const root = document.documentElement;
  const portfolio = window.PORTFOLIO;
  const projects = portfolio?.projects || [];
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = id => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const repoURL = project => `https://github.com/${portfolio.username}/${project.repo}${project.sourcePath || ''}`;
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Browsing without storage is supported. */ } }
  };
  let toastTimer;
  function toast(message) {
    const node = $('#toast');
    clearTimeout(toastTimer);
    node.textContent = message;
    node.classList.add('visible');
    toastTimer = setTimeout(() => node.classList.remove('visible'), 3300);
  }

  const soundCues = {
    boot: { notes: [262, 392, 659, 1047], spacing: 0.075, duration: 0.32 },
    lock: { notes: [680, 990], spacing: 0.048, duration: 0.11, level: 0.07 },
    warp: { sweep: { from: 168, to: 54, duration: 0.44, level: 0.22 }, air: 0.4 },
    discovery: { notes: [392, 523, 784], spacing: 0.08, duration: 0.38, air: 0.23 },
    chapter: { notes: [440, 587], spacing: 0.055, duration: 0.22, level: 0.055 },
    launch: { sweep: { from: 52, to: 166, duration: 0.55, level: 0.22 }, notes: [196, 392], spacing: 0.12, air: 0.54 },
    boost: { sweep: { from: 66, to: 212, duration: 0.34, level: 0.24 }, air: 0.34 },
    signal: { notes: [494, 740, 988], spacing: 0.065, duration: 0.28, air: 0.16 },
    finish: { notes: [262, 392, 523, 659, 1047], spacing: 0.092, duration: 0.48, air: 0.6 },
  };

  // One opt-in audio bus for notes and procedurally synthesized effects.
  const audio = {
    context: null, master: null, enabled: false, active: new Set(), noiseBuffer: null,
    lastLock: -Infinity, speechActive: false,
    async toggle() {
      if (this.enabled) {
        this.enabled = false;
        this.silence();
        if (this.context?.state === 'running') await this.context.suspend();
      } else {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) { toast('This browser does not support Web Audio. The visuals still work.'); return; }
        try {
          if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContext();
            this.master = this.context.createGain();
            this.master.gain.value = 0.32;
            this.master.connect(this.context.destination);
            this.noiseBuffer = null;
          }
          await this.context.resume();
          this.enabled = this.context.state === 'running';
          this.cue('boot');
        } catch { this.enabled = false; toast('Sound could not start. Try the sound button again.'); }
      }
      syncSoundControls();
    },
    canPlay() {
      return this.enabled && this.context?.state === 'running' && !document.hidden && !this.speechActive &&
        $('#voiceToggle').getAttribute('aria-pressed') !== 'true';
    },
    envelope(source, start, duration, volume, filter) {
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.022);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      if (filter) source.connect(filter).connect(gain);
      else source.connect(gain);
      gain.connect(this.master);
      source.onended = () => {
        this.active.delete(source);
        source.disconnect();
        filter?.disconnect();
        gain.disconnect();
      };
      this.active.add(source);
      source.start(start);
      source.stop(start + duration + 0.025);
    },
    tone(frequency, duration = 0.65, volume = 0.14, delay = 0, { to = frequency, type = 'sine' } = {}) {
      if (!this.canPlay() || this.active.size >= 28) return;
      const oscillator = this.context.createOscillator();
      const start = this.context.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (to !== frequency) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
      this.envelope(oscillator, start, duration, volume);
    },
    air(duration) {
      if (!this.canPlay() || this.active.size >= 28) return;
      const ctx = this.context;
      if (!this.noiseBuffer) {
        this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.66), ctx.sampleRate);
        const samples = this.noiseBuffer.getChannelData(0);
        for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 0.9;
      const start = ctx.currentTime;
      filter.frequency.setValueAtTime(460, start);
      filter.frequency.exponentialRampToValueAtTime(2400, start + duration * 0.36);
      filter.frequency.exponentialRampToValueAtTime(290, start + duration);
      this.envelope(source, start, duration, 0.16, filter);
    },
    cue(name) {
      if (!Object.hasOwn(soundCues, name) || !this.canPlay()) return;
      if (name === 'lock') {
        const now = performance.now();
        if (now - this.lastLock < 155) return;
        this.lastLock = now;
      }
      const cue = soundCues[name];
      if (cue.air) this.air(cue.air);
      if (cue.sweep) {
        const { from, to, duration, level } = cue.sweep;
        this.tone(from, duration, level, 0, { to, type: 'triangle' });
        this.tone(from * 2, duration * 0.8, level * 0.4, 0.02, { to: to * 2 });
      }
      cue.notes?.forEach((frequency, index) => this.tone(frequency, cue.duration ?? 0.3, cue.level ?? 0.1, index * cue.spacing, { type: 'triangle' }));
    },
    silence() {
      for (const oscillator of this.active) { try { oscillator.stop(); } catch { /* Already ended. */ } }
      this.active.clear();
    }
  };
  function syncSoundControls() {
    const enabled = audio.enabled;
    const toggle = $('#soundToggle');
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Mute sound' : 'Enable sound');
    toggle.title = enabled ? 'Sound on — click to mute' : 'Sound off — click to enable';
    $('.sound-state', toggle).textContent = enabled ? 'On' : 'Off';
    $('#synthSoundToggle').setAttribute('aria-pressed', String(enabled));
    $('#synthSoundToggle span').textContent = enabled ? 'Sound on · mute' : 'Enable sound';
    $('#synthHint').textContent = enabled ? 'Tap a note or use keys 1–5 while this section is in view.' : 'Tap a note. Sound starts muted.';
  }
  for (const button of [$('#soundToggle'), $('#synthSoundToggle')]) button.addEventListener('click', async () => {
    button.disabled = true;
    try { await audio.toggle(); } finally { button.disabled = false; }
  });
  document.addEventListener('portfolio:sfx', event => audio.cue(event.detail?.cue));
  document.addEventListener('portfolio:speech-output', event => {
    audio.speechActive = event.detail?.active === true;
    if (audio.speechActive) audio.silence();
  });
  document.addEventListener('portfolio:voice-state', event => {
    if (event.detail?.state === 'listening' || event.detail?.state === 'starting') audio.silence();
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('a,button');
    if (!target || target.closest('.note-pads, .deck-portal, .flight-beacon')) return;
    if (!['soundToggle', 'synthSoundToggle', 'deckSound', 'flightSound', 'flightLaunch', 'flightBoost', 'deckOpenTarget'].includes(target.id)) audio.tone(660, 0.09, 0.035);
  });

  // A small set of site-wide preferences. Nothing is required from storage.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = reducedMotion.matches || storage.get('arpit.motion') === 'paused';
  let palette = ['lime','coral','ice'].includes(storage.get('arpit.palette')) ? storage.get('arpit.palette') : 'lime';
  root.dataset.palette = palette;
  let theme = {};
  function readTheme() {
    const css = getComputedStyle(root);
    theme = { accent: css.getPropertyValue('--accent').trim(), rgb: css.getPropertyValue('--accent-rgb').trim() };
  }
  readTheme();
  function syncMotion() {
    root.classList.toggle('motion-paused', motionPaused);
    const button = $('#motionToggle');
    button.setAttribute('aria-pressed', String(motionPaused));
    button.setAttribute('aria-label', motionPaused ? 'Resume animations' : 'Pause animations');
    button.title = motionPaused ? 'Resume animations' : 'Pause animations';
    button.innerHTML = motionPaused ? '<span aria-hidden="true" style="font-size:14px">▷</span>' : icon('pause');
  }
  syncMotion();
  $('#motionToggle').addEventListener('click', () => {
    motionPaused = !motionPaused;
    storage.set('arpit.motion', motionPaused ? 'paused' : 'running');
    syncMotion();
    redraw();
    scheduleFrame();
    toast(motionPaused ? 'Animations paused. Take your time.' : 'A little motion, restored.');
  });
  reducedMotion.addEventListener?.('change', event => {
    if (event.matches) { motionPaused = true; syncMotion(); redraw(); }
  });
  document.addEventListener('portfolio:palette',event=>{const value=event.detail?.value;if(!['lime','coral','ice'].includes(value))return;palette=value;root.dataset.palette=palette;storage.set('arpit.palette',palette);readTheme();redraw();});
  $('#paletteToggle').addEventListener('click', () => {
    palette = ['lime','coral','ice'][(['lime','coral','ice'].indexOf(palette) + 1) % 3];
    root.dataset.palette = palette;
    storage.set('arpit.palette', palette);
    readTheme(); redraw();
    toast({lime:'Fresh lime. A new point of view.',coral:'Warm coral. Same curiosity.',ice:'Electric ice. Keep exploring.'}[palette]);
  });

  // Navigation remains normal anchor navigation, including old terminal-site links.
  const oldRoutes = {'#/':'#home','#/projects':'#work','#/research':'#github','#/comps-and-certs':'#about','#/devlogs':'#github','#/comm-link':'#contact'};
  if (oldRoutes[location.hash]) { history.replaceState(null, '', oldRoutes[location.hash]); requestAnimationFrame(() => $(location.hash)?.scrollIntoView()); }
  const menu = $('#mobileNav');
  const menuButton = $('#menuToggle');
  function closeMenu() { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); }
  menuButton.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    menuButton.setAttribute('aria-expanded', String(!menu.hidden));
    menuButton.setAttribute('aria-label', menu.hidden ? 'Open navigation' : 'Close navigation');
  });
  $$('a', menu).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); } });
  document.addEventListener('click', event => { if (!menu.hidden && !event.target.closest('.site-header')) closeMenu(); });
  const sectionObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      $$('.desktop-nav a').forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin:'-15% 0px -65% 0px', threshold:0 }) : null;
  $$('main>section').forEach(section => sectionObserver?.observe(section));

  // Curated projects have real repository destinations and explicit stages.
  const grid = $('#projectGrid');
  let galleryDirty=true;
  const classicRoute=()=>Boolean(location.hash&&location.hash!=='#deck');
  function renderGallery(){
  if(!galleryDirty)return;galleryDirty=false;const fragment=document.createDocumentFragment();
  projects.forEach((project, index) => {
    const card = document.createElement('article');
    card.className = `project-card${project.compact ? ' compact' : ''}`;
    card.dataset.project = project.id;
    card.style.setProperty('--project-color', project.color);
    const tags = project.tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join('');
    const details = `<button class="project-details" type="button" data-details="${project.id}" data-hand-action="project:${project.id}" aria-label="Read about ${escapeHTML(project.name)}">Inside the build ${icon('arrow')}</button>`;
    if (project.compact) {
      card.innerHTML = `<span class="compact-symbol" aria-hidden="true">${project.symbol}</span><div class="project-info"><h3><a href="${repoURL(project)}" target="_blank" rel="noopener noreferrer">${escapeHTML(project.name)}</a></h3><p class="compact-stage">${escapeHTML(project.stage)}</p><div class="project-tags">${tags}</div></div><p class="project-description">${escapeHTML(project.description)}</p>${details}`;
    } else {
      card.innerHTML = `<a class="project-art" href="${repoURL(project)}" target="_blank" rel="noopener noreferrer" aria-label="Explore ${escapeHTML(project.name)} source code on GitHub"><span class="project-number">0${index + 1} /</span><span class="project-stage">${escapeHTML(project.stage)}</span><img src="${project.art}" width="720" height="440" loading="lazy" decoding="async" alt="Illustrative artwork for ${escapeHTML(project.name)}"><span class="project-art-label">${escapeHTML(project.category.toUpperCase())}</span><span class="project-open">${icon('arrow')}</span></a><div class="project-info"><div class="project-title-row"><h3><a href="${repoURL(project)}" target="_blank" rel="noopener noreferrer">${escapeHTML(project.name)}</a></h3><span class="project-category">${escapeHTML(project.category)}</span></div><p class="project-description">${escapeHTML(project.description)}</p><div class="project-tags">${tags}${details}</div></div>`;
    }
    fragment.appendChild(card);
  });
  grid.replaceChildren(fragment);
  }
  let activeFilter = 'all';
  function filterProjects() {
    if(!classicRoute()&&!grid.children.length)return;
    renderGallery();
    const query = $('#projectSearch').value.toLowerCase().trim();
    let count = 0;
    projects.forEach(project => {
      const searchable = [project.name,project.repo,project.description,project.category,...project.tags].join(' ').toLowerCase();
      const match = (activeFilter === 'all' || project.categories.includes(activeFilter)) && (!query || searchable.includes(query));
      $(`[data-project="${project.id}"]`, grid).hidden = !match;
      if (match) count++;
    });
    grid.hidden = !count;
    $('#emptyProjects').hidden = count > 0;
    $('#filterStatus').textContent = `${count} ${count === 1 ? 'project' : 'projects'} shown.`;
  }
  $$('.filter').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    $$('.filter').forEach(filter => { const active = filter === button; filter.classList.toggle('active', active); filter.setAttribute('aria-pressed', String(active)); });
    filterProjects();
  }));
  $('#projectSearch').addEventListener('input', filterProjects);
  $('#clearFilters').addEventListener('click', () => { $('#projectSearch').value = ''; $('[data-filter="all"]').click(); $('#projectSearch').focus(); });
  filterProjects();
  window.addEventListener('hashchange',()=>{if(classicRoute())filterProjects();});
  document.addEventListener('portfolio:mode',event=>{if(!event.detail?.deck)filterProjects();});
  document.addEventListener('portfolio:catalog',()=>{galleryDirty=true;if(classicRoute())filterProjects();if(commandDialog.open)renderCommands();});

  const projectDialog = $('#projectDialog');
  function openProject(id) {
    const project = projects.find(item => item.id === id);
    if (!project) return;
    if(projectDialog.open)projectDialog.close();
    document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
    $('#projectDialogContent').innerHTML = `${project.art ? `<img class="dialog-project-art" src="${project.art}" width="720" height="440" alt="Illustrative artwork for ${escapeHTML(project.name)}">` : ''}<h2 id="projectDialogTitle">${escapeHTML(project.name)}</h2><p class="dialog-subtitle">${escapeHTML(project.stage)} / ${escapeHTML(project.category)}</p><p class="dialog-description">${escapeHTML(project.detail)}</p><ul class="dialog-features">${project.features.map(feature => `<li>${escapeHTML(feature)}</li>`).join('')}</ul><p class="dialog-boundary">${escapeHTML(project.boundary)}</p><div class="dialog-links"><a class="button button-primary" href="${repoURL(project)}" data-hand-action="source:${project.id}" target="_blank" rel="noopener noreferrer">Explore the source ${icon('github')}</a>${project.demo ? `<a class="button button-outline" href="${project.demo}" data-hand-action="demo:${project.id}" target="_blank" rel="noopener noreferrer">${project.categories.includes('play')?'Play browser edition':'Open live demo'} ${icon('arrow')}</a>` : ''}<button type="button" class="button button-outline" data-return-library data-hand-action="nav:library">All projects ${icon('arrow')}</button></div>`;
    projectDialog.style.setProperty('--project-color', project.color);
    projectDialog.showModal();
    lockDialogScroll();
    projectDialog.scrollTop = 0;
    document.dispatchEvent(new CustomEvent('portfolio:project-opened',{detail:{id:project.id}}));
  }
  document.addEventListener('portfolio:project',event=>{if(projects.some(p=>p.id===event.detail?.id))openProject(event.detail.id);});
  projectDialog.addEventListener('click',event=>{if(event.target.closest('[data-return-library]'))document.dispatchEvent(new CustomEvent('portfolio:library'));});
  grid.addEventListener('click', event => { const button = event.target.closest('[data-details]'); if (button) openProject(button.dataset.details); });
  $$('dialog').forEach(dialog => {
    $('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) document.body.style.overflow = ''; });
  });
  function lockDialogScroll() { document.body.style.overflow = 'hidden'; }
  projectDialog.addEventListener('toggle', () => { if (projectDialog.open) lockDialogScroll(); });

  // Searchable keyboard launcher, with native dialog focus containment and Escape.
  const commandDialog = $('#commandDialog');
  const commandSearch = $('#commandSearch');
  let selectedCommand = 0;
  let currentCommands = [];
  const commands = [
    {name:'All projects · GitHub archive',group:'Page',action:() => document.dispatchEvent(new CustomEvent('portfolio:library'))},
    {name:'Mission control · game mode',group:'Page',action:() => {location.hash='#deck';}},
    {name:'Selected work',group:'Page',action:() => goTo('#work')},
    {name:'About Arpit',group:'Page',action:() => goTo('#about')},
    {name:'Live visual interface · hands & voice',group:'Page',action:() => goTo('#playground')},
    {name:'Get in touch',group:'Page',action:() => goTo('#contact')},
    {name:'GitHub profile',group:'Link',url:'https://github.com/arpitkjaiswal'},
    {name:'LinkedIn',group:'Link',url:'https://www.linkedin.com/in/arpit-kumar-jaiswal-819478302'},
    {name:'Email Arpit',group:'Contact',url:'mailto:arpit.kr.jaiswal@gmail.com'},
  ];
  function goTo(hash) { location.hash = hash; $(hash)?.scrollIntoView({behavior:motionPaused ? 'instant' : 'smooth'}); }
  function selectCommand(index) {
    selectedCommand = index;
    $$('.command-result').forEach((button, i) => { button.classList.toggle('selected', i === index); button.setAttribute('aria-selected', String(i === index)); });
    const selected = $('.command-result.selected');
    if (selected) { commandSearch.setAttribute('aria-activedescendant', selected.id); selected.scrollIntoView({block:'nearest'}); } else commandSearch.removeAttribute('aria-activedescendant');
  }
  function renderCommands() {
    const query = commandSearch.value.trim().toLowerCase();
    currentCommands = [...commands,...projects.map(project=>({name:project.name,group:'Project',keywords:[project.repo,...project.tags].join(' '),action:()=>openProject(project.id)}))].filter(command => `${command.name} ${command.group} ${command.keywords || ''}`.toLowerCase().includes(query));
    const result = $('#commandResults');
    result.replaceChildren();
    if (!currentCommands.length) result.innerHTML = '<p class="command-empty">No matches. Try “work”, “AI”, or a project name.</p>';
    currentCommands.forEach((command, index) => {
      const button = document.createElement('button');
      button.className = 'command-result'; button.type = 'button'; button.id = `command-${index}`;
      button.setAttribute('role','option');
      button.innerHTML = `<span>${escapeHTML(command.name)} <small>${escapeHTML(command.group)}</small></span><span aria-hidden="true">↗</span>`;
      button.addEventListener('click', () => {
        commandDialog.close();
        if (command.url) {
          if (command.url.startsWith('mailto:')) location.href = command.url;
          else window.open(command.url, '_blank', 'noopener,noreferrer');
        } else command.action();
      });
      result.appendChild(button);
    });
    selectCommand(0);
  }
  function openCommands() { closeMenu(); document.querySelectorAll('dialog[open]').forEach(node=>node.close()); commandSearch.value = ''; commandDialog.showModal(); lockDialogScroll(); renderCommands(); commandSearch.focus(); }
  $('#commandTrigger').addEventListener('click', openCommands);
  $('#mobileCommand').addEventListener('click', openCommands);
  commandSearch.setAttribute('role','combobox');
  commandSearch.setAttribute('aria-controls','commandResults');
  commandSearch.setAttribute('aria-autocomplete','list');
  commandSearch.setAttribute('aria-expanded','true');
  $('#commandResults').setAttribute('role','listbox');
  commandSearch.addEventListener('input', renderCommands);
  commandSearch.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (currentCommands.length) selectCommand((selectedCommand + (event.key === 'ArrowDown' ? 1 : -1) + currentCommands.length) % currentCommands.length);
    } else if (event.key === 'Enter') { event.preventDefault(); $(`#command-${selectedCommand}`)?.click(); }
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (commandDialog.open) commandDialog.close(); else if (!projectDialog.open) openCommands();
    }
  });

  // Public GitHub metadata: a readable snapshot first, then a bounded live refresh.
  function dateLabel(value) { return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value)); }
  function renderUpdates(updates) {
    const recent = $('#recentUpdates'); recent.replaceChildren();
    [...updates].filter(item=>Number.isFinite(Date.parse(item.updated))).sort((a,b) => Date.parse(b.updated) - Date.parse(a.updated)).slice(0,5).forEach(update => {
      const project = projects.find(item => item.repo === update.repo); if (!project) return;
      const row = document.createElement('div'); row.className = 'recent-item'; row.style.setProperty('--item-color', project.color);
      const dot = document.createElement('span'); dot.setAttribute('aria-hidden','true');
      const copy = document.createElement('div'); const title = document.createElement('h3'); title.textContent = project.name;
      const description = document.createElement('p'); description.textContent = project.category;
      copy.append(title, description);
      const link = document.createElement('a'); link.href = repoURL(project); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = dateLabel(update.updated) + ' ↗'; link.setAttribute('aria-label', `${project.name}, updated ${dateLabel(update.updated)}, view repository`);
      row.append(dot,copy,link); recent.appendChild(row);
    });
  }
  const baseline = projects.map(project => ({repo:project.repo,updated:project.updated}));
  renderUpdates(baseline);
  function renderCatalogMetadata(event){
    const state=event.detail;
    if(Number.isInteger(state.publicCount))$('#repoCount').firstChild.textContent=String(state.publicCount);
    renderUpdates(projects.map(project=>({repo:project.repo,updated:project.updated})));
    $('#dataStatus').textContent=state.message+(state.time&&!state.busy&&!state.error?' · '+dateLabel(state.time):'');
    $('#dataStatus').classList.toggle('live',state.source==='live'&&!state.error);
  }
  document.addEventListener('portfolio:catalog',renderCatalogMetadata);
  document.addEventListener('portfolio:catalog-status',renderCatalogMetadata);

  // Small details that should never block the rest of the page.
  $('#year').textContent = new Date().getFullYear();
  function updateClock() {
    $('#localTime').textContent = new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Kolkata'}).format(new Date()) + ' IST';
  }
  updateClock(); setInterval(updateClock, 30000);
  $('#copyEmail').addEventListener('click', async () => {
    const email = 'arpit.kr.jaiswal@gmail.com';
    try { await navigator.clipboard.writeText(email); toast('Email copied. Say hello!'); }
    catch {
      const range = document.createRange(); range.selectNodeContents($('.email-row>a'));
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      toast('Email selected — press Ctrl/Cmd+C to copy.');
    }
  });
  let scrollQueued = false;
  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#readingProgress').style.transform = `scaleX(${max > 0 ? Math.min(1,scrollY/max) : 0})`;
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateProgress); } }, {passive:true});
  updateProgress();
  if ('IntersectionObserver' in window && !motionPaused) {
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }); }, {threshold:0.07});
    $$('.reveal').forEach(node => { node.classList.add('will-reveal'); observer.observe(node); });
  }

  // Procedural 3D point globe; no WebGL, external library, or GPU requirement.
  const heroCanvas = $('#heroCanvas');
  const waveCanvas = $('#waveCanvas');
  const heroContext = heroCanvas.getContext('2d');
  const waveContext = waveCanvas.getContext('2d');
  let heroSize = {width:0,height:0};
  let waveSize = {width:0,height:0};
  let heroVisible = true, waveVisible = false, frameID = 0, lastFrame = 0;
  let engineTime = 0, remix = 0, burstAt = -100, waveAt = -100, waveNote = 0;
  let controlledHand = null;
  document.addEventListener('portfolio:hand', event => { controlledHand = event.detail; });
  const pointCount = 840;
  const points = Array.from({length:pointCount},(_,index) => {
    const y = 1 - index / (pointCount - 1) * 2;
    const r = Math.sqrt(1-y*y);
    const theta = index * Math.PI * (3-Math.sqrt(5));
    return {x:Math.cos(theta)*r,y,z:Math.sin(theta)*r,index};
  });
  const heroForms = [points,
    points.map((point,index)=>{const u=index/pointCount*Math.PI*2*7,v=(index%31)/31*Math.PI*2;return {x:(.73+.27*Math.cos(v))*Math.cos(u),y:.27*Math.sin(v),z:(.73+.27*Math.cos(v))*Math.sin(u)};}),
    points.map((point,index)=>{const t=index/pointCount,a=t*Math.PI*10;return {x:Math.cos(a)*.68,y:(t-.5)*1.8,z:Math.sin(a)*.68};})
  ];
  function fitCanvas(canvas, context) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(rect.width*dpr); canvas.height = Math.round(rect.height*dpr);
    context?.setTransform(dpr,0,0,dpr,0,0);
    return {width:rect.width,height:rect.height};
  }
  function resizeCanvases() { heroSize = fitCanvas(heroCanvas,heroContext); waveSize = fitCanvas(waveCanvas,waveContext); redraw(); }
  function project3D(point,angle,radius,cx,cy) {
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const x = point.x*cosine + point.z*sine;
    const z = -point.x*sine + point.z*cosine;
    const tilt = -0.24;
    const y = point.y*Math.cos(tilt) - z*Math.sin(tilt);
    const depth = point.y*Math.sin(tilt) + z*Math.cos(tilt);
    const perspective = 3.5/(3.5-depth*0.24);
    return {x:cx+x*radius*perspective,y:cy+y*radius*perspective,z:depth};
  }
  function drawHero() {
    if (!heroContext || !heroSize.width) return;
    const ctx = heroContext, {width:w,height:h} = heroSize;
    ctx.clearRect(0,0,w,h);
    const cx = w*(.5+(controlledHand?(controlledHand.x-.5)*.12:0)), cy = h*(.49+(controlledHand?(controlledHand.y-.5)*.1:0));
    const r = Math.min(w*.34,h*.31)*(controlledHand?Math.min(1.25,controlledHand.zoom):1);
    const angle = engineTime*.13 + remix*.47+(controlledHand?(controlledHand.x-.5)*.55:0);
    const phase=engineTime/19, form=Math.floor(phase)%3, next=(form+1)%3;
    let blend=Math.min(1,Math.max(0,((phase%1)-.67)/.33));blend=blend*blend*(3-2*blend);
    const formName=['ORBIT','TORUS','HELIX'][blend>.5?next:form];
    const formLabel=document.getElementById('heroFormLabel');
    if(formLabel)formLabel.textContent=`THE CURIOSITY ENGINE / ${formName}`;
    const wireAlpha=form===0?1-blend:next===0?blend:0;
    const gradient = ctx.createRadialGradient(cx-r*.25,cy-r*.25,r*.05,cx,cy,r*1.15);
    gradient.addColorStop(0,`rgba(${theme.rgb},.055)`); gradient.addColorStop(.75,`rgba(${theme.rgb},.025)`); gradient.addColorStop(1,'transparent');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(cx,cy,r*1.15,0,Math.PI*2); ctx.fill();
    // Latitude and longitude arcs rotate with the same sphere as the dots.
    ctx.globalAlpha=wireAlpha;
    ctx.strokeStyle = `rgba(${theme.rgb},.10)`; ctx.lineWidth = .6;
    for (let latitude=-2;latitude<=2;latitude++) {
      const y = latitude*.31, radial = Math.sqrt(1-y*y);
      ctx.beginPath();
      for (let step=0;step<=100;step++) { const a=step/100*Math.PI*2; const p=project3D({x:Math.cos(a)*radial,y,z:Math.sin(a)*radial},angle,r,cx,cy); if(step===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); }
      ctx.stroke();
    }
    for (let longitude=0;longitude<6;longitude++) {
      const a=longitude/6*Math.PI;
      ctx.beginPath();
      for(let step=0;step<=100;step++) { const t=step/100*Math.PI*2; const p=project3D({x:Math.cos(t)*Math.cos(a),y:Math.sin(t),z:Math.cos(t)*Math.sin(a)},angle,r,cx,cy); if(step===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y); }
      ctx.stroke();
    }
    ctx.globalAlpha=1;
    const projected = points.map((point,index) => {
      const a=heroForms[form][index],b=heroForms[next][index];
      const shape={x:a.x+(b.x-a.x)*blend,y:a.y+(b.y-a.y)*blend,z:a.z+(b.z-a.z)*blend};
      const p={...project3D(shape,angle,r,cx,cy),index:point.index};
      if(controlledHand&&['pinch','palm'].includes(controlledHand.pose)){
        const dx=controlledHand.x*w-p.x,dy=controlledHand.y*h-p.y,influence=Math.exp(-(dx*dx+dy*dy)/(r*r));
        const force=controlledHand.pose==='pinch'?.4:-.25;p.x+=dx*influence*force;p.y+=dy*influence*force;
      }
      return p;
    }).sort((a,b)=>a.z-b.z);
    projected.forEach(point => {
      const opacity = .1+(point.z+1)*.37;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = point.index%19===0 ? '#f59bc1' : point.index%7===0 ? '#75dce5' : theme.accent;
      ctx.beginPath();ctx.arc(point.x,point.y,.55+(point.z+1)*.49,0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha = 1;
    // Tilted ellipses make the engine read as an orbital instrument.
    for(let orbit=0;orbit<2;orbit++) {
      ctx.save();ctx.translate(cx,cy);ctx.rotate(orbit ? .7 : -.45);
      ctx.beginPath();ctx.ellipse(0,0,r*1.38,r*.39,0,0,Math.PI*2);ctx.strokeStyle=orbit?'#75dce531':`rgba(${theme.rgb},.32)`;ctx.lineWidth=.75;ctx.stroke();
      const phase=engineTime*(orbit?-.28:.35)+orbit*2+remix;
      const x=Math.cos(phase)*r*1.38,y=Math.sin(phase)*r*.39;
      ctx.fillStyle=orbit?'#75dce5':theme.accent;ctx.shadowBlur=14;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(x,y,orbit?3:4,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    // A sparse surrounding star field, deterministic across frames.
    for(let index=0;index<28;index++) {
      const a=index*2.399, distance=r*(1.3+(index%5)*.13);
      const x=cx+Math.cos(a)*distance,y=cy+Math.sin(a)*distance*.86;
      ctx.fillStyle=index%4===0?'#f59bc16b':'#ffffff2e';
      if(index%5===0){ctx.fillRect(x-2,y,5,1);ctx.fillRect(x,y-2,1,5);}else{ctx.fillRect(x,y,1.1,1.1);}
    }
    const elapsed=engineTime-burstAt;
    if(elapsed>=0&&elapsed<1.7){ctx.beginPath();ctx.arc(cx,cy,r*(.9+elapsed*.6),0,Math.PI*2);ctx.strokeStyle=`rgba(${theme.rgb},${(1-elapsed/1.7)*.6})`;ctx.lineWidth=1;ctx.stroke();}
  }
  const noteColors = ['#d4ff63','#75dce5','#bca4f7','#f59bc1','#ffae7b'];
  function drawWave() {
    if(!waveContext||!waveSize.width)return;
    const ctx=waveContext,{width:w,height:h}=waveSize;
    ctx.clearRect(0,0,w,h);
    const age=engineTime-waveAt;
    const energy=age>=0&&age<3?Math.exp(-age*1.4):0;
    for(let layer=0;layer<4;layer++) {
      ctx.beginPath();
      for(let x=0;x<=w;x+=3) {
        const envelope=Math.sin(Math.PI*x/w)**1.5;
        const frequency=2.7+waveNote*.4+layer*.2;
        const amplitude=(13+energy*65)*(1-layer*.16)*envelope;
        const y=h*.55+Math.sin(x/w*Math.PI*frequency*2-engineTime*(.8+energy*3)+layer*.6)*amplitude+Math.sin(x/w*8+engineTime*.4)*7*envelope;
        if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.strokeStyle=energy>.05?noteColors[(waveNote+layer)%5]:[theme.accent,'#75dce5','#bca4f7','#f59bc1'][layer];
      ctx.globalAlpha=.66-layer*.13;ctx.lineWidth=layer===0?1.7:1;ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  const canDrawClassic=()=>!root.classList.contains('deck-mode')&&!root.classList.contains('modal-visible')&&!document.hidden&&Boolean(location.hash&&location.hash!=='#deck');
  function redraw(){if(!canDrawClassic())return;if(heroVisible)drawHero();if(waveVisible)drawWave();}
  function frame(time){
    frameID=0;
    if(!canDrawClassic()||motionPaused||(!heroVisible&&!waveVisible)){lastFrame=0;return;}
    if(!lastFrame||time-lastFrame>=1000/30){engineTime+=lastFrame?Math.min((time-lastFrame)/1000,.08):.033;lastFrame=time;if(heroVisible)drawHero();if(waveVisible)drawWave();}
    frameID=requestAnimationFrame(frame);
  }
  function scheduleFrame(){if(!frameID&&!motionPaused&&canDrawClassic()&&(heroVisible||waveVisible))frameID=requestAnimationFrame(frame);}
  if('ResizeObserver'in window){const resizeObserver=new ResizeObserver(resizeCanvases);resizeObserver.observe($('#heroArt'));resizeObserver.observe($('.wave-display'));}else window.addEventListener('resize',resizeCanvases,{passive:true});
  if('IntersectionObserver'in window){const canvasObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.target.id==='heroArt')heroVisible=entry.isIntersecting;else waveVisible=entry.isIntersecting;});scheduleFrame();},{rootMargin:'120px'});canvasObserver.observe($('#heroArt'));canvasObserver.observe($('.wave-display'));}
  document.addEventListener('portfolio:mode',()=>{lastFrame=0;resizeCanvases();scheduleFrame();});
  document.addEventListener('portfolio:render-state',()=>{if(!canDrawClassic()){if(frameID)cancelAnimationFrame(frameID);frameID=0;lastFrame=0;}else{redraw();scheduleFrame();}});
  resizeCanvases();scheduleFrame();
  $('#remixOrb').addEventListener('click',()=>{remix++;burstAt=engineTime;redraw();audio.tone(392,.6,.1);audio.tone(587.33,.7,.05,.07);scheduleFrame();});
  const frequencies=[261.63,293.66,329.63,392,440];
  const noteNames=['C','D','E','G','A'];
  const noteTimers=new Map();
  function playNote(index){
    const pad=$(`[data-note="${index}"]`);
    if(!pad)return;
    clearTimeout(noteTimers.get(index));pad.classList.add('playing');
    noteTimers.set(index,setTimeout(()=>pad.classList.remove('playing'),220));
    waveAt=engineTime;waveNote=index;redraw();scheduleFrame();
    $('#waveFrequency').textContent=`${noteNames[index]} · ${frequencies[index].toFixed(1)} Hz`;
    $('#synthHint').textContent=audio.enabled?`${noteNames[index]} — keep playing. Keys 1–5 work here too.`:'Visual mode. Enable sound to hear your notes.';
    if(audio.enabled){if(audio.context.state==='suspended')audio.context.resume().then(()=>{if(audio.enabled){audio.tone(frequencies[index],1.05,.17);audio.tone(frequencies[index]*2,.6,.035);}}).catch(()=>{});else{audio.tone(frequencies[index],1.05,.17);audio.tone(frequencies[index]*2,.6,.035);}}
  }
  $$('.note-pad').forEach(pad=>pad.addEventListener('click',()=>playNote(Number(pad.dataset.note))));
  document.addEventListener('keydown',event=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;if(waveVisible&&/^[1-5]$/.test(event.key)){event.preventDefault();playNote(Number(event.key)-1);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.silence();if(audio.context?.state==='running')audio.context.suspend().catch(()=>{});if(frameID)cancelAnimationFrame(frameID);frameID=0;lastFrame=0;}else{if(audio.enabled&&audio.context?.state==='suspended')audio.context.resume().catch(()=>{});updateClock();scheduleFrame();}});
  document.addEventListener('portfolio:burst',()=>{burstAt=engineTime;audio.tone(392,.65,.1);audio.tone(783.99,.5,.04,.06);redraw();scheduleFrame();});
  window.addEventListener('pagehide',()=>audio.silence());
})();
