
/* =========================================================
   CANDLEGUESS V4 — TRADING ISLAND
   Professional chart + daily challenge
   Supabase scores + leaderboard + social sharing
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
  // VISITOR ID
  // ========================================================

  function getVisitorId() {
    let id = null;

    try {
      id = localStorage.getItem(visitorKey);
    } catch {}

    const validUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!id || !validUUID.test(id)) {
      id = crypto.randomUUID();

      try {
        localStorage.setItem(visitorKey, id);
      } catch {}
    }

    return id;
  }

  const visitorId = getVisitorId();

  // ========================================================
  // SUPABASE API
  // ========================================================

  async function callScoreApi(action, predictions) {
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
    } catch {}
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

        if (key.startsWith("ti-candleguess-demo-")) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }

  // ========================================================
  // RANDOM GENERATOR
  // IMPORTANT: KEEP IDENTICAL TO SERVER SCENARIOS
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
  // DAILY SCENARIOS
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
  // PROFESSIONAL CANDLESTICK CHART
  // ========================================================

  function drawChart() {
    const element = $("chart");

    if (!element || !scenario) return;

    let canvas =
      element.querySelector("canvas");

    if (!canvas) {
      canvas = document.createElement("canvas");

      canvas.setAttribute(
        "aria-hidden",
        "true"
      );

      canvas.style.cssText = `
        display:block;
        width:100%;
        height:100%;
      `;

      element.appendChild(canvas);
    }

    const width = element.clientWidth;
    const height = element.clientHeight;

    if (width < 100 || height < 100) return;

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    canvas.width =
      Math.round(width * dpr);

    canvas.height =
      Math.round(height * dpr);

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(
      dpr, 0, 0, dpr, 0, 0
    );

    ctx.clearRect(
      0, 0, width, height
    );

    // COLORS

    const C = {
      bg: "#080f0b",
      axisBg: "#0d1710",
      grid: "rgba(151,190,162,0.09)",
      axis: "#779080",
      green: "#7cffb2",
      red: "#ff8991",
      muted: "#819989",
      border: "#2b3c30"
    };

    // LAYOUT

    const mobile = width < 540;

    const axisWidth =
      mobile ? 64 : 86;

    const left =
      mobile ? 8 : 18;

    const right =
      width - axisWidth;

    const top = 22;
    const bottom = height - 31;

    const plotWidth =
      right - left;

    const plotHeight =
      bottom - top;

    const candles =
      scenario.candles;

    const visibleCount =
      Math.min(
        candles.length,
        48 + revealedCandles
      );

    const visible =
      candles.slice(0, visibleCount);

    if (!visible.length) return;

    // BACKGROUND

    ctx.fillStyle = C.bg;

    ctx.fillRect(
      0, 0, width, height
    );

    const glow =
      ctx.createLinearGradient(
        0, 0, width, height
      );

    glow.addColorStop(
      0,
      "rgba(124,255,178,0.035)"
    );

    glow.addColorStop(
      1,
      "rgba(124,255,178,0)"
    );

    ctx.fillStyle = glow;

    ctx.fillRect(
      0, 0, right, height
    );

    // PRICE RANGE

    const rawLow = Math.min(
      ...visible.map(c => c.low)
    );

    const rawHigh = Math.max(
      ...visible.map(c => c.high)
    );

    const rawRange = Math.max(
      rawHigh - rawLow,
      0.000001
    );

    const pricePadding =
      rawRange * 0.14;

    const lowest =
      rawLow - pricePadding;

    const highest =
      rawHigh + pricePadding;

    const range =
      highest - lowest;

    const y = price =>
      top +
      ((highest - price) / range) *
      plotHeight;

    const priceAtY = pixelY =>
      highest -
      ((pixelY - top) / plotHeight) *
      range;

    // PRICE FORMATTING

    const formatPrice = price => {
      if (scenario.asset === "EUR/USD") {
        return price.toFixed(4);
      }

      return price.toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );
    };

    // CANDLE POSITIONS

    const candleSpacing =
      plotWidth / 53;

    const candleWidth = Math.max(
      2,
      Math.min(
        11,
        candleSpacing * 0.66
      )
    );

    const x = index =>
      left +
      (index + 0.5) * candleSpacing;

    // GRID

    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const gridY =
        top +
        (plotHeight / 5) * i;

      ctx.beginPath();
      ctx.moveTo(left, gridY);
      ctx.lineTo(right, gridY);

      ctx.strokeStyle = C.grid;
      ctx.stroke();
    }

    for (let i = 0; i <= 6; i++) {
      const gridX =
        left +
        (plotWidth / 6) * i;

      ctx.beginPath();
      ctx.moveTo(gridX, top);
      ctx.lineTo(gridX, bottom);

      ctx.strokeStyle = C.grid;
      ctx.stroke();
    }

    // PRICE AXIS

    ctx.fillStyle = C.axisBg;

    ctx.fillRect(
      right,
      0,
      axisWidth,
      height
    );

    ctx.strokeStyle = C.border;

    ctx.beginPath();
    ctx.moveTo(right, 0);
    ctx.lineTo(right, height);
    ctx.stroke();

    ctx.font = mobile
      ? "10px system-ui, sans-serif"
      : "11px system-ui, sans-serif";

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = C.axis;

    for (let i = 0; i <= 5; i++) {
      const gridY =
        top +
        (plotHeight / 5) * i;

      ctx.fillText(
        formatPrice(priceAtY(gridY)),
        right + 7,
        gridY
      );
    }

    // FUTURE AREA

    const futureStart =
      x(48) - candleSpacing / 2;

    if (revealedCandles < 5) {
      ctx.fillStyle =
        "rgba(124,255,178,0.025)";

      ctx.fillRect(
        futureStart,
        top,
        right - futureStart,
        plotHeight
      );

      ctx.save();

      ctx.setLineDash([5, 5]);

      ctx.strokeStyle =
        "rgba(124,255,178,0.36)";

      ctx.beginPath();
      ctx.moveTo(futureStart, top);
      ctx.lineTo(futureStart, bottom);
      ctx.stroke();

      ctx.restore();
    }

    // CANDLESTICKS

    ctx.save();

    ctx.beginPath();

    ctx.rect(
      left,
      top,
      plotWidth,
      plotHeight
    );

    ctx.clip();

    for (
      let i = 0;
      i < visibleCount;
      i++
    ) {
      const candle = candles[i];

      const candleX = x(i);

      const bullish =
        candle.close >= candle.open;

      const color =
        bullish ? C.green : C.red;

      const openY = y(candle.open);
      const closeY = y(candle.close);

      const highY = y(candle.high);
      const lowY = y(candle.low);

      // WICK

      ctx.beginPath();

      ctx.moveTo(
        Math.round(candleX) + 0.5,
        highY
      );

      ctx.lineTo(
        Math.round(candleX) + 0.5,
        lowY
      );

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // BODY

      const bodyTop =
        Math.min(openY, closeY);

      const bodyHeight =
        Math.max(
          1.5,
          Math.abs(openY - closeY)
        );

      ctx.fillStyle = color;

      ctx.fillRect(
        candleX - candleWidth / 2,
        bodyTop,
        candleWidth,
        bodyHeight
      );
    }

    ctx.restore();

    // CURRENT PRICE LINE

    const currentCandle =
      visible[visible.length - 1];

    const currentPrice =
      currentCandle.close;

    const currentY =
      y(currentPrice);

    const priceColor =
      currentCandle.close >=
      currentCandle.open
        ? C.green
        : C.red;

    ctx.save();

    ctx.setLineDash([4, 4]);

    ctx.strokeStyle = priceColor;
    ctx.globalAlpha = 0.65;

    ctx.beginPath();
    ctx.moveTo(left, currentY);
    ctx.lineTo(right, currentY);
    ctx.stroke();

    ctx.restore();

    // CURRENT PRICE LABEL

    const labelHeight = 24;

    const labelY = Math.max(
      top,
      Math.min(
        bottom - labelHeight,
        currentY - labelHeight / 2
      )
    );

    ctx.fillStyle = priceColor;

    ctx.fillRect(
      right,
      labelY,
      axisWidth,
      labelHeight
    );

    ctx.fillStyle = "#07110b";

    ctx.font = mobile
      ? "bold 10px system-ui, sans-serif"
      : "bold 11px system-ui, sans-serif";

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillText(
      formatPrice(currentPrice),
      right + 7,
      labelY + labelHeight / 2
    );

    // BOTTOM AXIS

    ctx.fillStyle = "#0c1510";

    ctx.fillRect(
      0,
      bottom,
      right,
      height - bottom
    );

    ctx.strokeStyle = "#263b2c";

    ctx.beginPath();
    ctx.moveTo(0, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    ctx.font =
      "10px system-ui, sans-serif";

    ctx.fillStyle = C.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Synthetic candle indices:
    // these labels represent relative positions,
    // not actual market timestamps.

    const labels = mobile
      ? [
          [5, "-42h"],
          [23, "-24h"],
          [41, "-6h"]
        ]
      : [
          [5, "-42h"],
          [15, "-32h"],
          [25, "-22h"],
          [35, "-12h"],
          [45, "-2h"]
        ];

    labels.forEach(([index, label]) => {
      ctx.fillText(
        label,
        x(index),
        bottom + 15
      );
    });

    // WATERMARK

    ctx.save();

    ctx.font = mobile
      ? "600 10px system-ui, sans-serif"
      : "600 11px system-ui, sans-serif";

    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    ctx.fillStyle =
      "rgba(153,184,163,0.48)";

    ctx.fillText(
      "TRADING ISLAND",
      left + 9,
      top + 10
    );

    ctx.restore();
  }

  // ========================================================
  // UPDATE DISPLAY
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
  // TIMERS
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
  // SUBMIT PREDICTION
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

    // Reveal 5 candles, one by one.

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
    }, 300);
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
  // PERCENTILE
  // ========================================================

  function percentageElement() {
    let element = $("cgPercentile");

    if (!element) {
      element =
        document.createElement("p");

      element.id = "cgPercentile";

      element.style.cssText = `
        font-size:1.1rem;
        font-weight:700;
        color:#7cffb2;
        margin:12px 0;
      `;

      const parent =
        $("finalDetails")?.parentElement ||
        $("results");

      parent.appendChild(element);
    }

    return element;
  }

  // ========================================================
  // SHOW RESULTS
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

    const percentile =
      percentageElement();

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

    if ($("streak")) {
      $("streak").textContent =
        "New challenge every day";
    }

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

    if (
      result.score === 300 &&
      $("finalScore").animate &&
      !window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
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

    loadLeaderboard();
  }

  // ========================================================
  // SAVE SCORE
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
        try {
          const status =
            await callScoreApi("status");

          if (status.completed) {
            const previous =
              loadResult();

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
  // GAME BUTTON EVENTS
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

  // ========================================================
  // SOCIAL SHARING
  // ========================================================

  const SHARE_URL = GAME_URL;
  const SHARE_SIZE = 1080;

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
  // SHARE CARD HELPERS
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
  // CREATE SHARE CARD
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

    // BACKGROUND

    const gradient =
      ctx.createLinearGradient(
        0, 0, 1080, 1350
      );

    gradient.addColorStop(
      0, "#111c17"
    );

    gradient.addColorStop(
      0.5, "#09110d"
    );

    gradient.addColorStop(
      1, "#050807"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
      0, 0, 1080, 1350
    );

    // GLOW

    const glow =
      ctx.createRadialGradient(
        540, 470, 40,
        540, 470, 600
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
      0, 0, 1080, 1050
    );

    // MAIN CARD

    roundedRect(
      ctx,
      70, 75,
      940, 1200,
      38,
      "#101914"
    );

    ctx.strokeStyle = "#284536";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.roundRect(
      70, 75,
      940, 1200,
      38
    );

    ctx.stroke();

    // LOGO

    roundedRect(
      ctx,
      125, 130,
      90, 90,
      22,
      "#7cffb2"
    );

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
      145, 165, 16, 23
    );

    ctx.fillRect(
      175, 157, 16, 24
    );

    // BRANDING

    ctx.textAlign = "left";
    ctx.fillStyle = "#f3fff7";

    ctx.font =
      "bold 42px Arial, sans-serif";

    ctx.fillText(
      "TRADING ISLAND",
      240, 171
    );

    ctx.fillStyle = "#91a99a";

    ctx.font =
      "23px Arial, sans-serif";

    ctx.fillText(
      "CANDLEGUESS",
      242, 209
    );

    // DIVIDER

    ctx.strokeStyle = "#284536";

    ctx.beginPath();
    ctx.moveTo(125, 265);
    ctx.lineTo(955, 265);
    ctx.stroke();

    // DATE

    centeredText(
      ctx,
      `DAILY CHALLENGE · ${result.date}`,
      337,
      "bold 26px Arial, sans-serif",
      "#9eb6a6"
    );

    // SCORE

    centeredText(
      ctx,
      "TODAY'S SCORE",
      438,
      "bold 29px Arial, sans-serif",
      "#9eb6a6"
    );

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

    // ROUND CARDS

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
        x, 775,
        170, 160,
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
        x, 775,
        170, 160,
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

    // PERCENTILE

    if (result.percentile !== null) {
      roundedRect(
        ctx,
        180, 980,
        720, 86,
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

    // FOOTER

    ctx.strokeStyle = "#284536";

    ctx.beginPath();
    ctx.moveTo(125, 1115);
    ctx.lineTo(955, 1115);
    ctx.stroke();

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
  // CANVAS TO BLOB
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
      if (error.name !== "AbortError") {
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
  // SOCIAL BUTTONS
  // ========================================================

  function setupSocialSharing() {
    const oldShareButton = $("share");

    if (!oldShareButton) return;

    if ($("cgSocialButtons")) {
      return;
    }

    const container =
      document.createElement("div");

    container.id = "cgSocialButtons";

    container.style.cssText = `
      display:grid;
      grid-template-columns:
        repeat(2,minmax(0,1fr));
      gap:12px;
      width:100%;
      margin-top:18px;
    `;

    const shareButton =
      document.createElement("button");

    shareButton.type = "button";

    shareButton.textContent =
      "Share Result";

    shareButton.style.cssText = `
      background:#7cffb2;
      color:#07120b;
      border:0;
      border-radius:14px;
      padding:16px 12px;
      font-size:14px;
      font-weight:800;
      cursor:pointer;
      transition:transform .2s,opacity .2s;
    `;

    const copyButton =
      document.createElement("button");

    copyButton.type = "button";

    copyButton.textContent =
      "Copy Score";

    copyButton.style.cssText = `
      background:#18251d;
      color:#e7f7ec;
      border:1px solid #365441;
      border-radius:14px;
      padding:16px 12px;
      font-size:14px;
      font-weight:800;
      cursor:pointer;
      transition:transform .2s,opacity .2s;
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

    oldShareButton.replaceWith(
      container
    );
  }

  // ========================================================
  // GLOBAL LEADERBOARD
  // ========================================================

  function createLeaderboard() {
    let container = $("cgLeaderboard");

    if (container) {
      return container;
    }

    container =
      document.createElement("section");

    container.id = "cgLeaderboard";

    container.style.cssText = `
      background:#101914;
      border:1px solid #284536;
      border-radius:20px;
      padding:24px;
      margin-top:28px;
      color:#f3fff7;
      width:100%;
      box-sizing:border-box;
    `;

    container.innerHTML = `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:20px;
      ">
        <div>
          <h2 style="
            margin:0;
            font-size:22px;
            font-weight:800;
          ">
            Global Leaderboard
          </h2>

          <p style="
            color:#9aafa0;
            font-size:13px;
            margin:7px 0 0;
          ">
            Today's best traders
          </p>
        </div>
      </div>

      <div
        id="cgLeaderboardContent"
        aria-live="polite"
      >
        Loading leaderboard...
      </div>
    `;

    $("results").appendChild(container);

    return container;
  }

  // ========================================================
  // LEADERBOARD ROW
  // ========================================================

  function leaderboardRow(player) {
    const row =
      document.createElement("div");

    row.style.cssText = `
      display:grid;
      grid-template-columns:
        52px minmax(0,1fr) 80px;
      align-items:center;
      gap:10px;
      padding:14px 10px;
      border-bottom:1px solid #26382c;
      border-radius:10px;
      font-size:14px;
      ${
        player.is_you
          ? "background:#173b28;"
          : ""
      }
    `;

    const rank =
      document.createElement("span");

    rank.textContent =
      player.rank === 1
        ? "🥇"
        : player.rank === 2
        ? "🥈"
        : player.rank === 3
        ? "🥉"
        : "#" + player.rank;

    rank.style.fontWeight = "700";

    const name =
      document.createElement("span");

    name.textContent =
      player.is_you
        ? "You"
        : player.name;

    name.style.cssText = `
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font-weight:600;
      color:${
        player.is_you
          ? "#7cffb2"
          : "#eaf4ee"
      };
    `;

    const points =
      document.createElement("span");

    points.textContent =
      player.score + "/300";

    points.style.cssText = `
      text-align:right;
      font-weight:800;
      color:#7cffb2;
    `;

    row.append(
      rank,
      name,
      points
    );

    return row;
  }

  // ========================================================
  // LOAD LEADERBOARD
  // ========================================================

  async function loadLeaderboard() {
    createLeaderboard();

    const content =
      $("cgLeaderboardContent");

    content.textContent =
      "Loading leaderboard...";

    try {
      const data =
        await callScoreApi("leaderboard");

      content.replaceChildren();

      const stats =
        document.createElement("p");

      stats.style.cssText = `
        color:#a1b6a8;
        font-size:13px;
        margin:0 0 16px;
      `;

      stats.textContent =
        `${data.total_players} players today`;

      content.appendChild(stats);

      if (
        !Array.isArray(data.leaderboard) ||
        !data.leaderboard.length
      ) {
        const empty =
          document.createElement("p");

        empty.textContent =
          "No scores yet. Be the first!";

        content.appendChild(empty);

        return;
      }

      const header =
        document.createElement("div");

      header.style.cssText = `
        display:grid;
        grid-template-columns:
          52px minmax(0,1fr) 80px;
        gap:10px;
        padding:8px 10px;
        color:#92a99b;
        font-size:11px;
        font-weight:700;
        text-transform:uppercase;
      `;

      const labels = [
        "Rank",
        "Player",
        "Score"
      ];

      labels.forEach((label, index) => {
        const cell =
          document.createElement("span");

        cell.textContent = label;

        if (index === 2) {
          cell.style.textAlign = "right";
        }

        header.appendChild(cell);
      });

      content.appendChild(header);

      data.leaderboard.forEach(player => {
        content.appendChild(
          leaderboardRow(player)
        );
      });

      if (
        data.your_rank !== null &&
        data.your_rank !== undefined
      ) {
        const yourRank =
          document.createElement("div");

        yourRank.style.cssText = `
          margin-top:18px;
          padding:15px;
          border:1px solid #347d54;
          background:#153323;
          border-radius:12px;
          text-align:center;
          color:#7cffb2;
          font-weight:800;
        `;

        yourRank.textContent =
          `Your global rank: #${data.your_rank}` +
          ` · ${data.your_score}/300`;

        content.appendChild(yourRank);
      }

    } catch (error) {
      console.error(error);

      content.textContent =
        "Leaderboard unavailable. Please try again.";
    }
  }

  // ========================================================
  // RESPONSIVE CHART
  // ========================================================

  let resizeFrame = null;

  window.addEventListener(
    "resize",
    () => {
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        drawChart();
      });
    }
  );

  // ========================================================
  // INITIALIZE
  // ========================================================

  async function initialize() {
    clearOldResults();

    setupSocialSharing();

    $("long").disabled = true;
    $("short").disabled = true;

    $("next").hidden = true;

    showNotice(
      "Checking today's challenge..."
    );

    try {
      const status =
        await callScoreApi("status");

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

      try {
        localStorage.removeItem(
          storageKey(date)
        );
      } catch {}

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
