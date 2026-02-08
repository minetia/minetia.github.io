/* script.js 맨 아래에 추가 */

// 거래소 클릭 시 실행되는 함수
async function showExchangeCoins(exchangeName) {
    const container = document.getElementById('list-placeholder');
    const tabMenu = document.querySelector('.tab-menu');
    
    // 1. 탭 메뉴 잠시 숨기기 (리스트에 집중하기 위해)
    if(tabMenu) tabMenu.style.display = 'none';

    // 2. 로딩 화면 & 뒤로가기 버튼 표시
    container.innerHTML = `
        <div style="padding: 10px;">
            <button onclick="goBackToExList()" style="background:#334155; color:#fff; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:bold;">
                <i class="fas fa-arrow-left"></i> 목록으로
            </button>
            <h3 style="margin-top:15px; color:#0ea5e9;">${exchangeName} 실시간 시세</h3>
        </div>
        <div id="realtime-coin-grid" class="grid-container">
            <div style="grid-column:span 2; text-align:center; padding:50px; color:#64748b;">
                <i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>데이터 불러오는 중...
            </div>
        </div>
    `;

    // 3. API 데이터 호출 (100개 제한)
    try {
        let html = '';
        let data = [];

        if (exchangeName === 'UPBIT') {
            // 업비트: 원화 마켓 전체 로드
            const markets = await axios.get('https://api.upbit.com/v1/market/all?isDetails=false');
            const krwMarkets = markets.data.filter(m => m.market.startsWith('KRW-')).slice(0, 100); // 100개 자르기
            const codes = krwMarkets.map(m => m.market).join(',');
            
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=${codes}`);
            data = res.data.map(t => ({
                sym: t.market.split('-')[1],
                price: Math.floor(t.trade_price).toLocaleString(),
                change: (t.signed_change_rate * 100).toFixed(2),
                ex: 'UPBIT',
                pair: 'KRW'
            }));

        } else if (exchangeName === 'BINANCE') {
            // 바이낸스: USDT 마켓 상위 100개
            const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
            // USDT 마켓만 필터링 후 거래량 순 정렬 등을 하면 좋지만, 일단 앞에서 100개
            const usdtMarkets = res.data.filter(t => t.symbol.endsWith('USDT')).slice(0, 100);
            
            data = usdtMarkets.map(t => ({
                sym: t.symbol.replace('USDT', ''),
                price: parseFloat(t.lastPrice).toLocaleString(),
                change: parseFloat(t.priceChangePercent).toFixed(2),
                ex: 'BINANCE',
                pair: 'USDT'
            }));
        } else {
            // 그 외 거래소 (API가 없으므로 가짜 데이터 예시)
            container.querySelector('#realtime-coin-grid').innerHTML = 
                `<div style="text-align:center; padding:30px; grid-column:span 2;">${exchangeName} API 연동 준비중입니다.<br>(UPBIT, BINANCE만 가능)</div>`;
            return;
        }

        // 4. HTML 생성 (기존 createCoinItem 재활용)
        const grid = document.getElementById('realtime-coin-grid');
        grid.innerHTML = data.map(d => createCoinItem(d.sym, d.price, d.change, d.ex, d.pair)).join('');

    } catch (e) {
        console.error(e);
        document.getElementById('realtime-coin-grid').innerHTML = `<div style="color:red; text-align:center;">데이터 로드 실패</div>`;
    }
}

// 목록으로 돌아가기 함수
function goBackToExList() {
    const tabMenu = document.querySelector('.tab-menu');
    if(tabMenu) tabMenu.style.display = 'flex'; // 탭 메뉴 다시 보이기
    
    // 현재 활성화된 탭 확인해서 목록 다시 로드
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn && activeBtn.innerText.includes('해외')) {
        loadList('ex_global.html');
    } else {
        loadList('ex_kr.html');
    }
}
