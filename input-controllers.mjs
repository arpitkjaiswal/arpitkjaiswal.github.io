import {cameraMessage} from './interaction-core.mjs';

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
  constructor({Recognition=globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition,
    onState=()=>{}, onTranscript=()=>{}, language='en-IN', timeoutMs=15000}) {
    Object.assign(this,{Recognition,onState,onTranscript,language,timeoutMs});
    this.wanted=false; this.generation=0; this.recognition=null; this.restartTimer=0; this.startTimer=0; this.quickEnds=0;
  }
  start() {
    if (this.wanted) return;
    if (!this.Recognition) { this.onState({state:'unsupported',message:'Voice is unavailable in this browser. Type a command below instead.'}); return; }
    this.wanted=true; const generation=++this.generation; this.quickEnds=0;
    this.open(generation);
  }
  open(generation) {
    if (!this.wanted || generation!==this.generation) return;
    let recognition;
    try { recognition=new this.Recognition(); }
    catch { this.fail('Speech recognition could not start. Use the command box instead.'); return; }
    this.recognition=recognition;
    recognition.lang=this.language; recognition.continuous=true; recognition.interimResults=false; recognition.maxAlternatives=1;
    const started=Date.now();
    const current=()=>this.wanted && generation===this.generation && this.recognition===recognition;
    recognition.onstart=()=>{if(current()){clearTimeout(this.startTimer);this.onState({state:'listening',message:'Listening. Say “Jarvis”, then a command.'});}};
    recognition.onresult=event=>{
      if(!current())return;
      for(let index=event.resultIndex;index<event.results.length;index++){
        if(!current())break;
        if(event.results[index].isFinal) this.onTranscript(event.results[index][0].transcript);
      }
    };
    recognition.onerror=event=>{
      if(!current())return;
      if(event.error==='no-speech')return;
      const messages={
        'not-allowed':'Microphone permission was denied. You can type commands instead.',
        'service-not-allowed':'Your browser’s speech service is unavailable. Type a command instead.',
        'audio-capture':'No microphone is available. Connect one, or use the command box.',
        'network':'The speech service could not connect. Check your network, or type commands.',
        'language-not-supported':'This speech language is unavailable. Type a command instead.'
      };
      this.fail(messages[event.error] || 'Voice control stopped. Try again or type your command.');
    };
    recognition.onend=()=>{
      if(!current())return;
      clearTimeout(this.startTimer);
      this.quickEnds=Date.now()-started<1500 ? this.quickEnds+1 : 0;
      if(this.quickEnds>=3){this.fail('The speech service keeps disconnecting. Try later or type a command.');return;}
      this.onState({state:'starting',message:'Voice is reconnecting…'});
      this.restartTimer=setTimeout(()=>this.open(generation),500);
    };
    this.onState({state:'starting',message:'Allow microphone access for voice commands.'});
    this.startTimer=setTimeout(()=>{if(current())this.fail('Voice startup timed out. Try again or type a command.');},this.timeoutMs);
    try { recognition.start(); } catch { this.fail('Voice could not start. Try again or use the command box.'); }
  }
  fail(message){this.stop();this.onState({state:'error',message});}
  stop(message='Voice off. The command box is always available.') {
    this.wanted=false; ++this.generation;
    clearTimeout(this.restartTimer);clearTimeout(this.startTimer);
    const recognition=this.recognition;this.recognition=null;
    try { recognition?.abort(); } catch { /* Already stopped. */ }
    this.onState({state:'off',message});
  }
}
