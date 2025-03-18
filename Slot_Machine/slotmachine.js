const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WHITE = "#FFFFFF";
const BLACK = "#000000";
const GREEN = "#00FF00";
const RED = "#FF0000";
const YELLOW = "#FFFF00";
const BLUE = "#5050FF";
const PURPLE = "#800080";
const CYAN = "#00FFFF";

const MONEY = "₥";

// Symbole und Wahrscheinlichkeiten
const symbols = ['A', 'Q', 'K', 'J', '§', 'E', '7'];
const weights = [30, 30, 30, 30, 30, 30, 10];

// Slot-Spinner-Einstellungen
let numReels = 5; // Anzahl Walzen
let reelHeight = 3; // Anzahl der sichtbaren Symbole pro Walze

// Dynamische Schriftgrößen berechnen
let fontSize = Math.floor(canvas.width / 10); // Größere Schrift für bessere Lesbarkeit
let smallFontSize = Math.floor(canvas.width / 30);

// Schriftarten laden
ctx.textAlign = "center";
ctx.textBaseline = "middle";

// Funktion zur Bestimmung der Farbe eines Symbols
function getSymbolColor(symbol) {
    if (symbol === '7') return RED;
    if (symbol === 'J') return YELLOW;
    if (symbol === 'Q') return BLUE;
    if (symbol === 'K') return GREEN;
    if (symbol === 'A') return WHITE;
    if (symbol === '§') return PURPLE;
    if (symbol === 'E') return CYAN;
    return WHITE;
}

// Funktion zur Anzeige der Walzen
function drawReels(reels) {
    const reelWidth = Math.floor(canvas.width / (numReels + 4));
    const reelGap = 20;
    const symbolHeight = Math.floor(canvas.height / (reelHeight + 2));

    // Berechnung der x-Position der Walzen, zentriert
    const totalWidth = reelWidth * numReels + reelGap * (numReels - 1);
    const xOffset = (canvas.width - totalWidth) / 2;

    // Rechtecke hinter den Walzen zeichnen
    for (let i = 0; i < numReels; i++) {
        const rectX = xOffset + i * (reelWidth + reelGap);
        const rectY = Math.floor(canvas.height / 3);
        const rectWidth = reelWidth;
        const rectHeight = symbolHeight * reelHeight;
        ctx.fillStyle = "#323232";
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
    }

    // Symbole auf den Walzen zeichnen
    for (let i = 0; i < numReels; i++) {
        for (let j = 0; j < reelHeight; j++) {
            const symbol = reels[i][j];
            const color = getSymbolColor(symbol);
            ctx.fillStyle = color;
            ctx.fillText(symbol, xOffset + i * (reelWidth + reelGap) + reelWidth / 2, Math.floor(canvas.height / 3) + j * symbolHeight + symbolHeight / 2);
        }
    }
}

// Funktion zur Simulation eines Spins
function spinReels() {
    return Array.from({ length: numReels }, () => 
        Array.from({ length: reelHeight }, () => symbols[Math.floor(Math.random() * symbols.length)])
    );
}

// Funktion zur Überprüfung auf Gewinne
function checkWin(reels, bet) {
    const winCombinations = [];
    for (let row = 0; row < reelHeight; row++) {
        let col = 0;
        while (col < numReels) {
            let combination = [];
            const currentSymbol = reels[col][row];
            const startCol = col;
            while (col < numReels && reels[col][row] === currentSymbol) {
                combination.push(currentSymbol);
                col++;
            }
            if (combination.length >= 3) {
                const symbol = combination[0];
                const winAmount = symbol === '7' ? bet * [15, 60, 240][combination.length - 3] : bet * [1.25, 5, 20][combination.length - 3];
                winCombinations.push({ combination, winAmount });
            }
            col = startCol + combination.length;
        }
    }
    return winCombinations;
}

