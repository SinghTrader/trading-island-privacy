/* =========================================================
   TRADING ISLAND — AUTH
   app/auth.js
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIG
   VERVANG ALLEEN DEZE TWEE WAARDEN
   ========================================================= */

const SUPABASE_URL = "https://bgcwhlyxldyqlojduexk.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_u_bwfijbu_9AOMoHiFMX7g_WTRXnHqK";


/* =========================================================
   2. CREATE SUPABASE CLIENT
   ========================================================= */

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   3. ELEMENTS
   ========================================================= */

const loginView =
  document.querySelector("#loginView");

const signupView =
  document.querySelector("#signupView");

const showSignupButton =
  document.querySelector("#showSignup");

const showLoginButton =
  document.querySelector("#showLogin");


const loginForm =
  document.querySelector("#loginForm");

const loginEmail =
  document.querySelector("#loginEmail");

const loginPassword =
  document.querySelector("#loginPassword");

const loginMessage =
  document.querySelector("#loginMessage");

const loginButton =
  document.querySelector("#loginButton");


const signupForm =
  document.querySelector("#signupForm");

const signupName =
  document.querySelector("#signupName");

const signupEmail =
  document.querySelector("#signupEmail");

const signupPassword =
  document.querySelector("#signupPassword");

const confirmPassword =
  document.querySelector("#confirmPassword");

const signupMessage =
  document.querySelector("#signupMessage");

const signupButton =
  document.querySelector("#signupButton");


/* =========================================================
   4. SWITCH LOGIN / SIGNUP
   ========================================================= */

function showLoginView() {
  signupView.classList.remove("active");
  loginView.classList.add("active");

  clearMessage(loginMessage);
  clearMessage(signupMessage);
}

function showSignupView() {
  loginView.classList.remove("active");
  signupView.classList.add("active");

  clearMessage(loginMessage);
  clearMessage(signupMessage);
}

showSignupButton.addEventListener(
  "click",
  showSignupView
);

showLoginButton.addEventListener(
  "click",
  showLoginView
);


/* =========================================================
   5. MESSAGES
   ========================================================= */

function showMessage(
  element,
  message,
  type = "error"
) {
  element.textContent = message;

  element.className =
    `message show ${type}`;
}

function clearMessage(element) {
  element.textContent = "";
  element.className = "message";
}


/* =========================================================
   6. PASSWORD SHOW / HIDE
   ========================================================= */

const passwordToggleButtons =
  document.querySelectorAll(
    ".password-toggle"
  );

passwordToggleButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        const targetId =
          button.dataset.target;

        const input =
          document.getElementById(
            targetId
          );

        if (!input) {
          return;
        }

        if (input.type === "password") {
          input.type = "text";
          button.textContent = "Hide";
        } else {
          input.type = "password";
          button.textContent = "Show";
        }
      }
    );

  }
);


/* =========================================================
   7. SIGN UP
   ========================================================= */

signupForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearMessage(signupMessage);

    const name =
      signupName.value.trim();

    const email =
      signupEmail.value
        .trim()
        .toLowerCase();

    const password =
      signupPassword.value;

    const passwordConfirmation =
      confirmPassword.value;


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


    if (
      password !==
      passwordConfirmation
    ) {
      showMessage(
        signupMessage,
        "The passwords do not match."
      );

      return;
    }


    signupButton.disabled = true;
    signupButton.textContent =
      "Creating account...";


    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth.signUp({
          email,
          password,

          options: {
            data: {
              name: name
            },

            emailRedirectTo:
              `${window.location.origin}/app/`
          }
        });


      if (error) {
        throw error;
      }


      if (
        data.session
      ) {

        window.location.href =
          "/app/";

        return;
      }


      showMessage(
        signupMessage,
        "Account created. Check your email to confirm your account.",
        "success"
      );


      signupForm.reset();

    } catch (error) {

      console.error(
        "Signup error:",
        error
      );

      showMessage(
        signupMessage,
        error.message ||
          "Could not create your account."
      );

    } finally {

      signupButton.disabled = false;

      signupButton.textContent =
        "Create account";
    }
  }
);


/* =========================================================
   8. LOGIN
   ========================================================= */

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearMessage(loginMessage);

    const email =
      loginEmail.value
        .trim()
        .toLowerCase();

    const password =
      loginPassword.value;


    loginButton.disabled = true;

    loginButton.textContent =
      "Logging in...";


    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInWithPassword({
            email,
            password
          });


      if (error) {
        throw error;
      }


      if (!data.session) {
        throw new Error(
          "Could not start your session."
        );
      }


      window.location.href =
        "/app/";


    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      showMessage(
        loginMessage,
        error.message ||
          "Could not log in."
      );

    } finally {

      loginButton.disabled = false;

      loginButton.textContent =
        "Log in";
    }
  }
);


/* =========================================================
   9. REDIRECT USER IF ALREADY LOGGED IN
   ========================================================= */

async function checkExistingSession() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getSession();


    if (error) {
      console.error(
        "Session check error:",
        error
      );

      return;
    }


    if (data.session) {

      window.location.href =
        "/app/";
    }

  } catch (error) {

    console.error(
      "Session check failed:",
      error
    );
  }
}


checkExistingSession();
