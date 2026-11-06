import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCommand} from '../interaction-core.mjs';
import {JarvisSession} from '../jarvis-core.mjs';
import {VoiceControl} from '../input-controllers.mjs';
import {TourTimeline,chapterDuration} from '../tour-core.mjs';
import {FramePacer,visualBudget,DrawBudget} from '../motion-core.mjs';

test('natural commands resolve one known action and preserve tour context',()=>{
  assert.deepEqual(parseCommand('Hey Jervis, could you please open the second project for me?'),{type:'openProject',id:'terramind'});
  assert.deepEqual(parseCommand('Jarvis show me AI projects'),{type:'library',filter:'ai',sort:'featured'});
  assert.deepEqual(parseCommand('Jarvis show latest repos'),{type:'library',filter:'all',sort:'recent'});
  assert.deepEqual(parseCommand('Jarvis make it blue'),{type:'palette',value:'ice'});
  assert.deepEqual(parseCommand('Jarvis take me to contact'),{type:'navigate',target:'contact'});
  assert.deepEqual(parseCommand('Jarvis next',{context:'tour'}),{type:'tour',action:'next'});
  assert.deepEqual(parseCommand('Jarvis pause',{context:'tour'}),{type:'tour',action:'pause'});
  assert.deepEqual(parseCommand('Jarvis slower',{context:'tour'}),{type:'tour',action:'speed',value:'relaxed'});
  assert.equal(parseCommand('Jarvis open LEXA and delete everything'),null);
  assert.equal(parseCommand('Jarvis open https://example.com'),null);
});
test('one-shot speech needs no wake word; hands-free requires a recent explicit wake',()=>{
  let time=20000;const session=new JarvisSession({now:()=>time});
  assert.equal(session.receive('open LEXA').kind,'ignored');
  assert.equal(session.receive('open LEXA',{mode:'once'}).command.id,'lexa');
  assert.equal(session.receive('Hey Jarvis').kind,'wake');
  time+=1200;assert.equal(session.receive('open LEXA').command.id,'lexa');
  time+=9999;assert.equal(session.receive('next project').kind,'command');
  time+=10001;assert.equal(session.receive('next project').kind,'ignored');
  session.reset();assert.equal(session.receive('stop listening').command.type,'voiceOff');
});
test('speech alternatives recover known commands without treating unknown speech as an action',()=>{
  const session=new JarvisSession();
  assert.equal(session.receive('Jarvis open lecture',{alternatives:['Jarvis open LEXA']}).command.id,'lexa');
  assert.equal(session.receive('the weather is nice',{mode:'once'}).kind,'unknown');
  session.reset();assert.equal(session.receive('what about the meeting').kind,'ignored');
  assert.equal(session.receive('Jarvis delete files').kind,'unknown');
});
function voiceFixture(onTranscript=()=>{}){
  let now=0,id=0;const jobs=new Map(),instances=[],states=[],heard=[];
  const setTimer=(callback,delay)=>{jobs.set(++id,{callback,due:now+delay});return id;};
  const clearTimer=id=>jobs.delete(id);
  class Recognition{constructor(){instances.push(this);}start(){this.onstart?.();}abort(){this.aborted=true;this.onend?.();}}
  const voice=new VoiceControl({Recognition,onTranscript,onState:state=>states.push(state),onHeard:value=>heard.push(value),setTimer,clearTimer,now:()=>now});
  function advance(ms){now+=ms;for(const [key,job] of [...jobs])if(job.due<=now){jobs.delete(key);job.callback();}}
  function result(text,final=true,alternatives=[]){const value=[{transcript:text,confidence:.8},...alternatives.map(transcript=>({transcript}))];value.isFinal=final;instances.at(-1).onresult({resultIndex:0,results:[value]});}
  return {voice,instances,states,heard,jobs,advance,result};
}
test('interim speech never executes; a final one-shot executes once and releases capture',()=>{
  const commands=[];const f=voiceFixture((text,metadata)=>commands.push({text,metadata}));f.voice.start();
  const recognition=f.instances[0];assert.equal(recognition.continuous,false);assert.equal(recognition.interimResults,true);assert.equal(recognition.maxAlternatives,3);
  f.result('open',false);assert.equal(commands.length,0);assert.equal(f.heard[0].final,false);
  f.result('open LEXA',true,['open lecture']);assert.equal(commands.length,1);assert.deepEqual(commands[0].metadata.alternatives,['open lecture']);
  f.result('open LEXA');assert.equal(commands.length,1);assert.equal(f.voice.wanted,false);assert.equal(recognition.aborted,true);assert.equal(f.jobs.size,0);
});
test('a standalone wake word can continue the same short one-shot session',()=>{
  const commands=[],session=new JarvisSession();const f=voiceFixture(text=>{const outcome=session.receive(text,{mode:'once'});if(outcome.kind==='command')commands.push(outcome.command);return {keepListening:outcome.kind==='wake'};});
  f.voice.start();f.result('Jarvis');assert.equal(f.voice.wanted,true);f.instances[0].onend();f.advance(400);f.result('open LEXA');assert.equal(commands[0].id,'lexa');assert.equal(f.voice.wanted,false);
});
test('hands-free deduplicates final results and stops repeated empty speech-service restarts',()=>{
  let count=0;const f=voiceFixture(()=>count++);f.voice.start({mode:'handsfree'});f.result('Jarvis next');f.result('Jarvis next');assert.equal(count,1);
  f.instances.at(-1).onend();f.advance(400);f.instances.at(-1).onend();f.advance(400);f.instances.at(-1).onend();f.advance(800);f.instances.at(-1).onend();
  assert.equal(f.voice.wanted,false);assert.equal(f.states.at(-1).state,'error');assert.equal(f.jobs.size,0);
});
test('speaking suspends microphone commands and a stopped generation can never resume',()=>{
  let count=0;const f=voiceFixture(()=>count++);f.voice.start({mode:'handsfree'});const old=f.instances[0],token=f.voice.suspend();
  old.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'Jarvis next'}}]});assert.equal(count,0);assert.equal(f.states.at(-1).state,'speaking');
  assert.equal(f.voice.resume(token),true);assert.equal(f.instances.length,2);assert.equal(f.voice.resume(token),false);
  const next=f.voice.suspend();f.voice.stop();assert.equal(f.voice.resume(next),false);f.advance(30000);assert.equal(f.instances.length,2);assert.equal(f.jobs.size,0);
});
test('one-shot silence expires and fatal service errors never retry',()=>{
  const f=voiceFixture();f.voice.start();f.advance(20000);assert.equal(f.voice.wanted,false);assert.match(f.states.at(-1).message,/Listening finished/);
  f.voice.start({mode:'handsfree'});f.instances.at(-1).onerror({error:'network'});f.advance(30000);assert.equal(f.instances.length,2);assert.equal(f.voice.wanted,false);assert.match(f.states.at(-1).message,/could not connect/);
});
const projects=[{id:'one',description:'A useful first build.'},{id:'two',description:'An interesting second build.'}];
function advanceTour(tour,start,duration){for(let now=start+100;now<=start+duration;now+=100)tour.tick(now);}
test('guided tour pauses without time jumps, preserves pace progress, and finishes once',()=>{
  const tour=new TourTimeline();tour.start(projects,0);advanceTour(tour,0,3000);const before=tour.snapshot().progress;
  tour.pause(3000);tour.tick(900000);assert.equal(tour.snapshot().progress,before);tour.setSpeed('relaxed');assert.ok(Math.abs(tour.snapshot().progress-before)<1e-10);
  tour.resume(900000);advanceTour(tour,900000,13000);assert.equal(tour.index,1);assert.equal(tour.status,'playing');
  advanceTour(tour,913000,13000);assert.equal(tour.status,'complete');assert.equal(tour.snapshot().progress,1);tour.tick(999999);assert.equal(tour.index,1);
  tour.seek(1,999999);tour.next(1000000);assert.equal(tour.status,'complete');
  tour.seek(0,1000000);assert.equal(tour.status,'paused');assert.equal(tour.snapshot().progress,0);tour.stop();assert.equal(tour.status,'off');
});
test('empty tours stay off; reduced-motion tours start manual and long stalls cannot skip chapters',()=>{
  const tour=new TourTimeline();tour.start([],0);assert.equal(tour.status,'off');tour.start(projects,0,{manual:true});tour.tick(90000);assert.equal(tour.snapshot().progress,0);
  tour.resume(90000);tour.tick(999999);assert.equal(tour.index,0);assert.ok(tour.snapshot().progress<.11);assert.ok(chapterDuration(projects[0],'quick')<chapterDuration(projects[0]));
});
test('adaptive visual budgets reduce work on small screens and constrained devices',()=>{
  assert.equal(visualBudget({width:390}).name,'eco');assert.equal(visualBudget({saveData:true}).points,320);assert.equal(visualBudget({cores:4}).dpr,1);
  assert.equal(visualBudget({width:390,mode:'cinematic'}).points,640);assert.equal(visualBudget({reduced:true}).fps,0);assert.equal(visualBudget({mode:'eco'}).stars,55);
});
test('frame pacing retains its target cadence across 60 Hz timestamps and resets after stalls',()=>{
  const pacer=new FramePacer(30);let frames=0;for(let i=0;i<60;i++)if(pacer.due(i*1000/60))frames++;assert.equal(frames,30);
  assert.equal(pacer.due(60000),true);assert.equal(pacer.due(60001),false);pacer.reset();assert.equal(pacer.due(60001),true);
  const budget=new DrawBudget();for(let i=0;i<29;i++)assert.equal(budget.record(12),false);assert.equal(budget.record(12),true);for(let i=0;i<30;i++)assert.equal(budget.record(30),false);
});
