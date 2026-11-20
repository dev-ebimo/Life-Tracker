// SPIRITUAL.JS — habits come from C.habits (edit in Settings).
const main=$('#main');
function heat(id){
 const days=[...Array(28)].map((_,i)=>{const d=new Date(Date.now()-(27-i)*864e5);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`});
 let best=0,run=0,prev=null;Object.keys(D.habitLog).sort().forEach(d=>{if(!D.habitLog[d][id])return;run=prev&&Math.round((new Date(d)-new Date(prev))/864e5)===1?run+1:1;prev=d;best=Math.max(best,run)});
 best=Math.max(best,D.habits.streaks[id]||0);const tot=Object.values(D.habitLog).filter(l=>l[id]).length;
 return `<div style="display:flex;gap:2px;margin-top:6px">${days.map(d=>`<span title="${d}" style="width:9px;height:9px;border-radius:2px;background:${(D.habitLog[d]||{})[id]?'var(--success)':'var(--slate-border)'}"></span>`).join('')}</div><small style="color:var(--text-muted)">Best streak ${best} · ${tot} days logged · last 28 days</small>`}
function renderSpiritual(){
 const g=C.streakGoal;
 main.innerHTML=card('spiritual','spiritual','Spiritual Disciplines',`<div class="portfolio-group spiritual-group" style="border-left-color:var(--purple)"><h3>Daily Tracker & Milestone Rewards</h3>
 ${C.habits.length?C.habits.map(h=>{const n=D.habits.streaks[h.id]||0,w=n>0&&n%g===0?100:(n%g)/g*100;
  return `<div class="habit-item-container"><div class="habit-item"><label class="habit-label"><input type="checkbox" class="habit-checkbox" data-h="${h.id}" ${D.habits.done[h.id]?'checked':''}><span>${esc(h.name)}</span></label><div class="streak-badge">🔥 ${n}/${g} days</div></div><div class="reward-progress-bar"><div class="progress-fill" style="width:${w}%"></div></div>${heat(h.id)}</div>`}).join(''):'<p class="task-empty-msg">No habits yet — add some in Settings.</p>'}</div>
 <p style="font-size:.75rem;color:var(--text-muted);margin-top:10px">Every ${g}-day streak moves ${naira(C.reward,0)} from ${esc((C.pools.find(p=>p.id===C.rewardFrom)||{}).name||'—')} to ${esc((C.pools.find(p=>p.id===C.rewardTo)||{}).name||'—')}. Streaks advance at local midnight; an unchecked day resets the streak.</p>`);
}
main.addEventListener('change',e=>{const h=e.target.dataset.h; if(h){D.habits.done[h]=e.target.checked;(D.habitLog[todayISO()]??={})[h]=e.target.checked;save();renderSpiritual()}});
renderSpiritual(); window.refreshPageUI=renderSpiritual;
