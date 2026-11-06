/* Pure navigation logic: no sensors, DOM, network, or arbitrary command execution. */
export const PROJECT_IDS=Object.freeze(['lexa','terramind','aegisvault','talentos','documentanalyser','orbitwarden','concord','veildb','devos']);
const ALIASES=Object.freeze({
  lexa:'lexa',buddy:'lexa','lexa buddy':'lexa','lexa and buddy':'lexa',
  terramind:'terramind','terra mind':'terramind',
  aegisvault:'aegisvault','aegis vault':'aegisvault',
  talentos:'talentos','talent os':'talentos','candidate ranking system':'talentos',
  documentanalyser:'documentanalyser','document analyser':'documentanalyser','document analyzer':'documentanalyser','documentanalyzer':'documentanalyser',
  orbitwarden:'orbitwarden','orbit warden':'orbitwarden',concord:'concord',
  veildb:'veildb','veil db':'veildb',devos:'devos','dev os':'devos'
});
export function resolveProject(value){
  if(typeof value!=='string')return null;
  const text=value.toLowerCase().trim().replace(/\s+/g,' ');
  const ordinal={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9};
  const number=text.match(/^project (one|two|three|four|five|six|seven|eight|nine|[1-9])$/);
  if(number)return PROJECT_IDS[Number(ordinal[number[1]]||number[1])-1];
  return Object.prototype.hasOwnProperty.call(ALIASES,text)?ALIASES[text]:null;
}
export function projectCommand(text){
  const match=text.match(/^(open|inspect|show|tell me about|launch|play|source for|code for) (.+?)(?: project)?$/);
  if(!match)return null;
  const id=resolveProject(match[2]);if(!id)return null;
  return {type:['launch','play'].includes(match[1])?'launchProject':['source for','code for'].includes(match[1])?'sourceProject':'openProject',id};
}
export function mapHandPointer(x,y){
  const clamp=value=>Math.max(0,Math.min(1,value));
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  return {x:clamp((x-.08)/.84),y:clamp((y-.06)/.82)};
}
export class PinchSelector{
  constructor({holdMs=180,hoverMs=100}={}){this.holdMs=holdMs;this.hoverMs=hoverMs;this.reset();}
  reset(){this.armed=false;this.down=false;this.fired=false;this.target=null;this.targetSince=0;this.captured=null;this.downAt=0;}
  update({target=null,pinching=false,active=true,now=0}){
    if(!active||!Number.isFinite(now)){this.reset();return {activated:null,progress:0};}
    if(target!==this.target){this.target=target;this.targetSince=now;if(this.down)this.captured=null;}
    if(!pinching){this.armed=true;this.down=false;this.fired=false;this.captured=null;return {activated:null,progress:0};}
    if(!this.down){
      this.down=true;this.downAt=now;
      this.captured=this.armed&&target&&now-this.targetSince>=this.hoverMs?target:null;
    }
    if(!this.captured||this.fired||!this.armed)return {activated:null,progress:0};
    const progress=Math.max(0,Math.min(1,(now-this.downAt)/this.holdMs));
    if(progress>=1){this.fired=true;this.armed=false;return {activated:this.captured,progress:1};}
    return {activated:null,progress};
  }
}
export class ExplorerProgress{
  constructor(ids=PROJECT_IDS){this.ids=new Set(ids);this.visited=new Set();}
  visit(id){const fresh=this.ids.has(id)&&!this.visited.has(id);if(fresh)this.visited.add(id);return {...this.snapshot(),fresh};}
  snapshot(){const count=this.visited.size;return {count,total:this.ids.size,xp:count*100,rank:count===this.ids.size?'CARTOGRAPHER':count>=5?'BUILDER':count?'SCOUT':'INITIATE'};}
}
export function moveProjectIndex(index,key,total,columns=3){
  if(!Number.isInteger(total)||total<1)return 0;
  const delta={ArrowRight:1,d:1,D:1,ArrowLeft:-1,a:-1,A:-1,ArrowDown:columns,s:columns,S:columns,ArrowUp:-columns,w:-columns,W:-columns}[key];
  return delta===undefined?index:(index+delta+total)%total;
}
