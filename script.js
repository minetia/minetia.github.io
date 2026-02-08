/* script.js - 완전체 엔진 */
const BASE = "https://minetia.github.io/";
let allCoinData = [];  // 전체 데이터 저장소
let currentPage = 1;   // 현재 페이지
const itemsPerPage = 20; // 페이지당 20개

// 1. 리소스 인클루드
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

// 2. 데이터 가져오기 (200개)
async function fetchCoinData(marketType) {
    const list = document.getElementById('coinList');
    const pagenav = document.getElementById('pagination-container');
    
    list.innerHTML = `<div style="grid-column:span 2; text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>`;
    pagenav.innerHTML = '';

    try {
        let rawData = [];
        
        if (marketType === 'UPBIT') {
            const markets = await axios.get('https://api.upbit.com/v1/market/all?isDetails=false');
            const krwMarkets = markets.data.filter(m => m.market.startsWith('KRW-')).slice(0, 200);
            const codes = krwMarkets.map(m => m.market).join(',');
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=${codes}`);
            
            rawData = res.data.map(t => ({
                sym: t.market.split('-')[1],
                price: Math.floor(t.trade_price).toLocaleString(),
                change: (t.signed_change_rate * 100).toFixed(2),
                ex: 'UPBIT', pair: 'KRW'
            }));

        } else if (marketType === 'BINANCE') {
            const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
            const usdtMarkets = res.data.filter(t => t.symbol.endsWith('USDT')).slice(0, 200);
            
            rawData = usdtMarkets.map(t => ({
                sym: t.symbol.replace('USDT', ''),
                price: parseFloat(t.lastPrice).toLocaleString(),
                change: parseFloat(t.priceChangePercent).toFixed(2),
                ex: 'BINANCE', pair: 'USDT'
            }));
        } else {
            alert("준비 중입니다.");
            list.innerHTML = "";
            return;
        }

        allCoinData = rawData;
        currentPage = 1;
        renderPage(1);

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div style="text-align:center; color:red;">데이터 로드 실패</div>`;
    }
}

// 3. 페이지 그리기 (20개씩 자르기)
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
    document.querySelector('main').scrollTop = 0; // 맨 위로
}

// 4. 페이지 번호 버튼 생성
function renderPagination() {
    const container = document.getElementById('pagination-container');
    const totalPages = Math.ceil(allCoinData.length / itemsPerPage);
    
    // 너무 많으면 5개씩 끊거나 해야하지만, 일단 1~10까지 다 보여줌
    let html = '';
    for(let i=1; i<=totalPages; i++) {
        const active = i === currentPage ? 'active' : '';
        html += `<button class="page-btn ${active}" onclick="renderPage(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

// 5. 차트 실행
function initTradingView(symbol) {
    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": symbol, "interval": "1", "theme": "dark", "autosize": true, "locale": "ko", "toolbar_bg": "#020617", "hide_side_toolbar": true
        });
    }
}
