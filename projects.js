/* Curated from the linked public repositories and their READMEs on 2026-11-06.
   Keep stage and limitations honest when updating project descriptions. */
'use strict';
window.PORTFOLIO = Object.freeze({
  checkedAt: '2026-11-06',
  publicRepos: 79,
  username: 'arpitkjaiswal',
  projects: [
    {
      id:'lexa',name:'LEXA / BUDDY',repo:'LEXA',categories:['ai','systems'],category:'AI companion',stage:'Development build',color:'#bca4f7',art:'assets/lexa.svg',
      description:'A talking desktop friend for Apple Silicon Macs. Local speech recognition, useful laptop controls, and a personality of its own.',
      tags:['Python','Whisper','PySide6'],updated:'2026-10-31T19:15:09Z',
      detail:'BUDDY is the companion; LEXA is the repository. An animated desktop pet brings voice, conversation, explicitly saved memory, and everyday tools together on native arm64 macOS.',
      features:['Local faster-whisper speech recognition with optional wake-word detection.','Claude, OpenAI, or local Ollama conversations with speech output.','Allowlisted laptop actions, notes, timers, music, and inspectable saved preferences.'],
      boundary:'Development build for Apple Silicon and macOS 15.2+. Developer ID notarization and physical Mac acceptance checks remain outstanding.',
      sourcePath:'/tree/codex/complete-macos-companion',symbol:'⌘'
    },
    {
      id:'terramind',name:'TerraMind',repo:'TerraMind',categories:['ai'],category:'Agricultural intelligence',stage:'Hackathon prototype',color:'#d4ff63',art:'assets/terramind.svg',
      description:'Giving farmland a memory. Connecting weather, soil, crops, and field notes through a temporal knowledge graph.',
      tags:['Python','Cognee','FastAPI'],updated:'2026-10-03T18:09:05Z',
      detail:'An agricultural data and memory experiment built around a question: what if a field could remember? TerraMind connects multi-year farm information through Cognee’s graph-vector memory layer.',
      features:['Pipelines for crop, soil, weather, and field-note data.','A temporal graph for exploring relationships across growing seasons.','Analysis, prediction experiments, and a FastAPI / Next.js dashboard.'],
      boundary:'Hackathon prototype combining real datasets and synthetic demo scenarios. The portfolio makes no claim of validated agronomic causality or general model accuracy.',
      symbol:'✳'
    },
    {
      id:'synclee',name:'synclEE',repo:'synclEE',categories:['web'],category:'Chrome extension',stage:'Available for download',color:'#97e8c7',art:'assets/synclee.png',
      description:'Keep accepted coding solutions in your own GitHub repository as you solve problems.',
      tags:['JavaScript','Chrome','GitHub OAuth'],updated:'2026-11-25T04:59:19Z',
      detail:'Connect a repository, then submit solutions on LeetCode, CodeChef, HackerRank, or GeeksforGeeks. synclEE captures the submitted code and checks for an accepted verdict before syncing.',
      features:['Connect to GitHub with device authorization.','Group CodeChef solutions by rating when the problem exposes one.','Track synced commits by platform in the extension popup.'],
      boundary:'Install the unpacked extension in Chrome. Setup requires a device-flow-enabled GitHub OAuth client ID and write access to the destination repository.',
      demo:'https://arpitkjaiswal.github.io/synclEE/',symbol:'↻'
    },
    {
      id:'talentos',name:'TalentOS',repo:'Candidate-Ranking-System',categories:['ai','web'],category:'Candidate intelligence',stage:'Working prototype',color:'#ffae7b',art:'assets/talentos.svg',
      description:'Resume matching you can inspect. A hiring workspace that turns candidate documents into reviewable evidence.',
      tags:['React','FastAPI','scikit-learn'],updated:'2026-11-04T04:55:49Z',
      detail:'An explainable candidate workspace built from the Candidate-Ranking-System repository. Recruiters can organize roles, inspect matching evidence, compare candidates, and keep their review process in one place.',
      features:['Batch PDF, DOCX, and TXT resume uploads with per-file validation.','Versioned TF-IDF and skill-coverage ranking with excerpts, matching terms, and gaps.','Candidate stages, comparison, CSV export, and a transient Resume Lab.'],
      boundary:'Single-workspace prototype. Scores support human review; they are not an accuracy or fairness certification and do not replace hiring judgment.',
      symbol:'↗'
    },
    {
      id:'documentanalyser',name:'DocumentAnalyser',repo:'DocumentAnalyser',categories:['ai','web'],category:'Evidence-based research',stage:'Research demo',color:'#f59bc1',art:'assets/documents.svg',
      description:'Your documents, a clearer perspective. Ask questions, follow source passages, and keep the evidence close.',
      tags:['FastAPI','SQLite','JavaScript'],updated:'2026-11-03T23:38:04Z',
      detail:'A document research workspace that turns PDFs, Word files, and notes into answers you can trace back to their source. Local lexical retrieval works without a paid API or downloaded model.',
      features:['Upload, replace, scope, and search PDF, DOCX, TXT, or Markdown documents.','Extractive answers with source passages and PDF page references.','Optional generated answers with extractive fallback and Markdown session export.'],
      boundary:'Personal research demo with a shared server library and no user isolation. Retrieval relevance is not confidence; inspect the cited evidence.',
      symbol:'≡'
    },
    {
      id:'orbitwarden',name:'Orbit Warden',repo:'orbit-warden',categories:['play'],category:'Creative coding',stage:'Browser + desktop game',color:'#bca4f7',art:'assets/orbit-warden.svg',
      description:'A neon orbital-defense adventure. Waves, shields, bosses, and a little controlled cosmic chaos.',
      tags:['Canvas','JavaScript','Pygame'],updated:'2026-10-31T14:13:33Z',
      detail:'A procedurally drawn arcade defense game with browser and Python/Pygame editions. The browser campaign spans three sectors with upgradeable weapons and keyboard or touch controls.',
      features:['Wave-based enemies, boss encounters, shields, particles, and weapon upgrades.','Browser keyboard and touch controls with optional MediaPipe hand gestures.','A separate Pygame edition and local saved best scores in the browser.'],
      boundary:'The linked browser deployment is listed in the project README. Webcam controls are optional; no custom trained gesture weights are included.',
      demo:'https://orbit-warden-1.onrender.com',symbol:'✦'
    },
    {
      id:'concord',name:'Concord',repo:'Concord',categories:['web'],category:'Local workspace',stage:'Browser-local app',color:'#75dce5',compact:true,
      description:'A calm project and task workspace with boards, lists, filters, and browser-local persistence.',
      tags:['React','TypeScript','Vite'],updated:'2026-10-29T10:55:40Z',
      detail:'A focused workspace for organizing projects and turning tasks into finished work. Its current README describes a local, single-browser application, rather than a shared real-time editor.',
      features:['Create projects and tasks with status, priority, dates, descriptions, and assignee labels.','Drag tasks between board columns or switch to searchable list views.','Keep your workspace in browser local storage.'],
      boundary:'Data stays in one browser. There is no backend, authentication, multi-user collaboration, or cross-device sync.',symbol:'▤'
    },
    {
      id:'veildb',name:'veildb',repo:'veildb',categories:['systems'],category:'Database research',stage:'Experimental preview',color:'#bca4f7',compact:true,
      description:'Exploring field-level encryption for Python applications and PostgreSQL, with explicit query policies.',
      tags:['Python','SQLAlchemy','PostgreSQL'],updated:'2026-11-01T16:31:56Z',
      detail:'An experimental approach to protecting selected data before it reaches PostgreSQL. A manifest defines protected fields while ORM adapters connect that policy to admitted queries and writes.',
      features:['Manifest-driven field protection and authenticated encryption.','Explicit search-policy admission through SQLAlchemy, with an optional SQLModel adapter.','Key-provider adapters and lifecycle tooling for policy changes and key rotation.'],
      boundary:'Experimental research preview. Production security qualification is outstanding, and enabled searches reveal declared equality or ordering relationships.',symbol:'⌁'
    },
    {
      id:'devos',name:'DevOS',repo:'DevOS-AI-Software-Engineering-Agent',categories:['ai','systems'],category:'Engineering workbench',stage:'Read-only first release',color:'#d4ff63',compact:true,
      description:'Repository inventories, investigation plans, and human review in a local engineering workbench.',
      tags:['Python','SQLite','MCP'],updated:'2026-11-06T03:23:32Z',
      detail:'A local workbench for understanding repositories and preparing reviewable investigation plans. It combines deterministic inventory, durable run records, and a read-only MCP interface.',
      features:['Bounded repository inventory with traversal checks and conventional secret-file exclusions.','Durable runs, cancellation, review decisions, and Markdown plan exports.','Local analysis, an optional OpenAI adapter, and five read-only MCP tools.'],
      boundary:'This first release does not execute repository code, apply patches, or publish pull requests. It is a single-operator development product.',symbol:'⌗'
    }
  ]
});
