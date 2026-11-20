// ==========================================
// COMMON.JS
// Shared across every page: core state, localStorage persistence, the
// date-driven rollover engine, and the sidebar / hamburger / view-toggle
// chrome that appears on all four sections. Load this before any
// page-specific script (finance.js / spiritual.js / academics.js / personal.js).
// ==========================================

// ------------------------------------------
// 1. CORE APPLICATION STATE & STORAGE HYDRATION
// ------------------------------------------
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const emptyMonthLog = (fields) => MONTH_NAMES.map(m => ({ month: m, ...fields }));

let balances = {
    'f-future': 0, 'f-trust': 0, 'f-retirement': 0,
    'f-housing': 0, 'f-clothing': 0, 'f-immediate': 0,
    'f-em-funds': 0, 'f-school': 0, 'f-business': 0, 'f-tech': 0, 'f-cum-earnings': 0,
    'f-ess-food': 0, 'f-uness-food': 0, 'f-seen-cos': 0,
    'f-unseen-cos': 0, 'f-subs': 0, 'f-donation': 0, 'f-luxury': 0, 'f-repairs': 0,
    'l-nelfund': 0, 'l-domestic': 0, 'l-repayment': 0
};

// Net worth history: resets yearly, one snapshot per calendar month, refreshed live.
let financialHistoryState = {
    year: new Date().getFullYear(),
    log: emptyMonthLog({ amount: 0 }),
    lastMonthKey: monthKey()
};

let trustDebt = 0;
let pendingRewardDebt = 0;

let spiritualState = {
    streaks: { 'prayer': 0, 'study': 0, 'journal': 0 },
    completedToday: { 'prayer': false, 'study': false, 'journal': false },
    lastDate: null // ISO date of the last day we processed a rollover for
};

let academicState = {
    grades: {
        'y1s1-gp': '', 'y1s1-units': '', 'y1s2-gp': '', 'y1s2-units': '',
        'y2s1-gp': '', 'y2s1-units': '', 'y2s2-gp': '', 'y2s2-units': '',
        'y3s1-gp': '', 'y3s1-units': '', 'y3s2-gp': '', 'y3s2-units': '',
        'y4s1-gp': '', 'y4s1-units': '', 'y4s2-gp': '', 'y4s2-units': ''
    },
    // Array of { id, text, done } — ordered by priority, user can add/reorder/remove.
    roadmap: [
        { id: 'r-1', text: 'Get First Class in BSc Computer Science', done: true },
        { id: 'r-2', text: 'Master Web Development', done: false },
        { id: 'r-3', text: 'Master C++', done: false },
        { id: 'r-4', text: 'Master JAVA', done: false },
        { id: 'r-5', text: 'Master Python', done: false },
        { id: 'r-6', text: 'Penetration Testing', done: false }
    ]
};

let personalState = {
    tasks: [], // { id, text, completed }
    monthlyLog: {
        year: new Date().getFullYear(),
        log: emptyMonthLog({ completed: 0, total: 0 })
    },
    lastDate: null // ISO date of the last day we rolled today's tasks into the monthly log
};

let loansState = {
    monthlyGrowthRate: 0.02, // NELFUND capital compounds 2% per month while unpaid
    lastAccrualMonth: monthKey()
};

// Crypto holdings tracked as { id, coinId, symbol, name, quantity, avgBuyPriceUSD }.
// Live prices are fetched client-side from CoinGecko's public API and cached in priceCache
// so the portfolio still renders (with a "stale price" notice) if the user is offline.
let cryptoState = {
    holdings: [],
    priceCache: {}, // coinId -> { ngn, usd, usd_24h_change }
    lastUpdated: null // ISO timestamp of the last successful fetch
};

// Safe Deep Storage Hydration Engine
const hydrateState = (key, fallback) => {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    try {
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' ? { ...fallback, ...parsed } : fallback;
    } catch (e) { console.error(`Error parsing ${key}`, e); return fallback; }
};

