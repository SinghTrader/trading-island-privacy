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

  let analyticsRange = "all";


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

    const parts = dateString.split("-");

    if (parts.length !== 3) {
      return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);

    const date = new Date(
      year,
      month,
      day
    );

    if (
      Number.isNaN(date.getTime())
    ) {
      return null;
    }

    return date;

  }


  function formatTradeDate(dateString) {

    const date =
      parseDateString(dateString);

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


  function formatCalendarDate(date) {

    if (!date) {
      return "";
    }

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;

  }


  function getTodayDateString() {

    return formatCalendarDate(
      new Date()
    );

  }


  function setElementText(
    id,
    value
  ) {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = value;
    }

  }


  function setMoneyClass(
    element,
    value
  ) {

    if (!element) {
      return;
    }

    element.classList.remove(
      "positive",
      "negative",
      "neutral"
    );

    const amount =
      safeNumber(value);

    if (amount > 0) {

      element.classList.add(
        "positive"
      );

    } else if (amount < 0) {

      element.classList.add(
        "negative"
      );

    } else {

      element.classList.add(
        "neutral"
      );

    }

  }


  function getTradeResult(
    trade
  ) {

    const pnl =
      safeNumber(trade.pnl);

    if (pnl > 0) {
      return "win";
    }

    if (pnl < 0) {
      return "loss";
    }

    return "breakeven";

  }


  function getTradeDirectionClass(
    direction
  ) {

    return direction === "Short"
      ? "short"
      : "long";

  }


  function getTradeResultClass(
    pnl
  ) {

    const amount =
      safeNumber(pnl);

    if (amount > 0) {
      return "positive";
    }

    if (amount < 0) {
      return "negative";
    }

    return "neutral";

  }


  function getTradeById(id) {

    return allTrades.find(
      trade => trade.id === id
    ) || null;

  }


  function sortTradesOldestFirst(
    trades
  ) {

    return [...trades].sort(
      (a, b) => {

        const dateA =
          parseDateString(
            a.trade_date
          );

        const dateB =
          parseDateString(
            b.trade_date
          );

        const timeA =
          dateA
            ? dateA.getTime()
            : 0;

        const timeB =
          dateB
            ? dateB.getTime()
            : 0;

        if (timeA !== timeB) {
          return timeA - timeB;
        }

        return String(
          a.created_at || ""
        ).localeCompare(
          String(
            b.created_at || ""
          )
        );

      }
    );

  }


  function sortTradesNewestFirst(
    trades
  ) {

    return [...trades].sort(
      (a, b) => {

        const dateA =
          parseDateString(
            a.trade_date
          );

        const dateB =
          parseDateString(
            b.trade_date
          );

        const timeA =
          dateA
            ? dateA.getTime()
            : 0;

        const timeB =
          dateB
            ? dateB.getTime()
            : 0;

        if (timeA !== timeB) {
          return timeB - timeA;
        }

        return String(
          b.created_at || ""
        ).localeCompare(
          String(
            a.created_at || ""
          )
        );

      }
    );

  }


  /* =========================================================
     THEME
     ========================================================= */

  function getSystemTheme() {

    if (
      window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches
    ) {
      return "light";
    }

    return "dark";

  }


  function getResolvedTheme() {

    if (
      userProfile.theme ===
      "system"
    ) {
      return getSystemTheme();
    }

    return (
      userProfile.theme ||
      "dark"
    );

  }


  function applyTheme() {

    const resolvedTheme =
      getResolvedTheme();

    document.documentElement
      .setAttribute(
        "data-theme",
        resolvedTheme
      );

  }


  if (window.matchMedia) {

    const systemThemeQuery =
      window.matchMedia(
        "(prefers-color-scheme: light)"
      );

    systemThemeQuery.addEventListener(
      "change",
      () => {

        if (
          userProfile.theme ===
          "system"
        ) {
          applyTheme();
        }

      }
    );

  }


  /* =========================================================
     DATE / USER HEADER
     ========================================================= */

  function renderCurrentDate() {

    const dateButton =
      document.getElementById(
        "dateButton"
      );

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
      return userProfile
        .display_name
        .trim();
    }

    const metadataName =
      currentUser
        ?.user_metadata
        ?.name;

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

    const displayName =
      getDisplayName();

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

    if (
      !availablePages.includes(page)
    ) {

      console.log(
        `${page} will be built next.`
      );

      return;

    }


    document
      .querySelectorAll(
        ".app-view"
      )
      .forEach(view => {

        view.classList.remove(
          "active"
        );

      });


    document
      .querySelectorAll(
        ".nav-item"
      )
      .forEach(item => {

        item.classList.remove(
          "active"
        );

      });


    const targetView =
      document.getElementById(
        `${page}View`
      );


    if (targetView) {

      targetView.classList.add(
        "active"
      );

    }


    const navButton =
      document.querySelector(
        `.nav-item[data-page="${page}"]`
      );


    if (navButton) {

      navButton.classList.add(
        "active"
      );

    }


    if (page === "dashboard") {
      renderDashboard();
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
    .querySelectorAll(
      ".nav-item"
    )
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

    openJournalButton
      .addEventListener(
        "click",
        () => showView(
          "journal"
        )
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
      .eq(
        "user_id",
        currentUser.id
      )
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
        currentUser
          .user_metadata
          ?.name ||
        currentUser
          .email
          ?.split("@")[0] ||
        "Trader";


      const newProfile = {

        user_id:
          currentUser.id,

        display_name:
          defaultName,

        currency:
          "EUR",

        account_balance:
          10000,

        default_risk_percent:
          1,

        default_direction:
          "Long",

        theme:
          "dark"

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


    const displayNameInput =
      document.getElementById(
        "settingsDisplayName"
      );


    const displayName =
      displayNameInput
        ?.value
        ?.trim() || "Trader";


    const {
      error
    } = await supabaseClient
      .from("profiles")
      .update({
        display_name:
          displayName,
        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        "user_id",
        currentUser.id
      );


    if (error) {

      console.error(
        "Could not save profile:",
        error
      );

      return false;

    }


    userProfile.display_name =
      displayName;

    renderUser();

    return true;

  }


  async function saveTradingSettings() {

    if (!currentUser) {
      return false;
    }


    const currency =
      document.getElementById(
        "settingsCurrency"
      )?.value || "EUR";


    const accountBalance =
      Math.max(
        0,
        safeNumber(
          document.getElementById(
            "settingsAccountBalance"
          )?.value
        )
      );


    const riskPercent =
      Math.max(
        0,
        safeNumber(
          document.getElementById(
            "settingsRiskPercent"
          )?.value
        )
      );


    const defaultDirection =
      document.getElementById(
        "settingsDefaultDirection"
      )?.value === "Short"
        ? "Short"
        : "Long";


    const {
      error
    } = await supabaseClient
      .from("profiles")
      .update({

        currency,

        account_balance:
          accountBalance,

        default_risk_percent:
          riskPercent,

        default_direction:
          defaultDirection,

        updated_at:
          new Date()
            .toISOString()

      })
      .eq(
        "user_id",
        currentUser.id
      );


    if (error) {

      console.error(
        "Could not save trading settings:",
        error
      );

      return false;

    }


    userProfile.currency =
      currency;

    userProfile.account_balance =
      accountBalance;

    userProfile.default_risk_percent =
      riskPercent;

    userProfile.default_direction =
      defaultDirection;


    renderSettings();
    renderEverything();

    return true;

  }


  async function saveAppearanceSettings() {

    if (!currentUser) {
      return false;
    }


    const selectedTheme =
      document.querySelector(
        'input[name="theme"]:checked'
      )?.value || "dark";


    const allowedThemes = [
      "dark",
      "light",
      "system"
    ];


    const theme =
      allowedThemes.includes(
        selectedTheme
      )
        ? selectedTheme
        : "dark";


    const {
      error
    } = await supabaseClient
      .from("profiles")
      .update({
        theme,
        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        "user_id",
        currentUser.id
      );


    if (error) {

      console.error(
        "Could not save appearance:",
        error
      );

      return false;

    }


    userProfile.theme =
      theme;

    applyTheme();

    return true;

  }


  /* =========================================================
     SETTINGS HELPERS
     ========================================================= */

  function showSettingsMessage(
    id,
    message,
    type = "success"
  ) {

    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent =
      message;

    element.classList.remove(
      "success",
      "error"
    );

    element.classList.add(type);

  }


  function clearSettingsMessage(
    id
  ) {

    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent = "";

    element.classList.remove(
      "success",
      "error"
    );

  }


  function renderRiskPreview() {

    const preview =
      document.getElementById(
        "settingsRiskPreview"
      );


    const balanceInput =
      document.getElementById(
        "settingsAccountBalance"
      );


    const riskInput =
      document.getElementById(
        "settingsRiskPercent"
      );


    if (
      !preview ||
      !balanceInput ||
      !riskInput
    ) {
      return;
    }


    const balance =
      Math.max(
        0,
        safeNumber(
          balanceInput.value
        )
      );


    const risk =
      Math.max(
        0,
        safeNumber(
          riskInput.value
        )
      );


    const amount =
      balance *
      (
        risk / 100
      );


    preview.textContent =
      formatMoney(amount);

  }


  function renderSettings() {

    const displayName =
      getDisplayName();


    const displayNameInput =
      document.getElementById(
        "settingsDisplayName"
      );


    if (displayNameInput) {

      displayNameInput.value =
        displayName;

    }


    const currencyInput =
      document.getElementById(
        "settingsCurrency"
      );


    if (currencyInput) {

      currencyInput.value =
        getCurrency();

    }


    const balanceInput =
      document.getElementById(
        "settingsAccountBalance"
      );


    if (balanceInput) {

      balanceInput.value =
        safeNumber(
          userProfile
            .account_balance
        );

    }


    const riskInput =
      document.getElementById(
        "settingsRiskPercent"
      );


    if (riskInput) {

      riskInput.value =
        safeNumber(
          userProfile
            .default_risk_percent
        );

    }


    const directionInput =
      document.getElementById(
        "settingsDefaultDirection"
      );


    if (directionInput) {

      directionInput.value =
        userProfile
          .default_direction ||
        "Long";

    }


    setElementText(
      "settingsCurrencySymbol",
      getCurrencySymbol()
    );


    document
      .querySelectorAll(
        'input[name="theme"]'
      )
      .forEach(input => {

        input.checked =
          input.value ===
          (
            userProfile.theme ||
            "dark"
          );

      });


    renderRiskPreview();

  }


  /* =========================================================
     SETTINGS NAVIGATION
     ========================================================= */

  document
    .querySelectorAll(
      ".settings-nav-item"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const section =
            button.dataset
              .settingsSection;


          document
            .querySelectorAll(
              ".settings-nav-item"
            )
            .forEach(item => {

              item.classList.remove(
                "active"
              );

            });


          button.classList.add(
            "active"
          );


          document
            .querySelectorAll(
              ".settings-section"
            )
            .forEach(element => {

              element.classList.remove(
                "active"
              );

            });


          const target =
            document.getElementById(
              `${section}SettingsSection`
            );


          if (target) {

            target.classList.add(
              "active"
            );

          }

        }
      );

    });


  const balanceSettingsInput =
    document.getElementById(
      "settingsAccountBalance"
    );


  const riskSettingsInput =
    document.getElementById(
      "settingsRiskPercent"
    );


  if (balanceSettingsInput) {

    balanceSettingsInput
      .addEventListener(
        "input",
        renderRiskPreview
      );

  }


  if (riskSettingsInput) {

    riskSettingsInput
      .addEventListener(
        "input",
        renderRiskPreview
      );

  }


  const currencySettingsInput =
    document.getElementById(
      "settingsCurrency"
    );


  if (currencySettingsInput) {

    currencySettingsInput
      .addEventListener(
        "change",
        () => {

          const symbol =
            currencySettingsInput
              .value === "USD"
              ? "$"
              : currencySettingsInput
                  .value === "GBP"
                ? "£"
                : "€";


          setElementText(
            "settingsCurrencySymbol",
            symbol
          );

        }
      );

  }


  const profileSettingsForm =
    document.getElementById(
      "profileSettingsForm"
    );


  if (profileSettingsForm) {

    profileSettingsForm
      .addEventListener(
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


          if (button) {

            button.disabled = true;
            button.textContent =
              "Saving...";

          }


          const success =
            await saveProfileChanges();


          if (success) {

            showSettingsMessage(
              "profileSettingsMessage",
              "Profile saved successfully.",
              "success"
            );

          } else {

            showSettingsMessage(
              "profileSettingsMessage",
              "Could not save your profile.",
              "error"
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


  const tradingSettingsForm =
    document.getElementById(
      "tradingSettingsForm"
    );


  if (tradingSettingsForm) {

    tradingSettingsForm
      .addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          clearSettingsMessage(
            "tradingSettingsMessage"
          );


          const button =
            document.getElementById(
              "saveTradingSettingsButton"
            );


          if (button) {

            button.disabled = true;
            button.textContent =
              "Saving...";

          }


          const success =
            await saveTradingSettings();


          if (success) {

            showSettingsMessage(
              "tradingSettingsMessage",
              "Trading preferences saved.",
              "success"
            );

          } else {

            showSettingsMessage(
              "tradingSettingsMessage",
              "Could not save trading preferences.",
              "error"
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


  const appearanceSettingsForm =
    document.getElementById(
      "appearanceSettingsForm"
    );


  if (appearanceSettingsForm) {

    appearanceSettingsForm
      .addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          clearSettingsMessage(
            "appearanceSettingsMessage"
          );


          const button =
            document.getElementById(
              "saveAppearanceSettingsButton"
            );


          if (button) {

            button.disabled = true;
            button.textContent =
              "Saving...";

          }


          const success =
            await saveAppearanceSettings();


          if (success) {

            showSettingsMessage(
              "appearanceSettingsMessage",
              "Appearance saved.",
              "success"
            );

          } else {

            showSettingsMessage(
              "appearanceSettingsMessage",
              "Could not save appearance.",
              "error"
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
