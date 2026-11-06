import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCommand,validHand,readHand,readHands,PoseLatch,particleShape,SCENES} from '../interaction-core.mjs';
import {HandCamera,VoiceControl} from '../input-controllers.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function hand(extended=[true,true,true,true]){
  const points=Array.from({length:21},()=>({x:.5,y:.6,z:0}));
  points[0]={x:.5,y:.9,z:0};points[4]={x:.12,y:.5,z:0};
  [[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]].forEach((finger,i)=>{
    const x=.32+i*.12;
    finger.forEach((index,j)=>{points[index]={x,y:extended[i]?[.6,.43,.28,.12][j]:[.6,.5,.6,.68][j],z:0};});
  });return points;
}
function video(){return {srcObject:null,readyState:3,currentTime:1,play:async()=>{},pause(){this.paused=true;}};}
function stream(){const track={stopped:0,stop(){this.stopped++;},addEventListener(){}};return {track,getTracks:()=>[track],getVideoTracks:()=>[track]};}
const mockFrames={requestFrame:()=>1,cancelFrame:()=>{}};

test('voice commands require the wake phrase; ambient speech and unknown actions are ignored',()=>{
  assert.equal(parseCommand('show projects'),null);
  assert.deepEqual(parseCommand('Hey Jarvis, please show projects.'),{type:'navigate',target:'work'});
  assert.equal(parseCommand('Jarvis delete all files'),null);
  assert.equal(parseCommand('Jarvis open https://example.com'),null);
  assert.equal(parseCommand('Jarvis galaxy then go home'),null);
  assert.equal(parseCommand('x'.repeat(181)),null);
});
test('spoken and typed commands use the same bounded action vocabulary',()=>{
  assert.deepEqual(parseCommand('activate aurora',{requireWakeWord:false}),{type:'scene',scene:'aurora'});
  assert.deepEqual(parseCommand('Jarvis change colour'),{type:'palette'});
  assert.deepEqual(parseCommand('Jarvis stop all inputs'),{type:'stopInputs'});
  assert.deepEqual(parseCommand('Jarvis resume animations'),{type:'resume'});
});
test('invalid or missing landmarks cannot hold a stale gesture',()=>{
  assert.equal(validHand([]),false);assert.equal(readHands([]),null);
  const invalid=hand();invalid[8].x=NaN;assert.equal(readHand(invalid),null);
});
test('palm, fist, peace, and pinch are distinct on controlled landmark fixtures',()=>{
  assert.equal(readHand(hand()).pose,'palm');
  assert.equal(readHand(hand([false,false,false,false])).pose,'fist');
  assert.equal(readHand(hand([true,true,false,false])).pose,'peace');
  const pinch=hand();pinch[4]={...pinch[8]};assert.equal(readHand(pinch).pose,'pinch');
});
test('gesture classification is invariant to translation, scale, and rotation',()=>{
  const original=hand([true,true,false,false]);
  const transformed=original.map(p=>({x:2+(-p.y)*.37,y:1+p.x*.37,z:p.z*.37}));
  assert.equal(readHand(transformed).pose,'peace');
});
test('two-hand separation controls a bounded zoom and averages mirrored position',()=>{
  const left=hand().map(p=>({...p,x:p.x-.2})),right=hand().map(p=>({...p,x:p.x+.2}));
  const result=readHands([left,right]);assert.equal(result.count,2);assert.ok(result.zoom>=.65&&result.zoom<=1.8);assert.ok(result.x>=0&&result.x<=1);
});
test('peace-sign switching requires a hold and a release to rearm',()=>{
  const latch=new PoseLatch(650);
  assert.equal(latch.update('peace',100),false);assert.equal(latch.update('peace',500),false);
  assert.equal(latch.update('peace',800),true);assert.equal(latch.update('peace',5000),false);
  latch.update('palm',5100);assert.equal(latch.update('peace',5200),false);assert.equal(latch.update('peace',5900),true);
});
test('all scenes produce bounded, finite geometry on small and full particle budgets',()=>{
  for(const total of [64,640,1280])for(const scene of SCENES)for(let i=0;i<total;i++)assert.ok(particleShape(i,total,scene).every(x=>Number.isFinite(x)&&Math.abs(x)<2));
  assert.throws(()=>particleShape(0,10,'unknown'));
});
test('canceling camera permission releases a stream that arrives late',async()=>{
  const permission=deferred(),media=stream();let detectorCalls=0;
  const camera=new HandCamera({video:video(),...mockFrames,getUserMedia:()=>permission.promise,createDetector:async()=>{detectorCalls++;}});
  const start=camera.start();camera.stop();permission.resolve(media);await start;
  assert.equal(media.track.stopped,1);assert.equal(detectorCalls,0);assert.equal(camera.active,false);assert.equal(camera.video.srcObject,null);
});
test('canceling model startup closes the late detector and cannot reactivate camera',async()=>{
  const model=deferred(),media=stream();let closed=0;
  const camera=new HandCamera({video:video(),...mockFrames,getUserMedia:async()=>media,createDetector:()=>model.promise});
  const start=camera.start();await turn();camera.stop();model.resolve({close(){closed++;}});await start;
  assert.equal(closed,1);assert.equal(media.track.stopped,1);assert.equal(camera.active,false);assert.equal(camera.video.srcObject,null);
});
test('tracker failures release video, detector, and landmarks',async()=>{
  const media=stream();let closed=0,lastHands=null;const states=[];
  const camera=new HandCamera({video:video(),...mockFrames,now:()=>200,getUserMedia:async()=>media,createDetector:async()=>({detectForVideo(){throw Error('device failure');},close(){closed++;}}),onHands:x=>{lastHands=x;},onState:x=>states.push(x.state)});
  await camera.start();camera.tick();assert.equal(camera.active,false);assert.equal(media.track.stopped,1);assert.equal(closed,1);assert.deepEqual(lastHands,[]);assert.equal(states.at(-1),'error');
});
test('permission failures remain off and never initialize hand tracking',async()=>{
  let calls=0;const states=[];
  const camera=new HandCamera({video:video(),...mockFrames,getUserMedia:async()=>{throw {name:'NotAllowedError'};},createDetector:async()=>{calls++;},onState:x=>states.push(x)});
  await camera.start();assert.equal(calls,0);assert.equal(camera.active,false);assert.equal(states.at(-1).state,'error');assert.match(states.at(-1).message,/denied/);
});
test('a stopped recognizer cannot run late transcripts or restart itself',()=>{
  let recognizer,commands=0;
  class Recognition{constructor(){recognizer=this;}start(){}abort(){this.aborted=true;}}
  const voice=new VoiceControl({Recognition,onTranscript:()=>commands++});voice.start();voice.stop();
  recognizer.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'Jarvis next scene'}}]});recognizer.onend();
  assert.equal(commands,0);assert.equal(voice.wanted,false);assert.equal(recognizer.aborted,true);assert.equal(voice.restartTimer,0);
});
test('speech-service errors stop capture without a permission retry loop',()=>{
  let recognizer;const states=[];
  class Recognition{constructor(){recognizer=this;}start(){}abort(){}}
  const voice=new VoiceControl({Recognition,onState:x=>states.push(x)});voice.start();recognizer.onerror({error:'not-allowed'});
  assert.equal(voice.wanted,false);assert.equal(states.at(-1).state,'error');assert.match(states.at(-1).message,/denied/);assert.equal(voice.restartTimer,0);
});
test('unsupported speech has an explicit fallback and never starts capture',()=>{
  const states=[];const voice=new VoiceControl({Recognition:null,onState:x=>states.push(x)});voice.start();
  assert.equal(voice.wanted,false);assert.equal(states.at(-1).state,'unsupported');
});