balances = hydrateState('dashboard_balances', balances);
financialHistoryState = hydrateState('dashboard_finance_history', financialHistoryState);
spiritualState = hydrateState('dashboard_spiritual', spiritualState);
academicState = hydrateState('dashboard_academics', academicState);
personalState = hydrateState('dashboard_personal', personalState);
loansState = hydrateState('dashboard_loans', loansState);
cryptoState = hydrateState('dashboard_crypto', cryptoState);
if (!Array.isArray(cryptoState.holdings)) cryptoState.holdings = [];
if (!cryptoState.priceCache || typeof cryptoState.priceCache !== 'object') cryptoState.priceCache = {};

// --- Migrations from older data shapes ---
if (!Array.isArray(academicState.roadmap)) {
    const oldMap = academicState.roadmap || {};
    academicState.roadmap = [
        { id: 'r-1', text: 'Get First Class in BSc Computer Science', done: true },
        { id: 'r-2', text: 'Master Web Development', done: !!oldMap['road-web'] },
        { id: 'r-3', text: 'Master C++', done: !!oldMap['road-cpp'] },
        { id: 'r-4', text: 'Master JAVA', done: !!oldMap['road-java'] },
        { id: 'r-5', text: 'Master Python', done: !!oldMap['road-python'] },
        { id: 'r-6', text: 'Penetration Testing', done: false }
    ];
}
if (!Array.isArray(personalState.tasks)) personalState.tasks = [];
if (!personalState.monthlyLog || !Array.isArray(personalState.monthlyLog.log)) {
    personalState.monthlyLog = { year: new Date().getFullYear(), log: emptyMonthLog({ completed: 0, total: 0 }) };
}
if (!financialHistoryState.log || !Array.isArray(financialHistoryState.log)) {
    financialHistoryState.log = emptyMonthLog({ amount: 0 });
    financialHistoryState.year = new Date().getFullYear();
    financialHistoryState.lastMonthKey = monthKey();
}

trustDebt = parseFloat(localStorage.getItem('dashboard_trustDebt')) || 0;
pendingRewardDebt = parseFloat(localStorage.getItem('dashboard_rewardDebt')) || 0;

// ------------------------------------------
// 2. MASTER CENTRALIZED STORAGE ENGINE
// ------------------------------------------
function saveStateToStorage() {
    localStorage.setItem('dashboard_balances', JSON.stringify(balances));
    localStorage.setItem('dashboard_trustDebt', trustDebt.toString());
    localStorage.setItem('dashboard_rewardDebt', pendingRewardDebt.toString());
    localStorage.setItem('dashboard_finance_history', JSON.stringify(financialHistoryState));
    localStorage.setItem('dashboard_spiritual', JSON.stringify(spiritualState));
    localStorage.setItem('dashboard_academics', JSON.stringify(academicState));
    localStorage.setItem('dashboard_personal', JSON.stringify(personalState));
    localStorage.setItem('dashboard_loans', JSON.stringify(loansState));
    localStorage.setItem('dashboard_crypto', JSON.stringify(cryptoState));
}

// ------------------------------------------
// 3. SHARED HELPERS (used by more than one section's page script)
// ------------------------------------------
function ensureMonthlyLogYear(logState) {
    const currentYear = new Date().getFullYear();
    if (logState.year !== currentYear) {
        logState.year = currentYear;
        logState.log = emptyMonthLog({ completed: 0, total: 0 });
    }
}

