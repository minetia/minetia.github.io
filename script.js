/* script.js */
const BASE = "https://minetia.github.io/";
let allCoinData = [];
let currentPage = 1;
const itemsPerPage = 20;

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

async function fetchCoinData(marketType) {
    const list = document.getElementById('coinList');
    const pagenav = document.getElementById('pagination-container');
    
    // 초기화
    list.innerHTML = `<div style="grid-column:span 2; text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>`;
    pagenav.innerHTML = '';
    
    // 화면 맨 위로 스크롤
    const mainArea = document.querySelector('main');
    if(mainArea) mainArea.scrollTop = 0;

    try {
        let rawData = [];
        
        if (marketType === 'UPBIT') {
            // 업비트 로직
            const markets = await axios.get('https://api.upbit.com/v1/market/all?isDetails=false');
            const krwMarkets = markets.data.filter(m => m.market.startsWith('KRW-')).slice(0, 200);
            const codes = krwMarkets.map(m => m.market).join(',');
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=${codes}`);
            rawData = res.data.map(t => ({
                sym: t.market.split('-')[1], price: Math.floor(t.trade_price).toLocaleString(),
                change: (t.signed_change_rate * 100).toFixed(2), ex: 'UPBIT', pair: 'KRW'
            }));

        } else if (marketType === 'BINANCE') {
            // 바이낸스 로직
            const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
            const usdtMarkets = res.data.filter(t => t.symbol.endsWith('USDT')).slice(0, 200);
            rawData = usdtMarkets.map(t => ({
                sym: t.symbol.replace('USDT', ''), price: parseFloat(t.lastPrice).toLocaleString(),
                change: parseFloat(t.priceChangePercent).toFixed(2), ex: 'BINANCE', pair: 'USDT'
            }));

        } else {
            // 나머지 거래소 (API 없음)
            list.innerHTML = `<div style="grid-column:span 2; text-align:center; padding:40px; color:#64748b;">
                <i class="fas fa-tools fa-2x"></i><br><br>
                <b>${marketType}</b><br>API 연동 준비 중입니다.
            </div>`;
            return;
        }

        allCoinData = rawData;
        currentPage = 1;
        renderPage(1);

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div style="text-align:center; color:red;">데이터 통신 오류</div>`;
    }
}

function renderPage(page) {
    currentPage = page;
    const list = document.getElementById('coinList');
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = allCoinData.slice(start, end);

    list.innerHTML = pageData.map(d => {
        const isUp = parseFloat(d.change) >= 0;
        const color = isUp ? '#10b981' : '#ef4444';
        const arrow = isUp ? '▲' : '▼';
        return `
            <div class="coin-item" onclick="location.href='${BASE}coin/modal.html?symbol=${d.ex}:${d.sym}${d.pair}&coin=${d.sym}'">
                <div style="color:#94a3b8; font-size:0.8rem; margin-bottom:5px;">${d.sym}</div>
                <div style="color:#fff; font-size:1.1rem; font-weight:800; margin-bottom:5px;">${d.price}</div>
                <div style="color:${color}; font-size:0.9rem; font-weight:700;">${arrow} ${d.change}%</div>
            </div>`;
    }).join('');

    renderPagination();
    document.querySelector('main').scrollTop = 0;
}

function renderPagination() {
    const container = document.getElementById('pagination-container');
    const totalPages = Math.ceil(allCoinData.length / itemsPerPage);
    let html = '';
    // 심플하게 10페이지까지만 제한 (너무 많아지는 것 방지)
    const maxPage = Math.min(totalPages, 10);
    
    for(let i=1; i<=maxPage; i++) {
        const active = i === currentPage ? 'active' : '';
        html += `<button class="page-btn ${active}" onclick="renderPage(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

function initTradingView(symbol) {
    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": symbol, "interval": "1", "theme": "dark", "autosize": true, "locale": "ko", "toolbar_bg": "#020617", "hide_side_toolbar": true
        });
    }
}
