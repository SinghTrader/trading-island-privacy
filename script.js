document.addEventListener("DOMContentLoaded", () => {
  initializeTradingIslandHomepage();
});

async function initializeTradingIslandHomepage() {
  /*
    ============================================
    CURRENT YEAR
    ============================================
  */

  const year = document.querySelector("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }


  /*
    ============================================
    CHROME WEB STORE
    ============================================
  */

  const chromeWebStoreUrl =
    "https://chromewebstore.google.com/detail/trading-island/gccchgbcmjkkabhdimacgijmgdmklgaf";

  const chromeButton =
    document.querySelector("#chromeButton");

  const chromeButtonBottom =
    document.querySelector("#chromeButtonBottom");


  function openChromeStore(event) {
    event.preventDefault();

    if (!chromeWebStoreUrl || chromeWebStoreUrl === "#") {
      alert(
        "Trading Island is available on the Chrome Web Store. " +
        "The store link will be added here shortly."
      );

      return;
    }

    window.open(
      chromeWebStoreUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }


  if (chromeButton) {
    chromeButton.addEventListener(
      "click",
      openChromeStore
    );
  }


  if (chromeButtonBottom) {
    chromeButtonBottom.addEventListener(
      "click",
      openChromeStore
    );
  }


  /*
    ============================================
    HOMEPAGE ACCOUNT BUTTONS
    ============================================
  */

  const navLoginButton =
    document.querySelector("#navLoginButton");

  const navDashboardButton =
    document.querySelector("#navDashboardButton");

  const heroDashboardButton =
    document.querySelector("#heroDashboardButton");

  const bottomDashboardButton =
    document.querySelector("#bottomDashboardButton");


  /*
    Default state:
    gebruiker is nog niet gecontroleerd.

    De links in index.html werken ook wanneer
    Supabase tijdelijk niet beschikbaar is.
  */

  if (navLoginButton) {
    navLoginButton.href = "/app/login.html";
  }

  if (navDashboardButton) {
    navDashboardButton.href = "/app/";
  }

  if (heroDashboardButton) {
    heroDashboardButton.href = "/app/login.html";
  }

  if (bottomDashboardButton) {
    bottomDashboardButton.href = "/app/login.html";
  }


  /*
    ============================================
    SUPABASE CHECK
    ============================================
  */

  const config =
    window.TRADING_ISLAND_CONFIG;

  if (
    !window.supabase ||
    !config ||
    !config.SUPABASE_URL ||
    !config.SUPABASE_PUBLISHABLE_KEY
  ) {
    console.warn(
      "Trading Island: Supabase configuration is not available on the homepage."
    );

    showLoggedOutState();

    return;
  }


  const supabaseClient =
    window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_PUBLISHABLE_KEY
    );


  /*
    ============================================
    INITIAL SESSION
    ============================================
  */

  try {
    const {
      data,
      error
    } = await supabaseClient.auth.getSession();


    if (error) {
      console.error(
        "Trading Island session check failed:",
        error
      );

      showLoggedOutState();

      return;
    }


    const session = data?.session;


    if (session?.user) {
      showLoggedInState();
    } else {
      showLoggedOutState();
    }

  } catch (error) {
    console.error(
      "Trading Island authentication check failed:",
      error
    );

    showLoggedOutState();
  }


  /*
    ============================================
    LISTEN FOR AUTH CHANGES
    ============================================
  */

  supabaseClient.auth.onAuthStateChange(
    (_event, session) => {

      if (session?.user) {
        showLoggedInState();
      } else {
        showLoggedOutState();
      }

    }
  );


  /*
    ============================================
    LOGGED IN STATE
    ============================================
  */

  function showLoggedInState() {

    if (navLoginButton) {
      navLoginButton.classList.add(
        "auth-hidden"
      );
    }


    if (navDashboardButton) {
      navDashboardButton.classList.remove(
        "auth-hidden"
      );

      navDashboardButton.textContent =
        "Dashboard";

      navDashboardButton.href =
        "/app/";
    }


    if (heroDashboardButton) {
      heroDashboardButton.textContent =
        "Open Dashboard";

      heroDashboardButton.href =
        "/app/";
    }


    if (bottomDashboardButton) {
      bottomDashboardButton.textContent =
        "Open Dashboard";

      bottomDashboardButton.href =
        "/app/";
    }

  }


  /*
    ============================================
    LOGGED OUT STATE
    ============================================
  */

  function showLoggedOutState() {

    if (navLoginButton) {
      navLoginButton.classList.remove(
        "auth-hidden"
      );

      navLoginButton.textContent =
        "Log in";

      navLoginButton.href =
        "/app/login.html";
    }


    if (navDashboardButton) {
      navDashboardButton.classList.remove(
        "auth-hidden"
      );

      navDashboardButton.textContent =
        "Open Dashboard";

      navDashboardButton.href =
        "/app/";
    }


    if (heroDashboardButton) {
      heroDashboardButton.textContent =
        "Start for free";

      heroDashboardButton.href =
        "/app/login.html";
    }


    if (bottomDashboardButton) {
      bottomDashboardButton.textContent =
        "Create free account";

      bottomDashboardButton.href =
        "/app/login.html";
    }

  }

}
