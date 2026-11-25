import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_IDS,resolveProject,projectCommand,mapHandPointer,PinchSelector,ExplorerProgress,moveProjectIndex} from '../deck-core.mjs';
import {parseCommand,readHand} from '../interaction-core.mjs';

test('project aliases resolve only the nine curated builds',()=>{
  assert.equal(resolveProject('LEXA'),'lexa');assert.equal(resolveProject('terra mind'),'terramind');
  assert.equal(resolveProject('project two'),'terramind');assert.equal(resolveProject('project 9'),'devos');
  assert.equal(resolveProject('document analyzer'),'documentanalyser');
  assert.equal(resolveProject('project 0'),null);assert.equal(resolveProject('https://other.example'),null);assert.equal(resolveProject('__proto__'),null);
});
test('voice can inspect, play, or open source for a named project',()=>{
  assert.deepEqual(parseCommand('Jarvis open LEXA'),{type:'openProject',id:'lexa'});
  assert.deepEqual(parseCommand('Jarvis play Orbit Warden'),{type:'launchProject',id:'orbitwarden'});
  assert.deepEqual(parseCommand('Jarvis source for AegisVault'),{type:'sourceProject',id:'aegisvault'});
  assert.deepEqual(parseCommand('Jarvis open project two'),{type:'openProject',id:'terramind'});
  assert.equal(parseCommand('Jarvis launch arbitrary commands'),null);
  assert.equal(projectCommand('open https://example.com'),null);
});
test('mission controls preserve the wake-word boundary',()=>{
  assert.equal(parseCommand('open LEXA'),null);
  assert.deepEqual(parseCommand('open LEXA',{requireWakeWord:false}),{type:'openProject',id:'lexa'});
  assert.deepEqual(parseCommand('Jarvis next project'),{type:'deck',action:'next'});
  assert.deepEqual(parseCommand('Jarvis close project'),{type:'deck',action:'back'});
  assert.deepEqual(parseCommand('Jarvis mission control'),{type:'deck',action:'home'});
});
test('hand pointer reach is expanded but remains finite and on screen',()=>{
  assert.deepEqual(mapHandPointer(.5,.47),{x:.5,y:.5});
  assert.deepEqual(mapHandPointer(-1,2),{x:0,y:1});assert.equal(mapHandPointer(NaN,.5),null);
});
test('a pinch already closed when a hand appears cannot activate anything',()=>{
  const gate=new PinchSelector();
  for(const now of [0,100,400,1000])assert.equal(gate.update({target:'lexa',pinching:true,now}).activated,null);
});
test('one intentional pinch opens exactly one project until released',()=>{
  const gate=new PinchSelector();
  gate.update({target:'lexa',now:0});gate.update({target:'lexa',now:150});
  assert.equal(gate.update({target:'lexa',pinching:true,now:160}).activated,null);
  assert.equal(gate.update({target:'lexa',pinching:true,now:350}).activated,'lexa');
  for(const now of [400,800,2000])assert.equal(gate.update({target:'lexa',pinching:true,now}).activated,null);
  gate.update({target:'lexa',now:2100});gate.update({target:'lexa',pinching:true,now:2200});
  assert.equal(gate.update({target:'lexa',pinching:true,now:2400}).activated,'lexa');
});
test('opening a dialog under a held pinch cannot immediately close the dialog',()=>{
  const gate=new PinchSelector();gate.update({target:'portal',now:0});gate.update({target:'portal',pinching:true,now:120});
  assert.equal(gate.update({target:'portal',pinching:true,now:320}).activated,'portal');
  assert.equal(gate.update({target:'close-button',pinching:true,now:500}).activated,null);
  assert.equal(gate.update({target:'close-button',pinching:true,now:1000}).activated,null);
});
test('dragging a closed pinch across another control never clicks that control',()=>{
  const gate=new PinchSelector();gate.update({target:'first',now:0});gate.update({target:'first',pinching:true,now:120});
  assert.equal(gate.update({target:'second',pinching:true,now:200}).activated,null);
  assert.equal(gate.update({target:'second',pinching:true,now:800}).activated,null);
});
test('hand loss discards armed state and partial selection progress',()=>{
  const gate=new PinchSelector();gate.update({target:'portal',now:0});gate.update({target:'portal',pinching:true,now:120});
  gate.update({active:false,now:200});
  assert.equal(gate.update({target:'portal',pinching:true,now:900}).activated,null);
});
test('explorer progress is earned once per valid project and never by hovering',()=>{
  const progress=new ExplorerProgress();assert.equal(progress.snapshot().xp,0);
  assert.equal(progress.visit('lexa').xp,100);assert.equal(progress.visit('lexa').fresh,false);
  assert.equal(progress.visit('unknown').count,1);
  for(const id of PROJECT_IDS)progress.visit(id);
  assert.deepEqual(progress.snapshot(),{count:9,total:9,xp:900,rank:'CARTOGRAPHER'});
});
test('keyboard targeting wraps predictably on desktop and narrow maps',()=>{
  assert.equal(moveProjectIndex(0,'ArrowLeft',9),8);assert.equal(moveProjectIndex(8,'ArrowRight',9),0);
  assert.equal(moveProjectIndex(0,'ArrowDown',9,2),2);assert.equal(moveProjectIndex(0,'w',9),6);
  assert.equal(moveProjectIndex(3,'x',9),3);
});
