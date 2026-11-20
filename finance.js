// FINANCE.JS — everything is rendered from C.pools; add/rename/re-weight pools in Settings.
const CRYPTO_PANEL=`<div class="crypto-panel">
                            <div class="crypto-panel-header">
                                <span class="crypto-panel-title"><span class="dot"></span>Crypto Holdings</span>
                                <div class="crypto-refresh-row">
                                    <span class="crypto-updated-text" id="crypto-updated-text">Not fetched yet</span>
                                    <button type="button" id="crypto-refresh-btn" class="crypto-refresh-btn" title="Refresh live prices">
                                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 10-2.6 6.36M21 12V6m0 6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                    </button>
                                </div>
                            </div>

                            <div class="crypto-total-row">
                                <span class="crypto-total-label">Portfolio Value</span>
                                <span>
                                    <span class="crypto-total-value" id="crypto-total-value">₦0.00</span><span class="crypto-total-pl" id="crypto-total-pl"></span>
                                </span>
                            </div>

                            <div class="crypto-holdings-list" id="crypto-holdings-list">
                                <div class="crypto-empty-msg">No coins added yet — add a holding below to start tracking.</div>
                            </div>

                            <p class="crypto-fetch-error" id="crypto-fetch-error">Couldn't reach the live price feed. Showing the last known prices — check your connection and hit refresh.</p>

                            <div class="crypto-add-form">
                                <div class="crypto-mode-toggle">
                                    <button type="button" class="crypto-mode-btn active" data-mode="search">Search Coin</button>
                                    <button type="button" class="crypto-mode-btn" data-mode="contract">Contract Address</button>
                                </div>

                                <div class="crypto-mode-panel" id="crypto-mode-search">
                                    <div class="crypto-search-wrap">
                                        <input type="text" id="crypto-search-input" placeholder="Search any coin by name or symbol…" autocomplete="off">
                                        <div class="crypto-search-results" id="crypto-search-results"></div>
                                    </div>
                                    <div class="crypto-selected-chip" id="crypto-selected-chip"></div>
                                </div>

                                <div class="crypto-mode-panel" id="crypto-mode-contract" style="display:none;">
                                    <div class="crypto-add-row row-1">
                                        <select id="crypto-platform-select">
                                            <option value="ethereum">Ethereum</option>
                                            <option value="binance-smart-chain">BNB Smart Chain</option>
                                            <option value="polygon-pos">Polygon</option>
                                            <option value="arbitrum-one">Arbitrum</option>
                                            <option value="optimistic-ethereum">Optimism</option>
                                            <option value="base">Base</option>
                                            <option value="avalanche">Avalanche</option>
                                            <option value="solana">Solana</option>
                                        </select>
                                        <input type="text" id="crypto-contract-input" placeholder="Paste token contract address">
                                    </div>
                                    <button type="button" id="crypto-resolve-btn" class="crypto-add-btn" style="width:100%;">Look Up Token</button>
                                    <div class="crypto-selected-chip" id="crypto-contract-chip"></div>
                                </div>

                                <div class="crypto-add-row">
                                    <input type="number" id="crypto-qty-input" placeholder="Quantity held" min="0" step="any">
                                    <input type="number" id="crypto-avgcost-input" placeholder="Avg buy price (USD, optional)" min="0" step="any">
                                    <button type="button" id="crypto-add-btn" class="crypto-add-btn" disabled>Add Holding</button>
                                </div>
                            </div>
                        </div>`;
const netWorth=()=>C.pools.reduce((s,p)=>s+(p.debt?-1:1)*bal(p.id),0)+cryptoTotalValueNGN;
const poolByName=t=>C.pools.find(p=>p.name===t);

