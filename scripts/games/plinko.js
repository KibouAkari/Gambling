const plinkoCanvas = document.getElementById("plinko-canvas");
const plinkoCtx = plinkoCanvas.getContext("2d");
const plinkoDropBtn = document.getElementById("plinko-drop");
const plinkoStatus = document.getElementById("plinko-status");
const plinkoBet = document.getElementById("plinko-bet");
const plinkoCoins = document.getElementById("plinko-coins");

const plinkoRows = 9;
const plinkoBins = [0.4, 0.8, 1.2, 1.8, 3, 6, 3, 1.8, 1.2, 0.8, 0.4];
let ball = null;
let animating = false;

function resizePlinko() {
  plinkoCanvas.width = plinkoCanvas.clientWidth;
  plinkoCanvas.height = 470;
}

function updatePlinkoInfo(text) {
  plinkoCoins.textContent = CasinoStore.formatCoins(CasinoStore.getCoins());
  plinkoStatus.textContent = text;
}

function drawBoard() {
  plinkoCtx.clearRect(0, 0, plinkoCanvas.width, plinkoCanvas.height);

  for (let row = 0; row < plinkoRows; row += 1) {
    const count = row + 4;
    for (let i = 0; i < count; i += 1) {
      const spacing = plinkoCanvas.width / (count + 1);
      const x = spacing * (i + 1);
      const y = 70 + row * 34;
      plinkoCtx.beginPath();
      plinkoCtx.arc(x, y, 4, 0, Math.PI * 2);
      plinkoCtx.fillStyle = "#b6c3e8";
      plinkoCtx.fill();
    }
  }

  const binWidth = plinkoCanvas.width / plinkoBins.length;
  for (let i = 0; i < plinkoBins.length; i += 1) {
    const x = i * binWidth;
    const multiplier = plinkoBins[i];
    const hot = multiplier >= 3;
    plinkoCtx.fillStyle = hot ? "rgba(255, 80, 96, 0.75)" : "rgba(31, 73, 129, 0.7)";
    plinkoCtx.fillRect(x + 2, plinkoCanvas.height - 58, binWidth - 4, 56);
    plinkoCtx.fillStyle = "#f6fbff";
    plinkoCtx.font = "bold 13px Arial";
    plinkoCtx.textAlign = "center";
    plinkoCtx.fillText(`${multiplier}x`, x + binWidth / 2, plinkoCanvas.height - 26);
  }

  if (ball) {
    plinkoCtx.beginPath();
    plinkoCtx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
    plinkoCtx.fillStyle = "#ffd166";
    plinkoCtx.fill();
  }
}

function animateBall(bet) {
  if (!ball) {
    return;
  }

  ball.y += ball.vy;
  ball.vy += 0.16;

  const step = Math.floor((ball.y - 70) / 34);
  if (step > ball.lastStep && step < plinkoRows) {
    ball.lastStep = step;
    ball.x += (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 9);
    ball.x = Math.max(10, Math.min(plinkoCanvas.width - 10, ball.x));
  }

  if (ball.y >= plinkoCanvas.height - 72) {
    const bin = Math.max(0, Math.min(plinkoBins.length - 1, Math.floor((ball.x / plinkoCanvas.width) * plinkoBins.length)));
    const multi = plinkoBins[bin];
    const win = Math.floor(bet * multi);

    if (win > 0) {
      CasinoStore.addCoins(win);
      if (multi >= 6) {
        CasinoFX.celebrateJackpot();
      } else if (multi >= 1.2) {
        CasinoFX.celebrateWin();
      } else {
        CasinoFX.play("lose");
      }
      updatePlinkoInfo(`Ball in ${multi}x Feld. Auszahlung: ${CasinoStore.formatCoins(win)}.`);
    }

    ball = null;
    animating = false;
    plinkoDropBtn.disabled = false;
    drawBoard();
    return;
  }

  drawBoard();
  requestAnimationFrame(() => animateBall(bet));
}

function dropBall() {
  if (animating) {
    return;
  }

  const bet = Number(plinkoBet.value || 0);
  if (!Number.isFinite(bet) || bet < 10) {
    updatePlinkoInfo("Mindesteinsatz ist 10.");
    return;
  }

  if (!CasinoStore.spendCoins(bet)) {
    CasinoFX.play("lose");
    updatePlinkoInfo("Nicht genug Coins fur den Einsatz.");
    return;
  }

  CasinoFX.play("spin");
  animating = true;
  plinkoDropBtn.disabled = true;
  ball = {
    x: plinkoCanvas.width / 2,
    y: 35,
    vy: 1.4,
    lastStep: -1,
  };

  updatePlinkoInfo("Ball lauft... bitte warten.");
  animateBall(bet);
}

window.addEventListener("resize", () => {
  resizePlinko();
  drawBoard();
});

plinkoDropBtn.addEventListener("click", dropBall);
resizePlinko();
drawBoard();
updatePlinkoInfo("Drop starten und Multiplikatoren jagen.");