// Generic SVG line-chart renderer shared by the Finance net-worth trend and the
// Personal task-completion trend graphs.
function renderTrendLine(svgIds, monthLog, valueFn, badgeId, yearLabelId, year, options = {}) {
    const trendLine = document.getElementById(svgIds.line);
    const nodesGroup = document.getElementById(svgIds.nodes);
    const xLabelsGroup = document.getElementById(svgIds.labels);
    if (!trendLine || !nodesGroup || !xLabelsGroup) return;

    nodesGroup.innerHTML = ""; xLabelsGroup.innerHTML = "";

    const values = monthLog.map(valueFn);
    // A fixedScale locks the chart's ceiling to a target value (e.g. a ₦1,000,000 goal)
    // instead of auto-scaling to whatever the data happens to reach — so the chart always
    // reads as "progress toward the goal" rather than a moving target.
    const maxAmount = options.fixedScale ? options.fixedScale : Math.max(...values, 1);
    let pathCoordinatesString = "";
    let firstActiveIdx = -1, lastActiveIdx = -1;

    monthLog.forEach((data, index) => {
        const xPos = 40 + (index * (450 / 11));
        const val = valueFn(data);
        // Clamp so a value that blows past a fixed scale still renders near the top
        // of the chart (visibly breaking out) instead of flying off-canvas.
        const rawY = 120 - ((val / maxAmount) * 110);
        const yPos = Math.max(rawY, -25);
        pathCoordinatesString += `${index === 0 ? 'M' : 'L'} ${xPos} ${yPos}`;

        if (val > 0 || (data.total !== undefined && data.total > 0)) {
            if (firstActiveIdx === -1) firstActiveIdx = index;
            lastActiveIdx = index;
            const circleNode = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circleNode.setAttribute("cx", xPos); circleNode.setAttribute("cy", yPos); circleNode.setAttribute("r", "4");
            circleNode.setAttribute("fill", "#fff"); circleNode.setAttribute("stroke-width", "2");
            const elementTooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
            elementTooltip.textContent = svgIds.tooltip(data);
            circleNode.appendChild(elementTooltip);
            nodesGroup.appendChild(circleNode);
        }

        const axisTextLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        axisTextLabel.setAttribute("x", xPos); axisTextLabel.setAttribute("y", 135);
        axisTextLabel.setAttribute("text-anchor", "middle"); axisTextLabel.textContent = data.month;
        xLabelsGroup.appendChild(axisTextLabel);
    });
    trendLine.setAttribute("d", pathCoordinatesString);

    // Optional left-hand y-axis scale labels.
    // By default this draws 3 labels (0 / midpoint / ceiling of maxAmount). When
    // options.yStepBase is set (e.g. 5000 for the finance graph), gridlines are instead
    // spaced at a clean multiple of that step — the smallest multiple of yStepBase that
    // keeps the total number of gridlines at or under options.maxTicks, so the axis always
    // reads in round ₦5,000-based increments instead of arbitrary fractions.
    if (svgIds.yLabels) {
        const yLabelsGroup = document.getElementById(svgIds.yLabels);
        const yGridGroup = svgIds.yGrid ? document.getElementById(svgIds.yGrid) : null;
        if (yLabelsGroup) {
            yLabelsGroup.innerHTML = "";
            if (yGridGroup) yGridGroup.innerHTML = "";

            let tickValues;
            if (options.yStepBase) {
                const maxTicks = options.maxTicks || 6;
                let step = options.yStepBase;
                while ((maxAmount / step) > maxTicks) step += options.yStepBase;
                tickValues = [];
                for (let v = 0; v < maxAmount; v += step) tickValues.push(v);
                tickValues.push(maxAmount); // always cap the axis at the true ceiling
            } else {
                tickValues = [0, maxAmount * 0.5, maxAmount];
            }

            tickValues.forEach(val => {
                const frac = maxAmount > 0 ? (val / maxAmount) : 0;
                const yPos = 120 - (frac * 110);

                if (yGridGroup && val !== 0) {
                    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    gridLine.setAttribute("x1", 40); gridLine.setAttribute("x2", 490);
                    gridLine.setAttribute("y1", yPos); gridLine.setAttribute("y2", yPos);
                    gridLine.setAttribute("stroke", "rgba(255,255,255,0.05)");
                    gridLine.setAttribute("stroke-dasharray", "4");
                    yGridGroup.appendChild(gridLine);
                }

                const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                labelText.setAttribute("x", 34);
                labelText.setAttribute("y", yPos + 3);
                labelText.setAttribute("text-anchor", "end");
                labelText.textContent = options.formatY ? options.formatY(val) : val;
                yLabelsGroup.appendChild(labelText);
            });
        }
    }

    // Determine progress vs decline for the badge + line color.
    const badge = document.getElementById(badgeId);
    const yearLabel = document.getElementById(yearLabelId);
    if (yearLabel) yearLabel.textContent = year;

    if (badge) {
        if (firstActiveIdx === -1 || firstActiveIdx === lastActiveIdx) {
            badge.textContent = '— 0%';
            badge.className = 'trend-badge';
            trendLine.setAttribute('stroke', 'var(--primary)');
        } else {
            const startVal = valueFn(monthLog[firstActiveIdx]) || 0.0001;
            const endVal = valueFn(monthLog[lastActiveIdx]);
            const pctChange = ((endVal - startVal) / startVal) * 100;
            const arrow = pctChange >= 0 ? '▲' : '▼';
            badge.textContent = `${arrow} ${Math.abs(pctChange).toFixed(1)}%`;
            badge.className = `trend-badge ${pctChange >= 0 ? 'up' : 'down'}`;
            trendLine.setAttribute('stroke', pctChange >= 0 ? 'var(--success)' : 'var(--danger)');
        }
    }
}

