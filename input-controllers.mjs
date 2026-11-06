import {cameraMessage} from './interaction-core.mjs?v=20261107-orbit';

// Matching, pinned JS/WASM versions; loaded only after explicit camera activation.
export const VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
export const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
export function handGraphicsAvailable() {
  try {
    const canvas=document.createElement('canvas');
    const gl=canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}
export async function createHandDetector() {
  if (!handGraphicsAvailable()) {
    const error=new Error('This browser cannot create the WebGL context required for hand tracking.');
    error.name='UnsupportedGraphicsError';throw error;
  }
  const {FilesetResolver, HandLandmarker} = await import(`${VISION_CDN}/vision_bundle.mjs`);
  const files = await FilesetResolver.forVisionTasks(`${VISION_CDN}/wasm`);
  return HandLandmarker.createFromOptions(files, {
    baseOptions:{modelAssetPath:HAND_MODEL, delegate:'CPU'},
    runningMode:'VIDEO', numHands:2,
    minHandDetectionConfidence:0.6, minHandPresenceConfidence:0.6, minTrackingConfidence:0.6
  });
}

export class HandCamera {
  constructor({video, onState = () => {}, onHands = () => {}, createDetector = createHandDetector,
    getUserMedia = constraints => navigator.mediaDevices.getUserMedia(constraints),
    requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id),
    now = () => performance.now(), timeoutMs = 30000}) {
    Object.assign(this,{video,onState,onHands,createDetector,getUserMedia,requestFrame,cancelFrame,now,timeoutMs});
    this.generation=0; this.active=false; this.loading=false; this.stream=null; this.detector=null;
    this.frame=0; this.timer=0; this.lastInference=0; this.lastVideo=-1; this.interval=80;
  }
  report(state,message) { this.onState({state,message,active:this.active,loading:this.loading}); }
  async start() {
    if (this.active || this.loading) return;
    const generation=++this.generation;
    this.loading=true; this.report('requesting','Allow your camera to start hand control.');
    this.timer=setTimeout(() => {
      if (generation !== this.generation) return;
      this.stop(); this.report('error','Camera startup timed out. You can retry or use mouse and touch.');
    },this.timeoutMs);
    try {
      const stream=await this.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}},audio:false});
      if (generation!==this.generation) { stream.getTracks().forEach(track=>track.stop()); return; }
      this.stream=stream;
      stream.getVideoTracks()[0]?.addEventListener('ended',()=>{
        if (this.stream===stream) { this.stop(); this.report('error','The camera disconnected. Reconnect it and try again.'); }
      },{once:true});
      this.video.srcObject=stream;
      await this.video.play();
      if (generation!==this.generation) return;
      this.report('loading','Loading hand tracking. First launch can take a moment…');
      const detector=await this.createDetector();
      if (generation!==this.generation) { detector.close(); return; }
      this.detector=detector; this.active=true; this.loading=false;
      this.lastVideo=-1; this.lastInference=0; this.interval=80; this.staleCleared=false;
      clearTimeout(this.timer);
      this.report('tracking','Camera ready. Raise a hand in the preview.');
      this.schedule();
    } catch(error) {
      if (generation!==this.generation) return;
      this.stop(); this.report('error',cameraMessage(error));
    }
  }
  schedule() { if (this.active&&!this.frame) this.frame=this.requestFrame(()=>this.tick()); }
  tick() {
    this.frame=0;
    if (!this.active) return;
    const now=this.now();
    if(now-this.lastInference>450&&!this.staleCleared){this.staleCleared=true;this.onHands([],now);}
    if (this.video.readyState>=2 && this.video.currentTime!==this.lastVideo && now-this.lastInference>=this.interval) {
      this.lastVideo=this.video.currentTime; this.lastInference=now; this.staleCleared=false;
      try {
        const result=this.detector.detectForVideo(this.video,now);
        this.interval=Math.max(80,Math.min(200,(this.now()-now)*2));
        this.onHands(result.landmarks || [],now);
      } catch {
        this.stop(); this.report('error','Tracking stopped. Retry camera mode, or continue with mouse and touch.');
        return;
      }
    }
    this.schedule();
  }
  stop(message='Camera off. Autopilot and mouse control are ready.') {
    ++this.generation; this.active=false; this.loading=false;
    clearTimeout(this.timer); if(this.frame)this.cancelFrame(this.frame); this.frame=0;
    const stream=this.stream; this.stream=null;
    stream?.getTracks().forEach(track=>track.stop());
    this.video.pause(); this.video.srcObject=null;
    try { this.detector?.close(); } catch { /* The stream must still be released. */ }
    this.detector=null;
    this.onHands([],this.now()); this.report('off',message);
  }
}

