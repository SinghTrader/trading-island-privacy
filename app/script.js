/* =========================================================
   TRADING ISLAND — DASHBOARD
   app/script.js
   ========================================================= */

const addTradeButton = document.querySelector("#addTradeButton");
const tradeModal = document.querySelector("#tradeModal");
const closeModalButton = document.querySelector("#closeModal");
const cancelTradeButton = document.querySelector("#cancelTrade");
const tradeForm = document.querySelector("#tradeForm");

const marketInput = document.querySelector("#market");
const directionInput = document.querySelector("#direction");
const entryInput = document.querySelector("#entry");
const exitInput = document.querySelector("#exit");
const pnlInput = document.querySelector("#pnl");
const strategyInput = document.querySelector("#strategy");
const notesInput = document.querySelector("#notes");

const STORAGE_KEY = "tradingIslandTrades";


/* =========================================================
   DEMO TRADES
   ========================================================= */

const demoTrades = [
  {
    id: 1,
    market: "BTC/USD",
    assetName: "Bitcoin",
    direction: "Long",
    strategy: "Breakout",
    pnl: 214.50,
    date: "2026-09-22"
  },
  {
    id: 2,
    market: "EUR/USD",
    assetName: "Forex",
    direction: "Short",
    strategy: "Reversal",
    pnl: -72.20,
    date: "2026-09-21"
  },
  {
    id: 3,
    market: "NVDA",
    assetName: "NVIDIA",
    direction: "Long",
    strategy: "Momentum",
    pnl: 186.30,
    date: "2026-09-20"
  },
  {
    id: 4,
    market: "ETH/USD",
    assetName: "Ethereum",
    direction: "Long",
    strategy: "Support Bounce",
    pnl: 94.80,
    date: "2026-09-18"
  }
];


/* =========================================================
   LOAD TRADES
   ========================================================= */

function loadTrades() {
  const storedTrades = localStorage.getItem(STORAGE_KEY);

  if (!storedTrades) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(demoTrades)
    );

    return [...demoTrades];
  }

  try {
    return JSON.parse(storedTrades);
  } catch (error) {
    console.error("Could not load trades:", error);

    return [...demoTrades];
  }
}

let trades = loadTrades();


/* =========================================================
   SAVE TRADES
   ========================================================= */

function saveTrades() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(trades)
  );
}


/* =========================================================
   MODAL
   ========================================================= */

function openTradeModal() {
  tradeModal.classList.add("show");

  document.body.style.overflow = "hidden";

  setTimeout(() => {
    marketInput.focus();
  }, 150);
}

function closeTradeModal() {
  tradeModal.classList.remove("show");

  document.body.style.overflow = "";

  tradeForm.reset();
}

if (addTradeButton) {
  addTradeButton.addEventListener(
    "click",
    openTradeModal
  );
}

if (closeModalButton) {
  closeModalButton.addEventListener(
    "click",
    closeTradeModal
  );
}

if (cancelTradeButton) {
  cancelTradeButton.addEventListener(
    "click",
    closeTradeModal
  );
}

if (tradeModal) {
  tradeModal.addEventListener(
    "click",
    (event) => {
      if (event.target === tradeModal) {
        closeTradeModal();
      }
    }
  );
}

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      tradeModal.classList.contains("show")
    ) {
      closeTradeModal();
    }
  }
);


/* =========================================================
   ADD NEW TRADE
   ========================================================= */

tradeForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    const market = marketInput.value
      .trim()
      .toUpperCase();

    const direction = directionInput.value;

    const entry = Number(entryInput.value) || 0;
    const exit = Number(exitInput.value) || 0;
    const pnl = Number(pnlInput.value);

    const strategy =
      strategyInput.value.trim() || "No strategy";

    const notes = notesInput.value.trim();

    if (!market) {
      alert("Please enter a market.");
      return;
    }

    if (Number.isNaN(pnl)) {
      alert("Please enter your P&L.");
      return;
    }

    const newTrade = {
      id: Date.now(),

      market,
      assetName: getAssetName(market),

      direction,
      entry,
      exit,
      pnl,
      strategy,
      notes,

      date: getTodayDate()
    };

    trades.unshift(newTrade);

    saveTrades();

    renderDashboard();

    closeTradeModal();
  }
);


