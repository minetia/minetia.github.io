/* coin-script.js - (자기 진화형 AI + 무중단 매매 + 메시지 디자인 수정) */
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

    // 저장된 데이터 불러오기
    loadBotState();
};

async function includeResources(targets) {
    const promises = targets.map(t => fetch(`${ROOT_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html })));
    const results = await Promise.all(promises);
    results.forEach(res => { const el = document.getElementById(res.id); if(el) el.innerHTML = res.html; });
}

// ============================================
// [핵심 1] 상태 저장 및 복구
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
        document.getElementById('bot-status').innerText = "데이터 분석 복구중...";
        await fetchCurrentPrice(); 

        const now = new Date().getTime();
        const diffSeconds = (now - state.lastActiveTime) / 1000;
        const missedTrades = Math.floor(diffSeconds / 3); 
        
        if (missedTrades > 0) {
            simulateBackgroundTrades(missedTrades); 
        }

        resumeBotUI();
        runTradeLoop(); 
        
        // [수정됨] 복구 메시지를 테이블 행(TR)으로 만듦
        const currentWinRate = calculateWinProbability() * 100;
        const tbody = document.getElementById('history-list-body');
        if(tbody) {
            const msgRow = document.createElement('tr');
            msgRow.style.background = "rgba(16, 185, 129, 0.1)"; // 연한 초록색 배경
            msgRow.style.borderBottom = "1px solid #334155";
            
            const msgCell = document.createElement('td');
            msgCell.setAttribute('colspan', '4'); // 4칸을 합침 (핵심!)
            msgCell.style.padding = "12px";
            msgCell.style.color = "#10b981";
            msgCell.style.textAlign = "center";
            msgCell.style.fontSize = "0.85rem";
            // 깔끔한 두 줄 디자인
            msgCell.innerHTML = `
                <div><i class="fas fa-brain"></i> <b>AI 복구 완료</b> (부재중 ${missedTrades}건 처리)</div>
                <div style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">
                    누적 데이터 <b>${stats.total.toLocaleString()}건</b> 기반 · 
                    현재 승률 <b>${currentWinRate.toFixed(0)}%</b> 모드 작동
                </div>
            `;
            
            msgRow.appendChild(msgCell);
            tbody.insertBefore(msgRow, tbody.firstChild); // 맨 위에 삽입
            
            // 5초 뒤에 메시지 자동 삭제 (선택사항)
            setTimeout(() => {
                if(msgRow && msgRow.parentNode) msgRow.remove();
            }, 5000);
        }
    }
}

// ============================================
// [핵심 2] 승률 진화 로직
// ============================================

function calculateWinProbability() {
    const totalData = stats.total;
    if (totalData < 50) return 0.50;        // 초기
    else if (totalData < 200) return 0.55;  // 초급
    else if (totalData < 500) return 0.60;  // 중급
    else if (totalData < 1000) return 0.65; // 고급
    else if (totalData < 5000) return 0.70; // 마스터
    else return 0.80;                       // 신
}

function simulateBackgroundTrades(count) {
    const runCount = Math.min(count, 2000);
    const winProb = calculateWinProbability();

    for(let i=0; i<runCount; i++) {
        const isWin = Math.random() < winProb;
        let profitAmount = 0;
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


// ============================================
// 유틸리티 및 UI 함수들
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
        if(row.classList.contains('recovery-msg')) return; // 메시지 행 제외
        const cols = row.querySelectorAll("td");
        let rowData = [];
        cols.forEach(col => rowData.push(col.innerText));
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
