// CRYPTO.JS — live CoinGecko holdings (unchanged logic; loads after finance.js).
const cryptoQtyInput = document.getElementById('crypto-qty-input');
const cryptoAvgCostInput = document.getElementById('crypto-avgcost-input');
const cryptoAddBtn = document.getElementById('crypto-add-btn');
const cryptoRefreshBtn = document.getElementById('crypto-refresh-btn');
const cryptoHoldingsListEl = document.getElementById('crypto-holdings-list');
const cryptoTotalValueEl = document.getElementById('crypto-total-value');
const cryptoTotalPlEl = document.getElementById('crypto-total-pl');
const cryptoUpdatedTextEl = document.getElementById('crypto-updated-text');
const cryptoFetchErrorEl = document.getElementById('crypto-fetch-error');

const cryptoModeButtons = document.querySelectorAll('.crypto-mode-btn');
const cryptoModeSearchPanel = document.getElementById('crypto-mode-search');
const cryptoModeContractPanel = document.getElementById('crypto-mode-contract');
const cryptoSearchInput = document.getElementById('crypto-search-input');
const cryptoSearchResultsEl = document.getElementById('crypto-search-results');
const cryptoSelectedChipEl = document.getElementById('crypto-selected-chip');
const cryptoPlatformSelect = document.getElementById('crypto-platform-select');
const cryptoContractInput = document.getElementById('crypto-contract-input');
const cryptoResolveBtn = document.getElementById('crypto-resolve-btn');
const cryptoContractChipEl = document.getElementById('crypto-contract-chip');

// Holds the coin the user has picked (via search or a resolved contract address) but
// hasn't confirmed with quantity/cost yet. Cleared whenever the mode switches or a
// holding is added.
let pendingCoinSelection = null; // { coinId, symbol, name, contractAddress?, platform? }

function clearPendingSelection() {
    pendingCoinSelection = null;
    cryptoSelectedChipEl.style.display = 'none';
    cryptoSelectedChipEl.innerHTML = '';
    cryptoContractChipEl.style.display = 'none';
    cryptoContractChipEl.innerHTML = '';
    cryptoAddBtn.disabled = true;
}

function setPendingSelection(selection, chipEl) {
    pendingCoinSelection = selection;
    chipEl.style.display = 'flex';
    chipEl.innerHTML = `<span class="chip-text">${selection.name} <span class="chip-symbol">${selection.symbol}</span>${selection.platform ? `<span class="chip-via">via contract · ${selection.platform}</span>` : ''}</span>`;
    const xBtn = document.createElement('button');
    xBtn.type = 'button';
    xBtn.className = 'chip-remove';
    xBtn.textContent = '✕';
    xBtn.title = 'Clear selection';
    xBtn.addEventListener('click', clearPendingSelection);
    chipEl.appendChild(xBtn);
    cryptoAddBtn.disabled = false;
}

// --- Mode toggle: Search Coin vs. Contract Address ---
cryptoModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        cryptoModeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode');
        cryptoModeSearchPanel.style.display = mode === 'search' ? 'block' : 'none';
        cryptoModeContractPanel.style.display = mode === 'contract' ? 'block' : 'none';
        clearPendingSelection();
    });
});

// --- Search-by-name mode ---
let cryptoSearchDebounceTimer = null;
let cryptoSearchAbortController = null;

cryptoSearchInput.addEventListener('input', () => {
    const query = cryptoSearchInput.value.trim();
    clearTimeout(cryptoSearchDebounceTimer);
    if (query.length < 2) {
        cryptoSearchResultsEl.innerHTML = '';
        cryptoSearchResultsEl.classList.remove('visible');
        return;
    }
    cryptoSearchDebounceTimer = setTimeout(() => runCryptoSearch(query), 400);
});

