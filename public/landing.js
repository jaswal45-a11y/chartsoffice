/**
 * SANGAM — Peaceful Investing Gateway Logic
 * Multi-user auth gateway, rotating wisdom engine, live tickers, modal controller.
 */

// Master Quotes Library (44 wisdom quotes across 11 market legends)
const MASTER_QUOTES = [
  // Mark Minervini
  { author: "Mark Minervini", tag: "Process", text: "The goal of a successful trader is to make the best trades. Money is secondary." },
  { author: "Mark Minervini", tag: "Discipline", text: "You must have a plan before you enter a trade." },
  { author: "Mark Minervini", tag: "Risk Control", text: "Cut your losses quickly and let your winners run." },
  { author: "Mark Minervini", tag: "Mindset", text: "There is no holy grail in the markets." },
  { author: "Mark Minervini", tag: "Humility", text: "The market doesn't care what you think." },

  // William O'Neil
  { author: "William O'Neil", tag: "Risk Control", text: "The whole secret to winning and losing in the stock market is to lose the least amount possible when you're not right." },
  { author: "William O'Neil", tag: "Discipline", text: "Cutting losses short is the single most important rule for making money in the stock market." },
  { author: "William O'Neil", tag: "Strategy", text: "Don't buy a stock because it looks cheap." },
  { author: "William O'Neil", tag: "Momentum", text: "What seems too high and risky to the majority generally goes higher." },
  { author: "William O'Neil", tag: "Mindset", text: "The market is not a place to seek certainty." },

  // Stan Weinstein
  { author: "Stan Weinstein", tag: "Risk Control", text: "The secret to making money in the stock market is not being right all the time, but being wrong as little as possible." },
  { author: "Stan Weinstein", tag: "Trend", text: "The trend is your friend." },
  { author: "Stan Weinstein", tag: "Price Action", text: "Never fight the tape." },
  { author: "Stan Weinstein", tag: "Stages", text: "The key is to identify the stage of the stock and act accordingly." },
  { author: "Stan Weinstein", tag: "Psychology", text: "Don't let emotions dictate your investment decisions." },

  // Nicolas Darvas
  { author: "Nicolas Darvas", tag: "Plan", text: "I decided that I would never buy a stock without a definite plan." },
  { author: "Nicolas Darvas", tag: "Humility", text: "I learned that I should never argue with the tape." },
  { author: "Nicolas Darvas", tag: "Risk Control", text: "I accepted the fact that I was going to be wrong sometimes, and that was okay as long as I kept my losses small." },
  { author: "Nicolas Darvas", tag: "Adaptability", text: "The market is always right, and you have to adapt to it." },
  { author: "Nicolas Darvas", tag: "Momentum", text: "A stock is only good if it is going up." },

  // Kristjan Qullamaggie
  { author: "Kristjan Qullamaggie", tag: "Execution", text: "Focus on the setup, not the money." },
  { author: "Kristjan Qullamaggie", tag: "Velocity", text: "The best trades are the ones that work right away." },
  { author: "Kristjan Qullamaggie", tag: "Trend", text: "Trade with the trend and let the market do the heavy lifting." },
  { author: "Kristjan Qullamaggie", tag: "Selectivity", text: "You don't need to catch every move, just the best ones." },
  { author: "Kristjan Qullamaggie", tag: "Patience", text: "Patience is the most important trait of a successful trader." },

  // Jesse Livermore
  { author: "Jesse Livermore", tag: "Speculation", text: "The game of speculation is the most uniformly fascinating game in the world. But it is not a game for the stupid, the mentally lazy, or the person of inferior emotional balance." },
  { author: "Jesse Livermore", tag: "Price Action", text: "Markets are never wrong, opinions often are." },
  { author: "Jesse Livermore", tag: "Clarity", text: "There is only one side of the market and it is not the bull side or the bear side, but the right side." },
  { author: "Jesse Livermore", tag: "Volume & Tape", text: "It is what people do in the stock market that counts — not what they say they are going to do." },
  { author: "Jesse Livermore", tag: "Timing", text: "Do not anticipate and move without market confirmation — being a little late ensures that your judgment is correct." },

  // Bernard Baruch
  { author: "Bernard Baruch", tag: "Humility", text: "The main purpose of the stock market is to make fools of as many men as possible." },
  { author: "Bernard Baruch", tag: "Tops & Bottoms", text: "Don't try to buy at the bottom and sell at the top. It can't be done except by liars." },
  { author: "Bernard Baruch", tag: "Reserves", text: "Always keep a good part of your capital in a cash reserve." },

  // Benjamin Graham
  { author: "Benjamin Graham", tag: "Time Horizon", text: "In the short run, the market is a voting machine but in the long run, it is a weighing machine." },
  { author: "Benjamin Graham", tag: "Discipline", text: "The individual investor should act consistently as an investor and not as a speculator." },
  { author: "Benjamin Graham", tag: "Value", text: "Price is what you pay; value is what you get." },

  // Warren Buffett
  { author: "Warren Buffett", tag: "Patience", text: "The stock market is designed to transfer money from the Active to the Patient." },
  { author: "Warren Buffett", tag: "Rule #1", text: "Rule No. 1: Never lose money. Rule No. 2: Never forget rule No. 1." },
  { author: "Warren Buffett", tag: "Contrarian", text: "Be fearful when others are greedy, and greedy when others are fearful." },

  // Peter Lynch
  { author: "Peter Lynch", tag: "Understanding", text: "Know what you own, and know why you own it." },
  { author: "Peter Lynch", tag: "Temperament", text: "In the stock market, the most important organ is the stomach, not the brain." },
  { author: "Peter Lynch", tag: "Fundamentals", text: "Behind every stock is a company. Find out what it's doing." },

  // Naval Ravikant
  { author: "Naval Ravikant", tag: "Peaceful", text: "Better a peaceful investor than a busy trader." },
  { author: "Naval Ravikant", tag: "Patience", text: "Impatience with actions, patience with results." },
  { author: "Naval Ravikant", tag: "Compounding", text: "Play long-term games with long-term people." },
  { author: "Naval Ravikant", tag: "Position", text: "Peace is a position too." }
];