// ------------------------------------------
// 4. UNIFIED TIME-BASED ROLLOVER ENGINE
// ------------------------------------------
// These mutate shared state only (no DOM access), so they're safe to run on
// every page regardless of which section's markup is actually present.
const HABITS = ['prayer', 'study', 'journal'];

function applyMilestoneRewards(milestonesCrossed) {
    if (milestonesCrossed <= 0) return;
    for (let i = 0; i < milestonesCrossed; i++) {
        if (balances['f-em-funds'] >= 2500) {
            balances['f-em-funds'] -= 2500; balances['f-luxury'] += 2500;
            alert(`🎉 Milestone Crossed! ₦2,500 transferred to Luxury.`);
        } else {
            balances['f-luxury'] += 2500; pendingRewardDebt += 2500;
            alert(`🎉 Milestone Crossed! Reward added to Luxury. ₦2,500 debt queued against next inflow.`);
        }
    }
}

// Advances spiritual streaks based on how many real days have passed since lastDate.
// - Exactly 1 day passed & habit was completed -> streak grows (and milestone check runs).
// - Any gap where the habit wasn't completed on that day (or >1 day passed silently) -> streak resets to 0.
function processSpiritualRollover(daysPassed) {
    let milestonesCrossed = 0;
    HABITS.forEach(habit => {
        const wasCompleted = spiritualState.completedToday[habit];
        if (daysPassed === 1 && wasCompleted) {
            spiritualState.streaks[habit] += 1;
            if (spiritualState.streaks[habit] % 30 === 0) milestonesCrossed += 1;
        } else {
            // Missed the day entirely, or more than a day passed silently — streak breaks.
            spiritualState.streaks[habit] = 0;
        }
        spiritualState.completedToday[habit] = false;
    });
    applyMilestoneRewards(milestonesCrossed);
}

// Rolls today's completed/total task counts into the current month's bucket, then clears checkmarks.
function processPersonalRollover() {
    const total = personalState.tasks.length;
    const completed = personalState.tasks.filter(t => t.completed).length;

    ensureMonthlyLogYear(personalState.monthlyLog);
    const monthIdx = new Date().getMonth();
    personalState.monthlyLog.log[monthIdx].completed += completed;
    personalState.monthlyLog.log[monthIdx].total += total;

    personalState.tasks.forEach(t => t.completed = false);
}

// Applies one month of interest growth to the NELFUND balance.
function accrueLoanInterest() {
    if (balances['l-nelfund'] > 0) {
        balances['l-nelfund'] = balances['l-nelfund'] * (1 + loansState.monthlyGrowthRate);
    }
}

