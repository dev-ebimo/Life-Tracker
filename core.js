// CORE.JS — one versioned state object, migration, rollover engine, shared shell.
const KEY='lifetracker_v2', MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const $=s=>document.querySelector(s), pad=n=>String(n).padStart(2,'0');
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}; // local time, not UTC
const monthKey=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const emptyLog=f=>MONTHS.map(m=>({month:m,...f}));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const naira=(n,d=2)=>'₦'+Number(n).toLocaleString('en-NG',{minimumFractionDigits:d,maximumFractionDigits:d});
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const QUOTES=[
    "Discipline is choosing between what you want now and what you want most.",
    "Small steps every day still add up to a first-class result.",
    "You don't have to be great to start, but you have to start to be great.",
    "Every hour you put in today is a grade you don't have to beg for tomorrow.",
    "Consistency beats intensity — show up for the boring days too.",
    "The CGPA is just a number; the habits that built it are the real win.",
    "Hard days are the tuition you pay for an easier future.",
    "Focus on progress, not perfection — one semester at a time.",
    "Your future self is watching you right now through your memories.",
    "Skills stack quietly until, one day, they carry you.",
    "Nobody drowns from falling in water; they drown from staying there. Keep moving.",
    "Push yourself, because no one else is going to do it for you.",
    "The expert in anything was once a beginner who refused to quit.",
    "Study now so you don't have to explain later why you didn't.",
    "Great things take time — trust the process and put in the reps.",
    "A little progress each day adds up to big results.",
    "You are capable of more than you know — prove it one goal at a time.",
    "Don't wait for motivation; build the discipline and motivation will follow."
];

// ---- defaults (every pool, habit, honor, number below is editable in Settings) ----
const POOLS=[
['f-future','Future Use','Savings','',7],['f-trust','Trust Account','Savings','',4,{loan:1}],['f-retirement','Retirement','Savings','',3],
['f-housing','Housing','Savings','Needs',5],['f-clothing','Clothing','Savings','Needs',5,{minBal:10000}],
['f-immediate','Immediate Emergency','Savings','Emergency',12],['f-em-funds','Emergency Funds','Savings','Emergency',5],['f-school','School Expenses','Savings','Emergency',5],
['f-business','Business Capital','Savings','Investment',4],['f-tech','Tech Tools','Savings','Investment',3],['f-cum-earnings','Cumulative Earnings','Savings','Investment',0],
['f-ess-food','Essential Food','Wants','Food',34],['f-uness-food','Unessential Food','Wants','Food',1],
['f-seen-cos','Seen Cosmetics','Wants','Cosmetics',2],['f-unseen-cos','Unseen Cosmetics','Wants','Cosmetics',8],
['f-subs','Subscriptions','Wants','Others',5],['f-donation','Donation','Wants','Others',1],['f-luxury','Luxury Purchases','Wants','Others',1],
['f-repairs','Repairs','Wants','',2],
['l-nelfund','NELFUND Capital','Loans','',0,{debt:1,accrue:1,lockUntil:'2030-01-01'}],['l-domestic','Domestic Loan','Loans','',0,{debt:1}],['l-repayment','Loan Repayment Pool','Loans','',0]
].map(([id,name,group,sub,pct,x])=>({id,name,group,sub,pct,...x}));
const defaultCfg=()=>({pools:POOLS.map(p=>({...p})),target:1e6,loanRate:.02,
 habits:[{id:'prayer',name:'Daily Devotion & Prayer'},{id:'study',name:'Scripture Study & Meditation'},{id:'journal',name:'Spiritual Journaling & Reflection'}],
 streakGoal:30,reward:2500,rewardFrom:'f-em-funds',rewardTo:'f-luxury',years:4,scale:5,
 honors:[{min:4.5,label:'First Class Honors 🏆',color:'#34d399'},{min:3.5,label:'Second Class Upper (2:1) 🥈',color:'#60a5fa'},{min:2.4,label:'Second Class Lower (2:2)',color:'#fbbf24'},{min:0,label:'Third Class / Pass',color:'#f87171'}],
 quotes:QUOTES.slice()});
const defaultData=()=>({balances:{},trustDebt:0,rewardDebt:0,ledger:[],habitLog:{},lastBackup:null,lastDate:null,
 history:{year:new Date().getFullYear(),log:emptyLog({amount:0})},
 habits:{streaks:{},done:{}},grades:{},
 roadmap:['Get First Class in BSc Computer Science','Master Web Development','Master C++','Master JAVA','Master Python','Penetration Testing'].map((text,i)=>({id:'r-'+(i+1),text,done:i===0})),
 tasks:[],taskLog:{year:new Date().getFullYear(),log:emptyLog({completed:0,total:0})},
 loans:{lastAccrualMonth:monthKey()},crypto:{holdings:[],priceCache:{},lastUpdated:null}});

