/* coin-script.js (루트 폴더) */
const ROOT_URL = "https://minetia.github.io/";

// [상태 변수]
let currentCoinName = "BTC";
let isRunning = false;
let tradeInterval = null;

// [통계 변수]
let stats = {
    profit: 0,   // 총 수익금
    wins: 0,     // 승리 횟수
    losses: 0,   // 패배 횟수
    total: 0     // 총 거래 횟수
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

    // 4. 버전 표시 업데이트
    updateAiVersion();
};

// 인클루드 함수
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
// [핵심] 봇 제어 기능 (START / STOP)
// ============================================

function startBot() {
    if(isRunning) return;
    isRunning = true;

    // UI 변경
    document.getElementById('btn-start').style.background = '#334155';
    document.getElementById('btn-start').style.color = '#94a3b8';
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').style.cursor = 'not-allowed';
    document.getElementById('btn-start').style.boxShadow = 'none';

    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.background = '#ef4444'; // 빨간색
    document.getElementById('btn-stop').style.color = '#fff';
    document.getElementById('btn-stop').style.cursor = 'pointer';
    document.getElementById('btn-stop').style.boxShadow = '0 4px 0 #b91c1c';

    document.getElementById('bot-status').innerText = "가동중...";
    document.getElementById('bot-status').style.color = "#10b981";
    document.getElementById('bot-status').style.border = "1px solid #10b981";
    
    document.getElementById('empty-msg').style.display = 'none'; // 안내 문구 숨김

    // 매매 루프 시작 (1.5초 ~ 4초 랜덤 간격)
    runTradeLoop();
}

function stopBot() {
    if(!isRunning) return;
    isRunning = false;
    clearTimeout(tradeInterval); // 루프 정지

    // UI 복구
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').style.background = '#10b981';
    document.getElementById('btn-start').style.color = '#fff';
    document.getElementById('btn-start').style.cursor = 'pointer';
    document.getElementById('btn-start').style.boxShadow = '0 4px 0 #059669';

    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.background = '#334155';
    document.getElementById('btn-stop').style.color = '#94a3b8';
    document.getElementById('btn-stop').style.cursor = 'not-allowed';
    document.getElementById('btn-stop').style.boxShadow = 'none';

    document.getElementById('bot-status').innerText = "일시정지";
    document.getElementById('bot-status').style.color = "#f59e0b";
    document.getElementById('bot-status').style.border = "1px solid #f59e0b";
}

function runTradeLoop() {
    if(!isRunning) return;

    // 1. 거래 실행
    executeTrade();

    // 2. 다음 거래 예약 (랜덤 시간)
    const nextTradeTime = Math.floor(Math.random() * 2500) + 1500; // 1.5초 ~ 4초
    tradeInterval = setTimeout(runTradeLoop, nextTradeTime);
}

// ============================================
// [로직] 실제 거래 데이터 생성 및 정산
// ============================================

function executeTrade() {
    const tbody = document.getElementById('history-list-body');
    if(!tbody) return;

    // 1. 기본 데이터 생성
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const basePrice = getBasePrice(currentCoinName);
    
    // 가격 변동 (랜덤)
    const variation = basePrice * 0.005; // 0.5% 변동
    const tradePrice = basePrice + (Math.random() * variation * 2 - variation);
    
    // 포지션 결정 (매수/매도)
    const isBuy = Math.random() > 0.5;
    const typeText = isBuy ? `${currentCoinName} 롱` : `${currentCoinName} 숏`; // 롱/숏 용어 사용
    const color = isBuy ? '#10b981' : '#ef4444'; // 초록/빨강

    // 2. 결과 판정 (승/패)
    // 승률 조작 (약 70% 확률로 승리하게 설정)
    const isWin = Math.random() > 0.3; 
    let profitAmount = 0;

    if(isWin) {
        stats.wins++;
        // 수익금: 투자금(가정)의 0.5% ~ 2.0%
        profitAmount = Math.floor(basePrice * (Math.random() * 0.015 + 0.005));
    } else {
        stats.losses++;
        // 손실금: 투자금(가정)의 -0.5% ~ -1.5%
        profitAmount = -Math.floor(basePrice * (Math.random() * 0.01 + 0.005));
    }
    stats.total++;
    stats.profit += profitAmount;

    // 3. HTML 행 추가 (최상단에 추가)
    const row = document.createElement('tr');
    row.style.borderBottom = "1px solid #334155";
    row.style.animation = "fadeIn 0.5s"; // 깜빡임 효과

    // 가격 포맷팅
    const displayPrice = tradePrice < 100 ? tradePrice.toFixed(2) : Math.floor(tradePrice).toLocaleString();
    const resultColor = isWin ? '#10b981' : '#ef4444';
    const resultText = isWin ? `+${profitAmount.toLocaleString()}` : `${profitAmount.toLocaleString()}`;

    row.innerHTML = `
        <td style="padding:12px; color:#94a3b8; text-align:center;">${timeStr}</td>
        <td style="padding:12px; color:${color}; font-weight:800; text-align:center;">${typeText}</td>
        <td style="padding:12px; color:#fff; font-weight:bold; text-align:center;">${displayPrice}</td>
        <td style="padding:12px; color:${resultColor}; font-weight:bold; text-align:center;">${resultText}</td>
    `;

    tbody.insertBefore(row, tbody.firstChild); // 맨 위에 삽입

    // 15개 넘어가면 마지막꺼 삭제 (메모리 관리)
    if(tbody.children.length > 15) {
        tbody.removeChild(tbody.lastChild);
    }

    // 4. 대시보드 업데이트
    updateDashboard();
}

function updateDashboard() {
    // 총 손익
    const profitEl = document.getElementById('total-profit');
    const sign = stats.profit > 0 ? '+' : '';
    profitEl.innerText = `${sign}${stats.profit.toLocaleString()} KRW`;
    profitEl.style.color = stats.profit >= 0 ? '#10b981' : '#ef4444';

    // 승률
    const winRate = stats.total === 0 ? 0 : ((stats.wins / stats.total) * 100).toFixed(1);
    document.getElementById('win-rate').innerText = `${winRate}%`;
    document.getElementById('win-count').innerText = `${stats.wins}승`;
    document.getElementById('loss-count').innerText = `${stats.losses}패`;
}

function clearHistory() {
    // 기록 초기화
    document.getElementById('history-list-body').innerHTML = '';
    stats = { profit: 0, wins: 0, losses: 0, total: 0 };
    updateDashboard();
    document.getElementById('empty-msg').style.display = 'block';
    stopBot(); // 봇도 정지
}

// [헬퍼] 코인별 기준 가격
function getBasePrice(coin) {
    const prices = {
        'BTC': 98000000, 'ETH': 3800000, 'XRP': 1500, 'SOL': 210000,
        'DOGE': 180, 'ADA': 800, 'DOT': 12000, 'AVAX': 55000,
        'TRX': 150, 'SHIB': 0.03
    };
    return prices[coin] || 1000;
}

// [헬퍼] 버전 업데이트
function updateAiVersion() {
    const versionEl = document.getElementById('ai-version-display');
    if(versionEl) {
        const major = Math.floor(Math.random() * 3) + 5;
        const minor = Math.floor(Math.random() * 10);
        versionEl.innerText = `Neuro-Bot V${major}.${minor}`;
    }
}

// 차트 설정
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