async function runCryptoSearch(query) {
    if (cryptoSearchAbortController) cryptoSearchAbortController.abort();
    cryptoSearchAbortController = new AbortController();
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, { signal: cryptoSearchAbortController.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderCryptoSearchResults((data.coins || []).slice(0, 8));
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Coin search failed:', err);
            cryptoSearchResultsEl.innerHTML = '<div class="crypto-search-empty">Search unavailable — check your connection.</div>';
            cryptoSearchResultsEl.classList.add('visible');
        }
    }
}

function renderCryptoSearchResults(coins) {
    cryptoSearchResultsEl.innerHTML = '';
    if (coins.length === 0) {
        cryptoSearchResultsEl.innerHTML = '<div class="crypto-search-empty">No coins found.</div>';
        cryptoSearchResultsEl.classList.add('visible');
        return;
    }
    coins.forEach(coin => {
        const item = document.createElement('div');
        item.className = 'crypto-search-result-item';
        item.innerHTML = `<span class="result-name">${coin.name}</span><span class="result-symbol">${(coin.symbol || '').toUpperCase()}</span>${coin.market_cap_rank ? `<span class="result-rank">#${coin.market_cap_rank}</span>` : ''}`;
        item.addEventListener('click', () => {
            setPendingSelection({ coinId: coin.id, symbol: (coin.symbol || '').toUpperCase(), name: coin.name }, cryptoSelectedChipEl);
            cryptoSearchResultsEl.innerHTML = '';
            cryptoSearchResultsEl.classList.remove('visible');
            cryptoSearchInput.value = coin.name;
        });
        cryptoSearchResultsEl.appendChild(item);
    });
    cryptoSearchResultsEl.classList.add('visible');
}

document.addEventListener('click', (e) => {
    if (!cryptoSearchResultsEl.contains(e.target) && e.target !== cryptoSearchInput) {
        cryptoSearchResultsEl.classList.remove('visible');
    }
});

// --- Contract-address mode ---
// Resolves any ERC-20/BEP-20/SPL-style token to its CoinGecko coin ID via the
// coins/{platform}/contract/{address} endpoint, which also returns live price data —
// so once resolved, the token behaves exactly like a searched coin for refreshes.
cryptoResolveBtn.addEventListener('click', async () => {
    const platform = cryptoPlatformSelect.value;
    const platformLabel = cryptoPlatformSelect.options[cryptoPlatformSelect.selectedIndex].textContent;
    const address = cryptoContractInput.value.trim();
    if (!address) { alert("Paste a contract / token address first."); return; }

    cryptoResolveBtn.disabled = true;
    cryptoResolveBtn.textContent = 'Looking up…';
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${platform}/contract/${address.toLowerCase()}`);
        if (!res.ok) throw new Error(res.status === 404 ? "No token found for that address on this network." : `HTTP ${res.status}`);
        const data = await res.json();
        setPendingSelection({
            coinId: data.id,
            symbol: (data.symbol || '').toUpperCase(),
            name: data.name,
            contractAddress: address,
            platform: platformLabel
        }, cryptoContractChipEl);
    } catch (err) {
        console.error('Contract lookup failed:', err);
        alert(`Couldn't resolve that token: ${err.message}`);
    } finally {
        cryptoResolveBtn.disabled = false;
        cryptoResolveBtn.textContent = 'Look Up Token';
    }
});

