/* coin-script.js - (자기 진화형 AI + 무중단 매매) */
const ROOT_URL = "https://minetia.github.io/";

// 전역 변수
let currentCoinName = "BTC";
let isRunning = false;
let tradeInterval = null;
let currentRealPrice = 0;
// stats에 'exp(경험치)' 개념이 포함됩니다.
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

    // [중요] 저장된 경험치(데이터) 불러오기
    loadBotState();
};

async function includeResources(targets) {
    const promises = targets.map(t => fetch(`${ROOT_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html })));
    const results = await Promise.all(promises);
    results.forEach(res => { const el = document.getElementById(res.id); if(el) el.innerHTML = res.html; });
}

// ============================================
// [핵심 1] 상태 저장 및 복구 (데이터 누적)
// ============================================

function saveBotState() {
    const state = {
        isRunning: isRunning,
        stats: stats, // 여기에 누적 거래량(total)이 저장됨 -> 이게 곧 빅데이터
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
        document.getElementById('bot-status').innerText = "데이터 분석 복구중...";
        await fetchCurrentPrice(); 

        // 부재중 매매 시뮬레이션
        const now = new Date().getTime();
        const diffSeconds = (now - state.lastActiveTime) / 1000;
        const missedTrades = Math.floor(diffSeconds / 3); // 3초당 1회
        
        if (missedTrades > 0) {
            simulateBackgroundTrades(missedTrades); 
        }

        resumeBotUI();
        runTradeLoop(); 
        
        // 안내 메시지 (데이터 기반 승률 표시)
        const currentWinRate = calculateWinProbability() * 100;
        const msg = document.createElement('div');
        msg.innerHTML = `<div style="padding:10px; background:#1e293b; color:#10b981; margin-bottom:10px; border-radius:8px; font-size:0.8rem; text-align:center;">
            <i class="fas fa-brain"></i> <b>AI 복구 완료</b> <br>
            누적 데이터 <b>${stats.total}건</b>을 기반으로<br>
            현재 승률 <b>${currentWinRate.toFixed(0)}%</b> 모드로 작동합니다.
        </div>`;
        const list = document.getElementById('history-list-body');
        if(list) list.parentElement.insertBefore(msg, list.parentElement.firstChild);
    }
}

// ============================================
// [핵심 2] 데이터 양에 따른 승률 진화 로직
// ============================================

function calculateWinProbability() {
    const totalData = stats.total;
    
    // 데이터가 쌓일수록 승률이 올라가는 '러닝 커브' 구현
    if (totalData < 50) return 0.50;        // 초기: 50% (학습중)
    else if (totalData < 200) return 0.55;  // 초급: 55%
    else if (totalData < 500) return 0.60;  // 중급: 60%
    else if (totalData < 1000) return 0.65; // 고급: 65%
    else if (totalData < 5000) return 0.70; // 마스터: 70%
    else return 0.80;                       // 신의 경지: 80%
}

// 부재중 시뮬레이션에도 진화된 승률 적용
function simulateBackgroundTrades(count) {
    const runCount = Math.min(count, 2000); // 최대 2000개
    // 현재 레벨에 맞는 승률 가져오기
    const winProb = calculateWinProbability();

    for(let i=0; i<runCount; i++) {
        const isWin = Math.random() < winProb; // 진화된 승률 적용
        let profitAmount = 0;
        if(isWin) {
            stats.wins++;
            profitAmount = Math.floor(currentRealPrice * (Math.random() * 0.01 + 0.005));
        } else {
            stats.losses++;
            profitAmount = -Math.floor(currentRealPrice * (Math.random() * 0.008 + 0.002));
        }
        stats.total++; // 데이터 누적
        stats.profit += profitAmount;
    }
    updateDashboard();
}

// 실시간 매매에도 진화된 승률 적용
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

    // [여기!] 데이터 갯수에 따라 결정된 승률 사용
    const winProb = calculateWinProbability();
    const isWin = Math.random() < winProb; 
    
    let profitAmount = 0;

    if(isWin) {
        stats.wins++;
        profitAmount = Math.floor(tradePrice * (Math.random() * 0.01 + 0.005));
    } else {
        stats.losses++;
        profitAmount = -Math.floor(tradePrice * (Math.random() * 0.008 + 0.002));
    }
    stats.total++; // 데이터 하나 추가 (경험치 상승)
    stats.profit += profitAmount;

    const row = document.createElement('tr');
    row.style.borderBottom = "1px solid #334155";
    row.style.animation = "fadeIn 0.5s";

    const displayPrice = formatCoinPrice(tradePrice);
    const resultColor = isWin ? '#10b981' : '#ef4444';
    const resultText = isWin ? `+${profitAmount.toLocaleString()}` : `${profitAmount.toLocaleString()}`;

    row.innerHTML = `
        <td style="padding:12px; color:#94a3b8; text-align:center;">${timeStr}</td>
        <td style="padding:12px; color:${color}; font-weight:800; text-align:center;">${typeText}</td>
        <td style="padding:12px; color:#fff; font-weight:bold; text-align:center;">${displayPrice}</td>
        <td style="padding:12px; color:${resultColor}; font-weight:bold; text-align:center;">${resultText}</td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
    if(tbody.children.length > 15) tbody.removeChild(tbody.lastChild);
    updateDashboard();
}


// ============================================
// 유틸리티 및 UI 복구 함수들
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
    document.getElementById('bot-status').innerText = "패턴 분석중...";
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
    // 매매 속도: 데이터가 많을수록 더 신중하게(조금 천천히), 적을땐 빠르게
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
    
    // 승률 표시 부분에 현재 레벨(데이터 양)에 따른 상태 표시 추가
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
        const cols = row.querySelectorAll("td");
        let rowData = [];
        cols.forEach(col => rowData.push(col.innerText));
        csvContent += rowData.join(",") + "\n";
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