test('constructing input controllers does not request sensors or initialize models',()=>{
  let permissions=0,models=0,recognizers=0;
  const camera=new HandCamera({video:video(),...mockFrames,getUserMedia:()=>{permissions++;},createDetector:()=>{models++;}});
  class Recognition{constructor(){recognizers++;}}
  const voice=new VoiceControl({Recognition});
  assert.equal(permissions,0);assert.equal(models,0);assert.equal(recognizers,0);assert.equal(camera.active,false);assert.equal(voice.wanted,false);
});
test('camera asks only for video and releases all tracks on a normal stop',async()=>{
  const media=stream();let constraints,closed=0;
  const camera=new HandCamera({video:video(),...mockFrames,getUserMedia:async value=>{constraints=value;return media;},createDetector:async()=>({close(){closed++;}})});
  await camera.start();assert.equal(constraints.audio,false);assert.equal(camera.active,true);camera.stop();
  assert.equal(media.track.stopped,1);assert.equal(closed,1);assert.equal(camera.video.srcObject,null);
});

test('a folded fist is not a pinch just because thumb and index tips are close',()=>{
  const fist=hand([false,false,false,false]);fist[4]={...fist[8]};assert.equal(readHand(fist).pose,'fist');
});
test('stalled video clears old landmarks once instead of leaving a hand in control',async()=>{
  const media=stream();let now=200;const frames=[];
  const camera=new HandCamera({video:video(),...mockFrames,now:()=>now,getUserMedia:async()=>media,createDetector:async()=>({detectForVideo:()=>({landmarks:[hand()]}),close(){}}),onHands:x=>frames.push(x)});
  await camera.start();camera.tick();assert.equal(frames.at(-1).length,1);
  now=900;camera.tick();assert.deepEqual(frames.at(-1),[]);const length=frames.length;
  now=1000;camera.tick();assert.equal(frames.length,length);camera.stop();
});
