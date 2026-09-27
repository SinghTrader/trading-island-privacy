const accountBalance = document.getElementById("accountBalance");
const riskPercentage = document.getElementById("riskPercentage");
const entryPrice = document.getElementById("entryPrice");
const stopLoss = document.getElementById("stopLoss");

const calculateBtn = document.getElementById("calculateBtn");
const errorMessage = document.getElementById("errorMessage");

const results = document.getElementById("results");

const positionSizeOutput = document.getElementById("positionSize");
const amountAtRiskOutput = document.getElementById("amountAtRisk");
const riskPerShareOutput = document.getElementById("riskPerShare");
const positionValueOutput = document.getElementById("positionValue");
const accountRiskOutput = document.getElementById("accountRisk");


function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}


function calculatePositionSize() {

  // Get values
  const balance = parseFloat(accountBalance.value);
  const risk = parseFloat(riskPercentage.value);
  const entry = parseFloat(entryPrice.value);
  const stop = parseFloat(stopLoss.value);


  // Reset error
  errorMessage.textContent = "";


  // Check if fields are filled in
  if (
    isNaN(balance) ||
    isNaN(risk) ||
    isNaN(entry) ||
    isNaN(stop)
  ) {
    showError("Please enter all trade details.");
    return;
  }


  // Check values
  if (balance <= 0) {
    showError("Account balance must be greater than 0.");
    return;
  }

  if (risk <= 0) {
    showError("Risk percentage must be greater than 0.");
    return;
  }

  if (risk > 100) {
    showError("Risk percentage cannot be greater than 100%.");
    return;
  }

  if (entry <= 0 || stop <= 0) {
    showError("Entry price and stop loss must be greater than 0.");
    return;
  }


  // Calculate risk amount
  const amountAtRisk = balance * (risk / 100);


  // Difference between entry and stop
  const riskPerShare = Math.abs(entry - stop);


  if (riskPerShare === 0) {
    showError("Entry price and stop loss cannot be the same.");
    return;
  }


  // Position size
  const rawPositionSize = amountAtRisk / riskPerShare;

  // Whole shares only
  const positionSize = Math.floor(rawPositionSize);


  if (positionSize < 1) {
    showError(
      "Your current risk settings do not allow for at least one whole share."
    );
    return;
  }


  // Position value
  const positionValue = positionSize * entry;


  // Actual amount at risk after rounding shares
  const actualRisk = positionSize * riskPerShare;


  // Actual percentage of account at risk
  const actualAccountRisk = (actualRisk / balance) * 100;


  // Display results
  positionSizeOutput.textContent =
    positionSize.toLocaleString("en-US");

  amountAtRiskOutput.textContent =
    formatMoney(actualRisk);

  riskPerShareOutput.textContent =
    formatMoney(riskPerShare);

  positionValueOutput.textContent =
    formatMoney(positionValue);

  accountRiskOutput.textContent =
    actualAccountRisk.toFixed(2) + "%";


  // Show results
  results.classList.add("visible");
}


function showError(message) {
  errorMessage.textContent = message;
  results.classList.remove("visible");
}


// Calculate when button is clicked
calculateBtn.addEventListener("click", calculatePositionSize);


// Allow Enter key
[
  accountBalance,
  riskPercentage,
  entryPrice,
  stopLoss
].forEach(input => {

  input.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {
      calculatePositionSize();
    }

  });

});