$('#main').innerHTML=card('finance','finance','Financial Engine',`
<div class="finance-top-grid"><div class="finance-analytics-col"><div class="charts-grid-row" style="display:flex;gap:15px">
 <div class="chart-card-box" style="display:flex;flex-direction:column;align-items:center;gap:15px"><h4>Capital Allocation <small style="display:block;color:var(--text-muted);font-weight:normal">Share of assets</small></h4>
  <div style="position:relative;width:140px;height:140px"><div id="finance-pie-chart" class="css-pie-chart" style="width:140px;height:140px;border-radius:50%;transition:background .4s ease">
   <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:94px;height:94px;background:#1e293b;border-radius:50%;display:flex;align-items:center;justify-content:center"><span id="finance-pie-text" style="font-size:.7rem;text-align:center;line-height:1.2;font-weight:700;color:#fff"></span></div></div></div>
  <div id="finance-pie-legend" style="width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;font-size:.65rem;font-family:monospace;max-height:90px;overflow-y:auto"></div></div>
 <div class="chart-card-box" style="flex:2"><h4>Net Worth Trend <span id="finance-trend-badge" class="trend-badge">— 0%</span> <small style="display:block;color:var(--text-muted);font-weight:normal">Scaled to <span id="target-lbl"></span> yearly target · <span id="finance-graph-year"></span></small></h4>
  <div class="svg-graph-wrapper" style="margin-top:15px;padding:10px 5px;background:rgba(0,0,0,.2);border-radius:8px;border:1px solid var(--slate-border)"><svg viewBox="0 0 500 150" style="width:100%;height:auto;overflow:visible">
   <line x1="40" y1="120" x2="490" y2="120" stroke="rgba(255,255,255,.09)"/><g id="graph-y-grid"></g>
   <path id="graph-trend-line" d="" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><g id="graph-data-nodes"></g>
   <g id="graph-x-labels" style="font-size:8px;fill:var(--text-muted);font-family:monospace"></g><g id="graph-y-labels" style="font-size:8px;fill:var(--text-muted);font-family:monospace"></g></svg></div></div>
</div></div>
<div class="finance-form-col"><div class="finance-control-panel">
 <div class="control-box"><label>Log Income / Inflow:</label><div class="input-row" style="margin-bottom:10px"><input type="number" id="total-funds" placeholder="Amount (NGN)" min="0"><button id="calculate-finance-btn">Distribute via % Rules</button></div>
  <label>Or deposit directly to a portfolio:</label><div class="input-row"><input type="text" id="direct-target" list="portfolio-list" placeholder="Type to search portfolio"><button id="direct-deposit-btn" style="background-color:var(--purple);color:#fff">Direct Deposit</button></div></div>
 <div class="control-box"><input type="text" id="tx-note" placeholder="Note for this transaction (optional)" style="width:100%;margin-bottom:8px"><label>Log Expense / Deduction:</label><div class="input-row"><input type="text" id="deduct-portfolio" list="portfolio-list" placeholder="Type to search portfolio"><input type="number" id="deduct-amount" placeholder="Amount" min="0"><button id="deduct-btn" style="background-color:var(--danger);color:#fff">Deduct</button></div></div>
</div></div></div>
<datalist id="portfolio-list"></datalist><p id="debt-line" style="font-size:.8rem;color:#e74c3c"></p><div id="pools"></div>
<div class="portfolio-group" style="border-left-color:var(--purple)">${CRYPTO_PANEL}</div>`)
+card('loans','loans','Loans & Liabilities',`
<div class="daily-progress-container"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px"><span style="font-weight:700">LOAN REPAYMENT PROGRESS</span><span id="repayment-progress-text" style="font-family:monospace;font-weight:700;color:var(--primary)">0%</span></div>
 <div class="reward-progress-bar" style="height:8px"><div id="repayment-progress-fill" class="progress-fill" style="background:linear-gradient(90deg,var(--primary),var(--success))"></div></div><p id="repayment-progress-sub" style="font-size:.75rem;color:var(--text-muted);margin-top:6px"></p></div>
<button type="button" class="see-more-btn" data-target="loans-details" data-more="See More ▾" style="margin-top:14px">See More ▾</button>
<div class="portfolio-details" id="loans-details" hidden><div class="portfolio-group loans-group" style="margin-top:16px"><h3>Active Ledgers</h3><div id="loan-items"></div></div><div id="loan-notes"></div></div>`)
+card('finance','finance','Transaction Ledger',`<div id="ledger-sum"></div><div id="ledger-list"></div><button class="set-btn" id="undo-btn">↩ Undo last entry</button>`);

