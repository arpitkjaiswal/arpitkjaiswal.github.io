import {parseCommand,splitWakeWord,normalizeCommand} from './interaction-core.mjs?v=20261110-layout';

/* A short explicit wake session, never a general-purpose command executor. */
export class JarvisSession{
  constructor({now=()=>Date.now(),windowMs=10000}={}){this.now=now;this.windowMs=windowMs;this.reset();}
  reset(){this.armedUntil=0;}
  receive(transcript,{mode='handsfree',alternatives=[],...options}={}){
    const candidates=[transcript,...alternatives].filter((x,i,list)=>typeof x==='string'&&x.length<=180&&list.indexOf(x)===i).slice(0,4);
    const now=this.now();
    for(const text of candidates){
      const normalized=normalizeCommand(text),wake=splitWakeWord(normalized);
      if(['stop listening','stop all inputs','microphone off','voice off'].includes(normalized))return {kind:'command',command:parseCommand(normalized,{...options,requireWakeWord:false}),text};
      const allowed=mode==='once'||wake.hasWake||now<this.armedUntil;
      if(!allowed)continue;
      if(wake.hasWake&&!wake.text){this.armedUntil=now+this.windowMs;return {kind:'wake',text,keepListening:true};}
      const command=parseCommand(text,{...options,requireWakeWord:false});
      if(command){this.armedUntil=mode==='handsfree'?now+this.windowMs:0;return {kind:'command',command,text};}
    }
    const heard=candidates[0]||'',wake=splitWakeWord(normalizeCommand(heard));
    return {kind:mode==='once'||wake.hasWake||now<this.armedUntil?'unknown':'ignored',text:heard};
  }
}
