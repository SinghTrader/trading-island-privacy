/* =========================================================
   TRADING ISLAND
   app/script.js

   Dashboard + Journal + Calendar + Supabase
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

  const today = new Date();

  let calendarYear = today.getFullYear();
  let calendarMonth = today.getMonth();

  let selectedCalendarDate = null;


  /* =======================================================
     ELEMENTS
     ======================================================= */

  const navItems = document.querySelectorAll(".nav-item");

  const dashboardView = document.querySelector("#dashboardView");
  const journalView = document.querySelector("#journalView");
  const calendarView = document.querySelector("#calendarView");

  const userInitial = document.querySelector("#userInitial");
  const userName = document.querySelector("#userName");
  const userEmail = document.querySelector("#userEmail");
  const welcomeName = document.querySelector("#welcomeName");
  const logoutButton = document.querySelector("#logoutButton");

  const dateButton = document.querySelector("#dateButton");
  const openJournalButton = document.querySelector("#openJournalButton");


  /* =======================================================
     DASHBOARD ELEMENTS
     ======================================================= */

  const totalPnl = document.querySelector("#totalPnl");
  const pnlSubtext = document.querySelector("#pnlSubtext");

  const winRate = document.querySelector("#winRate");
  const winRateSubtext = document.querySelector("#winRateSubtext");

  const profitFactor = document.querySelector("#profitFactor");

  const totalTrades = document.querySelector("#totalTrades");
  const tradeSubtext = document.querySelector("#tradeSubtext");

  const averageWin = document.querySelector("#averageWin");
  const averageLoss = document.querySelector("#averageLoss");
  const bestTrade = document.querySelector("#bestTrade");
  const worstTrade = document.querySelector("#worstTrade");
  const averageRR = document.querySelector("#averageRR");

  const tradesTableBody = document.querySelector("#tradesTableBody");


  /* =======================================================
     JOURNAL ELEMENTS
     ======================================================= */

  const journalTotalTrades = document.querySelector("#journalTotalTrades");
  const journalTotalPnl = document.querySelector("#journalTotalPnl");
  const journalWinRate = document.querySelector("#journalWinRate");
  const journalAverageRR = document.querySelector("#journalAverageRR");

  const journalSearch = document.querySelector("#journalSearch");
  const directionFilter = document.querySelector("#directionFilter");
  const resultFilter = document.querySelector("#resultFilter");
  const strategyFilter = document.querySelector("#strategyFilter");
  const clearFiltersButton = document.querySelector("#clearFiltersButton");

  const journalTradeCount = document.querySelector("#journalTradeCount");
  const journalTableBody = document.querySelector("#journalTableBody");


  /* =======================================================
     CALENDAR ELEMENTS
     ======================================================= */

  const calendarMonthPnl = document.querySelector("#calendarMonthPnl");
  const calendarMonthPnlSubtext = document.querySelector("#calendarMonthPnlSubtext");

  const calendarMonthTrades = document.querySelector("#calendarMonthTrades");

  const calendarMonthWinRate = document.querySelector("#calendarMonthWinRate");
  const calendarWinRateSubtext = document.querySelector("#calendarWinRateSubtext");

  const calendarProfitableDays = document.querySelector("#calendarProfitableDays");
  const calendarProfitableDaysSubtext = document.querySelector("#calendarProfitableDaysSubtext");

  const calendarMonthTitle = document.querySelector("#calendarMonthTitle");

  const calendarTodayButton = document.querySelector("#calendarTodayButton");
  const previousMonthButton = document.querySelector("#previousMonthButton");
  const nextMonthButton = document.querySelector("#nextMonthButton");

  const calendarGrid = document.querySelector("#calendarGrid");

  const selectedDayTitle = document.querySelector("#selectedDayTitle");
  const selectedDayEmpty = document.querySelector("#selectedDayEmpty");
  const selectedDayContent = document.querySelector("#selectedDayContent");

  const selectedDayPnl = document.querySelector("#selectedDayPnl");
  const selectedDayTradeCount = document.querySelector("#selectedDayTradeCount");
  const selectedDayTrades = document.querySelector("#selectedDayTrades");

  const addTradeSelectedDayButton = document.querySelector("#addTradeSelectedDayButton");

  const calendarBestDayPnl = document.querySelector("#calendarBestDayPnl");
  const calendarBestDayDate = document.querySelector("#calendarBestDayDate");

  const calendarWorstDayPnl = document.querySelector("#calendarWorstDayPnl");
  const calendarWorstDayDate = document.querySelector("#calendarWorstDayDate");

  const calendarAverageDailyPnl = document.querySelector("#calendarAverageDailyPnl");


  /* =======================================================
     TRADE MODAL
     ======================================================= */

  const tradeModal = document.querySelector("#tradeModal");
  const tradeModalTitle = document.querySelector("#tradeModalTitle");

  const tradeForm = document.querySelector("#tradeForm");

  const editingTradeIdInput = document.querySelector("#editingTradeId");

  const closeModal = document.querySelector("#closeModal");
  const cancelTrade = document.querySelector("#cancelTrade");

  const saveTradeButton = document.querySelector("#saveTradeButton");
  const tradeMessage = document.querySelector("#tradeMessage");

  const openTradeModalButtons = document.querySelectorAll(".open-trade-modal");


  /* =======================================================
     TRADE FORM INPUTS
     ======================================================= */

  const marketInput = document.querySelector("#market");
  const directionInput = document.querySelector("#direction");

  const entryInput = document.querySelector("#entry");
  const exitInput = document.querySelector("#exit");

  const stopLossInput = document.querySelector("#stopLoss");
  const takeProfitInput = document.querySelector("#takeProfit");

  const riskAmountInput = document.querySelector("#riskAmount");
  const riskRewardInput = document.querySelector("#riskReward");

  const pnlInput = document.querySelector("#pnl");

  const strategyInput = document.querySelector("#strategy");
  const tradeDateInput = document.querySelector("#tradeDate");
  const notesInput = document.querySelector("#notes");


  /* =======================================================
     DETAILS MODAL
     ======================================================= */

  const tradeDetailsModal = document.querySelector("#tradeDetailsModal");
  const closeDetailsModal = document.querySelector("#closeDetailsModal");

  const detailsMarket = document.querySelector("#detailsMarket");
  const detailsDate = document.querySelector("#detailsDate");
  const detailsDirection = document.querySelector("#detailsDirection");

  const detailsEntry = document.querySelector("#detailsEntry");
  const detailsExit = document.querySelector("#detailsExit");

  const detailsStopLoss = document.querySelector("#detailsStopLoss");
  const detailsTakeProfit = document.querySelector("#detailsTakeProfit");

  const detailsRisk = document.querySelector("#detailsRisk");
  const detailsRR = document.querySelector("#detailsRR");

  const detailsStrategy = document.querySelector("#detailsStrategy");
  const detailsPnl = document.querySelector("#detailsPnl");
  const detailsNotes = document.querySelector("#detailsNotes");

  const editTradeButton = document.querySelector("#editTradeButton");
  const deleteTradeButton = document.querySelector("#deleteTradeButton");


  /* =======================================================
     DELETE MODAL
     ======================================================= */

  const deleteModal = document.querySelector("#deleteModal");
  const cancelDeleteButton = document.querySelector("#cancelDeleteButton");
  const confirmDeleteButton = document.querySelector("#confirmDeleteButton");


  /* =======================================================
     HELPERS
     ======================================================= */

  function safeNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
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

    return Number.isFinite(number)
      ? number
      : null;
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

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ).format(
      safeNumber(value)
    );
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

    return buildDateString(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }


  function buildDateString(year, month, day) {

    const monthString = String(
      month + 1
    ).padStart(2, "0");

    const dayString = String(
      day
    ).padStart(2, "0");

    return `${year}-${monthString}-${dayString}`;
  }


  function parseDateString(value) {

    if (!value) {
      return null;
    }

    const parts = value.split("-");

    if (parts.length !== 3) {
      return null;
    }

    return new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );
  }


  function setTodayDate() {

    if (tradeDateInput) {
      tradeDateInput.value = getTodayDate();
    }
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


  function getTradeById(id) {

    return allTrades.find(
      trade => trade.id === id
    );
  }


  function showTradeMessage(message, type = "error") {

    if (!tradeMessage) {
      return;
    }

    tradeMessage.textContent = message;

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


  function formatCalendarHeading(year, month) {

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "long",
        year: "numeric"
      }
    ).format(
      new Date(year, month, 1)
    );
  }


  function formatCalendarLongDate(dateString) {

    const date = parseDateString(dateString);

    if (!date) {
      return "Select a day";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    ).format(date);
  }


  function formatCalendarShortDate(dateString) {

    const date = parseDateString(dateString);

    if (!date) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        day: "numeric",
        month: "short"
      }
    ).format(date);
  }


  function sameMonth(dateString, year, month) {

    const date = parseDateString(dateString);

    if (!date) {
      return false;
    }

    return (
      date.getFullYear() === year &&
      date.getMonth() === month
    );
  }


  /* =======================================================
     CURRENT DATE
     ======================================================= */

  function renderCurrentDate() {

    if (!dateButton) {
      return;
    }

    dateButton.textContent =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      ).format(
        new Date()
      );
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
      currentUser.email?.split("@")[0] ||
      "Trader";

    const firstName =
      fullName.trim().split(" ")[0] ||
      "Trader";

    if (userName) {
      userName.textContent = fullName;
    }

    if (welcomeName) {
      welcomeName.textContent = firstName;
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
     NAVIGATION
     ======================================================= */

  function showView(page) {

    const views = {
      dashboard: dashboardView,
      journal: journalView,
      calendar: calendarView
    };

    Object.values(views).forEach(view => {

      if (view) {
        view.classList.remove("active");
      }

    });

    navItems.forEach(item => {
      item.classList.remove("active");
    });


    if (!views[page]) {
      page = "dashboard";
    }

    views[page]?.classList.add("active");

    const activeNavigation =
      document.querySelector(
        `.nav-item[data-page="${page}"]`
      );

    activeNavigation?.classList.add("active");


    if (page === "calendar") {
      renderCalendar();
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

        const page = item.dataset.page;

        if (
          page === "dashboard" ||
          page === "journal" ||
          page === "calendar"
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

    try {

      const {
        data,
        error
      } = await supabaseClient
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
            <td colspan="7" class="empty-table">
              Could not load your trades.
            </td>
          </tr>
        `;
      }


      if (journalTableBody) {

        journalTableBody.innerHTML = `
          <tr>
            <td colspan="11" class="empty-table">
              Could not load your journal.
            </td>
          </tr>
        `;
      }


      if (calendarGrid) {

        calendarGrid.innerHTML = `
          <div class="calendar-loading">
            Could not load your calendar.
          </div>
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

    renderCalendar();
  }


  /* =======================================================
     DASHBOARD STATS
     ======================================================= */

  function renderDashboardStats() {

    const count = allTrades.length;

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
          total + safeNumber(trade.pnl),
        0
      );

    const grossProfit =
      wins.reduce(
        (total, trade) =>
          total + safeNumber(trade.pnl),
        0
      );

    const grossLoss =
      Math.abs(
        losses.reduce(
          (total, trade) =>
            total + safeNumber(trade.pnl),
          0
        )
      );

    const calculatedWinRate =
      count > 0
        ? (wins.length / count) * 100
        : 0;


    let calculatedProfitFactor = 0;

    if (grossLoss > 0) {

      calculatedProfitFactor =
        grossProfit / grossLoss;

    } else if (grossProfit > 0) {

      calculatedProfitFactor =
        Infinity;
    }


    const averageWinningTrade =
      wins.length > 0
        ? grossProfit / wins.length
        : 0;


    const averageLosingTrade =
      losses.length > 0
        ? -(grossLoss / losses.length)
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
            Number(trade.risk_reward)
          )
      );


    const avgRR =
      rrTrades.length > 0
        ? rrTrades.reduce(
            (total, trade) =>
              total +
              Number(trade.risk_reward),
            0
          ) / rrTrades.length
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

      pnlSubtext.textContent =
        count === 0
          ? "No trades yet"
          : `${wins.length} winning ${
              wins.length === 1
                ? "trade"
                : "trades"
            }`;
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
          : calculatedProfitFactor.toFixed(2);
    }


    if (totalTrades) {
      totalTrades.textContent = String(count);
    }


    if (tradeSubtext) {

      tradeSubtext.textContent =
        count === 1
          ? "1 journal entry"
          : `${count} journal entries`;
    }


    if (averageWin) {
      averageWin.textContent =
        formatMoney(averageWinningTrade);
    }


    if (averageLoss) {
      averageLoss.textContent =
        formatMoney(averageLosingTrade);
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
          <td colspan="7" class="empty-table">
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
                  ${escapeHtml(trade.market)}
                </strong>
              </td>

              <td>
                <span class="direction-badge ${directionClass}">
                  ${escapeHtml(trade.direction)}
                </span>
              </td>

              <td>
                ${formatPrice(trade.entry_price)}
              </td>

              <td>
                ${formatPrice(trade.exit_price)}
              </td>

              <td>
                ${
                  trade.strategy
                    ? escapeHtml(trade.strategy)
                    : "—"
                }
              </td>

              <td>
                ${formatDate(trade.trade_date)}
              </td>

              <td>
                <strong class="${pnlClass}">
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

    const count = allTrades.length;

    const wins =
      allTrades.filter(
        trade =>
          safeNumber(trade.pnl) > 0
      );

    const netPnl =
      allTrades.reduce(
        (total, trade) =>
          total + safeNumber(trade.pnl),
        0
      );

    const calculatedWinRate =
      count > 0
        ? (wins.length / count) * 100
        : 0;


    const rrTrades =
      allTrades.filter(
        trade =>
          trade.risk_reward !== null &&
          trade.risk_reward !== undefined &&
          Number.isFinite(
            Number(trade.risk_reward)
          )
      );


    const avgRR =
      rrTrades.length > 0
        ? rrTrades.reduce(
            (total, trade) =>
              total +
              Number(trade.risk_reward),
            0
          ) / rrTrades.length
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
            .map(
              trade =>
                trade.strategy?.trim()
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


    strategies.forEach(strategy => {

      const option =
        document.createElement("option");

      option.value = strategy;
      option.textContent = strategy;

      strategyFilter.appendChild(option);
    });


    strategyFilter.value =
      [
        "all",
        ...strategies
      ].includes(currentValue)
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
      directionFilter?.value || "all";

    const selectedResult =
      resultFilter?.value || "all";

    const selectedStrategy =
      strategyFilter?.value || "all";


    filteredTrades =
      allTrades.filter(trade => {

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
          trade.direction === selectedDirection;


        const pnl =
          safeNumber(trade.pnl);


        let matchesResult = true;

        if (selectedResult === "win") {
          matchesResult = pnl > 0;
        }

        if (selectedResult === "loss") {
          matchesResult = pnl < 0;
        }

        if (selectedResult === "breakeven") {
          matchesResult = pnl === 0;
        }


        const matchesStrategy =
          selectedStrategy === "all" ||
          trade.strategy === selectedStrategy;


        return (
          matchesSearch &&
          matchesDirection &&
          matchesResult &&
          matchesStrategy
        );
      });


    renderJournalTable();
  }


  journalSearch?.addEventListener(
    "input",
    applyJournalFilters
  );

  directionFilter?.addEventListener(
    "change",
    applyJournalFilters
  );

  resultFilter?.addEventListener(
    "change",
    applyJournalFilters
  );

  strategyFilter?.addEventListener(
    "change",
    applyJournalFilters
  );


  clearFiltersButton?.addEventListener(
    "click",
    () => {

      if (journalSearch) {
        journalSearch.value = "";
      }

      if (directionFilter) {
        directionFilter.value = "all";
      }

      if (resultFilter) {
        resultFilter.value = "all";
      }

      if (strategyFilter) {
        strategyFilter.value = "all";
      }

      applyJournalFilters();
    }
  );


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
          <td colspan="11" class="empty-table">
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
                ${formatDate(trade.trade_date)}
              </td>

              <td>
                <strong>
                  ${escapeHtml(trade.market)}
                </strong>
              </td>

              <td>
                <span class="direction-badge ${directionClass}">
                  ${escapeHtml(trade.direction)}
                </span>
              </td>

              <td>
                ${formatPrice(trade.entry_price)}
              </td>

              <td>
                ${formatPrice(trade.exit_price)}
              </td>

              <td>
                ${formatPrice(trade.stop_loss)}
              </td>

              <td>
                ${formatPrice(trade.take_profit)}
              </td>

              <td>
                ${
                  trade.strategy
                    ? escapeHtml(trade.strategy)
                    : "—"
                }
              </td>

              <td>
                ${
                  trade.risk_reward !== null &&
                  trade.risk_reward !== undefined
                    ? `1:${Number(
                        trade.risk_reward
                      ).toFixed(2)}`
                    : "—"
                }
              </td>

              <td>
                <strong class="${pnlClass}">
                  ${formatMoney(pnl)}
                </strong>
              </td>

              <td>
                <button
                  class="trade-row-button"
                  data-trade-id="${trade.id}"
                  type="button"
                >
                  →
                </button>
              </td>

            </tr>
          `;
        })
        .join("");


    journalTableBody
      .querySelectorAll(".journal-trade-row")
      .forEach(row => {

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

            openTradeDetails(
              row.dataset.tradeId
            );
          }
        );
      });


    journalTableBody
      .querySelectorAll(".trade-row-button")
      .forEach(button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            openTradeDetails(
              button.dataset.tradeId
            );
          }
        );
      });
  }


  /* =======================================================
     CALENDAR DATA
     ======================================================= */

  function getMonthTrades() {

    return allTrades.filter(
      trade =>
        sameMonth(
          trade.trade_date,
          calendarYear,
          calendarMonth
        )
    );
  }


  function buildDailyCalendarData(monthTrades) {

    const dailyData = {};


    monthTrades.forEach(trade => {

      const date =
        trade.trade_date;

      if (!date) {
        return;
      }


      if (!dailyData[date]) {

        dailyData[date] = {
          date: date,
          trades: [],
          pnl: 0,
          wins: 0,
          losses: 0
        };
      }


      const pnl =
        safeNumber(trade.pnl);


      dailyData[date].trades.push(
        trade
      );

      dailyData[date].pnl += pnl;


      if (pnl > 0) {
        dailyData[date].wins += 1;
      }

      if (pnl < 0) {
        dailyData[date].losses += 1;
      }

    });


    return dailyData;
  }


  /* =======================================================
     CALENDAR
     ======================================================= */

  function renderCalendar() {

    if (!calendarGrid) {
      return;
    }


    const monthTrades =
      getMonthTrades();

    const dailyData =
      buildDailyCalendarData(
        monthTrades
      );


    renderCalendarStats(
      monthTrades,
      dailyData
    );

    renderCalendarGrid(
      dailyData
    );

    renderCalendarMonthSummary(
      dailyData
    );


    if (selectedCalendarDate) {

      const selectedDate =
        parseDateString(
          selectedCalendarDate
        );

      if (
        selectedDate &&
        selectedDate.getFullYear() === calendarYear &&
        selectedDate.getMonth() === calendarMonth
      ) {

        renderSelectedDay(
          selectedCalendarDate
        );

      } else {

        clearSelectedDay();
      }
    }


    if (calendarMonthTitle) {

      calendarMonthTitle.textContent =
        formatCalendarHeading(
          calendarYear,
          calendarMonth
        );
    }
  }


  /* =======================================================
     CALENDAR STATS
     ======================================================= */

  function renderCalendarStats(
    monthTrades,
    dailyData
  ) {

    const totalMonthPnl =
      monthTrades.reduce(
        (total, trade) =>
          total +
          safeNumber(trade.pnl),
        0
      );


    const winningTrades =
      monthTrades.filter(
        trade =>
          safeNumber(trade.pnl) > 0
      );


    const losingTrades =
      monthTrades.filter(
        trade =>
          safeNumber(trade.pnl) < 0
      );


    const monthWinRate =
      monthTrades.length > 0
        ? (
            winningTrades.length /
            monthTrades.length
          ) * 100
        : 0;


    const tradingDays =
      Object.values(
        dailyData
      );


    const profitableDays =
      tradingDays.filter(
        day =>
          day.pnl > 0
      );


    if (calendarMonthPnl) {

      calendarMonthPnl.textContent =
        formatMoney(
          totalMonthPnl
        );

      calendarMonthPnl.classList.remove(
        "positive",
        "negative",
        "neutral"
      );

      calendarMonthPnl.classList.add(
        getPnlClass(
          totalMonthPnl
        )
      );
    }


    if (calendarMonthPnlSubtext) {

      if (monthTrades.length === 0) {

        calendarMonthPnlSubtext.textContent =
          "No trades this month";

      } else if (totalMonthPnl > 0) {

        calendarMonthPnlSubtext.textContent =
          "Profitable month";

      } else if (totalMonthPnl < 0) {

        calendarMonthPnlSubtext.textContent =
          "Losing month";

      } else {

        calendarMonthPnlSubtext.textContent =
          "Breakeven month";
      }
    }


    if (calendarMonthTrades) {

      calendarMonthTrades.textContent =
        String(
          monthTrades.length
        );
    }


    if (calendarMonthWinRate) {

      calendarMonthWinRate.textContent =
        `${monthWinRate.toFixed(1)}%`;
    }


    if (calendarWinRateSubtext) {

      calendarWinRateSubtext.textContent =
        `${winningTrades.length} wins · ${losingTrades.length} losses`;
    }


    if (calendarProfitableDays) {

      calendarProfitableDays.textContent =
        String(
          profitableDays.length
        );
    }


    if (calendarProfitableDaysSubtext) {

      calendarProfitableDaysSubtext.textContent =
        `${tradingDays.length} ${
          tradingDays.length === 1
            ? "trading day"
            : "trading days"
        }`;
    }
  }


  /* =======================================================
     CALENDAR GRID
     ======================================================= */

  function renderCalendarGrid(dailyData) {

    if (!calendarGrid) {
      return;
    }


    const firstDay =
      new Date(
        calendarYear,
        calendarMonth,
        1
      );


    const daysInMonth =
      new Date(
        calendarYear,
        calendarMonth + 1,
        0
      ).getDate();


    /*
       JavaScript:
       Sunday = 0
       Monday = 1

       Calendar:
       Monday = first column
    */

    const mondayOffset =
      (firstDay.getDay() + 6) % 7;


    const previousMonthLastDay =
      new Date(
        calendarYear,
        calendarMonth,
        0
      ).getDate();


    const cells = [];


    /* PREVIOUS MONTH CELLS */

    for (
      let i = mondayOffset - 1;
      i >= 0;
      i--
    ) {

      const day =
        previousMonthLastDay - i;

      cells.push({
        day: day,
        outside: true,
        type: "previous"
      });
    }


    /* CURRENT MONTH CELLS */

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {

      cells.push({
        day: day,
        outside: false,
        type: "current"
      });
    }


    /* NEXT MONTH CELLS */

    let nextDay = 1;

    while (
      cells.length % 7 !== 0
    ) {

      cells.push({
        day: nextDay,
        outside: true,
        type: "next"
      });

      nextDay++;
    }


    /*
       Keep a consistent 6-row calendar.
    */

    while (cells.length < 42) {

      cells.push({
        day: nextDay,
        outside: true,
        type: "next"
      });

      nextDay++;
    }


    calendarGrid.innerHTML =
      cells.map(cell => {

        let cellYear =
          calendarYear;

        let cellMonth =
          calendarMonth;


        if (cell.type === "previous") {

          cellMonth -= 1;

          if (cellMonth < 0) {
            cellMonth = 11;
            cellYear -= 1;
          }
        }


        if (cell.type === "next") {

          cellMonth += 1;

          if (cellMonth > 11) {
            cellMonth = 0;
            cellYear += 1;
          }
        }


        const dateString =
          buildDateString(
            cellYear,
            cellMonth,
            cell.day
          );


        const dayData =
          dailyData[dateString];


        const isToday =
          dateString ===
          getTodayDate();


        const isSelected =
          dateString ===
          selectedCalendarDate;


        let resultClass = "";

        if (dayData) {

          if (dayData.pnl > 0) {
            resultClass =
              "profit-day";
          }

          if (dayData.pnl < 0) {
            resultClass =
              "loss-day";
          }

          if (dayData.pnl === 0) {
            resultClass =
              "breakeven-day";
          }
        }


        const outsideClass =
          cell.outside
            ? "outside-month"
            : "";


        const todayClass =
          isToday
            ? "today"
            : "";


        const selectedClass =
          isSelected
            ? "selected"
            : "";


        return `
          <button
            class="
              calendar-day
              ${outsideClass}
              ${resultClass}
              ${todayClass}
              ${selectedClass}
            "
            data-date="${dateString}"
            data-outside="${cell.outside}"
            type="button"
          >

            <div class="calendar-day-top">

              <span class="calendar-day-number">
                ${cell.day}
              </span>

              ${
                dayData
                  ? `
                    <span class="calendar-day-trade-count">
                      ${dayData.trades.length}
                    </span>
                  `
                  : ""
              }

            </div>


            ${
              dayData
                ? `
                  <div class="calendar-day-result">

                    <strong>
                      ${formatMoney(dayData.pnl)}
                    </strong>

                    <span>
                      ${dayData.trades.length}
                      ${
                        dayData.trades.length === 1
                          ? "trade"
                          : "trades"
                      }
                    </span>

                  </div>
                `
                : `
                  <div class="calendar-day-no-trades">
                    —
                  </div>
                `
            }

          </button>
        `;
      })
      .join("");


    calendarGrid
      .querySelectorAll(
        ".calendar-day"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const date =
              button.dataset.date;

            const outside =
              button.dataset.outside ===
              "true";


            if (outside) {

              const parsed =
                parseDateString(date);

              if (parsed) {

                calendarYear =
                  parsed.getFullYear();

                calendarMonth =
                  parsed.getMonth();
              }
            }


            selectedCalendarDate =
              date;

            renderCalendar();
          }
        );
      });
  }


  /* =======================================================
     SELECTED CALENDAR DAY
     ======================================================= */

  function renderSelectedDay(dateString) {

    const dayTrades =
      allTrades.filter(
        trade =>
          trade.trade_date ===
          dateString
      );


    const dayPnl =
      dayTrades.reduce(
        (total, trade) =>
          total +
          safeNumber(trade.pnl),
        0
      );


    if (selectedDayTitle) {

      selectedDayTitle.textContent =
        formatCalendarLongDate(
          dateString
        );
    }


    if (selectedDayEmpty) {
      selectedDayEmpty.hidden = true;
    }


    if (selectedDayContent) {
      selectedDayContent.hidden = false;
    }


    if (selectedDayPnl) {

      selectedDayPnl.textContent =
        formatMoney(dayPnl);

      selectedDayPnl.classList.remove(
        "positive",
        "negative",
        "neutral"
      );

      selectedDayPnl.classList.add(
        getPnlClass(dayPnl)
      );
    }


    if (selectedDayTradeCount) {

      selectedDayTradeCount.textContent =
        String(dayTrades.length);
    }


    if (!selectedDayTrades) {
      return;
    }


    if (dayTrades.length === 0) {

      selectedDayTrades.innerHTML = `
        <div class="calendar-no-day-trades">
          <strong>No trades</strong>
          <p>
            You don't have any trades recorded on this day.
          </p>
        </div>
      `;

      return;
    }


    selectedDayTrades.innerHTML =
      dayTrades
        .map(trade => {

          const pnl =
            safeNumber(trade.pnl);

          const directionClass =
            trade.direction === "Long"
              ? "long"
              : "short";


          return `
            <button
              class="calendar-trade-item"
              data-trade-id="${trade.id}"
              type="button"
            >

              <div class="calendar-trade-main">

                <div>

                  <strong>
                    ${escapeHtml(
                      trade.market
                    )}
                  </strong>

                  <span
                    class="direction-badge ${directionClass}"
                  >
                    ${escapeHtml(
                      trade.direction
                    )}
                  </span>

                </div>

                <strong
                  class="${getPnlClass(pnl)}"
                >
                  ${formatMoney(pnl)}
                </strong>

              </div>


              <div class="calendar-trade-meta">

                <span>
                  ${
                    trade.strategy
                      ? escapeHtml(
                          trade.strategy
                        )
                      : "No strategy"
                  }
                </span>

                <span>
                  ${
                    trade.risk_reward !== null &&
                    trade.risk_reward !== undefined
                      ? `R:R 1:${Number(
                          trade.risk_reward
                        ).toFixed(2)}`
                      : "No R:R"
                  }
                </span>

              </div>

            </button>
          `;
        })
        .join("");


    selectedDayTrades
      .querySelectorAll(
        ".calendar-trade-item"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            openTradeDetails(
              button.dataset.tradeId
            );
          }
        );
      });
  }


  function clearSelectedDay() {

    selectedCalendarDate = null;


    if (selectedDayTitle) {
      selectedDayTitle.textContent =
        "Select a day";
    }


    if (selectedDayEmpty) {
      selectedDayEmpty.hidden = false;
    }


    if (selectedDayContent) {
      selectedDayContent.hidden = true;
    }
  }


  /* =======================================================
     MONTH SUMMARY
     ======================================================= */

  function renderCalendarMonthSummary(
    dailyData
  ) {

    const days =
      Object.values(
        dailyData
      );


    if (days.length === 0) {

      if (calendarBestDayPnl) {
        calendarBestDayPnl.textContent =
          "—";
      }

      if (calendarBestDayDate) {
        calendarBestDayDate.textContent =
          "No trading data";
      }

      if (calendarWorstDayPnl) {
        calendarWorstDayPnl.textContent =
          "—";
      }

      if (calendarWorstDayDate) {
        calendarWorstDayDate.textContent =
          "No trading data";
      }

      if (calendarAverageDailyPnl) {

        calendarAverageDailyPnl.textContent =
          formatMoney(0);

        calendarAverageDailyPnl.classList.remove(
          "positive",
          "negative",
          "neutral"
        );

        calendarAverageDailyPnl.classList.add(
          "neutral"
        );
      }

      return;
    }


    const sortedDays =
      [...days].sort(
        (a, b) =>
          b.pnl - a.pnl
      );


    const bestDay =
      sortedDays[0];

    const worstDay =
      sortedDays[
        sortedDays.length - 1
      ];


    const totalDailyPnl =
      days.reduce(
        (total, day) =>
          total + day.pnl,
        0
      );


    const averageDaily =
      totalDailyPnl /
      days.length;


    if (calendarBestDayPnl) {

      calendarBestDayPnl.textContent =
        formatMoney(
          bestDay.pnl
        );

      calendarBestDayPnl.classList.remove(
        "positive",
        "negative",
        "neutral"
      );

      calendarBestDayPnl.classList.add(
        getPnlClass(
          bestDay.pnl
        )
      );
    }


    if (calendarBestDayDate) {

      calendarBestDayDate.textContent =
        formatCalendarShortDate(
          bestDay.date
        );
    }


    if (calendarWorstDayPnl) {

      calendarWorstDayPnl.textContent =
        formatMoney(
          worstDay.pnl
        );

      calendarWorstDayPnl.classList.remove(
        "positive",
        "negative",
        "neutral"
      );

      calendarWorstDayPnl.classList.add(
        getPnlClass(
          worstDay.pnl
        )
      );
    }


    if (calendarWorstDayDate) {

      calendarWorstDayDate.textContent =
        formatCalendarShortDate(
          worstDay.date
        );
    }


    if (calendarAverageDailyPnl) {

      calendarAverageDailyPnl.textContent =
        formatMoney(
          averageDaily
        );

      calendarAverageDailyPnl.classList.remove(
        "positive",
        "negative",
        "neutral"
      );

      calendarAverageDailyPnl.classList.add(
        getPnlClass(
          averageDaily
        )
      );
    }
  }


  /* =======================================================
     CALENDAR NAVIGATION
     ======================================================= */

  previousMonthButton?.addEventListener(
    "click",
    () => {

      calendarMonth -= 1;

      if (calendarMonth < 0) {

        calendarMonth = 11;
        calendarYear -= 1;
      }

      selectedCalendarDate = null;

      renderCalendar();
    }
  );


  nextMonthButton?.addEventListener(
    "click",
    () => {

      calendarMonth += 1;

      if (calendarMonth > 11) {

        calendarMonth = 0;
        calendarYear += 1;
      }

      selectedCalendarDate = null;

      renderCalendar();
    }
  );


  calendarTodayButton?.addEventListener(
    "click",
    () => {

      const now =
        new Date();

      calendarYear =
        now.getFullYear();

      calendarMonth =
        now.getMonth();

      selectedCalendarDate =
        getTodayDate();

      renderCalendar();
    }
  );


  /* =======================================================
     ADD TRADE MODAL
     ======================================================= */

  function resetTradeForm(
    preferredDate = null
  ) {

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

    if (tradeDateInput) {

      tradeDateInput.value =
        preferredDate ||
        getTodayDate();
    }

    clearTradeMessage();
  }


  function openAddTradeModal(
    preferredDate = null
  ) {

    resetTradeForm(
      preferredDate
    );

    tradeModal?.classList.add(
      "active"
    );

    document.body.classList.add(
      "modal-open"
    );

    setTimeout(
      () => {
        marketInput?.focus();
      },
      100
    );
  }


  function closeTradeModal() {

    tradeModal?.classList.remove(
      "active"
    );

    document.body.classList.remove(
      "modal-open"
    );

    clearTradeMessage();
  }


  openTradeModalButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          /*
             Calendar's main Add Trade button
             defaults to selected date when available.
          */

          if (
            button.id ===
            "calendarAddTradeButton"
          ) {

            openAddTradeModal(
              selectedCalendarDate
            );

            return;
          }


          openAddTradeModal();
        }
      );
    }
  );


  addTradeSelectedDayButton?.addEventListener(
    "click",
    () => {

      openAddTradeModal(
        selectedCalendarDate ||
        getTodayDate()
      );
    }
  );


  closeModal?.addEventListener(
    "click",
    closeTradeModal
  );


  cancelTrade?.addEventListener(
    "click",
    closeTradeModal
  );


  tradeModal?.addEventListener(
    "click",
    event => {

      if (event.target === tradeModal) {
        closeTradeModal();
      }
    }
  );


  /* =======================================================
     SAVE / UPDATE TRADE
     ======================================================= */

  tradeForm?.addEventListener(
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
          } = await supabaseClient
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
          } = await supabaseClient
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


        /*
           If trade is added/edited on another month,
           move calendar to that month.
        */

        const savedDate =
          parseDateString(
            tradeDate
          );


        if (savedDate) {

          calendarYear =
            savedDate.getFullYear();

          calendarMonth =
            savedDate.getMonth();

          selectedCalendarDate =
            tradeDate;
        }


        await loadTrades();


        setTimeout(
          () => {

            closeTradeModal();
            resetTradeForm();

          },
          350
        );


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


  /* =======================================================
     TRADE DETAILS
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


    tradeDetailsModal?.classList.add(
      "active"
    );

    document.body.classList.add(
      "modal-open"
    );
  }


  function closeTradeDetails() {

    tradeDetailsModal?.classList.remove(
      "active"
    );

    document.body.classList.remove(
      "modal-open"
    );
  }


  closeDetailsModal?.addEventListener(
    "click",
    closeTradeDetails
  );


  tradeDetailsModal?.addEventListener(
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


  /* =======================================================
     EDIT TRADE
     ======================================================= */

  editTradeButton?.addEventListener(
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
          trade.entry_price ?? "";
      }


      if (exitInput) {
        exitInput.value =
          trade.exit_price ?? "";
      }


      if (stopLossInput) {
        stopLossInput.value =
          trade.stop_loss ?? "";
      }


      if (takeProfitInput) {
        takeProfitInput.value =
          trade.take_profit ?? "";
      }


      if (riskAmountInput) {
        riskAmountInput.value =
          trade.risk_amount ?? "";
      }


      if (riskRewardInput) {
        riskRewardInput.value =
          trade.risk_reward ?? "";
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

      tradeModal?.classList.add(
        "active"
      );

      document.body.classList.add(
        "modal-open"
      );
    }
  );


  /* =======================================================
     DELETE TRADE
     ======================================================= */

  deleteTradeButton?.addEventListener(
    "click",
    () => {

      if (!selectedTradeId) {
        return;
      }

      closeTradeDetails();

      deleteModal?.classList.add(
        "active"
      );

      document.body.classList.add(
        "modal-open"
      );
    }
  );


  function closeDeleteModal() {

    deleteModal?.classList.remove(
      "active"
    );

    document.body.classList.remove(
      "modal-open"
    );
  }


  cancelDeleteButton?.addEventListener(
    "click",
    closeDeleteModal
  );


  deleteModal?.addEventListener(
    "click",
    event => {

      if (event.target === deleteModal) {
        closeDeleteModal();
      }
    }
  );


  confirmDeleteButton?.addEventListener(
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
        } = await supabaseClient
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
        tradeDetailsModal?.classList.contains(
          "active"
        )
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

  logoutButton?.addEventListener(
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


  /* =======================================================
     AUTH STATE
     ======================================================= */

  supabaseClient.auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {

        if (event === "SIGNED_OUT") {

          window.location.href =
            "/app/login.html";

          return;
        }


        if (session?.user) {

          currentUser =
            session.user;

          renderUser();
        }
      }
    );


  /* =======================================================
     START APP
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
            <td colspan="7" class="empty-table">
              Could not load Trading Island.
            </td>
          </tr>
        `;
      }
    }
  }


  startApp();
}
