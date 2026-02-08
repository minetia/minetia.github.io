/* coin-script.js (루트 경로에 저장) */

// 기본 주소 설정
const BASE_URL = "https://minetia.github.io/";

window.onload = async () => {
    // 1. 헤더/푸터 불러오기 (루트 경로에서)
    await includeResources([
        { id: 'header-placeholder', file: 'header.html' },
        { id: 'nav-placeholder', file: 'nav.html' }
    ]);

    // 2. URL 파라미터 읽기
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    const coinName = params.get('coin') || 'BTC';

    // 3. 화면 업데이트
    const titleEl = document.getElementById('coin-name-display');
    if(titleEl) titleEl.innerText = coinName;

    // 4. 차트 실행
    initTradingView(symbol);

    // 5. 가짜 데이터 채우기
    loadFakeHistory();
};

// 인클루드 함수
async function includeResources(targets) {
    const promises = targets.map(t => 
        fetch(`${BASE_URL}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html }))
    );
    const results = await Promise.all(promises);
    results.forEach(res => {
        const el = document.getElementById(res.id);
        if (el) el.innerHTML = res.html;
    });
}

// 트레이딩뷰 차트
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

// 뒤로가기 (메인으로 이동)
function goBack() {
    location.href = BASE_URL + "index.html";
}

// 체결 내역 (더미)
function loadFakeHistory() {
    const tbody = document.getElementById('history-body');
    if(!tbody) return;
    
    let html = '';
    for(let i=0; i<5; i++) {
        const type = i % 2 === 0 ? '매수' : '매도';
        const color = type === '매수' ? '#ef4444' : '#3b82f6';
        const price = (98000000 + (Math.random()*100000)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        
        html += `
            <tr>
                <td style="color:#cbd5e1">14:0${i}</td>
                <td style="color:${color}; font-weight:bold;">${type}</td>
                <td>${price}</td>
                <td>0.012</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}
