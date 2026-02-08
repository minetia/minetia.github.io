/* coin-script.js - (수익률 % 표시 기능 추가) */
const ROOT_URL = "https://minetia.github.io/";

// 전역 변수
let currentCoinName = "BTC";
let isRunning = false;
let tradeInterval = null;
let currentRealPrice = 0;
let stats = { profit: 0, wins: 0, losses: 0, total: 0 };

// 1회 투자금 (5천만원 ~ 1억원)
const MIN_BET = 50000000; 
const MAX_BET = 100000000;

window.onload = async () => {
    await includeResources([
        { id: 'header-placeholder', file: 'header.html' },
        { id: 'nav-placeholder', file: 'nav.html' },
        { id: 'history-placeholder', file: 'history.html' } 
    ]);
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    currentCoinName = params.get('coin') || 'BTC';
    
    const titleEl = document.getElementById('coin-name-display');
    if(titleEl) titleEl.innerText = currentCoinName;

    initTradingView(symbol);
    updateAiVersion();
    loadBotState();
};

async function includeResources(targets) {
    const promises = targets.map(t => fetch(`${ROOT_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html })));
    const results = await Promise.all(promises);
    results.forEach(res => { const el = document.getElementById(res.id); if(el) el.innerHTML = res.html; });
}

// ============================================
// 상태 저장 및 복구
// ============================================

function saveBotState() {
    const state = {
        isRunning: isRunning,
        stats: stats,
        lastActiveTime: new Date().getTime()
    };
    localStorage.setItem(`BOT_STATE_${currentCoinName}`, JSON.stringify(state));
}

async function loadBotState() {
    const saved = localStorage.getItem(`BOT_STATE_${currentCoinName}`);
    if (!saved) return; 

    const state = JSON.parse(saved);
    stats = state.stats; 

    if (state.isRunning) {
        document.getElementById('bot-status').innerText = "수익금 정산중...";
        await fetchCurrentPrice(); 

        const now = new Date().getTime();
        const diffSeconds = (now - state.lastActiveTime) / 1000;
        const missedTrades = Math.floor(diffSeconds / 3); 
        
        if (missedTrades > 0) {
            simulateBackgroundTrades(missedTrades); 
        }

        resumeBotUI();
        runTradeLoop(); 
        showRecoveryMessage(missedTrades);
    }
}

function showRecoveryMessage(count) {
    const tbody = document.getElementById('history-list-body');
    if(!tbody) return;
    const oldMsg = document.getElementById('recovery-msg-row');
    if(oldMsg) oldMsg.remove();

    const currentWinRate = calculateWinProbability() * 100;
    const profitSign = stats.profit > 0 ? '+' : '';

    const row = document.createElement('tr');
    row.id = 'recovery-msg-row';
    row.style.background = "rgba(16, 185, 129, 0.15)"; 
    row.style.borderBottom = "1px solid #334155";
    
    row.innerHTML = `
        <td colspan="4" style="padding:15px; text-align:center; color:#10b981; font-size:0.85rem;">
            <div style="font-weight:bold; margin-bottom:5px;">
                <i class="fas fa-check-circle"></i> AI 자동매매 복구 완료 (${count}건)
            </div>
            <div style="color:#cbd5e1; font-size:0.75rem;">
                현재 승률 <b>${currentWinRate.toFixed(0)}%</b> · 
                총 수익 <b style="color:#fff">${profitSign}${stats.profit.toLocaleString()} KRW</b>
            </div>
        </td>
    `;
    tbody.prepend(row);
    setTimeout(() => {
        if(row) {
            row.style.transition = "opacity 1s";
            row.style.opacity = "0";
            setTimeout(() => row.remove(), 1000);
        }
    }, 5000);
}

// ============================================
// 수익 계산 로직
// ============================================

function calculateWinProbability() {
    const totalData = stats.total;
    if (totalData < 50) return 0.50;        
    else if (totalData < 200) return 0.55;  
    else if (totalData < 500) return 0.60;  
    else if (totalData < 1000) return 0.65; 
    else if (totalData < 5000) return 0.70; 
    else return 0.80;                       
}

// [핵심] 결과값 객체 반환 (수익금, 수익률)
function calculateTradeResult(isWin) {
    const betAmount = Math.floor(Math.random() * (MAX_BET - MIN_BET + 1)) + MIN_BET;
    
    // 수익률: 0.5% ~ 1.5%
    const percentRaw = (Math.random() * 0.01) + 0.005; 
    
    let profit = 0;
    let percent = 0;

    if (isWin) {
        profit = Math.floor(betAmount * percentRaw);
        percent = percentRaw * 100; // % 단위 변환
    } else {
        const lossPercentRaw = (Math.random() * 0.008) + 0.002; 
        profit = -Math.floor(betAmount * lossPercentRaw);
        percent = -lossPercentRaw * 100;
    }
    return { profit: profit, percent: percent.toFixed(2) }; // 객체로 반환
}

function simulateBackgroundTrades(count) {
    const runCount = Math.min(count, 2000);
    const winProb = calculateWinProbability();
    for(let i=0; i<runCount; i++) {
        const isWin = Math.random() < winProb;
        stats.total++;
        if(isWin) stats.wins++; else stats.losses++;
        stats.profit += calculateTradeResult(isWin).profit;
    }
    updateDashboard();
}

function executeTrade() {
    const tbody = document.getElementById('history-list-body');
    if(!tbody) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    const variation = currentRealPrice * 0.001; 
    const tradePrice = currentRealPrice + (Math.random() * variation * 2 - variation);
    
    const isBuy = Math.random() > 0.5;
    const typeText = isBuy ? `${currentCoinName} 롱` : `${currentCoinName} 숏`;
    const color = isBuy ? '#10b981' : '#ef4444';

    const winProb = calculateWinProbability();
    const isWin = Math.random() < winProb; 
    
    // [수정] 수익금과 수익률(%)을 같이 받음
    const resultData = calculateTradeResult(isWin);
    const profitAmount = resultData.profit;
    const profitPercent = resultData.percent;

    stats.total++; 
    if(isWin) stats.wins++; else stats.losses++;
    stats.profit += profitAmount;

    const row = document.createElement('tr');
    row.style.borderBottom = "1px solid #334155";
    row.style.animation = "fadeIn 0.5s";

    const displayPrice = formatCoinPrice(tradePrice);
    const resultColor = isWin ? '#10b981' : '#ef4444';
    const plusSign = isWin ? '+' : '';
    
    // [UI 변경] 수익금 아래에 수익률(%) 표시
    const resultHTML = `
        <div>${plusSign}${profitAmount.toLocaleString()}</div>
        <div style="font-size:0.7rem; opacity:0.8; font-weight:normal;">(${plusSign}${profitPercent}%)</div>
    `;

    row.innerHTML = `
        <td style="padding:12px; color:#94a3b8; text-align:center;">${timeStr}</td>
        <td style="padding:12px; color:${color}; font-weight:800; text-align:center;">${typeText}</td>
        <td style="padding:12px; color:#fff; font-weight:bold; text-align:center;">${displayPrice}</td>
        <td style="padding:12px; color:${resultColor}; font-weight:bold; text-align:center;">${resultHTML}</td>
    `;
    
    tbody.prepend(row);
    if(tbody.children.length > 15) {
        if(tbody.lastChild.id !== 'recovery-msg-row') {
            tbody.removeChild(tbody.lastChild);
        }
    }
    updateDashboard();
}

// ============================================
// 유틸리티
// ============================================

function resumeBotUI() {
    isRunning = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').style.background = '#334155';
    document.getElementById('btn-start').style.color = '#94a3b8';
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444';
    document.getElementById('btn-stop').style.color = '#fff';
    document.getElementById('bot-status').innerText = "가동중...";
    document.getElementById('bot-status').style.color = "#10b981";
    document.getElementById('bot-status').style.border = "1px solid #10b981";
    document.getElementById('empty-msg').style.display = 'none';
}

function formatCoinPrice(price) {
    const p = parseFloat(price);
    if (isNaN(p)) return '-';
    if (p >= 100) return Math.floor(p).toLocaleString(); 
    else if (p >= 1) return p.toFixed(2); 
    else return p.toFixed(4); 
}

async function fetchCurrentPrice() {
    try {
        const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-${currentCoinName}`);
        if(res.data && res.data.length > 0) currentRealPrice = res.data[0].trade_price;
        else currentRealPrice = getFallbackPrice(currentCoinName);
    } catch (e) { currentRealPrice = getFallbackPrice(currentCoinName); }
}

