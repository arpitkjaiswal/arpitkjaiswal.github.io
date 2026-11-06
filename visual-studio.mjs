import {SCENES, clamp, readHands, PoseLatch, parseCommand, particleShape} from './interaction-core.mjs?v=20261106-deck1';
import {HandCamera, VoiceControl, handGraphicsAvailable} from './input-controllers.mjs?v=20261106-deck1';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const root=document.documentElement;
const studio=$('#liveStudio'), viewport=$('#studioViewport'), canvas=$('#studioCanvas');
const ctx=canvas.getContext('2d');
const ambient=$('#ambientCanvas'), ambientCtx=ambient.getContext('2d');
const handOverlay=$('#handOverlay'), handCtx=handOverlay.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const compact=matchMedia('(max-width:680px)').matches;
const count=compact?640:1280;
$('#nodeCount').textContent=count.toLocaleString('en-US');
if(compact)$('#visualCommand').placeholder='Type a command…';
const shapes=Object.fromEntries(SCENES.map(scene=>[scene,Array.from({length:count},(_,i)=>particleShape(i,count,scene))]));
const sceneCopy={
  reactor:{title:'REACTOR',line:'Good questions. Limitless energy.'},
  galaxy:{title:'GALAXY',line:'A thousand little possibilities.'},
  vortex:{title:'VORTEX',line:'Find the beautiful in the unexpected.'},
  aurora:{title:'AURORA',line:'Let the quiet ideas glow.'}
};
let scene='galaxy',previousScene='galaxy',morphStart=-10,sceneElapsed=0,auto=true;
let width=1,height=1,ambientWidth=1,ambientHeight=1,dpr=1;
let clock=0,lastFrame=0,frameID=0,visible=true,lastHud=0;
let paused=root.classList.contains('motion-paused');
let palette=[],accent='#d4ff63';
let hands=null,lastHandsAt=0,stablePose='steer',candidatePose='steer',poseSince=0;
const poseLatch=new PoseLatch(650);
let pointer={x:.5,y:.5,activeAt:-10000,down:false,repel:false};
let smooth={x:.5,y:.5,zoom:1};
let inputAt=-10000,inputSource='AUTOPILOT';
let cameraState='off',voiceState='off',lastSpoken=0,expanded=false,previousOverflow='';
const bursts=[];
const stars=Array.from({length:100},(_,i)=>({x:((i*137.508)%997)/997,y:((i*89.317)%991)/991,size:.5+(i%4)*.25}));
const projected=Array.from({length:count},(_,i)=>({x:0,y:0,z:0,index:i}));
const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

