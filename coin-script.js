/* coin-script.js - (상태 저장 및 백그라운드 시뮬레이션 기능 탑재) */
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

    // [핵심] 저장된 상태 불러오기 (창 닫았다 켜도 복구)
    loadBotState();
};

async function includeResources(targets) {
    const promises = targets.map(t => fetch(`${ROOT_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html })));
    const results = await Promise.all(promises);
    results.forEach(res => { const el = document.getElementById(res.id); if(el) el.innerHTML = res.html; });
}

// ============================================
// [핵심 기능] 상태 저장 및 복구 (LocalStorage)
// ============================================

// 1. 상태 저장 (매매할 때마다 호출)
function saveBotState() {
    const state = {
        isRunning: isRunning,
        stats: stats,
        lastActiveTime: new Date().getTime() // 마지막 작동 시간 저장
    };
    // 코인 이름별로 따로 저장 (BTC따로, ETH따로)
    localStorage.setItem(`BOT_STATE_${currentCoinName}`, JSON.stringify(state));
}

// 2. 상태 불러오기 (페이지 열 때 호출)
async function loadBotState() {
    const saved = localStorage.getItem(`BOT_STATE_${currentCoinName}`);
    if (!saved) return; // 저장된 게 없으면 패스

    const state = JSON.parse(saved);
    stats = state.stats; // 수익금 복구

    // 만약 끄기 전에 '가동중' 이었다면?
    if (state.isRunning) {
        document.getElementById('bot-status').innerText = "복구중...";
        await fetchCurrentPrice(); // 가격 가져오기

        // [시간 여행] 꺼져있던 시간 동안의 수익 계산
        const now = new Date().getTime();
        const diffSeconds = (now - state.lastActiveTime) / 1000;
        
        // 3초당 1회 매매했다고 가정
        const missedTrades = Math.floor(diffSeconds / 3);
        
        if (missedTrades > 0) {
            console.log(`${missedTrades}건의 부재중 매매 시뮬레이션...`);
            simulateBackgroundTrades(missedTrades); // 부재중 수익 추가
        }

        // 봇 다시 시작 (UI 복구)
        resumeBotUI();
        runTradeLoop(); // 매매 루프 재가동
        
        // 안내 메시지
        const msg = document.createElement('div');
        msg.innerHTML = `<div style="padding:10px; background:#1e293b; color:#10b981; margin-bottom:10px; border-radius:8px; font-size:0.8rem; text-align:center;">
            <i class="fas fa-bolt"></i> 자동매매 복구 완료! <br>
            부재중 <b>${missedTrades}건</b>의 매매가 처리되었습니다.
        </div>`;
        const list = document.getElementById('history-list-body');
        if(list) list.parentElement.insertBefore(msg, list.parentElement.firstChild);
    }
}

// 3. 부재중 매매 시뮬레이션 (수익만 계산)
function simulateBackgroundTrades(count) {
    // 너무 많으면 최대 1000개까지만 (브라우저 렉 방지)
    const runCount = Math.min(count, 1000);
    
    for(let i=0; i<runCount; i++) {
        const isWin = Math.random() > 0.35; // 승률 65%
        let profitAmount = 0;
        // 현재 가격 기준으로 대략 계산
        if(isWin) {
            stats.wins++;
            profitAmount = Math.floor(currentRealPrice * (Math.random() * 0.01 + 0.005));
        } else {
            stats.losses++;
            profitAmount = -Math.floor(currentRealPrice * (Math.random() * 0.008 + 0.002));
        }
        stats.total++;
        stats.profit += profitAmount;
    }
    updateDashboard(); // 대시보드 갱신
}

// 4. UI만 '가동중'으로 변경하는 함수
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

// ============================================
// 기존 기능 (수정됨)
// ============================================

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
    document.getElementById('bot-status').innerText = "가격 분석중...";
    await fetchCurrentPrice(); 
    resumeBotUI(); // UI 변경 분리됨
    runTradeLoop();
    saveBotState(); // [저장] 시작 상태 저장
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
    
    saveBotState(); // [저장] 정지 상태 저장
}

function runTradeLoop() {
    if(!isRunning) return;
    executeTrade();
    // 매매 후 상태 저장 (중요: 창 닫아도 최신 기록 유지)
    saveBotState(); 
    const nextTradeTime = Math.floor(Math.random() * 2500) + 1500;
    tradeInterval = setTimeout(runTradeLoop, nextTradeTime);
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
    const isWin = Math.random() > 0.35; 
    let profitAmount = 0;

    if(isWin) {
        stats.wins++;
        profitAmount = Math.floor(tradePrice * (Math.random() * 0.01 + 0.005));
    } else {
        stats.losses++;
        profitAmount = -Math.floor(tradePrice * (Math.random() * 0.008 + 0.002));
    }
    stats.total++;
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

function updateDashboard() {
    const profitEl = document.getElementById('total-profit');
    const sign = stats.profit > 0 ? '+' : '';
    profitEl.innerText = `${sign}${stats.profit.toLocaleString()} KRW`;
    profitEl.style.color = stats.profit >= 0 ? '#10b981' : '#ef4444';
    const winRate = stats.total === 0 ? 0 : ((stats.wins / stats.total) * 100).toFixed(1);
    document.getElementById('win-rate').innerText = `${winRate}%`;
    document.getElementById('win-count').innerText = `${stats.wins}승`;
    document.getElementById('loss-count').innerText = `${stats.losses}패`;
}

// [추가] 로그 다운로드 기능 (구글 드라이브 대체)
function downloadLog() {
    let csvContent = "data:text/csv;charset=utf-8,Time,Type,Price,Profit\n";
    // 현재 화면에 있는 리스트만 저장
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
    link.setAttribute("download", `${currentCoinName}_trading_log.csv`);
    document.body.appendChild(link);
    link.click();
}

function clearHistory() {
    document.getElementById('history-list-body').innerHTML = '';
    stats = { profit: 0, wins: 0, losses: 0, total: 0 };
    updateDashboard();
    document.getElementById('empty-msg').style.display = 'block';
    stopBot();
    // 저장된 상태도 삭제
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
