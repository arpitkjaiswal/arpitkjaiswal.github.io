import {projectCommand} from './deck-core.mjs?v=20261106-deck1';
/* Pure input interpretation. These functions never access a camera or microphone. */
export const SCENES = Object.freeze(['reactor', 'galaxy', 'vortex', 'aurora']);
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));

export function validHand(points) {
  return Array.isArray(points) && points.length === 21 && points.every(point =>
    point && ['x', 'y', 'z'].every(key => Number.isFinite(point[key]))
  );
}

export function readHand(points) {
  if (!validHand(points)) return null;
  const span = Math.max(0.015, distance(points[5], points[17]));
  const fingerPairs = [[8,6], [12,10], [16,14], [20,18]];
  const extended = fingerPairs.map(([tip, joint]) =>
    distance(points[tip], points[0]) > distance(points[joint], points[0]) + span * 0.22
  );
  const count = extended.filter(Boolean).length;
  const pinchRatio = distance(points[4], points[8]) / span;
  const center = [0,5,9,13,17].reduce((sum, index) => ({
    x: sum.x + points[index].x / 5, y: sum.y + points[index].y / 5
  }), {x:0, y:0});
  let pose = 'steer';
  const pinchShape = count > 0 || distance(points[8],points[0]) > distance(points[6],points[0]) + span*0.08;
  if (pinchRatio < 0.34 && pinchShape) pose = 'pinch';
  else if (extended[0] && extended[1] && !extended[2] && !extended[3]) pose = 'peace';
  else if (count >= 4) pose = 'palm';
  else if (count === 0) pose = 'fist';
  return {x:clamp(1-center.x), y:clamp(center.y), cursorX:clamp(1-points[8].x), cursorY:clamp(points[8].y), pose, pinch:clamp(1-pinchRatio/0.8), span};
}

export function readHands(landmarks) {
  const hands = (Array.isArray(landmarks) ? landmarks : []).slice(0,2).map(readHand).filter(Boolean);
  if (!hands.length) return null;
  const main = hands[0];
  const separation = hands.length === 2 ? Math.hypot(hands[0].x-hands[1].x, hands[0].y-hands[1].y) : null;
  return {...main, count:hands.length,
    x:hands.reduce((sum, hand) => sum+hand.x,0)/hands.length,
    y:hands.reduce((sum, hand) => sum+hand.y,0)/hands.length,
    zoom:separation === null ? 1 : clamp(0.65+separation*2,0.65,1.8)};
}

// Hold-to-trigger and release-to-rearm avoid switching a scene on every video frame.
export class PoseLatch {
  constructor(holdMs = 650) { this.holdMs = holdMs; this.reset(); }
  reset() { this.pose = null; this.since = 0; this.fired = false; }
  update(pose, now) {
    if (pose !== 'peace') { this.reset(); return false; }
    if (this.pose !== pose) { this.pose = pose; this.since = now; this.fired = false; }
    if (!this.fired && now-this.since >= this.holdMs) { this.fired = true; return true; }
    return false;
  }
}

