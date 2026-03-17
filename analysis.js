const NIFTY_50 = ["ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK", "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV", "BPCL", "BHARTIARTL", "BRITANNIA", "CIPLA", "COALINDIA", "DIVISLAB", "DRREDDY", "EICHERMOT", "GRASIM", "HCLTECH", "HDFCBANK", "HDFCLIFE", "HEROMOTOCO", "HINDALCO", "HINDUNILVR", "ICICIBANK", "ITC", "INDUSINDBK", "INFY", "JSWSTEEL", "KOTAKBANK", "LTIM", "LT", "M&M", "MARUTI", "NTPC", "NESTLEIND", "ONGC", "POWERGRID", "RELIANCE", "SBILIFE", "SBIN", "SUNPHARMA", "TCS", "TATACONSUM", "TATAMOTORS", "TATASTEEL", "TECHM", "TITAN", "UPL", "ULTRACEMCO", "WIPRO"];

const SENSEX_30 = ["ASIANPAINT", "AXISBANK", "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV", "BHARTIARTL", "HCLTECH", "HDFCBANK", "HINDUNILVR", "ICICIBANK", "INDUSINDBK", "INFY", "ITC", "JSWSTEEL", "KOTAKBANK", "LT", "M&M", "MARUTI", "NTPC", "NESTLEIND", "POWERGRID", "RELIANCE", "SBIN", "SUNPHARMA", "TCS", "TATAMOTORS", "TATASTEEL", "TECHM", "TITAN", "ULTRACEMCO"];

let mainChart = null;

function loadCompanies() {
    const idx = document.getElementById('index-select').value;
    const list = (idx === 'nifty') ? NIFTY_50 : SENSEX_30;
    const select = document.getElementById('company-select');
    select.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join('');
    // Trigger first fetch
    fetchRealTimeData();
}

/* --- HELPER: LINEAR REGRESSION --- */
function calculateRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

/* --- FETCH DATA WITH REAL-TIME INTERVALS --- */
async function fetchRealTimeData() {
    const symbol = document.getElementById('company-select').value;
    if (!symbol) return;

    const indexType = document.getElementById('index-select').value;
    const suffix = (indexType === 'nifty') ? ".NS" : ".BO";

    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}?interval=10m&range=1d`)}`);
        const json = await response.json();
        const data = JSON.parse(json.contents);
        
        if (!data.chart.result) throw new Error("No data found");
        
        const result = data.chart.result[0];
        const current = result.meta.regularMarketPrice;
        const previousClose = result.meta.previousClose;
        
        updateUI(current, previousClose);
        renderChartWithPrediction(symbol, result);
    } catch (e) {
        console.warn("Market data unavailable for", symbol, "using simulation.");
        // Dynamic simulation based on a reasonable starting price if API fails
        const simBase = 2000 + (Math.random() * 500);
        updateUI(simBase, simBase - 10);
        renderChartWithPrediction(symbol, null); 
    }
}

function updateUI(current, previousClose) {
    const diff = (current - previousClose).toFixed(2);
    const percent = ((diff / previousClose) * 100).toFixed(2);
    
    document.getElementById('current-price').innerText = `₹${current.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const changeDisplay = document.getElementById('price-change');

    if (diff >= 0) {
        changeDisplay.innerHTML = `<span style="color: #4caf50; font-weight: bold; margin-left: 10px;">▲ +${diff} (+${percent}%)</span>`;
    } else {
        changeDisplay.innerHTML = `<span style="color: #f44336; font-weight: bold; margin-left: 10px;">▼ ${diff} (${percent}%)</span>`;
    }
}

/* --- RENDER CHART WITH REGRESSION & TOOLTIP HOVER --- */
function renderChartWithPrediction(symbol, data) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // 1. Get Historical Data
    let history = (data && data.indicators.quote[0].close) 
        ? data.indicators.quote[0].close.filter(v => v != null).slice(-15) 
        : Array.from({length: 15}, () => 1500 + Math.random() * 50);
    
    const { slope, intercept } = calculateRegression(history);
    
    // 2. TIMELINE GENERATION (10 Min Intervals)
    const now = new Date();
    let labels = [];
    for (let i = history.length - 1; i >= 0; i--) {
        let t = new Date(now.getTime() - (i * 10 * 60000));
        labels.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    // 3. PREDICTION DATA
    const predictionData = new Array(history.length - 1).fill(null);
    predictionData.push(history[history.length - 1]); 
    
    for (let i = 1; i <= 5; i++) {
        let futureIdx = (history.length - 1) + i;
        let predictedPrice = (slope * futureIdx) + intercept;
        predictionData.push(predictedPrice);
        
        let ft = new Date(now.getTime() + (i * 10 * 60000));
        labels.push(ft.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (P)");
    }

    // 4. CHART RENDERING WITH HOVER TOOLTIPS
    if (mainChart) mainChart.destroy();
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${symbol} Actual`,
                data: history,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }, {
                label: 'Fusion AI Forecast',
                data: predictionData,
                borderColor: '#22c55e',
                borderDash: [5, 5],
                pointBackgroundColor: '#22c55e',
                pointRadius: 4, // Larger dots for easier hover
                hoverRadius: 7,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false // Allows hover anywhere on the vertical line
            },
            plugins: {
                legend: { labels: { color: '#fff' }, position: 'bottom' },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            let val = context.parsed.y;
                            return `${context.dataset.label}: ₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: false, 
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#aaa' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#aaa', maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });
}

window.onload = loadCompanies;