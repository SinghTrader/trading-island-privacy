/* =========================================================
   TRADING ISLAND — DASHBOARD
   app/script.js
   ========================================================= */


/* =========================================================
   1. CHECK CONFIG
   ========================================================= */

if (!window.TRADING_ISLAND_CONFIG) {
  throw new Error(
    "Trading Island configuration could not be loaded."
  );
}

const {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} = window.TRADING_ISLAND_CONFIG;


/* =========================================================
   2. CREATE SUPABASE CLIENT
   ========================================================= */

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   3. GLOBAL DATA
   ========================================================= */

let currentUser = null;
let trades = [];


/* =========================================================
   4. ELEMENTS
   ========================================================= */

const addTradeButton =
  document.querySelector("#addTradeButton");

const tradeModal =
  document.querySelector("#tradeModal");

const closeModalButton =
  document.querySelector("#closeModal");

const cancelTradeButton =
  document.querySelector("#cancelTrade");

const tradeForm =
  document.querySelector("#tradeForm");

const saveTradeButton =
  document.querySelector("#saveTradeButton");

const tradeMessage =
  document.querySelector("#tradeMessage");


const marketInput =
  document.querySelector("#market");

const directionInput =
  document.querySelector("#direction");

const entryInput =
  document.querySelector("#entry");

const exitInput =
  document.querySelector("#exit");

const pnlInput =
  document.querySelector("#pnl");

const strategyInput =
  document.querySelector("#strategy");

const tradeDateInput =
  document.querySelector("#tradeDate");

const notesInput =
  document.querySelector("#notes");


const tradesTableBody =
  document.querySelector("#tradesTableBody");


const totalPnlElement =
  document.querySelector("#totalPnl");

const pnlSubtextElement =
  document.querySelector("#pnlSubtext");

const winRateElement =
  document.querySelector("#winRate");

const winRateSubtextElement =
  document.querySelector("#winRateSubtext");

const profitFactorElement =
  document.querySelector("#profitFactor");

const totalTradesElement =
  document.querySelector("#totalTrades");

const tradeSubtextElement =
  document.querySelector("#tradeSubtext");


const averageWinElement =
  document.querySelector("#averageWin");

const averageLossElement =
  document.querySelector("#averageLoss");

const bestTradeElement =
  document.querySelector("#bestTrade");

const worstTradeElement =
  document.querySelector("#worstTrade");

const averageRRElement =
  document.querySelector("#averageRR");


const userNameElement =
  document.querySelector("#userName");

const userEmailElement =
  document.querySelector("#userEmail");

const userInitialElement =
  document.querySelector("#userInitial");

const welcomeNameElement =
  document.querySelector("#welcomeName");

const logoutButton =
  document.querySelector("#logoutButton");

const dateButton =
  document.querySelector("#dateButton");


/* =========================================================
   5. START APP
   ========================================================= */

async function initializeApp() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {
      throw error;
    }


    if (!data.session) {

      window.location.href =
        "/app/login.html";

      return;
    }


    currentUser =
      data.session.user;


    renderUser();


    setTodayDate();


    await loadTrades();


  } catch (error) {

    console.error(
      "App initialization error:",
      error
    );

    showTableMessage(
      "Could not load Trading Island."
    );

  }

}


/* =========================================================
   6. USER
   ========================================================= */

function renderUser() {

  if (!currentUser) {
    return;
  }


  const metadataName =
    currentUser.user_metadata?.name;


  let displayName =
    metadataName?.trim();


  if (!displayName) {

    displayName =
      currentUser.email
        ?.split("@")[0] ||
      "Trader";

  }


  userNameElement.textContent =
    displayName;

  welcomeNameElement.textContent =
    displayName;

  userEmailElement.textContent =
    currentUser.email || "";


  const initial =
    displayName
      .charAt(0)
      .toUpperCase();


  userInitialElement.textContent =
    initial || "T";

}


/* =========================================================
   7. LOAD TRADES FROM SUPABASE
   ========================================================= */

async function loadTrades() {

  showTableMessage(
    "Loading your trades..."
  );


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("trades")
        .select("*")
        .order(
          "trade_date",
          {
            ascending: false
          }
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }


    trades =
      Array.isArray(data)
        ? data
        : [];


    renderDashboard();


  } catch (error) {

    console.error(
      "Load trades error:",
      error
    );


    trades = [];


    renderStats();
    renderPerformance();


    showTableMessage(
      "Could not load your trades."
    );

  }

}


/* =========================================================
   8. ADD TRADE
   ========================================================= */

tradeForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!currentUser) {
      return;
    }


    clearTradeMessage();


    const market =
      marketInput.value
        .trim()
        .toUpperCase();


    const direction =
      directionInput.value;


    const pnl =
      Number(pnlInput.value);


    const tradeDate =
      tradeDateInput.value;


    if (!market) {

      showTradeMessage(
        "Please enter a market.",
        "error"
      );

      return;
    }


    if (
      direction !== "Long" &&
      direction !== "Short"
    ) {

      showTradeMessage(
        "Please select a valid direction.",
        "error"
      );

      return;
    }


    if (
      pnlInput.value === "" ||
      !Number.isFinite(pnl)
    ) {

      showTradeMessage(
        "Please enter a valid P&L.",
        "error"
      );

      return;
    }


    if (!tradeDate) {

      showTradeMessage(
        "Please select a trade date.",
        "error"
      );

      return;
    }


    const entryPrice =
      entryInput.value === ""
        ? null
        : Number(entryInput.value);


    const exitPrice =
      exitInput.value === ""
        ? null
        : Number(exitInput.value);


    if (
      entryPrice !== null &&
      !Number.isFinite(entryPrice)
    ) {

      showTradeMessage(
        "Please enter a valid entry price.",
        "error"
      );

      return;
    }


    if (
      exitPrice !== null &&
      !Number.isFinite(exitPrice)
    ) {

      showTradeMessage(
        "Please enter a valid exit price.",
        "error"
      );

      return;
    }


    saveTradeButton.disabled = true;

    saveTradeButton.textContent =
      "Saving...";


    try {

      const newTrade = {

        user_id:
          currentUser.id,

        market:
          market,

        asset_name:
          market,

        direction:
          direction,

        entry_price:
          entryPrice,

        exit_price:
          exitPrice,

        pnl:
          pnl,

        strategy:
          strategyInput.value.trim() ||
          null,

        notes:
          notesInput.value.trim() ||
          null,

        trade_date:
          tradeDate

      };


      const {
        data,
        error
      } =
        await supabaseClient
          .from("trades")
          .insert(newTrade)
          .select()
          .single();


      if (error) {
        throw error;
      }


      trades.push(data);


      sortTrades();


      renderDashboard();


      tradeForm.reset();

      setTodayDate();

      closeTradeModal();


  } catch (error) {

      console.error(
        "Save trade error:",
        error
      );


      showTradeMessage(
        error.message ||
          "Could not save your trade.",
        "error"
      );


    } finally {

      saveTradeButton.disabled = false;

      saveTradeButton.textContent =
        "Save trade";

    }

  }
);


/* =========================================================
   9. SORT TRADES
   ========================================================= */

function sortTrades() {

  trades.sort(
    (a, b) => {

      const dateA =
        new Date(
          `${a.trade_date}T00:00:00`
        );


      const dateB =
        new Date(
          `${b.trade_date}T00:00:00`
        );


      if (
        dateB.getTime() !==
        dateA.getTime()
      ) {

        return (
          dateB.getTime() -
          dateA.getTime()
        );

      }


      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );

    }
  );

}


/* =========================================================
   10. CALCULATE STATS
   ========================================================= */

function calculateStats() {

  const totalTrades =
    trades.length;


  const winningTrades =
    trades.filter(
      trade =>
        Number(trade.pnl) > 0
    );


  const losingTrades =
    trades.filter(
      trade =>
        Number(trade.pnl) < 0
    );


  const totalPnl =
    trades.reduce(
      (total, trade) =>
        total + Number(trade.pnl || 0),
      0
    );


  const grossProfit =
    winningTrades.reduce(
      (total, trade) =>
        total + Number(trade.pnl || 0),
      0
    );


  const grossLoss =
    Math.abs(
      losingTrades.reduce(
        (total, trade) =>
          total + Number(trade.pnl || 0),
        0
      )
    );


  const winRate =
    totalTrades > 0
      ? (
          winningTrades.length /
          totalTrades
        ) * 100
      : 0;


  let profitFactor = 0;


  if (
    grossLoss > 0
  ) {

    profitFactor =
      grossProfit / grossLoss;

  } else if (
    grossProfit > 0
  ) {

    profitFactor =
      Infinity;

  }


  const averageWin =
    winningTrades.length > 0
      ? grossProfit /
        winningTrades.length
      : 0;


  const averageLoss =
    losingTrades.length > 0
      ? grossLoss /
        losingTrades.length
      : 0;


  const pnlValues =
    trades.map(
      trade =>
        Number(trade.pnl || 0)
    );


  const bestTrade =
    pnlValues.length > 0
      ? Math.max(...pnlValues)
      : 0;


  const worstTrade =
    pnlValues.length > 0
      ? Math.min(...pnlValues)
      : 0;


  return {

    totalTrades,

    winningTrades:
      winningTrades.length,

    losingTrades:
      losingTrades.length,

    totalPnl,

    winRate,

    profitFactor,

    averageWin,

    averageLoss,

    bestTrade,

    worstTrade

  };

}


