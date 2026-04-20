// ════════════════════════════════
// STOCKS
// ════════════════════════════════

function quickStock(sym, ex) {
  document.getElementById('stockSymbol').value = sym;
  document.getElementById('stockExchange').value = ex;
  fetchStock();
}

async function fetchStock() {
  const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
  const exchange = document.getElementById('stockExchange').value;
  if (!symbol) return;
  document.getElementById('stockResult').style.display = 'none';
  document.getElementById('stockError').style.display = 'none';
  document.getElementById('stockLoading').style.display = 'block';
  try {
    const prompt = `Fetch the current stock price for ${symbol} on ${exchange} from Google Finance. Use web search. Return ONLY a JSON object (no markdown, no extra text): {"symbol":"${symbol}","exchange":"${exchange}","name":"Company name","price":123.45,"currency":"USD","change":1.23,"changePct":0.98,"open":122.00,"high":124.50,"low":121.80,"volume":"45.2M","marketCap":"2.8T","pe":28.5,"found":true}. If not found set found:false. Do NOT make up numbers.`;
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await resp.json();

    // אוסף טקסט מכל סוגי הבלוקים - כולל אחרי חיפוש אינטרנט
    let allText = '';
    for (const block of (data.content || [])) {
      if (block.type === 'text') {
        allText += block.text + ' ';
      } else if (block.type === 'tool_result' && Array.isArray(block.content)) {
        allText += block.content.map(b => b.type === 'text' ? b.text : '').join(' ');
      }
    }

    // מחפש JSON תקין בתוך כל הטקסט
    const cleaned = allText.replace(/```json|```/g, '');
    const jsonMatch = cleaned.match(/\{[^{}]*"found"\s*:\s*(true|false)[^{}]*\}/);
    if (!jsonMatch) throw new Error('no JSON');
    const stock = JSON.parse(jsonMatch[0]);

    document.getElementById('stockLoading').style.display = 'none';
    if (!stock.found) {
      document.getElementById('stockErrorMsg').textContent = `לא נמצאו נתונים עבור ${symbol}.`;
      document.getElementById('stockError').style.display = 'block';
      return;
    }
    renderStockResult(stock);
  } catch(err) {
    document.getElementById('stockLoading').style.display = 'none';
    document.getElementById('stockErrorMsg').textContent = 'שגיאה בטעינת הנתונים. נסה שנית.';
    document.getElementById('stockError').style.display = 'block';
  }
}

function renderStockResult(s) {
  const isUp = s.change >= 0;
  const col = isUp ? 'var(--success)' : 'var(--danger)';
  const arrow = isUp ? '▲' : '▼';
  const watched = watchlist.some(w => w.symbol === s.symbol);
  const cur = s.currency === 'ILS' ? '₪' : '$';
  document.getElementById('stockResult').style.display = 'block';
  document.getElementById('stockResult').innerHTML = `<div class="card" style="border:1.5px solid ${isUp ? 'rgba(16,185,129,.25)' : 'rgba(224,112,112,.25)'};">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.6rem;margin-bottom:.85rem;">
      <div><div style="font-size:1.35rem;font-weight:900;color:var(--text);">${s.symbol} <span style="font-size:.82rem;color:var(--muted);font-weight:400;">${s.exchange}</span></div><div style="color:var(--text2);font-size:.8rem;">${s.name || ''}</div></div>
      <button onclick="addToWatchlist(${JSON.stringify(s).replace(/"/g, '&quot;')})" style="padding:.38rem .85rem;border-radius:50px;border:1.5px solid var(--teal);background:var(--teal-light);color:var(--teal-dark);font-family:Heebo,sans-serif;font-size:.72rem;font-weight:700;cursor:pointer;">${watched ? '⭐ ברשימה' : '☆ הוסף למעקב'}</button>
    </div>
    <div style="display:flex;align-items:baseline;gap:.75rem;margin-bottom:.85rem;">
      <div style="font-size:2.3rem;font-weight:900;color:var(--text);">${cur}${s.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div style="font-size:.92rem;font-weight:700;color:${col};">${arrow} ${Math.abs(s.change)?.toFixed(2)} (${Math.abs(s.changePct)?.toFixed(2)}%)</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.45rem;">
      ${[['פתיחה', s.open ? `${cur}${s.open?.toFixed(2)}` : '—'], ['גבוה', s.high ? `${cur}${s.high?.toFixed(2)}` : '—'], ['נמוך', s.low ? `${cur}${s.low?.toFixed(2)}` : '—'], ['נפח', s.volume || '—'], ['שווי שוק', s.marketCap || '—'], ['P/E', s.pe || '—']].map(([l, v]) => `<div class="stock-stat"><div class="stock-stat-lbl">${l}</div><div class="stock-stat-val">${v}</div></div>`).join('')}
    </div>
    <div style="margin-top:.75rem;font-size:.68rem;color:var(--muted);text-align:center;">נתונים מ-Google Finance · <a href="https://www.google.com/finance/quote/${s.symbol}:${s.exchange}" target="_blank" style="color:var(--teal);">פתח ב-Google Finance ↗</a></div>
  </div>`;
}

function addToWatchlist(stock) {
  if (watchlist.some(w => w.symbol === stock.symbol)) return;
  watchlist.push(stock);
  saveSettings();
  renderWatchlist();
  renderStockResult(stock);
}

function removeFromWatchlist(symbol) {
  watchlist = watchlist.filter(w => w.symbol !== symbol);
  saveSettings();
  renderWatchlist();
}

function renderWatchlist() {
  const card = document.getElementById('watchlistCard');
  const wrap = document.getElementById('watchlistItems');
  if (!watchlist.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  wrap.innerHTML = watchlist.map(s => {
    const isUp = s.change >= 0;
    const col = isUp ? 'var(--success)' : 'var(--danger)';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.48rem 0;border-bottom:1px solid var(--bg2);">
      <div><span style="font-weight:800;font-size:.88rem;">${s.symbol}</span> <span style="font-size:.7rem;color:var(--muted);">${s.name?.split(' ').slice(0, 2).join(' ')}</span></div>
      <div style="display:flex;align-items:center;gap:.75rem;">
        <span style="font-weight:800;font-size:.85rem;">${s.currency === 'ILS' ? '₪' : '$'}${s.price?.toFixed(2)}</span>
        <span style="font-size:.72rem;color:${col};font-weight:700;">${isUp ? '▲' : '▼'}${Math.abs(s.changePct)?.toFixed(2)}%</span>
        <button class="exp-del" onclick="removeFromWatchlist('${s.symbol}')">✕</button>
      </div>
    </div>`;
  }).join('');
}