async function startBot() {
    if(isRunning) return;
    document.getElementById('bot-status').innerText = "매매 알고리즘 가동...";
    await fetchCurrentPrice(); 
    resumeBotUI();
    runTradeLoop();
    saveBotState(); 
}

function stopBot() {
    if(!isRunning) return;
    isRunning = false;
    clearTimeout(tradeInterval);
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').style.background = '#10b981';
    document.getElementById('btn-start').style.color = '#fff';
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.background = '#334155';
    document.getElementById('btn-stop').style.color = '#94a3b8';
    document.getElementById('bot-status').innerText = "일시정지";
    document.getElementById('bot-status').style.color = "#f59e0b";
    document.getElementById('bot-status').style.border = "1px solid #f59e0b";
    saveBotState();
}

function runTradeLoop() {
    if(!isRunning) return;
    executeTrade();
    saveBotState(); 
    const speed = stats.total > 1000 ? 3000 : 2000; 
    const nextTradeTime = Math.floor(Math.random() * 1000) + speed;
    tradeInterval = setTimeout(runTradeLoop, nextTradeTime);
}

function updateDashboard() {
    const profitEl = document.getElementById('total-profit');
    const sign = stats.profit > 0 ? '+' : '';
    profitEl.innerText = `${sign}${stats.profit.toLocaleString()} KRW`;
    profitEl.style.color = stats.profit >= 0 ? '#10b981' : '#ef4444';
    
    const winRate = stats.total === 0 ? 0 : ((stats.wins / stats.total) * 100).toFixed(1);
    let level = "초기화";
    if(stats.total > 5000) level = "마스터";
    else if(stats.total > 1000) level = "고수";
    else if(stats.total > 200) level = "중수";
    else if(stats.total > 50) level = "초보";
    
    document.getElementById('win-rate').innerHTML = `${winRate}% <span style="font-size:0.7rem; color:#f59e0b; border:1px solid #f59e0b; padding:2px 4px; border-radius:4px; margin-left:5px;">${level}</span>`;
    document.getElementById('win-count').innerText = `${stats.wins}승`;
    document.getElementById('loss-count').innerText = `${stats.losses}패`;
}