// Reads the 9 old 'dashboard_*' keys once; leaves them untouched as a backup.
function migrate(){
 const g=k=>{try{return JSON.parse(localStorage.getItem('dashboard_'+k))}catch(e){return null}};
 const d=defaultData(),s={v:2,cfg:defaultCfg(),data:d};
 const b=g('balances'); if(b)d.balances=b;
 d.trustDebt=parseFloat(localStorage.getItem('dashboard_trustDebt'))||0;
 d.rewardDebt=parseFloat(localStorage.getItem('dashboard_rewardDebt'))||0;
 const h=g('finance_history'); if(h&&Array.isArray(h.log))d.history={year:h.year,log:h.log};
 const sp=g('spiritual'); if(sp)d.habits={streaks:sp.streaks||{},done:sp.completedToday||{}};
 const a=g('academics'); if(a){d.grades=a.grades||{}; if(Array.isArray(a.roadmap))d.roadmap=a.roadmap;}
 const p=g('personal'); if(p){d.tasks=p.tasks||[]; if(p.monthlyLog&&Array.isArray(p.monthlyLog.log))d.taskLog=p.monthlyLog;}
 d.lastDate=(sp&&sp.lastDate)||(p&&p.lastDate)||null;
 const l=g('loans'); if(l){d.loans.lastAccrualMonth=l.lastAccrualMonth||d.loans.lastAccrualMonth; if(l.monthlyGrowthRate)s.cfg.loanRate=l.monthlyGrowthRate;}
 const c=g('crypto'); if(c)d.crypto={...d.crypto,...c};
 return s;
}
function load(){
 let s=null; try{s=JSON.parse(localStorage.getItem(KEY))}catch(e){console.error(e)}
 if(!s||s.v!==2)s=migrate();
 s.cfg={...defaultCfg(),...s.cfg}; s.data={...defaultData(),...s.data};
 return s;
}
const S=load(), D=S.data, C=S.cfg;
if(!Array.isArray(D.crypto.holdings))D.crypto.holdings=[];
if(!D.crypto.priceCache)D.crypto.priceCache={};
const cryptoState=D.crypto; let cryptoTotalValueNGN=0;
const save=()=>localStorage.setItem(KEY,JSON.stringify(S)), saveStateToStorage=save;
const bal=id=>D.balances[id]||0, addBal=(id,n)=>{D.balances[id]=bal(id)+n};
const ensureYear=(o,f)=>{const y=new Date().getFullYear(); if(o.year!==y){o.year=y;o.log=emptyLog(f)}};
const pctTotal=()=>Math.round(C.pools.reduce((s,p)=>s+(+p.pct||0),0)*100)/100;
const logTx=(pool,amt,note,batch)=>{D.ledger.unshift({id:uid('x'),date:todayISO(),pool,amt:Math.round(amt*100)/100,note,batch});if(D.ledger.length>5000)D.ledger.pop()};
const editText=(cur,cb)=>{const v=prompt('Edit:',cur); if(v!==null&&v.trim())cb(v.trim())};

// ---- rollover: streaks, task history, loan interest (local-date based) ----
function reward(n){
 for(let i=0;i<n;i++){const r=C.reward,from=bal(C.rewardFrom);
  if(from>=r){addBal(C.rewardFrom,-r);addBal(C.rewardTo,r);alert(`🎉 Milestone! ${naira(r)} moved to your reward pool.`)}
  else{addBal(C.rewardTo,r);D.rewardDebt+=r;alert(`🎉 Milestone! Reward added; ${naira(r)} debt queued against your next inflow.`)}}
}
function rollover(force=false){
 const today=todayISO(),last=D.lastDate;
 const days=force?1:last?Math.round((new Date(today)-new Date(last))/864e5):0;
 if(days>0){
  let crossed=0;
  C.habits.forEach(h=>{const st=D.habits.streaks;
   if(days===1&&D.habits.done[h.id]){st[h.id]=(st[h.id]||0)+1; if(st[h.id]%C.streakGoal===0)crossed++}else st[h.id]=0;
   D.habits.done[h.id]=false});
  ensureYear(D.taskLog,{completed:0,total:0});
  const m=D.taskLog.log[new Date().getMonth()];
  m.completed+=D.tasks.filter(t=>t.completed).length; m.total+=D.tasks.length;
  D.tasks=D.tasks.filter(t=>!(t.once&&t.completed));D.tasks.forEach(t=>t.completed=false);
  reward(crossed);
 }
 if(days>0||!last)D.lastDate=today;
 const[ly,lm]=D.loans.lastAccrualMonth.split('-').map(Number),now=new Date();
 const months=(now.getFullYear()-ly)*12+(now.getMonth()+1-lm); // one accrual per elapsed month
 for(let i=0;i<months;i++)C.pools.filter(p=>p.accrue).forEach(p=>addBal(p.id,bal(p.id)*C.loanRate));
 if(months!==0)D.loans.lastAccrualMonth=monthKey();
 save();
}
rollover();
setInterval(()=>{if(D.lastDate!==todayISO()){rollover();window.refreshPageUI&&window.refreshPageUI()}},60000);

