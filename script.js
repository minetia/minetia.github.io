/* script.js */
const BASE = "https://minetia.github.io/";

// 1. 공통 리소스 로더
async function includeResources(targets) {
    const promises = targets.map(t => 
        fetch(`${BASE}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html }))
    );
    const results = await Promise.all(promises);
    results.forEach(res => {
        const el = document.getElementById(res.id);
        if (el) el.innerHTML = res.html;
    });
}

// 2. [API] 코인 데이터 가져오기 (100개 제한)
async function fetchCoinData(marketType) {
    const list = document.getElementById('coinList');
    if (!list) return;

    // 로딩 중 표시 (바둑판 중앙에)
    list.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 60px; color: #64748b;">
        <i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>시세 로딩 중...
    </div>`;

    try {
        let data = [];
        // [업비트]
        if (marketType === 'UPBIT') {
            const markets = await axios.get('https://api.upbit.com/v1/market/all?isDetails=false');
            const krwMarkets = markets.data.filter(m => m.market.startsWith('KRW-')).slice(0, 100);
            const codes = krwMarkets.map(m => m.market).join(',');
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=${codes}`);
            
            data = res.data.map(t => ({
                sym: t.market.split('-')[1],
                price: Math.floor(t.trade_price).toLocaleString(),
                change: (t.signed_change_rate * 100).toFixed(2),
                ex: 'UPBIT',
                pair: 'KRW'
            }));
        } 
        // [바이낸스]
        else {
            const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
            const usdtMarkets = res.data.filter(t => t.symbol.endsWith('USDT')).slice(0, 100);
            
            data = usdtMarkets.map(t => ({
                sym: t.symbol.replace('USDT', ''),
                price: parseFloat(t.lastPrice).toLocaleString(),
                change: parseFloat(t.priceChangePercent).toFixed(2),
                ex: 'BINANCE',
                pair: 'USDT'
            }));
        }

        // HTML 생성
        list.innerHTML = data.map(d => createTileItem(d.sym, d.price, d.change, d.ex, d.pair)).join('');

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div style="grid-column: span 2; color: #ef4444; text-align: center;">데이터 로드 실패</div>`;
    }
}

// 3. [디자인] 바둑판 타일 HTML 만들기
function createTileItem(sym, price, change, ex, pair) {
    const isUp = parseFloat(change) >= 0;
    const colorClass = isUp ? 'text-up' : 'text-down';
    const arrow = isUp ? '▲' : '▼';
    
    // 클릭하면 modal.html로 이동
    return `
        <div class="coin-item" onclick="location.href='${BASE}coin/modal.html?symbol=${ex}:${sym}${pair}&coin=${sym}'">
            <div class="coin-symbol">${sym}</div>
            <div class="coin-price">${price}</div>
            <div class="coin-change ${colorClass}">
                ${arrow} ${change}%
            </div>
        </div>
    `;
}

// 4. 모달 차트 실행기 (modal.html용)
function initTradingView(symbol) {
    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
            "container_id": "tv_chart",
            "symbol": symbol,
            "interval": "1",
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
