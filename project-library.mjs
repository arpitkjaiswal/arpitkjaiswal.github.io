import {getProjects,getCatalogState,refreshCatalog} from './project-catalog.mjs?v=20261106-ux2';
import {filterCatalog} from './catalog-core.mjs?v=20261106-ux2';

const $=selector=>document.querySelector(selector),dialog=$('#projectLibrary'),grid=$('#libraryGrid');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let category='all',opener=null;
const date=value=>{const time=typeof value==='number'?value:Date.parse(value);return Number.isFinite(time)?new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(new Date(time)):'Date unavailable';};
function render(){
  const projects=getProjects(),matches=filterCatalog(projects,{query:$('#librarySearch').value,category,sort:$('#librarySort').value});
  $('#libraryCount').textContent=`${matches.length} ${matches.length===1?'project':'projects'}`;
  $('#libraryEmpty').hidden=matches.length>0;grid.replaceChildren();
  for(const project of matches){
    const card=document.createElement('article');card.className='library-card';card.style.setProperty('--project-color',project.color);
    card.dataset.libraryProject=project.id;
    const label=project.featured?'FEATURED':project.curated?'SELECTED BUILD':'FROM GITHUB';
    card.innerHTML=`<button class="library-art" data-hand-action="project:${project.id}" data-library-open="${project.id}" aria-label="Open ${escape(project.name)}">${project.art?`<img src="${project.art}" alt="" width="720" height="440" loading="lazy">`:`<span class="library-monogram" aria-hidden="true">${escape(project.symbol)}</span>`}<span class="library-stage">${label}</span><span class="library-open-icon" aria-hidden="true">↗</span></button><div class="library-card-copy"><div class="library-title"><h3>${escape(project.name)}</h3>${project.stars?`<span aria-label="${project.stars} GitHub stars">☆ ${project.stars}</span>`:''}</div><p>${escape(project.description)}</p><div class="library-tags">${project.tags.map(tag=>`<span>${escape(tag)}</span>`).join('')||'<span>Repository</span>'}</div><div class="library-card-bottom"><span>Updated ${escape(date(project.updated))}</span><button type="button" data-library-open="${project.id}" data-hand-action="project:${project.id}">Explore <span aria-hidden="true">↗</span></button></div></div>`;
    grid.appendChild(card);
  }
  document.querySelectorAll('[data-library-count]').forEach(node=>node.textContent=String(projects.length));
}
function updateStatus(){
  const state=getCatalogState(),node=$('#librarySync');
  node.textContent=`${state.message}${!state.busy&&!state.error?' · '+date(state.time):''}`;
  node.dataset.state=state.error?'error':state.busy?'loading':state.source==='live'?'live':'saved';
  $('#libraryRefresh').disabled=state.busy;$('#libraryRefresh').textContent=state.busy?'Syncing…':'Refresh GitHub';
  const status=$('#deckCatalogStatus');if(status)status.textContent=state.busy?'Checking GitHub…':state.error?'Saved projects available':`${state.count} projects · ${state.source==='live'?'GitHub synced':state.source==='cache'?'recently synced':'saved snapshot'}`;
}
export function openProjectLibrary(){
  opener=document.activeElement;
  document.querySelectorAll('dialog[open]').forEach(node=>node.close());
  render();updateStatus();dialog.showModal();document.body.style.overflow='hidden';$('#librarySearch').focus();
}
document.addEventListener('portfolio:library',openProjectLibrary);
document.querySelectorAll('[data-open-library]').forEach(button=>button.addEventListener('click',openProjectLibrary));
grid.addEventListener('click',event=>{
  const button=event.target.closest('[data-library-open]');if(!button)return;
  if(!getProjects().some(p=>p.id===button.dataset.libraryOpen))return;
  document.dispatchEvent(new CustomEvent('portfolio:project',{detail:{id:button.dataset.libraryOpen}}));
});
$('#librarySearch').addEventListener('input',render);$('#librarySort').addEventListener('change',render);
document.querySelectorAll('[data-library-filter]').forEach(button=>button.addEventListener('click',()=>{
  category=button.dataset.libraryFilter;
  document.querySelectorAll('[data-library-filter]').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));render();
}));
$('#libraryClear').addEventListener('click',()=>{$('#librarySearch').value='';category='all';$('#librarySort').value='featured';document.querySelector('[data-library-filter="all"]').click();$('#librarySearch').focus();});
$('#libraryRefresh').addEventListener('click',()=>refreshCatalog({force:true}));
dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))opener?.focus?.({preventScroll:true});});
document.addEventListener('portfolio:catalog',()=>{if(dialog.open)render();else document.querySelectorAll('[data-library-count]').forEach(node=>node.textContent=String(getProjects().length));updateStatus();});
document.addEventListener('portfolio:catalog-status',updateStatus);
document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||document.querySelector('dialog[open]')||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(event.key==='/'&&document.documentElement.classList.contains('deck-mode')){event.preventDefault();openProjectLibrary();}
});
render();updateStatus();refreshCatalog();