// Bottom bar micro-quotes
const BOTTOM_BAR_QUOTES = [
  '"Peace is a position too."',
  '"Discipline beats conviction every time."',
  '"Sit tight and be right."',
  '"The big money is in the waiting."',
  '"Protect capital first; profits take care of themselves."',
  '"Simplicity is the ultimate sophistication."'
];

// State
let currentQuoteIndex = 0;
let quoteIntervalTimer = null;
let bottomQuoteIntervalTimer = null;
let liveTickerIntervalTimer = null;
let currentUser = null;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initLucideIcons();
  initWisdomQuotes();
  initBottomQuotes();
  initAuthSessionCheck();
  initLiveTickers();
  setupKeyboardShortcuts();
});

function initLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/* ==========================================================================
   1. ROTATING MASTER WISDOM ENGINE
   ========================================================================== */
function initWisdomQuotes() {
  currentQuoteIndex = Math.floor(Math.random() * MASTER_QUOTES.length);
  renderQuote(currentQuoteIndex);

  // Auto-switch quotes every 10 seconds
  quoteIntervalTimer = setInterval(() => {
    rotateNextQuote();
  }, 10000);
}

function rotateNextQuote() {
  currentQuoteIndex = (currentQuoteIndex + 1) % MASTER_QUOTES.length;
  renderQuote(currentQuoteIndex);
}

