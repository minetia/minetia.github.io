/* script.js */
const BASE = "https://minetia.github.io/";

// 1. 공통 인클루드 함수 (헤더, 네비, 엔진 등)
async function includeResources(targets) {
    const promises = targets.map(t => 
        fetch(`${BASE}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html }))
    );
    
    const results = await Promise.all(promises);
    results.forEach(res => {
        const el = document.getElementById(res.id);
        if (el) el.innerHTML = res.html;
    });

    // 인클루드된 영역 내부의 스크립트 강제 깨우기
    targets.forEach(t => {
        const container = document.getElementById(t.id);
        if (container) {
            container.querySelectorAll('script').forEach(oldS => {
                const newS = document.createElement('script');
                newS.text = oldS.text;
                document.head.appendChild(newS).parentNode.removeChild(newS);
            });
        }
    });
}

// 2. 메인 페이지 코인 데이터 호출 로직
async function fetchCoinData(marketType = 'krw') {
    const list = document.getElementById('coinList');
    if (!list) return;

    try {
        if (marketType === 'krw') {
            const res = await axios.get('https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL');
            list.innerHTML = res.data.map(t => createItem(t.market.split('-')[1], t.trade_price.toLocaleString() + " 원", (t.signed_change_rate*100).toFixed(2), "UPBIT", "KRW")).join('');
        } else {
            const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","XRPUSDT","SOLUSDT"]');
            list.innerHTML = res.data.map(t => createItem(t.symbol.replace("USDT",""), "$ " + parseFloat(t.lastPrice).toLocaleString(), parseFloat(t.priceChangePercent).toFixed(2), "BINANCE", "USDT")).join('');
        }
    } catch (e) { console.error("Data Fetch Error", e); }
}

function createItem(sym, price, change, ex, pair) {
    return `
        <div class="coin-item" onclick="location.href='${BASE}coin/modal.html?symbol=${ex}:${sym}${pair}&coin=${sym}'">
            <div style="font-size:0.75rem; color:#94a3b8;">${sym} / ${ex}</div>
            <div style="font-weight:800;">${price}</div>
            <div class="${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '+' : ''}${change}%</div>
        </div>`;
}

// 3. 모달용 차트 초기화
function initTradingView(symbol) {
    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
            "container_id": "tv_chart",
            "symbol": symbol,
            "interval": "1",
            "theme": "dark",
            "autosize": true,
            "locale": "ko",
            "toolbar_bg": "#020617"
        });
    }
}