const note=d=>{const el=$('#tx-note'),v=el.value.trim();setTimeout(()=>el.value='');return v||d};
const monthSpend=id=>D.ledger.filter(x=>x.pool===id&&x.amt<0&&x.date.startsWith(monthKey())).reduce((s,x)=>s-x.amt,0);
const itemHTML=p=>{const b=bal(p.id),t=+p.target,cp=+p.cap,sp=cp?monthSpend(p.id):0;
 return `<div class="allocation-item${p.sub?'':' submaster'}" style="flex-wrap:wrap"><span>${esc(p.name)}${p.pct?` <small>(${p.pct}%)</small>`:''}${p.debt?' <small>(owed)</small>':''}:</span> <strong class="pool-val" data-pool="${p.id}" title="Click to correct this balance">${naira(b)}</strong>
 ${t?`<div class="reward-progress-bar" style="flex-basis:100%;height:5px"><div class="progress-fill" style="width:${Math.min(100,b/t*100)}%"></div></div><small style="flex-basis:100%;color:var(--text-muted)">${Math.round(b/t*100)}% of ${naira(t,0)} target</small>`:''}
 ${cp?`<small class="${sp>=cp*.8?'warn':''}" style="flex-basis:100%">Spent ${naira(sp,0)} of ${naira(cp,0)} this month${sp>=cp?' — cap reached':sp>=cp*.8?' — nearing cap':''}</small>`:''}</div>`};
const sumOf=a=>naira(a.reduce((s,p)=>s+bal(p.id),0)), pcOf=a=>Math.round(a.reduce((s,p)=>s+(+p.pct||0),0)*100)/100;

function renderPools(){
 const open=new Set([...document.querySelectorAll('#pools .portfolio-details:not([hidden])')].map(e=>e.id));
 const groups=[...new Set(C.pools.filter(p=>p.group!=='Loans').map(p=>p.group))];
 $('#pools').innerHTML=groups.map((g,i)=>{
  const ps=C.pools.filter(p=>p.group===g),id='grp-'+i,o=open.has(id),subs=[...new Set(ps.filter(p=>p.sub).map(p=>p.sub))];
  return `<div class="portfolio-group ${i%2?'wants-group':'savings-group'}"><h3>${esc(g)} (${pcOf(ps)}%) <span class="portfolio-sum-badge">${sumOf(ps)}</span></h3>
  <button type="button" class="see-more-btn" data-target="${id}" aria-expanded="${o}">${o?'See Less ▴':'See Full Breakdown ▾'}</button>
  <div class="portfolio-details" id="${id}" ${o?'':'hidden'}>${ps.filter(p=>!p.sub).map(itemHTML).join('')}
  ${subs.map(s=>{const sp=ps.filter(p=>p.sub===s);return `<div class="sub-cluster"><h4>${esc(s)} (${pcOf(sp)}%) <span class="portfolio-sum-badge">${sumOf(sp)}</span></h4>${sp.map(itemHTML).join('')}</div>`}).join('')}</div></div>`}).join('');
}
function renderLoans(){
 const L=C.pools.filter(p=>p.group==='Loans'),owed=L.filter(p=>p.debt).reduce((s,p)=>s+bal(p.id),0),saved=L.filter(p=>!p.debt).reduce((s,p)=>s+bal(p.id),0);
 const pct=owed>0?Math.min(100,Math.round(saved/owed*100)):0;
 $('#repayment-progress-text').textContent=pct+'%'; $('#repayment-progress-fill').style.width=pct+'%';
 $('#repayment-progress-sub').textContent=`${naira(saved,0)} saved toward ${naira(owed,0)} owed.`;
 $('#loan-items').innerHTML=L.map(itemHTML).join('');
 const today=todayISO(),locks=C.pools.filter(p=>p.lockUntil&&p.lockUntil>today),acc=C.pools.filter(p=>p.accrue);
 $('#loan-notes').innerHTML=locks.map(p=>`<div class="sub-cluster" style="border-left-color:#e74c3c"><p style="font-size:.85rem;color:#e67e22;font-weight:bold">🔒 ${esc(p.name)} locked until ${esc(p.lockUntil)}.</p></div>`).join('')
 +(acc.length?`<div class="sub-cluster" style="border-left-color:var(--warning);margin-top:14px"><h4>Accruing Balance Notice</h4><p style="font-size:.8rem;color:var(--text-muted);line-height:1.5">${acc.map(p=>esc(p.name)).join(', ')} compound${acc.length>1?'':'s'} at ${+(C.loanRate*100).toFixed(2)}% per month while unpaid. Interest is applied once for every month that passes.</p></div>`:'')+projHTML(saved,owed);
}
function renderPie(){
 const assets=C.pools.filter(p=>!p.debt&&bal(p.id)>0).map(p=>({n:p.name,v:bal(p.id)}));
 if(cryptoTotalValueNGN>0)assets.push({n:'Crypto',v:cryptoTotalValueNGN});
 const tot=assets.reduce((s,a)=>s+a.v,0),pie=$('#finance-pie-chart'),leg=$('#finance-pie-legend');
 leg.innerHTML=''; $('#finance-pie-text').innerHTML=`<span style="font-size:.55rem;color:var(--text-muted)">NET WORTH</span><br><span style="font-size:.8rem">${naira(netWorth(),0)}</span>`;
 if(tot<=0){pie.style.background='conic-gradient(var(--slate-border) 0deg 360deg)';return}
 let deg=0;const stops=assets.map((a,i)=>{const c=`hsl(${Math.round(i*137.5)%360} 65% 55%)`,s=deg;deg+=a.v/tot*360;
  leg.insertAdjacentHTML('beforeend',`<div style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;background:${c};border-radius:2px;flex-shrink:0"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.n)}: <b>${Math.round(a.v/tot*100)}%</b></span></div>`);
  return `${c} ${s.toFixed(1)}deg ${deg.toFixed(1)}deg`});
 pie.style.background=`conic-gradient(${stops.join(',')})`;
}
const nairaCompact=v=>{v=Math.round(v);return v===0?'₦0':v>=1e6?`₦${+(v/1e6).toFixed(1)}M`:v>=1e3?`₦${Math.round(v/1e3)}K`:`₦${v}`};
function renderTrend(){
 ensureYear(D.history,{amount:0}); D.history.log[new Date().getMonth()].amount=Math.round(netWorth());
 $('#target-lbl').textContent=naira(C.target,0);
 renderTrendLine({line:'graph-trend-line',nodes:'graph-data-nodes',labels:'graph-x-labels',yLabels:'graph-y-labels',yGrid:'graph-y-grid',tooltip:d=>`${d.month}: ${naira(d.amount,0)}`},
  D.history.log,d=>Math.max(0,d.amount),'finance-trend-badge','finance-graph-year',D.history.year,
  {fixedScale:C.target,formatY:nairaCompact,yStepBase:Math.max(1000,10**(Math.floor(Math.log10(C.target||1e6))-1)),maxTicks:6});
}
function renderFinanceUI(){
 $('#portfolio-list').innerHTML=C.pools.map(p=>`<option value="${esc(p.name)}"></option>`).join('');
 $('#debt-line').textContent=[D.trustDebt>0&&`[Trust Debt: ${naira(D.trustDebt)}]`,D.rewardDebt>0&&`[Pending Reward Deduction: ${naira(D.rewardDebt)}]`].filter(Boolean).join(' ');
 renderPools();renderLoans();renderLedger();renderPie();renderTrend();save();
}
const updatePortfolioGroupTotals=renderFinanceUI; // crypto.js calls this after prices refresh

