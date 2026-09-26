document.addEventListener("DOMContentLoaded", initializeTradingIsland);

async function initializeTradingIsland() {

  /* =========================================================
     SUPABASE
     ========================================================= */

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


  /* =========================================================
     STATE
     ========================================================= */

  let currentUser = null;

  let allTrades = [];
  let filteredTrades = [];

  let selectedTradeId = null;
  let editingTradeId = null;

  let userProfile = {
    display_name: "",
    currency: "EUR",
    account_balance: 10000,
    default_risk_percent: 1,
    default_direction: "Long",
    theme: "dark"
  };

  const now = new Date();

  let calendarYear = now.getFullYear();
  let calendarMonth = now.getMonth();

  let selectedCalendarDate = null;


  /* =========================================================
     BASIC HELPERS
     ========================================================= */

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

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function getCurrency() {

    return userProfile?.currency || "EUR";

  }


  function getCurrencySymbol() {

    const currency = getCurrency();

    if (currency === "USD") {
      return "$";
    }

    if (currency === "GBP") {
      return "£";
    }

    return "€";

  }


  function formatMoney(value) {

    const amount = safeNumber(value);

    try {

      return new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency: getCurrency(),
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      ).format(amount);

    } catch (error) {

      return `${getCurrencySymbol()}${amount.toFixed(2)}`;

    }

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


  function parseDateString(dateString) {

    if (!dateString) {
      return null;
    }

    const parts = dateString
      .split("-")
      .map(Number);

    if (parts.length !== 3) {
      return null;
    }

    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2]
    );

  }


  function formatDate(dateString) {

    const date = parseDateString(dateString);

    if (!date) {
      return "—";
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


  function formatLongDate(dateString) {

    const date = parseDateString(dateString);

    if (!date) {
      return "Select a day";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    ).format(date);

  }


  function formatShortCalendarDate(dateString) {

    const date = parseDateString(dateString);

    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "numeric",
        month: "short"
      }
    ).format(date);

  }


  function getTodayDate() {

    const today = new Date();

    return buildDateString(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  }


  function buildDateString(
    year,
    monthIndex,
    day
  ) {

    const month = String(
      monthIndex + 1
    ).padStart(2, "0");

    const date = String(day)
      .padStart(2, "0");

    return `${year}-${month}-${date}`;

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
    ) || null;

  }


  function setElementText(id, value) {

    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }

  }


  /* =========================================================
     MESSAGES
     ========================================================= */

  function showTradeMessage(
    message,
    type = "error"
  ) {

    const element =
      document.getElementById("tradeMessage");

    if (!element) {
      return;
    }

    element.textContent = message;

    element.className =
      `trade-message show ${type}`;

  }


  function clearTradeMessage() {

    const element =
      document.getElementById("tradeMessage");

    if (!element) {
      return;
    }

    element.textContent = "";
    element.className = "trade-message";

  }


  function showSettingsMessage(
    elementId,
    message,
    type = "success"
  ) {

    const element =
      document.getElementById(elementId);

    if (!element) {
      return;
    }

    element.textContent = message;

    element.className =
      `settings-message show ${type}`;

  }


  function clearSettingsMessage(elementId) {

    const element =
      document.getElementById(elementId);

    if (!element) {
      return;
    }

    element.textContent = "";
    element.className = "settings-message";

  }


  /* =========================================================
     DATE / USER HEADER
     ========================================================= */

  function renderCurrentDate() {

    const dateButton =
      document.getElementById("dateButton");

    if (!dateButton) {
      return;
    }

    const date = new Date();

    dateButton.textContent =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      ).format(date);

  }


  function getDisplayName() {

    if (
      userProfile &&
      userProfile.display_name &&
      userProfile.display_name.trim()
    ) {
      return userProfile.display_name.trim();
    }

    const metadataName =
      currentUser?.user_metadata?.name;

    if (
      metadataName &&
      metadataName.trim()
    ) {
      return metadataName.trim();
    }

    if (currentUser?.email) {
      return currentUser.email
        .split("@")[0];
    }

    return "Trader";

  }


  function renderUser() {

    if (!currentUser) {
      return;
    }

    const displayName = getDisplayName();

    const initial =
      displayName
        .charAt(0)
        .toUpperCase() || "T";

    setElementText(
      "userName",
      displayName
    );

    setElementText(
      "welcomeName",
      displayName
    );

    setElementText(
      "userEmail",
      currentUser.email || ""
    );

    setElementText(
      "userInitial",
      initial
    );

    setElementText(
      "settingsAvatar",
      initial
    );

    setElementText(
      "settingsProfileName",
      displayName
    );

    setElementText(
      "settingsProfileEmail",
      currentUser.email || ""
    );

    const emailInput =
      document.getElementById(
        "settingsEmail"
      );

    if (emailInput) {
      emailInput.value =
        currentUser.email || "";
    }

  }


  /* =========================================================
     PAGE NAVIGATION
     ========================================================= */

  function showView(page) {

    const availablePages = [
      "dashboard",
      "journal",
      "calendar",
      "analytics",
      "settings"
    ];

    if (!availablePages.includes(page)) {

      console.log(
        `${page} will be built next.`
      );

      return;

    }

    document
      .querySelectorAll(".app-view")
      .forEach(view => {
        view.classList.remove("active");
      });

    document
      .querySelectorAll(".nav-item")
      .forEach(item => {
        item.classList.remove("active");
      });

    const targetView =
      document.getElementById(
        `${page}View`
      );

    if (targetView) {
      targetView.classList.add("active");
    }

    const navButton =
      document.querySelector(
        `.nav-item[data-page="${page}"]`
      );

    if (navButton) {
      navButton.classList.add("active");
    }

    if (page === "journal") {
      renderJournal();
    }

    if (page === "calendar") {
      renderCalendar();
    }

    if (page === "analytics") {
      renderAnalytics();
    }

    if (page === "settings") {
      renderSettings();
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }


  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const page =
            button.dataset.page;

          showView(page);

        }
      );

    });


  const openJournalButton =
    document.getElementById(
      "openJournalButton"
    );

  if (openJournalButton) {

    openJournalButton.addEventListener(
      "click",
      () => showView("journal")
    );

  }


  /* =========================================================
     PROFILE
     ========================================================= */

  async function loadProfile() {

    if (!currentUser) {
      return;
    }

    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {

      console.error(
        "Could not load profile:",
        error
      );

      return;

    }

    if (!data) {

      const defaultName =
        currentUser.user_metadata?.name ||
        currentUser.email?.split("@")[0] ||
        "Trader";

      const newProfile = {
        user_id: currentUser.id,
        display_name: defaultName,
        currency: "EUR",
        account_balance: 10000,
        default_risk_percent: 1,
        default_direction: "Long",
        theme: "dark"
      };

      const {
        data: createdProfile,
        error: createError
      } = await supabaseClient
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (createError) {

        console.error(
          "Could not create profile:",
          createError
        );

        return;

      }

      userProfile = {
        ...userProfile,
        ...createdProfile
      };

    } else {

      userProfile = {
        ...userProfile,
        ...data
      };

    }

    applyTheme();
    renderUser();
    renderSettings();

  }


  async function saveProfileChanges() {

    if (!currentUser) {
      return false;
    }

    const payload = {
      user_id: currentUser.id,
      display_name:
        userProfile.display_name || "",
      currency:
        userProfile.currency || "EUR",
      account_balance:
        safeNumber(
          userProfile.account_balance
        ),
      default_risk_percent:
        safeNumber(
          userProfile.default_risk_percent
        ),
      default_direction:
        userProfile.default_direction ||
        "Long",
      theme:
        userProfile.theme || "dark",
      updated_at:
        new Date().toISOString()
    };

    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .upsert(
        payload,
        {
          onConflict: "user_id"
        }
      )
      .select()
      .single();

    if (error) {

      console.error(
        "Could not save profile:",
        error
      );

      return false;

    }

    userProfile = {
      ...userProfile,
      ...data
    };

    return true;

  }


  /* =========================================================
     SETTINGS NAVIGATION
     ========================================================= */

  function showSettingsSection(sectionName) {

    document
      .querySelectorAll(
        ".settings-section"
      )
      .forEach(section => {
        section.classList.remove("active");
      });

    document
      .querySelectorAll(
        ".settings-nav-item"
      )
      .forEach(button => {
        button.classList.remove("active");
      });

    const sectionMap = {
      profile:
        "profileSettingsSection",

      trading:
        "tradingSettingsSection",

      appearance:
        "appearanceSettingsSection",

      security:
        "securitySettingsSection"
    };

    const target =
      document.getElementById(
        sectionMap[sectionName]
      );

    if (target) {
      target.classList.add("active");
    }

    const button =
      document.querySelector(
        `.settings-nav-item[data-settings-section="${sectionName}"]`
      );

    if (button) {
      button.classList.add("active");
    }

  }


  document
    .querySelectorAll(
      ".settings-nav-item"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showSettingsSection(
            button.dataset.settingsSection
          );

        }
      );

    });


  /* =========================================================
     SETTINGS RENDER
     ========================================================= */

  function renderSettings() {

    if (!currentUser) {
      return;
    }

    renderUser();

    const displayNameInput =
      document.getElementById(
        "settingsDisplayName"
      );

    if (displayNameInput) {

      displayNameInput.value =
        getDisplayName();

    }


    const currency =
      document.getElementById(
        "settingsCurrency"
      );

    if (currency) {

      currency.value =
        userProfile.currency || "EUR";

    }


    const balance =
      document.getElementById(
        "settingsAccountBalance"
      );

    if (balance) {

      balance.value =
        safeNumber(
          userProfile.account_balance
        );

    }


    const riskPercent =
      document.getElementById(
        "settingsRiskPercent"
      );

    if (riskPercent) {

      riskPercent.value =
        safeNumber(
          userProfile.default_risk_percent
        );

    }


    const defaultDirection =
      document.getElementById(
        "settingsDefaultDirection"
      );

    if (defaultDirection) {

      defaultDirection.value =
        userProfile.default_direction ||
        "Long";

    }


    const themeInput =
      document.querySelector(
        `input[name="theme"][value="${userProfile.theme || "dark"}"]`
      );

    if (themeInput) {
      themeInput.checked = true;
    }

    updateSettingsRiskPreview();

  }


  /* =========================================================
     PROFILE SETTINGS
     ========================================================= */

  const profileSettingsForm =
    document.getElementById(
      "profileSettingsForm"
    );

  if (profileSettingsForm) {

    profileSettingsForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        clearSettingsMessage(
          "profileSettingsMessage"
        );

        const button =
          document.getElementById(
            "saveProfileSettingsButton"
          );

        const displayName =
          document
            .getElementById(
              "settingsDisplayName"
            )
            ?.value
            .trim();

        if (!displayName) {

          showSettingsMessage(
            "profileSettingsMessage",
            "Enter a display name.",
            "error"
          );

          return;

        }

        if (button) {

          button.disabled = true;
          button.textContent =
            "Saving...";

        }

        userProfile.display_name =
          displayName;

        const success =
          await saveProfileChanges();

        if (!success) {

          showSettingsMessage(
            "profileSettingsMessage",
            "Could not save your profile.",
            "error"
          );

        } else {

          renderUser();

          showSettingsMessage(
            "profileSettingsMessage",
            "Profile saved successfully.",
            "success"
          );

        }

        if (button) {

          button.disabled = false;
          button.textContent =
            "Save profile";

        }

      }
    );

  }


  /* =========================================================
     TRADING SETTINGS
     ========================================================= */

  function updateSettingsRiskPreview() {

    const balance =
      safeNumber(
        document.getElementById(
          "settingsAccountBalance"
        )?.value
      );

    const percentage =
      safeNumber(
        document.getElementById(
          "settingsRiskPercent"
        )?.value
      );

    const currency =
      document.getElementById(
        "settingsCurrency"
      )?.value ||
      userProfile.currency ||
      "EUR";

    const symbol =
      currency === "USD"
        ? "$"
        : currency === "GBP"
          ? "£"
          : "€";

    const riskAmount =
      balance * (percentage / 100);

    setElementText(
      "settingsCurrencySymbol",
      symbol
    );

    const preview =
      document.getElementById(
        "settingsRiskPreview"
      );

    if (preview) {

      try {

        preview.textContent =
          new Intl.NumberFormat(
            "en-US",
            {
              style: "currency",
              currency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          ).format(riskAmount);

      } catch (error) {

        preview.textContent =
          `${symbol}${riskAmount.toFixed(2)}`;

      }

    }

  }


  [
    "settingsCurrency",
    "settingsAccountBalance",
    "settingsRiskPercent"
  ].forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {

      element.addEventListener(
        "input",
        updateSettingsRiskPreview
      );

      element.addEventListener(
        "change",
        updateSettingsRiskPreview
      );

    }

  });


  const tradingSettingsForm =
    document.getElementById(
      "tradingSettingsForm"
    );

  if (tradingSettingsForm) {

    tradingSettingsForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        clearSettingsMessage(
          "tradingSettingsMessage"
        );

        const currency =
          document.getElementById(
            "settingsCurrency"
          )?.value;

        const balance =
          safeNumber(
            document.getElementById(
              "settingsAccountBalance"
            )?.value
          );

        const risk =
          safeNumber(
            document.getElementById(
              "settingsRiskPercent"
            )?.value
          );

        const direction =
          document.getElementById(
            "settingsDefaultDirection"
          )?.value;


        if (balance < 0) {

          showSettingsMessage(
            "tradingSettingsMessage",
            "Account balance cannot be negative.",
            "error"
          );

          return;

        }


        if (
          risk < 0 ||
          risk > 100
        ) {

          showSettingsMessage(
            "tradingSettingsMessage",
            "Risk percentage must be between 0% and 100%.",
            "error"
          );

          return;

        }


        const button =
          document.getElementById(
            "saveTradingSettingsButton"
          );

        if (button) {

          button.disabled = true;
          button.textContent =
            "Saving...";

        }


        userProfile.currency =
          currency || "EUR";

        userProfile.account_balance =
          balance;

        userProfile.default_risk_percent =
          risk;

        userProfile.default_direction =
          direction || "Long";


        const success =
          await saveProfileChanges();


        if (!success) {

          showSettingsMessage(
            "tradingSettingsMessage",
            "Could not save your trading preferences.",
            "error"
          );

        } else {

          renderEverything();
          renderSettings();

          showSettingsMessage(
            "tradingSettingsMessage",
            "Trading preferences saved.",
            "success"
          );

        }


        if (button) {

          button.disabled = false;

          button.textContent =
            "Save trading preferences";

        }

      }
    );

  }


  /* =========================================================
     APPEARANCE
     ========================================================= */

  function getEffectiveTheme() {

    const selected =
      userProfile.theme || "dark";

    if (selected !== "system") {
      return selected;
    }

    const prefersLight =
      window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches;

    return prefersLight
      ? "light"
      : "dark";

  }


  function applyTheme() {

    const effectiveTheme =
      getEffectiveTheme();

    document.documentElement
      .setAttribute(
        "data-theme",
        effectiveTheme
      );

  }


  const appearanceSettingsForm =
    document.getElementById(
      "appearanceSettingsForm"
    );

  if (appearanceSettingsForm) {

    appearanceSettingsForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        clearSettingsMessage(
          "appearanceSettingsMessage"
        );

        const selected =
          document.querySelector(
            'input[name="theme"]:checked'
          );

        if (!selected) {
          return;
        }

        const button =
          document.getElementById(
            "saveAppearanceSettingsButton"
          );

        if (button) {

          button.disabled = true;
          button.textContent =
            "Saving...";

        }


        userProfile.theme =
          selected.value;

        applyTheme();


        const success =
          await saveProfileChanges();


        if (!success) {

          showSettingsMessage(
            "appearanceSettingsMessage",
            "Could not save appearance settings.",
            "error"
          );

        } else {

          showSettingsMessage(
            "appearanceSettingsMessage",
            "Appearance saved.",
            "success"
          );

        }


        if (button) {

          button.disabled = false;
          button.textContent =
            "Save appearance";

        }

      }
    );

  }


  document
    .querySelectorAll(
      'input[name="theme"]'
    )
    .forEach(input => {

      input.addEventListener(
        "change",
        () => {

          const oldTheme =
            userProfile.theme;

          userProfile.theme =
            input.value;

          applyTheme();

          userProfile.theme =
            oldTheme;

        }
      );

    });


  if (window.matchMedia) {

    const media =
      window.matchMedia(
        "(prefers-color-scheme: light)"
      );

    media.addEventListener?.(
      "change",
      () => {

        if (
          userProfile.theme === "system"
        ) {
          applyTheme();
        }

      }
    );

  }


  /* =========================================================
     PASSWORD
     ========================================================= */

  const passwordSettingsForm =
    document.getElementById(
      "passwordSettingsForm"
    );

  if (passwordSettingsForm) {

    passwordSettingsForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        clearSettingsMessage(
          "passwordSettingsMessage"
        );

        const password =
          document.getElementById(
            "settingsNewPassword"
          )?.value || "";

        const confirmation =
          document.getElementById(
            "settingsConfirmPassword"
          )?.value || "";


        if (password.length < 6) {

          showSettingsMessage(
            "passwordSettingsMessage",
            "Your password must contain at least 6 characters.",
            "error"
          );

          return;

        }


        if (password !== confirmation) {

          showSettingsMessage(
            "passwordSettingsMessage",
            "The passwords do not match.",
            "error"
          );

          return;

        }


        const button =
          document.getElementById(
            "changePasswordButton"
          );

        if (button) {

          button.disabled = true;
          button.textContent =
            "Updating...";

        }


        const {
          error
        } = await supabaseClient.auth
          .updateUser({
            password
          });


        if (error) {

          showSettingsMessage(
            "passwordSettingsMessage",
            error.message ||
              "Could not update your password.",
            "error"
          );

        } else {

          passwordSettingsForm.reset();

          showSettingsMessage(
            "passwordSettingsMessage",
            "Password updated successfully.",
            "success"
          );

        }


        if (button) {

          button.disabled = false;
          button.textContent =
            "Change password";

        }

      }
    );

  }


  /* =========================================================
     LOAD TRADES
     ========================================================= */

  async function loadTrades() {

    if (!currentUser) {
      return;
    }

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

      console.error(
        "Could not load trades:",
        error
      );

      allTrades = [];
      filteredTrades = [];

      renderEverything();

      return;

    }

    allTrades = data || [];
    filteredTrades = [...allTrades];

    renderEverything();

  }


  /* =========================================================
     RENDER EVERYTHING
     ========================================================= */

  function renderEverything() {

    renderDashboard();
    renderJournal();
    renderCalendar();
    renderAnalytics();

  }


  /* =========================================================
     DASHBOARD
     ========================================================= */

  function renderDashboard() {

    const totalTrades =
      allTrades.length;

    const winners =
      allTrades.filter(
        trade =>
          safeNumber(trade.pnl) > 0
      );

    const losers =
      allTrades.filter(
        trade =>
          safeNumber(trade.pnl) < 0
      );

    const totalPnl =
      allTrades.reduce(
        (sum, trade) =>
          sum + safeNumber(trade.pnl),
        0
      );

    const winRate =
      totalTrades > 0
        ? (
            winners.length /
            totalTrades
          ) * 100
        : 0;

    const grossProfit =
      winners.reduce(
        (sum, trade) =>
          sum + safeNumber(trade.pnl),
        0
      );

    const grossLoss =
      Math.abs(
        losers.reduce(
          (sum, trade) =>
            sum + safeNumber(trade.pnl),
          0
        )
      );

    let profitFactor = "0.00";

    if (
      grossLoss === 0 &&
      grossProfit > 0
    ) {
      profitFactor = "∞";
    } else if (grossLoss > 0) {
      profitFactor =
        (
          grossProfit /
          grossLoss
        ).toFixed(2);
    }


    const averageWin =
      winners.length
        ? grossProfit /
          winners.length
        : 0;


    const averageLoss =
      losers.length
        ? losers.reduce(
            (sum, trade) =>
              sum +
              safeNumber(trade.pnl),
            0
          ) / losers.length
        : 0;


    const bestTrade =
      totalTrades
        ? Math.max(
            ...allTrades.map(
              trade =>
                safeNumber(trade.pnl)
            )
          )
        : 0;


    const worstTrade =
      totalTrades
        ? Math.min(
            ...allTrades.map(
              trade =>
                safeNumber(trade.pnl)
            )
          )
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


    const averageRR =
      rrTrades.length
        ? rrTrades.reduce(
            (sum, trade) =>
              sum +
              safeNumber(
                trade.risk_reward
              ),
            0
          ) / rrTrades.length
        : null;


    const totalPnlElement =
      document.getElementById(
        "totalPnl"
      );

    if (totalPnlElement) {

      totalPnlElement.textContent =
        formatMoney(totalPnl);

      totalPnlElement.className =
        getPnlClass(totalPnl);

    }


    setElementText(
      "pnlSubtext",
      totalTrades
        ? `${totalTrades} total trades`
        : "No trades yet"
    );


    setElementText(
      "winRate",
      `${winRate.toFixed(1)}%`
    );


    setElementText(
      "winRateSubtext",
      `${winners.length} ${
        winners.length === 1
          ? "win"
          : "wins"
      }`
    );


    setElementText(
      "profitFactor",
      profitFactor
    );


    setElementText(
      "totalTrades",
      totalTrades
    );


    setElementText(
      "tradeSubtext",
      totalTrades
        ? "Stored in your journal"
        : "Your journal"
    );


    const performance = {
      averageWin:
        formatMoney(averageWin),

      averageLoss:
        formatMoney(averageLoss),

      bestTrade:
        formatMoney(bestTrade),

      worstTrade:
        formatMoney(worstTrade),

      averageRR:
        averageRR === null
          ? "—"
          : `${averageRR.toFixed(2)}R`
    };


    Object.entries(
      performance
    ).forEach(
      ([id, value]) => {

        setElementText(
          id,
          value
        );

      }
    );


    const averageWinElement =
      document.getElementById(
        "averageWin"
      );

    const averageLossElement =
      document.getElementById(
        "averageLoss"
      );

    const bestTradeElement =
      document.getElementById(
        "bestTrade"
      );

    const worstTradeElement =
      document.getElementById(
        "worstTrade"
      );


    if (averageWinElement) {
      averageWinElement.className =
        averageWin > 0
          ? "positive"
          : "";
    }

    if (averageLossElement) {
      averageLossElement.className =
        averageLoss < 0
          ? "negative"
          : "";
    }

    if (bestTradeElement) {
      bestTradeElement.className =
        getPnlClass(bestTrade);
    }

    if (worstTradeElement) {
      worstTradeElement.className =
        getPnlClass(worstTrade);
    }


    renderRecentTrades();

  }


  function renderRecentTrades() {

    const tbody =
      document.getElementById(
        "tradesTableBody"
      );

    if (!tbody) {
      return;
    }

    const recentTrades =
      allTrades.slice(0, 5);

    if (!recentTrades.length) {

      tbody.innerHTML = `
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


    tbody.innerHTML =
      recentTrades
        .map(trade => {

          const direction =
            trade.direction === "Short"
              ? "short"
              : "long";

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
                  class="direction-badge ${direction}"
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
                  escapeHtml(
                    trade.strategy ||
                    "—"
                  )
                }
              </td>

              <td>
                ${formatDate(
                  trade.trade_date
                )}
              </td>

              <td
                class="${getPnlClass(
                  trade.pnl
                )}"
              >
                <strong>
                  ${formatMoney(
                    trade.pnl
                  )}
                </strong>
              </td>
            </tr>
          `;

        })
        .join("");

  }


  /* =========================================================
     ANALYTICS
     ========================================================= */

  let analyticsRange = "all";

  function getAnalyticsTrades() {

    if (analyticsRange === "all") {
      return [...allTrades];
    }

    const days = Number(analyticsRange);

    if (!Number.isFinite(days)) {
      return [...allTrades];
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    return allTrades.filter(trade => {
      const date = parseDateString(trade.trade_date);
      return date && date >= start && date <= today;
    });

  }


  function setAnalyticsMoney(id, value) {

    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent = formatMoney(value);
    element.classList.remove(
      "analytics-positive",
      "analytics-negative"
    );

    if (safeNumber(value) > 0) {
      element.classList.add("analytics-positive");
    } else if (safeNumber(value) < 0) {
      element.classList.add("analytics-negative");
    }

  }


  function getAnalyticsStats(trades) {

    const winners = trades.filter(
      trade => safeNumber(trade.pnl) > 0
    );

    const losers = trades.filter(
      trade => safeNumber(trade.pnl) < 0
    );

    const netPnl = trades.reduce(
      (sum, trade) => sum + safeNumber(trade.pnl),
      0
    );

    const grossProfit = winners.reduce(
      (sum, trade) => sum + safeNumber(trade.pnl),
      0
    );

    const grossLoss = Math.abs(
      losers.reduce(
        (sum, trade) => sum + safeNumber(trade.pnl),
        0
      )
    );

    const winRate = trades.length
      ? (winners.length / trades.length) * 100
      : 0;

    const averageWin = winners.length
      ? grossProfit / winners.length
      : 0;

    const averageLoss = losers.length
      ? losers.reduce(
          (sum, trade) => sum + safeNumber(trade.pnl),
          0
        ) / losers.length
      : 0;

    const rrTrades = trades.filter(
      trade =>
        trade.risk_reward !== null &&
        trade.risk_reward !== undefined &&
        Number.isFinite(Number(trade.risk_reward))
    );

    const averageRR = rrTrades.length
      ? rrTrades.reduce(
          (sum, trade) => sum + safeNumber(trade.risk_reward),
          0
        ) / rrTrades.length
      : null;

    let profitFactor = "0.00";

    if (grossLoss === 0 && grossProfit > 0) {
      profitFactor = "∞";
    } else if (grossLoss > 0) {
      profitFactor = (grossProfit / grossLoss).toFixed(2);
    }

    const bestTrade = trades.length
      ? Math.max(...trades.map(trade => safeNumber(trade.pnl)))
      : 0;

    const worstTrade = trades.length
      ? Math.min(...trades.map(trade => safeNumber(trade.pnl)))
      : 0;

    const expectancy = trades.length
      ? netPnl / trades.length
      : 0;

    return {
      winners,
      losers,
      netPnl,
      grossProfit,
      grossLoss,
      winRate,
      averageWin,
      averageLoss,
      averageRR,
      profitFactor,
      bestTrade,
      worstTrade,
      expectancy
    };

  }


  function sortTradesChronologically(trades) {

    return [...trades].sort((a, b) => {
      const aDate = parseDateString(a.trade_date)?.getTime() || 0;
      const bDate = parseDateString(b.trade_date)?.getTime() || 0;

      if (aDate !== bDate) {
        return aDate - bDate;
      }

      return String(a.created_at || "")
        .localeCompare(String(b.created_at || ""));
    });

  }


  function calculateStreaks(trades) {

    const ordered = sortTradesChronologically(trades);

    let currentWins = 0;
    let currentLosses = 0;
    let bestWins = 0;
    let worstLosses = 0;

    ordered.forEach(trade => {
      const pnl = safeNumber(trade.pnl);

      if (pnl > 0) {
        currentWins += 1;
        currentLosses = 0;
        bestWins = Math.max(bestWins, currentWins);
      } else if (pnl < 0) {
        currentLosses += 1;
        currentWins = 0;
        worstLosses = Math.max(worstLosses, currentLosses);
      } else {
        currentWins = 0;
        currentLosses = 0;
      }
    });

    return {
      bestWins,
      worstLosses
    };

  }


  function calculateMaxDrawdown(trades) {

    const ordered = sortTradesChronologically(trades);

    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;

    ordered.forEach(trade => {
      equity += safeNumber(trade.pnl);
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(
        maxDrawdown,
        peak - equity
      );
    });

    return maxDrawdown;

  }


  function renderAnalyticsEquityCurve(trades) {

    const container = document.getElementById(
      "analyticsEquityChart"
    );

    if (!container) {
      return;
    }

    if (!trades.length) {
      container.innerHTML = `
        <div class="analytics-empty-chart">
          Add trades to build your equity curve.
        </div>
      `;
      return;
    }

    const ordered = sortTradesChronologically(trades);

    let running = 0;
    const values = [0];

    ordered.forEach(trade => {
      running += safeNumber(trade.pnl);
      values.push(running);
    });

    const width = 800;
    const height = 260;
    const padding = 16;

    let min = Math.min(...values);
    let max = Math.max(...values);

    if (min === max) {
      min -= 1;
      max += 1;
    }

    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    const points = values.map((value, index) => {
      const x = padding +
        (values.length === 1
          ? 0
          : (index / (values.length - 1)) * usableWidth);

      const y = padding +
        ((max - value) / (max - min)) * usableHeight;

      return { x, y };
    });

    const linePath = points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      )
      .join(" ");

    const first = points[0];
    const last = points[points.length - 1];

    const areaPath = `${linePath} L${last.x.toFixed(2)} ${height} L${first.x.toFixed(2)} ${height} Z`;

    container.innerHTML = `
      <svg
        class="analytics-equity-svg"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        role="img"
        aria-label="Cumulative trading P and L equity curve"
      >
        <path class="analytics-equity-area" d="${areaPath}"></path>
        <path class="analytics-equity-line" d="${linePath}"></path>
      </svg>
    `;

  }


  function groupAnalyticsTrades(trades, keyGetter) {

    const groups = new Map();

    trades.forEach(trade => {
      const key = keyGetter(trade) || "Unspecified";

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(trade);
    });

    return [...groups.entries()].map(([name, groupTrades]) => {
      const pnl = groupTrades.reduce(
        (sum, trade) => sum + safeNumber(trade.pnl),
        0
      );

      const wins = groupTrades.filter(
        trade => safeNumber(trade.pnl) > 0
      ).length;

      return {
        name,
        pnl,
        trades: groupTrades.length,
        winRate: groupTrades.length
          ? (wins / groupTrades.length) * 100
          : 0
      };
    });

  }


  function renderAnalyticsBreakdown(containerId, items) {

    const container = document.getElementById(containerId);

    if (!container) {
      return;
    }

    if (!items.length) {
      container.innerHTML = `
        <div class="analytics-empty">
          No trading data yet.
        </div>
      `;
      return;
    }

    const sorted = [...items].sort(
      (a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)
    );

    const maximum = Math.max(
      ...sorted.map(item => Math.abs(item.pnl)),
      1
    );

    container.innerHTML = `
      <div class="analytics-breakdown-list">
        ${sorted.map(item => {
          const percentage = Math.max(
            2,
            (Math.abs(item.pnl) / maximum) * 100
          );

          const resultClass = item.pnl < 0
            ? "loss"
            : "";

          const moneyClass = item.pnl > 0
            ? "analytics-positive"
            : item.pnl < 0
              ? "analytics-negative"
              : "";

          return `
            <div class="analytics-breakdown-item">
              <span class="analytics-breakdown-name" title="${escapeHtml(item.name)}">
                ${escapeHtml(item.name)}
              </span>

              <div class="analytics-bar-track">
                <div
                  class="analytics-bar ${resultClass}"
                  style="width:${percentage.toFixed(1)}%"
                ></div>
              </div>

              <span class="analytics-breakdown-value ${moneyClass}">
                ${escapeHtml(formatMoney(item.pnl))}
              </span>
            </div>
          `;
        }).join("")}
      </div>
    `;

  }


  function renderAnalyticsDirection(trades) {

    const container = document.getElementById(
      "analyticsDirectionBreakdown"
    );

    if (!container) {
      return;
    }

    if (!trades.length) {
      container.innerHTML = `
        <div class="analytics-empty">
          No trading data yet.
        </div>
      `;
      return;
    }

    const directions = ["Long", "Short"].map(direction => {
      const directionTrades = trades.filter(
        trade => trade.direction === direction
      );

      const pnl = directionTrades.reduce(
        (sum, trade) => sum + safeNumber(trade.pnl),
        0
      );

      const wins = directionTrades.filter(
        trade => safeNumber(trade.pnl) > 0
      ).length;

      return {
        direction,
        trades: directionTrades.length,
        pnl,
        winRate: directionTrades.length
          ? (wins / directionTrades.length) * 100
          : 0
      };
    });

    container.innerHTML = `
      <div class="analytics-direction-grid">
        ${directions.map(item => {
          const moneyClass = item.pnl > 0
            ? "analytics-positive"
            : item.pnl < 0
              ? "analytics-negative"
              : "";

          return `
            <div class="analytics-direction-card">
              <span>${item.direction}</span>
              <strong class="${moneyClass}">
                ${escapeHtml(formatMoney(item.pnl))}
              </strong>
              <small>
                ${item.trades} ${item.trades === 1 ? "trade" : "trades"} · ${item.winRate.toFixed(1)}% win rate
              </small>
            </div>
          `;
        }).join("")}
      </div>
    `;

  }


  function renderAnalyticsWeekdays(trades) {

    const container = document.getElementById(
      "analyticsWeekdayBreakdown"
    );

    if (!container) {
      return;
    }

    const days = [
      { index: 1, label: "MON" },
      { index: 2, label: "TUE" },
      { index: 3, label: "WED" },
      { index: 4, label: "THU" },
      { index: 5, label: "FRI" },
      { index: 6, label: "SAT" },
      { index: 0, label: "SUN" }
    ];

    if (!trades.length) {
      container.innerHTML = `
        <div class="analytics-empty">
          No trading data yet.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="analytics-weekdays">
        ${days.map(day => {
          const dayTrades = trades.filter(trade => {
            const date = parseDateString(trade.trade_date);
            return date && date.getDay() === day.index;
          });

          const pnl = dayTrades.reduce(
            (sum, trade) => sum + safeNumber(trade.pnl),
            0
          );

          const moneyClass = pnl > 0
            ? "analytics-positive"
            : pnl < 0
              ? "analytics-negative"
              : "";

          return `
            <div class="analytics-weekday">
              <span>${day.label}</span>
              <strong class="${moneyClass}">
                ${escapeHtml(formatMoney(pnl))}
              </strong>
              <small>
                ${dayTrades.length} ${dayTrades.length === 1 ? "trade" : "trades"}
              </small>
            </div>
          `;
        }).join("")}
      </div>
    `;

  }


  function renderAnalytics() {

    const trades = getAnalyticsTrades();
    const stats = getAnalyticsStats(trades);
    const streaks = calculateStreaks(trades);
    const maxDrawdown = calculateMaxDrawdown(trades);

    setAnalyticsMoney(
      "analyticsNetPnl",
      stats.netPnl
    );

    setElementText(
      "analyticsNetPnlSubtext",
      `${trades.length} ${trades.length === 1 ? "trade" : "trades"}`
    );

    setElementText(
      "analyticsWinRate",
      `${stats.winRate.toFixed(1)}%`
    );

    setElementText(
      "analyticsWinRateSubtext",
      `${stats.winners.length} wins / ${stats.losers.length} losses`
    );

    setElementText(
      "analyticsProfitFactor",
      stats.profitFactor
    );

    setElementText(
      "analyticsAverageRR",
      stats.averageRR === null
        ? "—"
        : stats.averageRR.toFixed(2)
    );

    setAnalyticsMoney(
      "analyticsAverageWin",
      stats.averageWin
    );

    setAnalyticsMoney(
      "analyticsAverageLoss",
      stats.averageLoss
    );

    setAnalyticsMoney(
      "analyticsBestTrade",
      stats.bestTrade
    );

    setAnalyticsMoney(
      "analyticsWorstTrade",
      stats.worstTrade
    );

    setElementText(
      "analyticsMaxDrawdown",
      formatMoney(-maxDrawdown)
    );

    const drawdownElement = document.getElementById(
      "analyticsMaxDrawdown"
    );

    if (drawdownElement) {
      drawdownElement.classList.toggle(
        "analytics-negative",
        maxDrawdown > 0
      );
    }

    setElementText(
      "analyticsWinStreak",
      streaks.bestWins
    );

    setElementText(
      "analyticsLossStreak",
      streaks.worstLosses
    );

    setAnalyticsMoney(
      "analyticsExpectancy",
      stats.expectancy
    );

    setElementText(
      "analyticsTradeCount",
      `${trades.length} ${trades.length === 1 ? "trade" : "trades"}`
    );

    renderAnalyticsEquityCurve(trades);
    renderAnalyticsDirection(trades);

    renderAnalyticsBreakdown(
      "analyticsStrategyBreakdown",
      groupAnalyticsTrades(
        trades,
        trade => String(trade.strategy || "").trim() || "No strategy"
      )
    );

    renderAnalyticsBreakdown(
      "analyticsMarketBreakdown",
      groupAnalyticsTrades(
        trades,
        trade => String(trade.market || "").trim() || "Unknown market"
      )
    );

    renderAnalyticsWeekdays(trades);

    document
      .querySelectorAll(".analytics-range-button")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.range === analyticsRange
        );
      });

  }


  document
    .querySelectorAll(".analytics-range-button")
    .forEach(button => {
      button.addEventListener("click", () => {
        analyticsRange = button.dataset.range || "all";
        renderAnalytics();
      });
    });


  /* =========================================================
     JOURNAL
     ========================================================= */

  function renderJournalStats() {

    const trades =
      filteredTrades;

    const totalTrades =
      trades.length;

    const winners =
      trades.filter(
        trade =>
          safeNumber(trade.pnl) > 0
      );

    const totalPnl =
      trades.reduce(
        (sum, trade) =>
          sum + safeNumber(trade.pnl),
        0
      );

    const winRate =
      totalTrades
        ? (
            winners.length /
            totalTrades
          ) * 100
        : 0;

    const rrTrades =
      trades.filter(
        trade =>
          trade.risk_reward !== null &&
          trade.risk_reward !== undefined &&
          Number.isFinite(
            Number(trade.risk_reward)
          )
      );

    const averageRR =
      rrTrades.length
        ? rrTrades.reduce(
            (sum, trade) =>
              sum +
              safeNumber(
                trade.risk_reward
              ),
            0
          ) / rrTrades.length
        : null;


    setElementText(
      "journalTotalTrades",
      totalTrades
    );


    const pnlElement =
      document.getElementById(
        "journalTotalPnl"
      );

    if (pnlElement) {

      pnlElement.textContent =
        formatMoney(totalPnl);

      pnlElement.className =
        getPnlClass(totalPnl);

    }


    setElementText(
      "journalWinRate",
      `${winRate.toFixed(1)}%`
    );


    setElementText(
      "journalAverageRR",
      averageRR === null
        ? "—"
        : `${averageRR.toFixed(2)}R`
    );

  }


  function populateStrategyFilter() {

    const select =
      document.getElementById(
        "strategyFilter"
      );

    if (!select) {
      return;
    }

    const currentValue =
      select.value || "all";

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


    select.innerHTML = `
      <option value="all">
        All strategies
      </option>

      ${strategies
        .map(
          strategy => `
            <option
              value="${escapeHtml(
                strategy
              )}"
            >
              ${escapeHtml(
                strategy
              )}
            </option>
          `
        )
        .join("")}
    `;


    if (
      currentValue === "all" ||
      strategies.includes(
        currentValue
      )
    ) {
      select.value =
        currentValue;
    }

  }


  function applyJournalFilters() {

    const search =
      document
        .getElementById(
          "journalSearch"
        )
        ?.value
        .trim()
        .toLowerCase() || "";

    const direction =
      document.getElementById(
        "directionFilter"
      )?.value || "all";

    const result =
      document.getElementById(
        "resultFilter"
      )?.value || "all";

    const strategy =
      document.getElementById(
        "strategyFilter"
      )?.value || "all";


    filteredTrades =
      allTrades.filter(trade => {

        const marketText =
          String(
            trade.market || ""
          ).toLowerCase();

        const strategyText =
          String(
            trade.strategy || ""
          ).toLowerCase();

        const matchesSearch =
          !search ||
          marketText.includes(search) ||
          strategyText.includes(search);

        const matchesDirection =
          direction === "all" ||
          trade.direction === direction;

        const pnl =
          safeNumber(trade.pnl);

        let matchesResult = true;

        if (result === "win") {
          matchesResult = pnl > 0;
        }

        if (result === "loss") {
          matchesResult = pnl < 0;
        }

        if (
          result === "breakeven"
        ) {
          matchesResult = pnl === 0;
        }

        const matchesStrategy =
          strategy === "all" ||
          trade.strategy === strategy;

        return (
          matchesSearch &&
          matchesDirection &&
          matchesResult &&
          matchesStrategy
        );

      });


    renderJournalTable();
    renderJournalStats();

  }


  function renderJournalTable() {

    const tbody =
      document.getElementById(
        "journalTableBody"
      );

    if (!tbody) {
      return;
    }


    setElementText(
      "journalTradeCount",
      `${filteredTrades.length} ${
        filteredTrades.length === 1
          ? "trade"
          : "trades"
      }`
    );


    if (!filteredTrades.length) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="11"
            class="empty-table"
          >
            No trades match your filters.
          </td>
        </tr>
      `;

      return;

    }


    tbody.innerHTML =
      filteredTrades
        .map(trade => {

          const directionClass =
            trade.direction === "Short"
              ? "short"
              : "long";

          const rr =
            trade.risk_reward === null ||
            trade.risk_reward === undefined
              ? "—"
              : `${safeNumber(
                  trade.risk_reward
                ).toFixed(2)}R`;

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
                ${escapeHtml(
                  trade.strategy || "—"
                )}
              </td>

              <td>
                ${rr}
              </td>

              <td
                class="${getPnlClass(
                  trade.pnl
                )}"
              >
                <strong>
                  ${formatMoney(
                    trade.pnl
                  )}
                </strong>
              </td>

              <td>
                <button
                  class="trade-row-button"
                  type="button"
                  data-trade-id="${trade.id}"
                  aria-label="View trade"
                >
                  →
                </button>
              </td>

            </tr>
          `;

        })
        .join("");


    tbody
      .querySelectorAll(
        ".journal-trade-row"
      )
      .forEach(row => {

        row.addEventListener(
          "click",
          () => {

            openTradeDetails(
              row.dataset.tradeId
            );

          }
        );

      });


    tbody
      .querySelectorAll(
        ".trade-row-button"
      )
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


  function renderJournal() {

    populateStrategyFilter();

    if (!filteredTrades.length &&
        allTrades.length) {
      filteredTrades =
        [...allTrades];
    }

    applyJournalFilters();

  }


  const journalSearch =
    document.getElementById(
      "journalSearch"
    );

  if (journalSearch) {

    journalSearch.addEventListener(
      "input",
      applyJournalFilters
    );

  }


  [
    "directionFilter",
    "resultFilter",
    "strategyFilter"
  ].forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {

      element.addEventListener(
        "change",
        applyJournalFilters
      );

    }

  });


  const clearFiltersButton =
    document.getElementById(
      "clearFiltersButton"
    );

  if (clearFiltersButton) {

    clearFiltersButton.addEventListener(
      "click",
      () => {

        const search =
          document.getElementById(
            "journalSearch"
          );

        const direction =
          document.getElementById(
            "directionFilter"
          );

        const result =
          document.getElementById(
            "resultFilter"
          );

        const strategy =
          document.getElementById(
            "strategyFilter"
          );

        if (search) {
          search.value = "";
        }

        if (direction) {
          direction.value = "all";
        }

        if (result) {
          result.value = "all";
        }

        if (strategy) {
          strategy.value = "all";
        }

        applyJournalFilters();

      }
    );

  }


  /* =========================================================
     CALENDAR
     ========================================================= */

  function getMonthTrades() {

    return allTrades.filter(
      trade => {

        const date =
          parseDateString(
            trade.trade_date
          );

        if (!date) {
          return false;
        }

        return (
          date.getFullYear() ===
            calendarYear &&
          date.getMonth() ===
            calendarMonth
        );

      }
    );

  }


  function buildDailyCalendarData() {

    const dailyData = {};

    allTrades.forEach(trade => {

      const date =
        trade.trade_date;

      if (!date) {
        return;
      }

      if (!dailyData[date]) {

        dailyData[date] = {
          trades: [],
          pnl: 0
        };

      }

      dailyData[date].trades.push(
        trade
      );

      dailyData[date].pnl +=
        safeNumber(trade.pnl);

    });

    return dailyData;

  }


  function renderCalendarStats(
    monthTrades,
    dailyData
  ) {

    const totalPnl =
      monthTrades.reduce(
        (sum, trade) =>
          sum + safeNumber(trade.pnl),
        0
      );

    const winners =
      monthTrades.filter(
        trade =>
          safeNumber(trade.pnl) > 0
      );

    const winRate =
      monthTrades.length
        ? (
            winners.length /
            monthTrades.length
          ) * 100
        : 0;


    const prefix =
      `${calendarYear}-${String(
        calendarMonth + 1
      ).padStart(2, "0")}-`;


    const tradingDays =
      Object.entries(dailyData)
        .filter(
          ([date]) =>
            date.startsWith(prefix)
        );


    const profitableDays =
      tradingDays.filter(
        ([, data]) =>
          data.pnl > 0
      );


    const pnlElement =
      document.getElementById(
        "calendarMonthPnl"
      );

    if (pnlElement) {

      pnlElement.textContent =
        formatMoney(totalPnl);

      pnlElement.className =
        getPnlClass(totalPnl);

    }


    setElementText(
      "calendarMonthPnlSubtext",
      monthTrades.length
        ? `${monthTrades.length} trades this month`
        : "No trades this month"
    );


    setElementText(
      "calendarMonthTrades",
      monthTrades.length
    );


    setElementText(
      "calendarMonthWinRate",
      `${winRate.toFixed(1)}%`
    );


    setElementText(
      "calendarWinRateSubtext",
      `${winners.length} ${
        winners.length === 1
          ? "win"
          : "wins"
      }`
    );


    setElementText(
      "calendarProfitableDays",
      profitableDays.length
    );


    setElementText(
      "calendarProfitableDaysSubtext",
      `${tradingDays.length} ${
        tradingDays.length === 1
          ? "trading day"
          : "trading days"
      }`
    );


    renderCalendarSummary(
      tradingDays
    );

  }


  function renderCalendarSummary(
    tradingDays
  ) {

    if (!tradingDays.length) {

      setElementText(
        "calendarBestDayPnl",
        "—"
      );

      setElementText(
        "calendarBestDayDate",
        "No trading data"
      );

      setElementText(
        "calendarWorstDayPnl",
        "—"
      );

      setElementText(
        "calendarWorstDayDate",
        "No trading data"
      );

      setElementText(
        "calendarAverageDailyPnl",
        formatMoney(0)
      );

      return;

    }


    const sorted =
      [...tradingDays].sort(
        (a, b) =>
          b[1].pnl -
          a[1].pnl
      );


    const best = sorted[0];

    const worst =
      [...tradingDays].sort(
        (a, b) =>
          a[1].pnl -
          b[1].pnl
      )[0];


    const average =
      tradingDays.reduce(
        (sum, [, data]) =>
          sum + data.pnl,
        0
      ) / tradingDays.length;


    const bestElement =
      document.getElementById(
        "calendarBestDayPnl"
      );

    if (bestElement) {

      bestElement.textContent =
        formatMoney(best[1].pnl);

      bestElement.className =
        getPnlClass(
          best[1].pnl
        );

    }


    setElementText(
      "calendarBestDayDate",
      formatShortCalendarDate(
        best[0]
      )
    );


    const worstElement =
      document.getElementById(
        "calendarWorstDayPnl"
      );

    if (worstElement) {

      worstElement.textContent =
        formatMoney(worst[1].pnl);

      worstElement.className =
        getPnlClass(
          worst[1].pnl
        );

    }


    setElementText(
      "calendarWorstDayDate",
      formatShortCalendarDate(
        worst[0]
      )
    );


    const averageElement =
      document.getElementById(
        "calendarAverageDailyPnl"
      );

    if (averageElement) {

      averageElement.textContent =
        formatMoney(average);

      averageElement.className =
        getPnlClass(average);

    }

  }


  function renderCalendar() {

    const grid =
      document.getElementById(
        "calendarGrid"
      );

    if (!grid) {
      return;
    }


    const monthTitle =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          month: "long",
          year: "numeric"
        }
      ).format(
        new Date(
          calendarYear,
          calendarMonth,
          1
        )
      );


    setElementText(
      "calendarMonthTitle",
      monthTitle
    );


    const dailyData =
      buildDailyCalendarData();

    const monthTrades =
      getMonthTrades();


    renderCalendarStats(
      monthTrades,
      dailyData
    );


    const firstDay =
      new Date(
        calendarYear,
        calendarMonth,
        1
      );


    const mondayBasedDay =
      (
        firstDay.getDay() + 6
      ) % 7;


    const startDate =
      new Date(
        calendarYear,
        calendarMonth,
        1 - mondayBasedDay
      );


    const today =
      getTodayDate();

    let html = "";


    for (
      let index = 0;
      index < 42;
      index++
    ) {

      const date =
        new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate() +
            index
        );


      const dateString =
        buildDateString(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );


      const dayData =
        dailyData[dateString];


      const isOutside =
        date.getMonth() !==
        calendarMonth;


      const isToday =
        dateString === today;


      const isSelected =
        dateString ===
        selectedCalendarDate;


      let resultClass = "";

      if (dayData) {

        if (dayData.pnl > 0) {
          resultClass =
            "profit-day";
        } else if (
          dayData.pnl < 0
        ) {
          resultClass =
            "loss-day";
        } else {
          resultClass =
            "breakeven-day";
        }

      }


      html += `
        <button
          class="
            calendar-day
            ${isOutside
              ? "outside-month"
              : ""}
            ${isToday
              ? "today"
              : ""}
            ${isSelected
              ? "selected"
              : ""}
            ${resultClass}
          "
          type="button"
          data-calendar-date="${dateString}"
        >

          <div class="calendar-day-top">

            <span
              class="calendar-day-number"
            >
              ${date.getDate()}
            </span>

            ${
              dayData
                ? `
                  <span
                    class="calendar-day-trade-count"
                  >
                    ${dayData.trades.length}
                  </span>
                `
                : ""
            }

          </div>

          ${
            dayData
              ? `
                <div
                  class="calendar-day-result"
                >

                  <strong>
                    ${formatMoney(
                      dayData.pnl
                    )}
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
                <span
                  class="calendar-day-no-trades"
                >
                  —
                </span>
              `
          }

        </button>
      `;

    }


    grid.innerHTML = html;


    grid
      .querySelectorAll(
        ".calendar-day"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const dateString =
              button.dataset
                .calendarDate;

            selectedCalendarDate =
              dateString;


            const selectedDate =
              parseDateString(
                dateString
              );


            if (
              selectedDate &&
              (
                selectedDate.getMonth() !==
                  calendarMonth ||
                selectedDate.getFullYear() !==
                  calendarYear
              )
            ) {

              calendarMonth =
                selectedDate.getMonth();

              calendarYear =
                selectedDate.getFullYear();

            }


            renderCalendar();

          }
        );

      });


    renderSelectedCalendarDay(
      dailyData
    );

  }


  function renderSelectedCalendarDay(
    dailyData
  ) {

    const empty =
      document.getElementById(
        "selectedDayEmpty"
      );

    const content =
      document.getElementById(
        "selectedDayContent"
      );


    if (!empty || !content) {
      return;
    }


    if (!selectedCalendarDate) {

      setElementText(
        "selectedDayTitle",
        "Select a day"
      );

      empty.hidden = false;
      content.hidden = true;

      return;

    }


    setElementText(
      "selectedDayTitle",
      formatLongDate(
        selectedCalendarDate
      )
    );


    empty.hidden = true;
    content.hidden = false;


    const data =
      dailyData[
        selectedCalendarDate
      ] || {
        trades: [],
        pnl: 0
      };


    const pnlElement =
      document.getElementById(
        "selectedDayPnl"
      );

    if (pnlElement) {

      pnlElement.textContent =
        formatMoney(data.pnl);

      pnlElement.className =
        getPnlClass(data.pnl);

    }


    setElementText(
      "selectedDayTradeCount",
      data.trades.length
    );


    const tradesContainer =
      document.getElementById(
        "selectedDayTrades"
      );


    if (!tradesContainer) {
      return;
    }


    if (!data.trades.length) {

      tradesContainer.innerHTML = `
        <div
          class="calendar-no-day-trades"
        >
          <strong>
            No trades
          </strong>

          <p>
            You haven't logged a trade on this day.
          </p>
        </div>
      `;

      return;

    }


    tradesContainer.innerHTML =
      data.trades
        .map(trade => {

          const directionClass =
            trade.direction === "Short"
              ? "short"
              : "long";

          return `
            <button
              class="calendar-trade-item"
              type="button"
              data-trade-id="${trade.id}"
            >

              <div
                class="calendar-trade-main"
              >

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
                  class="${getPnlClass(
                    trade.pnl
                  )}"
                >
                  ${formatMoney(
                    trade.pnl
                  )}
                </strong>

              </div>

              <div
                class="calendar-trade-meta"
              >

                <span>
                  ${escapeHtml(
                    trade.strategy ||
                    "No strategy"
                  )}
                </span>

                <span>
                  ${
                    trade.risk_reward !== null &&
                    trade.risk_reward !== undefined
                      ? `${safeNumber(
                          trade.risk_reward
                        ).toFixed(2)}R`
                      : "—"
                  }
                </span>

              </div>

            </button>
          `;

        })
        .join("");


    tradesContainer
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


  const previousMonthButton =
    document.getElementById(
      "previousMonthButton"
    );

  if (previousMonthButton) {

    previousMonthButton.addEventListener(
      "click",
      () => {

        calendarMonth--;

        if (calendarMonth < 0) {

          calendarMonth = 11;
          calendarYear--;

        }

        selectedCalendarDate = null;

        renderCalendar();

      }
    );

  }


  const nextMonthButton =
    document.getElementById(
      "nextMonthButton"
    );

  if (nextMonthButton) {

    nextMonthButton.addEventListener(
      "click",
      () => {

        calendarMonth++;

        if (calendarMonth > 11) {

          calendarMonth = 0;
          calendarYear++;

        }

        selectedCalendarDate = null;

        renderCalendar();

      }
    );

  }


  const calendarTodayButton =
    document.getElementById(
      "calendarTodayButton"
    );

  if (calendarTodayButton) {

    calendarTodayButton.addEventListener(
      "click",
      () => {

        const today =
          new Date();

        calendarYear =
          today.getFullYear();

        calendarMonth =
          today.getMonth();

        selectedCalendarDate =
          getTodayDate();

        renderCalendar();

      }
    );

  }


  /* =========================================================
     TRADE MODAL
     ========================================================= */

  const tradeModal =
    document.getElementById(
      "tradeModal"
    );

  const tradeForm =
    document.getElementById(
      "tradeForm"
    );


  function openTradeModal(
    trade = null,
    preferredDate = null
  ) {

    if (
      !tradeModal ||
      !tradeForm
    ) {
      return;
    }


    clearTradeMessage();

    tradeForm.reset();


    editingTradeId =
      trade?.id || null;


    const hiddenId =
      document.getElementById(
        "editingTradeId"
      );

    if (hiddenId) {

      hiddenId.value =
        editingTradeId || "";

    }


    setElementText(
      "tradeModalTitle",
      trade
        ? "Edit trade"
        : "Add trade"
    );


    const market =
      document.getElementById(
        "market"
      );

    const direction =
      document.getElementById(
        "direction"
      );

    const entry =
      document.getElementById(
        "entry"
      );

    const exit =
      document.getElementById(
        "exit"
      );

    const stopLoss =
      document.getElementById(
        "stopLoss"
      );

    const takeProfit =
      document.getElementById(
        "takeProfit"
      );

    const riskAmount =
      document.getElementById(
        "riskAmount"
      );

    const riskReward =
      document.getElementById(
        "riskReward"
      );

    const pnl =
      document.getElementById(
        "pnl"
      );

    const strategy =
      document.getElementById(
        "strategy"
      );

    const tradeDate =
      document.getElementById(
        "tradeDate"
      );

    const notes =
      document.getElementById(
        "notes"
      );


    if (trade) {

      if (market) {
        market.value =
          trade.market || "";
      }

      if (direction) {
        direction.value =
          trade.direction || "Long";
      }

      if (entry) {
        entry.value =
          trade.entry_price ?? "";
      }

      if (exit) {
        exit.value =
          trade.exit_price ?? "";
      }

      if (stopLoss) {
        stopLoss.value =
          trade.stop_loss ?? "";
      }

      if (takeProfit) {
        takeProfit.value =
          trade.take_profit ?? "";
      }

      if (riskAmount) {
        riskAmount.value =
          trade.risk_amount ?? "";
      }

      if (riskReward) {
        riskReward.value =
          trade.risk_reward ?? "";
      }

      if (pnl) {
        pnl.value =
          trade.pnl ?? "";
      }

      if (strategy) {
        strategy.value =
          trade.strategy || "";
      }

      if (tradeDate) {
        tradeDate.value =
          trade.trade_date ||
          getTodayDate();
      }

      if (notes) {
        notes.value =
          trade.notes || "";
      }

    } else {

      if (direction) {

        direction.value =
          userProfile
            .default_direction ||
          "Long";

      }

      if (tradeDate) {

        tradeDate.value =
          preferredDate ||
          getTodayDate();

      }

    }


    tradeModal.classList.add(
      "active"
    );

    document.body.classList.add(
      "modal-open"
    );

  }


  function closeTradeModal() {

    if (!tradeModal) {
      return;
    }

    tradeModal.classList.remove(
      "active"
    );

    document.body.classList.remove(
      "modal-open"
    );

    editingTradeId = null;

    clearTradeMessage();

  }


  document
    .querySelectorAll(
      ".open-trade-modal"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          let preferredDate = null;

          if (
            button.id ===
            "calendarAddTradeButton"
          ) {

            preferredDate =
              selectedCalendarDate ||
              getTodayDate();

          }

          openTradeModal(
            null,
            preferredDate
          );

        }
      );

    });


  const addTradeSelectedDayButton =
    document.getElementById(
      "addTradeSelectedDayButton"
    );

  if (addTradeSelectedDayButton) {

    addTradeSelectedDayButton
      .addEventListener(
        "click",
        () => {

          openTradeModal(
            null,
            selectedCalendarDate ||
            getTodayDate()
          );

        }
      );

  }


  const closeModalButton =
    document.getElementById(
      "closeModal"
    );

  if (closeModalButton) {

    closeModalButton.addEventListener(
      "click",
      closeTradeModal
    );

  }


  const cancelTradeButton =
    document.getElementById(
      "cancelTrade"
    );

  if (cancelTradeButton) {

    cancelTradeButton.addEventListener(
      "click",
      closeTradeModal
    );

  }


  if (tradeModal) {

    tradeModal.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          tradeModal
        ) {
          closeTradeModal();
        }

      }
    );

  }


  /* =========================================================
     SAVE TRADE
     ========================================================= */

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
          document
            .getElementById(
              "market"
            )
            ?.value
            .trim();

        const direction =
          document.getElementById(
            "direction"
          )?.value;

        const pnlValue =
          document.getElementById(
            "pnl"
          )?.value;

        const tradeDate =
          document.getElementById(
            "tradeDate"
          )?.value;


        if (!market) {

          showTradeMessage(
            "Enter a market."
          );

          return;

        }


        if (
          !["Long", "Short"]
            .includes(direction)
        ) {

          showTradeMessage(
            "Choose a valid direction."
          );

          return;

        }


        if (
          pnlValue === "" ||
          !Number.isFinite(
            Number(pnlValue)
          )
        ) {

          showTradeMessage(
            "Enter a valid P&L."
          );

          return;

        }


        if (!tradeDate) {

          showTradeMessage(
            "Choose a trade date."
          );

          return;

        }


        const payload = {

          user_id:
            currentUser.id,

          market,

          asset_name:
            market,

          direction,

          entry_price:
            nullableNumber(
              document.getElementById(
                "entry"
              )?.value
            ),

          exit_price:
            nullableNumber(
              document.getElementById(
                "exit"
              )?.value
            ),

          stop_loss:
            nullableNumber(
              document.getElementById(
                "stopLoss"
              )?.value
            ),

          take_profit:
            nullableNumber(
              document.getElementById(
                "takeProfit"
              )?.value
            ),

          risk_amount:
            nullableNumber(
              document.getElementById(
                "riskAmount"
              )?.value
            ),

          risk_reward:
            nullableNumber(
              document.getElementById(
                "riskReward"
              )?.value
            ),

          pnl:
            Number(pnlValue),

          strategy:
            document
              .getElementById(
                "strategy"
              )
              ?.value
              .trim() || null,

          notes:
            document
              .getElementById(
                "notes"
              )
              ?.value
              .trim() || null,

          trade_date:
            tradeDate

        };


        const saveButton =
          document.getElementById(
            "saveTradeButton"
          );


        if (saveButton) {

          saveButton.disabled = true;

          saveButton.textContent =
            editingTradeId
              ? "Updating..."
              : "Saving...";

        }


        let result;


        if (editingTradeId) {

          result =
            await supabaseClient
              .from("trades")
              .update(payload)
              .eq(
                "id",
                editingTradeId
              )
              .select()
              .single();

        } else {

          result =
            await supabaseClient
              .from("trades")
              .insert(payload)
              .select()
              .single();

        }


        if (result.error) {

          console.error(
            result.error
          );

          showTradeMessage(
            result.error.message ||
            "Could not save trade."
          );


          if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent =
              editingTradeId
                ? "Update trade"
                : "Save trade";

          }

          return;

        }


        const savedTrade =
          result.data;


        if (savedTrade) {

          const savedDate =
            parseDateString(
              savedTrade.trade_date
            );

          if (savedDate) {

            calendarYear =
              savedDate.getFullYear();

            calendarMonth =
              savedDate.getMonth();

            selectedCalendarDate =
              savedTrade.trade_date;

          }

        }


        closeTradeModal();

        await loadTrades();


        if (saveButton) {

          saveButton.disabled = false;

          saveButton.textContent =
            "Save trade";

        }

      }
    );

  }


  /* =========================================================
     TRADE DETAILS
     ========================================================= */

  const tradeDetailsModal =
    document.getElementById(
      "tradeDetailsModal"
    );


  function openTradeDetails(
    tradeId
  ) {

    const trade =
      getTradeById(tradeId);

    if (
      !trade ||
      !tradeDetailsModal
    ) {
      return;
    }


    selectedTradeId =
      trade.id;


    setElementText(
      "detailsMarket",
      trade.market || "Trade"
    );

    setElementText(
      "detailsDate",
      formatDate(
        trade.trade_date
      )
    );

    setElementText(
      "detailsDirection",
      trade.direction || "—"
    );

    setElementText(
      "detailsEntry",
      formatPrice(
        trade.entry_price
      )
    );

    setElementText(
      "detailsExit",
      formatPrice(
        trade.exit_price
      )
    );

    setElementText(
      "detailsStopLoss",
      formatPrice(
        trade.stop_loss
      )
    );

    setElementText(
      "detailsTakeProfit",
      formatPrice(
        trade.take_profit
      )
    );

    setElementText(
      "detailsRisk",
      trade.risk_amount === null ||
      trade.risk_amount === undefined
        ? "—"
        : formatMoney(
            trade.risk_amount
          )
    );

    setElementText(
      "detailsRR",
      trade.risk_reward === null ||
      trade.risk_reward === undefined
        ? "—"
        : `${safeNumber(
            trade.risk_reward
          ).toFixed(2)}R`
    );

    setElementText(
      "detailsStrategy",
      trade.strategy || "—"
    );


    const pnlElement =
      document.getElementById(
        "detailsPnl"
      );

    if (pnlElement) {

      pnlElement.textContent =
        formatMoney(trade.pnl);

      pnlElement.className =
        getPnlClass(
          trade.pnl
        );

    }


    setElementText(
      "detailsNotes",
      trade.notes ||
      "No notes for this trade."
    );


    tradeDetailsModal
      .classList
      .add("active");

    document.body.classList.add(
      "modal-open"
    );

  }


  function closeTradeDetails() {

    if (!tradeDetailsModal) {
      return;
    }

    tradeDetailsModal
      .classList
      .remove("active");

    document.body.classList.remove(
      "modal-open"
    );

  }


  const closeDetailsModal =
    document.getElementById(
      "closeDetailsModal"
    );

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


  const editTradeButton =
    document.getElementById(
      "editTradeButton"
    );

  if (editTradeButton) {

    editTradeButton.addEventListener(
      "click",
      () => {

        const trade =
          getTradeById(
            selectedTradeId
          );

        if (!trade) {
          return;
        }

        closeTradeDetails();

        openTradeModal(trade);

      }
    );

  }


  /* =========================================================
     DELETE TRADE
     ========================================================= */

  const deleteModal =
    document.getElementById(
      "deleteModal"
    );


  const deleteTradeButton =
    document.getElementById(
      "deleteTradeButton"
    );


  if (deleteTradeButton) {

    deleteTradeButton.addEventListener(
      "click",
      () => {

        if (!deleteModal) {
          return;
        }

        deleteModal.classList.add(
          "active"
        );

      }
    );

  }


  const cancelDeleteButton =
    document.getElementById(
      "cancelDeleteButton"
    );


  if (cancelDeleteButton) {

    cancelDeleteButton.addEventListener(
      "click",
      () => {

        deleteModal?.classList
          .remove("active");

      }
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

          deleteModal.classList.remove(
            "active"
          );

        }

      }
    );

  }


  const confirmDeleteButton =
    document.getElementById(
      "confirmDeleteButton"
    );


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

          console.error(
            error
          );

          confirmDeleteButton.disabled =
            false;

          confirmDeleteButton.textContent =
            "Delete trade";

          return;

        }


        selectedTradeId = null;

        deleteModal?.classList
          .remove("active");

        closeTradeDetails();

        await loadTrades();


        confirmDeleteButton.disabled =
          false;

        confirmDeleteButton.textContent =
          "Delete trade";

      }
    );

  }


  /* =========================================================
     CHART TABS
     ========================================================= */

  document
    .querySelectorAll(
      ".chart-tab"
    )
    .forEach(tab => {

      tab.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".chart-tab"
            )
            .forEach(item => {
              item.classList.remove(
                "active"
              );
            });

          tab.classList.add(
            "active"
          );

        }
      );

    });


  /* =========================================================
     LOGOUT
     ========================================================= */

  async function logout() {

    await supabaseClient.auth
      .signOut();

    window.location.href =
      "/app/login.html";

  }


  const logoutButton =
    document.getElementById(
      "logoutButton"
    );

  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      logout
    );

  }


  const settingsLogoutButton =
    document.getElementById(
      "settingsLogoutButton"
    );

  if (settingsLogoutButton) {

    settingsLogoutButton
      .addEventListener(
        "click",
        logout
      );

  }


  /* =========================================================
     ESCAPE KEY
     ========================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Escape") {
        return;
      }

      if (
        deleteModal?.classList
          .contains("active")
      ) {

        deleteModal.classList.remove(
          "active"
        );

        return;

      }

      if (
        tradeDetailsModal?.classList
          .contains("active")
      ) {

        closeTradeDetails();

        return;

      }

      if (
        tradeModal?.classList
          .contains("active")
      ) {

        closeTradeModal();

      }

    }
  );


  /* =========================================================
     AUTH STATE
     ========================================================= */

  supabaseClient.auth
    .onAuthStateChange(
      (event, session) => {

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
     START APP
     ========================================================= */

  async function startApp() {

    const {
      data,
      error
    } = await supabaseClient.auth
      .getSession();


    if (error) {

      console.error(
        "Could not get session:",
        error
      );

    }


    if (!data.session) {

      window.location.href =
        "/app/login.html";

      return;

    }


    currentUser =
      data.session.user;


    renderCurrentDate();

    renderUser();


    /*
      Load profile before trades so that
      currency preferences are already known
      when dashboard values are rendered.
    */

    await loadProfile();

    await loadTrades();

  }


  await startApp();

}
