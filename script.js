const API_KEY = 'AdEIp3DEvP8XXp7KsvuBF33zUtOHsIoh5GnBlJDD';
const BASE_URL = 'https://yfapi.net';

let stocks = [];
let chart = null;

const stockForm = document.getElementById('stockForm');
const symbolInput = document.getElementById('symbolInput');
const quantityInput = document.getElementById('quantityInput');
const errorMessage = document.getElementById('errorMessage');
const stocksList = document.getElementById('stocksList');
const totalValueElement = document.getElementById('totalValue');
const totalChangeElement = document.getElementById('totalChange');
const chartCanvas = document.getElementById('stockChart');

function initializeChart() {
    const ctx = chartCanvas.getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#e5e7eb',
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#374151',
                    titleColor: '#e5e7eb',
                    bodyColor: '#e5e7eb',
                    borderColor: '#4b5563',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    grid: {
                        color: '#374151',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#e5e7eb',
                        callback: (value) => '$' + value.toFixed(2)
                    }
                },
                x: {
                    grid: {
                        color: '#374151',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#e5e7eb',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

async function fetchStockData(symbol) {
    try {
        const response = await fetch(`${BASE_URL}/v6/finance/quote?symbols=${symbol}`, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch stock data');
        }

        const data = await response.json();
        if (!data.quoteResponse?.result?.[0]) {
            throw new Error('Invalid stock symbol');
        }
        return data.quoteResponse.result[0];
    } catch (error) {
        throw new Error('Invalid stock symbol or API error');
    }
}

async function fetchHistoricalData(symbol) {
    try {
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (30 * 24 * 60 * 60); 
        
        const response = await fetch(`${BASE_URL}/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch historical data');
        }

        const data = await response.json();
        if (!data.chart?.result?.[0]) {
            throw new Error('No historical data available');
        }
        
        return data.chart.result[0];
    } catch (error) {
        console.error('Error fetching historical data:', error);
        return null;
    }
}

function updateChart(symbol, historicalData) {
    if (!historicalData) return;

    const timestamps = historicalData.timestamp;
    const prices = historicalData.indicators.quote[0].close;
    const validPrices = [];
    const validDates = [];

    for (let i = 0; i < timestamps.length; i++) {
        if (prices[i] !== null) {
            validPrices.push(prices[i]);
            validDates.push(new Date(timestamps[i] * 1000).toLocaleDateString());
        }
    }

    if (chart.data.datasets.length === 0) {
        chart.data.labels = validDates;
        chart.data.datasets.push({
            label: symbol,
            data: validPrices,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
        });
    } else {
        chart.data.labels = validDates;
        chart.data.datasets[0].label = symbol;
        chart.data.datasets[0].data = validPrices;
    }

    chart.update();
}

async function addStock(event) {
    event.preventDefault();
    
    const symbol = symbolInput.value.toUpperCase();
    const quantity = parseInt(quantityInput.value);
    
    try {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
        
        const stockData = await fetchStockData(symbol);
        const historicalData = await fetchHistoricalData(symbol);
        
        const newStock = {
            symbol,
            companyName: stockData.longName || stockData.shortName,
            currentPrice: stockData.regularMarketPrice,
            change: stockData.regularMarketChange,
            changePercent: stockData.regularMarketChangePercent,
            quantity
        };
        
        stocks.push(newStock);
        updateUI();
        if (historicalData) {
            updateChart(symbol, historicalData);
        }
        
        symbolInput.value = '';
        quantityInput.value = '1';
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
}

function removeStock(symbol) {
    stocks = stocks.filter(stock => stock.symbol !== symbol);
    updateUI();
    if (stocks.length > 0) {
        fetchHistoricalData(stocks[0].symbol).then(data => {
            if (data) updateChart(stocks[0].symbol, data);
        });
    } else {
        chart.data.datasets = [];
        chart.update();
    }
}

function updateUI() {
    stocksList.innerHTML = stocks.map(stock => `
        <tr>
            <td>${stock.symbol}</td>
            <td>${stock.companyName}</td>
            <td>${stock.quantity}</td>
            <td>$${stock.currentPrice.toFixed(2)}</td>
            <td class="${stock.change >= 0 ? 'positive-change' : 'negative-change'}">
                ${stock.change >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
            </td>
            <td>$${(stock.currentPrice * stock.quantity).toFixed(2)}</td>
            <td>
                <button class="remove-btn" onclick="removeStock('${stock.symbol}')">Remove</button>
            </td>
        </tr>
    `).join(''); 

    const totalValue = stocks.reduce((sum, stock) => sum + stock.currentPrice * stock.quantity, 0);
    const totalChange = stocks.reduce((sum, stock) => sum + stock.change * stock.quantity, 0);

    totalValueElement.textContent = `$${totalValue.toFixed(2)}`;
    totalChangeElement.textContent = `${totalChange >= 0 ? '+' : ''}$${Math.abs(totalChange).toFixed(2)}`;
    totalChangeElement.className = `value ${totalChange >= 0 ? 'positive-change' : 'negative-change'}`;
}

function startRealTimeUpdates() {
    setInterval(async () => {
        for (let stock of stocks) {
            try {
                const stockData = await fetchStockData(stock.symbol);
                stock.currentPrice = stockData.regularMarketPrice;
                stock.change = stockData.regularMarketChange;
                stock.changePercent = stockData.regularMarketChangePercent;
            } catch (error) {
                console.error(`Error updating ${stock.symbol}:`, error);
            }
        }
        updateUI();
    }, 60000); 
}

initializeChart();
stockForm.addEventListener('submit', addStock);
startRealTimeUpdates();