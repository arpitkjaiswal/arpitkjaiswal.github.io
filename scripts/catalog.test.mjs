import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRepositories,mergeCatalog,spotlightProjects,filterCatalog,fetchRepositoryPages,validCatalogCache} from '../catalog-core.mjs';
import {parseCommand} from '../interaction-core.mjs';
import {ExplorerProgress} from '../deck-core.mjs';
const repo=(name,extra={})=>({name,owner:{login:'arpitkjaiswal'},private:false,fork:false,archived:false,description:'A useful experiment',language:'TypeScript',topics:[],created_at:'2026-11-01T00:00:00Z',pushed_at:'2026-11-06T00:00:00Z',stargazers_count:0,...extra});
const curated=[{id:'lexa',repo:'LEXA',name:'LEXA / BUDDY',description:'Reviewed description',detail:'Reviewed details',features:['A verified feature'],boundary:'Development build',tags:['Python'],categories:['ai'],updated:'2026-10-31T00:00:00Z'}];

test('only original public repos appear; hidden, archived, foreign, and malformed entries are excluded',()=>{
  const inputs=[repo('New-Build'),repo('New-Build'),repo('Fork',{fork:true}),repo('Private',{private:true}),repo('Archived',{archived:true}),repo('Hidden',{topics:['portfolio-hidden']}),repo('Other',{owner:{login:'someone-else'}}),repo('arpitkjaiswal.github.io'),repo('arpitkjaiswal'),repo('../bad'),{name:12,owner:{login:1},private:false},null];
  assert.deepEqual(normalizeRepositories(inputs).map(r=>r.name),['New-Build']);
});
test('new repos get complete cards without replacing reviewed copy or fabricating demo URLs',()=>{
  const all=mergeCatalog(curated,[repo('LEXA',{description:'Raw metadata'}),repo('New-Build')]);
  assert.equal(all.length,2);assert.equal(all[0].description,'Reviewed description');assert.equal(all[0].detail,'Reviewed details');
  assert.equal(all[1].id,'repo-new-build');assert.equal(all[1].stage,'GitHub repository');assert.equal(all[1].demo,undefined);assert.equal(all[1].curated,false);
});
test('a complete live catalog removes curated repos that are no longer public',()=>{
  assert.equal(mergeCatalog(curated,[repo('Other')],{complete:true}).some(p=>p.id==='lexa'),false);
  assert.equal(mergeCatalog(curated,[]).length,1);
  assert.equal(mergeCatalog(curated,[repo('LEXA',{topics:['portfolio-hidden']})]).length,0);
});
test('portfolio-featured promotes a new repo while the complete library keeps every project',()=>{
  const all=mergeCatalog(curated,[repo('LEXA'),repo('Important-New-Build',{topics:['portfolio-featured']}),repo('Another')]);
  assert.equal(spotlightProjects(all,2)[0].id,'repo-important-new-build');assert.equal(spotlightProjects(all,2).length,2);assert.equal(all.length,3);
});
test('search, categories, newest, and star sorting operate on dynamically discovered repos',()=>{
  const all=mergeCatalog(curated,[repo('LEXA'),repo('Future-Web',{created_at:'2026-11-06T00:00:00Z',stargazers_count:3}),repo('AI-Lab',{topics:['ai'],language:'Python',stargazers_count:10})]);
  assert.equal(filterCatalog(all,{query:'future',category:'web'})[0].repo,'Future-Web');
  assert.equal(filterCatalog(all,{category:'play'}).length,0);
  assert.equal(filterCatalog(all,{sort:'recent'})[0].repo,'Future-Web');assert.equal(filterCatalog(all,{sort:'stars'})[0].repo,'AI-Lab');
});
test('public GitHub refresh paginates beyond one hundred repos and deduplicates stable names',async()=>{
  const calls=[],first=Array.from({length:100},(_,i)=>repo('Build-'+i));
  const result=await fetchRepositoryPages(async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>calls.length===1?first:[repo('Build-99'),repo('Build-100')]};});
  assert.equal(calls.length,2);assert.equal(result.length,101);assert.match(calls[1].url,/page=2$/);assert.equal(calls[0].options.headers.Accept,'application/vnd.github+json');
});
test('failed or truncated refreshes reject instead of publishing a partial project list',async()=>{
  await assert.rejects(fetchRepositoryPages(async()=>({ok:false,status:403})),/rate limit/);
  let calls=0;
  await assert.rejects(fetchRepositoryPages(async()=>{calls++;if(calls===1)return {ok:true,json:async()=>Array.from({length:100},(_,i)=>repo('Build-'+i))};throw new Error('offline');}),/offline/);
  await assert.rejects(fetchRepositoryPages(async()=>({ok:true,json:async()=>Array.from({length:100},(_,i)=>repo('Build-'+i))}),{maxPages:1}),/larger/);
});
test('unexpected API payloads and future-dated cache records cannot replace the catalog',async()=>{
  await assert.rejects(fetchRepositoryPages(async()=>({ok:true,json:async()=>({message:'error'})})),/unexpected/);
  await assert.rejects(fetchRepositoryPages(async()=>({ok:true,json:async()=>[repo('Private',{private:true})]})),/unexpected/);
  const now=100000;assert.equal(validCatalogCache({version:1,time:now+70000,repos:[]},now),false);
  assert.equal(validCatalogCache({version:1,time:now,repos:[repo('Okay')]},now),true);
});
test('voice resolves future known repos and visible ordinals while retaining the wake-word boundary',()=>{
  const projects=mergeCatalog(curated,[repo('LEXA'),repo('Important-New-Build')]),options={projects,projectIds:['repo-important-new-build','lexa']};
  assert.deepEqual(parseCommand('Jarvis, open Important New Build',options),{type:'openProject',id:'repo-important-new-build'});
  assert.deepEqual(parseCommand('Jarvis open project one',options),{type:'openProject',id:'repo-important-new-build'});
  assert.equal(parseCommand('open Important New Build',options),null);
  assert.equal(parseCommand('Jarvis open https://outside.example',options),null);
  assert.deepEqual(parseCommand('Jarvis show all projects',options),{type:'deck',action:'library'});
});
test('ambiguous normalized repo names do not open the wrong project',()=>{
  const projects=mergeCatalog([],[repo('Hello-World'),repo('Hello_World')]);
  assert.equal(parseCommand('Jarvis open hello world',{projects}),null);
});
test('repo names ending in project are preserved, while an optional project suffix still works',()=>{
  const projects=mergeCatalog(curated,[repo('LEXA'),repo('OSDL_Lab_Project')]);
  assert.deepEqual(parseCommand('Jarvis open OSDL Lab Project',{projects}),{type:'openProject',id:'repo-osdl_lab_project'});
  assert.deepEqual(parseCommand('Jarvis open LEXA project',{projects}),{type:'openProject',id:'lexa'});
});
test('catalog growth preserves earned XP and an empty catalog never earns a completion rank',()=>{
  const progress=new ExplorerProgress(['lexa']);progress.visit('lexa');
  assert.deepEqual(progress.setCatalog(['lexa','new']),{count:1,total:2,xp:100,rank:'SCOUT'});
  assert.deepEqual(progress.setCatalog([]),{count:0,total:0,xp:0,rank:'INITIATE'});
});