/* =========================================================
   11. RENDER STATS
   ========================================================= */

function renderStats() {

  const stats =
    calculateStats();


  totalPnlElement.textContent =
    formatMoney(
      stats.totalPnl
    );


  if (stats.totalTrades === 0) {

    pnlSubtextElement.textContent =
      "No trades yet";

  } else {

    pnlSubtextElement.textContent =
      stats.totalPnl >= 0
        ? "Positive overall result"
        : "Negative overall result";

  }


  winRateElement.textContent =
    `${stats.winRate.toFixed(1)}%`;


  winRateSubtextElement.textContent =
    `${stats.winningTrades} ${
      stats.winningTrades === 1
        ? "win"
        : "wins"
    }`;


  if (
    stats.profitFactor === Infinity
  ) {

    profitFactorElement.textContent =
      "∞";

  } else {

    profitFactorElement.textContent =
      stats.profitFactor.toFixed(2);

  }


  totalTradesElement.textContent =
    stats.totalTrades;


  tradeSubtextElement.textContent =
    stats.totalTrades === 1
      ? "1 journal entry"
      : `${stats.totalTrades} journal entries`;

}


/* =========================================================
   12. PERFORMANCE
   ========================================================= */

function renderPerformance() {

  const stats =
    calculateStats();


  averageWinElement.textContent =
    formatMoney(
      stats.averageWin
    );


  averageLossElement.textContent =
    stats.averageLoss > 0
      ? formatMoney(
          -stats.averageLoss
        )
      : formatMoney(0);


  bestTradeElement.textContent =
    formatMoney(
      stats.bestTrade
    );


  worstTradeElement.textContent =
    formatMoney(
      stats.worstTrade
    );


  averageRRElement.textContent =
    "—";

}


/* =========================================================
   13. RENDER TRADES
   ========================================================= */

