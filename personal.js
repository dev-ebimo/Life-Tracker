// PERSONAL.JS — today's tasks (add / edit / remove) + yearly completion trend.
const main=$('#main');
main.innerHTML=card('personal','personal',"Personal Schedule & Analytics",`
<div class="daily-progress-container" style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px"><span style="font-weight:700">TODAY'S SCHEDULE COMPLETION</span><span id="daily-progress-text" style="font-family:monospace;font-weight:700;color:var(--success)">0%</span></div>
<div class="reward-progress-bar" style="height:8px"><div id="daily-progress-fill" class="progress-fill" style="background:linear-gradient(90deg,var(--success),#10b981)"></div></div></div>
<div class="portfolio-group personal-group" style="border-left-color:var(--success)"><h3>Today's Tasks</h3><div id="task-list"></div>
<div class="input-row" style="margin-top:10px"><input type="text" id="new-task-input" placeholder="Add a task..."><input type="date" id="new-task-due" style="max-width:150px" title="Due date (optional)"><label style="font-size:.75rem;white-space:nowrap"><input type="checkbox" id="new-task-once"> one-off</label><button id="add-task-btn">Add Task</button></div></div>
<div class="chart-card-box" style="margin-top:20px"><h4>Task Completion Trend <span id="personal-trend-badge" class="trend-badge">— 0%</span> <small style="display:block;color:var(--text-muted);font-weight:normal">Yearly Completed / Created Ratio · <span id="personal-graph-year"></span></small></h4>
<div class="svg-graph-wrapper" style="margin-top:15px;padding:10px 5px;background:rgba(0,0,0,.2);border-radius:8px;border:1px solid var(--slate-border)"><svg viewBox="0 0 500 150" style="width:100%;height:auto;overflow:visible">
<line x1="40" y1="10" x2="490" y2="10" stroke="rgba(255,255,255,.03)" stroke-dasharray="4"/><line x1="40" y1="65" x2="490" y2="65" stroke="rgba(255,255,255,.03)" stroke-dasharray="4"/><line x1="40" y1="120" x2="490" y2="120" stroke="rgba(255,255,255,.07)"/>
<path id="personal-trend-line" d="" fill="none" stroke="var(--success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><g id="personal-data-nodes"></g><g id="personal-x-labels" style="font-size:8px;fill:var(--text-muted);font-family:monospace"></g></svg></div></div>`);
function render(){
 const T=D.tasks,done=T.filter(t=>t.completed).length,pct=T.length?Math.round(done/T.length*100):0;
 $('#daily-progress-text').textContent=pct+'%';$('#daily-progress-fill').style.width=pct+'%';
 $('#task-list').innerHTML=T.length?T.map((t,i)=>`<div class="task-row${t.completed?' completed':''}"><input type="checkbox" class="task-checkbox" data-i="${i}" ${t.completed?'checked':''}><span class="task-text" data-i="${i}">${esc(t.text)}${t.once?' <small>(one-off)</small>':''}${t.due?` <small class="${!t.completed&&t.due<todayISO()?'warn':''}">· due ${t.due}</small>`:''}</span><button class="edit-btn" data-a="ed" data-i="${i}" title="Rename">✎</button><button class="task-remove-btn" data-a="rm" data-i="${i}" title="Remove">✕</button></div>`).join(''):'<div class="task-empty-msg">No tasks yet — add one below to start tracking today.</div>';
 ensureYear(D.taskLog,{completed:0,total:0});
 renderTrendLine({line:'personal-trend-line',nodes:'personal-data-nodes',labels:'personal-x-labels',tooltip:d=>`${d.month}: ${d.completed}/${d.total} tasks`},D.taskLog.log,d=>d.total>0?Math.round(d.completed/d.total*100):0,'personal-trend-badge','personal-graph-year',D.taskLog.year);
}
$('#task-list').onclick=e=>{const el=e.target.closest('[data-i]');if(!el)return;const i=+el.dataset.i,t=D.tasks[i];
 if(el.dataset.a==='rm')D.tasks.splice(i,1);else if(el.dataset.a==='ed')return editText(t.text,v=>{t.text=v;save();render()});else if(el.classList.contains('task-text'))t.completed=!t.completed;else return;
 save();render()};
$('#task-list').onchange=e=>{if(e.target.classList.contains('task-checkbox')){D.tasks[+e.target.dataset.i].completed=e.target.checked;save();render()}};
function addTask(){const i=$('#new-task-input'),t=i.value.trim();if(!t)return alert('Enter a task description.');D.tasks.push({id:uid('t-'),text:t,completed:false,once:$('#new-task-once').checked,due:$('#new-task-due').value||null});i.value='';$('#new-task-due').value='';$('#new-task-once').checked=false;save();render()}
$('#add-task-btn').onclick=addTask;$('#new-task-input').onkeydown=e=>{if(e.key==='Enter')addTask()};
render();window.refreshPageUI=render;