function status(message){$('#studioStatus').textContent=message;document.dispatchEvent(new CustomEvent('portfolio:status',{detail:{message}}));}
function readPalette(){
  const css=getComputedStyle(root);accent=css.getPropertyValue('--accent').trim();
  palette=[accent,'#75dce5','#a89cf5','#f39bc4','#e7f5ff'];
}
readPalette();
function setScene(next,{source='manual'}={}){
  if(!SCENES.includes(next))return;
  if(next!==scene){previousScene=scene;scene=next;morphStart=clock;}
  sceneElapsed=0;
  document.dispatchEvent(new CustomEvent('portfolio:scene',{detail:{scene,source}}));
  $('#sceneName').textContent=sceneCopy[scene].title;
  $('#sceneTagline').textContent=sceneCopy[scene].line;
  $('#sceneIndex').textContent=`0${SCENES.indexOf(scene)+1} / 04`;
  $$('.scene-button').forEach(button=>{const selected=button.dataset.scene===scene;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
  if(source!=='auto')status(`${sceneCopy[scene].title} engaged. ${paused?'Animations are paused.':auto?'Autopilot will take it from here.':'You have the controls.'}`);
  if(source==='voice') {inputAt=performance.now();inputSource='VOICE';}
  draw();schedule();
}
function nextScene(direction=1,source='manual'){setScene(SCENES[(SCENES.indexOf(scene)+direction+SCENES.length)%SCENES.length],{source});}
function setAuto(value){
  auto=value;sceneElapsed=0;
  $('#autoScenes').setAttribute('aria-pressed',String(auto));$('#autoScenes').classList.toggle('active',auto);
  $('#autoScenes span').textContent=auto?'On':'Off';
  status(auto?'Autopilot engaged. Scenes will evolve automatically.':'Auto scene changes off. Pick a world and make it yours.');
}
function burst(source='manual'){
  bursts.push({start:clock,x:smooth.x,y:smooth.y});if(bursts.length>5)bursts.shift();
  status(paused?'Signal sent. Resume animations to watch it travel.':'Signal sent. A little energy goes a long way.');
  inputAt=performance.now();inputSource=source==='voice'?'VOICE':hands?'HAND':'POINTER';
  document.dispatchEvent(new CustomEvent('portfolio:burst'));
  draw();schedule();
}
function updateBeacon(){
  const cameraOn=cameraState==='tracking'||cameraState==='requesting'||cameraState==='loading';
  const voiceOn=voiceState==='listening'||voiceState==='starting';
  $('#inputBeacon').hidden=!cameraOn&&!voiceOn;
  document.dispatchEvent(new CustomEvent('portfolio:inputs',{detail:{camera:cameraState,voice:voiceState}}));
  $('#beaconLabel').textContent=[cameraOn?(cameraState==='requesting'?'CAMERA STARTING':'CAMERA ON'):'',voiceOn?(voiceState==='starting'?'MIC STARTING':'MIC ON'):''].filter(Boolean).join(' + ');
}
function drawHandOverlay(landmarks){
  const w=352,h=264;
  if(handOverlay.width!==w){handOverlay.width=w;handOverlay.height=h;}
  if(!handCtx)return;
  handCtx.clearRect(0,0,w,h);handCtx.lineWidth=1.7;
  (landmarks||[]).slice(0,2).forEach(points=>{
    if(!points||points.length!==21||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return;
    handCtx.strokeStyle='#75dce5';handCtx.fillStyle='#d4ff63';
    for(const [a,b] of connections){handCtx.beginPath();handCtx.moveTo((1-points[a].x)*w,points[a].y*h);handCtx.lineTo((1-points[b].x)*w,points[b].y*h);handCtx.stroke();}
    for(const p of points){handCtx.beginPath();handCtx.arc((1-p.x)*w,p.y*h,2.5,0,Math.PI*2);handCtx.fill();}
  });
}
const camera=new HandCamera({video:$('#handVideo'),
  onState(snapshot){
    cameraState=snapshot.state;
    const button=$('#cameraToggle'),engaged=snapshot.active||snapshot.loading;
    button.setAttribute('aria-pressed',String(engaged));button.classList.toggle('loading',snapshot.loading);
    $('#cameraToggle span').textContent=snapshot.loading?'Cancel camera':snapshot.active?'Stop camera':'Enable camera';
    $('#cameraPreview').hidden=!snapshot.active;
    $('#cameraStatus').textContent=snapshot.message;
    if(snapshot.state==='error')status(snapshot.message);
    updateBeacon();
  },
  onHands(landmarks,now){
    hands=readHands(landmarks);
    if(hands){
      lastHandsAt=now;
      if(candidatePose!==hands.pose){candidatePose=hands.pose;poseSince=now;}
      if(now-poseSince>=120)stablePose=hands.pose;
      if(poseLatch.update(stablePose,now)){if(root.classList.contains('deck-mode'))document.dispatchEvent(new CustomEvent('portfolio:deck',{detail:{action:'next'}}));else nextScene(1,'hand');}
      $('#cameraStatus').textContent=`${hands.count===2?'Two hands':'Hand'} detected · ${{pinch:'attract',palm:'repel',fist:'hold',peace:'hold to change scene',steer:'steering'}[stablePose]}.`;
      document.dispatchEvent(new CustomEvent('portfolio:hand',{detail:{x:hands.x,y:hands.y,cursorX:hands.cursorX,cursorY:hands.cursorY,pose:stablePose,zoom:hands.zoom}}));
    }else{if(camera.active)$('#cameraStatus').textContent='Camera ready. Raise a hand in the preview.';stablePose='steer';candidatePose='steer';poseSince=now;poseLatch.reset();document.dispatchEvent(new CustomEvent('portfolio:hand',{detail:null}));}
    drawHandOverlay(landmarks);
    if(paused)draw();
  }
});
function speak(message){
  if(!voice.wanted||$('#soundToggle').getAttribute('aria-pressed')!=='true'||!('speechSynthesis'in window)||performance.now()-lastSpoken<700)return;
  lastSpoken=performance.now();speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(message);utterance.lang='en-IN';utterance.rate=1.04;utterance.volume=.65;
  speechSynthesis.speak(utterance);
}
function stopInputs(message='Inputs stopped. Autopilot is ready.'){
  camera.stop();voice.stop();if('speechSynthesis'in window)speechSynthesis.cancel();status(message);
}
function executeCommand(text,{spoken=false}={}){
  const command=parseCommand(text,{requireWakeWord:spoken});
  if(!command){
    if(!spoken||/\bjarvis\b/i.test(text))status('Command not recognized. Try “next scene”, “galaxy”, “burst”, or open the guide.');
    return false;
  }
  let reply='Done.';
  switch(command.type){
    case 'openProject':{document.dispatchEvent(new CustomEvent('portfolio:project',{detail:{id:command.id}}));const project=window.PORTFOLIO.projects.find(p=>p.id===command.id);status(`Opening ${project?.name||'project'}.`);reply=`Opening ${project?.name||'project'}.`;break;}
    case 'launchProject':case 'sourceProject':{document.dispatchEvent(new CustomEvent('portfolio:destination',{detail:{id:command.id,kind:command.type==='sourceProject'?'source':'demo'}}));reply='Opening the project.';break;}
    case 'deck':document.dispatchEvent(new CustomEvent('portfolio:deck',{detail:{action:command.action}}));reply='Interface updated.';break;
    case 'scroll':{const scroller=document.querySelector('dialog[open]')||(root.classList.contains('deck-mode')?document.querySelector('#deckMap'):document.scrollingElement);scroller?.scrollBy({top:command.direction*innerHeight*.55,behavior:paused?'instant':'smooth'});reply='Scrolling.';break;}
    case 'scene':setScene(command.scene,{source:spoken?'voice':'manual'});reply=`${command.scene} engaged.`;break;
    case 'next':nextScene(1,spoken?'voice':'manual');reply=`${scene} engaged.`;break;
    case 'previous':nextScene(-1,spoken?'voice':'manual');reply=`${scene} engaged.`;break;
    case 'palette':$('#paletteToggle').click();reply='Color updated.';status('A fresh spectrum. Keep exploring.');break;
    case 'burst':burst(spoken?'voice':'manual');reply='Signal sent.';break;
    case 'pause':if(!root.classList.contains('motion-paused'))$('#motionToggle').click();status('Animations paused. Say “Jarvis, resume” when you’re ready.');reply='Animations paused.';break;
    case 'resume':if(root.classList.contains('motion-paused'))$('#motionToggle').click();status('Motion restored. The universe is yours.');reply='Motion restored.';break;
    case 'autopilot':setAuto(command.enabled);reply=command.enabled?'Autopilot engaged.':'You have control.';break;
    case 'navigate':{
      if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
      if(expanded)exitExpanded();
      const navigation=new CustomEvent('portfolio:navigate',{cancelable:true,detail:{target:command.target}});if(!document.dispatchEvent(navigation)){reply='On your screen.';break;}
      const target=document.getElementById(command.target);location.hash=`#${command.target}`;
      target?.scrollIntoView({behavior:paused?'instant':'smooth'});status(`Showing ${command.target==='work'?'projects':command.target}.`);reply='On your screen.';break;
    }
    case 'cameraOff':camera.stop();reply='Camera off.';status('Camera stopped. Mouse and voice control are ready.');break;
    case 'voiceOff':voice.stop();status('Voice stopped. You can keep typing commands.');return true;
    case 'stopInputs':stopInputs();return true;
    case 'help':if(root.classList.contains('deck-mode')){document.dispatchEvent(new CustomEvent('portfolio:deck',{detail:{action:'help'}}));reply='Controls open.';break;}if(expanded)exitExpanded();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});$('#controlGuide').open=true;$('#controlGuide').scrollIntoView({block:'nearest',behavior:paused?'instant':'smooth'});status('The control guide is open just below the interface.');reply='Control guide open.';break;
  }
  if(spoken){inputAt=performance.now();inputSource='VOICE';speak(reply);}
  return true;
}
const voice=new VoiceControl({
  onState(snapshot){
    voiceState=snapshot.state;
    const engaged=['listening','starting'].includes(snapshot.state);
    $('#voiceToggle').setAttribute('aria-pressed',String(engaged));
    $('#voiceToggle span').textContent=engaged?'Stop voice':'Enable voice';
    $('#voiceToggle').classList.toggle('loading',snapshot.state==='starting');
    $('#voiceIndicator').classList.toggle('active',engaged);
    $('#voiceIndicator').innerHTML=`<i></i> ${snapshot.state==='listening'?'LISTENING':snapshot.state==='starting'?'MIC STARTING':'VOICE OFF'}`;
    $('#voiceStatus').textContent=snapshot.message;
    if(['error','unsupported'].includes(snapshot.state))status(snapshot.message);
    updateBeacon();
  },
  onTranscript:transcript=>executeCommand(transcript,{spoken:true})
});
document.addEventListener('portfolio:execute',event=>{if(typeof event.detail?.text==='string')executeCommand(event.detail.text);});
document.addEventListener('portfolio:exitStudio',()=>{if(expanded)exitExpanded();if(document.fullscreenElement===studio)document.exitFullscreen().catch(()=>{});});
$('#cameraToggle').addEventListener('click',()=>{
  if(camera.active||camera.loading)camera.stop();
  else if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){$('#cameraStatus').textContent='Camera mode needs HTTPS and a supported browser. Mouse and touch are ready.';}
  else if(!handGraphicsAvailable()){const message='Hand tracking graphics are unavailable in this browser. Mouse, touch, and voice still work.';$('#cameraStatus').textContent=message;status(message);}
  else camera.start();
});
$('#voiceToggle').addEventListener('click',()=>voice.wanted?voice.stop():voice.start());
$('#stopAllInputs').addEventListener('click',()=>stopInputs());
$('#soundToggle').addEventListener('click',()=>{if('speechSynthesis'in window)speechSynthesis.cancel();});
$('#visualCommandForm').addEventListener('submit',event=>{event.preventDefault();const field=$('#visualCommand');if(executeCommand(field.value))field.value='';});
$$('[data-command]').forEach(button=>button.addEventListener('click',()=>executeCommand(button.dataset.command)));
$$('.scene-button').forEach(button=>button.addEventListener('click',()=>setScene(button.dataset.scene)));
$('#autoScenes').addEventListener('click',()=>setAuto(!auto));
$('#studioPause').addEventListener('click',()=>$('#motionToggle').click());
$('#energyBurst').addEventListener('click',()=>burst());
function syncExpandedLabel(){
  const active=Boolean(document.fullscreenElement)||expanded;
  $('#studioFullscreen').setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
  $('#studioFullscreen').textContent=active?'×':'⤢';
}
function enterExpanded(){
  expanded=true;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  studio.classList.add('studio-expanded');root.classList.add('studio-is-expanded');syncExpandedLabel();resize();
  $('#studioFullscreen').focus();status('Expanded view. Press Escape to return to the portfolio.');
}
function exitExpanded(){
  expanded=false;studio.classList.remove('studio-expanded');root.classList.remove('studio-is-expanded');document.body.style.overflow=previousOverflow;
  syncExpandedLabel();resize();$('#studioFullscreen').focus();
}
$('#studioFullscreen').addEventListener('click',async()=>{
  if(expanded){exitExpanded();return;}
  if(document.fullscreenElement){await document.exitFullscreen().catch(()=>{});return;}
  try{if(studio.requestFullscreen)await studio.requestFullscreen();else enterExpanded();}
  catch{enterExpanded();}
});
document.addEventListener('fullscreenchange',()=>{syncExpandedLabel();resize();});
document.addEventListener('keydown',event=>{
  if(!expanded||document.querySelector('dialog[open]'))return;
  if(event.key==='Escape'){event.preventDefault();exitExpanded();return;}
  if(event.key==='Tab'){
    const focusable=[...studio.querySelectorAll('button:not([disabled]),input,[tabindex="0"]')].filter(node=>node.getClientRects().length);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});

function pointFromEvent(event){const rect=viewport.getBoundingClientRect();pointer.x=clamp((event.clientX-rect.left)/rect.width);pointer.y=clamp((event.clientY-rect.top)/rect.height);pointer.activeAt=performance.now();}
viewport.addEventListener('pointermove',event=>{if(event.target.closest('button'))return;pointFromEvent(event);if(paused)draw();},{passive:true});
viewport.addEventListener('pointerdown',event=>{
  if(event.target.closest('button'))return;
  pointFromEvent(event);pointer.down=true;pointer.repel=event.shiftKey;
  if(event.pointerType==='mouse')viewport.setPointerCapture(event.pointerId);
  if(paused)draw();
});
viewport.addEventListener('pointerup',()=>{pointer.down=false;pointer.repel=false;});
viewport.addEventListener('pointercancel',()=>{pointer.down=false;});
viewport.addEventListener('pointerleave',()=>{pointer.down=false;});
viewport.addEventListener('dblclick',event=>{if(!event.target.closest('button'))burst();});
viewport.addEventListener('keydown',event=>{
  if(event.target!==viewport)return;
  const moves={ArrowLeft:[-.07,0],ArrowRight:[.07,0],ArrowUp:[0,-.07],ArrowDown:[0,.07]};
  if(moves[event.key]){event.preventDefault();pointer.x=clamp(pointer.x+moves[event.key][0]);pointer.y=clamp(pointer.y+moves[event.key][1]);pointer.activeAt=performance.now();if(paused)draw();}
  else if(event.key===' '){event.preventDefault();if(!event.repeat)burst();}
});
window.addEventListener('pointerup',()=>{pointer.down=false;});

function resize(){
  const rect=viewport.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);
  ambientWidth=innerWidth;ambientHeight=innerHeight;ambient.width=Math.round(ambientWidth*dpr);ambient.height=Math.round(ambientHeight*dpr);ambientCtx?.setTransform(dpr,0,0,dpr,0,0);
  draw();drawAmbient();
}
function ease(value){const x=clamp(value);return x*x*(3-2*x);}
function activeHand(){return hands&&performance.now()-lastHandsAt<450?hands:null;}
function ring(cx,cy,r,flatten,angle,color,alpha=1){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=.65;
  ctx.beginPath();ctx.ellipse(0,0,r,r*flatten,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function draw(){
  if(!ctx||!width)return;
  const hand=activeHand(),now=performance.now(),pointerActive=now-pointer.activeAt<3000;
  const target=hand|| (pointerActive?pointer:{x:.5+Math.sin(clock*.2)*.16,y:.5+Math.cos(clock*.17)*.13,zoom:1});
  // Frame-rate-independent smoothing happens in the animation tick.
  if(paused){smooth.x=target.x;smooth.y=target.y;smooth.zoom=target.zoom||1;}
  const cx=width*(.5+(smooth.x-.5)*.13),cy=height*(.5+(smooth.y-.5)*.12);
  const radius=Math.min(width*.31,height*.38)*smooth.zoom;
  const morph=ease((clock-morphStart)/3),points=shapes[scene],previous=shapes[previousScene];
  const frozen=hand&&stablePose==='fist';
  const rotation=clock*.1+(smooth.x-.5)*.45;
  const cos=Math.cos(rotation),sin=Math.sin(rotation),tilt=.13+(smooth.y-.5)*.5;
  ctx.clearRect(0,0,width,height);
  const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*1.5);
  glow.addColorStop(0,scene==='aurora'?'#7e69e518':'#589de81a');glow.addColorStop(.5,'#3b6faa08');glow.addColorStop(1,'#00000000');
  ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  for(const star of stars){const x=star.x*width+Math.sin(clock*.1+star.y*10)*3,y=star.y*height;ctx.globalAlpha=.17+.15*Math.sin(clock*.6+star.x*20);ctx.fillStyle='#bde1ef';ctx.fillRect(x,y,star.size,star.size);}
  ctx.globalAlpha=1;
  // Technical orbit markings are mathematical artwork, not fabricated measurements.
  ring(cx,cy,radius*1.13,.96,0,'#78bfdb',.13);
  ring(cx,cy,radius*1.22,.98,0,'#75dce5',.065);
  ctx.save();ctx.translate(cx,cy);ctx.strokeStyle='#79c9e8';ctx.globalAlpha=.28;ctx.lineWidth=.7;
  for(let i=0;i<64;i++){const a=i/64*Math.PI*2+clock*.015;const r=radius*1.17;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*(r+(i%8===0?8:3)),Math.sin(a)*(r+(i%8===0?8:3)));ctx.stroke();}
  ctx.restore();
  ctx.save();ctx.translate(cx,cy);ctx.lineWidth=1.6;for(let band=0;band<3;band++){const a=clock*(band%2?-.09:.12)+band*2.1;ctx.strokeStyle=palette[band+1];ctx.globalAlpha=.4;ctx.beginPath();ctx.arc(0,0,radius*(1.13+band*.043),a,a+.28+band*.12);ctx.stroke();}ctx.restore();
  if(scene==='reactor'){ring(cx,cy,radius*1.37,.27,-.5+clock*.04,'#75dce5',.25*morph);ring(cx,cy,radius*1.2,.4,.6-clock*.02,accent,.22*morph);}
  if(scene==='aurora'){
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let band=0;band<14;band++){ctx.beginPath();for(let x=0;x<=width;x+=6){const u=x/width,envelope=Math.sin(u*Math.PI);const y=cy+Math.sin(u*7+clock*.4+band*.08)*radius*.37+(band-7)*9*envelope; if(!x)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.lineWidth=1.1;ctx.strokeStyle=palette[band%3];ctx.globalAlpha=.08*morph;ctx.stroke();}ctx.restore();
  }
  for(let i=0;i<count;i++){
    const from=previous[i],to=points[i],p=projected[i];p.oldX=p.x;p.oldY=p.y;
    let x=from[0]+(to[0]-from[0])*morph,y=from[1]+(to[1]-from[1])*morph,z=from[2]+(to[2]-from[2])*morph;
    const ripple=Math.sin(clock*1.1+i*.024)*.018;
    x*=1+ripple;y*=1+ripple;
    const rx=x*cos+z*sin,rz=-x*sin+z*cos;
    const ry=y*Math.cos(tilt)-rz*Math.sin(tilt),depth=y*Math.sin(tilt)+rz*Math.cos(tilt);
    const perspective=3/(3-depth*.38);
    p.x=cx+rx*radius*perspective;p.y=cy+ry*radius*perspective;p.z=depth;p.index=i;
    if(hand||pointerActive){
      const tx=smooth.x*width,ty=smooth.y*height,dx=tx-p.x,dy=ty-p.y;
      const influence=Math.exp(-(dx*dx+dy*dy)/(radius*radius*.8));
      const force=hand?(stablePose==='pinch'?.72:stablePose==='palm'?-.4:.06):pointer.down?(pointer.repel?-.4:.65):.07;
      p.x+=dx*influence*force;p.y+=dy*influence*force;
    }
  }
  // Sorting indices in place would lose the shape association. Render through a reusable order array.
  const order=draw.order || (draw.order=Array.from({length:count},(_,i)=>i));order.sort((a,b)=>projected[a].z-projected[b].z);
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const index of order){
    const p=projected[index],front=clamp((p.z+1.2)/2.4),twinkle=.85+.15*Math.sin(clock*1.7+index);
    if(index%4===0&&Number.isFinite(p.oldX)&&Math.hypot(p.x-p.oldX,p.y-p.oldY)<32){ctx.globalAlpha=.1;ctx.strokeStyle=palette[index%3];ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(p.oldX,p.oldY);ctx.lineTo(p.x,p.y);ctx.stroke();}
    ctx.globalAlpha=(.24+front*.68)*twinkle;ctx.fillStyle=palette[index%17===0?3:index%7===0?2:index%3===0?0:1];
    const size=(compact?.65:.7)+front*(index%23===0?1.7:1.05);
    ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();
    if(index%41===0&&front>.6){ctx.globalAlpha=.09;ctx.beginPath();ctx.arc(p.x,p.y,size*4,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
  for(let i=bursts.length-1;i>=0;i--){const event=bursts[i],age=clock-event.start;if(age>2.8){bursts.splice(i,1);continue;}ctx.save();ctx.globalAlpha=(1-age/2.8)*.55;ctx.lineWidth=.8;ctx.strokeStyle=palette[i%palette.length];ctx.beginPath();ctx.arc(event.x*width,event.y*height,12+age*Math.max(width,height)*.34,0,Math.PI*2);ctx.stroke();ctx.restore();}
  const core=ctx.createRadialGradient(cx,cy,0,cx,cy,scene==='galaxy'?28:12);core.addColorStop(0,'#e1f9ff70');core.addColorStop(.2,'#a1ebf925');core.addColorStop(1,'#75dce500');ctx.fillStyle=core;ctx.fillRect(cx-35,cy-35,70,70);
  if(now-lastHud>110){
    lastHud=now;
    const mode=hand?(hand.count===2?'TWO HANDS':'HAND'):pointerActive?'POINTER':now-inputAt<3000?inputSource:'AUTOPILOT';
    $('#inputMode').textContent=mode;
    $('#gestureReadout').textContent=paused?'PAUSED':hand?({pinch:'ATTRACT',palm:'REPEL',fist:'HOLD',peace:'NEXT SCENE',steer:'STEERING'}[stablePose]):'FLOWING';
    const targetNode=$('#studioTarget');targetNode.classList.toggle('visible',Boolean(hand||pointerActive));targetNode.style.left=`${smooth.x*100}%`;targetNode.style.top=`${smooth.y*100}%`;
    $('#sceneProgress').style.transform=`scaleX(${auto?clamp(sceneElapsed/18):0})`;
  }
  if(frozen)canvas.dataset.flow='held';else canvas.dataset.flow=paused?'paused':'running';
}
function drawAmbient(){
  if(!ambientCtx)return;
  const c=ambientCtx;c.clearRect(0,0,ambientWidth,ambientHeight);
  const total=compact?28:56;
  for(let i=0;i<total;i++){
    const x=((i*137.5+Math.sin(clock*.12+i)*27)%ambientWidth+ambientWidth)%ambientWidth;
    const y=((i*91.7-clock*(1+i%3))%ambientHeight+ambientHeight)%ambientHeight;
    c.fillStyle=i%4===0?accent:'#75dce5';c.globalAlpha=.07+(i%3)*.025;c.fillRect(x,y,i%7===0?2:1,i%7===0?2:1);
    if(i%8===0){c.strokeStyle='#75dce5';c.globalAlpha=.04;c.beginPath();c.moveTo(x,y);c.lineTo(x+24,y+36);c.stroke();}
  }
  c.globalAlpha=1;
}
function frame(now){
  frameID=0;
  if(document.hidden||paused){lastFrame=0;return;}
  if(!lastFrame||now-lastFrame>=1000/30){
    const dt=lastFrame?Math.min((now-lastFrame)/1000,.07):.033;lastFrame=now;
    const hand=activeHand(),held=hand&&stablePose==='fist';
    clock+=held?0:dt;
    const pointerActive=now-pointer.activeAt<3000;
    const target=hand||(pointerActive?pointer:{x:.5+Math.sin(clock*.2)*.16,y:.5+Math.cos(clock*.17)*.13,zoom:1});
    const smoothing=1-Math.exp(-dt*7);
    smooth.x+=(target.x-smooth.x)*smoothing;smooth.y+=(target.y-smooth.y)*smoothing;smooth.zoom+=((target.zoom||1)-smooth.zoom)*smoothing;
    if(visible){if(auto&&!hand&&!pointer.down&&!held){sceneElapsed+=dt;if(sceneElapsed>=18)nextScene(1,'auto');}draw();}
    drawAmbient();
  }
  schedule();
}
function schedule(){if(!frameID&&!paused&&!document.hidden)frameID=requestAnimationFrame(frame);}
new MutationObserver(()=>{
  readPalette();const next=root.classList.contains('motion-paused');paused=next;
  $('#studioPause').textContent=paused?'Resume':'Pause';$('#studioPause').setAttribute('aria-pressed',String(paused));
  lastFrame=0;draw();drawAmbient();schedule();
}).observe(root,{attributes:true,attributeFilter:['class','data-palette']});
if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)draw();},{rootMargin:'100px'}).observe(studio);
if('ResizeObserver'in window)new ResizeObserver(resize).observe(viewport);else window.addEventListener('resize',resize,{passive:true});
window.addEventListener('resize',()=>{ambientWidth=innerWidth;ambientHeight=innerHeight;resize();},{passive:true});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    if(camera.active||camera.loading||voice.wanted)stopInputs('Camera and voice stopped while this tab was hidden. Enable them again when you’re ready.');
    if(frameID)cancelAnimationFrame(frameID);frameID=0;lastFrame=0;
  }else schedule();
});
window.addEventListener('pagehide',()=>{if(camera.active||camera.loading||voice.wanted)stopInputs();});
// A soft light follows the pointer across the existing project artwork.
$$('.project-art').forEach(art=>art.addEventListener('pointermove',event=>{if(paused||reduced.matches)return;const rect=art.getBoundingClientRect();art.style.setProperty('--shine-x',`${(event.clientX-rect.left)/rect.width*100}%`);art.style.setProperty('--shine-y',`${(event.clientY-rect.top)/rect.height*100}%`);},{passive:true}));
if(!voice.Recognition)$('#voiceStatus').textContent='Speech recognition is unavailable here. The command box supports every visual command.';
$('#studioPause').textContent=paused?'Resume':'Pause';$('#studioPause').setAttribute('aria-pressed',String(paused));
resize();setScene('galaxy',{source:'auto'});if(paused)status('Animations are paused. Use Resume when you’re ready.');schedule();
