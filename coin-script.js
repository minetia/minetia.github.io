/* coin-script.js (루트 폴더) */
const ROOT_URL = "https://minetia.github.io/";

// 전역 변수 (페이징용)
let fullHistoryData = [];
let currentHistoryPage = 1;
const historyPerPage = 15;
let currentCoinName = "BTC"; // 현재 코인 이름

window.onload = async () => {
    // 1. 인클루드
    await includeResources([
        { id: 'header-placeholder', file: 'header.html' },
        { id: 'nav-placeholder', file: 'nav.html' },
        { id: 'history-placeholder', file: 'history.html' } 
    ]);

    // 2. 코인 정보 읽기
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    currentCoinName = params.get('coin') || 'BTC'; // 코인명 저장
    
    const titleEl = document.getElementById('coin-name-display');
    if(titleEl) titleEl.innerText = currentCoinName;

    // 3. 차트 실행
    initTradingView(symbol);

    // 4. 데이터 생성 및 1페이지 렌더링
    generateAllHistoryData();
    renderHistoryPage(1);
};

// 리소스 인클루드
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

// [1] 데이터 100개 생성 (한 번만 실행)
function generateAllHistoryData() {
    fullHistoryData = [];
    let now = new Date();

    for(let i=0; i<100; i++) {
        // 시간 조금씩 과거로
        now.setSeconds(now.getSeconds() - Math.floor(Math.random() * 120)); 
        const timeStr = now.toTimeString().split(' ')[0];

        const isBuy = Math.random() > 0.5;
        
        // [요청 반영] AI 빼고 코인명 넣기
        const typeText = isBuy ? `${currentCoinName} 매수` : `${currentCoinName} 매도`;
        
        const color = isBuy ? '#ef4444' : '#3b82f6'; // 빨강/파랑
        const price = (98000000 + Math.floor(Math.random() * 500000)).toLocaleString();
        const amount = (Math.random() * 0.5 + 0.001).toFixed(4);

        fullHistoryData.push({
            time: timeStr,
            type: typeText,
            color: color,
            price: price,
            amount: amount
        });
    }
}

// [2] 특정 페이지 그리기 (15개씩 자르기)
function renderHistoryPage(page) {
    currentHistoryPage = page;
    const tbody = document.getElementById('history-list-body');
    if(!tbody) return;

    // 데이터 자르기 (Slice)
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

    // 버튼 업데이트
    renderHistoryPagination();
}

// [3] 페이지 번호 버튼 만들기
function renderHistoryPagination() {
    const container = document.getElementById('history-pagination');
    if(!container) return;

    const totalPages = Math.ceil(fullHistoryData.length / historyPerPage); // 100개 / 15개 = 7페이지
    let html = '';

    for(let i=1; i<=totalPages; i++) {
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
