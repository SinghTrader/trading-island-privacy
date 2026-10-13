
/* =========================================================
   TRADING ISLAND — AUTH
   app/auth.js
   Supabase + Cloudflare Turnstile
   ========================================================= */

document.addEventListener("DOMContentLoaded", initializeAuth);

async function initializeAuth() {

  /* =======================================================
     CONFIG CHECK
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
    SUPABASE_PUBLISHABLE_KEY,
    TURNSTILE_SITE_KEY
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
     ELEMENTS
     ======================================================= */

  const loginView = document.querySelector("#loginView");
  const signupView = document.querySelector("#signupView");

  const showSignupButton = document.querySelector("#showSignup");
  const showLoginButton = document.querySelector("#showLogin");

  const loginForm = document.querySelector("#loginForm");
  const loginEmail = document.querySelector("#loginEmail");
  const loginPassword = document.querySelector("#loginPassword");
  const loginMessage = document.querySelector("#loginMessage");
  const loginButton = document.querySelector("#loginButton");

  const signupForm = document.querySelector("#signupForm");
  const signupName = document.querySelector("#signupName");
  const signupEmail = document.querySelector("#signupEmail");
  const signupPassword = document.querySelector("#signupPassword");
  const confirmPassword = document.querySelector("#confirmPassword");
  const signupMessage = document.querySelector("#signupMessage");
  const signupButton = document.querySelector("#signupButton");

  if (
    !loginView ||
    !signupView ||
    !loginForm ||
    !signupForm
  ) {
    return;
  }

  /* =======================================================
     MESSAGES
     ======================================================= */

  function showMessage(element, message, type = "error") {
    if (!element) return;

    element.textContent = message;
    element.className = `message show ${type}`;
  }

  function clearMessage(element) {
    if (!element) return;

    element.textContent = "";
    element.className = "message";
  }

  /* =======================================================
     CLOUDFLARE TURNSTILE
     ======================================================= */

  const captchaTokens = {
    login: "",
    signup: ""
  };

  const captchaWidgets = {
    login: null,
    signup: null
  };

  let captchaReady = false;

  function resetCaptcha(type) {
    captchaTokens[type] = "";

    if (
      window.turnstile &&
      captchaWidgets[type] !== null
    ) {
      try {
        window.turnstile.reset(captchaWidgets[type]);
      } catch (error) {
        console.warn("Could not reset CAPTCHA:", error);
      }
    }
  }

  function renderCaptcha(type) {
    if (!window.turnstile || !TURNSTILE_SITE_KEY) {
      return;
    }

    if (captchaWidgets[type] !== null) {
      return;
    }

    const container = document.getElementById(
      `${type}Turnstile`
    );

    if (!container) return;

    captchaWidgets[type] = window.turnstile.render(
      container,
      {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",

        callback: token => {
          captchaTokens[type] = token;
        },

        "expired-callback": () => {
          captchaTokens[type] = "";
        },

        "error-callback": errorCode => {
          captchaTokens[type] = "";
          console.warn(
            `Turnstile ${type} error:`,
            errorCode
          );
        }
      }
    );
  }

  window.onTradingIslandTurnstileReady = () => {
    captchaReady = true;
    renderCaptcha("login");
    renderCaptcha("signup");
  };

  if (window.turnstile) {
    window.onTradingIslandTurnstileReady();
  }

  function validateCaptcha(type, messageElement) {
    if (!TURNSTILE_SITE_KEY) {
      showMessage(
        messageElement,
        "Security verification is not configured."
      );
      return false;
    }

    if (!captchaReady || !window.turnstile) {
      showMessage(
        messageElement,
        "Security verification is loading. Please try again."
      );
      return false;
    }

    if (!captchaTokens[type]) {
      showMessage(
        messageElement,
        "Please complete the security check."
      );
      return false;
    }

    return true;
  }

  /* =======================================================
     SWITCH LOGIN / SIGNUP
     ======================================================= */

  if (showSignupButton) {
    showSignupButton.addEventListener("click", () => {
      loginView.classList.remove("active");
      signupView.classList.add("active");

      clearMessage(loginMessage);
      clearMessage(signupMessage);
    });
  }

  if (showLoginButton) {
    showLoginButton.addEventListener("click", () => {
      signupView.classList.remove("active");
      loginView.classList.add("active");

      clearMessage(loginMessage);
      clearMessage(signupMessage);
    });
  }

  /* =======================================================
     PASSWORD SHOW / HIDE
     ======================================================= */

  document.querySelectorAll(".password-toggle")
    .forEach(button => {
      button.addEventListener("click", () => {
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);

        if (!input) return;

        if (input.type === "password") {
          input.type = "text";
          button.textContent = "Hide";
        } else {
          input.type = "password";
          button.textContent = "Show";
        }
      });
    });

  /* =======================================================
     SIGN UP
     ======================================================= */

  signupForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (signupButton.disabled) return;

    clearMessage(signupMessage);

    const name = signupName.value.trim();
    const email = signupEmail.value.trim().toLowerCase();
    const password = signupPassword.value;
    const passwordConfirmation = confirmPassword.value;

    if (!name) {
      showMessage(
        signupMessage,
        "Please enter your name."
      );
      return;
    }

    if (password.length < 6) {
      showMessage(
        signupMessage,
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (password !== passwordConfirmation) {
      showMessage(
        signupMessage,
        "The passwords do not match."
      );
      return;
    }

    if (!validateCaptcha("signup", signupMessage)) {
      return;
    }

    const captchaToken = captchaTokens.signup;

    signupButton.disabled = true;
    signupButton.textContent = "Creating account...";

    try {
      const { data, error } =
        await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name
            },
            emailRedirectTo:
              `${window.location.origin}/app/`,
            captchaToken
          }
        });

      if (error) {
        throw error;
      }

      if (data.session) {
        window.location.href = "/app/";
        return;
      }

      showMessage(
        signupMessage,
        "Account created. Check your email to confirm your account.",
        "success"
      );

      signupForm.reset();

    } catch (error) {
      console.error("Signup error:", error);

      showMessage(
        signupMessage,
        error.message ||
          "Could not create your account."
      );

    } finally {
      resetCaptcha("signup");

      signupButton.disabled = false;
      signupButton.textContent = "Create account";
    }
  });

  /* =======================================================
     LOGIN
     ======================================================= */

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (loginButton.disabled) return;

    clearMessage(loginMessage);

    const email = loginEmail.value.trim().toLowerCase();
    const password = loginPassword.value;

    if (!validateCaptcha("login", loginMessage)) {
      return;
    }

    const captchaToken = captchaTokens.login;

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password,
          options: {
            captchaToken
          }
        });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error(
          "Could not start your session."
        );
      }

      window.location.href = "/app/";

    } catch (error) {
      console.error("Login error:", error);

      showMessage(
        loginMessage,
        error.message || "Could not log in."
      );

    } finally {
      resetCaptcha("login");

      loginButton.disabled = false;
      loginButton.textContent = "Log in";
    }
  });

  /* =======================================================
     CHECK SESSION
     ======================================================= */

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (data.session) {
      window.location.href = "/app/";
    }

  } catch (error) {
    console.error("Session check error:", error);
  }
}
