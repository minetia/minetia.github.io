/* script.js - 인덱스 & 모달 통합 엔진 */
const BASE = "https://minetia.github.io/";

// ============================================================
// 1. [공통] 헤더/네비/파일 인클루드 엔진
// ============================================================
async function includeResources(targets) {
    const promises = targets.map(t => 
        fetch(`${BASE}${t.file}`).then(r => r.text()).then(html => ({ id: t.id, html }))
    );
    
    const results = await Promise.all(promises);
    results.forEach(res => {
        const el = document.getElementById(res.id);
        if (el) {
            el.innerHTML = res.html;
            // 불러온 파일 안에 있는 스크립트 강제 실행 (매우 중요)
            el.querySelectorAll('script').forEach(oldS => {
                const newS = document.createElement('script');
                newS.text = oldS.text;
                document.head.appendChild(newS).parentNode.removeChild(newS);
            });
        }
    });
}

// ============================================================
// 2. [인덱스 페이지] 거래소 목록 및 API 로직
// ============================================================

// 거래소 목록 파일(.html) 불러오기
async function loadList(filename, btn) {
    if(btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    
    // 탭 메뉴 보이기 (상세에서 돌아올 때 대비)
    const tabMenu = document.querySelector('.tab-menu');
    if(tabMenu) tabMenu.style.display = 'flex';

    const container = document.getElementById('list-placeholder');
    if(!container) return; // 모달 페이지에서는 실행 안 되게 보호

    try {
        container.innerHTML = `<div style="grid-column:span 2; text-align:center; padding:50px; color:#666;"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>`;
        const res = await fetch(`${BASE}${filename}`);
        if(!res.ok) throw new Error("파일 없음");
        container.innerHTML = await res.text();
    } catch(e) {
        container.innerHTML = `<div style="color:red; text-align:center;">목록 로드 실패</div>`;
    }
}

// [API] 실시간 시세 조회 (업비트/바이낸스)
async function showExchangeCoins(exchangeName) {
    const container = document.getElementById('list-placeholder');
    const tabMenu = document.querySelector('.tab-menu');
    
    // 탭 숨기기
    if(tabMenu) tabMenu.style.display = 'none';

    // 로딩 화면
    container.innerHTML = `
        <div style="grid-column: span 2; padding: 10px; display:flex; justify-content:space-between; align-items:center;">
            <button onclick="goBackToExList()" style="background:#334155; color:#fff; border:none; padding:8px 15px; border-radius:8px; cursor:pointer;">
                <i class="fas fa-arrow-left"></i> 목록으로
            </button>
            <h3 style="color:#0ea5e9; margin:0;">${exchangeName} 실시간</h3>
        </div>
        <div id="realtime-grid" class="grid-container" style="grid-column: span 2;">
            <div style="grid-column:span 2; text-align:center; padding:50px; color:#64748b;">
                <i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>데이터 통신 중...
            </div>
        </div>
    `;

    try {
        let data = [];
        // 업비트 API
        if (exchangeName === 'UPBIT') {
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
        // 바이낸스 API
        else if (exchangeName === 'BINANCE') {
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

        // 데이터 그리기
        const grid = document.getElementById('realtime-grid');
        grid.innerHTML = data.map(d => createCoinItem(d.sym, d.price, d.change, d.ex, d.pair)).join('');

    } catch (e) {
        console.error(e);
        document.getElementById('realtime-grid').innerHTML = `<div style="color:red; text-align:center; grid-column:span 2;">API 통신 실패</div>`;
    }
}

// 목록으로 돌아가기
function goBackToExList() {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn && activeBtn.innerText.includes('해외')) {
        loadList('ex_global.html');
    } else {
        loadList('ex_kr.html');
    }
}

// 코인 카드 HTML 생성 (클릭 시 modal.html로 이동)
function createCoinItem(sym, price, change, ex, pair) {
    const isUp = change >= 0;
    const color = isUp ? '#10b981' : '#ef4444';
    const arrow = isUp ? '▲' : '▼';
    
    return `
        <div class="coin-item" onclick="location.href='${BASE}coin/modal.html?symbol=${ex}:${sym}${pair}&coin=${sym}'" 
             style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:15px; display:flex; flex-direction:column; align-items:center; cursor:pointer;">
            <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:5px;">${sym}</div>
            <div style="font-size:1.1rem; font-weight:800; margin-bottom:5px; color:#fff;">${price} <span style="font-size:0.7rem;">${pair}</span></div>
            <div style="color:${color}; font-size:0.9rem; font-weight:700;">${arrow} ${change}%</div>
        </div>`;
}

// ============================================================
// 3. [모달 페이지] 차트 및 상세 기능 (이게 빠지면 차트 고장남!)
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
    } else {
        console.error("TradingView 라이브러리가 로드되지 않았습니다.");
    }
}
