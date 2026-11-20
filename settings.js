// SETTINGS.JS — edit every rule, label and number; backup / restore the whole app.
const main=$('#main');
const inp=(p,v,t='s',x='')=>`<input data-p="${p}" data-t="${t}" ${t==='n'?'type="number" step="any"':''} value="${esc(v??'')}" ${x}>`;
const ck=(p,v)=>`<input type="checkbox" data-p="${p}" ${v?'checked':''}>`;
const sel=(p,v)=>`<select data-p="${p}">${C.pools.map(o=>`<option value="${o.id}" ${o.id===v?'selected':''}>${esc(o.name)}</option>`).join('')}</select>`;
const sec=(t,b)=>`<div class="portfolio-group" style="margin-bottom:18px"><h3>${t}</h3>${b}</div>`;
function render(){
 main.innerHTML=card('finance','settings','Settings & Data',
 sec('General',`<div class="set-grid">
  <label>Yearly net-worth target (₦)${inp('target',C.target,'n')}</label><label>Loan interest per month (%)${inp('loanRate',+(C.loanRate*100).toFixed(4),'n','data-sc="0.01"')}</label>
  <label>Streak goal (days)${inp('streakGoal',C.streakGoal,'n')}</label><label>Streak reward (₦)${inp('reward',C.reward,'n')}</label>
  <label>Reward paid from${sel('rewardFrom',C.rewardFrom)}</label><label>Reward paid to${sel('rewardTo',C.rewardTo)}</label>
  <label>Academic years${inp('years',C.years,'n')}</label><label>Grade scale (max GP)${inp('scale',C.scale,'n')}</label></div>`)
 +sec(`Finance pools — allocation total: <span id="pct-total"></span>`,`<div class="set-wrap"><table class="set-table"><tr><th>Name</th><th>Group</th><th>Sub-group</th><th>%</th><th>Min bal ₦</th><th>Target ₦</th><th>Monthly cap ₦</th><th>Lock until</th><th>Debt</th><th>Accrues</th><th>Loan on spend</th><th></th></tr>
  ${C.pools.map((p,i)=>`<tr><td>${inp(`pools.${i}.name`,p.name)}</td><td>${inp(`pools.${i}.group`,p.group)}</td><td>${inp(`pools.${i}.sub`,p.sub)}</td><td>${inp(`pools.${i}.pct`,p.pct,'n')}</td><td>${inp(`pools.${i}.minBal`,p.minBal,'n')}</td><td>${inp(`pools.${i}.target`,p.target,'n')}</td><td>${inp(`pools.${i}.cap`,p.cap,'n')}</td><td><input type="date" data-p="pools.${i}.lockUntil" data-t="s" value="${p.lockUntil||''}"></td><td>${ck(`pools.${i}.debt`,p.debt)}</td><td>${ck(`pools.${i}.accrue`,p.accrue)}</td><td>${ck(`pools.${i}.loan`,p.loan)}</td><td><button class="set-btn" data-a="delPool" data-i="${i}">✕</button></td></tr>`).join('')}</table></div>
  <button class="set-btn" data-a="addPool">+ Add pool</button><p class="hint" style="font-size:.75rem;color:var(--text-muted)">Use group "Loans" to show a pool in the Loans card. "Distribute via % rules" only works when the % column totals 100.</p>`)
 +sec('Habits',`${C.habits.map((h,i)=>`<div class="input-row" style="margin-bottom:6px">${inp(`habits.${i}.name`,h.name)}<button class="set-btn" data-a="delHabit" data-i="${i}">✕</button></div>`).join('')}<button class="set-btn" data-a="addHabit">+ Add habit</button>`)
 +sec('Honor classes (highest first)',`${C.honors.map((h,i)=>`<div class="input-row" style="margin-bottom:6px">${inp(`honors.${i}.min`,h.min,'n','style="max-width:90px"')}${inp(`honors.${i}.label`,h.label)}<input type="color" data-p="honors.${i}.color" data-t="s" value="${h.color}" style="max-width:60px"><button class="set-btn" data-a="delHonor" data-i="${i}">✕</button></div>`).join('')}<button class="set-btn" data-a="addHonor">+ Add class</button>`)
 +sec('Motivation quotes (one per line)',`<div class="set-grid" style="grid-template-columns:1fr"><textarea data-q rows="6">${esc(C.quotes.join('\n'))}</textarea></div>`)
 +sec('Data',`<button class="set-btn" data-a="export">⬇ Export backup</button><button class="set-btn" data-a="import">⬆ Import backup</button><input type="file" id="imp" accept=".json" hidden><button class="set-btn" data-a="day">⏩ Simulate next day</button><button class="set-btn" data-a="reset" style="color:#f87171">Reset everything</button><p class="hint" style="font-size:.75rem;color:var(--text-muted)">All data lives in this browser only — export a backup regularly.</p>`));
 total();
}
const total=()=>{const t=pctTotal(),el=$('#pct-total');el.textContent=t+'%';el.className=Math.abs(t-100)<.001?'ok':'warn'};
function setPath(o,path,v){const k=path.split('.');while(k.length>1)o=o[k.shift()];o[k[0]]=v}
main.addEventListener('change',e=>{const t=e.target;
 if(t.dataset.q!==undefined){C.quotes=t.value.split('\n').map(s=>s.trim()).filter(Boolean);return save()}
 const p=t.dataset.p;if(!p)return;
 let v=t.type==='checkbox'?t.checked:t.dataset.t==='n'?(t.value===''?undefined:parseFloat(t.value)):t.value;
 if(t.dataset.sc)v*=+t.dataset.sc; if(t.dataset.t==='n'&&v!==undefined&&isNaN(v))return;
 setPath(C,p,v);save();total()});
main.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const i=+b.dataset.i;
 const A={addPool:()=>C.pools.push({id:uid('p-'),name:'New pool',group:'Savings',sub:'',pct:0}),
  delPool:()=>{if(!confirm(`Delete "${C.pools[i].name}"? Its ${naira(bal(C.pools[i].id))} balance is dropped.`))return;delete D.balances[C.pools[i].id];C.pools.splice(i,1)},
  addHabit:()=>C.habits.push({id:uid('h-'),name:'New habit'}),delHabit:()=>C.habits.splice(i,1),
  addHonor:()=>C.honors.push({min:0,label:'New class',color:'#94a3b8'}),delHonor:()=>C.honors.splice(i,1)};
 if(A[b.dataset.a]){A[b.dataset.a]();save();return render()}
 switch(b.dataset.a){
  case'export':{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.download=`life-tracker-${todayISO()}.json`;a.click();D.lastBackup=Date.now();save();break}
  case'import':$('#imp').click();break;
  case'day':rollover(true);alert('Simulated one day: streaks, task history and interest updated.');break;
  case'reset':if(confirm('Erase ALL data and settings in this browser?')){localStorage.removeItem(KEY);location.reload()}}});
main.addEventListener('change',e=>{if(e.target.id!=='imp')return;const f=e.target.files[0];if(!f)return;
 f.text().then(t=>{const j=JSON.parse(t);if(j.v!==2||!j.cfg||!j.data)throw 0;localStorage.setItem(KEY,t);location.reload()}).catch(()=>alert('That file is not a valid Life Tracker backup.'))});
render();