// ---- transactions ----
function directDeposit(){
 const p=poolByName($('#direct-target').value),v=parseFloat($('#total-funds').value);
 if(!p)return alert('Invalid portfolio target.'); if(!(v>0))return alert('Enter a positive number.');
 addBal(p.id,v);logTx(p.id,v,note('Direct deposit'));$('#total-funds').value='';$('#direct-target').value='';renderFinanceUI();
}
function inflow(){
 let v=parseFloat($('#total-funds').value); if(!(v>0))return alert('Enter a valid income.');const bt=uid('b'),nt=note('Inflow');
 const t=pctTotal(); if(Math.abs(t-100)>0.001)return alert(`Your allocation rules add up to ${t}%, not 100%. Fix them in Settings first.`);
 if(D.rewardDebt>0){alert(`Deferred reward: ${naira(D.rewardDebt)} will be deducted.`);const c=Math.min(v,D.rewardDebt);v-=c;D.rewardDebt-=c}
 const trust=C.pools.find(p=>p.loan);
 if(D.trustDebt>0&&v>0&&trust){alert(`Trust Debt of ${naira(D.trustDebt)} will be cleared first.`);const c=Math.min(v,D.trustDebt);v-=c;D.trustDebt-=c;addBal(trust.id,c);logTx(trust.id,c,'Trust debt repaid',bt)}
 if(v>0)C.pools.forEach(p=>{if(p.pct){addBal(p.id,v*p.pct/100);logTx(p.id,v*p.pct/100,nt,bt)}});
 $('#total-funds').value='';renderFinanceUI();
}
function deduct(){
 const p=poolByName($('#deduct-portfolio').value),v=parseFloat($('#deduct-amount').value);
 if(!p)return alert('Invalid portfolio target.'); if(!(v>0))return alert('Enter a valid amount.');
 if(p.lockUntil&&p.lockUntil>todayISO())return alert(`${p.name} is locked until ${p.lockUntil}.`);
 if(v>bal(p.id))return alert('Insufficient reserves.');
 if(p.minBal&&bal(p.id)<p.minBal)return alert(`${p.name} needs at least ${naira(p.minBal,0)} before you can spend from it.`);
 if(p.cap&&monthSpend(p.id)+v>p.cap&&!confirm(`This puts ${p.name} over its ${naira(p.cap,0)} monthly cap. Continue?`))return;
 if(p.loan){if(!confirm(`Confirm ${naira(v)} withdrawal from ${p.name}? It becomes debt to repay from your next inflow.`))return;D.trustDebt+=v}
 addBal(p.id,-v);logTx(p.id,-v,note('Expense'));$('#deduct-amount').value='';$('#deduct-portfolio').value='';renderFinanceUI();
}
$('#calculate-finance-btn').onclick=inflow;$('#direct-deposit-btn').onclick=directDeposit;$('#deduct-btn').onclick=deduct;
$('#main').addEventListener('click',e=>{ // click any balance to correct it
 const el=e.target.closest('.pool-val'); if(!el)return;
 const v=prompt('Set balance to (₦):',bal(el.dataset.pool)); if(v===null)return;
 const n=parseFloat(v); if(isNaN(n))return alert('Enter a number.'); logTx(el.dataset.pool,n-bal(el.dataset.pool),'Balance correction');D.balances[el.dataset.pool]=n;renderFinanceUI()});