function addCryptoHoldingHandler() {
    if (!pendingCoinSelection) { alert("Search for a coin, or resolve a contract address, first."); return; }
    const quantity = parseFloat(cryptoQtyInput.value);
    if (isNaN(quantity) || quantity <= 0) { alert("Enter a positive quantity."); return; }
    const avgCostRaw = parseFloat(cryptoAvgCostInput.value);
    const avgBuyPriceUSD = isNaN(avgCostRaw) || avgCostRaw < 0 ? null : avgCostRaw;

    const { coinId, symbol, name, contractAddress, platform } = pendingCoinSelection;
    const existing = cryptoState.holdings.find(h => h.coinId === coinId);
    if (existing) {
        // Blend the average cost proportionally when adding to an existing position.
        if (avgBuyPriceUSD !== null && existing.avgBuyPriceUSD !== null) {
            const totalQty = existing.quantity + quantity;
            existing.avgBuyPriceUSD = ((existing.avgBuyPriceUSD * existing.quantity) + (avgBuyPriceUSD * quantity)) / totalQty;
        } else if (avgBuyPriceUSD !== null) {
            existing.avgBuyPriceUSD = avgBuyPriceUSD;
        }
        existing.quantity += quantity;
        if (contractAddress) { existing.contractAddress = contractAddress; existing.platform = platform; }
    } else {
        cryptoState.holdings.push({
            id: `c-${Date.now()}`,
            coinId, symbol, name, quantity, avgBuyPriceUSD,
            contractAddress: contractAddress || null,
            platform: platform || null
        });
    }

    cryptoQtyInput.value = '';
    cryptoAvgCostInput.value = '';
    cryptoSearchInput.value = '';
    cryptoContractInput.value = '';
    clearPendingSelection();
    saveStateToStorage();
    renderCryptoHoldings();
    fetchCryptoPrices();
}
cryptoAddBtn.addEventListener('click', addCryptoHoldingHandler);

function removeCryptoHolding(id) {
    cryptoState.holdings = cryptoState.holdings.filter(h => h.id !== id);
    saveStateToStorage();
    renderCryptoHoldings();
}

function formatTimeAgo(isoString) {
    if (!isoString) return 'Not fetched yet';
    const seconds = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 5) return 'Updated just now';
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `Updated ${mins}m ago`;
    const hrs = Math.round(mins / 60);
    return `Updated ${hrs}h ago`;
}

