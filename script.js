// ---- routing ----
  const routes = document.querySelectorAll('.route');
  const navLinks = document.querySelectorAll('.nav-link');

  function showRoute(hash){
    const path = (hash || '#/').replace('#','') || '/';
    routes.forEach(r => r.classList.toggle('is-active', r.dataset.route === path));
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.route === path));
    if (!document.querySelector('.route[data-route="'+path+'"]')){
      routes.forEach(r => r.classList.toggle('is-active', r.dataset.route === '/'));
      navLinks.forEach(l => l.classList.toggle('active', l.dataset.route === '/'));
    }
  }
  window.addEventListener('hashchange', () => showRoute(location.hash));
  showRoute(location.hash);

  // ---- mobile menu ----
  const menuToggle = document.getElementById('menuToggle');
  const primaryNav = document.getElementById('primaryNav');
  menuToggle.addEventListener('click', () => {
    const isOpen = primaryNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen);
  });
  navLinks.forEach(l => l.addEventListener('click', () => {
    primaryNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));

  // ---- footer year ----
  document.getElementById('year').textContent = new Date().getFullYear();

  // ---- typewriter hero JSON ----
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const jsonLines = [
    ['{', ''],
    ['  "name"', '"Arpit Kumar Jaiswal",'],
    ['  "role"', '"Backend Engineer — in training",'],
    ['  "based_in"', '"Manipal, India",'],
    ['  "education"', '"B.Tech IT, MIT Manipal, 2028",'],
    ['  "focus"', '["distributed systems", "competitive programming", "AI products"],'],
    ['  "status"', '"shipping toward SDE roles, target 2028"'],
    ['}', '']
  ];

  function renderLine(keyPart, valPart){
    const span = document.createElement('div');
    if (!valPart && keyPart === '{' || keyPart === '}'){
      span.innerHTML = '<span class="json-punct">'+keyPart+'</span>';
    } else {
      span.innerHTML = '<span class="json-key">'+keyPart+'</span><span class="json-punct">: </span><span class="json-str">'+valPart+'</span>';
    }
    return span;
  }

  const target = document.getElementById('typewriter');

  function typewrite(){
    let li = 0;
    function nextLine(){
      if (li >= jsonLines.length){
        const cursor = document.createElement('span');
        cursor.className = 'cursor-blink';
        target.appendChild(cursor);
        return;
      }
      const [k, v] = jsonLines[li];
      const lineEl = renderLine(k, v);
      target.appendChild(lineEl);
      li++;
      setTimeout(nextLine, 90);
    }
    nextLine();
  }

  function renderInstant(){
    jsonLines.forEach(([k, v]) => target.appendChild(renderLine(k, v)));
  }

  if (reduceMotion){ renderInstant(); } else { typewrite(); }
