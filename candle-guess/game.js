/* =========================================================
   CANDLEGUESS — DAILY TRADING GAME
   Trading Island

   DEMO VERSION
   Synthetic market data
   Local browser progress
   ========================================================= */

(() => {

  "use strict";

  const $ = id => document.getElementById(id);

  const DAY = 86400000;

  const today = () =>
    new Date().toISOString().slice(0, 10);

  const storageKey = date =>
    "ti-candleguess-demo-" + date;

  const assets = [
    "BTC/USD",
    "ETH/USD",
    "EUR/USD"
  ];

  let date = today();

  let round = 0;
  let score = 0;
  let answers = [];

  let started = false;
  let locked = false;

  let seconds = 20;
  let timerInterval = null;

  let scenario = null;
  let revealedCandles = 0;
  let revealInterval = null;


  /* =======================================================
     RANDOM GENERATOR
     ======================================================= */

  function seedString(value) {

    let hash = 2166136261;

    for (const char of value) {

      hash = Math.imul(
        hash ^ char.charCodeAt(0),
        16777619
      );

    }

    return hash >>> 0;

  }


  function randomGenerator(seed) {

    return () => {

      seed |= 0;

      seed = seed + 0x6D2B79F5 | 0;

      let value = Math.imul(
        seed ^ seed >>> 15,
        1 | seed
      );

      value = value + Math.imul(
        value ^ value >>> 7,
        61 | value
      ) ^ value;

      return (
        (value ^ value >>> 14) >>> 0
      ) / 4294967296;

    };

  }


  /* =======================================================
     CREATE DAILY SCENARIO
     ======================================================= */

  function makeScenario(day, index) {

    const random = randomGenerator(
      seedString(
        day + "-CandleGuess-" + index
      )
    );

    const basePrices = [
      69000,
      3500,
      1.09
    ];

    const priceSteps = [
      165,
      14,
      0.003
    ];

    const base = basePrices[index];
    const step = priceSteps[index];

    const candles = [];

    let close = base;

    for (let i = 0; i < 53; i++) {

      const open = close;

      close = Math.max(
        step,
        open + (random() - 0.5) * step * 2
      );

      candles.push({

        open,

        high:
          Math.max(open, close) +
          random() * step * 0.45,

        low:
          Math.min(open, close) -
          random() * step * 0.45,

        close

      });

    }

    const startingClose = candles[47].close;

    const desiredDirection =
      random() > 0.5 ? 1 : -1;

    for (let i = 48; i < 53; i++) {

      const previousClose =
        candles[i - 1].close;

      const target =
        startingClose +
        desiredDirection *
        step *
        (0.5 + (i - 47) * 0.32);

      const nextClose =
        previousClose +
        (target - previousClose) *
        (0.55 + random() * 0.25);

      candles[i] = {

        open: previousClose,

        close: nextClose,

        high:
          Math.max(previousClose, nextClose) +
          random() * step * 0.25,

        low:
          Math.min(previousClose, nextClose) -
          random() * step * 0.25

      };

    }

    return {

      asset: assets[index],

      candles,

      up:
        candles[52].close >
        startingClose

    };

  }


  /* =======================================================
     DRAW CANDLESTICK CHART
     ======================================================= */

  function drawChart() {

    const element = $("chart");

    if (!element) return;

    let canvas = element.querySelector("canvas");

    if (!canvas) {

      canvas = document.createElement("canvas");

      canvas.style.cssText = `
        width:100%;
        height:100%;
        display:block;
      `;

      element.appendChild(canvas);

    }

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    const width = element.clientWidth;
    const height = element.clientHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");

    ctx.scale(dpr, dpr);

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    if (!scenario) return;

    const candles = scenario.candles;

    const visibleCount =
      48 + revealedCandles;

    const visibleCandles =
      candles.slice(0, visibleCount);

    const padding = {
      top: 22,
      bottom: 28,
      left: 14,
      right: 14
    };

    const plotHeight =
      height -
      padding.top -
      padding.bottom;

    const lows = visibleCandles.map(
      candle => candle.low
    );

    const highs = visibleCandles.map(
      candle => candle.high
    );

    const lowest = Math.min(...lows);
    const highest = Math.max(...highs);

    const range = highest - lowest || 1;

    const y = price =>
      padding.top +
      (highest - price) / range *
      plotHeight;

    const candleSpacing =
      (width - padding.left - padding.right) /
      53;

    const candleWidth = Math.max(
      2,
      Math.min(10, candleSpacing * 0.64)
    );

    /* GRID */

    ctx.strokeStyle =
      "rgba(255,255,255,0.07)";

    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {

      const gridY =
        padding.top +
        i * plotHeight / 4;

      ctx.beginPath();
      ctx.moveTo(0, gridY);
      ctx.lineTo(width, gridY);
      ctx.stroke();

    }

    /* CANDLES */

    for (
      let i = 0;
      i < visibleCount;
      i++
    ) {

      const candle = candles[i];

      const x =
        padding.left +
        (i + 0.5) * candleSpacing;

      const color =
        candle.close >= candle.open
          ? "#7cffb2"
          : "#e87777";

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      /* Wick */

      ctx.beginPath();

      ctx.moveTo(
        x,
        y(candle.high)
      );

      ctx.lineTo(
        x,
        y(candle.low)
      );

      ctx.stroke();

      /* Body */

      const top = Math.min(
        y(candle.open),
        y(candle.close)
      );

      const bodyHeight = Math.max(
        1,
        Math.abs(
          y(candle.open) -
          y(candle.close)
        )
      );

      ctx.fillRect(
        x - candleWidth / 2,
        top,
        candleWidth,
        bodyHeight
      );

    }

    /* DEMO LABEL */

    ctx.fillStyle = "#929b97";

    ctx.font =
      "11px Inter, system-ui, sans-serif";

    ctx.fillText(
      "SYNTHETIC DATA · DEMO",
      14,
      height - 9
    );

  }


  /* =======================================================
     UPDATE GAME HEADER
     ======================================================= */

  function updateDisplay() {

    $("round").textContent =
      `${Math.min(round + 1, 3)} / 3`;

    $("score").textContent =
      `${score} / 300`;

    $("timer").textContent =
      seconds + "s";

    $("asset").textContent =
      scenario?.asset || "";

    $("challenge").textContent =
      "Challenge #" +
      Math.floor(
        Date.parse(date + "T00:00:00Z") /
        DAY
      );

  }


  /* =======================================================
     STOP TIMERS
     ======================================================= */

  function stopTimers() {

    if (timerInterval) {

      clearInterval(timerInterval);
      timerInterval = null;

    }

    if (revealInterval) {

      clearInterval(revealInterval);
      revealInterval = null;

    }

  }


  /* =======================================================
     START ROUND
     ======================================================= */

  function playRound() {

    stopTimers();

    locked = false;
    started = true;

    seconds = 20;
    revealedCandles = 0;

    scenario = makeScenario(
      date,
      round
    );

    $("feedback").textContent = "";

    $("next").hidden = true;
    $("question").hidden = false;

    $("long").disabled = false;
    $("short").disabled = false;

    document.querySelector(
      ".cg-future"
    ).classList.remove("revealed");

    updateDisplay();
    drawChart();

    timerInterval = setInterval(() => {

      if (today() !== date) {

        stopTimers();

        $("feedback").textContent =
          "UTC date changed. Refresh to play the new challenge.";

        $("long").disabled = true;
        $("short").disabled = true;

        return;

      }

      seconds--;

      updateDisplay();

      if (seconds <= 0) {
        submitPrediction(null);
      }

    }, 1000);

  }


  /* =======================================================
     SUBMIT PREDICTION
     ======================================================= */

  function submitPrediction(choice) {

    if (locked || !started) return;

    locked = true;

    stopTimers();

    $("long").disabled = true;
    $("short").disabled = true;

    const correct =
      choice !== null &&
      (
        (choice === "LONG") ===
        scenario.up
      );

    if (correct) {
      score += 100;
    }

    answers.push({

      asset: scenario.asset,
      choice,
      correct

    });

    updateDisplay();

    if (choice === null) {

      $("feedback").textContent =
        "Time is up · 0 points";

    } else if (correct) {

      $("feedback").textContent =
        "Correct prediction · +100 points";

    } else {

      $("feedback").textContent =
        "Incorrect prediction · 0 points";

    }

    document.querySelector(
      ".cg-future"
    ).classList.add("revealed");

    /* Reveal 5 candles */

    revealInterval = setInterval(() => {

      revealedCandles++;

      drawChart();

      if (revealedCandles >= 5) {

        clearInterval(revealInterval);
        revealInterval = null;

        $("next").hidden = false;

        $("next").textContent =
          round === 2
            ? "View Results →"
            : "Next Round →";

      }

    }, 190);

  }


  /* =======================================================
     LOCAL STORAGE
     ======================================================= */

  function loadResult() {

    try {

      return JSON.parse(
        localStorage.getItem(
          storageKey(date)
        ) || "null"
      );

    } catch {

      return null;

    }

  }


  function saveResult() {

    const previous = loadResult();

    if (previous) return previous;

    const result = {
      date,
      score,
      answers
    };

    try {

      localStorage.setItem(
        storageKey(date),
        JSON.stringify(result)
      );

    } catch {
      // Browser storage may be unavailable.
    }

    return result;

  }


  /* =======================================================
     DAILY STREAK
     ======================================================= */

  function calculateStreak() {

    let streak = 0;

    const currentDate =
      new Date(date + "T00:00:00Z");

    for (let i = 0; i < 365; i++) {

      const day =
        currentDate.toISOString().slice(0, 10);

      try {

        if (
          !localStorage.getItem(
            storageKey(day)
          )
        ) {
          break;
        }

      } catch {
        break;
      }

      streak++;

      currentDate.setUTCDate(
        currentDate.getUTCDate() - 1
      );

    }

    return streak;

  }


  /* =======================================================
     NEXT CHALLENGE COUNTDOWN
     ======================================================= */

  function nextCountdown() {

    const remaining =
      DAY - Date.now() % DAY;

    const hours =
      Math.floor(remaining / 3600000);

    const minutes =
      Math.floor(remaining / 60000) % 60;

    const seconds =
      Math.floor(remaining / 1000) % 60;

    return [
      hours,
      minutes,
      seconds
    ]
      .map(value =>
        String(value).padStart(2, "0")
      )
      .join(":");

  }


  /* =======================================================
     FINISH GAME
     ======================================================= */

  function finishGame() {

    stopTimers();

    const result = saveResult();

    $("game").hidden = true;
    $("results").hidden = false;

    $("finalScore").textContent =
      `${result.score} / 300`;

    const correctCount =
      result.answers.filter(
        answer => answer.correct
      ).length;

    $("finalDetails").textContent =
      `${correctCount} of 3 correct predictions`;

    const resultElements =
      result.answers.map((answer, index) => {

        const element =
          document.createElement("div");

        element.className = "cg-result";

        element.textContent =
          `${index + 1}. ${answer.asset} · ` +
          `${answer.choice || "Timed out"} · ` +
          `${answer.correct ? "✓" : "✕"}`;

        return element;

      });

    $("roundResults").replaceChildren(
      ...resultElements
    );

    $("streak").textContent =
      `Current daily streak: ${calculateStreak()} day(s)`;

    function refreshCountdown() {

      $("countdown").textContent =
        "Next challenge in " +
        nextCountdown();

    }

    refreshCountdown();

    setInterval(
      refreshCountdown,
      1000
    );

    if (result.score === 300) {

      $("finalScore").animate(
        [
          {
            transform: "scale(.94)",
            opacity: 0.5
          },
          {
            transform: "scale(1.07)",
            opacity: 1
          },
          {
            transform: "scale(1)",
            opacity: 1
          }
        ],
        {
          duration: 750
        }
      );

    }

  }


  /* =======================================================
     BUTTON EVENTS
     ======================================================= */

  $("long").addEventListener(
    "click",
    () => submitPrediction("LONG")
  );

  $("short").addEventListener(
    "click",
    () => submitPrediction("SHORT")
  );

  $("next").addEventListener(
    "click",
    () => {

      if (round === 2) {

        finishGame();

      } else {

        round++;
        playRound();

      }

    }
  );


  /* =======================================================
     SHARE SCORE
     ======================================================= */

  $("share").addEventListener(
    "click",
    async () => {

      const saved = loadResult();

      const roundAnswers =
        saved?.answers || answers;

      const challengeNumber =
        Math.floor(
          Date.parse(
            date + "T00:00:00Z"
          ) / DAY
        );

      const shareText =
        `CandleGuess #${challengeNumber}\n` +
        `Score: ${saved?.score ?? score}/300\n` +
        roundAnswers.map(
          answer =>
            answer.correct ? "🟩" : "🟥"
        ).join("") +
        "\nTradingIsland";

      try {

        if (navigator.share) {

          await navigator.share({
            text: shareText
          });

        } else {

          await navigator.clipboard.writeText(
            shareText
          );

        }

      } catch (error) {

        try {

          await navigator.clipboard.writeText(
            shareText
          );

        } catch {
          // Sharing may be unavailable.
        }

      }

    }
  );


  /* =======================================================
     RESPONSIVE CHART
     ======================================================= */

  window.addEventListener(
    "resize",
    drawChart
  );


  /* =======================================================
     INITIALIZE
     ======================================================= */

  const previousResult = loadResult();

  if (
    previousResult &&
    previousResult.answers?.length === 3
  ) {

    score = previousResult.score;
    answers = previousResult.answers;

    finishGame();

  } else {

    playRound();

  }

})();