// Fetches live NGN/USD prices (+ 24h change) for every held coin from CoinGecko's free,
// key-free public API. Prices are cached locally so the portfolio still shows a value
// (labeled as stale) if the network request fails.
async function fetchCryptoPrices() {
    if (cryptoState.holdings.length === 0) { renderCryptoHoldings(); return; }
    const ids = [...new Set(cryptoState.holdings.map(h => h.coinId))].join(',');
    cryptoRefreshBtn.classList.add('spinning');

    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=ngn,usd&include_24hr_change=true`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        Object.entries(data).forEach(([coinId, prices]) => {
            cryptoState.priceCache[coinId] = {
                ngn: prices.ngn ?? null,
                usd: prices.usd ?? null,
                usd_24h_change: prices.usd_24h_change ?? null
            };
        });
        cryptoState.lastUpdated = new Date().toISOString();
        cryptoFetchErrorEl.classList.remove('visible');
        saveStateToStorage();
    } catch (err) {
        console.error('Crypto price fetch failed:', err);
        cryptoFetchErrorEl.classList.add('visible');
    } finally {
        cryptoRefreshBtn.classList.remove('spinning');
        renderCryptoHoldings();
    }
}
cryptoRefreshBtn.addEventListener('click', fetchCryptoPrices);

function renderCryptoHoldings() {
    cryptoUpdatedTextEl.textContent = formatTimeAgo(cryptoState.lastUpdated);
    cryptoHoldingsListEl.innerHTML = '';

    if (cryptoState.holdings.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'crypto-empty-msg';
        empty.textContent = 'No coins added yet — add a holding below to start tracking.';
        cryptoHoldingsListEl.appendChild(empty);
        cryptoTotalValueEl.textContent = '₦0.00';
        cryptoTotalPlEl.textContent = '';
        cryptoTotalValueNGN = 0;
        updatePortfolioGroupTotals();
        return;
    }

    let totalValueNGN = 0;
    let totalCostUSD = 0;
    let totalValueUSD = 0;
    let hasCostBasis = false;

    cryptoState.holdings.forEach(holding => {
        const price = cryptoState.priceCache[holding.coinId];
        const priceNGN = price ? price.ngn : null;
        const priceUSD = price ? price.usd : null;
        const change24h = price ? price.usd_24h_change : null;

        const valueNGN = priceNGN !== null ? priceNGN * holding.quantity : null;
        if (valueNGN !== null) totalValueNGN += valueNGN;
        if (priceUSD !== null) totalValueUSD += priceUSD * holding.quantity;
        if (holding.avgBuyPriceUSD !== null) {
            hasCostBasis = true;
            totalCostUSD += holding.avgBuyPriceUSD * holding.quantity;
        }

        const row = document.createElement('div');
        row.className = 'crypto-holding-row';

        const badge = document.createElement('div');
        badge.className = 'crypto-token-badge';
        badge.textContent = holding.symbol.slice(0, 4);

        const main = document.createElement('div');
        main.className = 'crypto-holding-main';

        const nameRow = document.createElement('div');
        nameRow.className = 'crypto-holding-name-row';
        nameRow.innerHTML = `<span class="crypto-holding-symbol">${holding.name}</span><span class="crypto-holding-qty">${holding.quantity} ${holding.symbol}</span>`;

        const sub = document.createElement('div');
        sub.className = 'crypto-holding-sub';
        let subText = priceUSD !== null
            ? `@ $${priceUSD.toLocaleString('en-US', { maximumFractionDigits: priceUSD < 1 ? 6 : 2 })}`
            : (cryptoState.lastUpdated ? '@ price unavailable' : '@ awaiting first fetch');
        if (holding.contractAddress) {
            const shortAddr = `${holding.contractAddress.slice(0, 6)}…${holding.contractAddress.slice(-4)}`;
            subText += ` · ${holding.platform || 'contract'} ${shortAddr}`;
        }
        sub.textContent = subText;

        main.appendChild(nameRow);
        main.appendChild(sub);

        const values = document.createElement('div');
        values.className = 'crypto-holding-values';

        const valueEl = document.createElement('div');
        valueEl.className = 'crypto-holding-value';
        valueEl.textContent = valueNGN !== null
            ? `₦${valueNGN.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
            : '—';

        const changeEl = document.createElement('div');
        if (change24h !== null && change24h !== undefined) {
            const dir = change24h >= 0 ? 'up' : 'down';
            changeEl.className = `crypto-holding-change ${dir}`;
            changeEl.textContent = `${change24h >= 0 ? '▲' : '▼'} ${Math.abs(change24h).toFixed(2)}% (24h)`;
        } else {
            changeEl.className = 'crypto-holding-change flat';
            changeEl.textContent = '— 24h';
        }

        values.appendChild(valueEl);
        values.appendChild(changeEl);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'crypto-remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Remove holding';
        removeBtn.addEventListener('click', () => removeCryptoHolding(holding.id));

        row.appendChild(badge);
        row.appendChild(main);
        row.appendChild(values);
        row.appendChild(removeBtn);
        cryptoHoldingsListEl.appendChild(row);
    });

    cryptoTotalValueEl.textContent = `₦${totalValueNGN.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
    cryptoTotalValueNGN = totalValueNGN;

    if (hasCostBasis && totalCostUSD > 0 && totalValueUSD > 0) {
        const plPct = ((totalValueUSD - totalCostUSD) / totalCostUSD) * 100;
        const dir = plPct >= 0 ? 'up' : 'down';
        cryptoTotalPlEl.className = `crypto-total-pl ${dir}`;
        cryptoTotalPlEl.textContent = `${plPct >= 0 ? '▲' : '▼'} ${Math.abs(plPct).toFixed(1)}% vs. cost basis`;
    } else {
        cryptoTotalPlEl.className = 'crypto-total-pl';
        cryptoTotalPlEl.textContent = '';
    }

    // Portfolio Investment/Savings totals include the live crypto value, so keep them
    // in sync every time holdings are (re)rendered — not just when balances change.
    updatePortfolioGroupTotals();
}

// Refresh live prices periodically while the tab stays open (10 minutes; CoinGecko's
// free tier is rate-limited, so we keep polling gentle).
setInterval(() => { if (cryptoState.holdings.length > 0) fetchCryptoPrices(); }, 10 * 60 * 1000);

renderCryptoHoldings();
fetchCryptoPrices();
