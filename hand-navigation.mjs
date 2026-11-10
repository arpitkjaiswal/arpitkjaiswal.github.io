import {getInputScroller} from './render-runtime.mjs?v=20261110-layout';
import {mapHandPointer,PinchSelector} from './deck-core.mjs?v=20261110-layout';

/* Hand events come from the existing opt-in tracker. This controls only marked,
   visible portfolio actions. It never moves the OS cursor or synthesizes keys. */
export function startHandNavigation({onActivate,onHover=()=>{}}){
  const cursor=document.querySelector('#gestureCursor');
  const progress=cursor.querySelector('.gesture-progress');
  const caption=cursor.querySelector('.gesture-caption');
  const gate=new PinchSelector();
  const keys=new WeakMap();let nextKey=0;
  let hand=null,lastSeen=0,frame=0,lastFrame=0,hovered=null,smooth=null,scrollHold=0;
  function key(element){if(!keys.has(element))keys.set(element,`target-${++nextKey}`);return keys.get(element);}
  function updateHover(next){
    if(next===hovered)return;
    hovered?.classList.remove('hand-hover');hovered=next;hovered?.classList.add('hand-hover');onHover(next);
  }
  function reset(){
    hand=null;smooth=null;lastFrame=0;gate.reset();scrollHold=0;updateHover(null);
    cursor.hidden=true;cursor.classList.remove('over-target');document.documentElement.classList.remove('hands-navigating');
    progress.style.strokeDashoffset='157.08';
  }
  function candidateAt(x,y){
    const dialog=document.querySelector('dialog[open]');
    const scope=dialog||document;
    const visible=element=>!element.disabled&&element.getAttribute('aria-disabled')!=='true'&&!element.closest('[inert]')&&element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden';
    const direct=document.elementsFromPoint(x,y).map(node=>node.closest?.('[data-hand-action]')).find(node=>node&&scope.contains(node)&&visible(node));
    if(direct)return direct;
    let nearest=null,best=19;
    for(const element of scope.querySelectorAll('[data-hand-action]')){
      if(!visible(element))continue;
      const rect=element.getBoundingClientRect();
      if(rect.bottom<0||rect.top>innerHeight||rect.right<0||rect.left>innerWidth)continue;
      const dx=Math.max(rect.left-x,0,x-rect.right),dy=Math.max(rect.top-y,0,y-rect.bottom),distance=Math.hypot(dx,dy);
      if(distance<best){best=distance;nearest=element;}
    }
    return nearest;
  }
  function tick(now){
    frame=0;
    if(!hand||document.hidden||now-lastSeen>450){reset();return;}
    const mapped=mapHandPointer(hand.cursorX??hand.x,hand.cursorY??hand.y);
    if(!mapped){reset();return;}
    const dt=lastFrame?Math.min((now-lastFrame)/1000,.08):.033;lastFrame=now;
    if(!smooth)smooth={...mapped};
    const alpha=1-Math.exp(-dt*16);
    smooth.x+=(mapped.x-smooth.x)*alpha;smooth.y+=(mapped.y-smooth.y)*alpha;
    const x=smooth.x*innerWidth,y=smooth.y*innerHeight;
    const dialog=document.querySelector('dialog[open]');
    const host=dialog||document.body;if(cursor.parentElement!==host)host.appendChild(cursor);
    cursor.hidden=false;cursor.style.transform=`translate3d(${x}px,${y}px,0)`;
    if(!document.documentElement.classList.contains('hands-navigating'))document.documentElement.classList.add('hands-navigating');
    const target=candidateAt(x,y);updateHover(target);
    const result=gate.update({target:target?key(target):null,pinching:hand.pose==='pinch',now});
    progress.style.strokeDashoffset=String(157.08*(1-result.progress));
    cursor.classList.toggle('over-target',Boolean(target));
    caption.textContent=target?(hand.pose==='pinch'?(result.progress>0?'SELECTING…':'RELEASE TO REARM'):'PINCH TO SELECT'):'POINT & PINCH';
    if(result.activated&&target){
      const action=target.dataset.handAction;
      target.classList.remove('portal-activation');void target.offsetWidth;target.classList.add('portal-activation');
      onActivate(action,target);
    }
    // An open palm at the top or bottom scrolls a long dossier or a narrow map.
    if(hand.pose==='palm'&&(smooth.y<.1||smooth.y>.9)){
      scrollHold+=dt;
      if(scrollHold>.45){const scroller=getInputScroller();if(scroller)scroller.scrollTop+=(smooth.y>.9?1:-1)*dt*320;}
    }else scrollHold=0;
    frame=requestAnimationFrame(tick);
  }
  document.addEventListener('portfolio:hand',event=>{
    const detail=event.detail;
    if(!detail||![detail.x,detail.y].every(Number.isFinite)){reset();return;}
    hand=detail;lastSeen=performance.now();if(!frame)frame=requestAnimationFrame(tick);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.addEventListener('pagehide',reset);
  return {reset,destroy(){if(frame)cancelAnimationFrame(frame);reset();}};
}
