/* coin-script.js (루트 폴더) */
const ROOT_URL = "https://minetia.github.io/";

// [상태 변수]
let currentCoinName = "BTC";
let isRunning = false;
let tradeInterval = null;
let currentRealPrice = 0; // [NEW] 실시간 가격 저장 변수

// [통계 변수]
let stats = {
    profit: 0,
    wins: 0,
    losses: 0,
    total: 0
};

window.onload = async () => {
    // 1. 인클루드
    await includeResources([
        { id: 'header-placeholder', file: 'header.html' },
        { id: 'nav-placeholder', file: 'nav.html' },
        { id: 'history-placeholder', file: 'history.html' } 
    ]);

    // 2. 코인 정보 설정
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    currentCoinName = params.get('coin') || 'BTC';
    
    const titleEl = document.getElementById('coin-name-display');
    if(titleEl) titleEl.innerText = currentCoinName;

    // 3. 차트 실행
    initTradingView(symbol);

    // 4. 버전 표시
    updateAiVersion();
};

async function includeResources(targets) {
    const promises = targets.map(t => 
        fetch(`${ROOT_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html }))
    );
    const results = await Promise.all(promises);
    results.forEach(res => {
        const el = document.getElementById(res.id);
        if (el) el.innerHTML = res.html;
    });
}

// ============================================
// [NEW] 실제 가격 가져오기 (업비트 API)
// ============================================
async function fetchCurrentPrice() {
    try {
        // 업비트 API를 통해 KRW 마켓의 현재가 조회
        const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-${currentCoinName}`);
        if(res.data && res.data.length > 0) {
            currentRealPrice = res.data[0].trade_price;
            console.log(`현재 ${currentCoinName} 가격: ${currentRealPrice}`);
        } else {
            // 조회 실패 시 기본값 사용 (fallback)
            currentRealPrice = getFallbackPrice(currentCoinName);
        }
    } catch (e) {
        console.error("가격 조회 실패, 기본값 사용", e);
        currentRealPrice = getFallbackPrice(currentCoinName);
    }
}

// ============================================
// 봇 제어 (START / STOP)
// ============================================

async function startBot() {
    if(isRunning) return;
    
    // [중요] 시작하기 전에 최신 가격을 가져옴!
    document.getElementById('bot-status').innerText = "가격 분석중...";
    await fetchCurrentPrice(); 

    isRunning = true;

    // UI 변경
    document.getElementById('btn-start').style.background = '#334155';
    document.getElementById('btn-start').style.color = '#94a3b8';
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').style.cursor = 'not-allowed';
    
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444';
    document.getElementById('btn-stop').style.color = '#fff';
    document.getElementById('btn-stop').style.cursor = 'pointer';

    document.getElementById('bot-status').innerText = "가동중...";
    document.getElementById('bot-status').style.color = "#10b981";
    document.getElementById('bot-status').style.border = "1px solid #10b981";
    
    document.getElementById('empty-msg').style.display = 'none';

    runTradeLoop();
}

function stopBot() {
    if(!isRunning) return;
    isRunning = false;
    clearTimeout(tradeInterval);

    // UI 복구
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').style.background = '#10b981';
    document.getElementById('btn-start').style.color = '#fff';
    document.getElementById('btn-start').style.cursor = 'pointer';

    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.background = '#334155';
    document.getElementById('btn-stop').style.color = '#94a3b8';
    document.getElementById('btn-stop').style.cursor = 'not-allowed';

    document.getElementById('bot-status').innerText = "일시정지";
    document.getElementById('bot-status').style.color = "#f59e0b";
    document.getElementById('bot-status').style.border = "1px solid #f59e0b";
}

function runTradeLoop() {
    if(!isRunning) return;

    // 1. 거래 실행
    executeTrade();

    // 2. 다음 거래 예약 (랜덤 시간)
    const nextTradeTime = Math.floor(Math.random() * 2500) + 1500;
    tradeInterval = setTimeout(runTradeLoop, nextTradeTime);
}

// ============================================
// 거래 로직 (실시간 가격 반영)
// ============================================

function executeTrade() {
    const tbody = document.getElementById('history-list-body');
    if(!tbody) return;

    // 1. 시간 생성
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // [핵심 수정] 실시간 가격(currentRealPrice)을 기준으로 미세 변동 생성
    // 실제 가격의 ±0.1% 범위 내에서 랜덤하게 체결가 생성 (아주 리얼함)
    const variation = currentRealPrice * 0.001; 
    const tradePrice = currentRealPrice + (Math.random() * variation * 2 - variation);
    
    // 포지션 결정
    const isBuy = Math.random() > 0.5;
    const typeText = isBuy ? `${currentCoinName} 롱` : `${currentCoinName} 숏`;
    const color = isBuy ? '#10b981' : '#ef4444';

    // 결과 판정 (승/패)
    const isWin = Math.random() > 0.35; // 승률 조절
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

    // 2. HTML 추가
    const row = document.createElement('tr');
    row.style.borderBottom = "1px solid #334155";
    row.style.animation = "fadeIn 0.5s";

    const displayPrice = tradePrice < 100 ? tradePrice.toFixed(2) : Math.floor(tradePrice).toLocaleString();
    const resultColor = isWin ? '#10b981' : '#ef4444';
    const resultText = isWin ? `+${profitAmount.toLocaleString()}` : `${profitAmount.toLocaleString()}`;

    row.innerHTML = `
        <td style="padding:12px; color:#94a3b8; text-align:center;">${timeStr}</td>
        <td style="padding:12px; color:${color}; font-weight:800; text-align:center;">${typeText}</td>
        <td style="padding:12px; color:#fff; font-weight:bold; text-align:center;">${displayPrice}</td>
        <td style="padding:12px; color:${resultColor}; font-weight:bold; text-align:center;">${resultText}</td>
    `;

    tbody.insertBefore(row, tbody.firstChild);

    if(tbody.children.length > 15) {
        tbody.removeChild(tbody.lastChild);
    }

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

function clearHistory() {
    document.getElementById('history-list-body').innerHTML = '';
    stats = { profit: 0, wins: 0, losses: 0, total: 0 };
    updateDashboard();
    document.getElementById('empty-msg').style.display = 'block';
    stopBot();
}

// [헬퍼] API 실패시 사용할 백업 가격표
function getFallbackPrice(coin) {
    const prices = {
        'BTC': 98000000, 'ETH': 3800000, 'XRP': 1500, 'SOL': 210000,
        'DOGE': 180, 'ADA': 800, 'DOT': 12000, 'AVAX': 55000, 'TRX': 150
    };
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
        new TradingView.widget({
            "container_id": "tv_chart",
            "symbol": symbol,
            "interval": "60",
            "theme": "dark",
            "autosize": true,
            "locale": "ko",
            "toolbar_bg": "#020617",
            "hide_side_toolbar": true,
            "allow_symbol_change": false,
            "save_image": false
        });
    }
}
