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

  // Analytics
  let analyticsRange = "30";


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


  function formatSignedMoney(value) {

    const amount = safeNumber(value);

    if (amount > 0) {
      return `+${formatMoney(amount)}`;
    }

    return formatMoney(amount);

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


  function formatPercent(value) {

    const number = safeNumber(value);

    return `${number.toFixed(1)}%`;

  }


  function parseDateString(dateString) {

    if (!dateString) {
      return null;
    }

    const parts = String(dateString)
      .split("-");

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

    if (Number.isNaN(date.getTime())) {
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


  function setElementText(id, value) {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = value;
    }

  }


  function setElementHtml(id, value) {

    const element =
      document.getElementById(id);

    if (element) {
      element.innerHTML = value;
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


  function getTradeResult(trade) {

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


  function getTradeResultClass(pnl) {

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
     CURRENT DATE + USER
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
        () => {

          showView(
            "journal"
          );

        }
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

    renderEverything();

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
     SETTINGS MESSAGES
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


    element.classList.add(
      type
    );

  }


  function clearSettingsMessage(id) {

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
          userProfile.account_balance
        );

    }


    const riskInput =
      document.getElementById(
        "settingsRiskPercent"
      );


    if (riskInput) {

      riskInput.value =
        safeNumber(
          userProfile.default_risk_percent
        );

    }


    const directionInput =
      document.getElementById(
        "settingsDefaultDirection"
      );


    if (directionInput) {

      directionInput.value =
        userProfile.default_direction ||
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


  /* =========================================================
     PROFILE SETTINGS FORM
     ========================================================= */

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


  /* =========================================================
     TRADING SETTINGS FORM
     ========================================================= */

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


  /* =========================================================
     APPEARANCE SETTINGS FORM
     ========================================================= */

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


  /* =========================================================
     PASSWORD SETTINGS
     ========================================================= */

  const passwordSettingsForm =
    document.getElementById(
      "passwordSettingsForm"
    );


  if (passwordSettingsForm) {

    passwordSettingsForm
      .addEventListener(
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


          if (
            password !==
            confirmation
          ) {

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
          } = await supabaseClient
            .auth
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

            passwordSettingsForm
              .reset();


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


    allTrades =
      data || [];


    filteredTrades =
      [...allTrades];


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
          safeNumber(
            trade.pnl
          ) > 0
      );


    const losers =
      allTrades.filter(
        trade =>
          safeNumber(
            trade.pnl
          ) < 0
      );


    const totalPnl =
      allTrades.reduce(
        (sum, trade) =>
          sum +
          safeNumber(
            trade.pnl
          ),
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
          sum +
          safeNumber(
            trade.pnl
          ),
        0
      );


    const grossLoss =
      Math.abs(
        losers.reduce(
          (sum, trade) =>
            sum +
            safeNumber(
              trade.pnl
            ),
          0
        )
      );


    let profitFactor =
      "0.00";


    if (
      grossLoss === 0 &&
      grossProfit > 0
    ) {

      profitFactor = "∞";

    } else if (
      grossLoss > 0
    ) {

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
              safeNumber(
                trade.pnl
              ),
            0
          ) /
          losers.length
        : 0;


    const bestTrade =
      totalTrades
        ? Math.max(
            ...allTrades.map(
              trade =>
                safeNumber(
                  trade.pnl
                )
            )
          )
        : 0;


    const worstTrade =
      totalTrades
        ? Math.min(
            ...allTrades.map(
              trade =>
                safeNumber(
                  trade.pnl
                )
            )
          )
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


    const averageRR =
      rrTrades.length
        ? rrTrades.reduce(
            (sum, trade) =>
              sum +
              safeNumber(
                trade.risk_reward
              ),
            0
          ) /
          rrTrades.length
        : null;


    /* -------------------------
       Main dashboard stats
       ------------------------- */

    const totalPnlElement =
      document.getElementById(
        "totalPnl"
      );


    if (totalPnlElement) {

      totalPnlElement.textContent =
        formatSignedMoney(
          totalPnl
        );


      setMoneyClass(
        totalPnlElement,
        totalPnl
      );

    }


    setElementText(
      "winRate",
      `${winRate.toFixed(1)}%`
    );


    setElementText(
      "profitFactor",
      profitFactor
    );


    setElementText(
      "totalTrades",
      String(totalTrades)
    );


    /* -------------------------
       Performance stats
       ------------------------- */

    const averageWinElement =
      document.getElementById(
        "averageWin"
      );


    if (averageWinElement) {

      averageWinElement.textContent =
        formatMoney(
          averageWin
        );


      setMoneyClass(
        averageWinElement,
        averageWin
      );

    }


    const averageLossElement =
      document.getElementById(
        "averageLoss"
      );


    if (averageLossElement) {

      averageLossElement.textContent =
        formatMoney(
          averageLoss
        );


      setMoneyClass(
        averageLossElement,
        averageLoss
      );

    }


    const bestTradeElement =
      document.getElementById(
        "bestTrade"
      );


    if (bestTradeElement) {

      bestTradeElement.textContent =
        formatMoney(
          bestTrade
        );


      setMoneyClass(
        bestTradeElement,
        bestTrade
      );

    }


    const worstTradeElement =
      document.getElementById(
        "worstTrade"
      );


    if (worstTradeElement) {

      worstTradeElement.textContent =
        formatMoney(
          worstTrade
        );


      setMoneyClass(
        worstTradeElement,
        worstTrade
      );

    }


    setElementText(
      "averageRR",
      averageRR === null
        ? "—"
        : `${averageRR.toFixed(2)}R`
    );


    renderDashboardRecentTrades();

  }


  /* =========================================================
     DASHBOARD RECENT TRADES
     ========================================================= */

  function renderDashboardRecentTrades() {

    const container =
      document.getElementById(
        "recentTrades"
      ) ||
      document.getElementById(
        "recentTradesList"
      );


    if (!container) {
      return;
    }


    const trades =
      sortTradesNewestFirst(
        allTrades
      ).slice(0, 5);


    if (!trades.length) {

      container.innerHTML = `
        <div class="empty-state">
          <p>No trades yet.</p>
          <span>
            Add your first trade to start tracking your performance.
          </span>
        </div>
      `;

      return;

    }


    container.innerHTML =
      trades.map(
        trade => {

          const pnl =
            safeNumber(
              trade.pnl
            );


          const asset =
            trade.asset_name ||
            trade.market ||
            "Trade";


          return `
            <button
              class="recent-trade-row"
              type="button"
              data-trade-id="${escapeHtml(
                trade.id
              )}"
            >

              <div class="recent-trade-main">

                <strong>
                  ${escapeHtml(asset)}
                </strong>

                <span>
                  ${escapeHtml(
                    trade.market || "—"
                  )}
                  ·
                  ${escapeHtml(
                    trade.direction || "—"
                  )}
                </span>

              </div>

              <div class="recent-trade-meta">

                <span>
                  ${escapeHtml(
                    formatTradeDate(
                      trade.trade_date
                    )
                  )}
                </span>

                <strong class="${getTradeResultClass(
                  pnl
                )}">
                  ${escapeHtml(
                    formatSignedMoney(
                      pnl
                    )
                  )}
                </strong>

              </div>

            </button>
          `;

        }
      ).join("");


    container
      .querySelectorAll(
        "[data-trade-id]"
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


  /* =========================================================
     JOURNAL FILTER HELPERS
     ========================================================= */

  function getJournalSearchValue() {

    const searchInput =
      document.getElementById(
        "journalSearch"
      ) ||
      document.getElementById(
        "tradeSearch"
      );


    return (
      searchInput
        ?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  }


  function getJournalMarketValue() {

    const input =
      document.getElementById(
        "journalMarketFilter"
      ) ||
      document.getElementById(
        "marketFilter"
      );


    return (
      input?.value ||
      "all"
    );

  }


  function getJournalDirectionValue() {

    const input =
      document.getElementById(
        "journalDirectionFilter"
      ) ||
      document.getElementById(
        "directionFilter"
      );


    return (
      input?.value ||
      "all"
    );

  }


  function getJournalResultValue() {

    const input =
      document.getElementById(
        "journalResultFilter"
      ) ||
      document.getElementById(
        "resultFilter"
      );


    return (
      input?.value ||
      "all"
    );

  }


  function applyJournalFilters() {

    const search =
      getJournalSearchValue();


    const market =
      getJournalMarketValue();


    const direction =
      getJournalDirectionValue();


    const result =
      getJournalResultValue();


    filteredTrades =
      allTrades.filter(
        trade => {

          const searchable =
            [
              trade.asset_name,
              trade.market,
              trade.direction,
              trade.strategy,
              trade.notes
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


          if (
            search &&
            !searchable.includes(
              search
            )
          ) {

            return false;

          }


          if (
            market !== "all" &&
            market !== "" &&
            trade.market !== market
          ) {

            return false;

          }


          if (
            direction !== "all" &&
            direction !== "" &&
            trade.direction !==
              direction
          ) {

            return false;

          }


          if (
            result !== "all" &&
            result !== ""
          ) {

            const tradeResult =
              getTradeResult(
                trade
              );


            if (
              tradeResult !== result
            ) {

              return false;

            }

          }


          return true;

        }
      );


    renderJournalTable();

  }


  /* =========================================================
     JOURNAL
     ========================================================= */

  function renderJournal() {

    const totalTrades =
      allTrades.length;


    const totalPnl =
      allTrades.reduce(
        (sum, trade) =>
          sum +
          safeNumber(
            trade.pnl
          ),
        0
      );


    const winners =
      allTrades.filter(
        trade =>
          safeNumber(
            trade.pnl
          ) > 0
      );


    const winRate =
      totalTrades > 0
        ? (
            winners.length /
            totalTrades
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


    const averageRR =
      rrTrades.length
        ? rrTrades.reduce(
            (sum, trade) =>
              sum +
              safeNumber(
                trade.risk_reward
              ),
            0
          ) /
          rrTrades.length
        : null;


    setElementText(
      "journalTotalTrades",
      String(totalTrades)
    );


    const pnlElement =
      document.getElementById(
        "journalTotalPnl"
      );


    if (pnlElement) {

      pnlElement.textContent =
        formatSignedMoney(
          totalPnl
        );


      setMoneyClass(
        pnlElement,
        totalPnl
      );

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


    populateJournalMarketFilter();


    applyJournalFilters();

  }


  /* =========================================================
     JOURNAL MARKET FILTER
     ========================================================= */

  function populateJournalMarketFilter() {

    const select =
      document.getElementById(
        "journalMarketFilter"
      ) ||
      document.getElementById(
        "marketFilter"
      );


    if (!select) {
      return;
    }


    const previousValue =
      select.value;


    const markets =
      [
        ...new Set(
          allTrades
            .map(
              trade =>
                trade.market
            )
            .filter(Boolean)
        )
      ].sort();


    const firstOption =
      select.querySelector(
        'option[value="all"]'
      )
        ? `<option value="all">All markets</option>`
        : `<option value="">All markets</option>`;


    select.innerHTML =
      firstOption +
      markets.map(
        market => `
          <option value="${escapeHtml(
            market
          )}">
            ${escapeHtml(
              market
            )}
          </option>
        `
      ).join("");


    if (
      [
        "all",
        "",
        ...markets
      ].includes(
        previousValue
      )
    ) {

      select.value =
        previousValue;

    }

  }


  /* =========================================================
     JOURNAL TABLE
     ========================================================= */

  function renderJournalTable() {

    const body =
      document.getElementById(
        "journalTableBody"
      ) ||
      document.getElementById(
        "tradesTableBody"
      );


    if (!body) {
      return;
    }


    const trades =
      sortTradesNewestFirst(
        filteredTrades
      );


    if (!trades.length) {

      body.innerHTML = `
        <tr>
          <td
            colspan="10"
            class="journal-empty-cell"
          >
            <div class="empty-state">
              <p>No trades found.</p>
              <span>
                Add a trade or change your filters.
              </span>
            </div>
          </td>
        </tr>
      `;

      return;

    }


    body.innerHTML =
      trades.map(
        trade => {

          const pnl =
            safeNumber(
              trade.pnl
            );


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
              data-trade-id="${escapeHtml(
                trade.id
              )}"
            >

              <td>
                ${escapeHtml(
                  formatTradeDate(
                    trade.trade_date
                  )
                )}
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    trade.asset_name ||
                    "—"
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  trade.market ||
                  "—"
                )}
              </td>

              <td>
                <span class="direction-badge ${getTradeDirectionClass(
                  trade.direction
                )}">
                  ${escapeHtml(
                    trade.direction ||
                    "—"
                  )}
                </span>
              </td>

              <td>
                ${escapeHtml(
                  formatPrice(
                    trade.entry_price
                  )
                )}
              </td>

              <td>
                ${escapeHtml(
                  formatPrice(
                    trade.exit_price
                  )
                )}
              </td>

              <td>
                ${escapeHtml(rr)}
              </td>

              <td>
                ${escapeHtml(
                  trade.strategy ||
                  "—"
                )}
              </td>

              <td>
                <strong class="${getTradeResultClass(
                  pnl
                )}">
                  ${escapeHtml(
                    formatSignedMoney(
                      pnl
                    )
                  )}
                </strong>
              </td>

              <td>
                <button
                  class="table-action-button"
                  type="button"
                  data-open-trade="${escapeHtml(
                    trade.id
                  )}"
                >
                  View
                </button>
              </td>

            </tr>
          `;

        }
      ).join("");


    body
      .querySelectorAll(
        "[data-open-trade]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();


            openTradeDetails(
              button.dataset.openTrade
            );

          }
        );

      });


    body
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

  }


  /* =========================================================
     JOURNAL FILTER EVENTS
     ========================================================= */

  [
    "journalSearch",
    "tradeSearch"
  ].forEach(id => {

    const element =
      document.getElementById(id);


    if (element) {

      element.addEventListener(
        "input",
        applyJournalFilters
      );

    }

  });


  [
    "journalMarketFilter",
    "marketFilter",
    "journalDirectionFilter",
    "directionFilter",
    "journalResultFilter",
    "resultFilter"
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


  /* =========================================================
     CALENDAR HELPERS
     ========================================================= */

  function getTradesForDate(
    dateString
  ) {

    return allTrades.filter(
      trade =>
        trade.trade_date ===
        dateString
    );

  }


  function getPnlForTrades(
    trades
  ) {

    return trades.reduce(
      (sum, trade) =>
        sum +
        safeNumber(
          trade.pnl
        ),
      0
    );

  }


  function getMonthTrades(
    year,
    month
  ) {

    return allTrades.filter(
      trade => {

        const date =
          parseDateString(
            trade.trade_date
          );


        return (
          date &&
          date.getFullYear() ===
            year &&
          date.getMonth() ===
            month
        );

      }
    );

  }


  /* =========================================================
     CALENDAR
     ========================================================= */

  function renderCalendar() {

    const title =
      document.getElementById(
        "calendarMonthTitle"
      );


    if (title) {

      const monthDate =
        new Date(
          calendarYear,
          calendarMonth,
          1
        );


      title.textContent =
        new Intl.DateTimeFormat(
          "en-US",
          {
            month: "long",
            year: "numeric"
          }
        ).format(
          monthDate
        );

    }


    renderCalendarSummary();

    renderCalendarGrid();

    renderCalendarSelectedDay();

  }


  function renderCalendarSummary() {

    const monthTrades =
      getMonthTrades(
        calendarYear,
        calendarMonth
      );


    const pnl =
      getPnlForTrades(
        monthTrades
      );


    const winners =
      monthTrades.filter(
        trade =>
          safeNumber(
            trade.pnl
          ) > 0
      );


    const winRate =
      monthTrades.length
        ? (
            winners.length /
            monthTrades.length
          ) * 100
        : 0;


    const pnlElement =
      document.getElementById(
        "calendarMonthPnl"
      );


    if (pnlElement) {

      pnlElement.textContent =
        formatSignedMoney(
          pnl
        );


      setMoneyClass(
        pnlElement,
        pnl
      );

    }


    setElementText(
      "calendarMonthTrades",
      String(
        monthTrades.length
      )
    );


    setElementText(
      "calendarMonthWinRate",
      `${winRate.toFixed(1)}%`
    );

  }


  function renderCalendarGrid() {

    const grid =
      document.getElementById(
        "calendarGrid"
      );


    if (!grid) {
      return;
    }


    const firstDay =
      new Date(
        calendarYear,
        calendarMonth,
        1
      );


    const lastDay =
      new Date(
        calendarYear,
        calendarMonth + 1,
        0
      );


    const daysInMonth =
      lastDay.getDate();


    /*
      Convert JS Sunday-first index
      into Monday-first calendar index.
    */

    const startOffset =
      (
        firstDay.getDay() +
        6
      ) % 7;


    const cells = [];


    for (
      let i = 0;
      i < startOffset;
      i += 1
    ) {

      cells.push(
        `<div class="calendar-day calendar-day-empty"></div>`
      );

    }


    for (
      let day = 1;
      day <= daysInMonth;
      day += 1
    ) {

      const date =
        new Date(
          calendarYear,
          calendarMonth,
          day
        );


      const dateString =
        formatCalendarDate(
          date
        );


      const trades =
        getTradesForDate(
          dateString
        );


      const pnl =
        getPnlForTrades(
          trades
        );


      const isToday =
        dateString ===
        getTodayDateString();


      const isSelected =
        dateString ===
        selectedCalendarDate;


      let pnlClass =
        "neutral";


      if (pnl > 0) {
        pnlClass = "positive";
      }


      if (pnl < 0) {
        pnlClass = "negative";
      }


      cells.push(`
        <button
          class="
            calendar-day
            ${isToday ? "today" : ""}
            ${isSelected ? "selected" : ""}
            ${trades.length ? "has-trades" : ""}
          "
          type="button"
          data-calendar-date="${dateString}"
        >

          <span class="calendar-day-number">
            ${day}
          </span>

          ${
            trades.length
              ? `
                <div class="calendar-day-performance">

                  <strong class="${pnlClass}">
                    ${escapeHtml(
                      formatSignedMoney(
                        pnl
                      )
                    )}
                  </strong>

                  <span>
                    ${trades.length}
                    ${trades.length === 1
                      ? "trade"
                      : "trades"}
                  </span>

                </div>
              `
              : ""
          }

        </button>
      `);

    }


    grid.innerHTML =
      cells.join("");


    grid
      .querySelectorAll(
        "[data-calendar-date]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            selectedCalendarDate =
              button.dataset
                .calendarDate;


            renderCalendar();

          }
        );

      });

  }


  function renderCalendarSelectedDay() {

    const panel =
      document.getElementById(
        "calendarDayDetails"
      ) ||
      document.getElementById(
        "selectedDayTrades"
      );


    if (!panel) {
      return;
    }


    if (!selectedCalendarDate) {

      panel.innerHTML = `
        <div class="empty-state">
          <p>Select a day</p>
          <span>
            Click a date to see the trades from that day.
          </span>
        </div>
      `;

      return;

    }


    const trades =
      sortTradesNewestFirst(
        getTradesForDate(
          selectedCalendarDate
        )
      );


    const date =
      parseDateString(
        selectedCalendarDate
      );


    const readableDate =
      date
        ? new Intl.DateTimeFormat(
            "en-GB",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric"
            }
          ).format(date)
        : selectedCalendarDate;


    if (!trades.length) {

      panel.innerHTML = `
        <div class="calendar-selected-header">
          <div>
            <span>Selected day</span>
            <strong>
              ${escapeHtml(
                readableDate
              )}
            </strong>
          </div>
        </div>

        <div class="empty-state">
          <p>No trades on this day.</p>
        </div>
      `;

      return;

    }


    const pnl =
      getPnlForTrades(
        trades
      );


    panel.innerHTML = `
      <div class="calendar-selected-header">

        <div>
          <span>Selected day</span>
          <strong>
            ${escapeHtml(
              readableDate
            )}
          </strong>
        </div>

        <strong class="${getTradeResultClass(
          pnl
        )}">
          ${escapeHtml(
            formatSignedMoney(
              pnl
            )
          )}
        </strong>

      </div>

      <div class="calendar-selected-trades">

        ${trades.map(
          trade => `
            <button
              type="button"
              class="calendar-selected-trade"
              data-calendar-trade="${escapeHtml(
                trade.id
              )}"
            >

              <div>
                <strong>
                  ${escapeHtml(
                    trade.asset_name ||
                    trade.market ||
                    "Trade"
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    trade.direction ||
                    "—"
                  )}
                  ·
                  ${escapeHtml(
                    trade.strategy ||
                    "No strategy"
                  )}
                </span>
              </div>

              <strong class="${getTradeResultClass(
                trade.pnl
              )}">
                ${escapeHtml(
                  formatSignedMoney(
                    trade.pnl
                  )
                )}
              </strong>

            </button>
          `
        ).join("")}

      </div>
    `;


    panel
      .querySelectorAll(
        "[data-calendar-trade]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            openTradeDetails(
              button.dataset
                .calendarTrade
            );

          }
        );

      });

  }


  /* =========================================================
     CALENDAR NAVIGATION
     ========================================================= */

  const previousMonthButton =
    document.getElementById(
      "previousMonthButton"
    ) ||
    document.getElementById(
      "calendarPrevButton"
    );


  if (previousMonthButton) {

    previousMonthButton
      .addEventListener(
        "click",
        () => {

          calendarMonth -= 1;


          if (calendarMonth < 0) {

            calendarMonth = 11;

            calendarYear -= 1;

          }


          selectedCalendarDate =
            null;


          renderCalendar();

        }
      );

  }


  const nextMonthButton =
    document.getElementById(
      "nextMonthButton"
    ) ||
    document.getElementById(
      "calendarNextButton"
    );


  if (nextMonthButton) {

    nextMonthButton
      .addEventListener(
        "click",
        () => {

          calendarMonth += 1;


          if (calendarMonth > 11) {

            calendarMonth = 0;

            calendarYear += 1;

          }


          selectedCalendarDate =
            null;


          renderCalendar();

        }
      );

  }


  const todayCalendarButton =
    document.getElementById(
      "calendarTodayButton"
    );


  if (todayCalendarButton) {

    todayCalendarButton
      .addEventListener(
        "click",
        () => {

          const today =
            new Date();


          calendarYear =
            today.getFullYear();


          calendarMonth =
            today.getMonth();


          selectedCalendarDate =
            formatCalendarDate(
              today
            );


          renderCalendar();

        }
      );

  }


  /* =========================================================
     ANALYTICS RANGE
     ========================================================= */

  function getAnalyticsTrades() {

    if (
      analyticsRange === "all"
    ) {

      return sortTradesOldestFirst(
        allTrades
      );

    }


    const days =
      Number(
        analyticsRange
      );


    if (
      !Number.isFinite(days) ||
      days <= 0
    ) {

      return sortTradesOldestFirst(
        allTrades
      );

    }


    const today =
      new Date();


    today.setHours(
      0,
      0,
      0,
      0
    );


    const startDate =
      new Date(today);


    /*
      30D means today + previous
      29 calendar days.
    */

    startDate.setDate(
      startDate.getDate() -
      (
        days - 1
      )
    );


    const trades =
      allTrades.filter(
        trade => {

          const date =
            parseDateString(
              trade.trade_date
            );


          if (!date) {
            return false;
          }


          date.setHours(
            0,
            0,
            0,
            0
          );


          return (
            date >= startDate &&
            date <= today
          );

        }
      );


    return sortTradesOldestFirst(
      trades
    );

  }


  function getAnalyticsPeriodLabel() {

    if (
      analyticsRange === "7"
    ) {
      return "Last 7 days";
    }


    if (
      analyticsRange === "30"
    ) {
      return "Last 30 days";
    }


    if (
      analyticsRange === "90"
    ) {
      return "Last 90 days";
    }


    return "All time";

  }


  function initializeAnalyticsRangeButtons() {

    const buttons =
      document.querySelectorAll(
        "[data-analytics-range]"
      );


    buttons.forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            analyticsRange =
              button.dataset
                .analyticsRange ||
              "30";


            buttons.forEach(
              item => {

                item.classList.remove(
                  "active"
                );

              }
            );


            button.classList.add(
              "active"
            );


            renderAnalytics();

          }
        );

      }
    );

  }


  initializeAnalyticsRangeButtons();


  /* =========================================================
     ANALYTICS CALCULATIONS
     ========================================================= */

  function calculateAnalytics(
    trades
  ) {

    const totalTrades =
      trades.length;


    const winners =
      trades.filter(
        trade =>
          safeNumber(
            trade.pnl
          ) > 0
      );


    const losers =
      trades.filter(
        trade =>
          safeNumber(
            trade.pnl
          ) < 0
      );


    const breakeven =
      trades.filter(
        trade =>
          safeNumber(
            trade.pnl
          ) === 0
      );


    const netPnl =
      trades.reduce(
        (sum, trade) =>
          sum +
          safeNumber(
            trade.pnl
          ),
        0
      );


    const grossProfit =
      winners.reduce(
        (sum, trade) =>
          sum +
          safeNumber(
            trade.pnl
          ),
        0
      );


    const grossLoss =
      Math.abs(
        losers.reduce(
          (sum, trade) =>
            sum +
            safeNumber(
              trade.pnl
            ),
          0
        )
      );


    const winRate =
      totalTrades
        ? (
            winners.length /
            totalTrades
          ) * 100
        : 0;


    let profitFactor = 0;


    if (
      grossLoss === 0 &&
      grossProfit > 0
    ) {

      profitFactor =
        Infinity;

    } else if (
      grossLoss > 0
    ) {

      profitFactor =
        grossProfit /
        grossLoss;

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
              safeNumber(
                trade.pnl
              ),
            0
          ) /
          losers.length
        : 0;


    const rrTrades =
      trades.filter(
        trade =>

          trade.risk_reward !== null &&

          trade.risk_reward !== undefined &&

          Number.isFinite(
            Number(
              trade.risk_reward
            )
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
          ) /
          rrTrades.length
        : null;


    const lossRate =
      totalTrades
        ? (
            losers.length /
            totalTrades
          )
        : 0;


    const winRateDecimal =
      totalTrades
        ? (
            winners.length /
            totalTrades
          )
        : 0;


    const expectancy =
      (
        winRateDecimal *
        averageWin
      ) +
      (
        lossRate *
        averageLoss
      );


    return {

      totalTrades,

      winners,

      losers,

      breakeven,

      netPnl,

      grossProfit,

      grossLoss,

      winRate,

      profitFactor,

      averageWin,

      averageLoss,

      averageRR,

      expectancy

    };

  }


  /* =========================================================
     ANALYTICS EQUITY / DRAWDOWN
     ========================================================= */

  function calculateEquityData(
    trades
  ) {

    let cumulative = 0;

    let peak = 0;

    let maxDrawdown = 0;

    let maxDrawdownPercent = 0;


    const startingBalance =
      Math.max(
        0,
        safeNumber(
          userProfile
            .account_balance
        )
      );


    const points = [];


    sortTradesOldestFirst(
      trades
    ).forEach(
      trade => {

        cumulative +=
          safeNumber(
            trade.pnl
          );


        const equity =
          startingBalance +
          cumulative;


        if (
          equity > peak ||
          points.length === 0
        ) {

          peak = equity;

        }


        const drawdown =
          peak - equity;


        if (
          drawdown >
          maxDrawdown
        ) {

          maxDrawdown =
            drawdown;


          maxDrawdownPercent =
            peak > 0
              ? (
                  drawdown /
                  peak
                ) * 100
              : 0;

        }


        points.push({

          trade,

          cumulative,

          equity

        });

      }
    );


    return {

      points,

      startingBalance,

      endingBalance:
        startingBalance +
        cumulative,

      maxDrawdown,

      maxDrawdownPercent

    };

  }


  /* =========================================================
     ANALYTICS STREAKS
     ========================================================= */

  function calculateStreaks(
    trades
  ) {

    let currentWinStreak = 0;

    let currentLossStreak = 0;

    let maxWinStreak = 0;

    let maxLossStreak = 0;


    sortTradesOldestFirst(
      trades
    ).forEach(
      trade => {

        const pnl =
          safeNumber(
            trade.pnl
          );


        if (pnl > 0) {

          currentWinStreak += 1;

          currentLossStreak = 0;


          maxWinStreak =
            Math.max(
              maxWinStreak,
              currentWinStreak
            );

        } else if (pnl < 0) {

          currentLossStreak += 1;

          currentWinStreak = 0;


          maxLossStreak =
            Math.max(
              maxLossStreak,
              currentLossStreak
            );

        } else {

          currentWinStreak = 0;

          currentLossStreak = 0;

        }

      }
    );


    return {

      maxWinStreak,

      maxLossStreak

    };

  }


  /* =========================================================
     ANALYTICS GROUPING
     ========================================================= */

  function groupTradesBy(
    trades,
    getKey
  ) {

    const groups =
      new Map();


    trades.forEach(
      trade => {

        const rawKey =
          getKey(trade);


        const key =
          rawKey &&
          String(rawKey).trim()
            ? String(
                rawKey
              ).trim()
            : "Unspecified";


        if (
          !groups.has(key)
        ) {

          groups.set(
            key,
            []
          );

        }


        groups.get(
          key
        ).push(
          trade
        );

      }
    );


    return groups;

  }


  function calculateGroupStats(
    trades
  ) {

    const totalPnl =
      trades.reduce(
        (sum, trade) =>
          sum +
          safeNumber(
            trade.pnl
          ),
        0
      );


    const wins =
      trades.filter(
        trade =>
          safeNumber(
            trade.pnl
          ) > 0
      ).length;


    const winRate =
      trades.length
        ? (
            wins /
            trades.length
          ) * 100
        : 0;


    return {

      trades:
        trades.length,

      totalPnl,

      winRate

    };

  }
  /* =========================================================
     ANALYTICS MAIN RENDER
     ========================================================= */

  function renderAnalytics() {

    const trades =
      getAnalyticsTrades();

    const analytics =
      calculateAnalytics(
        trades
      );

    const equityData =
      calculateEquityData(
        trades
      );

    const streaks =
      calculateStreaks(
        trades
      );


    renderAnalyticsRangeState();

    renderAnalyticsMetrics(
      analytics
    );

    renderAnalyticsEquityCurve(
      equityData
    );

    renderAnalyticsBestWorst(
      trades,
      equityData
    );

    renderAnalyticsStrategy(
      trades
    );

    renderAnalyticsMarket(
      trades
    );

    renderAnalyticsWeekdays(
      trades
    );

    renderAnalyticsDirection(
      trades
    );

    renderAnalyticsStreaks(
      streaks
    );

    renderAnalyticsPeriodInfo(
      trades,
      analytics
    );

  }


  /* =========================================================
     ANALYTICS RANGE STATE
     ========================================================= */

  function renderAnalyticsRangeState() {

    document
      .querySelectorAll(
        "[data-analytics-range]"
      )
      .forEach(
        button => {

          button.classList.toggle(
            "active",
            button.dataset
              .analyticsRange ===
              analyticsRange
          );

        }
      );

  }


  /* =========================================================
     ANALYTICS METRICS
     ========================================================= */

  function renderAnalyticsMetrics(
    analytics
  ) {

    const netPnlElement =
      document.getElementById(
        "analyticsNetPnl"
      );


    if (netPnlElement) {

      netPnlElement.textContent =
        formatSignedMoney(
          analytics.netPnl
        );


      setMoneyClass(
        netPnlElement,
        analytics.netPnl
      );

    }


    setElementText(
      "analyticsWinRate",
      `${analytics.winRate.toFixed(1)}%`
    );


    let profitFactorText =
      "0.00";


    if (
      analytics.profitFactor ===
      Infinity
    ) {

      profitFactorText =
        "∞";

    } else {

      profitFactorText =
        safeNumber(
          analytics.profitFactor
        ).toFixed(2);

    }


    setElementText(
      "analyticsProfitFactor",
      profitFactorText
    );


    setElementText(
      "analyticsAverageRR",
      analytics.averageRR === null
        ? "—"
        : `${analytics.averageRR.toFixed(2)}R`
    );


    const averageWinElement =
      document.getElementById(
        "analyticsAverageWin"
      );


    if (averageWinElement) {

      averageWinElement.textContent =
        formatMoney(
          analytics.averageWin
        );


      setMoneyClass(
        averageWinElement,
        analytics.averageWin
      );

    }


    const averageLossElement =
      document.getElementById(
        "analyticsAverageLoss"
      );


    if (averageLossElement) {

      averageLossElement.textContent =
        formatMoney(
          analytics.averageLoss
        );


      setMoneyClass(
        averageLossElement,
        analytics.averageLoss
      );

    }


    const expectancyElement =
      document.getElementById(
        "analyticsExpectancy"
      );


    if (expectancyElement) {

      expectancyElement.textContent =
        formatSignedMoney(
          analytics.expectancy
        );


      setMoneyClass(
        expectancyElement,
        analytics.expectancy
      );

    }

  }


  /* =========================================================
     ANALYTICS EQUITY CURVE
     ========================================================= */

  function renderAnalyticsEquityCurve(
    equityData
  ) {

    const container =
      document.getElementById(
        "analyticsEquityChart"
      );


    const emptyState =
      document.getElementById(
        "analyticsEquityEmpty"
      );


    setElementText(
      "analyticsEquityStart",
      formatMoney(
        equityData.startingBalance
      )
    );


    setElementText(
      "analyticsEquityEnd",
      formatMoney(
        equityData.endingBalance
      )
    );


    if (!container) {
      return;
    }


    const points =
      equityData.points;


    if (!points.length) {

      container.innerHTML = "";


      if (emptyState) {

        emptyState.style.display =
          "";

      }


      return;

    }


    if (emptyState) {

      emptyState.style.display =
        "none";

    }


    /*
      SVG is generated directly here so
      Analytics does not need Chart.js.
    */

    const width = 900;

    const height = 300;

    const paddingX = 26;

    const paddingY = 28;


    const values = [
      equityData.startingBalance,
      ...points.map(
        point =>
          point.equity
      )
    ];


    let minimum =
      Math.min(
        ...values
      );


    let maximum =
      Math.max(
        ...values
      );


    if (
      minimum === maximum
    ) {

      const extra =
        Math.max(
          Math.abs(
            minimum
          ) * 0.05,
          10
        );


      minimum -= extra;

      maximum += extra;

    }


    const range =
      maximum - minimum;


    const chartWidth =
      width -
      (
        paddingX * 2
      );


    const chartHeight =
      height -
      (
        paddingY * 2
      );


    const chartPoints = [
      {
        equity:
          equityData.startingBalance
      },
      ...points
    ];


    const coordinates =
      chartPoints.map(
        (point, index) => {

          const denominator =
            Math.max(
              chartPoints.length - 1,
              1
            );


          const x =
            paddingX +
            (
              index /
              denominator
            ) *
            chartWidth;


          const normalized =
            (
              point.equity -
              minimum
            ) /
            range;


          const y =
            height -
            paddingY -
            (
              normalized *
              chartHeight
            );


          return {
            x,
            y
          };

        }
      );


    const linePath =
      coordinates
        .map(
          (point, index) =>
            `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        )
        .join(" ");


    const firstPoint =
      coordinates[0];


    const lastPoint =
      coordinates[
        coordinates.length - 1
      ];


    const areaPath = `
      ${linePath}
      L ${lastPoint.x.toFixed(2)}
        ${(height - paddingY).toFixed(2)}
      L ${firstPoint.x.toFixed(2)}
        ${(height - paddingY).toFixed(2)}
      Z
    `;


    const gridLines = [];


    for (
      let index = 0;
      index <= 4;
      index += 1
    ) {

      const y =
        paddingY +
        (
          index / 4
        ) *
        chartHeight;


      gridLines.push(`
        <line
          x1="${paddingX}"
          y1="${y.toFixed(2)}"
          x2="${width - paddingX}"
          y2="${y.toFixed(2)}"
          class="analytics-chart-grid-line"
        />
      `);

    }


    const isPositive =
      equityData.endingBalance >=
      equityData.startingBalance;


    container.innerHTML = `
      <svg
        class="analytics-equity-svg ${isPositive ? "positive" : "negative"}"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        role="img"
        aria-label="Trading equity curve"
      >

        <defs>

          <linearGradient
            id="analyticsEquityGradient"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >

            <stop
              offset="0%"
              stop-color="currentColor"
              stop-opacity="0.22"
            />

            <stop
              offset="100%"
              stop-color="currentColor"
              stop-opacity="0"
            />

          </linearGradient>

        </defs>

        <g class="analytics-chart-grid">
          ${gridLines.join("")}
        </g>

        <path
          d="${areaPath}"
          class="analytics-equity-area"
        />

        <path
          d="${linePath}"
          class="analytics-equity-line"
        />

        ${coordinates.map(
          point => `
            <circle
              cx="${point.x.toFixed(2)}"
              cy="${point.y.toFixed(2)}"
              r="3"
              class="analytics-equity-point"
            />
          `
        ).join("")}

      </svg>
    `;

  }


  /* =========================================================
     ANALYTICS BEST / WORST / DRAWDOWN
     ========================================================= */

  function renderAnalyticsBestWorst(
    trades,
    equityData
  ) {

    if (!trades.length) {

      setElementText(
        "analyticsBestTrade",
        "—"
      );

      setElementText(
        "analyticsBestTradeMeta",
        "No trades in this period"
      );

      setElementText(
        "analyticsWorstTrade",
        "—"
      );

      setElementText(
        "analyticsWorstTradeMeta",
        "No trades in this period"
      );

      setElementText(
        "analyticsMaxDrawdown",
        formatMoney(0)
      );

      setElementText(
        "analyticsMaxDrawdownMeta",
        "0.0%"
      );

      return;

    }


    const bestTrade =
      trades.reduce(
        (best, trade) =>

          safeNumber(
            trade.pnl
          ) >
          safeNumber(
            best.pnl
          )
            ? trade
            : best

      );


    const worstTrade =
      trades.reduce(
        (worst, trade) =>

          safeNumber(
            trade.pnl
          ) <
          safeNumber(
            worst.pnl
          )
            ? trade
            : worst

      );


    const bestPnl =
      safeNumber(
        bestTrade.pnl
      );


    const worstPnl =
      safeNumber(
        worstTrade.pnl
      );


    const bestElement =
      document.getElementById(
        "analyticsBestTrade"
      );


    if (bestElement) {

      bestElement.textContent =
        formatSignedMoney(
          bestPnl
        );


      setMoneyClass(
        bestElement,
        bestPnl
      );

    }


    setElementText(
      "analyticsBestTradeMeta",
      [
        bestTrade.asset_name ||
          bestTrade.market ||
          "Trade",
        formatTradeDate(
          bestTrade.trade_date
        )
      ].join(" · ")
    );


    const worstElement =
      document.getElementById(
        "analyticsWorstTrade"
      );


    if (worstElement) {

      worstElement.textContent =
        formatSignedMoney(
          worstPnl
        );


      setMoneyClass(
        worstElement,
        worstPnl
      );

    }


    setElementText(
      "analyticsWorstTradeMeta",
      [
        worstTrade.asset_name ||
          worstTrade.market ||
          "Trade",
        formatTradeDate(
          worstTrade.trade_date
        )
      ].join(" · ")
    );


    const drawdownElement =
      document.getElementById(
        "analyticsMaxDrawdown"
      );


    if (drawdownElement) {

      drawdownElement.textContent =
        formatMoney(
          -Math.abs(
            equityData.maxDrawdown
          )
        );


      setMoneyClass(
        drawdownElement,
        -Math.abs(
          equityData.maxDrawdown
        )
      );

    }


    setElementText(
      "analyticsMaxDrawdownMeta",
      `${equityData.maxDrawdownPercent.toFixed(1)}% from peak`
    );

  }


  /* =========================================================
     ANALYTICS BREAKDOWN LIST
     ========================================================= */

  function renderAnalyticsBreakdownList(
    containerId,
    emptyId,
    groups
  ) {

    const container =
      document.getElementById(
        containerId
      );


    const emptyState =
      document.getElementById(
        emptyId
      );


    if (!container) {
      return;
    }


    const entries =
      [...groups.entries()]
        .map(
          ([name, trades]) => {

            const stats =
              calculateGroupStats(
                trades
              );


            return {
              name,
              ...stats
            };

          }
        )
        .sort(
          (a, b) =>
            b.totalPnl -
            a.totalPnl
        );


    if (!entries.length) {

      container.innerHTML = "";


      if (emptyState) {

        emptyState.style.display =
          "";

      }


      return;

    }


    if (emptyState) {

      emptyState.style.display =
        "none";

    }


    const largestAbsolutePnl =
      Math.max(
        ...entries.map(
          entry =>
            Math.abs(
              entry.totalPnl
            )
        ),
        1
      );


    container.innerHTML =
      entries.map(
        entry => {

          const width =
            Math.max(
              4,
              (
                Math.abs(
                  entry.totalPnl
                ) /
                largestAbsolutePnl
              ) * 100
            );


          return `
            <div class="analytics-breakdown-row">

              <div class="analytics-breakdown-row-top">

                <div>
                  <strong>
                    ${escapeHtml(
                      entry.name
                    )}
                  </strong>

                  <span>
                    ${entry.trades}
                    ${entry.trades === 1
                      ? "trade"
                      : "trades"}
                    ·
                    ${entry.winRate.toFixed(1)}% WR
                  </span>
                </div>

                <strong class="${getTradeResultClass(
                  entry.totalPnl
                )}">
                  ${escapeHtml(
                    formatSignedMoney(
                      entry.totalPnl
                    )
                  )}
                </strong>

              </div>

              <div class="analytics-breakdown-bar">

                <span
                  class="${getTradeResultClass(
                    entry.totalPnl
                  )}"
                  style="width: ${width.toFixed(2)}%;"
                ></span>

              </div>

            </div>
          `;

        }
      ).join("");

  }


  /* =========================================================
     ANALYTICS STRATEGY
     ========================================================= */

  function renderAnalyticsStrategy(
    trades
  ) {

    const groups =
      groupTradesBy(
        trades,
        trade =>
          trade.strategy ||
          "No strategy"
      );


    renderAnalyticsBreakdownList(
      "analyticsStrategyList",
      "analyticsStrategyEmpty",
      groups
    );

  }


  /* =========================================================
     ANALYTICS MARKET
     ========================================================= */

  function renderAnalyticsMarket(
    trades
  ) {

    const groups =
      groupTradesBy(
        trades,
        trade =>
          trade.market ||
          "Unspecified"
      );


    renderAnalyticsBreakdownList(
      "analyticsMarketList",
      "analyticsMarketEmpty",
      groups
    );

  }


  /* =========================================================
     ANALYTICS WEEKDAYS
     ========================================================= */

  function renderAnalyticsWeekdays(
    trades
  ) {

    const weekdayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ];


    const groups =
      new Map();


    weekdayOrder.forEach(
      weekday => {

        groups.set(
          weekday,
          []
        );

      }
    );


    trades.forEach(
      trade => {

        const date =
          parseDateString(
            trade.trade_date
          );


        if (!date) {
          return;
        }


        const weekday =
          new Intl.DateTimeFormat(
            "en-US",
            {
              weekday: "long"
            }
          ).format(
            date
          );


        if (
          !groups.has(
            weekday
          )
        ) {

          groups.set(
            weekday,
            []
          );

        }


        groups
          .get(
            weekday
          )
          .push(
            trade
          );

      }
    );


    const populatedGroups =
      new Map(
        [...groups.entries()]
          .filter(
            ([, groupTrades]) =>
              groupTrades.length > 0
          )
      );


    renderAnalyticsBreakdownList(
      "analyticsWeekdayList",
      "analyticsWeekdayEmpty",
      populatedGroups
    );

  }


  /* =========================================================
     ANALYTICS LONG VS SHORT
     ========================================================= */

  function renderAnalyticsDirection(
    trades
  ) {

    const container =
      document.getElementById(
        "analyticsDirectionList"
      );


    const emptyState =
      document.getElementById(
        "analyticsDirectionEmpty"
      );


    if (!container) {
      return;
    }


    if (!trades.length) {

      container.innerHTML = "";


      if (emptyState) {

        emptyState.style.display =
          "";

      }


      return;

    }


    if (emptyState) {

      emptyState.style.display =
        "none";

    }


    const directions = [
      "Long",
      "Short"
    ];


    container.innerHTML =
      directions.map(
        direction => {

          const directionTrades =
            trades.filter(
              trade =>
                trade.direction ===
                direction
            );


          const stats =
            calculateGroupStats(
              directionTrades
            );


          const share =
            trades.length
              ? (
                  directionTrades.length /
                  trades.length
                ) * 100
              : 0;


          return `
            <div class="analytics-direction-card">

              <div class="analytics-direction-heading">

                <span class="direction-badge ${getTradeDirectionClass(
                  direction
                )}">
                  ${direction}
                </span>

                <strong>
                  ${directionTrades.length}
                </strong>

              </div>

              <div class="analytics-direction-value ${getTradeResultClass(
                stats.totalPnl
              )}">
                ${escapeHtml(
                  formatSignedMoney(
                    stats.totalPnl
                  )
                )}
              </div>

              <div class="analytics-direction-meta">

                <span>
                  ${stats.winRate.toFixed(1)}% win rate
                </span>

                <span>
                  ${share.toFixed(1)}% of trades
                </span>

              </div>

              <div class="analytics-direction-bar">

                <span
                  style="width: ${share.toFixed(2)}%;"
                ></span>

              </div>

            </div>
          `;

        }
      ).join("");

  }


  /* =========================================================
     ANALYTICS STREAKS
     ========================================================= */

  function renderAnalyticsStreaks(
    streaks
  ) {

    setElementText(
      "analyticsWinningStreak",
      String(
        streaks.maxWinStreak
      )
    );


    setElementText(
      "analyticsLosingStreak",
      String(
        streaks.maxLossStreak
      )
    );

  }


  /* =========================================================
     ANALYTICS PERIOD INFO
     ========================================================= */

  function renderAnalyticsPeriodInfo(
    trades,
    analytics
  ) {

    setElementText(
      "analyticsTradeCount",
      String(
        analytics.totalTrades
      )
    );


    setElementText(
      "analyticsPeriodLabel",
      getAnalyticsPeriodLabel()
    );


    setElementText(
      "analyticsWins",
      String(
        analytics.winners.length
      )
    );


    setElementText(
      "analyticsLosses",
      String(
        analytics.losers.length
      )
    );


    setElementText(
      "analyticsBreakeven",
      String(
        analytics.breakeven.length
      )
    );


    const periodDates =
      trades
        .map(
          trade =>
            parseDateString(
              trade.trade_date
            )
        )
        .filter(Boolean);


    if (
      periodDates.length
    ) {

      const first =
        periodDates[0];


      const last =
        periodDates[
          periodDates.length - 1
        ];


      setElementText(
        "analyticsDateRange",
        `${new Intl.DateTimeFormat(
          "en-GB",
          {
            day: "numeric",
            month: "short"
          }
        ).format(first)} – ${new Intl.DateTimeFormat(
          "en-GB",
          {
            day: "numeric",
            month: "short",
            year: "numeric"
          }
        ).format(last)}`
      );

    } else {

      setElementText(
        "analyticsDateRange",
        "No trades"
      );

    }

  }


  /* =========================================================
     OPEN ADD TRADE MODAL
     ========================================================= */

  function getTradeModal() {

    return (
      document.getElementById(
        "tradeModal"
      ) ||
      document.getElementById(
        "addTradeModal"
      )
    );

  }


  function openTradeModal() {

    editingTradeId = null;


    const modal =
      getTradeModal();


    if (!modal) {
      return;
    }


    const form =
      document.getElementById(
        "tradeForm"
      );


    if (form) {
      form.reset();
    }


    const editingInput =
      document.getElementById(
        "editingTradeId"
      );


    if (editingInput) {
      editingInput.value = "";
    }


    const dateInput =
      document.getElementById(
        "tradeDate"
      );


    if (dateInput) {

      dateInput.value =
        selectedCalendarDate ||
        getTodayDateString();

    }


    const directionInput =
      document.getElementById(
        "tradeDirection"
      );


    if (directionInput) {

      directionInput.value =
        userProfile
          .default_direction ||
        "Long";

    }


    const modalTitle =
      document.getElementById(
        "tradeModalTitle"
      );


    if (modalTitle) {

      modalTitle.textContent =
        "Add trade";

    }


    const saveButton =
      document.getElementById(
        "saveTradeButton"
      );


    if (saveButton) {

      saveButton.textContent =
        "Save trade";

    }


    clearTradeFormMessage();


    modal.classList.add(
      "active"
    );


    modal.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  function closeTradeModal() {

    const modal =
      getTradeModal();


    if (!modal) {
      return;
    }


    modal.classList.remove(
      "active"
    );


    modal.setAttribute(
      "aria-hidden",
      "true"
    );


    editingTradeId = null;

  }


  /* =========================================================
     TRADE FORM HELPERS
     ========================================================= */

  function getInputValue(
    ...ids
  ) {

    for (
      const id of ids
    ) {

      const element =
        document.getElementById(
          id
        );


      if (element) {
        return element.value;
      }

    }


    return "";

  }


  function setInputValue(
    value,
    ...ids
  ) {

    for (
      const id of ids
    ) {

      const element =
        document.getElementById(
          id
        );


      if (element) {

        element.value =
          value ?? "";

        return;

      }

    }

  }


  function showTradeFormMessage(
    message,
    type = "error"
  ) {

    const element =
      document.getElementById(
        "tradeFormMessage"
      );


    if (!element) {
      return;
    }


    element.textContent =
      message;


    element.classList.remove(
      "success",
      "error"
    );


    element.classList.add(
      type
    );

  }


  function clearTradeFormMessage() {

    const element =
      document.getElementById(
        "tradeFormMessage"
      );


    if (!element) {
      return;
    }


    element.textContent = "";


    element.classList.remove(
      "success",
      "error"
    );

  }


  function getTradePayload() {

    const market =
      getInputValue(
        "tradeMarket"
      ).trim();


    const assetName =
      getInputValue(
        "tradeAssetName",
        "tradeAsset"
      ).trim();


    const direction =
      getInputValue(
        "tradeDirection"
      ) === "Short"
        ? "Short"
        : "Long";


    const entryPrice =
      nullableNumber(
        getInputValue(
          "tradeEntryPrice",
          "entryPrice"
        )
      );


    const exitPrice =
      nullableNumber(
        getInputValue(
          "tradeExitPrice",
          "exitPrice"
        )
      );


    const stopLoss =
      nullableNumber(
        getInputValue(
          "tradeStopLoss",
          "stopLoss"
        )
      );


    const takeProfit =
      nullableNumber(
        getInputValue(
          "tradeTakeProfit",
          "takeProfit"
        )
      );


    const riskAmount =
      nullableNumber(
        getInputValue(
          "tradeRiskAmount",
          "riskAmount"
        )
      );


    const riskReward =
      nullableNumber(
        getInputValue(
          "tradeRiskReward",
          "riskReward"
        )
      );


    const pnl =
      nullableNumber(
        getInputValue(
          "tradePnl",
          "tradePnL",
          "pnl"
        )
      );


    const strategy =
      getInputValue(
        "tradeStrategy"
      ).trim();


    const notes =
      getInputValue(
        "tradeNotes"
      ).trim();


    const tradeDate =
      getInputValue(
        "tradeDate"
      ) ||
      getTodayDateString();


    if (!market) {

      return {
        error:
          "Please select or enter a market."
      };

    }


    if (pnl === null) {

      return {
        error:
          "Please enter the P&L for this trade."
      };

    }


    return {

      data: {

        user_id:
          currentUser.id,

        market,

        asset_name:
          assetName ||
          null,

        direction,

        entry_price:
          entryPrice,

        exit_price:
          exitPrice,

        stop_loss:
          stopLoss,

        take_profit:
          takeProfit,

        risk_amount:
          riskAmount,

        risk_reward:
          riskReward,

        pnl,

        strategy:
          strategy ||
          null,

        notes:
          notes ||
          null,

        trade_date:
          tradeDate

      }

    };

  }


  /* =========================================================
     SAVE TRADE
     ========================================================= */

  async function saveTrade(
    event
  ) {

    event.preventDefault();


    if (!currentUser) {
      return;
    }


    clearTradeFormMessage();


    const payload =
      getTradePayload();


    if (payload.error) {

      showTradeFormMessage(
        payload.error,
        "error"
      );

      return;

    }


    const saveButton =
      document.getElementById(
        "saveTradeButton"
      );


    if (saveButton) {

      saveButton.disabled =
        true;


      saveButton.textContent =
        editingTradeId
          ? "Updating..."
          : "Saving...";

    }


    let error = null;


    if (editingTradeId) {

      const result =
        await supabaseClient
          .from("trades")
          .update(
            payload.data
          )
          .eq(
            "id",
            editingTradeId
          )
          .eq(
            "user_id",
            currentUser.id
          );


      error =
        result.error;

    } else {

      const result =
        await supabaseClient
          .from("trades")
          .insert(
            payload.data
          );


      error =
        result.error;

    }


    if (error) {

      console.error(
        "Could not save trade:",
        error
      );


      showTradeFormMessage(
        error.message ||
          "Could not save your trade.",
        "error"
      );


      if (saveButton) {

        saveButton.disabled =
          false;


        saveButton.textContent =
          editingTradeId
            ? "Update trade"
            : "Save trade";

      }


      return;

    }


    showTradeFormMessage(
      editingTradeId
        ? "Trade updated."
        : "Trade saved.",
      "success"
    );


    await loadTrades();


    closeTradeModal();


    if (saveButton) {

      saveButton.disabled =
        false;


      saveButton.textContent =
        "Save trade";

    }

  }


  const tradeForm =
    document.getElementById(
      "tradeForm"
    );


  if (tradeForm) {

    tradeForm.addEventListener(
      "submit",
      saveTrade
    );

  }


  /* =========================================================
     ADD TRADE BUTTONS
     ========================================================= */

  [
    "addTradeButton",
    "journalAddTradeButton",
    "calendarAddTradeButton",
    "emptyAddTradeButton"
  ].forEach(
    id => {

      const button =
        document.getElementById(
          id
        );


      if (button) {

        button.addEventListener(
          "click",
          openTradeModal
        );

      }

    }
  );


  /* =========================================================
     CLOSE TRADE MODAL
     ========================================================= */

  [
    "closeTradeModal",
    "cancelTradeButton"
  ].forEach(
    id => {

      const button =
        document.getElementById(
          id
        );


      if (button) {

        button.addEventListener(
          "click",
          closeTradeModal
        );

      }

    }
  );


  const tradeModal =
    getTradeModal();


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
     TRADE DETAILS
     ========================================================= */

  function getTradeDetailsModal() {

    return (
      document.getElementById(
        "tradeDetailsModal"
      ) ||
      document.getElementById(
        "tradeDetailModal"
      )
    );

  }


  function openTradeDetails(
    tradeId
  ) {

    const trade =
      getTradeById(
        tradeId
      );


    if (!trade) {
      return;
    }


    selectedTradeId =
      trade.id;


    const modal =
      getTradeDetailsModal();


    if (!modal) {

      /*
        If the HTML has no detail modal,
        immediately open the edit modal.
      */

      openEditTrade(
        trade.id
      );

      return;

    }


    setElementText(
      "detailAssetName",
      trade.asset_name ||
      trade.market ||
      "Trade"
    );


    setElementText(
      "detailMarket",
      trade.market ||
      "—"
    );


    setElementText(
      "detailDirection",
      trade.direction ||
      "—"
    );


    setElementText(
      "detailEntryPrice",
      formatPrice(
        trade.entry_price
      )
    );


    setElementText(
      "detailExitPrice",
      formatPrice(
        trade.exit_price
      )
    );


    setElementText(
      "detailStopLoss",
      formatPrice(
        trade.stop_loss
      )
    );


    setElementText(
      "detailTakeProfit",
      formatPrice(
        trade.take_profit
      )
    );


    setElementText(
      "detailRiskAmount",
      trade.risk_amount ===
        null ||
      trade.risk_amount ===
        undefined
        ? "—"
        : formatMoney(
            trade.risk_amount
          )
    );


    setElementText(
      "detailRiskReward",
      trade.risk_reward ===
        null ||
      trade.risk_reward ===
        undefined
        ? "—"
        : `${safeNumber(
            trade.risk_reward
          ).toFixed(2)}R`
    );


    setElementText(
      "detailStrategy",
      trade.strategy ||
      "—"
    );


    setElementText(
      "detailTradeDate",
      formatTradeDate(
        trade.trade_date
      )
    );


    setElementText(
      "detailNotes",
      trade.notes ||
      "No notes added."
    );


    const pnlElement =
      document.getElementById(
        "detailPnl"
      );


    if (pnlElement) {

      pnlElement.textContent =
        formatSignedMoney(
          trade.pnl
        );


      setMoneyClass(
        pnlElement,
        trade.pnl
      );

    }


    modal.classList.add(
      "active"
    );


    modal.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  function closeTradeDetails() {

    const modal =
      getTradeDetailsModal();


    if (!modal) {
      return;
    }


    modal.classList.remove(
      "active"
    );


    modal.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  [
    "closeTradeDetailsModal",
    "closeTradeDetailButton"
  ].forEach(
    id => {

      const button =
        document.getElementById(
          id
        );


      if (button) {

        button.addEventListener(
          "click",
          closeTradeDetails
        );

      }

    }
  );


  const tradeDetailsModal =
    getTradeDetailsModal();


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


  /* =========================================================
     EDIT TRADE
     ========================================================= */

  function openEditTrade(
    tradeId
  ) {

    const trade =
      getTradeById(
        tradeId
      );


    if (!trade) {
      return;
    }


    editingTradeId =
      trade.id;


    closeTradeDetails();


    const modal =
      getTradeModal();


    if (!modal) {
      return;
    }


    setInputValue(
      trade.id,
      "editingTradeId"
    );


    setInputValue(
      trade.market || "",
      "tradeMarket"
    );


    setInputValue(
      trade.asset_name || "",
      "tradeAssetName",
      "tradeAsset"
    );


    setInputValue(
      trade.direction ||
      "Long",
      "tradeDirection"
    );


    setInputValue(
      trade.entry_price ?? "",
      "tradeEntryPrice",
      "entryPrice"
    );


    setInputValue(
      trade.exit_price ?? "",
      "tradeExitPrice",
      "exitPrice"
    );


    setInputValue(
      trade.stop_loss ?? "",
      "tradeStopLoss",
      "stopLoss"
    );


    setInputValue(
      trade.take_profit ?? "",
      "tradeTakeProfit",
      "takeProfit"
    );


    setInputValue(
      trade.risk_amount ?? "",
      "tradeRiskAmount",
      "riskAmount"
    );


    setInputValue(
      trade.risk_reward ?? "",
      "tradeRiskReward",
      "riskReward"
    );


    setInputValue(
      trade.pnl ?? "",
      "tradePnl",
      "tradePnL",
      "pnl"
    );


    setInputValue(
      trade.strategy || "",
      "tradeStrategy"
    );


    setInputValue(
      trade.notes || "",
      "tradeNotes"
    );


    setInputValue(
      trade.trade_date ||
      getTodayDateString(),
      "tradeDate"
    );


    const modalTitle =
      document.getElementById(
        "tradeModalTitle"
      );


    if (modalTitle) {

      modalTitle.textContent =
        "Edit trade";

    }


    const saveButton =
      document.getElementById(
        "saveTradeButton"
      );


    if (saveButton) {

      saveButton.textContent =
        "Update trade";

    }


    clearTradeFormMessage();


    modal.classList.add(
      "active"
    );


    modal.setAttribute(
      "aria-hidden",
      "false"
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

        if (!selectedTradeId) {
          return;
        }


        openEditTrade(
          selectedTradeId
        );

      }
    );

  }


  /* =========================================================
     DELETE TRADE
     ========================================================= */

  async function deleteTrade(
    tradeId
  ) {

    if (
      !currentUser ||
      !tradeId
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "Are you sure you want to delete this trade? This cannot be undone."
      );


    if (!confirmed) {
      return;
    }


    const {
      error
    } = await supabaseClient
      .from("trades")
      .delete()
      .eq(
        "id",
        tradeId
      )
      .eq(
        "user_id",
        currentUser.id
      );


    if (error) {

      console.error(
        "Could not delete trade:",
        error
      );


      window.alert(
        error.message ||
        "Could not delete this trade."
      );


      return;

    }


    selectedTradeId =
      null;


    closeTradeDetails();


    await loadTrades();

  }


  const deleteTradeButton =
    document.getElementById(
      "deleteTradeButton"
    );


  if (deleteTradeButton) {

    deleteTradeButton
      .addEventListener(
        "click",
        () => {

          if (!selectedTradeId) {
            return;
          }


          deleteTrade(
            selectedTradeId
          );

        }
      );

  }


  /* =========================================================
     ESCAPE KEY MODALS
     ========================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key !== "Escape"
      ) {
        return;
      }


      closeTradeModal();

      closeTradeDetails();

    }
  );
    /* =========================================================
     EXTRA MODAL BUTTONS
     ========================================================= */

  const detailEditTradeButton =
    document.getElementById(
      "detailEditTradeButton"
    );


  if (detailEditTradeButton) {

    detailEditTradeButton
      .addEventListener(
        "click",
        () => {

          if (!selectedTradeId) {
            return;
          }


          openEditTrade(
            selectedTradeId
          );

        }
      );

  }


  const detailDeleteTradeButton =
    document.getElementById(
      "detailDeleteTradeButton"
    );


  if (detailDeleteTradeButton) {

    detailDeleteTradeButton
      .addEventListener(
        "click",
        () => {

          if (!selectedTradeId) {
            return;
          }


          deleteTrade(
            selectedTradeId
          );

        }
      );

  }


  /* =========================================================
     DASHBOARD CHART TABS
     ========================================================= */

  document
    .querySelectorAll(
      ".chart-tabs button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".chart-tabs button"
            )
            .forEach(item => {

              item.classList.remove(
                "active"
              );

            });


          button.classList.add(
            "active"
          );

        }
      );

    });


  /* =========================================================
     LOGOUT
     ========================================================= */

  async function logout() {

    const {
      error
    } = await supabaseClient
      .auth
      .signOut();


    if (error) {

      console.error(
        "Could not log out:",
        error
      );


      window.alert(
        error.message ||
        "Could not log out."
      );


      return;

    }


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
     AUTH STATE CHANGES
     ========================================================= */

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

        }

      }
    );


  /* =========================================================
     START APPLICATION
     ========================================================= */

  async function startApp() {

    /*
      First check if the visitor
      actually has a Supabase session.
    */

    const {
      data,
      error
    } = await supabaseClient
      .auth
      .getSession();


    if (error) {

      console.error(
        "Could not read session:",
        error
      );


      window.location.href =
        "/app/login.html";

      return;

    }


    const session =
      data?.session;


    if (
      !session ||
      !session.user
    ) {

      window.location.href =
        "/app/login.html";

      return;

    }


    currentUser =
      session.user;


    /*
      Render information that does not
      need database calls immediately.
    */

    renderCurrentDate();

    renderUser();

    applyTheme();


    /*
      Load profile first because currency,
      account balance and theme affect
      the rest of the interface.
    */

    await loadProfile();


    /*
      Load all user trades from Supabase.
      loadTrades() automatically calls
      renderEverything(), including Analytics.
    */

    await loadTrades();


    /*
      Make sure the initial active view
      is rendered correctly.
    */

    const activeNavigation =
      document.querySelector(
        ".nav-item.active[data-page]"
      );


    const initialPage =
      activeNavigation
        ?.dataset
        ?.page ||
      "dashboard";


    const allowedInitialPages = [
      "dashboard",
      "journal",
      "calendar",
      "analytics",
      "settings"
    ];


    if (
      allowedInitialPages.includes(
        initialPage
      )
    ) {

      showView(
        initialPage
      );

    } else {

      showView(
        "dashboard"
      );

    }

  }


  /* =========================================================
     START
     ========================================================= */

  await startApp();

}
