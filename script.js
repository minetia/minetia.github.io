/* script.js (일반 모드: 화면 꺼짐 방지 + 좀비 복구 기능 탑재) */
const ROOT_URL = "https://minetia.github.io/";

let isRunning = false;
let tradeInterval = null;
let currentPrice = 0;
let balance = 0; // 초기값은 HTML에서 읽어옴
let tradeCount = 0;
let winCount = 0;
let wakeLock = null; // 화면 유지용

// 초기화
window.onload = async () => {
    await includeResources([
        { id: 'header-placeholder', file: 'header.html' },
        { id: 'nav-placeholder', file: 'nav.html' }
    ]);
    
    // 차트 로드
    new TradingView.widget({ "container_id": "tv_chart", "symbol": "BINANCE:BTCUSDT", "interval": "1", "theme": "dark", "autosize": true, "toolbar_bg": "#0f172a", "hide_side_toolbar": true, "save_image": false });

    // 검색창 엔터키 연결
    const searchInput = document.getElementById('header-search-input');
    if(searchInput) {
        searchInput.onkeyup = function(e) { if(e.key === 'Enter') searchCoin(); };
    }

    // 초기 투자금 읽기
    const balanceText = document.getElementById('balance').innerText.replace(/,/g, '').replace(' KRW', '');
    balance = Number(balanceText) || 50000000;

    // [중요] 저장된 상태 불러오기 (시간 여행)
    loadState();
    
    // 가격 실시간 조회 시작
    fetchPriceLoop();

    // [중요] 화면 다시 켜졌을 때 복구
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === 'visible' && isRunning) {
            recoverTimeGap();
            requestWakeLock();
        }
    });
};

async function includeResources(targets) {
    const promises = targets.map(t => fetch(`${ROOT_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html })));
    const results = await Promise.all(promises);
    results.forEach(res => { const el = document.getElementById(res.id); if(el) el.innerHTML = res.html; });
}

// 화면 유지 요청
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) { console.log(err); }
}

async function fetchPriceLoop() {
    try {
        // 현재는 BTC 고정 (검색 기능이 URL 파라미터로 넘겨주면 좋지만, 일단 기본값)
        const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-BTC`);
        if(res.data && res.data.length > 0) {
            currentPrice = res.data[0].trade_price;
            
            // 헤더에 가격 표시 공간이 있다면 업데이트 (일반 모드는 보통 헤더에 없음)
            // 필요하다면 여기에 추가
        }
    } catch(e) {}
    
    setTimeout(fetchPriceLoop, 1000);
}

// 검색 기능 (일반 모드용)
window.searchCoin = function() {
    const input = document.getElementById('header-search-input');
    if (!input) return;
    let symbol = input.value.toUpperCase().trim();
    if (!symbol) { alert("코인명을 입력해주세요."); return; }
    
    // 일반 모드는 차트만 바꿈 (간단하게 처리)
    new TradingView.widget({ "container_id": "tv_chart", "symbol": `BINANCE:${symbol}USDT`, "interval": "1", "theme": "dark", "autosize": true, "toolbar_bg": "#0f172a", "hide_side_toolbar": true, "save_image": false });
}

// 매매 시작
function startTrading() {
    if(isRunning) return;
    isRunning = true;
    
    requestWakeLock(); // 화면 유지
    
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').style.backgroundColor = '#334155';
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').style.backgroundColor = '#ef4444';

    runAutoTrade();
    saveState();
}

// 매매 중지
function stopTrading() {
    isRunning = false;
    clearTimeout(tradeInterval);
    
    if (wakeLock !== null) {
        wakeLock.release().then(() => { wakeLock = null; });
    }

    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').style.backgroundColor = '#2563eb';
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').style.backgroundColor = '#334155';
    
    saveState();
}

// 자동 매매 루프
function runAutoTrade() {
    if(!isRunning) return;

    // 가격이 로딩된 상태여야만 매매
    if(currentPrice > 0) {
        executeTrade();
        saveState();
    }

    // 속도: 1초 ~ 2초
    const nextTime = Math.random() * 1000 + 1000;
    tradeInterval = setTimeout(runAutoTrade, nextTime);
}

