/* Pure rendering budgets and drift-free frame pacing. */
export function visualBudget({width=1280,reduced=false,saveData=false,cores=8,memory=8,mode='auto'}={}){
  const lean=mode==='eco'||mode==='auto'&&(saveData||width<700||cores<=4||memory<=4);
  return {name:reduced?'still':lean?'eco':'cinematic',points:reduced?180:lean?320:640,stars:lean?55:110,fps:reduced?0:lean?24:30,dpr:lean?1:1.4};
}
export class FramePacer{
  constructor(fps=30){this.setRate(fps);}
  setRate(fps){this.interval=1000/Math.max(1,fps);this.next=null;}
  reset(){this.next=null;}
  due(now){
    if(!Number.isFinite(now))return false;
    if(this.next===null){this.next=now+this.interval;return true;}
    if(now+.5<this.next)return false;
    this.next+=this.interval;
    if(this.next<now-this.interval)this.next=now+this.interval;
    return true;
  }
}
export class DrawBudget{
  constructor(){this.samples=0;this.cost=0;this.downgraded=false;}
  record(ms){if(!Number.isFinite(ms)||ms<0)return false;this.cost+=ms;this.samples++;if(this.samples<30)return false;const slow=this.cost/this.samples>10;this.samples=0;this.cost=0;if(slow&&!this.downgraded){this.downgraded=true;return true;}return false;}
}
