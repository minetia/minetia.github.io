/* script.js - 최종 통합본 */
const BASE = "https://minetia.github.io/";

// ============================================================
// 1. 공통 리소스 (헤더, 네비) 로더
// ============================================================
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

// ============================================================
// 2. [핵심] 코인 데이터 API 호출 (업비트/바이낸스)
// ============================================================
async function fetchCoinData(marketType) {
    const list = document.getElementById('coinList');
    if (!list) return; // 리스트 영역이 없으면 중단

    // 로딩 표시
    list.innerHTML = `<div style="grid-column:span 2; text-align:center; padding:50px; color:#666;"><i class="fas fa-circle-notch fa-spin"></i> 로딩 중...</div>`;

    try {
        let html = '';
        let data = [];

        if (marketType === 'UPBIT') {
            // [업비트] KRW 마켓 100개
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

        } else {
            // [바이낸스] USDT 마켓 100개
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
        list.innerHTML = data.map(d => createCoinItem(d.sym, d.price, d.change, d.ex, d.pair)).join('');

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div style="color:red; text-align:center; grid-column:span 2;">API 연결 실패</div>`;
    }
}

// 코인 카드 디자인 (여기가 디자인의 핵심!)
function createCoinItem(sym, price, change, ex, pair) {
    const isUp = change >= 0;
    const color = isUp ? '#10b981' : '#ef4444'; // 상승:초록, 하락:빨강
    const arrow = isUp ? '▲' : '▼';
    
    // 클릭하면 상세 페이지(modal.html)로 이동
    return `
        <div class="coin-item" onclick="location.href='${BASE}coin/modal.html?symbol=${ex}:${sym}${pair}&coin=${sym}'"
             style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px;">${sym}</div>
            <div style="font-size: 1.1rem; font-weight: 800; margin-bottom: 5px; color: #fff;">${price} <span style="font-size:0.6rem;">${pair}</span></div>
            <div style="color: ${color}; font-size: 0.9rem; font-weight: 700;">${arrow} ${change}%</div>
        </div>`;
}

// ============================================================
// 3. [상세 페이지] 차트 실행기
// ============================================================
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
