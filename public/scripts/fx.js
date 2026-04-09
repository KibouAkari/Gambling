(function initCasinoFx(global) {
  const state = {
    audioContext: null,
    ambientStarted: false,
  };

  function getAudioContext() {
    if (!state.audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return null;
      }
      state.audioContext = new Ctx();
    }
    return state.audioContext;
  }

  function tone(frequency, duration, type, volume, delay) {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    const startAt = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type || "sine";
    osc.frequency.setValueAtTime(frequency, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume || 0.07, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  function play(kind) {
    if (kind === "spin") {
      tone(210, 0.08, "triangle", 0.04, 0);
      tone(280, 0.08, "triangle", 0.04, 0.06);
      return;
    }

    if (kind === "lose") {
      tone(180, 0.12, "sawtooth", 0.03, 0);
      tone(120, 0.14, "sawtooth", 0.03, 0.08);
      return;
    }

    if (kind === "win") {
      tone(460, 0.12, "triangle", 0.08, 0);
      tone(620, 0.14, "triangle", 0.08, 0.09);
      tone(780, 0.16, "triangle", 0.08, 0.18);
      return;
    }

    if (kind === "jackpot") {
      tone(420, 0.12, "square", 0.09, 0);
      tone(560, 0.12, "square", 0.1, 0.09);
      tone(740, 0.12, "square", 0.11, 0.18);
      tone(940, 0.22, "square", 0.11, 0.3);
    }
  }

  function flash(duration) {
    const overlay = document.createElement("div");
    overlay.className = "fx-flash";
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
    }, duration || 260);
  }

  function burst(x, y, count) {
    const total = count || 28;
    for (let i = 0; i < total; i += 1) {
      const particle = document.createElement("span");
      particle.className = "fx-particle";
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty("--dx", `${(Math.random() - 0.5) * 260}px`);
      particle.style.setProperty("--dy", `${(Math.random() - 0.8) * 220}px`);
      particle.style.setProperty("--dr", `${(Math.random() - 0.5) * 320}deg`);
      particle.style.background = i % 2 === 0 ? "#ffd166" : "#ff595e";
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 900);
    }
  }

  function celebrate(isJackpot) {
    const centerX = Math.round(window.innerWidth / 2);
    const centerY = Math.round(window.innerHeight / 2);
    burst(centerX, centerY, isJackpot ? 60 : 30);
    flash(isJackpot ? 420 : 220);
    play(isJackpot ? "jackpot" : "win");
  }

  function initAmbient() {
    if (state.ambientStarted || !document.body) {
      return;
    }
    state.ambientStarted = true;

    const layer = document.createElement("div");
    layer.className = "ambient-layer";
    for (let i = 0; i < 10; i += 1) {
      const chip = document.createElement("span");
      chip.className = "ambient-chip";
      chip.style.left = `${Math.random() * 100}%`;
      chip.style.animationDelay = `${Math.random() * 8}s`;
      chip.style.animationDuration = `${8 + Math.random() * 8}s`;
      layer.appendChild(chip);
    }
    document.body.appendChild(layer);
  }

  global.CasinoFX = {
    play,
    flash,
    burst,
    celebrateWin() {
      celebrate(false);
    },
    celebrateJackpot() {
      celebrate(true);
    },
    initAmbient,
  };
})(window);
