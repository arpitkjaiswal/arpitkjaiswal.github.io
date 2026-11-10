import './guided-tour.mjs?v=20261110-layout';
import {getRenderState} from './render-runtime.mjs?v=20261110-layout';
import {FramePacer,DrawBudget} from './motion-core.mjs?v=20261110-layout';
import './project-library.mjs?v=20261110-layout';
import {getProjects} from './project-catalog.mjs?v=20261110-layout';
import {spotlightProjects} from './catalog-core.mjs?v=20261110-layout';
import './visual-studio.mjs?v=20261110-layout';
import {ExplorerProgress,moveProjectIndex,mapHandPointer} from './deck-core.mjs?v=20261110-layout';
import {particleShape} from './interaction-core.mjs?v=20261110-layout';
import {startHandNavigation} from './hand-navigation.mjs?v=20261110-layout';

const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const root=document.documentElement,deck=$('#commandDeck'),map=$('#deckMap'),portals=$('#deckPortals');
let projects=spotlightProjects(getProjects());
window.PORTFOLIO_SPOTLIGHT=projects.map(p=>p.id);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const info=$('#deckInfoDialog'),preview=$('#cameraPreview'),previewHome=preview.parentElement,previewNext=preview.nextSibling;
const progress=new ExplorerProgress(getProjects().map(p=>p.id));
let active=false,selected=0,lastInteraction=performance.now(),activeCamera=false;
let flightLoading=false;
let renderedProject=null,mapGeometry={x:0,y:0,width:1,height:1},adaptiveEco=false,budget=getRenderState().budget;
const pacer=new FramePacer(budget.fps),drawBudget=new DrawBudget();
const canRender=()=>active&&!document.hidden&&!getRenderState().dialogOpen;
const particleBuckets=Array.from({length:12},()=>[]);
let width=1,height=1,dpr=1,clock=0,lastFrame=0,frame=0,paused=root.classList.contains('motion-paused');
let pointer={x:.5,y:.5},ship={x:.5,y:.5,shown:false},anchors=[];
let scene='galaxy',previousScene='galaxy',morphAt=-10,accent='#71efff';
const pulses=[],canvas=$('#deckCanvas'),ctx=canvas.getContext('2d');
const sceneNames=['reactor','galaxy','vortex','aurora'];
const shapes=Object.fromEntries(sceneNames.map(name=>[name,Array.from({length:640},(_,i)=>particleShape(i,640,name))]));
function say(message){if($('#deckTransmission').textContent!==message)$('#deckTransmission').textContent=message;}
function dispatch(name,detail){return document.dispatchEvent(new CustomEvent(name,{detail}));}
function effectsAllowed(){return !paused&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
async function openFlight(){
  if(flightLoading||$('#flightDialog').open)return;
  if(!active)activate();
  const trigger=$('#deckFlight');
  flightLoading=true;
  trigger.setAttribute('aria-busy','true');
  try{
    const {showSignalRun}=await import('./signal-run.mjs?v=20261110-layout');
    if(active)showSignalRun(projects,()=>getRenderState().budget);
  }catch(error){
    say('Signal Run could not load. Try the flight button again.');
    console.error('Signal Run failed to open',error);
  }finally{
    flightLoading=false;
    trigger.removeAttribute('aria-busy');
  }
}
function command(text){lastInteraction=performance.now();return document.dispatchEvent(new CustomEvent('portfolio:execute',{cancelable:true,detail:{text}}));}
function projectById(id){return getProjects().find(project=>project.id===id);}
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
  $('#deckXpFill').style.transform=`scaleX(${state.total?state.count/state.total:0})`;
  $('#deckMobileProgress').textContent=`${state.count}/${state.total} explored`;
  $$('.deck-portal').forEach(button=>button.classList.toggle('visited',progress.visited.has(button.dataset.deckProject)));
}
function setTarget(index,{source='manual',focus=false}={}){
  if(!projects.length){$('#deckOpenTarget').disabled=true;delete $('#deckOpenTarget').dataset.handAction;$('#deckPreview').innerHTML='<h3>New ideas ahead.</h3><p class="deck-preview-description">There are no public projects to show right now. Open the library to refresh GitHub.</p>';return;}
  $('#deckOpenTarget').disabled=false;
  selected=((index%projects.length)+projects.length)%projects.length;
  if(source!=='auto')lastInteraction=performance.now();
  const project=projects[selected];
  if(renderedProject===project){if(focus)$(`[data-deck-project="${project.id}"]`)?.focus({preventScroll:true});return;}renderedProject=project;
  $$('.deck-portal').forEach((button,i)=>{button.classList.toggle('selected',i===selected);button.setAttribute('aria-pressed',String(i===selected));});
  const box=$('#deckPreview');box.style.setProperty('--project-color',project.color);
  box.innerHTML=`${project.art?`<img class="deck-preview-art" src="${project.art}" width="720" height="440" alt="Illustrative artwork for ${escape(project.name)}">`:`<div class="deck-preview-symbol" aria-hidden="true">${project.symbol}</div>`}<h3>${escape(project.name)}</h3><p class="deck-preview-stage">${escape(project.stage)}</p><p class="deck-preview-description">${escape(project.description)}</p><div class="deck-preview-tags">${project.tags.map(tag=>`<span>${escape(tag)}</span>`).join('')}</div>`;
  if(source!=='auto'){
    dispatch('portfolio:sfx',{cue:'lock'});
    if(effectsAllowed())box.animate?.([{opacity:.55,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:210,easing:'ease-out'});
  }
  $('#deckOpenTarget').dataset.handAction=`project:${project.id}`;
  $('#deckOpenTarget').setAttribute('aria-label',`Open ${project.name}`);
  const next=project.categories.includes('systems')?'reactor':project.categories.includes('play')?'vortex':project.categories.includes('web')?'aurora':'galaxy';
  if(next!==scene){previousScene=scene;scene=next;morphAt=clock;}
  if(focus){const button=$(`[data-deck-project="${project.id}"]`);button.focus({preventScroll:true});button.scrollIntoView({block:'nearest',behavior:'instant'});}
  draw();schedule();
}
function renderPortals(){
portals.replaceChildren();
projects.forEach((project,index)=>{
  const button=document.createElement('button');button.type='button';button.className='deck-portal';button.dataset.deckProject=project.id;
  button.dataset.handAction=`project:${project.id}`;button.setAttribute('aria-label',`Open project ${index+1}, ${project.name}`);
  button.style.setProperty('--portal-color',project.color);button.style.setProperty('--portal-index',index);
  button.innerHTML=`<span class="deck-portal-top"><span>${project.featured?'FEATURED':'BUILD'} / ${String(index+1).padStart(2,'0')}</span><i></i></span><h3>${escape(project.id==='documentanalyser'?'Document Analyser':project.name)}</h3><p>${escape(project.category.toUpperCase())}</p><span class="portal-visited" aria-label="Discovered">✓</span>`;
  button.addEventListener('pointerenter',()=>setTarget(index));button.addEventListener('focus',()=>setTarget(index));
  button.addEventListener('click',()=>{setTarget(index);openProject(project.id);});portals.appendChild(button);
});
}
renderPortals();
$('#deckOpenTarget').addEventListener('click',()=>{if(projects[selected])openProject(projects[selected].id);});
function navigateClassic(target='home'){
  info.close();deactivate();location.hash=`#${target}`;
  requestAnimationFrame(()=>document.getElementById(target)?.scrollIntoView({block:'start',behavior:'instant'}));
}
function activate({changeHash=true}={}){
  if(active){if(changeHash&&location.hash!=='#deck')location.hash='#deck';return;}
  dispatch('portfolio:exitStudio');$$('dialog[open]').forEach(dialog=>dialog.close());
  active=true;deck.hidden=false;root.classList.add('deck-mode');
  $('#deckCameraDock').appendChild(preview);
  updateInputTray();
  if(changeHash&&location.hash!=='#deck')location.hash='#deck';
  window.scrollTo(0,0);dispatch('portfolio:mode',{deck:true});resize();schedule();
}
function deactivate(){
  active=false;$$('dialog[open]').forEach(dialog=>dialog.close());
  if(document.fullscreenElement===root)document.exitFullscreen().catch(()=>{});
  root.classList.remove('deck-mode');deck.hidden=true;dispatch('portfolio:mode',{deck:false});
  previewHome.insertBefore(preview,previewNext?.parentNode===previewHome?previewNext:null);
  if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;
}
function showInfo(kind){
  $$('dialog[open]').forEach(dialog=>dialog.close());lastInteraction=performance.now();
  const content=$('#deckInfoContent');
  const text={
    about:{title:'The human behind the interface.',body:'<p>I’m <strong>Arpit Kumar Jaiswal</strong>, a B.Tech Information Technology student at MIT Manipal. I build backends, AI experiments, and interfaces with a little personality.</p><p>This universe brings together selected projects and a live library from my GitHub: voice companions, encrypted data, document research, web workspaces, and an orbital-defense game.</p><p>My process is simple: ask a good question, build something, find its limits, and make it better.</p><div class="deck-modal-links"><a href="https://github.com/arpitkjaiswal" target="_blank" rel="noopener noreferrer" data-hand-action="external:github">GitHub ↗</a><a href="#home" data-hand-action="nav:home">Classic portfolio ↗</a></div>'},
    contact:{title:'Open a connection.',body:'<p>Have a project, an opportunity, or a good question? Say hello.</p><div class="deck-modal-links"><a href="mailto:arpit.kr.jaiswal@gmail.com" data-hand-action="external:email">arpit.kr.jaiswal@gmail.com ↗</a><a href="https://www.linkedin.com/in/arpit-kumar-jaiswal-819478302" target="_blank" rel="noopener noreferrer" data-hand-action="external:linkedin">LinkedIn ↗</a><a href="https://github.com/arpitkjaiswal" target="_blank" rel="noopener noreferrer" data-hand-action="external:github">GitHub ↗</a></div>'},
    help:{title:'You have the controls.',body:'<p>Choose a project, take the guided tour, or select <strong>Play Signal Run</strong> for the flight game. For hand control, click <strong>Enable camera</strong> and allow browser permission. Raise an open hand; your index finger becomes the cursor. Point at a project, then briefly hold a <strong>thumb + index pinch</strong> to open it. Release before selecting again.</p><div class="deck-help-grid"><div><h3>Hands &amp; keyboard</h3><dl><div><dt>Point, then pinch</dt><dd>Select a portal, navigation item, or project button.</dd></div><div><dt>Open palm near a screen edge</dt><dd>Scroll a long project file or narrow map.</dd></div><div><dt>Peace sign · hold</dt><dd>Target the next project.</dd></div><div><dt>WASD / arrows · Enter</dt><dd>Move between portals anywhere on the deck, then open the target.</dd></div><div><dt>1–9 · / · Space</dt><dd>Quick-open a spotlight project, search all projects, or send an energy pulse.</dd></div><div><dt>Escape · ?</dt><dd>Close a panel; stop active inputs from the deck. Press ? for this guide.</dd></div></dl></div><div><h3>Say “Jarvis”, then…</h3><button data-deck-command="open LEXA" data-hand-action="execute:open LEXA">open LEXA</button><button data-deck-command="open project two" data-hand-action="execute:open project two">open project two</button><button data-deck-command="next project" data-hand-action="execute:next project">next project</button><button data-deck-command="open selected project" data-hand-action="execute:open selected project">open selected project</button><button data-deck-command="change color" data-hand-action="execute:change color">change color</button><button data-deck-command="close project" data-hand-action="execute:close project">close project</button><button data-deck-command="stop all inputs" data-hand-action="execute:stop all inputs">stop all inputs</button><p>Choose Talk to Jarvis for one-shot listening (no wake word needed) or optional hands-free mode. Type the same commands in the command box. Say “all projects” to search the full GitHub library. “Play Orbit Warden” launches its browser game; “source for LEXA” opens its code. Camera navigation uses this page’s controls only.</p></div></div><p>Camera and microphone require permission and compatible browser features. Hand tracking runs on your device; voice recognition may use your browser’s speech service. Neither input starts automatically.</p>'}
  }[kind];if(!text)return;
  $('#deckInfoTitle').textContent=text.title;content.innerHTML=text.body;
  $$('[data-deck-command]').forEach(button=>button.addEventListener('click',()=>command(button.dataset.deckCommand)));
  info.showModal();info.scrollTop=0;
}
function deckAction(action){
  if(action==='classic'){navigateClassic();return;}
  if(action==='flight'){openFlight();return;}
  if(action==='library'){dispatch('portfolio:library',{filter:'all',query:''});return;}
  if(action==='back'){
    const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();say('Back to the constellation.');}else if(!active)activate();
    return;
  }
  if(!active)activate();
  if(action==='home'){ $$('dialog[open]').forEach(dialog=>dialog.close());say('Mission control ready. Choose a build.');}
  else if(action==='help')showInfo('help');
  else if(action==='next'||action==='previous'){$$('dialog[open]').forEach(dialog=>dialog.close());setTarget(selected+(action==='next'?1:-1),{focus:true});say(`Target acquired: ${projects[selected].name}. Say “open selected project”.`);}
  else if(action==='open'&&projects[selected])openProject(projects[selected].id);
}
function navigate(target){
  if(target==='deck'){activate();return;}
  if(active&&target==='work'){dispatch('portfolio:library',{filter:'all',query:''});return;}
  if(active&&target==='home'){deckAction('home');return;}
  if(active&&['about','contact'].includes(target)){showInfo(target);return;}
  navigateClassic(target);
}
$$('[data-deck-nav]').forEach(button=>button.addEventListener('click',()=>{
  const kind=button.dataset.deckNav;lastInteraction=performance.now();
  if(kind==='map')deckAction('home');else if(kind==='lab')navigateClassic('playground');else showInfo(kind);
}));
$('#deckGuide').addEventListener('click',()=>showInfo('help'));
$('#deckCommandForm').addEventListener('submit',event=>{event.preventDefault();const input=$('#deckCommand'),text=input.value.trim();if(text){const accepted=command(text);input.setAttribute('aria-invalid',String(!accepted));if(accepted)input.value='';}});
$('#deckCommand').addEventListener('input',()=>$('#deckCommand').removeAttribute('aria-invalid'));
$('#deckCoachHelp').addEventListener('click',()=>showInfo('help'));
$('#deckCoachDismiss').addEventListener('click',()=>{$('#deckCoach').hidden=true;try{sessionStorage.setItem('arpit.coach.v2','dismissed');}catch{}});
try{$('#deckCoach').hidden=sessionStorage.getItem('arpit.coach.v2')==='dismissed';}catch{}
$('#deckStopInputs').addEventListener('click',()=>command('stop all inputs'));
$('#deckDismissInput').addEventListener('click',()=>$('#deckInputTray').hidden=true);
$('#deckTour').addEventListener('click',()=>dispatch('portfolio:tour',{action:'toggle'}));
$('#deckFlight').addEventListener('click',openFlight);
document.addEventListener('portfolio:tour-state',event=>{const on=event.detail?.status!=='off';$('#deckTour').setAttribute('aria-pressed',String(on));$('[data-tour-label]').textContent=on?'Exit tour':'Guided tour';});
document.addEventListener('portfolio:tour-target',event=>{const index=projects.findIndex(project=>project.id===event.detail?.id);if(index>=0)setTarget(index,{source:'auto'});});
const proxies={deckCamera:'cameraToggle',deckVoice:'voiceToggle',deckSound:'soundToggle',deckPause:'motionToggle',deckPalette:'paletteToggle'};
for(const [button,target] of Object.entries(proxies))$('#'+button).addEventListener('click',()=>{
  lastInteraction=performance.now();$('#'+target).click();
  if(target==='cameraToggle'){$('#deckInputTray').hidden=false;updateInputTray('camera');say($('#cameraStatus').textContent);}
  if(target==='voiceToggle'){$('#deckInputTray').hidden=false;updateInputTray('voice');say($('#voiceStatus').textContent);}
  syncControls();
});
function syncControls(){
  for(const [proxy,id] of [['deckCamera','cameraToggle'],['deckVoice','voiceToggle']]){
    const source=$('#'+id),button=$('#'+proxy),on=source.getAttribute('aria-pressed')==='true';
    button.setAttribute('aria-pressed',String(on));button.disabled=source.disabled;$('#'+proxy+' span').textContent=source.querySelector('span').textContent;
  }
  $('#deckSound').setAttribute('aria-pressed',$('#soundToggle').getAttribute('aria-pressed'));$('#deckSound').disabled=$('#soundToggle').disabled;
  const soundOn=$('#soundToggle').getAttribute('aria-pressed')==='true';
  $('#deckSound').setAttribute('aria-label',soundOn?'Mute interface sound':'Enable interface sound');
  $('#deckSound span').textContent=soundOn?'Sound on':'Sound off';
  const held=root.classList.contains('motion-paused');$('#deckPause span').textContent=held?'Resume':'Pause';$('#deckPause use').setAttribute('href',held?'#i-play':'#i-pause');$('#deckPause').setAttribute('aria-pressed',String(held));$('#deckPause').setAttribute('aria-label',held?'Resume animations':'Pause animations');
  activeCamera=$('#cameraToggle').getAttribute('aria-pressed')==='true';
  if(activeCamera)$('#deckCamera').dataset.handAction='control:stop-camera';else delete $('#deckCamera').dataset.handAction;
  if($('#voiceToggle').getAttribute('aria-pressed')==='true')$('#deckVoice').dataset.handAction='control:stop-voice';else delete $('#deckVoice').dataset.handAction;
}
for(const id of ['cameraToggle','voiceToggle','soundToggle','motionToggle'])new MutationObserver(syncControls).observe($('#'+id),{attributes:true,attributeFilter:['aria-pressed','disabled'],subtree:true,childList:true});
document.addEventListener('portfolio:inputs',event=>{syncControls();if(active){const state=event.detail||{},camera=$('#cameraToggle').getAttribute('aria-pressed')==='true';if(state.camera==='error'){$('#deckInputTray').hidden=false;updateInputTray('camera');say($('#cameraStatus').textContent);}else if(['error','unsupported'].includes(state.voice)){$('#deckInputTray').hidden=false;updateInputTray('voice');say($('#voiceStatus').textContent);}else say(camera?$('#cameraStatus').textContent:$('#voiceToggle').getAttribute('aria-pressed')==='true'?$('#voiceStatus').textContent:'Inputs off. Mouse, keyboard, and commands are ready.');}});
document.addEventListener('portfolio:status',event=>{if(typeof event.detail?.message==='string')say(event.detail.message);});
function updateInputTray(prefer){
  const cameraOn=$('#cameraToggle').getAttribute('aria-pressed')==='true',voiceOn=$('#voiceToggle').getAttribute('aria-pressed')==='true';
  const mode=[cameraOn?($('#cameraToggle').classList.contains('loading')?'Camera starting…':'Camera on'):null,voiceOn?'Voice on':null].filter(Boolean).join(' · ')||'Mouse & keyboard ready';
  const message=prefer==='camera'?$('#cameraStatus').textContent:prefer==='voice'?$('#voiceStatus').textContent:cameraOn?$('#cameraStatus').textContent:voiceOn?$('#voiceStatus').textContent:'Inputs off. Click a project or press / to search.';
  if($('#deckInputMode').textContent!==mode)$('#deckInputMode').textContent=mode;
  if($('#deckInputMessage').textContent!==message)$('#deckInputMessage').textContent=message;
  if(active&&(cameraOn||voiceOn))$('#deckInputTray').hidden=false;
  $('#deckStopInputs').hidden=!cameraOn&&!voiceOn;$('#deckDismissInput').hidden=cameraOn||voiceOn;
}
let inputTrayFrame=0;
for(const id of ['cameraStatus','voiceStatus'])new MutationObserver(()=>{if(!inputTrayFrame)inputTrayFrame=requestAnimationFrame(()=>{inputTrayFrame=0;updateInputTray(id==='cameraStatus'?'camera':'voice');});}).observe($('#'+id),{childList:true,characterData:true,subtree:true});
document.addEventListener('portfolio:inputs',()=>updateInputTray());
document.addEventListener('portfolio:deck',event=>deckAction(event.detail?.action));
document.addEventListener('portfolio:scene',event=>{
  if(!active||!sceneNames.includes(event.detail?.scene))return;
  const next=event.detail.scene;if(next!==scene){previousScene=scene;scene=next;morphAt=clock;}
  $('#deckMapHint').textContent=`${next[0].toUpperCase()}${next.slice(1)} field`;draw();schedule();
});
document.addEventListener('portfolio:destination',event=>visitDestination(event.detail?.id,event.detail?.kind));
document.addEventListener('portfolio:navigate',event=>{if(active){event.preventDefault();navigate(event.detail?.target);}});
document.addEventListener('portfolio:project-opened',event=>{
  const id=event.detail?.id,project=projectById(id);if(!project)return;
  const spotlightIndex=projects.indexOf(project);if(spotlightIndex>=0)setTarget(spotlightIndex,{source:'auto'});
  const record=progress.visit(id);showProgress();
  const meta=document.createElement('p');meta.className='deck-dossier-meta';meta.textContent=`PROJECT / ${project.name} · ${record.count}/${record.total} DISCOVERED${record.fresh?' · +100 EXPLORER XP':''}`;
  $('#projectDialogContent').prepend(meta);
  if(active){
    dispatch('portfolio:sfx',{cue:'warp'});
    if(record.fresh)dispatch('portfolio:sfx',{cue:'discovery'});
    if(effectsAllowed()){
      $('.dossier-warp').animate?.([
        {opacity:0,transform:'scale(.93) translateY(-12px)'},
        {opacity:.8,offset:.22},
        {opacity:0,transform:'scale(1.18) translateY(24px)'}
      ],{duration:530,easing:'cubic-bezier(.15,.6,.2,1)'});
      $('#projectDialogContent').animate?.([{opacity:.68},{opacity:1}],{duration:360,easing:'ease-out'});
    }
  }
  if(record.fresh){
    say(`DISCOVERY +100 XP / ${project.name}. ${record.count} of ${record.total} builds explored.`);
    if(!active)dispatch('portfolio:burst');
  }
});
const external={github:'https://github.com/arpitkjaiswal',linkedin:'https://www.linkedin.com/in/arpit-kumar-jaiswal-819478302',email:'mailto:arpit.kr.jaiswal@gmail.com'};
function activateHandAction(action,element){
  if(typeof action!=='string'||!action)return;
  const separator=action.indexOf(':'),kind=separator<0?action:action.slice(0,separator),value=separator<0?'':action.slice(separator+1);
  lastInteraction=performance.now();
  if(kind==='project')openProject(value);
  else if(kind==='source'||kind==='demo')visitDestination(value,kind);
  else if(kind==='dialog-close')element.click();
  else if(kind==='nav'){
    if(value==='home')navigateClassic();else if(value==='library')dispatch('portfolio:library');else if(['about','contact','work','playground','deck'].includes(value))navigate(value);
    else if(value==='map')deckAction('home');else if(value==='lab')navigateClassic('playground');else if(value==='help')showInfo('help');
  }
  else if(kind==='execute')command(value);
  else if(kind==='flight'&&value==='press'&&element.closest('#flightDialog'))element.click();
  else if(kind==='tour'){if(value==='stop')$('#tourExit').click();else if(value==='toggle-play')$('#tourPlay').click();else if(value.startsWith('chapter:'))$('#tourChapters').children[Number(value.split(':')[1])]?.click();else dispatch('portfolio:tour',{action:value});}
  else if(kind==='library-filter'&&['all','featured','ai','systems','web','play'].includes(value))$(`[data-library-filter="${value}"]`)?.click();
  else if(kind==='filter'&&['all','ai','systems','web','play'].includes(value))$(`[data-filter="${value}"]`)?.click();
  else if(kind==='scene'&&sceneNames.includes(value))$(`[data-scene="${value}"]`)?.click();
  else if(kind==='external'&&external[value])location.assign(external[value]);
  else if(kind==='control'){
    const controls={sound:'soundToggle',pause:'motionToggle',palette:'paletteToggle',stop:'stopAllInputs','stop-camera':'cameraToggle','stop-voice':'voiceToggle',burst:'energyBurst',refresh:'libraryRefresh',tour:'deckTour',flight:'deckFlight','jarvis-listen':'jarvisListen'};
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
  $('#deckGuide').dataset.handAction='nav:help';$('#deckCoachHelp').dataset.handAction='nav:help';
}
markTargets();syncControls();
startHandNavigation({onActivate:activateHandAction,onHover:element=>{
  if(element?.dataset.deckProject){const index=projects.findIndex(project=>project.id===element.dataset.deckProject);if(index>=0)setTarget(index,{source:'hand'});}
}});
document.addEventListener('keydown',event=>{
  if(!active||root.classList.contains('tour-mode')||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||document.querySelector('dialog[open]'))return;
  if(event.key==='Escape'){
    if($('#cameraToggle').getAttribute('aria-pressed')==='true'||$('#voiceToggle').getAttribute('aria-pressed')==='true')command('stop all inputs');
    return;
  }
  if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(event.key==='?'){event.preventDefault();showInfo('help');return;}
  if(/^[1-9]$/.test(event.key)&&!event.repeat){const index=Number(event.key)-1;if(index<projects.length){event.preventDefault();setTarget(index);openProject(projects[index].id);}return;}
  const next=moveProjectIndex(selected,event.key,projects.length,Number(getComputedStyle(portals).getPropertyValue('--portal-columns'))||3);
  if(next!==selected){event.preventDefault();setTarget(next,{focus:true});return;}
  if(event.key==='Enter'&&event.target===map){event.preventDefault();if(projects[selected])openProject(projects[selected].id);}
  if(event.key===' '&&!event.target.closest('button,a')){event.preventDefault();dispatch('portfolio:burst');say('Signal sent. Keep exploring.');}
});
map.addEventListener('pointermove',event=>{
  const rect=map.getBoundingClientRect();pointer.x=(event.clientX-rect.left)/rect.width;pointer.y=(event.clientY-rect.top)/rect.height;
  ship={x:pointer.x,y:pointer.y,shown:true};updateShip();lastInteraction=performance.now();
},{passive:true});
map.addEventListener('pointerleave',()=>{ship.shown=false;updateShip();});
map.addEventListener('scroll',()=>{cacheAnchors();lastInteraction=performance.now();},{passive:true});
$('#deckFullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{say('The command deck already fills this page. Browser fullscreen is unavailable here.');}});
document.addEventListener('fullscreenchange',()=>{const full=Boolean(document.fullscreenElement);$('#deckFullscreen').setAttribute('aria-pressed',String(full));$('#deckFullscreen').setAttribute('aria-label',full?'Exit browser fullscreen':'Enter browser fullscreen');$('#deckFullscreen').textContent=full?'↙':'⤢';});
function route(){const wantsDeck=!location.hash||location.hash==='#deck';if(wantsDeck){activate({changeHash:false});if(!location.hash)history.replaceState(null,'','#deck');}else if(active){deactivate();const target=document.getElementById(location.hash.slice(1));requestAnimationFrame(()=>target?.scrollIntoView({block:'start',behavior:'instant'}));}}
window.addEventListener('hashchange',route);

function cacheAnchors(){
  const field=root.classList.contains('tour-mode')?$('#guidedTour'):map;
  const origin=deck.getBoundingClientRect(),mapRect=field.getBoundingClientRect();
  mapGeometry={x:mapRect.left-origin.left,y:mapRect.top-origin.top,width:Math.max(1,mapRect.width),height:Math.max(1,mapRect.height)};
  anchors=$$('.deck-portal').map((button,index)=>{
    const rect=button.getBoundingClientRect();return {x:rect.left+rect.width/2-origin.left,y:rect.top+rect.height/2-origin.top,index,visible:rect.bottom>mapRect.top&&rect.top<mapRect.bottom};
  });
}
function resize(){
  if(!active)return;
  const rect=deck.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(devicePixelRatio||1,budget.dpr);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);
  cacheAnchors();draw();
}
function draw(){
  if(!canRender()||!ctx)return;
  const started=performance.now(),mapRect=mapGeometry;
  const cx=mapRect.x+mapRect.width*.5+(pointer.x-.5)*12;
  const cy=mapRect.y+mapRect.height*.5+(pointer.y-.5)*10;
  const radius=Math.min(mapRect.width*.34,mapRect.height*.38,220);
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle='#050b13';ctx.fillRect(0,0,width,height);
  const cloud=ctx.createRadialGradient(cx,cy,10,cx,cy,Math.max(width,height)*.65);
  cloud.addColorStop(0,'#17537542');cloud.addColorStop(.4,'#0c284127');cloud.addColorStop(1,'#050a1100');ctx.fillStyle=cloud;ctx.fillRect(0,0,width,height);
  const purple=ctx.createRadialGradient(width*.79,height*.34,0,width*.79,height*.34,width*.5);purple.addColorStop(0,'#52376412');purple.addColorStop(1,'#00000000');ctx.fillStyle=purple;ctx.fillRect(0,0,width,height);
  // A drifting star field and a perspective navigation grid.
  for(let i=0;i<budget.stars;i++){
    const x=(i*137.507+Math.sin(clock*.03+i)*19+width)%width;
    const y=((i*83.123-clock*(.4+i%3))%height+height)%height;
    ctx.globalAlpha=.13+(i%5)*.06;ctx.fillStyle=i%7===0?'#bba5e8':'#9adcea';ctx.fillRect(x,y,i%13===0?1.8:.8,i%13===0?1.8:.8);
  }
  ctx.globalAlpha=1;
  ctx.strokeStyle='#7bd9f409';ctx.lineWidth=.6;
  for(let i=-6;i<=6;i++){ctx.beginPath();ctx.moveTo(cx+i*22,cy);ctx.lineTo(cx+i*210,height);ctx.stroke();}
  for(let i=0;i<9;i++){const t=i/8,y=cy+(height-cy)*t*t;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  // Connections point to the actual project portals; they are navigational artwork.
  for(const anchor of root.classList.contains('tour-mode')?[]:anchors){
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
  for(const bucket of particleBuckets)bucket.length=0;
  const total=budget.points;
  for(let index=0;index<total;index++){
    const i=Math.floor(index*to.length/total),a=from[i],b=to[i];
    const x=a[0]+(b[0]-a[0])*blend,y=a[1]+(b[1]-a[1])*blend,z=a[2]+(b[2]-a[2])*blend;
    const rx=x*co+z*si,depth=-x*si+z*co,perspective=3/(3-depth*.25);
    const sx=cx+rx*radius*perspective,sy=cy+y*radius*perspective;
    const color=i%17===0?2:i%5===0?1:0,layer=Math.max(0,Math.min(3,Math.floor((depth+1.2)/.6)));
    particleBuckets[color*4+layer].push(sx,sy,.5+Math.max(0,depth+1.1)*.29);
  }
  for(let group=0;group<particleBuckets.length;group++){
    const bucket=particleBuckets[group];ctx.globalAlpha=.12+(group%4)*.065;ctx.fillStyle=['#71efff','#d4ff63','#bca4f7'][Math.floor(group/4)];ctx.beginPath();
    for(let i=0;i<bucket.length;i+=3){const x=bucket[i],y=bucket[i+1],r=bucket[i+2];ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);}ctx.fill();
  }
  ctx.restore();
  // Orbital instrument markings stay alive without moving the clickable targets.
  for(let orbit=0;orbit<3;orbit++){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.4+orbit*.6+clock*(orbit===1?-.03:.02));
    ctx.strokeStyle=orbit===1?'#d4ff6322':'#71efff26';ctx.lineWidth=.6;ctx.beginPath();ctx.ellipse(0,0,radius*(1.15+orbit*.2),radius*(.3+orbit*.2),0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.translate(cx,cy);ctx.strokeStyle='#7edcf542';ctx.lineWidth=.6;
  ctx.beginPath();for(let i=0;i<80;i++){const a=i/80*Math.PI*2+clock*.03,r=radius*1.43;ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*(r+(i%10===0?8:3)),Math.sin(a)*(r+(i%10===0?8:3)));}ctx.stroke();ctx.restore();
  const sweep=(clock*.035)%1;ctx.strokeStyle='#75dce50e';ctx.beginPath();ctx.moveTo(0,sweep*height);ctx.lineTo(width,sweep*height);ctx.stroke();
  const meteor=(clock%9)/9;
  if(meteor<.18){const x=width*(1.15-meteor*4),y=height*(.17+meteor);const tail=ctx.createLinearGradient(x,y,x+120,y-25);tail.addColorStop(0,'#a9eaff88');tail.addColorStop(1,'#a9eaff00');ctx.strokeStyle=tail;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+120,y-25);ctx.stroke();}
  for(let i=pulses.length-1;i>=0;i--){const age=clock-pulses[i].at;if(age>2.5){pulses.splice(i,1);continue;}ctx.globalAlpha=(1-age/2.5)*.45;ctx.strokeStyle='#d4ff63';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(pulses[i].x,pulses[i].y,10+age*230,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  if(drawBudget.record(performance.now()-started)&&budget.name==='cinematic'){adaptiveEco=true;updateBudget();}
}
function updateShip(){const marker=$('#deckShip');marker.classList.toggle('active',ship.shown);marker.style.left='0';marker.style.top='0';marker.style.transform=`translate3d(${ship.x*mapGeometry.width}px,${ship.y*mapGeometry.height}px,0) translate(-50%,-50%)`;}
function updateBudget(){const next=getRenderState().budget;budget=adaptiveEco?{...next,points:Math.min(next.points,320),stars:55,fps:next.fps?24:0,dpr:1,name:'eco'}:next;pacer.setRate(budget.fps);deck.dataset.quality=budget.name;resize();schedule();}
function tick(now){
  frame=0;if(!canRender()||paused){lastFrame=0;pacer.reset();return;}
  if(pacer.due(now)){const dt=lastFrame?Math.min((now-lastFrame)/1000,.08):.033;lastFrame=now;clock+=dt;draw();}
  schedule();
}
function schedule(){if(!frame&&canRender()&&!paused)frame=requestAnimationFrame(tick);}
document.addEventListener('portfolio:render-state',()=>{if(!canRender()){if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;pacer.reset();}else updateBudget();});
document.addEventListener('portfolio:burst',()=>{if(active){const target=anchors[selected]||{x:width/2,y:height/2};pulses.push({x:target.x,y:target.y,at:clock});if(pulses.length>4)pulses.shift();draw();}});
document.addEventListener('portfolio:hand',event=>{
  const hand=event.detail;if(!active||!hand)return;
  lastInteraction=performance.now();
  const mapped=mapHandPointer(hand.cursorX??hand.x,hand.cursorY??hand.y);if(!mapped)return;
  const rect=map.getBoundingClientRect(),x=mapped.x*innerWidth,y=mapped.y*innerHeight;
  ship={x:(x-rect.left)/rect.width,y:(y-rect.top)/rect.height,shown:x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom};updateShip();
});
new MutationObserver(()=>{
  paused=root.classList.contains('motion-paused');accent=getComputedStyle(root).getPropertyValue('--accent').trim();
  deck.style.setProperty('--deck-cyan',root.dataset.palette==='coral'?'#ffa990':root.dataset.palette==='ice'?'#83e6f0':'#71efff');
  lastFrame=0;pacer.reset();syncControls();draw();schedule();
}).observe(root,{attributes:true,attributeFilter:['class','data-palette']});
if('ResizeObserver'in window){
  const observer=new ResizeObserver(resize);
  observer.observe(deck);
  observer.observe(map);
}
window.addEventListener('resize',resize,{passive:true});window.visualViewport?.addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;}else schedule();});
window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;});
document.addEventListener('portfolio:catalog',()=>{
  const selectedId=projects[selected]?.id;projects=spotlightProjects(getProjects());window.PORTFOLIO_SPOTLIGHT=projects.map(p=>p.id);
  progress.setCatalog(getProjects().map(p=>p.id));renderPortals();setTarget(Math.max(0,projects.findIndex(p=>p.id===selectedId)),{source:'auto'});showProgress();cacheAnchors();draw();
});
setTarget(0,{source:'auto'});showProgress();route();