// Runs once on load (and can be forced for testing) to advance day-based and month-based
// state to match the real calendar: spiritual streaks, personal task history, and loan interest.
// Page-specific scripts are responsible for re-rendering their own UI afterwards —
// see window.refreshPageUI below.
function runTimeBasedRollover(forceOneDay = false) {
    const today = todayISO();
    const referenceDate = spiritualState.lastDate || personalState.lastDate;

    let daysPassed = 0;
    if (forceOneDay) {
        daysPassed = 1;
    } else if (referenceDate) {
        daysPassed = Math.round((new Date(today) - new Date(referenceDate)) / 86400000);
    }

    if (daysPassed > 0 || !referenceDate) {
        if (referenceDate) {
            processSpiritualRollover(daysPassed);
            processPersonalRollover();
        }
        spiritualState.lastDate = today;
        personalState.lastDate = today;
    }

    // Monthly interest accrual — independent of the daily streak logic.
    const currentMonth = monthKey();
    if (loansState.lastAccrualMonth !== currentMonth) {
        // Accrue once for each calendar month that has fully elapsed since we last checked.
        accrueLoanInterest();
        loansState.lastAccrualMonth = currentMonth;
    }

    saveStateToStorage();
}

// Run once immediately so state is current before the page-specific script renders.
runTimeBasedRollover(false);

// Re-checks for a real day change periodically while the app stays open (e.g. left open
// overnight). Only the currently-open page's own UI needs refreshing — each page script
// assigns window.refreshPageUI to its own re-render routine.
setInterval(() => {
    const today = todayISO();
    if (spiritualState.lastDate && spiritualState.lastDate !== today) {
        runTimeBasedRollover(false);
        if (typeof window.refreshPageUI === 'function') window.refreshPageUI();
    }
}, 60000);

// ------------------------------------------
// 5. VIEW TOGGLE (Short-Term / Long-Term) — lives in the shared header
// ------------------------------------------
const toggleShortBtn = document.getElementById('toggle-short');
const toggleLongBtn = document.getElementById('toggle-long');

function setView(view) {
    document.body.setAttribute('data-view', view);
    toggleShortBtn.classList.toggle('active', view === 'short');
    toggleLongBtn.classList.toggle('active', view === 'long');
    localStorage.setItem('dashboard_view', view);
}
if (toggleShortBtn && toggleLongBtn) {
    toggleShortBtn.addEventListener('click', () => setView('short'));
    toggleLongBtn.addEventListener('click', () => setView('long'));
    setView(localStorage.getItem('dashboard_view') === 'long' ? 'long' : 'short');
}

// ------------------------------------------
// 6. SIDEBAR NAVIGATION + MOBILE HAMBURGER DRAWER
// ------------------------------------------
const hamburgerBtn = document.getElementById('hamburger-btn');
const sidebarEl = document.getElementById('sidebar');
const sidebarOverlayEl = document.getElementById('sidebar-overlay');

function openSidebar() {
    sidebarEl.classList.add('open');
    sidebarOverlayEl.classList.add('visible');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
    sidebarEl.classList.remove('open');
    sidebarOverlayEl.classList.remove('visible');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
}
if (hamburgerBtn && sidebarEl && sidebarOverlayEl) {
    hamburgerBtn.addEventListener('click', () => {
        sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    sidebarOverlayEl.addEventListener('click', closeSidebar);
}

// Highlight whichever nav link matches the current page (set via <body data-page="...">).
const currentPage = document.body.getAttribute('data-page');
document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-nav') === currentPage) link.classList.add('active');
});

// ------------------------------------------
// 7. GENERIC "SEE MORE" / "SEE LESS" TOGGLES
// ------------------------------------------
// Any button with class="see-more-btn" and data-target="<id-of-panel>" instantly
// reveals/hides that panel — no animation delay. Reused across portfolio groups.
document.querySelectorAll('.see-more-btn').forEach(btn => {
    const targetId = btn.getAttribute('data-target');
    const targetPanel = document.getElementById(targetId);
    if (!targetPanel) return;

    const collapsedLabel = btn.textContent.trim() || 'See More ▾';
    const expandedLabel = 'See Less ▴';

    btn.addEventListener('click', () => {
        const isHidden = targetPanel.hasAttribute('hidden');
        if (isHidden) {
            targetPanel.removeAttribute('hidden');
            btn.textContent = expandedLabel;
            btn.setAttribute('aria-expanded', 'true');
        } else {
            targetPanel.setAttribute('hidden', '');
            btn.textContent = collapsedLabel;
            btn.setAttribute('aria-expanded', 'false');
        }
    });
});
