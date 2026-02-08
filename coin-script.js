/* coin-script.js - (투자금 입력 + 실시간 자산 평가 반영) */
const ROOT_URL = "https://minetia.github.io/";

// 전역 변수
let currentCoinName = "BTC";
let isRunning = false;
let tradeInterval = null;
let currentRealPrice = 0;
let stats = { profit: 0, wins: 0, losses: 0, total: 0 };

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
    
    // 저장된 데이터가 있는지 확인
    loadBotState();
};

async function includeResources(targets) {
    const promises = targets.map(t => fetch(`${ROOT_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html })));
    const results = await Promise.all(promises);
    results.forEach(res => { const el = document.getElementById(res.id); if(el) el.innerHTML = res.html; });
}

// [NEW] 투자금 입력 콤마 찍기
function formatInvestmentInput(input) {
    // 숫자만 남기기
    let val = input.value.replace(/[^0-9]/g, '');
    if(!val) return;
    // 콤마 추가
    input.value = Number(val).toLocaleString();
    updateDashboard(); // 입력할 때도 평가자산 업데이트
}

// [NEW] 현재 설정된 투자금 가져오기 (숫자로 변환)
function getInvestmentAmount() {
    const input = document.getElementById('user-investment');
    if(!input) return 50000000; // 기본값 5천만원
    const val = input.value.replace(/,/g, '');
    return Number(val) || 50000000;
}

// ============================================
// 상태 저장 및 복구
// ============================================

function saveBotState() {
    const state = {
        isRunning: isRunning,
        stats: stats,
        lastActiveTime: new Date().getTime(),
        investment: document.getElementById('user-investment').value // 투자금 설정도 저장
    };
    localStorage.setItem(`BOT_STATE_${currentCoinName}`, JSON.stringify(state));
}

async function loadBotState() {
    const saved = localStorage.getItem(`BOT_STATE_${currentCoinName}`);
    if (!saved) return; 

    const state = JSON.parse(saved);
    stats = state.stats;
    
    // 투자금 설정 복구
    if(state.investment) {
        const input = document.getElementById('user-investment');
        if(input) input.value = state.investment;
    }

    if (state.isRunning) {
        document.getElementById('bot-status').innerText = "자산 평가중...";
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
    updateDashboard(); // 초기 대시보드 갱신
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
// 수익 계산 (사용자 입력 금액 기준)
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

function calculateTradeResult(isWin) {
    // [핵심] 사용자가 입력한 투자금 가져오기
    const userBet = getInvestmentAmount();
    
    // 수익률: 0.8% ~ 1.5%
    const profitPercent = (Math.random() * 0.007) + 0.008; 
    
    let profit = 0;
    let percent = 0;

    if (isWin) {
        profit = Math.floor(userBet * profitPercent);
        percent = profitPercent * 100;
    } else {
        const lossPercent = (Math.random() * 0.005) + 0.005; 
        profit = -Math.floor(userBet * lossPercent);
        percent = -lossPercent * 100;
    }
    return { profit: profit, percent: percent.toFixed(2) };
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
    
    // 수익 계산
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
    
    // 입력창 비활성화 (매매 중 수정 방지)
    document.getElementById('user-investment').disabled = true;
    document.getElementById('user-investment').style.opacity = '0.5';

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
    document.getElementById('bot-status').innerText = "자산 연동중...";
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

    // 입력창 활성화
    document.getElementById('user-investment').disabled = false;
    document.getElementById('user-investment').style.opacity = '1';

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

// [핵심] 대시보드 업데이트 (실시간 자산 반영)
function updateDashboard() {
    const profitEl = document.getElementById('total-profit');
    const assetEl = document.getElementById('live-total-asset');
    
    const sign = stats.profit > 0 ? '+' : '';
    profitEl.innerText = `${sign}${stats.profit.toLocaleString()} KRW`;
    profitEl.style.color = stats.profit >= 0 ? '#10b981' : '#ef4444';
    
    // [NEW] 실시간 총 자산 계산 (원금 + 수익)
    const principal = getInvestmentAmount();
    const totalAsset = principal + stats.profit;
    if(assetEl) {
        assetEl.innerText = `${totalAsset.toLocaleString()} KRW`;
        // 자산이 원금보다 많으면 초록색, 적으면 빨간색
        assetEl.style.color = totalAsset >= principal ? '#10b981' : '#ef4444';
    }

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
        cols.forEach(col => rowData.push(col.innerText.replace('\n', ' ')));
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
