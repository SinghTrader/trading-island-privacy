
/* =========================================================
   CANDLEGUESS — TRADING ISLAND
   Daily trading prediction game
   Supabase score integration
   No account required
   ========================================================= */

(() => {
  "use strict";

  // ========================================================
  // CONFIGURATION
  // ========================================================

  const SUPABASE_URL =
    "https://bgcwhlyxldyqlojduexk.supabase.co";

  const API_URL =
    SUPABASE_URL + "/functions/v1/candleguess-score";

  const GAME_URL =
    "https://www.tradingisland.net/candle-guess/";

  const $ = id => document.getElementById(id);

  const DAY = 86400000;

  const today = () =>
    new Date().toISOString().slice(0, 10);

  const storageKey = day =>
    "ti-candleguess-v2-" + day;

  const visitorKey =
    "ti-candleguess-visitor-id";

  const assets = [
    "BTC/USD",
    "ETH/USD",
    "EUR/USD"
  ];

  // ========================================================
  // VISITOR ID — NO ACCOUNT REQUIRED
  // ========================================================

  function getVisitorId() {
    let id;

    try {
      id = localStorage.getItem(visitorKey);
    } catch {
      id = null;
    }

    const validUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!id || !validUUID.test(id)) {
      id = crypto.randomUUID();

      try {
        localStorage.setItem(visitorKey, id);
      } catch {
        // Storage may be unavailable.
      }
    }

    return id;
  }

  const visitorId = getVisitorId();

  // ========================================================
  // SUPABASE EDGE FUNCTION
  // ========================================================

  async function callScoreApi(action, predictions) {
    if (SUPABASE_URL.includes("VUL-HIER")) {
      throw new Error(
        "Vul eerst je Supabase Project URL in."
      );
    }

    const payload = {
      action,
      visitor_id: visitorId
    };

    if (predictions !== undefined) {
      payload.predictions = predictions;
    }

    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(payload)
    });

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.error || "Server connection failed"
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  }

  // ========================================================
  // GAME STATE
  // ========================================================

  let date = today();

  let round = 0;
  let score = 0;
  let answers = [];

  let started = false;
  let locked = false;
  let finishing = false;

  let seconds = 20;

  let timerInterval = null;
  let revealInterval = null;
  let countdownInterval = null;

  let scenario = null;
  let revealedCandles = 0;

  // ========================================================
  // LOCAL STORAGE
  // ========================================================

  function loadResult() {
    try {
      return JSON.parse(
        localStorage.getItem(storageKey(date)) ||
        "null"
      );
    } catch {
      return null;
    }
  }

  function saveResult(result) {
    try {
      localStorage.setItem(
        storageKey(date),
        JSON.stringify(result)
      );
    } catch {
      // Storage may be unavailable.
    }
  }

  function clearOldResults() {
    try {
      for (const key of Object.keys(localStorage)) {
        if (
          key.startsWith("ti-candleguess-v2-") &&
          key !== storageKey(date)
        ) {
          localStorage.removeItem(key);
        }

        if (
          key.startsWith("ti-candleguess-demo-")
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Storage may be unavailable.
    }
  }

  // ========================================================
  // RANDOM GENERATOR
  // ========================================================

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

      seed = (seed + 0x6D2B79F5) | 0;

      let value = Math.imul(
        seed ^ (seed >>> 15),
        1 | seed
      );

      value = (
        value +
        Math.imul(
          value ^ (value >>> 7),
          61 | value
        )
      ) ^ value;

      return (
        (value ^ (value >>> 14)) >>> 0
      ) / 4294967296;
    };
  }

  // ========================================================
  // GENERATE DAILY CANDLESTICK SCENARIO
  // ========================================================

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

    // Historical candles

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

    const startingClose =
      candles[47].close;

    const desiredDirection =
      random() > 0.5 ? 1 : -1;

    // Future candles

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

  // ========================================================
  // DRAW CANDLESTICK CHART
  // ========================================================

  function drawChart() {
    const element = $("chart");

    if (!element || !scenario) return;

    let canvas =
      element.querySelector("canvas");

    if (!canvas) {
      canvas = document.createElement("canvas");

      canvas.style.cssText = `
        width: 100%;
        height: 100%;
        display: block;
      `;

      element.appendChild(canvas);
    }

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    const width = element.clientWidth;
    const height = element.clientHeight;

    if (!width || !height) return;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

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

    const lows =
      visibleCandles.map(c => c.low);

    const highs =
      visibleCandles.map(c => c.high);

    const lowest = Math.min(...lows);
    const highest = Math.max(...highs);

    const range =
      highest - lowest || 1;

    const y = price =>
      padding.top +
      ((highest - price) / range) *
      plotHeight;

    const candleSpacing =
      (
        width -
        padding.left -
        padding.right
      ) / 53;

    const candleWidth = Math.max(
      2,
      Math.min(
        10,
        candleSpacing * 0.64
      )
    );

    // Grid

    ctx.strokeStyle =
      "rgba(255,255,255,0.07)";

    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
      const gridY =
        padding.top +
        (i * plotHeight) / 4;

      ctx.beginPath();
      ctx.moveTo(0, gridY);
      ctx.lineTo(width, gridY);
      ctx.stroke();
    }

    // Candles

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

      // Wick

      ctx.beginPath();
      ctx.moveTo(x, y(candle.high));
      ctx.lineTo(x, y(candle.low));
      ctx.stroke();

      // Body

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

    // Synthetic data label

    ctx.fillStyle = "#929b97";

    ctx.font =
      "11px Inter, system-ui, sans-serif";

    ctx.fillText(
      "SYNTHETIC DATA · DEMO",
      14,
      height - 9
    );
  }

  // ========================================================
  // UPDATE GAME DISPLAY
  // ========================================================

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
      "Daily Challenge · " + date;
  }

  function showNotice(message) {
    if ($("feedback")) {
      $("feedback").textContent = message;
    }
  }

  // ========================================================
  // STOP TIMERS
  // ========================================================

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

  // ========================================================
  // START ROUND
  // ========================================================

  function playRound() {
    stopTimers();

    if (today() !== date) {
      showNotice(
        "A new UTC day has started. Refresh to play."
      );

      return;
    }

    locked = false;
    started = true;

    seconds = 20;
    revealedCandles = 0;

    scenario = makeScenario(
      date,
      round
    );

    showNotice("");

    $("next").hidden = true;
    $("next").disabled = false;

    $("question").hidden = false;

    $("long").disabled = false;
    $("short").disabled = false;

    document
      .querySelector(".cg-future")
      ?.classList.remove("revealed");

    updateDisplay();
    drawChart();

    timerInterval = setInterval(() => {
      if (today() !== date) {
        stopTimers();

        showNotice(
          "A new UTC day has started. Refresh to play."
        );

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

  // ========================================================
  // SUBMIT ROUND PREDICTION
  // ========================================================

  function submitPrediction(choice) {
    if (locked || !started) return;

    if (today() !== date) {
      stopTimers();

      showNotice(
        "The daily challenge has changed. Refresh."
      );

      return;
    }

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
      showNotice(
        "Time is up · 0 points"
      );
    } else if (correct) {
      showNotice(
        "Correct prediction · +100 points"
      );
    } else {
      showNotice(
        "Incorrect prediction · 0 points"
      );
    }

    document
      .querySelector(".cg-future")
      ?.classList.add("revealed");

    // Reveal 5 future candles

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

  // ========================================================
  // NEXT DAILY CHALLENGE COUNTDOWN
  // ========================================================

  function nextCountdown() {
    const remaining =
      DAY - (Date.now() % DAY);

    const hours =
      Math.floor(
        remaining / 3600000
      );

    const minutes =
      Math.floor(
        remaining / 60000
      ) % 60;

    const seconds =
      Math.floor(
        remaining / 1000
      ) % 60;

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

  // ========================================================
  // PERCENTILE ELEMENT
  // ========================================================

  function percentageElement() {
    let element = $("cgPercentile");

    if (!element) {
      element = document.createElement("p");

      element.id = "cgPercentile";

      element.style.cssText = `
        font-size: 1.1rem;
        font-weight: 700;
        color: #7cffb2;
        margin: 12px 0;
      `;

      const parent =
        $("finalDetails")?.parentElement ||
        $("results");

      parent.appendChild(element);
    }

    return element;
  }

  // ========================================================
  // SHOW FINAL RESULTS
  // ========================================================

  function showResults(
    result,
    savedAnswers = answers
  ) {
    stopTimers();

    started = false;
    locked = true;

    $("game").hidden = true;
    $("results").hidden = false;

    $("finalScore").textContent =
      `${result.score} / 300`;

    const correctCount =
      result.correct_predictions ??
      savedAnswers.filter(
        answer => answer.correct
      ).length;

    $("finalDetails").textContent =
      `${correctCount} of 3 correct predictions`;

    const resultElements =
      savedAnswers.length === 3
        ? savedAnswers.map(
            (answer, index) => {
              const element =
                document.createElement("div");

              element.className =
                "cg-result";

              element.textContent =
                `${index + 1}. ` +
                `${answer.asset} · ` +
                `${answer.choice || "Timed out"} · ` +
                `${answer.correct ? "✓" : "✕"}`;

              return element;
            }
          )
        : [];

    $("roundResults").replaceChildren(
      ...resultElements
    );

    // Real Supabase player comparison

    const percentile = percentageElement();

    if (
      result.better_than_percent === null ||
      result.better_than_percent === undefined
    ) {
      percentile.textContent =
        "Not enough player results for a comparison yet";
    } else {
      percentile.textContent =
        `Better than ${result.better_than_percent}% ` +
        "of players today";
    }

    // No permanent streak history

    if ($("streak")) {
      $("streak").textContent =
        "New challenge every day";
    }

    // Countdown

    const refreshCountdown = () => {
      $("countdown").textContent =
        "Next challenge in " +
        nextCountdown();
    };

    refreshCountdown();

    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(
      refreshCountdown,
      1000
    );

    // Perfect score animation

    if (
      result.score === 300 &&
      $("finalScore").animate
    ) {
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

  // ========================================================
  // SAVE FINAL SCORE TO SUPABASE
  // ========================================================

  async function finishGame() {
    if (finishing) return;

    finishing = true;

    stopTimers();

    $("next").disabled = true;
    $("next").textContent =
      "Saving score...";

    const predictions =
      answers.map(answer => answer.choice);

    try {
      const result = await callScoreApi(
        "submit",
        predictions
      );

      // Use server-verified score

      score = result.score;

      const finalAnswers =
        result.results || answers;

      const saved = {
        date,
        score,
        answers: finalAnswers,

        correct_predictions:
          result.correct_predictions,

        better_than_percent:
          result.better_than_percent
      };

      saveResult(saved);

      answers = finalAnswers;

      showResults(
        saved,
        finalAnswers
      );

    } catch (error) {
      if (error.status === 409) {
        // Score was already submitted

        try {
          const status =
            await callScoreApi("status");

          if (status.completed) {
            const previous = loadResult();

            showResults(
              {
                score: status.score,

                correct_predictions:
                  status.correct_predictions,

                better_than_percent:
                  previous?.better_than_percent ??
                  null
              },
              previous?.answers || []
            );

            return;
          }
        } catch (statusError) {
          console.error(statusError);
        }
      }

      showNotice(
        "Could not save score: " +
        error.message +
        ". Try again."
      );

      $("next").disabled = false;
      $("next").textContent =
        "Retry saving score →";

      finishing = false;
    }
  }

  // ========================================================
  // BUTTON EVENTS
  // ========================================================

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
     CANDLEGUESS — SOCIAL SHARING
     Trading Island
     ======================================================= */

  const SHARE_URL =
    "https://www.tradingisland.net/candle-guess/";

  const SHARE_SIZE = 1080;

  // ========================================================
  // GET TODAY'S RESULT
  // ========================================================

  function getShareResult() {
    const saved = loadResult();

    if (!saved || saved.date !== date) {
      return null;
    }

    return {
      score: saved.score,
      answers: saved.answers || [],
      percentile:
        saved.better_than_percent ?? null,
      date: saved.date
    };
  }

  // ========================================================
  // CREATE SHARE TEXT
  // ========================================================

  function createShareText(result) {
    const squares = result.answers
      .map(answer =>
        answer.correct ? "🟩" : "🟥"
      )
      .join("");

    const comparison =
      result.percentile === null
        ? ""
        : `Better than ${result.percentile}% of players\n`;

    return (
      `CandleGuess · ${result.date}\n` +
      `Score: ${result.score}/300\n` +
      `${squares}\n` +
      comparison +
      `\nCan you beat my score?\n` +
      SHARE_URL
    );
  }

  // ========================================================
  // CANVAS HELPERS
  // ========================================================

  function roundedRect(
    ctx,
    x,
    y,
    width,
    height,
    radius,
    fill
  ) {
    ctx.beginPath();
    ctx.roundRect(
      x,
      y,
      width,
      height,
      radius
    );

    ctx.fillStyle = fill;
    ctx.fill();
  }

  function centeredText(
    ctx,
    text,
    y,
    font,
    color
  ) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";

    ctx.fillText(
      text,
      SHARE_SIZE / 2,
      y
    );
  }

  // ========================================================
  // CREATE PROFESSIONAL SHARE CARD
  // ========================================================

  function createShareCanvas(result) {
    const canvas =
      document.createElement("canvas");

    canvas.width = SHARE_SIZE;
    canvas.height = 1350;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "Canvas is not supported."
      );
    }

    // Background

    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        1080,
        1350
      );

    gradient.addColorStop(
      0,
      "#111c17"
    );

    gradient.addColorStop(
      0.5,
      "#09110d"
    );

    gradient.addColorStop(
      1,
      "#050807"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
      0,
      0,
      1080,
      1350
    );

    // Decorative glow

    const glow =
      ctx.createRadialGradient(
        540,
        470,
        40,
        540,
        470,
        600
      );

    glow.addColorStop(
      0,
      "rgba(124,255,178,0.12)"
    );

    glow.addColorStop(
      1,
      "rgba(124,255,178,0)"
    );

    ctx.fillStyle = glow;

    ctx.fillRect(
      0,
      0,
      1080,
      1050
    );

    // Outer card

    roundedRect(
      ctx,
      70,
      75,
      940,
      1200,
      38,
      "#101914"
    );

    ctx.strokeStyle = "#284536";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.roundRect(
      70,
      75,
      940,
      1200,
      38
    );

    ctx.stroke();

    // Logo icon

    roundedRect(
      ctx,
      125,
      130,
      90,
      90,
      22,
      "#7cffb2"
    );

    // Candlestick logo

    ctx.strokeStyle = "#08120c";
    ctx.fillStyle = "#08120c";
    ctx.lineWidth = 6;

    ctx.beginPath();

    ctx.moveTo(153, 153);
    ctx.lineTo(153, 197);

    ctx.moveTo(183, 148);
    ctx.lineTo(183, 192);

    ctx.stroke();

    ctx.fillRect(
      145,
      165,
      16,
      23
    );

    ctx.fillRect(
      175,
      157,
      16,
      24
    );

    // Branding

    ctx.textAlign = "left";

    ctx.fillStyle = "#f3fff7";

    ctx.font =
      "bold 42px Arial, sans-serif";

    ctx.fillText(
      "TRADING ISLAND",
      240,
      171
    );

    ctx.fillStyle = "#91a99a";

    ctx.font =
      "23px Arial, sans-serif";

    ctx.fillText(
      "CANDLEGUESS",
      242,
      209
    );

    // Divider

    ctx.strokeStyle = "#284536";

    ctx.beginPath();
    ctx.moveTo(125, 265);
    ctx.lineTo(955, 265);
    ctx.stroke();

    // Challenge date

    centeredText(
      ctx,
      `DAILY CHALLENGE · ${result.date}`,
      337,
      "bold 26px Arial, sans-serif",
      "#9eb6a6"
    );

    // Score label

    centeredText(
      ctx,
      "TODAY'S SCORE",
      438,
      "bold 29px Arial, sans-serif",
      "#9eb6a6"
    );

    // Main score

    centeredText(
      ctx,
      String(result.score),
      640,
      "bold 190px Arial, sans-serif",
      "#7cffb2"
    );

    centeredText(
      ctx,
      "OUT OF 300 POINTS",
      703,
      "bold 27px Arial, sans-serif",
      "#a0b5a7"
    );

    // Round result cards

    const positions = [
      255,
      455,
      655
    ];

    for (let i = 0; i < 3; i++) {
      const answer =
        result.answers[i];

      const correct =
        answer?.correct === true;

      const x = positions[i];

      roundedRect(
        ctx,
        x,
        775,
        170,
        160,
        25,
        correct
          ? "#173c29"
          : "#3a2025"
      );

      ctx.strokeStyle = correct
        ? "#347d54"
        : "#85424c";

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.roundRect(
        x,
        775,
        170,
        160,
        25
      );

      ctx.stroke();

      ctx.textAlign = "center";

      ctx.fillStyle = correct
        ? "#7cffb2"
        : "#ff8991";

      ctx.font =
        "bold 86px Arial, sans-serif";

      ctx.fillText(
        correct ? "✓" : "×",
        x + 85,
        882
      );

      ctx.fillStyle = "#d4e3d8";

      ctx.font =
        "bold 20px Arial, sans-serif";

      ctx.fillText(
        `ROUND ${i + 1}`,
        x + 85,
        916
      );
    }

    // Player comparison

    if (result.percentile !== null) {
      roundedRect(
        ctx,
        180,
        980,
        720,
        86,
        22,
        "#1a3325"
      );

      centeredText(
        ctx,
        `BETTER THAN ${result.percentile}% OF PLAYERS`,
        1036,
        "bold 30px Arial, sans-serif",
        "#7cffb2"
      );
    } else {
      centeredText(
        ctx,
        "DAILY TRADING CHALLENGE",
        1034,
        "bold 27px Arial, sans-serif",
        "#9eb6a6"
      );
    }

    // Bottom divider

    ctx.strokeStyle = "#284536";

    ctx.beginPath();
    ctx.moveTo(125, 1115);
    ctx.lineTo(955, 1115);
    ctx.stroke();

    // Call to action

    centeredText(
      ctx,
      "CAN YOU BEAT MY SCORE?",
      1180,
      "bold 37px Arial, sans-serif",
      "#f3fff7"
    );

    centeredText(
      ctx,
      "tradingisland.net/candle-guess",
      1230,
      "26px Arial, sans-serif",
      "#7cffb2"
    );

    return canvas;
  }

  // ========================================================
  // CONVERT CANVAS TO IMAGE
  // ========================================================

  function canvasToBlob(canvas) {
    return new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(
                new Error(
                  "Could not generate image."
                )
              );
            }
          },
          "image/png"
        );
      }
    );
  }

  // ========================================================
  // DOWNLOAD SHARE CARD
  // ========================================================

  function downloadShareCard(
    blob,
    result
  ) {
    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `CandleGuess-${result.date}.png`;

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // ========================================================
  // SHARE IMAGE
  // ========================================================

  async function shareImage(button) {
    const result = getShareResult();

    if (!result) {
      alert(
        "Complete today's challenge first."
      );

      return;
    }

    const originalText =
      button.textContent;

    button.disabled = true;

    button.textContent =
      "Creating share card...";

    try {
      const canvas =
        createShareCanvas(result);

      const blob =
        await canvasToBlob(canvas);

      const file = new File(
        [blob],
        `CandleGuess-${result.date}.png`,
        {
          type: "image/png"
        }
      );

      const shareData = {
        files: [file],
        text: createShareText(result)
      };

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [file]
        })
      ) {
        await navigator.share(
          shareData
        );
      } else {
        downloadShareCard(
          blob,
          result
        );
      }

    } catch (error) {
      if (
        error.name !== "AbortError"
      ) {
        console.error(error);

        alert(
          "Sharing failed. Please try again."
        );
      }
    } finally {
      button.disabled = false;

      button.textContent =
        originalText;
    }
  }

  // ========================================================
  // COPY SCORE
  // ========================================================

  async function copyScore(button) {
    const result = getShareResult();

    if (!result) {
      alert(
        "Complete today's challenge first."
      );

      return;
    }

    const text =
      createShareText(result);

    try {
      await navigator.clipboard.writeText(
        text
      );

      button.textContent =
        "✓ Copied!";

      setTimeout(() => {
        button.textContent =
          "Copy Score";
      }, 2000);

    } catch (error) {
      console.error(error);

      alert(
        "Could not copy your score."
      );
    }
  }

  // ========================================================
  // CREATE SOCIAL BUTTONS
  // ========================================================

  function setupSocialSharing() {
    const oldShareButton = $("share");

    if (!oldShareButton) return;

    // Prevent duplicate buttons

    if ($("cgSocialButtons")) {
      return;
    }

    // Container

    const container =
      document.createElement("div");

    container.id =
      "cgSocialButtons";

    container.style.cssText = `
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 12px;
      width: 100%;
      margin-top: 18px;
    `;

    // Share image button

    const shareButton =
      document.createElement("button");

    shareButton.type = "button";

    shareButton.textContent =
      "Share Result";

    shareButton.style.cssText = `
      background: #7cffb2;
      color: #07120b;
      border: 0;
      border-radius: 14px;
      padding: 16px 12px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      transition:
        transform .2s,
        opacity .2s;
    `;

    // Copy text button

    const copyButton =
      document.createElement("button");

    copyButton.type = "button";

    copyButton.textContent =
      "Copy Score";

    copyButton.style.cssText = `
      background: #18251d;
      color: #e7f7ec;
      border: 1px solid #365441;
      border-radius: 14px;
      padding: 16px 12px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      transition:
        transform .2s,
        opacity .2s;
    `;

    shareButton.addEventListener(
      "click",
      () => shareImage(shareButton)
    );

    copyButton.addEventListener(
      "click",
      () => copyScore(copyButton)
    );

    container.append(
      shareButton,
      copyButton
    );

    // Replace original share button

    oldShareButton.replaceWith(
      container
    );
  }

  setupSocialSharing();

  // ========================================================
  // RESPONSIVE CHART
  // ========================================================

  window.addEventListener(
    "resize",
    drawChart
  );

  // ========================================================
  // INITIALIZE GAME
  // ========================================================

  async function initialize() {
    clearOldResults();

    $("long").disabled = true;
    $("short").disabled = true;

    $("next").hidden = true;

    showNotice(
      "Checking today's challenge..."
    );

    try {
      const status =
        await callScoreApi("status");

      // Already completed today

      if (status.completed) {
        const saved = loadResult();

        showResults(
          {
            score: status.score,

            correct_predictions:
              status.correct_predictions,

            better_than_percent:
              saved?.better_than_percent ??
              null
          },
          saved?.answers || []
        );

        return;
      }

      // Server has no result yet.
      // Clear stale local result.

      try {
        localStorage.removeItem(
          storageKey(date)
        );
      } catch {
        // Storage may be unavailable.
      }

      playRound();

    } catch (error) {
      console.error(
        "CandleGuess initialization failed:",
        error
      );

      showNotice(
        "Unable to start: " +
        error.message +
        ". Refresh to retry."
      );
    }
  }

  initialize();

})();
