const rouletteStatus = document.getElementById("roulette-status");
const rouletteCoins = document.getElementById("roulette-coins");
const rouletteResult = document.getElementById("roulette-result");
const rouletteSpinBtn = document.getElementById("roulette-spin");
const rouletteWheel = document.getElementById("roulette-wheel");
const rouletteBetAmount = document.getElementById("roulette-bet-amount");
const rouletteBetType = document.getElementById("roulette-bet-type");
const rouletteNumber = document.getElementById("roulette-number");

let spinningRoulette = false;
let wheelRotation = 0;

const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function colorOfNumber(number) {
  if (number === 0) {
    return "green";
  }
  return redNumbers.has(number) ? "red" : "black";
}

function payoutMultiplier(type, rolled, selectedNumber) {
  const color = colorOfNumber(rolled);
  if (type === "number") {
    return Number(selectedNumber) === rolled ? 35 : 0;
  }
  if (type === "red") {
    return color === "red" ? 2 : 0;
  }
  if (type === "black") {
    return color === "black" ? 2 : 0;
  }
  if (type === "odd") {
    return rolled !== 0 && rolled % 2 === 1 ? 2 : 0;
  }
  if (type === "even") {
    return rolled !== 0 && rolled % 2 === 0 ? 2 : 0;
  }
  return 0;
}

function updateRouletteInfo(text) {
  rouletteCoins.textContent = CasinoStore.formatCoins(CasinoStore.getCoins());
  rouletteStatus.textContent = text;
}

function spinRoulette() {
  if (spinningRoulette) {
    return;
  }

  const bet = Number(rouletteBetAmount.value || 0);
  if (!Number.isFinite(bet) || bet < 10) {
    updateRouletteInfo("Mindesteinsatz ist 10.");
    return;
  }

  if (!CasinoStore.spendCoins(bet)) {
    CasinoFX.play("lose");
    updateRouletteInfo("Nicht genug Coins fur den Einsatz.");
    return;
  }

  spinningRoulette = true;
  rouletteSpinBtn.disabled = true;
  CasinoFX.play("spin");

  const rolled = Math.floor(Math.random() * 37);
  const rotationAdd = 1800 + Math.random() * 720;
  wheelRotation += rotationAdd;
  rouletteWheel.style.transform = `rotate(${wheelRotation}deg)`;

  setTimeout(() => {
    const type = rouletteBetType.value;
    const multiplier = payoutMultiplier(type, rolled, rouletteNumber.value);
    const win = multiplier > 0 ? bet * multiplier : 0;

    const color = colorOfNumber(rolled);
    rouletteResult.textContent = `${rolled} (${color.toUpperCase()})`;

    if (win > 0) {
      CasinoStore.addCoins(win);
      if (multiplier >= 35) {
        CasinoFX.celebrateJackpot();
      } else {
        CasinoFX.celebrateWin();
      }
      updateRouletteInfo(`Gewinn ${CasinoStore.formatCoins(win)} bei ${type}.`);
    } else {
      CasinoFX.play("lose");
      updateRouletteInfo(`Kein Gewinn. Ergebnis: ${rolled} (${color}).`);
    }

    spinningRoulette = false;
    rouletteSpinBtn.disabled = false;
  }, 3200);
}

rouletteBetType.addEventListener("change", () => {
  rouletteNumber.disabled = rouletteBetType.value !== "number";
});
rouletteSpinBtn.addEventListener("click", spinRoulette);
rouletteNumber.disabled = rouletteBetType.value !== "number";
updateRouletteInfo("Setze auf Farbe, Gerade/Ungerade oder Zahl.");