function renderQuote(index) {
  const quote = MASTER_QUOTES[index];
  if (!quote) return;

  const quoteBox = document.getElementById('wisdom-quote-box');
  const quoteText = document.getElementById('wisdom-quote-text');
  const quoteAuthor = document.getElementById('wisdom-quote-author');
  const quoteTag = document.getElementById('wisdom-quote-tag');

  if (!quoteText || !quoteAuthor) return;

  // Smooth fade transition
  quoteText.style.opacity = '0';
  quoteText.style.transform = 'translateY(4px)';

  setTimeout(() => {
    quoteText.textContent = '"' + quote.text + '"';
    quoteAuthor.textContent = '— ' + quote.author;
    if (quoteTag) quoteTag.textContent = quote.tag;

    quoteText.style.opacity = '1';
    quoteText.style.transform = 'translateY(0)';
  }, 250);
}

function initBottomQuotes() {
  let bottomIdx = 0;
  bottomQuoteIntervalTimer = setInterval(() => {
    bottomIdx = (bottomIdx + 1) % BOTTOM_BAR_QUOTES.length;
    const el = document.getElementById('bottom-bar-quote');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = BOTTOM_BAR_QUOTES[bottomIdx];
        el.style.opacity = '1';
      }, 300);
    }
  }, 14000);
}

/* ==========================================================================
   2. LIVE INDEX TICKERS POLLER
   ========================================================================== */
async function initLiveTickers() {
  await fetchLiveIndexQuotes();
  liveTickerIntervalTimer = setInterval(fetchLiveIndexQuotes, 20000);
}

