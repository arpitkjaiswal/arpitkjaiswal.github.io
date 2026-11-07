/* Spoken output shares one queue. Text remains the source of truth. */
let serial=0,active=null,hooks={before:()=>null,after:()=>{}},replies=false;
export function setSpeechHooks(next){hooks={...hooks,...next};}
export function enableReplies(value){replies=value===true;if(!replies)cancelSpeech();}
export function repliesEnabled(){return replies;}
export function isSpeaking(){return Boolean(active);}
function setActive(next){
  const changed=Boolean(next)!==Boolean(active);
  active=next;
  if(changed)document.dispatchEvent(new CustomEvent('portfolio:speech-output',{detail:{active:Boolean(active)}}));
}
export function cancelSpeech(){
  serial++;const old=active;setActive(null);
  if('speechSynthesis'in window)speechSynthesis.cancel();
  old?.finish?.();
}
export function sayText(text,{force=false,onEnd=()=>{}}={}){
  if((!replies&&!force)||!('speechSynthesis'in window)||typeof text!=='string'||!text.trim())return false;
  cancelSpeech();const id=++serial,token=hooks.before();let finished=false,watchdog=0;
  const finish=()=>{if(finished)return;finished=true;clearTimeout(watchdog);if(active?.id===id)setActive(null);hooks.after(token);onEnd();};
  setActive({id,finish});
  const utterance=new SpeechSynthesisUtterance(text.slice(0,650));utterance.lang='en-IN';utterance.rate=1.02;utterance.volume=.72;
  const voices=speechSynthesis.getVoices();utterance.voice=voices.find(v=>/^en[-_]IN/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;
  utterance.onend=()=>{if(id===serial)finish();};utterance.onerror=()=>{if(id===serial)finish();};
  watchdog=setTimeout(()=>{if(active?.id===id){speechSynthesis.cancel();finish();}},Math.min(35000,6000+text.split(/\s+/).length*500));
  try{speechSynthesis.speak(utterance);return true;}catch{finish();return false;}
}
document.addEventListener('portfolio:stop-speaking',cancelSpeech);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSpeech();});
window.addEventListener('pagehide',cancelSpeech);