/* =========================================================
   HELPERS
   ========================================================= */

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAssetName(market) {
  const names = {
    "BTC/USD": "Bitcoin",
    "ETH/USD": "Ethereum",
    "EUR/USD": "Forex",
    "GBP/USD": "Forex",
    "USD/JPY": "Forex",
    "AAPL": "Apple",
    "NVDA": "NVIDIA",
    "TSLA": "Tesla",
    "MSFT": "Microsoft",
    "GOOGL": "Alphabet",
    "AMZN": "Amazon"
  };

  return names[market] || "Market";
}

function getAssetIcon(market) {
  if (market.includes("BTC")) {
    return "₿";
  }

  if (market.includes("ETH")) {
    return "E";
  }

  if (market.includes("EUR")) {
    return "€";
  }

  if (market.includes("GBP")) {
    return "£";
  }

  return market.charAt(0);
}

function formatMoney(value) {
  const sign =
    value > 0
      ? "+"
      : value < 0
        ? "-"
        : "";

  return `${sign}€${Math.abs(value).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )}`;
}

function formatDate(dateString) {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}


/* =========================================================
   CALCULATIONS
   ========================================================= */

function calculateStats() {
  const totalTrades = trades.length;

  const wins = trades.filter(
    (trade) => trade.pnl > 0
  );

  const losses = trades.filter(
    (trade) => trade.pnl < 0
  );

  const totalPnl = trades.reduce(
    (total, trade) => total + trade.pnl,
    0
  );

  const winRate =
    totalTrades > 0
      ? (wins.length / totalTrades) * 100
      : 0;

  const grossProfit = wins.reduce(
    (total, trade) => total + trade.pnl,
    0
  );

  const grossLoss = Math.abs(
    losses.reduce(
      (total, trade) => total + trade.pnl,
      0
    )
  );

  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
        ? grossProfit
        : 0;

  const averageWin =
    wins.length > 0
      ? grossProfit / wins.length
      : 0;

  const averageLoss =
    losses.length > 0
      ? grossLoss / losses.length
      : 0;

  const bestTrade =
    trades.length > 0
      ? Math.max(
          ...trades.map((trade) => trade.pnl)
        )
      : 0;

  const worstTrade =
    trades.length > 0
      ? Math.min(
          ...trades.map((trade) => trade.pnl)
        )
      : 0;

  return {
    totalTrades,
    wins,
    losses,
    totalPnl,
    winRate,
    grossProfit,
    grossLoss,
    profitFactor,
    averageWin,
    averageLoss,
    bestTrade,
    worstTrade
  };
}


/* =========================================================
   UPDATE STAT CARDS
   ========================================================= */

function renderStats() {
  const stats = calculateStats();

  const statCards =
    document.querySelectorAll(".stat-card");

  if (statCards.length < 4) {
    return;
  }

  const totalPnlElement =
    statCards[0].querySelector("h3");

  totalPnlElement.textContent =
    formatMoney(stats.totalPnl);

  totalPnlElement.classList.remove(
    "positive",
    "negative"
  );

  if (stats.totalPnl > 0) {
    totalPnlElement.classList.add("positive");
  }

  if (stats.totalPnl < 0) {
    totalPnlElement.classList.add("negative");
  }


  const winRateElement =
    statCards[1].querySelector("h3");

  winRateElement.textContent =
    `${stats.winRate.toFixed(1)}%`;

  const winRateDescription =
    statCards[1].querySelector("p");

  winRateDescription.textContent =
    `${stats.wins.length} wins · ${stats.losses.length} losses`;


  const profitFactorElement =
    statCards[2].querySelector("h3");

  profitFactorElement.textContent =
    stats.profitFactor.toFixed(2);


  const totalTradesElement =
    statCards[3].querySelector("h3");

  totalTradesElement.textContent =
    stats.totalTrades;
}


