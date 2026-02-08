/* script.js - 메인 리스트 & 시세 */
const COIN_LIST = ["BTC", "ETH", "XRP", "DOGE", "SOL", "ADA"];

window.addEventListener('DOMContentLoaded', () => {
    // 1. 헤더/네비 로드 (주소 고정)
    const loadUI = (id, file) => {
        fetch(`https://minetia.github.io/${file}`)
            .then(r => r.text())
            .then(h => { if(document.getElementById(id)) document.getElementById(id).innerHTML = h; });
    };
    loadUI('header-placeholder', 'header.html');
    loadUI('nav-placeholder', 'nav.html');

    // 2. 가격 업데이트 (에러 방지용 try-catch)
    const fetchMain = async () => {
        const container = document.getElementById('price-container');
        if(!container) return;

        try {
            const res = await fetch(`https://api.upbit.com/v1/ticker?markets=${COIN_LIST.map(c => 'KRW-' + c).join(',')}`);
            const data = await res.json();
            
            container.innerHTML = data.map(coin => {
                const name = coin.market.split('-')[1];
                const change = (coin.signed_change_rate * 100).toFixed(2);
                const color = change > 0 ? '#10b981' : (change < 0 ? '#ef4444' : '#fff');
                return `
                    <div class="price-item" onclick="location.href='practice/index.html?coin=${name}&symbol=BINANCE:${name}USDT'" 
                         style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #1e293b; cursor:pointer;">
                        <div>
                            <div style="font-weight:bold; font-size:1.1rem;">${name}</div>
                            <div style="font-size:0.8rem; color:#64748b;">Upbit / KRW</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:bold; color:${color};">${coin.trade_price.toLocaleString()}</div>
                            <div style="font-size:0.8rem; color:${color};">${change > 0 ? '+' : ''}${change}%</div>
                        </div>
                    </div>`;
            }).join('');
        } catch (e) { console.error("메인 시세 로딩 중..."); }
        setTimeout(fetchMain, 2000);
    };
    fetchMain();
});
