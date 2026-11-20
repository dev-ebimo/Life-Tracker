// ACADEMICS.JS — years, scale, honors, quotes all from config; roadmap fully editable.
const main=$('#main');
const semIds=()=>[...Array(C.years)].flatMap((_,y)=>[1,2].map(s=>({id:`y${y+1}s${s}`,y:y+1,s})));
function cgpa(){let q=0,u=0;semIds().forEach(({id})=>{const gp=parseFloat(D.grades[id+'-gp']),un=parseFloat(D.grades[id+'-units']);if(!isNaN(gp)&&!isNaN(un)&&un>0){q+=gp*un;u+=un}});return u?q/u:0}
function showCGPA(){const c=cgpa(),h=[...C.honors].sort((a,b)=>b.min-a.min).find(h=>c>=h.min)||{label:'—',color:'inherit'};
 $('#cgpa-score-text').textContent=c.toFixed(2);const b=$('#honor-badge');b.textContent=h.label;b.style.color=h.color;calc()}
function calc(){
 let q=0,u=0;semIds().forEach(({id})=>{const gp=parseFloat(D.grades[id+'-gp']),un=parseFloat(D.grades[id+'-units']);if(!isNaN(gp)&&!isNaN(un)&&un>0){q+=gp*un;u+=un}});
 const t=parseFloat($('#calc-target').value),r=parseFloat($('#calc-units').value),o=$('#calc-out');
 if(!(t>0&&r>0)){o.textContent='Enter a target CGPA and your remaining units.';return}
 const need=(t*(u+r)-q)/r;
 o.innerHTML=need>C.scale?`<span class="warn">You would need ${need.toFixed(2)} GP — above the ${C.scale} scale, so ${t} is out of reach.</span>`:`You need an average GP of <b>${Math.max(0,need).toFixed(2)}</b> over your next ${r} units to reach ${t}.`}
function quote(){const q=C.quotes,el=$('#motivation-quote-text');if(!q.length){el.textContent='';return}let n;do n=q[Math.floor(Math.random()*q.length)];while(n===el.textContent&&q.length>1);el.textContent=n}
function render(){
 main.innerHTML=card('academics','academics','Academics & Tech Mastery',`
 <div class="motivation-banner"><span class="motivation-icon">&ldquo;</span><div class="motivation-quote-body"><p id="motivation-quote-text"></p></div><button class="motivation-refresh-btn" id="q-btn" title="Another quote">${svg('<path d="M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0014.5 3M19.5 9a8 8 0 00-14.5-6"/>')}</button></div>
 <div class="cgpa-master-display"><span class="cgpa-label">CURRENT EST. CGPA</span><h2 id="cgpa-score-text">0.00</h2><div class="class-honor-badge" id="honor-badge"></div></div>
 <div class="portfolio-group academics-group" style="border-left-color:var(--primary)"><h3>Semester Performance Ledger (0 - ${C.scale} Scale)</h3>
 ${[...Array(C.years)].map((_,y)=>`<div class="academic-year-box"><div class="year-title">YEAR ${y+1}</div>${[1,2].map(s=>{const id=`y${y+1}s${s}`;return `<div class="semester-row"><span>${s===1?'1st':'2nd'} Sem:</span><input type="number" class="acad-input" id="${id}-gp" placeholder="GP" min="0" max="${C.scale}" step="0.1" value="${esc(D.grades[id+'-gp'])}"><input type="number" class="acad-input" id="${id}-units" placeholder="Units" min="0" value="${esc(D.grades[id+'-units'])}"></div>`}).join('')}</div>`).join('')}</div>
 <div class="portfolio-group" style="border-left-color:var(--success);margin-top:20px"><h3>What GP do I need?</h3><div class="input-row"><input type="number" id="calc-target" step="0.01" placeholder="Target CGPA" value="${C.honors[0]?C.honors[0].min:''}"><input type="number" id="calc-units" placeholder="Units remaining"></div><p id="calc-out" style="font-size:.85rem;margin-top:8px"></p></div>
 <div class="portfolio-group roadmap-group" style="border-left-color:var(--warning);margin-top:20px"><h3>CS Engineering Skill Roadmap</h3><div id="roadmap-list"></div>
 <div class="input-row" style="margin-top:14px"><input type="text" id="roadmap-new-goal" placeholder="Add a new goal..."><button id="roadmap-add-btn" style="background-color:var(--warning)">Add Goal</button></div></div>`);
 $('#q-btn').onclick=quote;
 main.querySelectorAll('.acad-input').forEach(i=>i.oninput=()=>{D.grades[i.id]=i.value;save();showCGPA()});
 ['#calc-target','#calc-units'].forEach(s=>$(s).oninput=calc);$('#roadmap-add-btn').onclick=addGoal;$('#roadmap-new-goal').onkeydown=e=>{if(e.key==='Enter')addGoal()};
 quote();showCGPA();roadmap();
}
function roadmap(){
 const R=D.roadmap,mv=(i,j)=>{[R[i],R[j]]=[R[j],R[i]];save();roadmap()};
 $('#roadmap-list').innerHTML=R.map((g,i)=>`<div class="roadmap-item${g.done?' done':''}"><div class="road-left"><input type="checkbox" class="road-check" data-i="${i}" ${g.done?'checked':''}><span>${i+1}. ${esc(g.text)}</span></div>
 <div class="roadmap-controls"><button data-a="up" data-i="${i}" ${i?'':'disabled'}>↑</button><button data-a="dn" data-i="${i}" ${i<R.length-1?'':'disabled'}>↓</button><button data-a="ed" data-i="${i}" title="Rename">✎</button><button class="road-remove-btn" data-a="rm" data-i="${i}">✕</button></div></div>`).join('');
 $('#roadmap-list').onclick=e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i,a=b.dataset.a;
  if(a==='up')mv(i,i-1);else if(a==='dn')mv(i,i+1);else if(a==='rm'){R.splice(i,1);save();roadmap()}else if(a==='ed')editText(R[i].text,v=>{R[i].text=v;save();roadmap()})};
 $('#roadmap-list').onchange=e=>{if(e.target.classList.contains('road-check')){R[+e.target.dataset.i].done=e.target.checked;save();roadmap()}};
}
function addGoal(){const i=$('#roadmap-new-goal'),t=i.value.trim();if(!t)return alert('Enter a goal description.');D.roadmap.push({id:uid('r-'),text:t,done:false});i.value='';save();roadmap()}
render();
