/* =========================================================
   TRADING ISLAND — AUTH
   app/auth.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", initializeAuth);

async function initializeAuth() {

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

  const magicLinkButton = document.querySelector("#magicLinkButton");
  const magicLinkMessage = document.querySelector("#magicLinkMessage");

  if (!loginView || !signupView || !loginForm || !signupForm) {
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
     SWITCH LOGIN / SIGNUP
     ======================================================= */

  if (showSignupButton) {

    showSignupButton.addEventListener("click", () => {

      loginView.classList.remove("active");
      signupView.classList.add("active");

      clearMessage(loginMessage);
      clearMessage(signupMessage);
      clearMessage(magicLinkMessage);

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

  document.querySelectorAll(".password-toggle").forEach(button => {

    button.addEventListener("click", () => {

      const input = document.getElementById(
        button.dataset.target
      );

      if (!input) return;

      const isHidden = input.type === "password";

      input.type = isHidden ? "text" : "password";
      button.textContent = isHidden ? "Hide" : "Show";

    });

  });

  /* =======================================================
     SIGN UP
     ======================================================= */

  signupForm.addEventListener("submit", async event => {

    event.preventDefault();
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

    signupButton.disabled = true;
    signupButton.textContent = "Creating account...";

    try {

      const { data, error } = await supabaseClient.auth.signUp({

        email,
        password,

        options: {

          data: {
            name
          },

          emailRedirectTo:
            `${window.location.origin}/app/`

        }

      });

      if (error) throw error;

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
        error.message || "Could not create your account."
      );

    } finally {

      signupButton.disabled = false;
      signupButton.textContent = "Create account";

    }

  });

  /* =======================================================
     LOGIN WITH PASSWORD
     ======================================================= */

  loginForm.addEventListener("submit", async event => {

    event.preventDefault();
    clearMessage(loginMessage);

    const email = loginEmail.value.trim().toLowerCase();
    const password = loginPassword.value;

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {

      const { data, error } =
        await supabaseClient.auth.signInWithPassword({

          email,
          password

        });

      if (error) throw error;

      if (!data.session) {
        throw new Error("Could not start your session.");
      }

      window.location.href = "/app/";

    } catch (error) {

      console.error("Login error:", error);

      showMessage(
        loginMessage,
        error.message || "Could not log in."
      );

    } finally {

      loginButton.disabled = false;
      loginButton.textContent = "Log in";

    }

  });

  /* =======================================================
     MAGIC LINK LOGIN
     ======================================================= */

  if (magicLinkButton) {

    magicLinkButton.addEventListener("click", async () => {

      clearMessage(magicLinkMessage);

      const email = loginEmail.value
        .trim()
        .toLowerCase();

      if (!email || !loginEmail.checkValidity()) {

        showMessage(
          magicLinkMessage,
          "Please enter a valid email address above."
        );

        loginEmail.focus();
        return;

      }

      magicLinkButton.disabled = true;
      magicLinkButton.textContent = "Sending link...";

      try {

        const { error } =
