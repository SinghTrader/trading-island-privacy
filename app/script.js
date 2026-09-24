/* =========================================================
   TRADING ISLAND
   app/script.js

   Dashboard + Trading Journal + Supabase
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeTradingIsland();
});


async function initializeTradingIsland() {

  /* =======================================================
     CONFIG
     ======================================================= */

  if (!window.supabase) {
    console.error("Supabase library was not loaded.");
    return;
  }

  if (!window.TRADING_ISLAND_CONFIG) {
    console.error("Trading Island config was not loaded.");
    return;
  }

  const {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  } = window.TRADING_ISLAND_CONFIG;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error("Supabase configuration is incomplete.");
    return;
  }

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


  /* =======================================================
     STATE
     ======================================================= */

  let currentUser = null;
  let allTrades = [];
  let filteredTrades = [];

  let selectedTradeId = null;
  let editingTradeId = null;


  /* =======================================================
     GENERAL ELEMENTS
     ======================================================= */

  const navItems =
    document.querySelectorAll(".nav-item");

  const dashboardView =
    document.querySelector("#dashboardView");

  const journalView =
    document.querySelector("#journalView");

  const userInitial =
    document.querySelector("#userInitial");

  const userName =
    document.querySelector("#userName");

  const userEmail =
    document.querySelector("#userEmail");

  const welcomeName =
    document.querySelector("#welcomeName");

  const logoutButton =
    document.querySelector("#logoutButton");

  const dateButton =
    document.querySelector("#dateButton");

  const openJournalButton =
    document.querySelector("#openJournalButton");


  /* =======================================================
     DASHBOARD ELEMENTS
     ======================================================= */

  const totalPnl =
    document.querySelector("#totalPnl");

  const pnlSubtext =
    document.querySelector("#pnlSubtext");

  const winRate =
    document.querySelector("#winRate");

  const winRateSubtext =
    document.querySelector("#winRateSubtext");

  const profitFactor =
    document.querySelector("#profitFactor");

  const totalTrades =
    document.querySelector("#totalTrades");

  const tradeSubtext =
    document.querySelector("#tradeSubtext");

  const averageWin =
    document.querySelector("#averageWin");

  const averageLoss =
    document.querySelector("#averageLoss");

  const bestTrade =
    document.querySelector("#bestTrade");

  const worstTrade =
    document.querySelector("#worstTrade");

  const averageRR =
    document.querySelector("#averageRR");

  const tradesTableBody =
    document.querySelector("#tradesTableBody");


  /* =======================================================
     JOURNAL ELEMENTS
     ======================================================= */

  const journalTotalTrades =
    document.querySelector("#journalTotalTrades");

  const journalTotalPnl =
    document.querySelector("#journalTotalPnl");

  const journalWinRate =
    document.querySelector("#journalWinRate");

  const journalAverageRR =
    document.querySelector("#journalAverageRR");

  const journalSearch =
    document.querySelector("#journalSearch");

  const directionFilter =
    document.querySelector("#directionFilter");

  const resultFilter =
    document.querySelector("#resultFilter");

  const strategyFilter =
    document.querySelector("#strategyFilter");

  const clearFiltersButton =
    document.querySelector("#clearFiltersButton");

  const journalTradeCount =
    document.querySelector("#journalTradeCount");

  const journalTableBody =
    document.querySelector("#journalTableBody");


  /* =======================================================
     ADD / EDIT MODAL
     ======================================================= */

  const tradeModal =
    document.querySelector("#tradeModal");

  const tradeModalTitle =
    document.querySelector("#tradeModalTitle");

  const tradeForm =
    document.querySelector("#tradeForm");

  const editingTradeIdInput =
    document.querySelector("#editingTradeId");

  const closeModal =
    document.querySelector("#closeModal");

  const cancelTrade =
    document.querySelector("#cancelTrade");

  const saveTradeButton =
    document.querySelector("#saveTradeButton");

  const tradeMessage =
    document.querySelector("#tradeMessage");

  const openTradeModalButtons =
    document.querySelectorAll(".open-trade-modal");


  /* =======================================================
     TRADE FORM INPUTS
     ======================================================= */

  const marketInput =
    document.querySelector("#market");

  const directionInput =
    document.querySelector("#direction");

  const entryInput =
    document.querySelector("#entry");

  const exitInput =
    document.querySelector("#exit");

  const stopLossInput =
    document.querySelector("#stopLoss");

  const takeProfitInput =
    document.querySelector("#takeProfit");

  const riskAmountInput =
    document.querySelector("#riskAmount");

  const riskRewardInput =
    document.querySelector("#riskReward");

  const pnlInput =
    document.querySelector("#pnl");

  const strategyInput =
    document.querySelector("#strategy");

  const tradeDateInput =
    document.querySelector("#tradeDate");

  const notesInput =
    document.querySelector("#notes");


  /* =======================================================
     DETAILS MODAL
     ======================================================= */

  const tradeDetailsModal =
    document.querySelector("#tradeDetailsModal");

  const closeDetailsModal =
    document.querySelector("#closeDetailsModal");

  const detailsMarket =
    document.querySelector("#detailsMarket");

  const detailsDate =
    document.querySelector("#detailsDate");

  const detailsDirection =
    document.querySelector("#detailsDirection");

  const detailsEntry =
    document.querySelector("#detailsEntry");

  const detailsExit =
    document.querySelector("#detailsExit");

  const detailsStopLoss =
    document.querySelector("#detailsStopLoss");

  const detailsTakeProfit =
    document.querySelector("#detailsTakeProfit");

  const detailsRisk =
    document.querySelector("#detailsRisk");

  const detailsRR =
    document.querySelector("#detailsRR");

  const detailsStrategy =
    document.querySelector("#detailsStrategy");

  const detailsPnl =
    document.querySelector("#detailsPnl");

  const detailsNotes =
    document.querySelector("#detailsNotes");

  const editTradeButton =
    document.querySelector("#editTradeButton");

  const deleteTradeButton =
    document.querySelector("#deleteTradeButton");


  /* =======================================================
     DELETE MODAL
     ======================================================= */

  const deleteModal =
    document.querySelector("#deleteModal");

  const cancelDeleteButton =
    document.querySelector("#cancelDeleteButton");

  const confirmDeleteButton =
    document.querySelector("#confirmDeleteButton");


  /* =======================================================
     HELPERS
     ======================================================= */

  function safeNumber(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return number;
  }


  function nullableNumber(value) {

    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return null;
    }

    return number;
  }


  function escapeHtml(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function formatMoney(value) {

    const number = safeNumber(value);

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ).format(number);
  }


  function formatPrice(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const number = Number(value);

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


  function formatDate(value) {

    if (!value) {
      return "—";
    }

    const parts = value.split("-");

    if (parts.length !== 3) {
      return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }


  function getTodayDate() {

    const now = new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        now.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }


  function setTodayDate() {

    if (!tradeDateInput) {
      return;
    }

    tradeDateInput.value =
      getTodayDate();
  }


  function getPnlClass(value) {

    const pnl = safeNumber(value);

    if (pnl > 0) {
      return "positive";
    }

    if (pnl < 0) {
      return "negative";
    }

    return "neutral";
  }


  function getResultLabel(value) {

    const pnl = safeNumber(value);

    if (pnl > 0) {
      return "Win";
    }

    if (pnl < 0) {
      return "Loss";
    }

    return "Breakeven";
  }


  function getTradeById(id) {

    return allTrades.find(
      trade => trade.id === id
    );
  }


  function showTradeMessage(
    message,
    type = "error"
  ) {

    if (!tradeMessage) {
      return;
    }

    tradeMessage.textContent =
      message;

    tradeMessage.className =
      `trade-message show ${type}`;
  }


  function clearTradeMessage() {

    if (!tradeMessage) {
      return;
    }

    tradeMessage.textContent = "";
    tradeMessage.className =
      "trade-message";
  }


  /* =======================================================
     DATE
     ======================================================= */

  function renderCurrentDate() {

    if (!dateButton) {
      return;
    }

    const now =
      new Date();

    dateButton.textContent =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      ).format(now);
  }


  /* =======================================================
     USER
     ======================================================= */

  function renderUser() {

    if (!currentUser) {
      return;
    }

    const metadata =
      currentUser.user_metadata || {};

    const fullName =
      metadata.name ||
      metadata.full_name ||
      currentUser.email
        ?.split("@")[0] ||
      "Trader";

    const firstName =
      fullName
        .trim()
        .split(" ")[0] ||
      "Trader";

    if (userName) {
      userName.textContent =
        fullName;
    }

    if (welcomeName) {
      welcomeName.textContent =
        firstName;
    }

    if (userEmail) {
      userEmail.textContent =
        currentUser.email || "";
    }

    if (userInitial) {
      userInitial.textContent =
        firstName
          .charAt(0)
          .toUpperCase();
    }
  }


  /* =======================================================
     APP VIEWS
     ======================================================= */

  function showView(page) {

    if (dashboardView) {
      dashboardView.classList.remove(
        "active"
      );
    }

    if (journalView) {
      journalView.classList.remove(
        "active"
      );
    }


    navItems.forEach(item => {
      item.classList.remove("active");
    });


    if (page === "journal") {

      if (journalView) {
        journalView.classList.add(
          "active"
        );
      }

    } else {

      if (dashboardView) {
        dashboardView.classList.add(
          "active"
        );
      }

      page = "dashboard";
    }


    const activeNavigation =
      document.querySelector(
        `.nav-item[data-page="${page}"]`
      );

    if (activeNavigation) {
      activeNavigation.classList.add(
        "active"
      );
    }


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }


  navItems.forEach(item => {

    item.addEventListener(
      "click",
      () => {

        const page =
          item.dataset.page;

        if (
          page === "dashboard" ||
          page === "journal"
        ) {
          showView(page);
          return;
        }

        console.log(
          `${page} will be built next.`
        );

      }
    );

  });


  if (openJournalButton) {

    openJournalButton.addEventListener(
      "click",
      () => {
        showView("journal");
      }
    );

  }


  /* =======================================================
     LOAD TRADES
     ======================================================= */

  async function loadTrades() {

    if (!currentUser) {
      return;
    }


    if (tradesTableBody) {

      tradesTableBody.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="empty-table"
          >
            Loading your trades...
          </td>
        </tr>
      `;

    }


    if (journalTableBody) {

      journalTableBody.innerHTML = `
        <tr>
          <td
            colspan="11"
            class="empty-table"
          >
            Loading your journal...
          </td>
        </tr>
      `;

    }


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


      allTrades =
        Array.isArray(data)
          ? data
          : [];


      renderEverything();


    } catch (error) {

      console.error(
        "Could not load trades:",
        error
      );


      if (tradesTableBody) {

        tradesTableBody.innerHTML = `
          <tr>
            <td
              colspan="7"
              class="empty-table"
            >
              Could not load your trades.
            </td>
          </tr>
        `;

      }


      if (journalTableBody) {

        journalTableBody.innerHTML = `
          <tr>
            <td
              colspan="11"
              class="empty-table"
            >
              Could not load your journal.
            </td>
          </tr>
        `;

      }

    }

  }


  /* =======================================================
     RENDER EVERYTHING
     ======================================================= */

  function renderEverything() {

    renderDashboardStats();

    renderRecentTrades();

    populateStrategyFilter();

    applyJournalFilters();

    renderJournalStats();

  }


  /* =======================================================
     DASHBOARD STATS
     ======================================================= */

  function renderDashboardStats() {

    const count =
      allTrades.length;


    const wins =
      allTrades.filter(
        trade =>
          safeNumber(trade.pnl) > 0
      );


    const losses =
      allTrades.filter(
        trade =>
          safeNumber(trade.pnl) < 0
      );


    const netPnl =
      allTrades.reduce(
        (total, trade) =>
          total +
          safeNumber(trade.pnl),
        0
      );


    const grossProfit =
      wins.reduce(
        (total, trade) =>
          total +
          safeNumber(trade.pnl),
        0
      );


    const grossLoss =
      Math.abs(
        losses.reduce(
          (total, trade) =>
            total +
            safeNumber(trade.pnl),
          0
        )
      );


    const calculatedWinRate =
      count > 0
        ? (
            wins.length /
            count
          ) * 100
        : 0;


    let calculatedProfitFactor = 0;

    if (grossLoss > 0) {

      calculatedProfitFactor =
        grossProfit /
        grossLoss;

    } else if (
      grossProfit > 0
    ) {

      calculatedProfitFactor =
        Infinity;

    }


    const averageWinningTrade =
      wins.length > 0
        ? grossProfit /
          wins.length
        : 0;


    const averageLosingTrade =
      losses.length > 0
        ? -(
            grossLoss /
            losses.length
          )
        : 0;


    const pnlValues =
      allTrades.map(
        trade =>
          safeNumber(trade.pnl)
      );


    const best =
      pnlValues.length > 0
        ? Math.max(...pnlValues)
        : 0;


    const worst =
      pnlValues.length > 0
        ? Math.min(...pnlValues)
        : 0;


    const rrTrades =
      allTrades.filter(
        trade =>
          trade.risk_reward !== null &&
          trade.risk_reward !== undefined &&
          Number.isFinite(
            Number(
              trade.risk_reward
            )
          )
      );


    const avgRR =
      rrTrades.length > 0
        ? rrTrades.reduce(
            (total, trade) =>
              total +
              Number(
                trade.risk_reward
              ),
            0
          ) /
          rrTrades.length
        : null;


    if (totalPnl) {

      totalPnl.textContent =
        formatMoney(netPnl);

      totalPnl.classList.remove(
        "positive",
        "negative",
        "neutral"
      );

      totalPnl.classList.add(
        getPnlClass(netPnl)
      );

    }


    if (pnlSubtext) {

      if (count === 0) {

        pnlSubtext.textContent =
          "No trades yet";

      } else {

        pnlSubtext.textContent =
          `${wins.length} winning ${
            wins.length === 1
              ? "trade"
              : "trades"
          }`;

      }

    }


    if (winRate) {

      winRate.textContent =
        `${calculatedWinRate.toFixed(1)}%`;

    }


    if (winRateSubtext) {

      winRateSubtext.textContent =
        `${wins.length} wins · ${losses.length} losses`;

    }


    if (profitFactor) {

      profitFactor.textContent =
        calculatedProfitFactor === Infinity
          ? "∞"
          : calculatedProfitFactor.toFixed(
              2
            );

    }


    if (totalTrades) {

      totalTrades.textContent =
        String(count);

    }


    if (tradeSubtext) {

      tradeSubtext.textContent =
        count === 1
          ? "1 journal entry"
          : `${count} journal entries`;

    }


    if (averageWin) {

      averageWin.textContent =
        formatMoney(
          averageWinningTrade
        );

    }


    if (averageLoss) {

      averageLoss.textContent =
        formatMoney(
          averageLosingTrade
        );

    }


    if (bestTrade) {

      bestTrade.textContent =
        formatMoney(best);

    }


    if (worstTrade) {

      worstTrade.textContent =
        formatMoney(worst);

    }


    if (averageRR) {

      averageRR.textContent =
        avgRR === null
          ? "—"
          : `1:${avgRR.toFixed(2)}`;

    }

  }


  /* =======================================================
     RECENT TRADES
     ======================================================= */

  function renderRecentTrades() {

    if (!tradesTableBody) {
      return;
    }


    if (allTrades.length === 0) {

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
      allTrades.slice(0, 5);


    tradesTableBody.innerHTML =
      recentTrades
        .map(trade => {

          const pnl =
            safeNumber(trade.pnl);

          const pnlClass =
            getPnlClass(pnl);

          const directionClass =
            trade.direction === "Long"
              ? "long"
              : "short";


          return `
            <tr>
              <td>
                <strong>
                  ${escapeHtml(
                    trade.market
                  )}
                </strong>
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
                ${formatPrice(
                  trade.entry_price
                )}
              </td>

              <td>
                ${formatPrice(
                  trade.exit_price
                )}
              </td>

              <td>
                ${
                  trade.strategy
                    ? escapeHtml(
                        trade.strategy
                      )
                    : "—"
                }
              </td>

              <td>
                ${formatDate(
                  trade.trade_date
                )}
              </td>

              <td>
                <strong
                  class="${pnlClass}"
                >
                  ${formatMoney(pnl)}
                </strong>
              </td>
            </tr>
          `;

        })
        .join("");

  }


  /* =======================================================
     JOURNAL STATS
     ======================================================= */

  function renderJournalStats() {

    const count =
      allTrades.length;


    const wins =
      allTrades.filter(
        trade =>
          safeNumber(trade.pnl) > 0
      );


    const netPnl =
      allTrades.reduce(
        (total, trade) =>
          total +
          safeNumber(trade.pnl),
        0
      );


    const calculatedWinRate =
      count > 0
        ? (
            wins.length /
            count
          ) * 100
        : 0;


    const rrTrades =
      allTrades.filter(
        trade =>
          trade.risk_reward !== null &&
          trade.risk_reward !== undefined &&
          Number.isFinite(
            Number(
              trade.risk_reward
            )
          )
      );


    const avgRR =
      rrTrades.length > 0
        ? rrTrades.reduce(
            (total, trade) =>
              total +
              Number(
                trade.risk_reward
              ),
            0
          ) /
          rrTrades.length
        : null;


    if (journalTotalTrades) {

      journalTotalTrades.textContent =
        String(count);

    }


    if (journalTotalPnl) {

      journalTotalPnl.textContent =
        formatMoney(netPnl);

      journalTotalPnl.classList.remove(
        "positive",
        "negative",
        "neutral"
      );

      journalTotalPnl.classList.add(
        getPnlClass(netPnl)
      );

    }


    if (journalWinRate) {

      journalWinRate.textContent =
        `${calculatedWinRate.toFixed(1)}%`;

    }


    if (journalAverageRR) {

      journalAverageRR.textContent =
        avgRR === null
          ? "—"
          : `1:${avgRR.toFixed(2)}`;

    }

  }


  /* =======================================================
     STRATEGY FILTER
     ======================================================= */

  function populateStrategyFilter() {

    if (!strategyFilter) {
      return;
    }


    const currentValue =
      strategyFilter.value;


    const strategies =
      [
        ...new Set(
          allTrades
            .map(trade =>
              trade.strategy
                ?.trim()
            )
            .filter(Boolean)
        )
      ].sort(
        (a, b) =>
          a.localeCompare(b)
      );


    strategyFilter.innerHTML = `
      <option value="all">
        All strategies
      </option>
    `;


    strategies.forEach(
      strategy => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          strategy;

        option.textContent =
          strategy;

        strategyFilter.appendChild(
          option
        );

      }
    );


    const valueStillExists =
      [
        "all",
        ...strategies
      ].includes(
        currentValue
      );


    strategyFilter.value =
      valueStillExists
        ? currentValue
        : "all";

  }


  /* =======================================================
     JOURNAL FILTERS
     ======================================================= */

  function applyJournalFilters() {

    const search =
      journalSearch
        ?.value
        .trim()
        .toLowerCase() || "";


    const selectedDirection =
      directionFilter?.value ||
      "all";


    const selectedResult =
      resultFilter?.value ||
      "all";


    const selectedStrategy =
      strategyFilter?.value ||
      "all";


    filteredTrades =
      allTrades.filter(
        trade => {

          const market =
            String(
              trade.market || ""
            ).toLowerCase();


          const strategy =
            String(
              trade.strategy || ""
            ).toLowerCase();


          const notes =
            String(
              trade.notes || ""
            ).toLowerCase();


          const matchesSearch =
            !search ||
            market.includes(search) ||
            strategy.includes(search) ||
            notes.includes(search);


          const matchesDirection =
            selectedDirection === "all" ||
            trade.direction ===
              selectedDirection;


          let matchesResult = true;

          const pnl =
            safeNumber(trade.pnl);


          if (
            selectedResult === "win"
          ) {
            matchesResult =
              pnl > 0;
          }


          if (
            selectedResult === "loss"
          ) {
            matchesResult =
              pnl < 0;
          }


          if (
            selectedResult ===
            "breakeven"
          ) {
            matchesResult =
              pnl === 0;
          }


          const matchesStrategy =
            selectedStrategy === "all" ||
            trade.strategy ===
              selectedStrategy;


          return (
            matchesSearch &&
            matchesDirection &&
            matchesResult &&
            matchesStrategy
          );

        }
      );


    renderJournalTable();

  }


  if (journalSearch) {

    journalSearch.addEventListener(
      "input",
      applyJournalFilters
    );

  }


  if (directionFilter) {

    directionFilter.addEventListener(
      "change",
      applyJournalFilters
    );

  }


  if (resultFilter) {

    resultFilter.addEventListener(
      "change",
      applyJournalFilters
    );

  }


  if (strategyFilter) {

    strategyFilter.addEventListener(
      "change",
      applyJournalFilters
    );

  }


  if (clearFiltersButton) {

    clearFiltersButton.addEventListener(
      "click",
      () => {

        if (journalSearch) {
          journalSearch.value = "";
        }

        if (directionFilter) {
          directionFilter.value =
            "all";
        }

        if (resultFilter) {
          resultFilter.value =
            "all";
        }

        if (strategyFilter) {
          strategyFilter.value =
            "all";
        }

        applyJournalFilters();

      }
    );

  }


  /* =======================================================
     JOURNAL TABLE
     ======================================================= */

  function renderJournalTable() {

    if (!journalTableBody) {
      return;
    }


    if (journalTradeCount) {

      journalTradeCount.textContent =
        `${filteredTrades.length} ${
          filteredTrades.length === 1
            ? "trade"
            : "trades"
        }`;

    }


    if (filteredTrades.length === 0) {

      journalTableBody.innerHTML = `
        <tr>
          <td
            colspan="11"
            class="empty-table"
          >
            ${
              allTrades.length === 0
                ? "No trades yet. Add your first trade."
                : "No trades match your filters."
            }
          </td>
        </tr>
      `;

      return;
    }


    journalTableBody.innerHTML =
      filteredTrades
        .map(trade => {

          const pnl =
            safeNumber(trade.pnl);

          const pnlClass =
            getPnlClass(pnl);

          const directionClass =
            trade.direction === "Long"
              ? "long"
              : "short";


          return `
            <tr
              class="journal-trade-row"
              data-trade-id="${trade.id}"
            >

              <td>
                ${formatDate(
                  trade.trade_date
                )}
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    trade.market
                  )}
                </strong>
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
                ${formatPrice(
                  trade.entry_price
                )}
              </td>

              <td>
                ${formatPrice(
                  trade.exit_price
                )}
              </td>

              <td>
                ${formatPrice(
                  trade.stop_loss
                )}
              </td>

              <td>
                ${formatPrice(
                  trade.take_profit
                )}
              </td>

              <td>
                ${
                  trade.strategy
                    ? escapeHtml(
                        trade.strategy
                      )
                    : "—"
                }
              </td>

              <td>
                ${
                  trade.risk_reward !==
                    null &&
                  trade.risk_reward !==
                    undefined
                    ? `1:${Number(
                        trade.risk_reward
                      ).toFixed(2)}`
                    : "—"
                }
              </td>

              <td>
                <strong
                  class="${pnlClass}"
                >
                  ${formatMoney(pnl)}
                </strong>
              </td>

              <td>
                <button
                  class="trade-row-button"
                  data-trade-id="${trade.id}"
                  type="button"
                  aria-label="Open trade"
                >
                  →
                </button>
              </td>

            </tr>
          `;

        })
        .join("");


    const rows =
      journalTableBody.querySelectorAll(
        ".journal-trade-row"
      );


    rows.forEach(row => {

      row.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              ".trade-row-button"
            )
          ) {
            return;
          }

          const id =
            row.dataset.tradeId;

          openTradeDetails(id);

        }
      );

    });


    const buttons =
      journalTableBody.querySelectorAll(
        ".trade-row-button"
      );


    buttons.forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          const id =
            button.dataset.tradeId;

          openTradeDetails(id);

        }
      );

    });

  }


  /* =======================================================
     ADD TRADE MODAL
     ======================================================= */

  function resetTradeForm() {

    if (!tradeForm) {
      return;
    }

    tradeForm.reset();

    editingTradeId = null;

    if (editingTradeIdInput) {
      editingTradeIdInput.value = "";
    }

    if (tradeModalTitle) {
      tradeModalTitle.textContent =
        "Add trade";
    }

    if (saveTradeButton) {
      saveTradeButton.textContent =
        "Save trade";
    }

    setTodayDate();

    clearTradeMessage();

  }


  function openAddTradeModal() {

    resetTradeForm();

    if (tradeModal) {
      tradeModal.classList.add(
        "active"
      );
    }

    document.body.classList.add(
      "modal-open"
    );

    setTimeout(() => {
      marketInput?.focus();
    }, 100);

  }


  function closeTradeModal() {

    if (tradeModal) {
      tradeModal.classList.remove(
        "active"
      );
    }

    document.body.classList.remove(
      "modal-open"
    );

    clearTradeMessage();

  }


  openTradeModalButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        openAddTradeModal
      );

    }
  );


  if (closeModal) {

    closeModal.addEventListener(
      "click",
      closeTradeModal
    );

  }


  if (cancelTrade) {

    cancelTrade.addEventListener(
      "click",
      closeTradeModal
    );

  }


  if (tradeModal) {

    tradeModal.addEventListener(
      "click",
      event => {

        if (
          event.target === tradeModal
        ) {
          closeTradeModal();
        }

      }
    );

  }


  /* =======================================================
     SAVE / UPDATE TRADE
     ======================================================= */

  if (tradeForm) {

    tradeForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        clearTradeMessage();


        if (!currentUser) {

          showTradeMessage(
            "Your session has expired. Please log in again."
          );

          return;

        }


        const market =
          marketInput
            ?.value
            .trim()
            .toUpperCase();


        const direction =
          directionInput?.value;


        const pnl =
          nullableNumber(
            pnlInput?.value
          );


        const tradeDate =
          tradeDateInput?.value;


        if (!market) {

          showTradeMessage(
            "Please enter a market."
          );

          return;

        }


        if (
          direction !== "Long" &&
          direction !== "Short"
        ) {

          showTradeMessage(
            "Please select a direction."
          );

          return;

        }


        if (pnl === null) {

          showTradeMessage(
            "Please enter the trade P&L."
          );

          return;

        }


        if (!tradeDate) {

          showTradeMessage(
            "Please select a trade date."
          );

          return;

        }


        const tradeData = {

          user_id:
            currentUser.id,

          market:
            market,

          asset_name:
            market,

          direction:
            direction,

          entry_price:
            nullableNumber(
              entryInput?.value
            ),

          exit_price:
            nullableNumber(
              exitInput?.value
            ),

          stop_loss:
            nullableNumber(
              stopLossInput?.value
            ),

          take_profit:
            nullableNumber(
              takeProfitInput?.value
            ),

          risk_amount:
            nullableNumber(
              riskAmountInput?.value
            ),

          risk_reward:
            nullableNumber(
              riskRewardInput?.value
            ),

          pnl:
            pnl,

          strategy:
            strategyInput
              ?.value
              .trim() || null,

          notes:
            notesInput
              ?.value
              .trim() || null,

          trade_date:
            tradeDate

        };


        if (saveTradeButton) {

          saveTradeButton.disabled =
            true;

          saveTradeButton.textContent =
            editingTradeId
              ? "Saving..."
              : "Adding...";

        }


        try {

          if (editingTradeId) {

            const {
              error
            } =
              await supabaseClient
                .from("trades")
                .update(tradeData)
                .eq(
                  "id",
                  editingTradeId
                );


            if (error) {
              throw error;
            }


            showTradeMessage(
              "Trade updated.",
              "success"
            );


          } else {

            const {
              error
            } =
              await supabaseClient
                .from("trades")
                .insert(
                  tradeData
                );


            if (error) {
              throw error;
            }


            showTradeMessage(
              "Trade added.",
              "success"
            );

          }


          await loadTrades();


          setTimeout(() => {

            closeTradeModal();

            resetTradeForm();

          }, 350);


        } catch (error) {

          console.error(
            "Could not save trade:",
            error
          );


          showTradeMessage(
            error.message ||
            "Could not save the trade."
          );


        } finally {

          if (saveTradeButton) {

            saveTradeButton.disabled =
              false;

            saveTradeButton.textContent =
              editingTradeId
                ? "Save changes"
                : "Save trade";

          }

        }

      }
    );

  }


  /* =======================================================
     DETAILS MODAL
     ======================================================= */

  function openTradeDetails(id) {

    const trade =
      getTradeById(id);

    if (!trade) {
      return;
    }


    selectedTradeId =
      trade.id;


    if (detailsMarket) {

      detailsMarket.textContent =
        trade.market || "Trade";

    }


    if (detailsDate) {

      detailsDate.textContent =
        formatDate(
          trade.trade_date
        );

    }


    if (detailsDirection) {

      detailsDirection.textContent =
        trade.direction || "—";

    }


    if (detailsEntry) {

      detailsEntry.textContent =
        formatPrice(
          trade.entry_price
        );

    }


    if (detailsExit) {

      detailsExit.textContent =
        formatPrice(
          trade.exit_price
        );

    }


    if (detailsStopLoss) {

      detailsStopLoss.textContent =
        formatPrice(
          trade.stop_loss
        );

    }


    if (detailsTakeProfit) {

      detailsTakeProfit.textContent =
        formatPrice(
          trade.take_profit
        );

    }


    if (detailsRisk) {

      detailsRisk.textContent =
        trade.risk_amount !== null &&
        trade.risk_amount !== undefined
          ? formatMoney(
              trade.risk_amount
            )
          : "—";

    }


    if (detailsRR) {

      detailsRR.textContent =
        trade.risk_reward !== null &&
        trade.risk_reward !== undefined
          ? `1:${Number(
              trade.risk_reward
            ).toFixed(2)}`
          : "—";

    }


    if (detailsStrategy) {

      detailsStrategy.textContent =
        trade.strategy || "—";

    }


    if (detailsPnl) {

      detailsPnl.textContent =
        formatMoney(
          trade.pnl
        );

      detailsPnl.classList.remove(
        "positive",
        "negative",
        "neutral"
      );

      detailsPnl.classList.add(
        getPnlClass(
          trade.pnl
        )
      );

    }


    if (detailsNotes) {

      detailsNotes.textContent =
        trade.notes ||
        "No notes for this trade.";

    }


    if (tradeDetailsModal) {

      tradeDetailsModal.classList.add(
        "active"
      );

    }


    document.body.classList.add(
      "modal-open"
    );

  }


  function closeTradeDetails() {

    if (tradeDetailsModal) {

      tradeDetailsModal.classList.remove(
        "active"
      );

    }

    document.body.classList.remove(
      "modal-open"
    );

  }


  if (closeDetailsModal) {

    closeDetailsModal.addEventListener(
      "click",
      closeTradeDetails
    );

  }


  if (tradeDetailsModal) {

    tradeDetailsModal.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          tradeDetailsModal
        ) {
          closeTradeDetails();
        }

      }
    );

  }


  /* =======================================================
     EDIT TRADE
     ======================================================= */

  if (editTradeButton) {

    editTradeButton.addEventListener(
      "click",
      () => {

        if (!selectedTradeId) {
          return;
        }


        const trade =
          getTradeById(
            selectedTradeId
          );


        if (!trade) {
          return;
        }


        editingTradeId =
          trade.id;


        if (editingTradeIdInput) {

          editingTradeIdInput.value =
            trade.id;

        }


        if (marketInput) {

          marketInput.value =
            trade.market || "";

        }


        if (directionInput) {

          directionInput.value =
            trade.direction ||
            "Long";

        }


        if (entryInput) {

          entryInput.value =
            trade.entry_price ??
            "";

        }


        if (exitInput) {

          exitInput.value =
            trade.exit_price ??
            "";

        }


        if (stopLossInput) {

          stopLossInput.value =
            trade.stop_loss ??
            "";

        }


        if (takeProfitInput) {

          takeProfitInput.value =
            trade.take_profit ??
            "";

        }


        if (riskAmountInput) {

          riskAmountInput.value =
            trade.risk_amount ??
            "";

        }


        if (riskRewardInput) {

          riskRewardInput.value =
            trade.risk_reward ??
            "";

        }


        if (pnlInput) {

          pnlInput.value =
            trade.pnl ?? "";

        }


        if (strategyInput) {

          strategyInput.value =
            trade.strategy || "";

        }


        if (tradeDateInput) {

          tradeDateInput.value =
            trade.trade_date ||
            getTodayDate();

        }


        if (notesInput) {

          notesInput.value =
            trade.notes || "";

        }


        if (tradeModalTitle) {

          tradeModalTitle.textContent =
            "Edit trade";

        }


        if (saveTradeButton) {

          saveTradeButton.textContent =
            "Save changes";

        }


        clearTradeMessage();

        closeTradeDetails();


        if (tradeModal) {

          tradeModal.classList.add(
            "active"
          );

        }


        document.body.classList.add(
          "modal-open"
        );

      }
    );

  }


  /* =======================================================
     DELETE TRADE
     ======================================================= */

  if (deleteTradeButton) {

    deleteTradeButton.addEventListener(
      "click",
      () => {

        if (!selectedTradeId) {
          return;
        }


        closeTradeDetails();


        if (deleteModal) {

          deleteModal.classList.add(
            "active"
          );

        }


        document.body.classList.add(
          "modal-open"
        );

      }
    );

  }


  function closeDeleteModal() {

    if (deleteModal) {

      deleteModal.classList.remove(
        "active"
      );

    }

    document.body.classList.remove(
      "modal-open"
    );

  }


  if (cancelDeleteButton) {

    cancelDeleteButton.addEventListener(
      "click",
      closeDeleteModal
    );

  }


  if (deleteModal) {

    deleteModal.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          deleteModal
        ) {
          closeDeleteModal();
        }

      }
    );

  }


  if (confirmDeleteButton) {

    confirmDeleteButton.addEventListener(
      "click",
      async () => {

        if (!selectedTradeId) {
          return;
        }


        confirmDeleteButton.disabled =
          true;

        confirmDeleteButton.textContent =
          "Deleting...";


        try {

          const {
            error
          } =
            await supabaseClient
              .from("trades")
              .delete()
              .eq(
                "id",
                selectedTradeId
              );


          if (error) {
            throw error;
          }


          selectedTradeId = null;

          closeDeleteModal();

          await loadTrades();


        } catch (error) {

          console.error(
            "Could not delete trade:",
            error
          );

          alert(
            error.message ||
            "Could not delete the trade."
          );


        } finally {

          confirmDeleteButton.disabled =
            false;

          confirmDeleteButton.textContent =
            "Delete trade";

        }

      }
    );

  }


  /* =======================================================
     ESCAPE KEY
     ======================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Escape") {
        return;
      }

      if (
        deleteModal?.classList.contains(
          "active"
        )
      ) {

        closeDeleteModal();
        return;

      }


      if (
        tradeDetailsModal
          ?.classList
          .contains("active")
      ) {

        closeTradeDetails();
        return;

      }


      if (
        tradeModal?.classList.contains(
          "active"
        )
      ) {

        closeTradeModal();

      }

    }
  );


  /* =======================================================
     CHART TABS
     ======================================================= */

  const chartTabs =
    document.querySelectorAll(
      ".chart-tab"
    );


  chartTabs.forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        chartTabs.forEach(
          otherTab => {
            otherTab.classList.remove(
              "active"
            );
          }
        );

        tab.classList.add(
          "active"
        );

      }
    );

  });


  /* =======================================================
     LOGOUT
     ======================================================= */

  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      async () => {

        logoutButton.disabled =
          true;


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

          logoutButton.disabled =
            false;

        }

      }
    );

  }


  /* =======================================================
     AUTH STATE
     ======================================================= */

  supabaseClient.auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {

        if (
          event === "SIGNED_OUT"
        ) {

          window.location.href =
            "/app/login.html";

          return;

        }


        if (
          session?.user
        ) {

          currentUser =
            session.user;

          renderUser();

        }

      }
    );


  /* =======================================================
     INITIALIZE
     ======================================================= */

  async function startApp() {

    renderCurrentDate();

    setTodayDate();


    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .getSession();


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


      await loadTrades();


    } catch (error) {

      console.error(
        "Could not initialize Trading Island:",
        error
      );


      if (tradesTableBody) {

        tradesTableBody.innerHTML = `
          <tr>
            <td
              colspan="7"
              class="empty-table"
            >
              Could not load Trading Island.
            </td>
          </tr>
        `;

      }

    }

  }


  startApp();

}