// Funktion zum Zeichnen des Kontostands
function drawBalance(balance) {
    ctx.fillStyle = WHITE;
    ctx.font = `${smallFontSize}px "Segoe UI Emoji", sans-serif`;
    ctx.fillText(`Kontostand: ${balance.toFixed(2)}${MONEY}`, 10, 50);
}

// Funktion zum Zeichnen der Verluste
function drawLoss(bet) {
    ctx.fillStyle = RED;
    ctx.fillText(`Verlust: ${bet.toFixed(2)}${MONEY}`, 10, 90);
}

// Funktion zum Zeichnen der Gewinne
function drawWins(winCombinations) {
    let yPosition = 90;
    ctx.fillStyle = GREEN;
    winCombinations.forEach(({ combination, winAmount }) => {
        ctx.fillText(`Gewinn: ${combination.join(' ')} | Gewinnbetrag: ${winAmount.toFixed(2)} ${MONEY}`, 10, yPosition);
        yPosition += 40;
    });
}

// Funktion zum Zeichnen des Einsatzes
function drawBet(bet) {
    ctx.fillStyle = WHITE;
    ctx.fillText(`Einsatz: ${bet.toFixed(2)}${MONEY}`, canvas.width - 500, 50);
}

// Funktion zum Zeichnen der Pfeile
function drawArrows() {
    ctx.font = "50px 'Segoe UI Emoji', sans-serif";
    ctx.fillStyle = WHITE;
    ctx.fillText("<", canvas.width - 210, 90);
    ctx.fillText(">", canvas.width - 120, 90);
}

// Funktion zur Anpassung der Fenstergröße
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    fontSize = Math.floor(canvas.width / 10);
    smallFontSize = Math.floor(canvas.width / 30);
    ctx.font = `${fontSize}px "Segoe UI Emoji", sans-serif`;
}

// Spiel Schleife
function gameLoop() {
    let reels = spinReels();
    let balance = 100.0;
    const betOptions = [0.20, 0.50, 1.0, 2.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0, 10000.0, 25000.0, 50000.0, 100000.0, 250000.0, 500000.0];
    let betIndex = 1;
    let bet = betOptions[betIndex];
    let spinInProgress = false;
    let winCombinations = [];

    // Eventlistener für Fenstergröße
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Eventlistener für Tasteneingaben
    document.addEventListener("keydown", (event) => {
        if (event.key === " " && !spinInProgress && balance >= bet) {
            balance -= bet;
            spinInProgress = true;
            reels = spinReels();
            winCombinations = checkWin(reels, bet);
            if (winCombinations.length > 0) {
                winCombinations.forEach(({ winAmount }) => {
                    balance += winAmount;
                });
            }
        }
        if (event.key === "ArrowLeft" && betIndex > 0) {
            betIndex--;
            bet = betOptions[betIndex];
        }
        if (event.key === "ArrowRight" && betIndex < betOptions.length - 1) {
            betIndex++;
            bet = betOptions[betIndex];
        }
    });

    // Eventlistener für Klick auf Pfeile
    canvas.addEventListener("click", (event) => {
        const mouseX = event.clientX;
        const mouseY = event.clientY;

        if (mouseX >= canvas.width - 210 && mouseX <= canvas.width - 160 && mouseY >= 30 && mouseY <= 80) {
            if (betIndex > 0) {
                betIndex--;
                bet = betOptions[betIndex];
            }
        } else if (mouseX >= canvas.width - 120 && mouseX <= canvas.width - 70 && mouseY >= 30 && mouseY <= 80) {
            if (betIndex < betOptions.length - 1) {
                betIndex++;
                bet = betOptions[betIndex];
            }
        }
    });

    // Game loop
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawReels(reels);
        drawBalance(balance);
        drawBet(bet);

        if (winCombinations.length > 0) {
            drawWins(winCombinations);
        } else {
            drawLoss(bet);
        }

        drawArrows();

        if (spinInProgress) {
            spinInProgress = false;
        }

        requestAnimationFrame(loop);
    }

    loop();
}

gameLoop();
