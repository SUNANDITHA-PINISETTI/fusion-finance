/**
 * FUSION AI - MASTER APP.JS
 * Consolidated logic for Login, Dashboard Camera, Redirections, and FinBERT Analysis
 */

const API_BASE_URL = "http://127.0.0.1:6000";
let selectedNews = [];
let stream = null; 

// --- 1. INITIALIZATION ---
window.onload = () => {
    if (document.getElementById('video') || document.getElementById('newspaper-chips')) {
        setupNewsSelection();
        setupPDFListener();
    }

    if (document.getElementById('decisionText')) {
        processAIAnalysis();
    }

    const userName = localStorage.getItem("user_name") || "User";
    const nameDisplay = document.getElementById('nav-user-name');
    if (nameDisplay) nameDisplay.innerText = userName;
};

// --- 2. AUTHENTICATION ---
function handleCredentialResponse(response) {
    const responsePayload = parseJwt(response.credential);
    localStorage.setItem("user_name", responsePayload.name);
    window.location.href = "dashboard.html"; 
}

function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// --- 3. EXTERNAL REDIRECTS (NEWS & SOCIAL) ---
function openNews(provider) {
    const urls = {
        'hindu': 'https://www.thehindubusinessline.com/',
        'et': 'https://economictimes.indiatimes.com/markets',
        'reuters': 'https://www.reuters.com/business/',
        'fe': 'https://www.financialexpress.com/market/',
        'mc': 'https://www.moneycontrol.com/news/business/markets/'
    };
    if (urls[provider]) window.open(urls[provider], '_blank');
}

function openSocial(platform) {
    const urls = {
        'tw': 'https://twitter.com/search?q=%24NIFTY&src=typed_query',
        'st': 'https://stocktwits.com/symbol/NIFTY.NSE',
        'ig': 'https://www.instagram.com/explore/tags/stockmarketindia/',
        'li': 'https://www.linkedin.com/feed/hashtag/?keywords=stockmarket'
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
}

// --- 4. DATA INPUT: PDF HANDLING ---
function setupPDFListener() {
    document.getElementById('pdfs')?.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file && file.type === "application/pdf") {
            // Placeholder for text extraction logic (like PDF.js)
            const mockExtractedText = "Quarterly earnings exceed expectations. Bullish trend expected."; 
            
            const existingData = JSON.parse(localStorage.getItem('fusion_data')) || {};
            localStorage.setItem('fusion_data', JSON.stringify({
                ...existingData,
                pdfText: mockExtractedText,
                pdfName: file.name
            }));
            alert(`PDF "${file.name}" uploaded and queued for analysis!`);
        }
    });
}

// --- 5. DATA INPUT: NEWSPAPER CHIPS ---
function setupNewsSelection() {
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', function() {
            this.classList.toggle('selected');
            const newsText = this.innerText.trim();
            
            if (selectedNews.includes(newsText)) {
                selectedNews = selectedNews.filter(n => n !== newsText);
            } else {
                selectedNews.push(newsText);
            }
            saveCurrentState();
        });
    });
}

function saveCurrentState() {
    const existingData = JSON.parse(localStorage.getItem('fusion_data')) || {};
    localStorage.setItem('fusion_data', JSON.stringify({
        ...existingData,
        news: selectedNews
    }));
}

// --- 6. DATA INPUT: CAMERA SCANNING ---
async function openCamera() {
    const video = document.getElementById('video');
    const container = document.getElementById('camContainer');
    const openBtn = document.getElementById('openBtn');

    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 400, height: 400, facingMode: "environment" } 
        });
        video.srcObject = stream;
        if (container) container.style.display = "flex";
        if (openBtn) openBtn.style.display = "none";
    } catch (err) {
        alert("Camera Access Error: Please enable permissions.");
    }
}

function captureAndAnalyze() {
    const video = document.getElementById('video');
    const successNotice = document.getElementById('successNotice');

    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    canvas.getContext('2d').drawImage(video, 0, 0, 400, 400);
    const imageData = canvas.toDataURL('image/png');

    if (successNotice) {
        successNotice.style.display = "flex";
        setTimeout(() => { successNotice.style.display = "none"; }, 2000);
    }

    const existingData = JSON.parse(localStorage.getItem('fusion_data')) || {};
    localStorage.setItem('fusion_data', JSON.stringify({
        ...existingData,
        image: imageData
    }));
}

// --- 7. THE MAIN REDIRECTION ---
function generateAnalysis() {
    const storedData = JSON.parse(localStorage.getItem('fusion_data'));
    
    const hasImage = storedData && storedData.image;
    const hasNews = storedData && storedData.news && storedData.news.length > 0;
    const hasPDF = storedData && storedData.pdfText;

    if (!hasImage && !hasNews && !hasPDF) {
        alert("Please provide at least one source (Scan, News Chip, or PDF)!");
        return;
    }

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    window.location.href = "analysis.html";
}

// --- 8. FINBERT & NLI AI BRIDGE ---
async function processAIAnalysis() {
    const storedData = JSON.parse(localStorage.getItem('fusion_data'));
    const decisionText = document.getElementById('decisionText');

    if (!storedData) return;

    try {
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: storedData.image,
                news: storedData.news,
                pdfText: storedData.pdfText
            })
        });

        const result = await response.json();

        // Update UI Elements
        document.getElementById('posVal').innerText = (result.positive * 100).toFixed(1) + "%";
        document.getElementById('neuVal').innerText = (result.neutral * 100).toFixed(1) + "%";
        document.getElementById('negVal').innerText = (result.negative * 100).toFixed(1) + "%";

        if (result.positive > result.negative) {
            decisionText.innerText = "SIGNAL: BULLISH (FinBERT)";
            decisionText.style.color = "#16a34a";
        } else {
            decisionText.innerText = "SIGNAL: BEARISH (FinBERT)";
            decisionText.style.color = "#dc2626";
        }

        renderSentimentChart(result);

    } catch (error) {
        if (decisionText) decisionText.innerText = "AI Offline. Check Python Flask API.";
    }
}

// --- 9. VISUALIZATION ---
function renderSentimentChart(data) {
    const chartEl = document.getElementById('sentimentChart');
    if (!chartEl || typeof Chart === 'undefined') return;

    new Chart(chartEl.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [data.positive, data.neutral, data.negative],
                backgroundColor: ['#16a34a', '#6b7280', '#dc2626'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}