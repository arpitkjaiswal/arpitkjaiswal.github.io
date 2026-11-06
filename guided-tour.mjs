import {TourTimeline} from './tour-core.mjs?v=20261107-orbit';
import {getProjects} from './project-catalog.mjs?v=20261107-orbit';
import {spotlightProjects} from './catalog-core.mjs?v=20261107-orbit';
import {sayText,cancelSpeech} from './speech-output.mjs?v=20261107-orbit';

const $=selector=>document.querySelector(selector),root=document.documentElement,stage=$('#guidedTour');
const timeline=new TourTimeline(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let timer=0,lastKey='',narrated='',opener=null,displayedId='';
const dispatch=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
function announce(){const state=timeline.snapshot(),key=`${state.status}:${state.index}`;if(key!==lastKey){lastKey=key;dispatch('portfolio:tour-state',{...state,project:state.project?.id});}}
function narrate(){const {project,index,status}=timeline.snapshot(),key=`${index}:${project?.id}`;if(status!=='playing'||!project||!$('#tourNarration').checked||key===narrated)return;narrated=key;sayText(`${project.name}. ${project.stage}. ${project.description}`,{force:true});}
function paint(){
  const state=timeline.snapshot(),project=state.project;if(!project)return;
  const complete=state.status==='complete';stage.dataset.status=state.status;stage.style.setProperty('--tour-color',project.color);
  $('#tourCount').textContent=`${String(state.index+1).padStart(2,'0')} / ${String(state.total).padStart(2,'0')}`;
  $('#tourTitle').textContent=complete?'That’s the tour. The building continues.':project.name;
  $('#tourCategory').textContent=complete?'EXPLORATION COMPLETE':project.category.toUpperCase();
  $('#tourDescription').textContent=complete?`Explore ${state.total} selected builds in more depth. Browse every public project, or return to the constellation and explore with your hands.`:project.description;
  $('#tourStage').hidden=complete;$('#tourTags').hidden=complete;$('#tourStage').textContent=project.stage;$('#tourTags').replaceChildren(...project.tags.map(tag=>{const item=document.createElement('span');item.textContent=tag;return item;}));
  const art=$('#tourArt');art.hidden=!project.art;if(project.art){if(art.getAttribute('src')!==project.art)art.src=project.art;art.alt=`Illustrative artwork for ${project.name}`;}
  $('#tourSymbol').textContent=project.symbol;$('#tourSymbol').hidden=Boolean(project.art);
  $('#tourOpen').textContent=complete?'Explore all projects ↗':`Inside ${project.name} ↗`;
  $('#tourOpen').dataset.handAction=complete?'nav:library':`project:${project.id}`;
  $('#tourPlay').textContent=complete?'Replay tour':state.status==='playing'?'Pause tour':'Resume tour';
  $('#tourPlay').setAttribute('aria-pressed',String(state.status==='playing'));
  $('#tourPrevious').disabled=state.index===0;$('#tourNext').disabled=complete;$('#tourNext').setAttribute('aria-label',state.index===state.total-1?'Finish tour':'Next chapter');
  $('#tourState').textContent=complete?'Tour complete · keep exploring':state.status==='paused'?'Paused · explore at your pace':'Autopilot · next chapter shortly';
  $('#tourChapters').querySelectorAll('button').forEach((button,index)=>{button.setAttribute('aria-current',String(index===state.index));button.classList.toggle('complete',index<state.index||complete);});
  $('#tourProgress').style.transform=`scaleX(${state.progress})`;
  if(displayedId!==project.id&&!reduced.matches&&!root.classList.contains('motion-paused')){document.querySelector('.tour-copy').animate([{opacity:.2,transform:'translate3d(0,12px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:550,easing:'cubic-bezier(.2,.8,.2,1)'});document.querySelector('.tour-art-window').animate([{opacity:.3},{opacity:1}],{duration:700});}displayedId=project.id;
  announce();narrate();
}
function schedule(){clearTimeout(timer);if(timeline.status==='playing'&&!document.hidden)timer=setTimeout(tick,100);}
function tick(){timeline.tick(performance.now());$('#tourProgress').style.transform=`scaleX(${timeline.snapshot().progress})`;if(`${timeline.status}:${timeline.index}`!==lastKey)paint();schedule();}
function start(){
  const items=spotlightProjects(getProjects());if(!items.length)return;
  if(timeline.status==='off')opener=document.activeElement;
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  root.classList.add('tour-mode');stage.hidden=false;$('.deck-layout').inert=true;
  timeline.start(items,performance.now(),{manual:reduced.matches||root.classList.contains('motion-paused')});timeline.setSpeed($('#tourSpeed').value);narrated='';
  $('#tourChapters').replaceChildren(...items.map((project,index)=>{const button=document.createElement('button');button.type='button';const number=document.createElement('span'),title=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');title.textContent=project.name;button.append(number,title);button.setAttribute('aria-label',`Chapter ${index+1}: ${project.name}`);button.dataset.handAction=`tour:chapter:${index}`;button.addEventListener('click',()=>seek(index));return button;}));
  paint();schedule();$('#tourExit').focus({preventScroll:true});
}
function stop(){if(timeline.status==='off')return;timeline.stop();clearTimeout(timer);cancelSpeech();root.classList.remove('tour-mode');stage.hidden=true;$('.deck-layout').inert=false;announce();opener?.focus?.({preventScroll:true});}
function pause(reason='Paused · explore at your pace'){if(timeline.status!=='playing')return;timeline.pause(performance.now());clearTimeout(timer);cancelSpeech();paint();$('#tourState').textContent=reason;}
function resume(){if(timeline.status==='complete'){start();return;}timeline.resume(performance.now());narrated='';paint();schedule();}
function next(){cancelSpeech();timeline.next(performance.now());narrated='';paint();schedule();}
function seek(index){cancelSpeech();timeline.seek(index,performance.now());narrated='';paint();schedule();}
function action({action:kind,value}={}){
  if(kind==='toggle'){timeline.status==='off'?start():stop();return;}
  if(kind==='start'||kind==='restart'){start();return;}
  if(kind==='stop'){stop();return;}
  if(timeline.status==='off')return;
  if(kind==='pause')pause();else if(kind==='resume')resume();else if(kind==='next')next();else if(kind==='previous')seek(timeline.index-1);else if(kind==='speed'){const speed=value==='faster'?'quick':value==='slower'?'relaxed':value;timeline.setSpeed(speed);$('#tourSpeed').value=timeline.speed;paint();}
}
$('#tourExit').addEventListener('click',stop);$('#tourPlay').addEventListener('click',()=>timeline.status==='playing'?pause():resume());
$('#tourPrevious').addEventListener('click',()=>seek(timeline.index-1));$('#tourNext').addEventListener('click',next);
$('#tourOpen').addEventListener('click',()=>{if(timeline.status==='complete'){dispatch('portfolio:library',{filter:'all',query:''});return;}pause();dispatch('portfolio:project',{id:timeline.snapshot().project.id});});
$('#tourSpeed').addEventListener('change',()=>timeline.setSpeed($('#tourSpeed').value));
document.querySelector('.tour-copy').addEventListener('focusin',()=>pause('Paused while you explore this build'));
$('#tourChapters').addEventListener('focusin',()=>pause('Paused · choose a chapter, then resume'));
$('#tourNarration').addEventListener('change',()=>{if($('#tourNarration').checked){narrated='';narrate();}else cancelSpeech();});
document.addEventListener('portfolio:tour',event=>action(event.detail));
document.addEventListener('portfolio:tour-state',event=>{if(event.detail?.project)dispatch('portfolio:tour-target',{id:event.detail.project});});
document.addEventListener('portfolio:render-state',event=>{if(event.detail?.dialogOpen)pause('Paused while a panel is open');});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('Paused while you were away');});
document.addEventListener('portfolio:mode',event=>{if(!event.detail?.deck)stop();});
document.addEventListener('portfolio:mute-output',()=>{$('#tourNarration').checked=false;cancelSpeech();});
document.addEventListener('keydown',event=>{
  if(timeline.status==='off'||document.querySelector('dialog[open]')||event.ctrlKey||event.altKey||event.metaKey)return;
  if(event.key==='Escape'){event.preventDefault();stop();return;}
  if(event.target.closest('input,select,textarea,button,a'))return;
  if(event.key==='ArrowRight'){event.preventDefault();next();}else if(event.key==='ArrowLeft'){event.preventDefault();seek(timeline.index-1);}else if(event.key===' '){event.preventDefault();timeline.status==='playing'?pause():resume();}
},true);
new MutationObserver(()=>{if(root.classList.contains('motion-paused'))pause('Animations paused · resume the tour when ready');}).observe(root,{attributes:true,attributeFilter:['class']});
window.addEventListener('pagehide',()=>{clearTimeout(timer);cancelSpeech();});