export class VoiceControl {
  constructor({Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition,onState=()=>{},onTranscript=()=>{},onHeard=()=>{},language='en-IN',timeoutMs=15000,onceTimeoutMs=20000,now=()=>Date.now(),setTimer=(callback,delay)=>setTimeout(callback,delay),clearTimer=id=>clearTimeout(id)}){
    Object.assign(this,{Recognition,onState,onTranscript,onHeard,language,timeoutMs,onceTimeoutMs,now,setTimer,clearTimer});
    this.wanted=false;this.mode='once';this.generation=0;this.recognition=null;this.restartTimer=0;this.startTimer=0;this.sessionTimer=0;this.quickEnds=0;this.silenceRounds=0;this.suspended=false;
  }
  report(state,message){this.onState({state,message,wanted:this.wanted,mode:this.mode,suspended:this.suspended});}
  clearTimers(){for(const key of ['restartTimer','startTimer','sessionTimer']){this.clearTimer(this[key]);this[key]=0;}}
  start({mode='once',language=this.language}={}){
    if(this.wanted)return;
    if(!this.Recognition){this.report('unsupported','Voice is unavailable in this browser. Every command also works by typing.');return;}
    this.mode=mode==='handsfree'?'handsfree':'once';this.language=language;this.wanted=true;this.suspended=false;this.quickEnds=0;this.silenceRounds=0;
    const generation=++this.generation;
    if(this.mode==='once')this.sessionTimer=this.setTimer(()=>{if(this.wanted&&generation===this.generation)this.stop('Listening finished. Tap Listen once to try another command.');},this.onceTimeoutMs);
    this.open(generation);
  }
  open(generation){
    if(!this.wanted||this.suspended||generation!==this.generation)return;
    let recognition;
    try{recognition=new this.Recognition();}catch{this.fail('Speech recognition could not start. Type your command, or try again.');return;}
    this.recognition=recognition;
    recognition.lang=this.language;recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=3;
    const started=this.now(),processed=new Set();let heardSpeech=false;
    const current=()=>this.wanted&&!this.suspended&&generation===this.generation&&this.recognition===recognition;
    recognition.onstart=()=>{if(!current())return;this.clearTimer(this.startTimer);this.startTimer=0;this.report('listening',this.mode==='once'?'Listening once. Say your command; “Jarvis” is optional.':'Hands-free ready. Say “Jarvis”, then a command.');};
    recognition.onresult=event=>{
      if(!current())return;
      for(let index=event.resultIndex;index<event.results.length;index++){
        if(!current())break;
        const result=event.results[index],alternatives=Array.from({length:Math.min(result.length||1,3)},(_,i)=>result[i]?.transcript).filter(x=>typeof x==='string').map(x=>x.trim().slice(0,180));
        const text=alternatives[0]||'';if(!text)continue;heardSpeech=true;
        const key=index+':'+text;if(result.isFinal&&processed.has(key))continue;
        this.onHeard({text,final:result.isFinal===true,alternatives});
        if(!result.isFinal)continue;
        processed.add(key);this.silenceRounds=0;
        const decision=this.onTranscript(text,{alternatives:alternatives.slice(1),confidence:result[0]?.confidence});
        if(this.mode==='once'&&this.wanted&&decision?.keepListening!==true){this.stop('Command received. Tap Listen once whenever you need me.');break;}
      }
    };
    recognition.onnomatch=()=>{if(current())this.report('listening','I couldn’t match that. Try “open LEXA”, or type a command.');};
    recognition.onerror=event=>{
      if(!current())return;
      if(event.error==='no-speech'){
        if(this.mode==='once')this.stop('No speech detected. Tap Listen once, then speak close to your microphone.');
        return;
      }
      const messages={
        'not-allowed':'Microphone permission was denied or blocked. Allow this site’s microphone in your browser’s site controls, then try Listen once.',
        'service-not-allowed':'This browser’s speech service is unavailable. Type a command or try a browser with speech recognition.',
        'audio-capture':'No microphone is available. Check your microphone connection and browser input settings.',
        'network':'The browser speech service could not connect. Check your connection, or type the same command.',
        'language-not-supported':'That speech language is unavailable. Choose another English language setting and try again.',
        'aborted':'Voice capture was interrupted. Tap Listen once to reconnect.'
      };
      this.fail(messages[event.error]||'Voice control stopped. Try Listen once, or type your command.');
    };
    recognition.onend=()=>{
      if(!current())return;
      this.clearTimer(this.startTimer);this.startTimer=0;this.recognition=null;
      this.quickEnds=!heardSpeech&&this.now()-started<1200?this.quickEnds+1:0;
      if(!heardSpeech)this.silenceRounds++;
      if(this.quickEnds>=3||this.silenceRounds>=3){this.fail('The speech service is ending without a command. Check microphone permission, or use Listen once / typing.');return;}
      this.report('starting',this.mode==='handsfree'?'Reconnecting hands-free listening…':'Ready for the rest of your command…');
      const delay=Math.min(1600,350*Math.max(1,this.quickEnds));
      this.restartTimer=this.setTimer(()=>{this.restartTimer=0;this.open(generation);},delay);
    };
    this.report('starting','Allow microphone access if your browser asks.');
    this.startTimer=this.setTimer(()=>{if(current())this.fail('Microphone startup timed out. Check this site’s microphone permission, then try again.');},this.timeoutMs);
    try{recognition.start();}catch{this.fail('The microphone could not start. Check site permission, or type your command.');}
  }
  suspend(){
    if(!this.wanted)return null;if(this.suspended)return this.generation;
    this.suspended=true;const token=++this.generation;this.clearTimers();const recognition=this.recognition;this.recognition=null;
    try{recognition?.abort();}catch{}
    this.report('speaking','Speaking. Microphone commands are paused to prevent an echo.');return token;
  }
  resume(token){if(!this.wanted||!this.suspended||token!==this.generation)return false;this.suspended=false;this.quickEnds=0;if(this.mode==='once'){const generation=this.generation;this.sessionTimer=this.setTimer(()=>{if(this.wanted&&generation===this.generation)this.stop('Listening finished. Tap Listen once to try another command.');},this.onceTimeoutMs);}this.open(this.generation);return true;}
  fail(message){this.stop();this.report('error',message);}
  stop(message='Voice off. Type a command or tap Listen once when you’re ready.'){
    this.wanted=false;this.suspended=false;++this.generation;this.clearTimers();const recognition=this.recognition;this.recognition=null;
    try{recognition?.abort();}catch{}
    this.report('off',message);
  }
}