/* =========================================================
   PERFORMANCE PANEL
   ========================================================= */

function renderPerformance() {
  const stats = calculateStats();

  const rows =
    document.querySelectorAll(
      ".performance-row strong"
    );

  if (rows.length < 5) {
    return;
  }

  rows[0].textContent =
    formatMoney(stats.averageWin);

  rows[1].textContent =
    stats.averageLoss > 0
      ? `-€${stats.averageLoss.toFixed(2)}`
      : "€0.00";

  rows[2].textContent =
    formatMoney(stats.bestTrade);

  rows[3].textContent =
    formatMoney(stats.worstTrade);
}


/* =========================================================
   RECENT TRADES TABLE
   ========================================================= */

function renderTrades() {
  const tableBody =
    document.querySelector(
      ".trades-panel tbody"
    );

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = "";

  const recentTrades =
    trades.slice(0, 8);

  if (recentTrades.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          No trades yet. Add your first trade.
        </td>
      </tr>
    `;

    return;
  }

  recentTrades.forEach((trade) => {
    const isWin = trade.pnl > 0;

    const row =
      document.createElement("tr");

    row.innerHTML = `
      <td>
        <div class="market-cell">

          <div class="asset-icon">
            ${getAssetIcon(trade.market)}
          </div>

          <div>
            <strong>
              ${escapeHtml(trade.market)}
            </strong>

            <span>
              ${escapeHtml(trade.assetName)}
            </span>
          </div>

        </div>
      </td>

      <td>
        <span class="badge ${
          trade.direction.toLowerCase()
        }">
          ${escapeHtml(
            trade.direction.toUpperCase()
          )}
        </span>
      </td>

      <td>
        ${escapeHtml(trade.strategy)}
      </td>

      <td>
        ${formatDate(trade.date)}
      </td>

      <td>
        <span class="result ${
          isWin ? "win" : "loss"
        }">
          ${
            trade.pnl === 0
              ? "BE"
              : isWin
                ? "WIN"
                : "LOSS"
          }
        </span>
      </td>

      <td class="${
        trade.pnl > 0
          ? "positive"
          : trade.pnl < 0
            ? "negative"
            : ""
      }">
        ${formatMoney(trade.pnl)}
      </td>
    `;

    tableBody.appendChild(row);
  });
}


/* =========================================================
   BASIC HTML SECURITY
   ========================================================= */

function escapeHtml(value) {
  const element =
    document.createElement("div");

  element.textContent = value;

  return element.innerHTML;
}


/* =========================================================
   CHART TABS
   ========================================================= */

const chartTabs =
  document.querySelectorAll(".chart-tab");

chartTabs.forEach((tab) => {
  tab.addEventListener(
    "click",
    () => {
      chartTabs.forEach(
        (otherTab) => {
          otherTab.classList.remove("active");
        }
      );

      tab.classList.add("active");
    }
  );
});


/* =========================================================
   NAVIGATION VISUAL STATE
   ========================================================= */

const navItems =
  document.querySelectorAll(".nav-item");

navItems.forEach((item) => {
  item.addEventListener(
    "click",
    (event) => {
      const text =
        item.textContent.trim();

      if (
        text === "Settings" ||
        text === "Journal" ||
        text === "Calendar" ||
        text === "Analytics" ||
        text === "Watchlist" ||
        text === "Risk Calculator" ||
        text === "Strategies" ||
        text === "Trade Review"
      ) {
        event.preventDefault();
      }

      navItems.forEach(
        (navItem) => {
          navItem.classList.remove("active");
        }
      );

      item.classList.add("active");
    }
  );
});


/* =========================================================
   INITIAL RENDER
   ========================================================= */

function renderDashboard() {
  renderStats();
  renderPerformance();
  renderTrades();
}

renderDashboard();
