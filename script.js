/* script.js (메인 페이지용) */
const DOMESTIC_COINS = ["BTC", "ETH", "XRP", "DOGE", "SOL", "ADA"];

window.addEventListener('load', () => {
    // 1. 헤더/네비 강제 주입
    const renderPart = (id, file) => {
        fetch(`https://minetia.github.io/${file}`)
            .then(r => r.text())
            .then(html => { document.getElementById(id).innerHTML = html; });
    };
    renderPart('header-placeholder', 'header.html');
    renderPart('nav-placeholder', 'nav.html');
    
    // 2. 가격 데이터 (fetch 방식 - Axios 안 써서 무조건 됨)
    const updateMain = () => {
        const container = document.getElementById('price-container');
        const url = `https://api.upbit.com/v1/ticker?markets=${DOMESTIC_COINS.map(c => 'KRW-' + c).join(',')}`;
        
        fetch(url)
            .then(r => r.json())
            .then(data => {
                container.innerHTML = data.map(coin => {
                    const name = coin.market.split('-')[1];
                    const change = (coin.signed_change_rate * 100).toFixed(2);
                    const color = change > 0 ? '#10b981' : (change < 0 ? '#ef4444' : '#fff');
                    return `
                        <div class="price-item" onclick="location.href='practice/index.html?coin=${name}&symbol=BINANCE:${name}USDT'" style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #1e293b;">
                            <div><div style="font-weight:bold;">${name}</div><div style="font-size:0.8rem; color:#64748b;">Upbit</div></div>
                            <div style="text-align:right;">
                                <div style="font-weight:bold; color:${color};">${coin.trade_price.toLocaleString()}</div>
                                <div style="font-size:0.8rem; color:${color};">${change > 0 ? '+' : ''}${change}%</div>
                            </div>
                        </div>`;
                }).join('');
            }).catch(() => { console.log("가격 로딩 시도 중..."); });
        setTimeout(updateMain, 2000);
    };
    updateMain();
});
