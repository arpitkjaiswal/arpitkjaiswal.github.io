export const OWNER='arpitkjaiswal';
export const FEATURE_TOPIC='portfolio-featured';
const COLORS=['#83e6f0','#bca4f7','#d4ff63','#ffa990','#f59bc1'];
const namePattern=/^[a-zA-Z0-9_.-]{1,100}$/;
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function publicRepository(repo){
  return repo&&typeof repo==='object'&&typeof repo.owner?.login==='string'&&repo.owner.login.toLowerCase()===OWNER&&repo.private===false&&typeof repo.name==='string'&&namePattern.test(repo.name);
}
export function cleanRepository(repo){
  if(!publicRepository(repo))return null;
  return {name:repo.name,owner:{login:OWNER},private:false,fork:repo.fork===true,archived:repo.archived===true,disabled:repo.disabled===true,
    description:typeof repo.description==='string'?repo.description.slice(0,600):'',language:typeof repo.language==='string'?repo.language.slice(0,40):null,
    topics:Array.isArray(repo.topics)?repo.topics.filter(t=>typeof t==='string'&&/^[a-z0-9-]{1,50}$/.test(t)).slice(0,30):[],
    created_at:validDate(repo.created_at)?repo.created_at:null,pushed_at:validDate(repo.pushed_at)?repo.pushed_at:null,
    stargazers_count:Number.isInteger(repo.stargazers_count)&&repo.stargazers_count>=0?repo.stargazers_count:0};
}
export function normalizeRepositories(repositories){
  const seen=new Set();
  return repositories.map(cleanRepository).filter(repo=>{
    if(!repo||repo.fork||repo.archived||repo.disabled||repo.topics.includes('portfolio-hidden')||[OWNER,OWNER+'.github.io'].includes(repo.name.toLowerCase())||seen.has(repo.name.toLowerCase()))return false;
    seen.add(repo.name.toLowerCase());return true;
  });
}
function category(repo){
  const text=[repo.name,...repo.topics].join(' ').toLowerCase();
  if(/(?:^|[\s_-])(game|gaming|pygame|canvas-game)(?:$|[\s_-])/.test(text))return ['play','Creative coding'];
  if(/(?:^|[\s_-])(ai|ml|cnn|llm|machine-learning|deep-learning|data-analysis)(?:$|[\s_-])/.test(text))return ['ai','AI & data'];
  if(['JavaScript','TypeScript','HTML','CSS'].includes(repo.language))return ['web','Web development'];
  return ['systems','Code & experiments'];
}
export function mergeCatalog(curated,repositories,{complete=false}={}){
  const normalized=normalizeRepositories(repositories),byRepo=new Map(normalized.map(repo=>[repo.name.toLowerCase(),repo]));
  const hidden=new Set(repositories.filter(publicRepository).filter(r=>r.archived||r.disabled||Array.isArray(r.topics)&&r.topics.includes('portfolio-hidden')).map(r=>r.name.toLowerCase()));
  const curatedNames=new Set(curated.map(p=>p.repo.toLowerCase()));
  const reviewed=curated.filter(p=>!hidden.has(p.repo.toLowerCase())&&(!complete||byRepo.has(p.repo.toLowerCase()))).map(project=>{
    const repo=byRepo.get(project.repo.toLowerCase());
    return {...project,curated:true,featured:repo?.topics.includes(FEATURE_TOPIC)||false,stars:repo?.stargazers_count||0,
      created:repo?.created_at||null,updated:repo?.pushed_at||project.updated,language:repo?.language||project.tags[0],topics:repo?.topics||[]};
  });
  const discovered=normalized.filter(r=>!curatedNames.has(r.name.toLowerCase())).map(repo=>{
    const [kind,label]=category(repo),name=repo.name.replace(/[-_]+/g,' '),color=COLORS[[...repo.name].reduce((n,c)=>n+c.charCodeAt(0),0)%COLORS.length];
    return {id:'repo-'+repo.name.toLowerCase(),name,repo:repo.name,categories:[kind],category:label,stage:'GitHub repository',color,compact:true,curated:false,
      featured:repo.topics.includes(FEATURE_TOPIC),stars:repo.stargazers_count,created:repo.created_at,updated:repo.pushed_at,language:repo.language,topics:repo.topics,
      description:repo.description||'Open the repository to explore its code and README.',
      detail:repo.description||'A public repository from my GitHub. Explore the source for its README, code, and setup instructions.',
      tags:[repo.language,...repo.topics.filter(t=>![FEATURE_TOPIC,'portfolio-hidden'].includes(t))].filter(Boolean).slice(0,4),
      features:[],boundary:'Synced from public GitHub metadata. See the repository README for its current scope and setup.',symbol:repo.name.slice(0,2).toUpperCase()};
  });
  return [...reviewed,...discovered.sort((a,b)=>(Date.parse(b.created)||0)-(Date.parse(a.created)||0)||a.repo.localeCompare(b.repo))];
}
export function spotlightProjects(projects,limit=9){
  const promoted=projects.filter(p=>p.featured).sort((a,b)=>(b.stars||0)-(a.stars||0)||(Date.parse(b.updated)||0)-(Date.parse(a.updated)||0));
  return [...promoted,...projects.filter(p=>p.curated&&!p.featured),...projects.filter(p=>!p.curated&&!p.featured)].slice(0,limit);
}
export function filterCatalog(projects,{query='',category='all',sort='featured'}={}){
  const term=query.trim().toLowerCase();
  const result=projects.filter(p=>(category==='all'||category==='featured'&&(p.featured||p.curated)||p.categories.includes(category))&&(!term||[p.name,p.repo,p.description,...p.tags,...(p.topics||[])].join(' ').toLowerCase().includes(term)));
  return result.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='stars'?(b.stars||0)-(a.stars||0)||a.name.localeCompare(b.name):sort==='recent'?(Date.parse(b.created||b.updated)||0)-(Date.parse(a.created||a.updated)||0):Number(b.featured)-Number(a.featured)||Number(b.curated)-Number(a.curated)||(Date.parse(b.created)||0)-(Date.parse(a.created)||0));
}
export async function fetchRepositoryPages(fetcher,{signal,maxPages=10}={}){
  const repos=[],seen=new Set();
  for(let page=1;page<=maxPages;page++){
    const response=await fetcher(`https://api.github.com/users/${OWNER}/repos?type=owner&sort=full_name&direction=asc&per_page=100&page=${page}`,{signal,headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)throw new Error(response.status===403||response.status===429?'GitHub rate limit reached. Try again later.':'GitHub could not be reached.');
    const batch=await response.json();if(!Array.isArray(batch)||batch.some(r=>!publicRepository(r)))throw new Error('GitHub returned an unexpected response.');
    for(const raw of batch){const repo=cleanRepository(raw),key=repo.name.toLowerCase();if(!seen.has(key)){seen.add(key);repos.push(repo);}}
    if(batch.length<100)return repos;
  }
  throw new Error('Repository list is larger than this refresh supports. Saved projects remain available.');
}
export function validCatalogCache(cache,now=Date.now()){
  return cache?.version===1&&Number.isFinite(cache.time)&&cache.time<=now+60000&&cache.time>=0&&Array.isArray(cache.repos)&&cache.repos.length<=1000&&cache.repos.every(publicRepository);
}