export function parseCommand(transcript, {requireWakeWord = true} = {}) {
  if (typeof transcript !== 'string' || transcript.length > 180) return null;
  let text = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g,' ').trim();
  const wake = /^(?:hey |okay |ok )?jarvis\b\s*/;
  if (requireWakeWord && !wake.test(text)) return null;
  text = text.replace(wake, '').replace(/^please /,'').replace(/ please$/,'').trim();
  const project=projectCommand(text);if(project)return project;
  if (SCENES.includes(text)) return {type:'scene',scene:text};
  const scene = text.match(/^(?:show|switch to|activate|engage)(?: the)? (reactor|galaxy|vortex|aurora)(?: mode)?$/);
  if (scene) return {type:'scene',scene:scene[1]};
  const exact = {
    'mission control':{type:'deck',action:'home'},'game mode':{type:'deck',action:'home'},
    'classic mode':{type:'deck',action:'classic'},'classic portfolio':{type:'deck',action:'classic'},
    'next project':{type:'deck',action:'next'},'previous project':{type:'deck',action:'previous'},
    'open selected project':{type:'deck',action:'open'},'close project':{type:'deck',action:'back'},'back':{type:'deck',action:'back'},
    'scroll down':{type:'scroll',direction:1},'scroll up':{type:'scroll',direction:-1},
    'next scene':{type:'next'},'next mode':{type:'next'},
    'previous scene':{type:'previous'},'previous mode':{type:'previous'},
    'change color':{type:'palette'},'change colour':{type:'palette'},'change colors':{type:'palette'},
    'burst':{type:'burst'},'energy burst':{type:'burst'},
    'pause':{type:'pause'},'pause animations':{type:'pause'},'freeze':{type:'pause'},
    'resume':{type:'resume'},'resume animations':{type:'resume'},
    'autopilot on':{type:'autopilot',enabled:true},'autopilot off':{type:'autopilot',enabled:false},
    'show projects':{type:'navigate',target:'work'},'show my work':{type:'navigate',target:'work'},
    'open projects':{type:'navigate',target:'work'},'about':{type:'navigate',target:'about'},
    'show about':{type:'navigate',target:'about'},'contact':{type:'navigate',target:'contact'},
    'go home':{type:'navigate',target:'home'},'playground':{type:'navigate',target:'playground'},
    'camera off':{type:'cameraOff'},'stop camera':{type:'cameraOff'},
    'stop listening':{type:'voiceOff'},'voice off':{type:'voiceOff'},
    'stop all inputs':{type:'stopInputs'},'help':{type:'help'}
  };
  return exact[text] ? {...exact[text]} : null;
}

export function cameraMessage(error) {
  if (error?.name==='UnsupportedGraphicsError') return 'Hand tracking graphics are unavailable in this browser. Mouse, touch, and voice still work.';
  if (['NotAllowedError','PermissionDeniedError','SecurityError'].includes(error?.name)) return 'Camera permission was denied. You can still use your mouse, touch, or commands.';
  if (['NotFoundError','DevicesNotFoundError'].includes(error?.name)) return 'No camera was found. Connect one, or keep exploring with your mouse.';
  if (['NotReadableError','TrackStartError'].includes(error?.name)) return 'The camera is busy. Close the other camera app, then try again.';
  return 'Hand tracking could not start. Check your connection, then try again. Mouse and touch still work.';
}

export function particleShape(index, count, scene) {
  const t = (index+0.5)/count;
  const random = seed => { const n=Math.sin((index+1)*12.9898+seed*78.233)*43758.5453;return n-Math.floor(n); };
  if (scene==='reactor') {
    const y=1-2*t, r=Math.sqrt(Math.max(0,1-y*y)), a=index*2.3999632297;
    return [Math.cos(a)*r,y,Math.sin(a)*r];
  }
  if (scene==='galaxy') {
    const r=Math.sqrt(t), a=(index%5)/5*Math.PI*2+r*6.1+(random(1)-.5)*.55;
    return [Math.cos(a)*r*1.2,Math.sin(a)*r*.68,(random(2)-.5)*.22*(1-r*.7)];
  }
  if (scene==='vortex') {
    const a=t*Math.PI*12+(index%3)*Math.PI*2/3,r=.19+t*.8;
    return [Math.cos(a)*r,(t-.5)*1.8,Math.sin(a)*r];
  }
  if (scene==='aurora') {
    const u=(index%64)/63, band=Math.floor(index/64)/Math.max(1,Math.ceil(count/64)-1);
    const x=(u-.5)*2.1;
    return [x,Math.sin(u*Math.PI*2.1)*.34+(band-.5)*.65,Math.cos(u*5.5+band*3)*.35];
  }
  throw new Error('Unknown visual scene');
}