// ---- shared shell (sidebar + header injected on every page) ----
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</g></svg>`;
const ICON={
 finance:svg('<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>'),
 spiritual:svg('<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/>'),
 academics:svg('<path d="M12 3L2 8l10 5 10-5-10-5z"/><path d="M6 10.5V16c0 1 2.5 3 6 3s6-2 6-3v-5.5"/>'),
 personal:svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 14l2 2 4-4"/>'),
 loans:svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M7 3.5l5 3.5 5-3.5"/>'),
 overview:svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
 settings:svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>')};
const card=(cls,icon,title,body)=>`<section class="card ${cls}"><h2><span class="card-icon-badge">${ICON[icon]}</span>${title}</h2><div class="card-content">${body}</div></section>`;
(function shell(){
 const page=document.body.dataset.page,main=$('#main'),title=document.body.dataset.title;
 const nav=[['overview.html','overview','Overview'],['index.html','finance','Finance'],['spiritual.html','spiritual','Spiritual'],['academics.html','academics','Academics'],['personal.html','personal','Personal'],['settings.html','settings','Settings']];
 document.body.insertAdjacentHTML('afterbegin',`<div class="app-shell"><div class="sidebar-overlay" id="sidebar-overlay"></div>
 <aside class="sidebar" id="sidebar"><div class="sidebar-brand"><div class="brand-mark">${svg('<path d="M4 18V10M12 18V4M20 18V13"/>').replace('currentColor','white')}</div><div class="sidebar-brand-text"><h1>Life Tracker</h1><span>Finance · Faith · Academics · Life</span></div></div>
 <nav class="sidebar-nav">${nav.map(([h,k,l])=>`<a href="${h}" class="nav-link${k===page?' active':''}"><span class="nav-icon">${ICON[k]}</span>${l}</a>`).join('')}</nav></aside>
 <div class="main-content"><header><div style="display:flex;align-items:center"><button id="hamburger-btn" class="hamburger-btn" aria-label="Menu" aria-expanded="false">${svg('<path d="M4 6h16M4 12h16M4 18h16"/>')}</button><div class="brand"><div><h1>${title}</h1><span class="brand-sub">Life Tracker</span></div></div></div></header></div></div>`);
 main.className='dashboard-grid'; $('.main-content').appendChild(main);
 const sb=$('#sidebar'),ov=$('#sidebar-overlay'),hb=$('#hamburger-btn'),set=o=>{sb.classList.toggle('open',o);ov.classList.toggle('visible',o);hb.setAttribute('aria-expanded',o)};
 hb.onclick=()=>set(!sb.classList.contains('open')); ov.onclick=()=>set(false);
 document.addEventListener('click',e=>{ // generic "See more" toggle
  const b=e.target.closest('.see-more-btn'); if(!b)return;
  const t=document.getElementById(b.dataset.target),hide=!t.hasAttribute('hidden');
  t.toggleAttribute('hidden',hide); b.textContent=hide?(b.dataset.more||'See Full Breakdown ▾'):'See Less ▴'; b.setAttribute('aria-expanded',!hide)});
})();

(()=>{ // offline install (PWA) + backup reminder
 if(location.protocol.startsWith('http')&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
 const has=D.ledger.length||Object.keys(D.balances).length,stale=!D.lastBackup||Date.now()-D.lastBackup>14*864e5;
 if(has&&stale)$('.main-content header').insertAdjacentHTML('afterend','<p class="warn" style="padding:8px 20px;font-size:.8rem">⚠ No backup in 14+ days — Settings → Export backup.</p>');
})();