// 매매 실행 로직
function executeTrade() {
    const isWin = Math.random() < 0.55; // 승률 55%
    const betAmount = 1000000; // 1회 베팅금 100만원 고정
    const fee = betAmount * 0.001; // 수수료
    const percent = (Math.random() * 0.005) + 0.003; // 변동폭

    let profit = 0;
    if(isWin) profit = Math.floor(betAmount * percent) - fee;
    else profit = -Math.floor(betAmount * (percent * 0.8)) - fee;

    balance += profit;
    tradeCount++;
    if(profit > 0) winCount++;

    updateUI(profit);
    addLog(profit);
}

// UI 업데이트
function updateUI(profit) {
    document.getElementById('balance').innerText = balance.toLocaleString() + " KRW";
    
    const profitEl = document.getElementById('profit');
    const profitVal = balance - 50000000; // 원금 5천만원 기준
    profitEl.innerText = (profitVal > 0 ? '+' : '') + profitVal.toLocaleString();
    profitEl.style.color = profitVal >= 0 ? '#10b981' : '#ef4444';

    const winRateEl = document.getElementById('win-rate');
    const rate = tradeCount > 0 ? ((winCount / tradeCount) * 100).toFixed(1) : 0;
    winRateEl.innerText = rate + "%";
}

// 로그 추가
function addLog(profit) {
    const tbody = document.getElementById('log-table');
    const row = document.createElement('tr');
    
    const now = new Date().toTimeString().split(' ')[0];
    const type = Math.random() > 0.5 ? "롱" : "숏";
    const color = profit >= 0 ? '#10b981' : '#ef4444';
    const sign = profit >= 0 ? '+' : '';

    row.innerHTML = `
        <td style="padding:10px; color:#94a3b8;">${now}</td>
        <td style="padding:10px; font-weight:bold;">${type}</td>
        <td style="padding:10px; text-align:right; color:${color}; font-weight:bold;">
            ${sign}${profit.toLocaleString()}
        </td>
    `;

    tbody.prepend(row);
    if(tbody.children.length > 30) tbody.removeChild(tbody.lastChild);
}

// [핵심] 상태 저장
function saveState() {
    const state = {
        isRunning: isRunning,
        lastTime: Date.now(),
        balance: balance,
        tradeCount: tradeCount,
        winCount: winCount
    };
    localStorage.setItem('GENERAL_AI_STATE', JSON.stringify(state));
}

// [핵심] 상태 불러오기 + 시간 복구
function loadState() {
    const saved = localStorage.getItem('GENERAL_AI_STATE');
    if(!saved) return;
    const state = JSON.parse(saved);

    balance = state.balance || 50000000;
    tradeCount = state.tradeCount || 0;
    winCount = state.winCount || 0;
    
    updateUI(0); // UI 초기화

    if(state.isRunning) {
        isRunning = true;
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-start').style.backgroundColor = '#334155';
        document.getElementById('btn-stop').disabled = false;
        document.getElementById('btn-stop').style.backgroundColor = '#ef4444';
        
        recoverTimeGap(); // 로드 직후 복구 시도
        runAutoTrade();
    }
}

// [핵심] 좀비 복구 (부재중 매매 처리)
function recoverTimeGap() {
    const saved = localStorage.getItem('GENERAL_AI_STATE');
    if(!saved) return;
    const state = JSON.parse(saved);

    const now = Date.now();
    const diff = now - state.lastTime;

    // 2초 이상 멈췄었다면 복구
    if(diff > 2000 && state.isRunning) {
        const missedTrades = Math.floor(diff / 1500); // 1.5초당 1회
        const simulateCount = Math.min(missedTrades, 200);

        if(simulateCount > 0) {
            for(let i=0; i<simulateCount; i++) {
                // UI 갱신 없이 계산만 빠르게 수행
                const isWin = Math.random() < 0.55;
                const betAmount = 1000000;
                const fee = betAmount * 0.001;
                const percent = (Math.random() * 0.005) + 0.003;
                let profit = 0;
                
                if(isWin) profit = Math.floor(betAmount * percent) - fee;
                else profit = -Math.floor(betAmount * (percent * 0.8)) - fee;

                balance += profit;
                tradeCount++;
                if(profit > 0) winCount++;
                
                // 마지막 1건은 로그에 표시
                if(i === simulateCount - 1) {
                    addLog(profit);
                    updateUI(profit);
                }
            }
            console.log(`[General AI] ${simulateCount}건 복구 완료`);
            // 알림은 너무 자주 뜨면 귀찮으니 로그만 남김 (또는 필요시 alert 추가)
        }
        saveState();
    }
}