function downloadLog() {
    let csvContent = "data:text/csv;charset=utf-8,Time,Type,Price,Profit\n";
    const rows = document.querySelectorAll("#history-list-body tr");
    rows.forEach(row => {
        if(row.id === 'recovery-msg-row') return; 
        const cols = row.querySelectorAll("td");
        let rowData = [];
        cols.forEach(col => rowData.push(col.innerText.replace('\n', ' '))); // 줄바꿈 제거 후 저장
        if(rowData.length > 0) csvContent += rowData.join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentCoinName}_AI_Data_${stats.total}.csv`);
    document.body.appendChild(link);
    link.click();
}

function clearHistory() {
    document.getElementById('history-list-body').innerHTML = '';
    stats = { profit: 0, wins: 0, losses: 0, total: 0 };
    updateDashboard();
    document.getElementById('empty-msg').style.display = 'block';
    stopBot();
    localStorage.removeItem(`BOT_STATE_${currentCoinName}`);
}

function getFallbackPrice(coin) {
    const prices = { 'BTC': 98000000, 'ETH': 3800000, 'XRP': 1500, 'SOL': 210000, 'DOGE': 180 };
    return prices[coin] || 1000;
}

function updateAiVersion() {
    const versionEl = document.getElementById('ai-version-display');
    if(versionEl) {
        const major = Math.floor(Math.random() * 3) + 5;
        const minor = Math.floor(Math.random() * 10);
        versionEl.innerText = `Neuro-Bot V${major}.${minor}`;
    }
}

function initTradingView(symbol) {
    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({ "container_id": "tv_chart", "symbol": symbol, "interval": "60", "theme": "dark", "autosize": true, "locale": "ko", "toolbar_bg": "#020617", "hide_side_toolbar": true, "allow_symbol_change": false, "save_image": false });
    }
}

function searchCoin() {
    const input = document.getElementById('header-search-input');
    if (!input) return;
    let symbol = input.value.toUpperCase().trim();
    if (!symbol) { alert("코인명을 입력해주세요."); return; }
    location.href = `https://minetia.github.io/coin/modal.html?symbol=BINANCE:${symbol}USDT&coin=${symbol}`;
}
