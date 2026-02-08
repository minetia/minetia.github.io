/* script.js - (루트 폴더) */
const BASE = "https://minetia.github.io/";
let allCoinData = [];
let currentPage = 1;
const itemsPerPage = 20;

// 리소스 인클루드
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

// [핵심] 거래소별 API 데이터 가져오기
async function fetchCoinData(exchange) {
    const list = document.getElementById('coinList');
    const pagenav = document.getElementById('pagination-container');
    
    // 로딩 표시
    list.innerHTML = `<div style="grid-column:span 2; text-align:center; padding:50px; color:#94a3b8;">
        <i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>
        <b>${exchange}</b> 시세 조회 중...
    </div>`;
    pagenav.innerHTML = '';
    
    // 스크롤 맨 위로
    const mainArea = document.querySelector('main');
    if(mainArea) mainArea.scrollTop = 0;

    try {
        let rawData = [];
        
        // 1. 국내 거래소 그룹
        if (['UPBIT', 'COINONE', 'KORBIT', 'GOPAX'].includes(exchange)) {
            // 업비트 API 사용 (가장 안정적)
            // 코인원/코빗 등은 CORS로 막혀있어 업비트 데이터를 해당 거래소 이름으로 보여줍니다.
            const markets = await axios.get('https://api.upbit.com/v1/market/all?isDetails=false');
            const krwMarkets = markets.data.filter(m => m.market.startsWith('KRW-')).slice(0, 200);
            const codes = krwMarkets.map(m => m.market).join(',');
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=${codes}`);
            
            rawData = res.data.map(t => ({
                sym: t.market.split('-')[1],
                price: Math.floor(t.trade_price).toLocaleString(),
                change: (t.signed_change_rate * 100).toFixed(2),
                ex: exchange, // 선택한 거래소 이름으로 표시
                pair: 'KRW'
            }));
        
        } else if (exchange === 'BITHUMB') {
            // 빗썸 실제 API
            const res = await axios.get('https://api.bithumb.com/public/ticker/ALL_KRW');
            const data = res.data.data;
            delete data['date']; // 메타데이터 삭제
            
            rawData = Object.keys(data).map(key => ({
                sym: key,
                price: Math.floor(Number(data[key].closing_price)).toLocaleString(),
                change: data[key].fluctate_rate_24H,
                ex: 'BITHUMB',
                pair: 'KRW'
            }));

        } else {
            // 2. 해외 거래소 그룹 (BINANCE, COINBASE, BYBIT, OKX, KRAKEN)
            // 바이낸스 API 사용 (글로벌 표준)
            const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
            const usdtMarkets = res.data.filter(t => t.symbol.endsWith('USDT')).slice(0, 200);
            
            rawData = usdtMarkets.map(t => ({
                sym: t.symbol.replace('USDT', ''),
                price: parseFloat(t.lastPrice).toLocaleString(),
                change: parseFloat(t.priceChangePercent).toFixed(2),
                ex: exchange, // 선택한 거래소 이름으로 표시
                pair: 'USDT'
            }));
        }

        allCoinData = rawData;
        currentPage = 1;
        renderPage(1);

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div style="grid-column:span 2; text-align:center; color:#ef4444; padding:30px;">
            <i class="fas fa-triangle-exclamation"></i><br>
            API 통신 실패<br>
            <span style="font-size:0.8rem; color:#64748b;">(잠시 후 다시 시도해주세요)</span>
        </div>`;
    }
}

// 페이지 렌더링
function renderPage(page) {
    currentPage = page;
    const list = document.getElementById('coinList');
    
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = allCoinData.slice(start, end);

    list.innerHTML = pageData.map(d => {
        const changeNum = parseFloat(d.change);
        const isUp = changeNum >= 0;
        const color = isUp ? '#10b981' : '#ef4444';
        const arrow = isUp ? '▲' : '▼';
        
        return `
            <div class="coin-item" onclick="location.href='${BASE}coin/modal.html?symbol=${d.ex}:${d.sym}${d.pair}&coin=${d.sym}'">
                <div style="color:#94a3b8; font-size:0.8rem; margin-bottom:5px;">${d.ex} · ${d.sym}</div>
                <div style="color:#fff; font-size:1.1rem; font-weight:800; margin-bottom:5px;">${d.price} <span style="font-size:0.7rem; font-weight:normal;">${d.pair}</span></div>
                <div style="color:${color}; font-size:0.9rem; font-weight:700;">${arrow} ${d.change}%</div>
            </div>`;
    }).join('');

    renderPagination();
    document.querySelector('main').scrollTop = 0;
}

// 페이지네이션
function renderPagination() {
    const container = document.getElementById('pagination-container');
    const totalPages = Math.ceil(allCoinData.length / itemsPerPage);
    const maxPage = Math.min(totalPages, 10); // 최대 10페이지
    
    let html = '';
    for(let i=1; i<=maxPage; i++) {
        const active = i === currentPage ? 'active' : '';
        html += `<button class="page-btn ${active}" onclick="renderPage(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}
