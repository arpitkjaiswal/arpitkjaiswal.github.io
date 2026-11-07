import {visualBudget} from './motion-core.mjs?v=20261107-flight';
const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
let mode='auto',dialogOpen=Boolean(document.querySelector('dialog[open]'));
export function getRenderState(){return {dialogOpen,hidden:document.hidden,budget:visualBudget({width:innerWidth,reduced:reduced.matches&&root.classList.contains('motion-paused'),saveData:navigator.connection?.saveData===true,cores:navigator.hardwareConcurrency||8,memory:navigator.deviceMemory||8,mode})};}
function publish(){document.dispatchEvent(new CustomEvent('portfolio:render-state',{detail:getRenderState()}));}
new MutationObserver(records=>{if(!records.some(r=>r.target.tagName==='DIALOG'))return;const next=Boolean(document.querySelector('dialog[open]'));if(next!==dialogOpen){dialogOpen=next;root.classList.toggle('modal-visible',next);publish();}}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
document.addEventListener('portfolio:quality',event=>{if(['auto','eco','cinematic'].includes(event.detail?.mode)){mode=event.detail.mode;publish();}});
document.addEventListener('visibilitychange',publish);window.addEventListener('resize',publish,{passive:true});reduced.addEventListener?.('change',publish);