async function fetchLiveIndexQuotes() {
  try {
    const symbols = 'NIFTY 50,SENSEX,NIFTY BANK,MIDSMALL400,DXY,GOLD CFD,SilverCFD,Copper,US10 Year yield,Bitcoin';
    const res = await fetch(`/api/fno/live-quotes?symbols=${encodeURIComponent(symbols)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.success && data.quotes) {
      updateTickerUI(data.quotes);
    }
  } catch (err) {
    try {
      const bRes = await fetch('/api/market-breadth');
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.indexQuotes) {
          updateTickerUI(bData.indexQuotes);
        }
      }
    } catch (e) {
      // Quiet fallback
    }
  }
}

function updateTickerUI(quotes) {
  if (!quotes || typeof quotes !== 'object') return;

  const nifty = quotes['NIFTY 50'] || quotes['NIFTY'] || quotes['^NSEI'];
  const sensex = quotes['SENSEX'] || quotes['^BSESN'] || quotes['BSE:SENSEX'];
  const bank = quotes['NIFTY BANK'] || quotes['BANKNIFTY'] || quotes['^NSEBANK'];
  const midsmall = quotes['MIDSMALL400'] || quotes['MIDSMALL 400'] || quotes['^CRSLDX'] || quotes['NIFTY_MIDCAP_100.NS'];
  const dxy = quotes['DXY'] || quotes['DX-Y.NYB'] || quotes['USD'];
  const gold = quotes['GOLD CFD'] || quotes['GOLDCFD'] || quotes['GC=F'] || quotes['GOLD'];
  const silver = quotes['SILVERCFD'] || quotes['SILVER CFD'] || quotes['SI=F'] || quotes['SILVER'];
  const copper = quotes['COPPER'] || quotes['HG=F'];
  const us10y = quotes['US10 YEAR YIELD'] || quotes['US10Y'] || quotes['US10YEAR YIELD'] || quotes['^TNX'];
  const btc = quotes['BITCOIN'] || quotes['BTC'] || quotes['BTC-USD'];

  if (nifty) applyTicker('ticker-nifty', nifty);
  if (sensex) applyTicker('ticker-sensex', sensex);
  if (bank) applyTicker('ticker-bank', bank);
  if (midsmall) applyTicker('ticker-midsmall', midsmall);
  if (dxy) applyTicker('ticker-dxy', dxy, { prefix: '$', decimals: 2 });
  if (gold) applyTicker('ticker-gold', gold, { prefix: '$', decimals: 1 });
  if (silver) applyTicker('ticker-silver', silver, { prefix: '$', decimals: 2 });
  if (copper) applyTicker('ticker-copper', copper, { prefix: '$', decimals: 3 });
  if (us10y) applyTicker('ticker-us10y', us10y, { suffix: '%', decimals: 3 });
  if (btc) applyTicker('ticker-btc', btc, { prefix: '$', decimals: 0 });
}

function applyTicker(prefix, quote, opts = {}) {
  const priceEl = document.getElementById(prefix + '-price');
  const chgEl = document.getElementById(prefix + '-chg');
  if (!priceEl || !chgEl) return;

  const price = quote.price || quote.ltp || quote.close || 0;
  const change = quote.change || (quote.close && quote.prevClose ? quote.close - quote.prevClose : 0);
  const pChange = quote.changePercent != null ? quote.changePercent : (quote.pChange != null ? quote.pChange : (quote.prevClose ? (change / quote.prevClose) * 100 : 0));

  if (price > 0) {
    const decimals = opts.decimals !== undefined ? opts.decimals : 2;
    let formattedPrice = Number(price).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (opts.prefix) formattedPrice = opts.prefix + formattedPrice;
    if (opts.suffix) formattedPrice = formattedPrice + opts.suffix;
    priceEl.textContent = formattedPrice;
  }

  const isPositive = pChange >= 0;
  const sign = isPositive ? '+' : '';
  chgEl.textContent = sign + Number(pChange).toFixed(2) + '%';

  if (isPositive) {
    chgEl.className = 'px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  } else {
    chgEl.className = 'px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20';
  }
}

/* ==========================================================================
   3. AUTHENTICATION SESSION & GATEWAY
   ========================================================================== */
async function initAuthSessionCheck() {
  const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  if (!token) {
    renderUnauthenticatedUI();
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && (data.user || data.username)) {
        currentUser = data.user || { username: data.username, role: data.role };
        renderAuthenticatedUI(currentUser);
        return;
      }
    }
  } catch (err) {
    console.warn('Session verification error:', err);
  }

  renderUnauthenticatedUI();
}

function renderAuthenticatedUI(user) {
  const showcaseUnauthed = document.getElementById('showcase-unauthed');
  const showcaseAuthed = document.getElementById('showcase-authed');
  const usernameEl = document.getElementById('recognized-username');
  const avatarEl = document.getElementById('recognized-user-avatar');
  const headerLoginBtn = document.getElementById('btn-header-login');

  if (showcaseUnauthed) showcaseUnauthed.classList.add('hidden');
  if (showcaseAuthed) {
    showcaseAuthed.classList.remove('hidden');
    showcaseAuthed.classList.add('flex');
  }

  const name = user.username || 'Investor';
  if (usernameEl) usernameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

  if (headerLoginBtn) {
    headerLoginBtn.innerHTML = '<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>' + name + ' &rarr;</span>';
    headerLoginBtn.onclick = () => window.location.href = '/screener';
  }

  initLucideIcons();
}

function renderUnauthenticatedUI() {
  const showcaseUnauthed = document.getElementById('showcase-unauthed');
  const showcaseAuthed = document.getElementById('showcase-authed');
  const headerLoginBtn = document.getElementById('btn-header-login');

  if (showcaseUnauthed) showcaseUnauthed.classList.remove('hidden');
  if (showcaseAuthed) {
    showcaseAuthed.classList.add('hidden');
    showcaseAuthed.classList.remove('flex');
  }

  if (headerLoginBtn) {
    headerLoginBtn.textContent = 'Login';
    headerLoginBtn.onclick = openLoginModal;
  }
  initLucideIcons();
}

function openLoginModal() {
  const modal = document.getElementById('modal-login');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const banner = document.getElementById('auth-alert-banner');
    if (banner) banner.className = 'hidden';
    const input = document.getElementById('input-username');
    if (input) setTimeout(() => input.focus(), 100);
  }
  initLucideIcons();
}

function closeLoginModal() {
  const modal = document.getElementById('modal-login');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  const banner = document.getElementById('auth-alert-banner');
  if (banner) banner.className = 'hidden';
}

function focusAuthCard() {
  openLoginModal();
}

/* ==========================================================================
   4. LOGIN FORM SUBMISSION
   ========================================================================== */
async function handleLandingLogin(e) {
  if (e && e.preventDefault) e.preventDefault();

  const usernameInput = document.getElementById('input-username');
  const passwordInput = document.getElementById('input-password');
  const alertBanner = document.getElementById('auth-alert-banner');
  const submitBtn = document.getElementById('btn-submit-login');
  const submitBtnText = document.getElementById('btn-login-text');

  const username = (usernameInput ? usernameInput.value : '').trim();
  const password = passwordInput ? passwordInput.value : '';

  if (alertBanner) {
    alertBanner.className = 'hidden';
    alertBanner.innerHTML = '';
  }

  if (!username || !password) {
    showAlertBanner('Please enter your username and password.', 'error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (submitBtnText) submitBtnText.textContent = 'Authenticating...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showAlertBanner(data.error || 'Invalid credentials. Please check your username and password.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = 'Enter SANGAM';
      return;
    }

    // Save token
    localStorage.setItem('authToken', data.token);

    if (data.indicatorPreferences) {
      try { localStorage.setItem('user_indicator_prefs', JSON.stringify(data.indicatorPreferences)); } catch (e) {}
    }
    if (typeof data.notes === 'string') {
      try { localStorage.setItem('sangam_user_notes', data.notes); } catch (e) {}
    }

    showAlertBanner('Welcome, ' + data.username + '! Entering Sangam...', 'success');
    if (submitBtnText) submitBtnText.textContent = 'Redirecting...';

    setTimeout(() => {
      window.location.href = '/screener';
    }, 600);

  } catch (err) {
    showAlertBanner('Unable to connect to server: ' + err.message, 'error');
    if (submitBtn) submitBtn.disabled = false;
    if (submitBtnText) submitBtnText.textContent = 'Enter SANGAM';
  }
}

function showAlertBanner(msg, type) {
  const alertBanner = document.getElementById('auth-alert-banner');
  if (!alertBanner) return;

  alertBanner.classList.remove('hidden');
  if (type === 'success') {
    alertBanner.className = 'px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    alertBanner.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 flex-shrink-0"></i><span>' + msg + '</span>';
  } else {
    alertBanner.className = 'px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 bg-rose-500/15 text-rose-300 border border-rose-500/30';
    alertBanner.innerHTML = '<i data-lucide="alert-circle" class="w-4 h-4 text-rose-400 flex-shrink-0"></i><span>' + msg + '</span>';
  }
  initLucideIcons();
}

async function handleLandingLogout() {
  const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
    } catch (e) {}
  }

  localStorage.removeItem('authToken');
  localStorage.removeItem('adminToken');
  currentUser = null;
  renderUnauthenticatedUI();
  showAlertBanner('You have been logged out safely.', 'success');
}

function continueAsGuest() {
  window.location.href = '/screener';
}

/* ==========================================================================
   5. REGISTRATION MODAL
   ========================================================================== */
function openRegisterModal() {
  const modal = document.getElementById('modal-register');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const input = document.getElementById('reg-username');
    if (input) setTimeout(() => input.focus(), 100);
  }
  initLucideIcons();
}

function closeRegisterModal() {
  const modal = document.getElementById('modal-register');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  const banner = document.getElementById('register-alert-banner');
  if (banner) banner.className = 'hidden';
}

async function handleLandingRegister(e) {
  if (e && e.preventDefault) e.preventDefault();

  const regUser = document.getElementById('reg-username');
  const regPass = document.getElementById('reg-password');
  const regConf = document.getElementById('reg-confirm');
  const banner = document.getElementById('register-alert-banner');
  const submitBtn = document.getElementById('btn-reg-submit');

  const username = (regUser ? regUser.value : '').trim();
  const password = regPass ? regPass.value : '';
  const confirm = regConf ? regConf.value : '';

  if (banner) banner.className = 'hidden';

  if (!username || !password) {
    showRegisterAlert('Please fill in all fields.', 'error');
    return;
  }

  if (password !== confirm) {
    showRegisterAlert('Passwords do not match!', 'error');
    return;
  }

  if (password.length < 6) {
    showRegisterAlert('Password must be at least 6 characters.', 'error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showRegisterAlert(data.error || 'Registration failed.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    // Success
    localStorage.setItem('authToken', data.token);
    showRegisterAlert('Account registered successfully! Entering SANGAM...', 'success');

    setTimeout(() => {
      window.location.href = '/screener';
    }, 700);

  } catch (err) {
    showRegisterAlert('Registration server error: ' + err.message, 'error');
    if (submitBtn) submitBtn.disabled = false;
  }
}

function showRegisterAlert(msg, type) {
  const banner = document.getElementById('register-alert-banner');
  if (!banner) return;

  banner.classList.remove('hidden');
  if (type === 'success') {
    banner.className = 'px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    banner.textContent = msg;
  } else {
    banner.className = 'px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 bg-rose-500/15 text-rose-300 border border-rose-500/30';
    banner.textContent = msg;
  }
}

/* ==========================================================================
   6. MODAL UTILITIES
   ========================================================================== */
function openAboutModal() {
  const m = document.getElementById('modal-about');
  if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
  initLucideIcons();
}

function closeAboutModal() {
  const m = document.getElementById('modal-about');
  if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}

function openForgotPasswordModal() {
  const m = document.getElementById('modal-forgot-password');
  if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
  initLucideIcons();
}

function closeForgotPasswordModal() {
  const m = document.getElementById('modal-forgot-password');
  if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}

function openTermsModal() {
  alert('Sangam Peaceful Investing: All tools, screeners, and chart indicators are strictly for research and educational purposes. Always manage your risk.');
}

function openPrivacyModal() {
  alert('Privacy First: Your custom watchlists, drawing notes, and screeners are securely stored and never shared.');
}

function openContactModal() {
  alert('Contact & Community: Join our peaceful investing research circle via Twitter/X or GitHub.');
}

/* ==========================================================================
   7. UI HELPERS & ACCESSIBILITY
   ========================================================================== */
function togglePasswordVisibility() {
  const pwdInput = document.getElementById('input-password');
  const eyeIcon = document.getElementById('icon-pwd-eye');
  if (!pwdInput) return;

  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye-off');
  } else {
    pwdInput.type = 'password';
    if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye');
  }
  initLucideIcons();
}

function focusAuthCard() {
  openLoginModal();
}

function toggleTwilightMode() {
  document.body.classList.toggle('twilight-glow');
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.classList.toggle('text-teal-400');
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLoginModal();
      closeAboutModal();
      closeForgotPasswordModal();
      closeRegisterModal();
    }
  });

  // Close modals on backdrop click
  ['modal-login', 'modal-about', 'modal-forgot-password', 'modal-register'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        }
      });
    }
  });
}

// Window Globals for inline HTML onclick handlers
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.openForgotPasswordModal = openForgotPasswordModal;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.openAboutModal = openAboutModal;
window.closeAboutModal = closeAboutModal;
window.openTermsModal = openTermsModal;
window.openPrivacyModal = openPrivacyModal;
window.openContactModal = openContactModal;
window.focusAuthCard = focusAuthCard;
window.handleLandingLogin = handleLandingLogin;
window.handleLandingRegister = handleLandingRegister;
window.handleLandingLogout = handleLandingLogout;
window.continueAsGuest = continueAsGuest;
window.togglePasswordVisibility = togglePasswordVisibility;
window.toggleTwilightMode = toggleTwilightMode;
window.rotateNextQuote = rotateNextQuote;
