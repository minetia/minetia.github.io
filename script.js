/* script.js */
const BASE = "https://minetia.github.io/";
let allCoinData = []; // 전체 200개 데이터 저장소
let currentPage = 1;  // 현재 페이지
const itemsPerPage = 20; // 한 페이지당 20개

// 1. 공통 리소스 로드
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

// 2. 거래소 데이터 가져오기 (200개)
async function fetchCoinData(marketType) {
    const list = document.getElementById('coinList');
    const pagenav = document.getElementById('pagination-container');
    
    // 로딩 표시
    list.innerHTML = `<div style="grid-column:span 2; text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>`;
    pagenav.innerHTML = ''; 

    try {
        let rawData = [];
        
        // [업비트]
        if (marketType === 'UPBIT') {
            const markets = await axios.get('https://api.upbit.com/v1/market/all?isDetails=false');
            // KRW마켓 필터링 후 200개 자르기
            const krwMarkets = markets.data.filter(m => m.market.startsWith('KRW-')).slice(0, 200);
            const codes = krwMarkets.map(m => m.market).join(',');
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=${codes}`);
            
            rawData = res.data.map(t => ({
                sym: t.market.split('-')[1],
                price: Math.floor(t.trade_price).toLocaleString(),
                change: (t.signed_change_rate * 100).toFixed(2),
                ex: 'UPBIT',
                pair: 'KRW'
            }));
        } 
        // [바이낸스]
        else if (marketType === 'BINANCE') {
            const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
            // USDT마켓 200개 자르기
            const usdtMarkets = res.data.filter(t => t.symbol.endsWith('USDT')).slice(0, 200);
            
            rawData = usdtMarkets.map(t => ({
                sym: t.symbol.replace('USDT', ''),
                price: parseFloat(t.lastPrice).toLocaleString(),
                change: parseFloat(t.priceChangePercent).toFixed(2),
                ex: 'BINANCE',
                pair: 'USDT'
            }));
        } else {
            alert("API 준비 중입니다.");
            list.innerHTML = "";
            return;
        }

        // 전역 변수에 저장 후 1페이지 그리기
        allCoinData = rawData;
        currentPage = 1;
        renderPage(1);

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div style="text-align:center; color:red;">데이터 로드 실패</div>`;
    }
}

// 3. 페이지 그리기 (핵심: 20개씩 자르기)
function renderPage(page) {
    currentPage = page;
    const list = document.getElementById('coinList');
    
    // 시작 인덱스, 끝 인덱스 계산
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = allCoinData.slice(start, end); // 20개 추출

    // 리스트 HTML 생성
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

    // 페이지 번호 버튼 갱신
    renderPagination();
    
    // 스크롤 맨 위로
    document.querySelector('main').scrollTop = 0;
}

// 4. 페이지 번호 버튼 만들기 (1 2 3 4...)
function renderPagination() {
    const container = document.getElementById('pagination-container');
    const totalPages = Math.ceil(allCoinData.length / itemsPerPage);
    
    let html = '';
    // 최대 5개 페이지씩 끊어서 보여주거나, 간단하게 전체 다 보여줌 (여기선 전체)
    for(let i=1; i<=totalPages; i++) {
        const active = i === currentPage ? 'active' : '';
        html += `<button class="page-btn ${active}" onclick="renderPage(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

// 5. 차트 초기화 (modal.html용)
function initTradingView(symbol) {
    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
            "container_id": "tv_chart", "symbol": symbol, "interval": "1", "theme": "dark", "autosize": true, "locale": "ko", "toolbar_bg": "#020617", "hide_side_toolbar": true
        });
    }
}
