export function chapterDuration(project,speed='normal'){
  const words=String(project?.description||'').split(/\s+/).length;
  const base=Math.max(9500,Math.min(15500,6500+words*220));
  return speed==='quick'?base*.72:speed==='relaxed'?base*1.3:base;
}
export class TourTimeline{
  constructor(){this.reset();}
  reset(){this.items=[];this.index=0;this.elapsed=0;this.last=null;this.status='off';this.speed='normal';}
  start(items,now,{manual=false}={}){this.reset();this.items=[...items];this.status=this.items.length?(manual?'paused':'playing'):'off';this.last=now;return this.snapshot();}
  snapshot(){const project=this.items[this.index]||null,duration=chapterDuration(project,this.speed);return {status:this.status,index:this.index,total:this.items.length,project,progress:this.status==='complete'?1:Math.min(1,this.elapsed/duration),duration};}
  tick(now){
    if(this.status!=='playing'){this.last=now;return false;}
    if(this.last===null){this.last=now;return false;}
    this.elapsed+=Math.max(0,Math.min(now-this.last,1000));this.last=now;
    if(this.elapsed<chapterDuration(this.items[this.index],this.speed))return false;
    if(this.index===this.items.length-1){this.elapsed=chapterDuration(this.items[this.index],this.speed);this.status='complete';return true;}
    this.index++;this.elapsed=0;return true;
  }
  pause(now){this.tick(now);if(this.status==='playing')this.status='paused';return this.snapshot();}
  resume(now){if(this.status==='paused'){this.status='playing';this.last=now;}return this.snapshot();}
  seek(index,now){if(!this.items.length)return this.snapshot();this.index=Math.max(0,Math.min(this.items.length-1,index));this.elapsed=0;this.last=now;if(this.status==='complete')this.status='paused';return this.snapshot();}
  next(now){if(this.status==='off'||!this.items.length)return this.snapshot();if(this.index===this.items.length-1){this.status='complete';this.elapsed=chapterDuration(this.items[this.index],this.speed);this.last=now;return this.snapshot();}return this.seek(this.index+1,now);}
  setSpeed(speed){if(['normal','quick','relaxed'].includes(speed)){const progress=this.snapshot().progress;this.speed=speed;this.elapsed=progress*chapterDuration(this.items[this.index],this.speed);}return this.snapshot();}
  stop(){this.status='off';this.last=null;return this.snapshot();}
}