function renderTrades() {

  if (!tradesTableBody) {
    return;
  }


  if (trades.length === 0) {

    tradesTableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty-table"
        >
          No trades yet. Add your first trade.
        </td>
      </tr>
    `;

    return;
  }


  const recentTrades =
    trades.slice(0, 10);


  tradesTableBody.innerHTML =
    recentTrades
      .map(
        trade => {

          const pnl =
            Number(
              trade.pnl || 0
            );


          const pnlClass =
            pnl > 0
              ? "positive"
              : pnl < 0
                ? "negative"
                : "";


          const directionClass =
            trade.direction === "Long"
              ? "long"
              : "short";


          return `
            <tr>

              <td>
                <div class="asset-cell">

                  <div class="asset-icon">
                    ${escapeHtml(
                      getAssetIcon(
                        trade.market
                      )
                    )}
                  </div>

                  <div>

                    <strong>
                      ${escapeHtml(
                        trade.market || "—"
                      )}
                    </strong>

                    <span>
                      ${escapeHtml(
                        trade.asset_name ||
                        trade.market ||
                        ""
                      )}
                    </span>

                  </div>

                </div>
              </td>


              <td>

                <span
                  class="direction-badge ${directionClass}"
                >
                  ${escapeHtml(
                    trade.direction
                  )}
                </span>

              </td>


              <td>
                ${formatNumber(
                  trade.entry_price
                )}
              </td>


              <td>
                ${formatNumber(
                  trade.exit_price
                )}
              </td>


              <td>
                ${escapeHtml(
                  trade.strategy || "—"
                )}
              </td>


              <td>
                ${formatDate(
                  trade.trade_date
                )}
              </td>


              <td
                class="${pnlClass}"
              >
                ${formatMoney(pnl)}
              </td>

            </tr>
          `;

        }
      )
      .join("");

}


/* =========================================================
   14. DASHBOARD RENDER
   ========================================================= */

function renderDashboard() {

  sortTrades();

  renderStats();

  renderPerformance();

  renderTrades();

}


/* =========================================================
   15. MODAL
   ========================================================= */

function openTradeModal() {

  clearTradeMessage();

  setTodayDate();

  tradeModal.classList.add(
    "show"
  );

  document.body.style.overflow =
    "hidden";


  setTimeout(
    () => {
      marketInput.focus();
    },
    100
  );

}


function closeTradeModal() {

  tradeModal.classList.remove(
    "show"
  );

  document.body.style.overflow =
    "";

  clearTradeMessage();

}


addTradeButton.addEventListener(
  "click",
  openTradeModal
);


closeModalButton.addEventListener(
  "click",
  closeTradeModal
);


cancelTradeButton.addEventListener(
  "click",
  closeTradeModal
);


tradeModal.addEventListener(
  "click",
  (event) => {

    if (
      event.target === tradeModal
    ) {

      closeTradeModal();

    }

  }
);


document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape" &&
      tradeModal.classList.contains(
        "show"
      )
    ) {

      closeTradeModal();

    }

  }
);


/* =========================================================
   16. LOGOUT
   ========================================================= */

logoutButton.addEventListener(
  "click",
  async () => {

    logoutButton.disabled = true;


    try {

      const {
        error
      } =
        await supabaseClient.auth
          .signOut();


      if (error) {
        throw error;
      }


      window.location.href =
        "/app/login.html";


    } catch (error) {

      console.error(
        "Logout error:",
        error
      );


      alert(
        "Could not log out. Please try again."
      );


      logoutButton.disabled = false;

    }

  }
);


/* =========================================================
   17. NAVIGATION
   ========================================================= */

const navItems =
  document.querySelectorAll(
    ".nav-item"
  );


navItems.forEach(
  item => {

    item.addEventListener(
      "click",
      () => {

        navItems.forEach(
          navItem =>
            navItem.classList.remove(
              "active"
            )
        );


        item.classList.add(
          "active"
        );

      }
    );

  }
);


/* =========================================================
   18. CHART TABS
   ========================================================= */

const chartTabs =
  document.querySelectorAll(
    ".chart-tab"
  );


chartTabs.forEach(
  tab => {

    tab.addEventListener(
      "click",
      () => {

        chartTabs.forEach(
          chartTab =>
            chartTab.classList.remove(
              "active"
            )
        );


        tab.classList.add(
          "active"
        );

      }
    );

  }
);


/* =========================================================
   19. DATE
   ========================================================= */

function getTodayDate() {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;

}


function setTodayDate() {

  if (
    tradeDateInput &&
    !tradeDateInput.value
  ) {

    tradeDateInput.value =
      getTodayDate();

  }

}


function renderCurrentDate() {

  if (!dateButton) {
    return;
  }


  const today =
    new Date();


  const formatted =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "numeric",
        month: "short"
      }
    ).format(today);


  dateButton.textContent =
    formatted;

}


/* =========================================================
   20. MESSAGES
   ========================================================= */

function showTradeMessage(
  message,
  type = "error"
) {

  if (!tradeMessage) {
    return;
  }


  tradeMessage.textContent =
    message;


  tradeMessage.style.display =
    "block";


  tradeMessage.style.color =
    type === "success"
      ? "#22c55e"
      : "#ef4444";

}


function clearTradeMessage() {

  if (!tradeMessage) {
    return;
  }


  tradeMessage.textContent =
    "";

  tradeMessage.style.display =
    "none";

}


function showTableMessage(
  message
) {

  if (!tradesTableBody) {
    return;
  }


  tradesTableBody.innerHTML = `
    <tr>
      <td
        colspan="7"
        class="empty-table"
      >
        ${escapeHtml(message)}
      </td>
    </tr>
  `;

}


/* =========================================================
   21. FORMAT HELPERS
   ========================================================= */

function formatMoney(
  value
) {

  const number =
    Number(value || 0);


  const absolute =
    Math.abs(number);


  const formatted =
    new Intl.NumberFormat(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ).format(absolute);


  if (number > 0) {
    return `+€${formatted}`;
  }


  if (number < 0) {
    return `-€${formatted}`;
  }


  return "€0.00";

}


function formatNumber(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "—";

  }


  const number =
    Number(value);


  if (!Number.isFinite(number)) {
    return "—";
  }


  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 8
    }
  ).format(number);

}


function formatDate(
  value
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(
      `${value}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }


  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(date);

}


function getAssetIcon(
  market
) {

  const value =
    String(
      market || ""
    ).toUpperCase();


  if (
    value.includes("BTC")
  ) {
    return "₿";
  }


  if (
    value.includes("ETH")
  ) {
    return "Ξ";
  }


  if (
    value.includes("EUR")
  ) {
    return "€";
  }


  if (
    value.includes("GBP")
  ) {
    return "£";
  }


  if (
    value.includes("JPY")
  ) {
    return "¥";
  }


  if (
    value.includes("USD")
  ) {
    return "$";
  }


  return value
    .charAt(0) || "•";

}


function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   22. AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  (
    event,
    session
  ) => {

    if (
      event === "SIGNED_OUT" ||
      !session
    ) {

      window.location.href =
        "/app/login.html";

    }

  }
);


/* =========================================================
   23. START
   ========================================================= */

renderCurrentDate();

initializeApp();
