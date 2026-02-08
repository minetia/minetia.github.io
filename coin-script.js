/* coin-script.js (루트 폴더) */
const ROOT_URL = "https://minetia.github.io/";

window.onload = async () => {
    // 1. 헤더, 네비, 그리고 [history.html] 가져오기
    await includeResources([
        { id: 'header-placeholder', file: 'header.html' },
        { id: 'nav-placeholder', file: 'nav.html' },
        { id: 'history-placeholder', file: 'history.html' } 
    ]);

    // 2. 코인 이름 등 기본 설정
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
    const coinName = params.get('coin') || 'BTC';
    
    const titleEl = document.getElementById('coin-name-display');
    if(titleEl) titleEl.innerText = coinName;

    // 3. 차트 실행
    initTradingView(symbol);

    // 4. 히스토리 데이터 채우기 (HTML 로드 후 실행)
    loadHistoryData();
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

// [데이터 생성]
function loadHistoryData() {
    const tbody = document.getElementById('history-list-body');
    if(!tbody) return;

    let html = '';
    let now = new Date();

    for(let i=0; i<15; i++) {
        now.setSeconds(now.getSeconds() - Math.floor(Math.random() * 60));
        const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
        
        const isBuy = Math.random() > 0.5; // 50:50 확률
        const type = isBuy ? 'AI 매수' : 'AI 매도';
        const color = isBuy ? '#ef4444' : '#3b82f6'; // 빨강/파랑
        
        // 가격 랜덤 생성 (천단위 콤마)
        const price = (98000000 + Math.floor(Math.random() * 500000)).toLocaleString();
        const amount = (Math.random() * 0.5 + 0.001).toFixed(4);

        html += `
            <tr style="border-bottom:1px solid #334155;">
                <td style="padding:12px; color:#94a3b8; text-align:center;">${timeStr}</td>
                <td style="padding:12px; color:${color}; font-weight:800; text-align:center;">${type}</td>
                <td style="padding:12px; color:#fff; font-weight:bold; text-align:center;">${price}</td>
                <td style="padding:12px; color:#cbd5e1; text-align:center;">${amount}</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
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
