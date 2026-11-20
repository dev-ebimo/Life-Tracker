// OVERVIEW.JS — all four pillars at a glance.
const cv=D.crypto.holdings.reduce((s,h)=>s+h.quantity*((D.crypto.priceCache[h.coinId]||{}).ngn||0),0);
const nw=C.pools.reduce((s,p)=>s+(p.debt?-1:1)*bal(p.id),0)+cv;
let q=0,u=0;for(let y=1;y<=C.years;y++)[1,2].forEach(s=>{const gp=parseFloat(D.grades[`y${y}s${s}-gp`]),un=parseFloat(D.grades[`y${y}s${s}-units`]);if(gp>=0&&un>0){q+=gp*un;u+=un}});
const cg=u?q/u:0,hon=[...C.honors].sort((a,b)=>b.min-a.min).find(h=>cg>=h.min)||{label:'—'};
const hDone=C.habits.filter(h=>D.habits.done[h.id]).length,topStreak=Math.max(0,...C.habits.map(h=>D.habits.streaks[h.id]||0));
const tDone=D.tasks.filter(t=>t.completed).length,mk=monthKey(),m=D.ledger.filter(x=>x.date.startsWith(mk));
const owed=C.pools.filter(p=>p.group==='Loans'&&p.debt).reduce((s,p)=>s+bal(p.id),0),saved=C.pools.filter(p=>p.group==='Loans'&&!p.debt).reduce((s,p)=>s+bal(p.id),0);
const over=D.tasks.filter(t=>!t.completed&&t.due&&t.due<todayISO()).length;
const stat=(l,v,s,h)=>`<a href="${h}" class="chart-card-box" style="text-decoration:none;color:inherit;display:block"><small style="color:var(--text-muted)">${l}</small><div style="font-size:1.6rem;font-weight:800;margin:6px 0">${v}</div><small>${s}</small></a>`;
$('#main').innerHTML=card('finance','overview','Today at a Glance',`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px">
${stat('NET WORTH',naira(nw,0),`${C.target?Math.round(nw/C.target*100):0}% of ${naira(C.target,0)} target`,'index.html')}
${stat('THIS MONTH',`<span class="ok">+${naira(m.filter(x=>x.amt>0).reduce((s,x)=>s+x.amt,0),0)}</span>`,`<span class="warn">−${naira(m.filter(x=>x.amt<0).reduce((s,x)=>s-x.amt,0),0)}</span> spent`,'index.html')}
${stat('LOAN PAYOFF',owed>0?Math.min(100,Math.round(saved/owed*100))+'%':'—',`${naira(saved,0)} of ${naira(owed,0)}`,'index.html')}
${stat('HABITS TODAY',`${hDone}/${C.habits.length}`,`Longest live streak: ${topStreak} days`,'spiritual.html')}
${stat('CGPA',cg.toFixed(2),esc(hon.label),'academics.html')}
${stat('TASKS TODAY',`${tDone}/${D.tasks.length}`,over?`<span class="warn">${over} overdue</span>`:'None overdue','personal.html')}</div>`);
window.refreshPageUI=()=>location.reload();
