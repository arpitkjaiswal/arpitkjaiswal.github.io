import './visual-studio.mjs?v=20261106-deck1';
import {ExplorerProgress,moveProjectIndex,mapHandPointer} from './deck-core.mjs?v=20261106-deck1';
import {particleShape} from './interaction-core.mjs?v=20261106-deck1';
import {startHandNavigation} from './hand-navigation.mjs?v=20261106-deck1';

const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const root=document.documentElement,deck=$('#commandDeck'),map=$('#deckMap'),portals=$('#deckPortals');
const projects=window.PORTFOLIO.projects;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const info=$('#deckInfoDialog'),preview=$('#cameraPreview'),previewHome=preview.parentElement,previewNext=preview.nextSibling;
const progress=new ExplorerProgress(projects.map(p=>p.id));
const positions=[[19,17],[51,10],[82,21],[13,46],[83,48],[48,50],[23,77],[52,85],[81,77]];
let active=false,selected=0,lastInteraction=performance.now(),lastTour=0,activeCamera=false;
let width=1,height=1,dpr=1,clock=0,lastFrame=0,frame=0,paused=root.classList.contains('motion-paused');
let pointer={x:.5,y:.5},ship={x:.5,y:.5,shown:false},anchors=[];
let scene='galaxy',previousScene='galaxy',morphAt=-10,accent='#71efff';
const pulses=[],canvas=$('#deckCanvas'),ctx=canvas.getContext('2d');
const sceneNames=['reactor','galaxy','vortex','aurora'];
const shapes=Object.fromEntries(sceneNames.map(name=>[name,Array.from({length:740},(_,i)=>particleShape(i,740,name))]));
function say(message){if($('#deckTransmission').textContent!==message)$('#deckTransmission').textContent=message;}
function dispatch(name,detail){return document.dispatchEvent(new CustomEvent(name,{detail}));}
function command(text){lastInteraction=performance.now();dispatch('portfolio:execute',{text});}
function projectById(id){return projects.find(project=>project.id===id);}
function destination(id,kind){
  const project=projectById(id);if(!project)return null;
  const value=kind==='source'?`https://github.com/arpitkjaiswal/${project.repo}${project.sourcePath||''}`:project.demo;
  if(!value)return null;
  try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}
}
function openProject(id){
  if(!projectById(id))return;
  info.close();lastInteraction=performance.now();dispatch('portfolio:project',{id});
}
function visitDestination(id,kind){
  const url=destination(id,kind);
  if(url)location.assign(url);
  else if(projectById(id)){openProject(id);say('This build has source code to explore. Open its repository from the project file.');}
}
function showProgress(){
  const state=progress.snapshot();
  $('#deckDiscovered').innerHTML=`${String(state.count).padStart(2,'0')}<span>/${String(state.total).padStart(2,'0')}</span>`;
  $('#deckXp').textContent=`${state.xp} XP`;$('#deckRank').textContent=state.rank;
  $('#deckXpFill').style.transform=`scaleX(${state.count/state.total})`;
  $('#deckMobileProgress').textContent=`${state.count}/${state.total} explored`;
  $$('.deck-portal').forEach(button=>button.classList.toggle('visited',progress.visited.has(button.dataset.deckProject)));
}
function setTarget(index,{source='manual',focus=false}={}){
  selected=((index%projects.length)+projects.length)%projects.length;
  if(source!=='auto')lastInteraction=performance.now();
  const project=projects[selected];
  $$('.deck-portal').forEach((button,i)=>{button.classList.toggle('selected',i===selected);button.setAttribute('aria-pressed',String(i===selected));});
  const box=$('#deckPreview');box.style.setProperty('--project-color',project.color);
  box.innerHTML=`${project.art?`<img class="deck-preview-art" src="${project.art}" width="720" height="440" alt="Illustrative artwork for ${escape(project.name)}">`:`<div class="deck-preview-symbol" aria-hidden="true">${project.symbol}</div>`}<h3>${escape(project.name)}</h3><p class="deck-preview-stage">${escape(project.stage)}</p><p class="deck-preview-description">${escape(project.description)}</p><div class="deck-preview-tags">${project.tags.map(tag=>`<span>${escape(tag)}</span>`).join('')}</div>`;
  $('#deckOpenTarget').dataset.handAction=`project:${project.id}`;
  $('#deckOpenTarget').setAttribute('aria-label',`Open ${project.name}`);
  const next=project.categories.includes('systems')?'reactor':project.categories.includes('play')?'vortex':project.categories.includes('web')?'aurora':'galaxy';
  if(next!==scene){previousScene=scene;scene=next;morphAt=clock;}
  if(focus){const button=$(`[data-deck-project="${project.id}"]`);button.focus({preventScroll:true});button.scrollIntoView({block:'nearest',behavior:'instant'});}
  draw();schedule();
}
projects.forEach((project,index)=>{
  const button=document.createElement('button');button.type='button';button.className='deck-portal';button.dataset.deckProject=project.id;
  button.dataset.handAction=`project:${project.id}`;button.setAttribute('aria-label',`Open project ${index+1}, ${project.name}`);
  button.style.setProperty('--portal-color',project.color);button.style.setProperty('--portal-index',index);
  button.style.left=`${positions[index][0]}%`;button.style.top=`${positions[index][1]}%`;
  button.innerHTML=`<span class="deck-portal-top"><span>FILE / 0${index+1}</span><i></i></span><h3>${escape(project.name)}</h3><p>${escape(project.category.toUpperCase())}</p><span class="portal-visited" aria-label="Discovered">✓</span>`;
  button.addEventListener('pointerenter',()=>setTarget(index));button.addEventListener('focus',()=>setTarget(index));
  button.addEventListener('click',()=>{setTarget(index);openProject(project.id);});portals.appendChild(button);
});
$('#deckOpenTarget').addEventListener('click',()=>openProject(projects[selected].id));
function navigateClassic(target='home'){
  info.close();deactivate();location.hash=`#${target}`;
  requestAnimationFrame(()=>document.getElementById(target)?.scrollIntoView({block:'start',behavior:'instant'}));
}
function activate({changeHash=true}={}){
  if(active){if(changeHash&&location.hash!=='#deck')location.hash='#deck';return;}
  dispatch('portfolio:exitStudio');$$('dialog[open]').forEach(dialog=>dialog.close());
  active=true;deck.hidden=false;root.classList.add('deck-mode');
  $('#deckCameraDock').appendChild(preview);
  if(changeHash&&location.hash!=='#deck')location.hash='#deck';
  window.scrollTo(0,0);resize();schedule();
}
function deactivate(){
  active=false;$$('dialog[open]').forEach(dialog=>dialog.close());
  if(document.fullscreenElement===deck)document.exitFullscreen().catch(()=>{});
  root.classList.remove('deck-mode');deck.hidden=true;
  previewHome.insertBefore(preview,previewNext?.parentNode===previewHome?previewNext:null);
  if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;
}
function showInfo(kind){
  $$('dialog[open]').forEach(dialog=>dialog.close());lastInteraction=performance.now();
  const content=$('#deckInfoContent');
  const text={
    about:{title:'The human behind the interface.',body:'<p>I’m <strong>Arpit Kumar Jaiswal</strong>, a B.Tech Information Technology student at MIT Manipal. I build backends, AI experiments, and interfaces with a little personality.</p><p>This universe contains nine selected projects from my GitHub: voice companions, encrypted data, document research, web workspaces, and an orbital-defense game.</p><p>My process is simple: ask a good question, build something, find its limits, and make it better.</p><div class="deck-modal-links"><a href="https://github.com/arpitkjaiswal" target="_blank" rel="noopener noreferrer" data-hand-action="external:github">GitHub ↗</a><a href="#home" data-hand-action="nav:home">Classic portfolio ↗</a></div>'},
    contact:{title:'Open a connection.',body:'<p>Have a project, an opportunity, or a good question? Say hello.</p><div class="deck-modal-links"><a href="mailto:arpit.kr.jaiswal@gmail.com" data-hand-action="external:email">arpit.kr.jaiswal@gmail.com ↗</a><a href="https://www.linkedin.com/in/arpit-kumar-jaiswal-819478302" target="_blank" rel="noopener noreferrer" data-hand-action="external:linkedin">LinkedIn ↗</a><a href="https://github.com/arpitkjaiswal" target="_blank" rel="noopener noreferrer" data-hand-action="external:github">GitHub ↗</a></div>'},
    help:{title:'You have the controls.',body:'<p>One click enables the camera. Once tracking is ready, your index finger becomes the cursor. Point at a project, then <strong>pinch once</strong> to open its file. Open your hand before the next selection.</p><div class="deck-help-grid"><div><h3>Hands &amp; keyboard</h3><dl><div><dt>Point, then pinch</dt><dd>Select a portal, navigation item, or project button.</dd></div><div><dt>Open palm near a screen edge</dt><dd>Scroll a long project file or narrow map.</dd></div><div><dt>Peace sign · hold</dt><dd>Target the next project.</dd></div><div><dt>WASD / arrows · Enter</dt><dd>Move between portals and open a target.</dd></div><div><dt>1–9 · Escape</dt><dd>Quick-open a project; close a file.</dd></div></dl></div><div><h3>Say “Jarvis”, then…</h3><button data-deck-command="open LEXA" data-hand-action="execute:open LEXA">open LEXA</button><button data-deck-command="open project two" data-hand-action="execute:open project two">open project two</button><button data-deck-command="next project" data-hand-action="execute:next project">next project</button><button data-deck-command="open selected project" data-hand-action="execute:open selected project">open selected project</button><button data-deck-command="change color" data-hand-action="execute:change color">change color</button><button data-deck-command="close project" data-hand-action="execute:close project">close project</button><button data-deck-command="stop all inputs" data-hand-action="execute:stop all inputs">stop all inputs</button><p>Type the same commands below. “Play Orbit Warden” launches its browser game; “source for LEXA” opens its code. Camera navigation uses this page’s controls only.</p></div></div><p>Camera and microphone require permission and compatible browser features. Hand tracking runs on your device; voice recognition may use your browser’s speech service. Neither input starts automatically.</p>'}
  }[kind];if(!text)return;
  $('#deckInfoTitle').textContent=text.title;content.innerHTML=text.body;
  $$('[data-deck-command]').forEach(button=>button.addEventListener('click',()=>command(button.dataset.deckCommand)));
  info.showModal();info.scrollTop=0;
}
function deckAction(action){
  if(action==='classic'){navigateClassic();return;}
  if(action==='back'){
    const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();say('Back to the constellation.');}else if(!active)activate();
    return;
  }
  if(!active)activate();
  if(action==='home'){ $$('dialog[open]').forEach(dialog=>dialog.close());say('Mission control ready. Choose a build.');}
  else if(action==='help')showInfo('help');
  else if(action==='next'||action==='previous'){setTarget(selected+(action==='next'?1:-1),{focus:true});say(`Target acquired: ${projects[selected].name}. Say “open selected project”.`);}
  else if(action==='open')openProject(projects[selected].id);
}
function navigate(target){
  if(target==='deck'){activate();return;}
  if(active&&target==='work'){deckAction('home');return;}
  if(active&&['about','contact'].includes(target)){showInfo(target);return;}
  navigateClassic(target);
}
$$('[data-deck-nav]').forEach(button=>button.addEventListener('click',()=>{
  const kind=button.dataset.deckNav;lastInteraction=performance.now();
  if(kind==='map')deckAction('home');else if(kind==='lab')navigateClassic('playground');else showInfo(kind);
}));
$('#deckGuide').addEventListener('click',()=>showInfo('help'));
$('#deckCommandForm').addEventListener('submit',event=>{event.preventDefault();const input=$('#deckCommand');const text=input.value.trim();if(text){command(text);input.value='';}});
const proxies={deckCamera:'cameraToggle',deckVoice:'voiceToggle',deckSound:'soundToggle',deckPause:'motionToggle',deckPalette:'paletteToggle'};
for(const [button,target] of Object.entries(proxies))$('#'+button).addEventListener('click',()=>{
  lastInteraction=performance.now();$('#'+target).click();
  if(target==='cameraToggle')say($('#cameraStatus').textContent);
  if(target==='voiceToggle')say($('#voiceStatus').textContent);
  syncControls();
});
function syncControls(){
  for(const [proxy,id] of [['deckCamera','cameraToggle'],['deckVoice','voiceToggle']]){
    const source=$('#'+id),button=$('#'+proxy),on=source.getAttribute('aria-pressed')==='true';
    button.setAttribute('aria-pressed',String(on));$('#'+proxy+' span').textContent=source.querySelector('span').textContent;
  }
  $('#deckSound').setAttribute('aria-pressed',$('#soundToggle').getAttribute('aria-pressed'));
  $('#deckSound').setAttribute('aria-label',$('#soundToggle').getAttribute('aria-pressed')==='true'?'Mute interface sound':'Enable interface sound');
  const held=root.classList.contains('motion-paused');$('#deckPause').setAttribute('aria-pressed',String(held));$('#deckPause').setAttribute('aria-label',held?'Resume animations':'Pause animations');
  activeCamera=$('#cameraToggle').getAttribute('aria-pressed')==='true';
  if(activeCamera)$('#deckCamera').dataset.handAction='control:stop-camera';else delete $('#deckCamera').dataset.handAction;
  if($('#voiceToggle').getAttribute('aria-pressed')==='true')$('#deckVoice').dataset.handAction='control:stop-voice';else delete $('#deckVoice').dataset.handAction;
}
for(const id of ['cameraToggle','voiceToggle','soundToggle','motionToggle'])new MutationObserver(syncControls).observe($('#'+id),{attributes:true,attributeFilter:['aria-pressed'],subtree:true,childList:true});
document.addEventListener('portfolio:inputs',()=>{syncControls();if(active){const camera=$('#cameraToggle').getAttribute('aria-pressed')==='true';say(camera?$('#cameraStatus').textContent:$('#voiceToggle').getAttribute('aria-pressed')==='true'?$('#voiceStatus').textContent:'Inputs off. Mouse, keyboard, and commands are ready.');}});
document.addEventListener('portfolio:status',event=>{if(typeof event.detail?.message==='string')say(event.detail.message);});
document.addEventListener('portfolio:deck',event=>deckAction(event.detail?.action));
document.addEventListener('portfolio:scene',event=>{
  if(!active||!sceneNames.includes(event.detail?.scene))return;
  const next=event.detail.scene;if(next!==scene){previousScene=scene;scene=next;morphAt=clock;}
  $('#deckMapHint').textContent=`${next.toUpperCase()} FIELD / POINT. PINCH. EXPLORE.`;draw();schedule();
});
document.addEventListener('portfolio:destination',event=>visitDestination(event.detail?.id,event.detail?.kind));
document.addEventListener('portfolio:navigate',event=>{if(active){event.preventDefault();navigate(event.detail?.target);}});
document.addEventListener('portfolio:project-opened',event=>{
  const id=event.detail?.id,project=projectById(id);if(!project)return;
  setTarget(projects.indexOf(project));
  const record=progress.visit(id);showProgress();
  const meta=document.createElement('p');meta.className='deck-dossier-meta';meta.textContent=`FILE / ${String(projects.indexOf(project)+1).padStart(2,'0')} · ${record.count}/${record.total} DISCOVERED${record.fresh?' · +100 EXPLORER XP':''}`;
  $('#projectDialogContent').prepend(meta);
  if(record.fresh){say(`DISCOVERY +100 XP / ${project.name}. ${record.count} of ${record.total} builds explored.`);dispatch('portfolio:burst');}
});
const external={github:'https://github.com/arpitkjaiswal',linkedin:'https://www.linkedin.com/in/arpit-kumar-jaiswal-819478302',email:'mailto:arpit.kr.jaiswal@gmail.com'};
function activateHandAction(action,element){
  if(typeof action!=='string'||!action)return;
  const separator=action.indexOf(':'),kind=separator<0?action:action.slice(0,separator),value=separator<0?'':action.slice(separator+1);
  lastInteraction=performance.now();
  if(kind==='project')openProject(value);
  else if(kind==='source'||kind==='demo')visitDestination(value,kind);
  else if(kind==='dialog-close')element.closest('dialog')?.close();
  else if(kind==='nav'){
    if(['about','contact','home','work','playground','deck'].includes(value))navigate(value);
    else if(value==='map')deckAction('home');else if(value==='lab')navigateClassic('playground');else if(value==='help')showInfo('help');
  }
  else if(kind==='execute')command(value);
  else if(kind==='filter'&&['all','ai','systems','web','play'].includes(value))$(`[data-filter="${value}"]`)?.click();
  else if(kind==='scene'&&sceneNames.includes(value))$(`[data-scene="${value}"]`)?.click();
  else if(kind==='external'&&external[value])location.assign(external[value]);
  else if(kind==='control'){
    const controls={sound:'soundToggle',pause:'motionToggle',palette:'paletteToggle',stop:'stopAllInputs','stop-camera':'cameraToggle','stop-voice':'voiceToggle',burst:'energyBurst'};
    if(controls[value])$('#'+controls[value])?.click();
  }
}
function markTargets(){
  $$('[data-deck-nav]').forEach(button=>button.dataset.handAction=`nav:${button.dataset.deckNav}`);
  $$('.project-details[data-details]').forEach(button=>button.dataset.handAction=`project:${button.dataset.details}`);
  $$('[data-close-dialog]').forEach(button=>button.dataset.handAction='dialog-close');
  $$('a[href^="#"]').forEach(link=>{const target=link.getAttribute('href').slice(1);if(['about','contact','home','work','playground','deck'].includes(target))link.dataset.handAction=`nav:${target}`;});
  $$('.filter').forEach(button=>button.dataset.handAction=`filter:${button.dataset.filter}`);
  $$('.scene-button').forEach(button=>button.dataset.handAction=`scene:${button.dataset.scene}`);
  for(const [id,control] of Object.entries({deckSound:'sound',deckPause:'pause',deckPalette:'palette',soundToggle:'sound',motionToggle:'pause',paletteToggle:'palette',stopAllInputs:'stop',energyBurst:'burst'}))$('#'+id).dataset.handAction=`control:${control}`;
  $('#deckGuide').dataset.handAction='nav:help';
}
markTargets();syncControls();
startHandNavigation({onActivate:activateHandAction,onHover:element=>{
  if(element?.dataset.deckProject){const index=projects.findIndex(project=>project.id===element.dataset.deckProject);if(index>=0)setTarget(index,{source:'hand'});}
}});
map.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]')||event.ctrlKey||event.metaKey||event.altKey)return;
  const next=moveProjectIndex(selected,event.key,projects.length,matchMedia('(max-width:540px)').matches?2:3);
  if(next!==selected){event.preventDefault();setTarget(next,{focus:true});}
  else if(['Enter',' '].includes(event.key)&&event.target===map){event.preventDefault();openProject(projects[selected].id);}
});
document.addEventListener('keydown',event=>{
  if(!active||event.ctrlKey||event.metaKey||event.altKey||event.repeat||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
  if(/^[1-9]$/.test(event.key)){event.preventDefault();setTarget(Number(event.key)-1);openProject(projects[selected].id);}
});
map.addEventListener('pointermove',event=>{
  const rect=map.getBoundingClientRect();pointer.x=(event.clientX-rect.left)/rect.width;pointer.y=(event.clientY-rect.top)/rect.height;
  ship={x:pointer.x,y:pointer.y,shown:true};lastInteraction=performance.now();
},{passive:true});
map.addEventListener('pointerleave',()=>{ship.shown=false;});
map.addEventListener('scroll',()=>{cacheAnchors();lastInteraction=performance.now();},{passive:true});
$('#deckFullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await deck.requestFullscreen();}catch{say('The command deck already fills this page. Browser fullscreen is unavailable here.');}});
function route(){const wantsDeck=!location.hash||location.hash==='#deck';if(wantsDeck){activate({changeHash:false});if(!location.hash)history.replaceState(null,'','#deck');}else if(active){deactivate();const target=document.getElementById(location.hash.slice(1));requestAnimationFrame(()=>target?.scrollIntoView({block:'start',behavior:'instant'}));}}
window.addEventListener('hashchange',route);

function cacheAnchors(){
  const origin=deck.getBoundingClientRect(),mapRect=map.getBoundingClientRect();
  anchors=$$('.deck-portal').map((button,index)=>{
    const rect=button.getBoundingClientRect();return {x:rect.left+rect.width/2-origin.left,y:rect.top+rect.height/2-origin.top,index,visible:rect.bottom>mapRect.top&&rect.top<mapRect.bottom};
  });
}
function resize(){
  if(!active)return;
  const visibleHeight=window.visualViewport?.height||innerHeight;
  deck.style.setProperty('--deck-height',`${visibleHeight}px`);
  const rect=deck.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);
  cacheAnchors();draw();
}
function draw(){
  if(!active||!ctx)return;
  const mapRect=map.getBoundingClientRect(),deckRect=deck.getBoundingClientRect();
  const cx=mapRect.left-deckRect.left+mapRect.width*.5+(pointer.x-.5)*12;
  const cy=mapRect.top-deckRect.top+mapRect.height*.5+(pointer.y-.5)*10;
  const radius=Math.min(mapRect.width*.34,mapRect.height*.38,220);
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle='#050b13';ctx.fillRect(0,0,width,height);
  const cloud=ctx.createRadialGradient(cx,cy,10,cx,cy,Math.max(width,height)*.65);
  cloud.addColorStop(0,'#17537542');cloud.addColorStop(.4,'#0c284127');cloud.addColorStop(1,'#050a1100');ctx.fillStyle=cloud;ctx.fillRect(0,0,width,height);
  const purple=ctx.createRadialGradient(width*.79,height*.34,0,width*.79,height*.34,width*.5);purple.addColorStop(0,'#52376412');purple.addColorStop(1,'#00000000');ctx.fillStyle=purple;ctx.fillRect(0,0,width,height);
  // A drifting star field and a perspective navigation grid.
  for(let i=0;i<160;i++){
    const x=(i*137.507+Math.sin(clock*.03+i)*19+width)%width;
    const y=((i*83.123-clock*(.4+i%3))%height+height)%height;
    ctx.globalAlpha=.13+(i%5)*.06;ctx.fillStyle=i%7===0?'#bba5e8':'#9adcea';ctx.fillRect(x,y,i%13===0?1.8:.8,i%13===0?1.8:.8);
  }
  ctx.globalAlpha=1;
  ctx.strokeStyle='#7bd9f409';ctx.lineWidth=.6;
  for(let i=-6;i<=6;i++){ctx.beginPath();ctx.moveTo(cx+i*22,cy);ctx.lineTo(cx+i*210,height);ctx.stroke();}
  for(let i=0;i<9;i++){const t=i/8,y=cy+(height-cy)*t*t;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  // Connections point to the actual project portals; they are navigational artwork.
  for(const anchor of anchors){
    if(!anchor.visible)continue;
    const selectedNode=anchor.index===selected;
    ctx.strokeStyle=selectedNode?'#85e8ff53':'#74b4d21a';ctx.lineWidth=selectedNode?.85:.55;
    const bend=(anchor.x-cx)*.23;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo(cx+bend,anchor.y,anchor.x,anchor.y);ctx.stroke();
    const phase=(clock*.13+anchor.index*.11)%1;
    const tx=cx+(anchor.x-cx)*phase,ty=cy+(anchor.y-cy)*phase;
    ctx.fillStyle=projects[anchor.index].color;ctx.globalAlpha=selectedNode?.6:.22;ctx.beginPath();ctx.arc(tx,ty,selectedNode?2:1.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle=projects[anchor.index].color;ctx.globalAlpha=selectedNode?.25:.07;ctx.beginPath();ctx.ellipse(anchor.x,anchor.y,selectedNode?92:62,selectedNode?54:39,clock*.02,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  const core=ctx.createRadialGradient(cx-radius*.2,cy-radius*.25,0,cx,cy,radius*1.45);
  core.addColorStop(0,'#76d6f519');core.addColorStop(.48,'#19415b17');core.addColorStop(1,'#00000000');ctx.fillStyle=core;ctx.fillRect(cx-radius*1.5,cy-radius*1.5,radius*3,radius*3);
  const mix=Math.max(0,Math.min(1,(clock-morphAt)/2.4)),blend=mix*mix*(3-2*mix);
  const from=shapes[previousScene],to=shapes[scene],rotation=clock*.075;
  const co=Math.cos(rotation),si=Math.sin(rotation);
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<to.length;i++){
    const a=from[i],b=to[i];
    const x=a[0]+(b[0]-a[0])*blend,y=a[1]+(b[1]-a[1])*blend,z=a[2]+(b[2]-a[2])*blend;
    const rx=x*co+z*si,depth=-x*si+z*co,perspective=3/(3-depth*.25);
    const sx=cx+rx*radius*perspective,sy=cy+y*radius*perspective;
    ctx.globalAlpha=.1+(depth+1.2)*.12;ctx.fillStyle=i%17===0?'#bca4f7':i%5===0?'#d4ff63':'#71efff';
    ctx.beginPath();ctx.arc(sx,sy,.5+(depth+1.1)*.29,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  // Orbital instrument markings stay alive without moving the clickable targets.
  for(let orbit=0;orbit<3;orbit++){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.4+orbit*.6+clock*(orbit===1?-.03:.02));
    ctx.strokeStyle=orbit===1?'#d4ff6322':'#71efff26';ctx.lineWidth=.6;ctx.beginPath();ctx.ellipse(0,0,radius*(1.15+orbit*.2),radius*(.3+orbit*.2),0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.translate(cx,cy);ctx.strokeStyle='#7edcf542';ctx.lineWidth=.6;
  for(let i=0;i<80;i++){const a=i/80*Math.PI*2+clock*.03,r=radius*1.43;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*(r+(i%10===0?8:3)),Math.sin(a)*(r+(i%10===0?8:3)));ctx.stroke();}ctx.restore();
  const sweep=(clock*.035)%1;ctx.strokeStyle='#75dce50e';ctx.beginPath();ctx.moveTo(0,sweep*height);ctx.lineTo(width,sweep*height);ctx.stroke();
  const meteor=(clock%9)/9;
  if(meteor<.18){const x=width*(1.15-meteor*4),y=height*(.17+meteor);const tail=ctx.createLinearGradient(x,y,x+120,y-25);tail.addColorStop(0,'#a9eaff88');tail.addColorStop(1,'#a9eaff00');ctx.strokeStyle=tail;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+120,y-25);ctx.stroke();}
  for(let i=pulses.length-1;i>=0;i--){const age=clock-pulses[i].at;if(age>2.5){pulses.splice(i,1);continue;}ctx.globalAlpha=(1-age/2.5)*.45;ctx.strokeStyle='#d4ff63';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(pulses[i].x,pulses[i].y,10+age*230,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  const marker=$('#deckShip');marker.classList.toggle('active',ship.shown);
  marker.style.left=`${ship.x*100}%`;marker.style.top=`${ship.y*100}%`;
}
function tick(now){
  frame=0;if(!active||document.hidden||paused){lastFrame=0;return;}
  if(!lastFrame||now-lastFrame>=1000/30){
    const dt=lastFrame?Math.min((now-lastFrame)/1000,.08):.033;lastFrame=now;clock+=dt;
    const interacting=document.activeElement?.matches('input,textarea,.deck-portal');
    if($('#autoScenes').getAttribute('aria-pressed')==='true'&&now-lastInteraction>10000&&now-lastTour>10000&&!activeCamera&&!interacting&&!document.querySelector('dialog[open]')){lastTour=now;setTarget(selected+1,{source:'auto'});}
    draw();
  }
  schedule();
}
function schedule(){if(!frame&&active&&!paused&&!document.hidden)frame=requestAnimationFrame(tick);}
document.addEventListener('portfolio:burst',()=>{if(active){const target=anchors[selected]||{x:width/2,y:height/2};pulses.push({x:target.x,y:target.y,at:clock});if(pulses.length>4)pulses.shift();draw();}});
document.addEventListener('portfolio:hand',event=>{
  const hand=event.detail;if(!active||!hand)return;
  lastInteraction=performance.now();
  const mapped=mapHandPointer(hand.cursorX??hand.x,hand.cursorY??hand.y);if(!mapped)return;
  const rect=map.getBoundingClientRect(),x=mapped.x*innerWidth,y=mapped.y*innerHeight;
  ship={x:(x-rect.left)/rect.width,y:(y-rect.top)/rect.height,shown:x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom};
});
new MutationObserver(()=>{
  paused=root.classList.contains('motion-paused');accent=getComputedStyle(root).getPropertyValue('--accent').trim();
  deck.style.setProperty('--deck-cyan',root.dataset.palette==='coral'?'#ffa990':root.dataset.palette==='ice'?'#83e6f0':'#71efff');
  lastFrame=0;syncControls();draw();schedule();
}).observe(root,{attributes:true,attributeFilter:['class','data-palette']});
if('ResizeObserver'in window)new ResizeObserver(resize).observe(map);else window.addEventListener('resize',resize,{passive:true});
window.addEventListener('resize',resize,{passive:true});window.visualViewport?.addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;}else schedule();});
window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;});
setTarget(0,{source:'auto'});showProgress();route();
