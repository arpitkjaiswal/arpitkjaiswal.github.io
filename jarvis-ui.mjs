/* The panel owns presentation; the controller alone owns microphone capture. */
const $=selector=>document.querySelector(selector),dialog=$('#jarvisDialog');
const dispatch=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
let wanted=false,opener=null;
function listen(){dispatch('portfolio:voice-control',{action:'listen',mode:$('#jarvisMode').value,language:$('#jarvisLanguage').value});}
function open({listen:shouldListen=false}={}){
  if(!dialog.open){opener=document.activeElement;document.querySelectorAll('dialog[open]').forEach(node=>node.close());dialog.showModal();document.body.style.overflow='hidden';}
  if(shouldListen)listen();
}
function stop(){dispatch('portfolio:voice-control',{action:'stop'});}
function execute(text){
  const accepted=document.dispatchEvent(new CustomEvent('portfolio:execute',{cancelable:true,detail:{text}}));
  if(!accepted){$('#jarvisResponse').textContent='Try a project name, “start tour”, “show AI projects”, or “help”.';return false;}
  return true;
}
function addLine(text,kind){
  const line=document.createElement('li'),label=document.createElement('span'),copy=document.createElement('p');
  label.textContent=kind==='heard'?'YOU':'JARVIS';copy.textContent=text;line.dataset.kind=kind;line.append(label,copy);$('#jarvisLog').append(line);
  while($('#jarvisLog').children.length>8)$('#jarvisLog').firstElementChild.remove();
}
document.addEventListener('portfolio:jarvis',event=>open(event.detail||{}));
$('#jarvisListen').addEventListener('click',()=>wanted?stop():listen());
$('#jarvisMode').addEventListener('change',()=>{stop();$('#jarvisModeHint').textContent=$('#jarvisMode').value==='handsfree'?'Say “Jarvis”, then a command. Follow-ups work for 10 seconds. Stop anytime.':'Say a command directly. Listening ends after one command or 20 seconds.';});
$('#jarvisLanguage').addEventListener('change',stop);
$('#jarvisReplies').addEventListener('change',()=>dispatch('portfolio:voice-control',{action:'replies',value:$('#jarvisReplies').checked}));
$('#jarvisQuality').addEventListener('change',()=>dispatch('portfolio:quality',{mode:$('#jarvisQuality').value}));
$('#jarvisForm').addEventListener('submit',event=>{event.preventDefault();const field=$('#jarvisTyped');if(execute(field.value)){field.value='';field.removeAttribute('aria-invalid');}else field.setAttribute('aria-invalid','true');});
$('#jarvisTyped').addEventListener('input',()=>$('#jarvisTyped').removeAttribute('aria-invalid'));
document.querySelectorAll('[data-jarvis-command]').forEach(button=>button.addEventListener('click',()=>execute(button.dataset.jarvisCommand)));
document.addEventListener('portfolio:voice-state',event=>{
  const state=event.detail||{};wanted=state.wanted===true;dialog.dataset.voice=state.state;
  $('#jarvisState').textContent=({starting:'CONNECTING',listening:'LISTENING',speaking:'SPEAKING · MIC PAUSED',error:'CONNECTION NEEDED',unsupported:'TYPE TO COMMAND',off:'STANDBY'})[state.state]||'STANDBY';
  $('#jarvisHint').textContent=state.message||'Choose Listen once, or type a command below.';
  $('#jarvisListen').textContent=wanted?'Stop microphone':'Listen once';
  if(!wanted&&$('#jarvisMode').value==='handsfree')$('#jarvisListen').textContent='Start hands-free';
  $('#jarvisListen').setAttribute('aria-pressed',String(wanted));
});
document.addEventListener('portfolio:voice-heard',event=>{
  const {text,final}=event.detail||{};if(typeof text!=='string')return;
  $('#jarvisTranscript').textContent=text;$('#jarvisTranscript').dataset.final=String(final);
  if(final)addLine(text,'heard');
});
document.addEventListener('portfolio:command-result',event=>{
  const {reply,text,spoken}=event.detail||{};if(typeof reply!=='string')return;
  if(!spoken)addLine(text,'heard');addLine(reply,'reply');$('#jarvisResponse').textContent=reply;
});
document.addEventListener('portfolio:jarvis-message',event=>{if(typeof event.detail?.text==='string')$('#jarvisResponse').textContent=event.detail.text;});
document.addEventListener('portfolio:reply-mode',event=>$('#jarvisReplies').checked=event.detail?.enabled===true);
// Explicit dismissals stop capture. A command may close this panel while hands-free stays active.
dialog.querySelector('[data-close-dialog]').addEventListener('click',stop);
dialog.addEventListener('cancel',stop);
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)stop();});
dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))opener?.focus?.({preventScroll:true});});
