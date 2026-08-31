# MarketPulse Hub — Localhost Stock Screener & Visualizer

A fast, modern local trading terminal that runs **10–15 Chartink screeners** at the click of a button and visualizes matching Indian stocks (NSE/BSE) on **interactive TradingView candlestick charts** with technical indicators.

---

## 🚀 Quick Start

### Option 1: Double Click
Double click the `run_screener_hub.bat` file in the root folder. It will start the local server and automatically open the website in your default browser at:
```
http://localhost:3000
```

### Option 2: Command Line
```powershell
cd stock_screener_app
node server.js
```
Then open `http://localhost:3000` in Chrome, Edge, Brave, or Firefox.

---

## 🌟 Key Features

1. **Screener Command Deck (10–15 Screeners Visible Together)**:
   - All your screeners are arranged on a single dashboard screen with 1-click execution buttons.
   - Filter by categories: **All, Intraday, Breakout, Swing, Momentum, Reversal**.
   - Live execution spinner and match counts.

2. **"Run All Screeners" Confluence Engine**:
   - 1-click execution across all screeners simultaneously.
   - Aggregates unique stocks and tags stocks with **Confluence Badges** (e.g. `3x Confluence` if a stock appears in multiple screeners like Volume Surge + 15m Breakout + 52W High).

3. **Interactive TradingView Candlestick Visualizer**:
   - Clicking any stock row in the table instantly updates the right-hand TradingView chart.
   - Pre-loaded with RSI, Simple Moving Average (SMA), and Volume.
   - Timeframe switcher: `5m`, `15m`, `1h`, `1D`, `1W`.
   - Direct shortcut links to open the stock in full TradingView or on Chartink.

4. **Add / Edit Your Custom Chartink Screeners**:
   - Click the **"+ Add Screener"** button at the top right.
   - Paste any public Chartink screener link (e.g. `https://chartink.com/screener/my-screener`).
   - Use the **"Test Run Link"** button to preview how many stocks it finds right now.
   - Click Save to permanently store it in your dashboard (`data/screeners.json`).

5. **Export to CSV**:
   - Download the scan results for any screener or the aggregated confluence scan to a `.csv` file.

6. **Dark & Light Mode**:
   - Toggle between Bloomberg-style dark financial terminal theme and crisp light theme.
