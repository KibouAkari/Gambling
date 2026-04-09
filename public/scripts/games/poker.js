const pokerStatus = document.getElementById("poker-status");
const pokerCoins = document.getElementById("poker-coins");
const pokerBet = document.getElementById("poker-bet");
const pokerDealBtn = document.getElementById("poker-deal");
const pokerDrawBtn = document.getElementById("poker-draw");
const pokerCards = document.getElementById("poker-cards");
const pokerBetUp = document.getElementById("poker-bet-up");
const pokerBetDown = document.getElementById("poker-bet-down");

const pokerBets = [25, 50, 100, 250, 500, 1000];
const suits = ["S", "H", "D", "C"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
let pokerBetIndex = 1;
let deck = [];
let hand = [];
let holds = [false, false, false, false, false];
let inDrawPhase = false;

const payouts = {
  "Royal Flush": 250,
  "Straight Flush": 50,
  "Four of a Kind": 25,
  "Full House": 9,
  Flush: 6,
  Straight: 4,
  "Three of a Kind": 3,
  "Two Pair": 2,
  "Jacks or Better": 1,
};

function buildDeck() {
  deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ value, suit });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function drawCard() {
  return deck.pop();
}

function handRanks(cards) {
  const numbers = cards.map((card) => values.indexOf(card.value)).sort((a, b) => a - b);
  const counts = {};
  cards.forEach((card) => {
    counts[card.value] = (counts[card.value] || 0) + 1;
  });

  const groups = Object.values(counts).sort((a, b) => b - a);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straight = numbers.every((num, i) => i === 0 || num === numbers[i - 1] + 1) ||
    JSON.stringify(numbers) === JSON.stringify([0, 1, 2, 3, 12]);

  const royal = flush && [8, 9, 10, 11, 12].every((rank) => numbers.includes(rank));

  if (royal) return "Royal Flush";
  if (straight && flush) return "Straight Flush";
  if (groups[0] === 4) return "Four of a Kind";
  if (groups[0] === 3 && groups[1] === 2) return "Full House";
  if (flush) return "Flush";
  if (straight) return "Straight";
  if (groups[0] === 3) return "Three of a Kind";
  if (groups[0] === 2 && groups[1] === 2) return "Two Pair";
  if (groups[0] === 2) {
    const pairCard = Object.entries(counts).find((entry) => entry[1] === 2)[0];
    if (["J", "Q", "K", "A"].includes(pairCard)) {
      return "Jacks or Better";
    }
  }

  return "No Win";
}

function renderHand() {
  pokerCards.innerHTML = "";
  hand.forEach((card, index) => {
    const cardNode = document.createElement("button");
    cardNode.type = "button";
    cardNode.className = `poker-card ${holds[index] ? "is-held" : ""}`;
    cardNode.innerHTML = `<strong>${card.value}</strong><span>${card.suit}</span>`;
    cardNode.addEventListener("click", () => {
      if (!inDrawPhase) {
        return;
      }
      holds[index] = !holds[index];
      renderHand();
    });
    pokerCards.appendChild(cardNode);
  });
}

function refreshInfo(text) {
  pokerBet.textContent = CasinoStore.formatCoins(pokerBets[pokerBetIndex]);
  pokerCoins.textContent = CasinoStore.formatCoins(CasinoStore.getCoins());
  pokerStatus.textContent = text;
}

function deal() {
  const bet = pokerBets[pokerBetIndex];
  if (!CasinoStore.spendCoins(bet)) {
    CasinoFX.play("lose");
    refreshInfo("Nicht genug Coins.");
    return;
  }

  CasinoFX.play("spin");
  buildDeck();
  holds = [false, false, false, false, false];
  hand = [drawCard(), drawCard(), drawCard(), drawCard(), drawCard()];
  inDrawPhase = true;
  pokerDealBtn.disabled = true;
  pokerDrawBtn.disabled = false;
  renderHand();
  refreshInfo("Karten halten und Draw klicken.");
}

function draw() {
  if (!inDrawPhase) {
    return;
  }

  for (let i = 0; i < hand.length; i += 1) {
    if (!holds[i]) {
      hand[i] = drawCard();
    }
  }

  inDrawPhase = false;
  pokerDealBtn.disabled = false;
  pokerDrawBtn.disabled = true;
  renderHand();

  const result = handRanks(hand);
  const baseBet = pokerBets[pokerBetIndex];
  const multiplier = payouts[result] || 0;
  const win = baseBet * multiplier;

  if (win > 0) {
    CasinoStore.addCoins(win);
    if (multiplier >= 50) {
      CasinoFX.celebrateJackpot();
    } else {
      CasinoFX.celebrateWin();
    }
    refreshInfo(`${result}! Gewinn: ${CasinoStore.formatCoins(win)}.`);
  } else {
    CasinoFX.play("lose");
    refreshInfo("Leider kein Gewinn. Neue Runde?");
  }
}

function initPoker() {
  if (!CasinoStore.requireAccount({ withOverlay: true })) {
    pokerDealBtn.disabled = true;
    pokerDrawBtn.disabled = true;
    pokerBetDown.disabled = true;
    pokerBetUp.disabled = true;
    refreshInfo("Bitte zuerst Account erstellen und einloggen.");
    return;
  }

  pokerDealBtn.addEventListener("click", deal);
  pokerDrawBtn.addEventListener("click", draw);

  pokerBetDown.addEventListener("click", () => {
    if (pokerBetIndex > 0 && !inDrawPhase) {
      pokerBetIndex -= 1;
      refreshInfo("Einsatz reduziert.");
    }
  });

  pokerBetUp.addEventListener("click", () => {
    if (pokerBetIndex < pokerBets.length - 1 && !inDrawPhase) {
      pokerBetIndex += 1;
      refreshInfo("Einsatz erhoht.");
    }
  });

  pokerDrawBtn.disabled = true;
  refreshInfo("Deal starten fur deine erste Hand.");
}

initPoker();
