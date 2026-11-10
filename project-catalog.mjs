import {mergeCatalog,fetchRepositoryPages,validCatalogCache} from './catalog-core.mjs?v=20261110-layout';

const portfolio=window.PORTFOLIO,curated=portfolio.projects.map(p=>({...p}));
const snapshot=window.PORTFOLIO_REPOS||{repos:[],checkedAt:portfolio.checkedAt,publicRepos:portfolio.publicRepos};
const CACHE='arpit.catalog.v1',TTL=5*60*1000;
let current={source:'snapshot',time:Date.parse(snapshot.checkedAt)||0,publicCount:snapshot.publicRepos||portfolio.publicRepos,message:'Saved GitHub snapshot',busy:false,error:false};
let inflight=null,lastAttempt=0;
function emit(){document.dispatchEvent(new CustomEvent('portfolio:catalog-status',{detail:getCatalogState()}));}
function apply(repos,{source,time,publicCount}){
  const next=mergeCatalog(curated,repos,{complete:source==='live'||source==='cache'||repos.length>0});
  const changed=JSON.stringify(next)!==JSON.stringify(portfolio.projects);
  if(changed)portfolio.projects.splice(0,portfolio.projects.length,...next);
  current={source,time,publicCount,message:source==='live'?'Synced with GitHub':source==='cache'?'Recently synced projects':'Saved GitHub snapshot',busy:false,error:false};
  window.PORTFOLIO_CATALOG=getCatalogState();
  if(changed)document.dispatchEvent(new CustomEvent('portfolio:catalog',{detail:getCatalogState()}));emit();
}
export function getProjects(){return portfolio.projects;}
export function getCatalogState(){return {...current,count:portfolio.projects.length};}
let cached;
try{cached=JSON.parse(localStorage.getItem(CACHE)||'null');}catch{cached=null;}
if(validCatalogCache(cached)&&cached.time>current.time)apply(cached.repos,{source:'cache',time:cached.time,publicCount:cached.repos.length});
else apply(Array.isArray(snapshot.repos)?snapshot.repos:[],current);

export async function refreshCatalog({force=false}={}){
  if(inflight)return inflight;
  if(!force&&current.source!=='snapshot'&&Date.now()-current.time<TTL)return getCatalogState();
  if(Date.now()-lastAttempt<45000){if(force){current.message='Just checked GitHub. Please wait a moment before refreshing again.';emit();}return getCatalogState();}
  lastAttempt=Date.now();current={...current,busy:true,error:false,message:'Checking GitHub for new projects…'};emit();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  inflight=(async()=>{
    try{
      const repos=await fetchRepositoryPages(fetch.bind(window),{signal:controller.signal});
      const time=Date.now();apply(repos,{source:'live',time,publicCount:repos.length});
      try{localStorage.setItem(CACHE,JSON.stringify({version:1,time,repos}));}catch{/* The in-memory catalog works without storage. */}
    }catch(error){
      current={...current,busy:false,error:true,message:error?.name==='AbortError'?'GitHub took too long. Saved projects are still available.':`${error?.message||'GitHub is unavailable.'} Saved projects are still available.`};emit();
    }finally{clearTimeout(timer);inflight=null;}
    return getCatalogState();
  })();
  return inflight;
}

// Refresh visible pages and returning visits; sensor permissions are unrelated.
let refreshTimer=0;
function startRefreshTimer(){if(!refreshTimer)refreshTimer=setInterval(()=>{if(!document.hidden)refreshCatalog();},TTL);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCatalog();});
window.addEventListener('focus',()=>refreshCatalog());
window.addEventListener('pageshow',startRefreshTimer);
window.addEventListener('pagehide',()=>{clearInterval(refreshTimer);refreshTimer=0;});
startRefreshTimer();
