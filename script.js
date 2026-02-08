/* script.js - 국내/해외 시장 완벽 통합 버전 */
const ROOT_URL = "https://minetia.github.io/";
let currentMarket = "KRW"; // 현재 선택된 시장 (KRW 또는 USDT)
let domesticCoins = ["BTC", "ETH", "XRP", "DOGE", "SOL", "ADA"];
let foreignCoins = ["BTC", "ETH", "BNB", "XRP", "SOL", "LINK"];

window.addEventListener('load', async () => {
    // 1. 헤더/네비 로드
    const targets = [{ id: 'header-placeholder', file: 'header.html' }, { id: 'nav-placeholder', file: 'nav.html' }];
    for (const t of targets) {
        try {
            const r = await fetch(ROOT_URL + t.file);
            document.getElementById(t.id).innerHTML = await r.text();
        } catch(e) {}
    }
    
    // 2. 버튼 클릭 이벤트 연결
    const btns = document.querySelectorAll('.m-btn');
    btns.forEach((btn, idx) => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMarket = (idx === 0) ? "KRW" : "USDT";
            document.getElementById('market-title').innerText = currentMarket === "KRW" ? "국내 실시간 시세" : "해외 실시간 시세";
            updatePrices(); // 즉시 갱신
        };
    });

    // 3. 시세 무한 루프 시작
    updatePrices();
});

async function updatePrices() {
    const container = document.getElementById('price-container');
    if (!window.axios) return setTimeout(updatePrices, 500);

    try {
        let html = "";
        
        if (currentMarket === "KRW") {
            // --- 국내 시장 (업비트 API) ---
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=${domesticCoins.map(c => 'KRW-' + c).join(',')}`);
            html = res.data.map(coin => {
                const name = coin.market.split('-')[1];
                const change = coin.signed_change_rate * 100;
                return renderItem(name, coin.trade_price, change, "KRW");
            }).join('');
            
        } else {
            // --- 해외 시장 (바이낸스 API) ---
            // 해외 시세는 바이낸스에서 직접 가져옵니다.
            const res = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(foreignCoins.map(c => c + 'USDT'))}`);
            html = res.data.map(coin => {
                const name = coin.symbol.replace('USDT', '');
                const price = parseFloat(coin.lastPrice);
                const change = parseFloat(coin.priceChangePercent);
                return renderItem(name, price, change, "USDT");
            }).join('');
        }
        
        container.innerHTML = html;
    } catch (e) {
        console.log("시세 로딩 에러:", e);
    }
    
    // 1초마다 갱신 (탭이 활성화되어 있을 때만 실행)
    setTimeout(updatePrices, 1000);
}

// 아이템 그리기 함수 (중복 제거)
function renderItem(name, price, change, unit) {
    const color = change > 0 ? '#10b981' : (change < 0 ? '#ef4444' : '#fff');
    const formattedPrice = unit === "KRW" ? price.toLocaleString() : price.toFixed(2);
    const link = `practice/index.html?coin=${name}&symbol=BINANCE:${name}USDT`;
    
    return `
        <div class="price-item" onclick="location.href='${link}'">
            <div>
                <div style="font-weight:bold; font-size:1.1rem;">${name}</div>
                <div style="font-size:0.8rem; color:#64748b;">${unit === "KRW" ? 'Upbit / KRW' : 'Binance / USDT'}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:bold; color:${color};">${formattedPrice} <span style="font-size:0.7rem;">${unit}</span></div>
                <div style="font-size:0.8rem; color:${color};">${change > 0 ? '+' : ''}${change.toFixed(2)}%</div>
            </div>
        </div>
    `;
}
