/* script.js - (루트 폴더) */
const BASE = "https://minetia.github.io/";
let allCoinData = [];
let currentPage = 1;
const itemsPerPage = 20;
let currentMarket = 'DOMESTIC';

// [핵심] 스마트 가격 포맷팅 함수
function formatCoinPrice(price) {
    const p = parseFloat(price);
    if (isNaN(p)) return '-';

    if (p >= 100) {
        // 100 이상이면 소수점 버림 (예: 1,000,000)
        return Math.floor(p).toLocaleString(); 
    } else if (p >= 1) {
        // 1 ~ 99 사이는 소수점 2자리 (예: 12.34)
        return p.toFixed(2); 
    } else {
        // 1 미만은 소수점 4자리 (예: 0.0035)
        return p.toFixed(4); 
    }
}

// ... (기존 switchMarket, renderExchangeBar 등 유지) ...
function switchMarket(type) {
    currentMarket = type;
    document.getElementById('btn-domestic').className = type === 'DOMESTIC' ? 'market-btn active' : 'market-btn';
    document.getElementById('btn-overseas').className = type === 'OVERSEAS' ? 'market-btn active' : 'market-btn';
    renderExchangeBar(type);
    if(type === 'DOMESTIC') fetchDomesticData('UPBIT');
    else fetchOverseasData('BINANCE');
}

function renderExchangeBar(type) {
    const bar = document.getElementById('exchange-bar');
    let html = '';
    if (type === 'DOMESTIC') {
        const exs = [{id:'UPBIT',name:'UPBIT'},{id:'BITHUMB',name:'BITHUMB'},{id:'COINONE',name:'COINONE'},{id:'KORBIT',name:'KORBIT'},{id:'GOPAX',name:'GOPAX'}];
        exs.forEach((ex, idx) => { html += `<div class="ex-icon ${idx===0?'active':''}" onclick="fetchDomesticData('${ex.id}', this)">${ex.name}</div>`; });
    } else {
        const exs = [{id:'BINANCE',name:'BINANCE'},{id:'COINBASE',name:'COINBASE'},{id:'BYBIT',name:'BYBIT'},{id:'OKX',name:'OKX'},{id:'KRAKEN',name:'KRAKEN'}];
        exs.forEach((ex, idx) => { html += `<div class="ex-icon ${idx===0?'active':''}" onclick="fetchOverseasData('${ex.id}', this)">${ex.name}</div>`; });
    }
    bar.innerHTML = html;
}

// 국내 데이터 (업비트)
async function fetchDomesticData(exchange, btn = null) {
    updateUI(exchange, btn);
    try {
        const markets = await axios.get('https://api.upbit.com/v1/market/all?isDetails=false');
        const krwMarkets = markets.data.filter(m => m.market.startsWith('KRW-')).slice(0, 100);
        const codes = krwMarkets.map(m => m.market).join(',');
        const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=${codes}`);
        
        allCoinData = res.data.map(t => ({
            sym: t.market.split('-')[1],
            price: t.trade_price, // 원본 숫자 유지
            change: (t.signed_change_rate * 100).toFixed(2),
            ex: exchange,
            pair: 'KRW'
        }));
        renderPage(1);
    } catch (e) { fetchDomesticBackup(exchange); }
}

// 국내 백업 (빗썸)
async function fetchDomesticBackup(exchange) {
    try {
        const res = await axios.get('https://api.bithumb.com/public/ticker/ALL_KRW');
        const data = res.data.data; delete data['date'];
        allCoinData = Object.keys(data).map(key => ({
            sym: key,
            price: Number(data[key].closing_price), // 원본 숫자
            change: data[key].fluctate_rate_24H,
            ex: exchange, pair: 'KRW'
        })).slice(0, 100);
        renderPage(1);
    } catch (e) {}
}

// 해외 데이터 (바이낸스)
async function fetchOverseasData(exchange, btn = null) {
    updateUI(exchange, btn);
    try {
        const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
        const usdtMarkets = res.data.filter(t => t.symbol.endsWith('USDT')).slice(0, 100);
        allCoinData = usdtMarkets.map(t => ({
            sym: t.symbol.replace('USDT', ''),
            price: parseFloat(t.lastPrice), // 원본 숫자
            change: parseFloat(t.priceChangePercent).toFixed(2),
            ex: exchange, pair: 'USDT'
        }));
        renderPage(1);
    } catch (e) { fetchOverseasBackup(exchange); }
}

// 해외 백업 (CoinCap)
async function fetchOverseasBackup(exchange) {
    try {
        const res = await axios.get('https://api.coincap.io/v2/assets?limit=100');
        allCoinData = res.data.data.map(t => ({
            sym: t.symbol,
            price: parseFloat(t.priceUsd), // 원본 숫자
            change: parseFloat(t.changePercent24Hr).toFixed(2),
            ex: exchange, pair: 'USD'
        }));
        renderPage(1);
    } catch (e) {}
}

// UI 업데이트 및 리소스 인클루드 (기존 유지)
function updateUI(exchange, btn) {
    document.getElementById('market-title').innerText = `${currentMarket==='DOMESTIC'?'국내':'해외'} 실시간 시세 [${exchange}]`;
    document.getElementById('coinList').innerHTML = `<div style="grid-column:span 2; text-align:center; padding:50px; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> 데이터 수신중...</div>`;
    if(btn) { document.querySelectorAll('.ex-icon').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
}
async function includeResources(targets) {
    const promises = targets.map(t => fetch(`${BASE}${t.file}`).then(r => r.text()).then(html => ({id:t.id, html})));
    const results = await Promise.all(promises);
    results.forEach(res => { const el = document.getElementById(res.id); if(el) el.innerHTML = res.html; });
}

// [핵심] 렌더링 할 때 formatCoinPrice 적용
function renderPage(page) {
    currentPage = page;
    const list = document.getElementById('coinList');
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = allCoinData.slice(start, end);

    list.innerHTML = pageData.map(d => {
        const isUp = parseFloat(d.change) >= 0;
        const color = isUp ? '#10b981' : '#ef4444';
        
        // 여기서 포맷팅 함수 적용!
        const displayPrice = formatCoinPrice(d.price);

        return `
            <div class="coin-item" onclick="location.href='${BASE}coin/modal.html?symbol=${d.ex}:${d.sym}${d.pair}&coin=${d.sym}'" style="background:#1e293b; border:1px solid #334155; padding:15px; border-radius:12px; cursor:pointer;">
                <div style="color:#94a3b8; font-size:0.8rem; margin-bottom:5px;">${d.sym}</div>
                <div style="color:#fff; font-size:1.1rem; font-weight:800; margin-bottom:5px;">
                    ${displayPrice} <span style="font-size:0.7rem; font-weight:normal;">${d.pair==='KRW'?'원':'$'}</span>
                </div>
                <div style="color:${color}; font-size:0.9rem; font-weight:700;">${d.change}%</div>
            </div>`;
    }).join('');
    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('pagination-container');
    const totalPages = Math.ceil(allCoinData.length / itemsPerPage);
    const maxPage = Math.min(totalPages, 10);
    let html = '';
    for(let i=1; i<=maxPage; i++) {
        const active = i === currentPage ? 'active' : '';
        html += `<button class="page-btn ${active}" onclick="renderPage(${i})" style="width:30px; height:30px; margin:2px; border-radius:4px; border:1px solid #334155; background:${active?'#0ea5e9':'#1e293b'}; color:${active?'#fff':'#94a3b8'};">${i}</button>`;
    }
    container.innerHTML = html;
}