renderFinanceUI();
window.refreshPageUI=renderFinanceUI;

function renderLedger(){
 const mk=monthKey(),m=D.ledger.filter(x=>x.date.startsWith(mk)),i=m.filter(x=>x.amt>0).reduce((s,x)=>s+x.amt,0),o=m.filter(x=>x.amt<0).reduce((s,x)=>s-x.amt,0);
 $('#ledger-sum').innerHTML=`<p style="font-size:.85rem">This month: <b class="ok">+${naira(i,0)}</b> in · <b class="warn">−${naira(o,0)}</b> out</p>`;
 $('#ledger-list').innerHTML=D.ledger.slice(0,15).map(x=>{const p=C.pools.find(q=>q.id===x.pool);return `<div class="allocation-item"><span>${x.date} · ${esc(p?p.name:'(deleted pool)')} · <small>${esc(x.note)}</small></span><strong class="${x.amt<0?'warn':'ok'}">${x.amt<0?'−':'+'}${naira(Math.abs(x.amt))}</strong></div>`}).join('')||'<div class="task-empty-msg">No transactions yet.</div>';
}
$('#undo-btn').onclick=()=>{const f=D.ledger[0];if(!f)return;
 const g=f.batch?D.ledger.filter(x=>x.batch===f.batch):[f];
 if(!confirm(`Undo ${g.length} entr${g.length>1?'ies':'y'}? Balances are reversed; trust/reward debt counters are not restored.`))return;
 g.forEach(x=>addBal(x.pool,-x.amt));D.ledger=D.ledger.filter(x=>!g.includes(x));renderFinanceUI()};
function projHTML(saved,owed){
 if(owed<=0)return '';
 const L=C.pools.filter(p=>p.group==='Loans'&&!p.debt).map(p=>p.id),cut=new Date(Date.now()-90*864e5).toISOString().slice(0,10);
 const pace=D.ledger.filter(x=>L.includes(x.pool)&&x.amt>0&&x.date>=cut).reduce((s,x)=>s+x.amt,0)/3,grow=C.pools.some(p=>p.accrue)?C.loanRate:0;
 let o=owed,s=saved,t=0;while(s<o&&t<600){o*=1+grow;s+=pace;t++}
 const msg=s>=o?`Estimate: at ${naira(pace,0)}/month saved (last 90 days) the loan clears in about ${Math.floor(t/12)}y ${t%12}m.`:pace<=0?'No repayments logged in the last 90 days, so no payoff date can be projected.':'At your current pace the debt grows faster than you repay it — increase monthly repayments.';
 return `<div class="sub-cluster" style="border-left-color:var(--primary);margin-top:14px"><h4>Payoff Projection</h4><p style="font-size:.8rem;color:var(--text-muted)">${msg}</p></div>`;
}
renderFinanceUI();
