/* coin-script.js (루트 폴더) */
const ROOT_URL = "https://minetia.github.io/";

let fullHistoryData = [];
let currentHistoryPage = 1;
const historyPerPage = 15;
let currentCoinName = "BTC";

window.onload = async () => {
    // 1. 인클루드
    await includeResources([
        { id: 'header-placeholder', file: 'header.html' },
        { id: 'nav-placeholder', file: 'nav.html' },
        { id: 'history-placeholder', file: 'history.html' } 
    ]);

    // 2. URL 파라미터 읽기
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    currentCoinName = params.get('coin') || 'BTC';
    
    // 코인 이름 표시
    const titleEl = document.getElementById('coin-name-display');
    if(titleEl) titleEl.innerText = currentCoinName;

    // 3. 차트 실행
    initTradingView(symbol);

    // 4. [NEW] AI 버전 업데이트 & 코인별 가격 생성
    updateAiVersion(); 
    generateAllHistoryData();
    renderHistoryPage(1);
};

// 리소스 인클루드 함수
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

// [1] AI 버전 랜덤 업데이트 (V5.1 ~ V9.9)
function updateAiVersion() {
    const versionEl = document.getElementById('ai-version-display');
    if(versionEl) {
        // 랜덤 버전 생성 (예: V5.3, V6.0)
        const major = Math.floor(Math.random() * 3) + 5; // 5 ~ 7
        const minor = Math.floor(Math.random() * 10);    // 0 ~ 9
        versionEl.innerText = `Neuro-Trading V${major}.${minor}`;
    }
}

// [2] 코인별 기준 가격 가져오기 (가격표)
function getBasePrice(coin) {
    const prices = {
        'BTC': 98000000,
        'ETH': 3800000,
        'XRP': 1500,
        'SOL': 210000,
        'DOGE': 180,
        'ADA': 800,
        'DOT': 12000,
        'AVAX': 55000,
        'TRX': 150,
        'SHIB': 0.03
    };
    // 목록에 없으면 기본값 1000원
    return prices[coin] || 1000; 
}

// [3] 데이터 100개 생성 (코인별 가격 적용)
function generateAllHistoryData() {
    fullHistoryData = [];
    let now = new Date();
    
    // 현재 코인의 기준 가격 가져오기
    const basePrice = getBasePrice(currentCoinName);

    for(let i=0; i<100; i++) {
        now.setSeconds(now.getSeconds() - Math.floor(Math.random() * 120)); 
        const timeStr = now.toTimeString().split(' ')[0];

        const isBuy = Math.random() > 0.5;
        const typeText = isBuy ? `${currentCoinName} 매수` : `${currentCoinName} 매도`;
        const color = isBuy ? '#ef4444' : '#3b82f6';
        
        // [중요] 기준 가격의 ±1% 범위 내에서 랜덤 가격 생성
        const variation = basePrice * 0.01; // 1% 변동폭
        const randomPrice = basePrice + (Math.random() * variation * 2 - variation);
        
        // 소수점 처리 (가격이 낮으면 소수점 표시)
        let finalPrice;
        if(basePrice < 100) finalPrice = randomPrice.toFixed(2); // 동전주
        else finalPrice = Math.floor(randomPrice).toLocaleString(); // 일반주

        // 수량 랜덤
        const amount = (Math.random() * 2 + 0.01).toFixed(4);

        fullHistoryData.push({
            time: timeStr,
            type: typeText,
            color: color,
            price: finalPrice,
            amount: amount
        });
    }
}

// [4] 페이지 렌더링 (15개씩)
function renderHistoryPage(page) {
    currentHistoryPage = page;
    const tbody = document.getElementById('history-list-body');
    if(!tbody) return;

    const start = (page - 1) * historyPerPage;
    const end = start + historyPerPage;
    const pageData = fullHistoryData.slice(start, end);

    let html = '';
    pageData.forEach(d => {
        html += `
            <tr>
                <td style="color:#94a3b8;">${d.time}</td>
                <td style="color:${d.color}; font-weight:800;">${d.type}</td>
                <td style="color:#fff; font-weight:bold;">${d.price}</td>
                <td style="color:#cbd5e1;">${d.amount}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    renderHistoryPagination();
}

// [5] 페이지 번호 버튼
function renderHistoryPagination() {
    const container = document.getElementById('history-pagination');
    if(!container) return;

    const totalPages = Math.ceil(fullHistoryData.length / historyPerPage);
    let html = '';

    // 최대 5페이지까지만 표시 (깔끔하게)
    const maxPage = Math.min(totalPages, 5);

    for(let i=1; i<=maxPage; i++) {
        const active = i === currentHistoryPage ? 'active' : '';
        html += `<button class="h-page-btn ${active}" onclick="renderHistoryPage(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

// 차트
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
