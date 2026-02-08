/* script.js (메인 페이지용) */
const DOMESTIC_COINS = ["BTC", "ETH", "XRP", "DOGE", "SOL", "ADA"];

window.addEventListener('load', async () => {
    // 1. 헤더/네비 강제 로딩 (직접 HTML 주입으로 경로 문제 해결)
    const renderMenu = (id, file) => {
        fetch(`https://minetia.github.io/${file}`)
            .then(res => res.text())
            .then(html => { document.getElementById(id).innerHTML = html; })
            .catch(e => console.log(file + " 로드 실패"));
    };
    renderMenu('header-placeholder', 'header.html');
    renderMenu('nav-placeholder', 'nav.html');
    
    // 2. 가격 데이터 무한 루프
    const updateMainPrices = async () => {
        const container = document.getElementById('price-container');
        if (!window.axios) return; 

        try {
            const res = await axios.get(`https://api.upbit.com/v1/ticker?markets=${DOMESTIC_COINS.map(c => 'KRW-' + c).join(',')}`);
            if (res.data) {
                container.innerHTML = res.data.map(coin => {
                    const name = coin.market.split('-')[1];
                    const change = (coin.signed_change_rate * 100).toFixed(2);
                    const color = change > 0 ? '#10b981' : (change < 0 ? '#ef4444' : '#fff');
                    return `
                        <div class="price-item" onclick="location.href='practice/index.html?coin=${name}&symbol=BINANCE:${name}USDT'" style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #1e293b; cursor:pointer;">
                            <div><div style="font-weight:bold;">${name}</div><div style="font-size:0.8rem; color:#64748b;">Upbit</div></div>
                            <div style="text-align:right;">
                                <div style="font-weight:bold; color:${color};">${coin.trade_price.toLocaleString()}</div>
                                <div style="font-size:0.8rem; color:${color};">${change}%</div>
                            </div>
                        </div>`;
                }).join('');
            }
        } catch (e) { console.log("메인 시세 호출 에러"); }
        setTimeout(updateMainPrices, 2000);
    };
    updateMainPrices();
});
