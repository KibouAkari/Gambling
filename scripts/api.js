const CASINO_STATE_KEY = "mongo-casino-state-v1";

const defaultState = {
	coins: 1000,
	username: "",
	profileImage:
		"https://static.vecteezy.com/system/resources/previews/023/465/688/non_2x/contact-dark-mode-glyph-ui-icon-address-book-profile-page-user-interface-design-white-silhouette-symbol-on-black-space-solid-pictogram-for-web-mobile-isolated-illustration-vector.jpg",
	email: "",
	bio: "",
	hasAccount: false,
	isLoggedIn: false,
	password: "",
};

function readState() {
	try {
		const raw = localStorage.getItem(CASINO_STATE_KEY);
		if (!raw) {
			return { ...defaultState };
		}

		const parsed = JSON.parse(raw);
		return { ...defaultState, ...parsed };
	} catch (_error) {
		return { ...defaultState };
	}
}

function writeState(nextState) {
	localStorage.setItem(CASINO_STATE_KEY, JSON.stringify(nextState));
	document.dispatchEvent(new CustomEvent("casino:state-change", { detail: nextState }));
}

const CasinoStore = {
	getState() {
		return readState();
	},

	setState(patch) {
		const nextState = { ...readState(), ...patch };
		writeState(nextState);
		return nextState;
	},

	formatCoins(value) {
		return `₥ ${Math.max(0, Math.floor(value)).toLocaleString("de-DE")}`;
	},

	getCoins() {
		return readState().coins;
	},

	addCoins(amount) {
		const coins = readState().coins + Math.max(0, amount);
		return this.setState({ coins });
	},

	spendCoins(amount) {
		const state = readState();
		if (state.coins < amount) {
			return null;
		}

		return this.setState({ coins: state.coins - amount });
	},

	isAccountReady() {
		const state = readState();
		return state.hasAccount && state.isLoggedIn;
	},

	registerAccount(payload) {
		const username = (payload.username || "").trim();
		const email = (payload.email || "").trim();
		const password = (payload.password || "").trim();

		if (!username || !email || !password) {
			return { ok: false, message: "Bitte alle Felder ausfüllen." };
		}

		this.setState({
			hasAccount: true,
			isLoggedIn: true,
			username,
			email,
			password,
		});
		return { ok: true };
	},

	loginAccount(payload) {
		const state = readState();
		const username = (payload.username || "").trim();
		const password = (payload.password || "").trim();

		if (!state.hasAccount) {
			return { ok: false, message: "Bitte zuerst einen Account erstellen." };
		}

		if (username !== state.username || password !== state.password) {
			return { ok: false, message: "Login fehlgeschlagen. Bitte Daten prüfen." };
		}

		this.setState({ isLoggedIn: true });
		return { ok: true };
	},

	logout() {
		this.setState({ isLoggedIn: false });
	},

	requireAccount(options) {
		const state = readState();
		if (state.hasAccount && state.isLoggedIn) {
			return true;
		}

		if (options && options.withOverlay) {
			const root = document.body;
			if (!root.querySelector(".access-gate")) {
				const gate = document.createElement("section");
				gate.className = "access-gate";
				gate.innerHTML = `
				  <div class="access-gate-card">
				    <h2>🔒 Account erforderlich</h2>
				    <p>Bitte erstelle zuerst einen Account, bevor du Coins kaufen oder Games spielen kannst.</p>
				    <a class="btn" href="/profile.html">Jetzt Account erstellen</a>
				  </div>
				`;
				root.appendChild(gate);
			}
		}

		return false;
	},
};

function highlightActiveRoute() {
	const page = document.body.dataset.page;
	if (!page) {
		return;
	}

	const routeLink = document.querySelector(`[data-route="${page}"]`);
	if (routeLink) {
		routeLink.classList.add("is-active");
	}
}

function updateCoinViews() {
	const state = CasinoStore.getState();
	const text = state.hasAccount ? CasinoStore.formatCoins(state.coins) : "Account nötig";
	document.querySelectorAll("#coin-balance, [data-coins-view]").forEach((node) => {
		node.textContent = text;
	});

	document.querySelectorAll("[data-user-view]").forEach((node) => {
		node.textContent = state.username || "Gast";
	});
}

async function loadNavbar() {
	const placeholder = document.getElementById("navbar-placeholder");
	if (!placeholder) {
		return;
	}

	let response;
	try {
		response = await fetch("/navbar.html");
		if (!response.ok) {
			response = await fetch("/public/navbar.html");
			if (!response.ok) {
				response = await fetch("navbar.html");
			}
		}
	} catch (_error) {
		response = await fetch("navbar.html");
	}

	const markup = await response.text();
	placeholder.innerHTML = markup;
	highlightActiveRoute();
	updateCoinViews();

	const logoutButton = document.getElementById("logout-button");
	if (logoutButton) {
		logoutButton.addEventListener("click", (event) => {
			event.preventDefault();
			CasinoStore.logout();
			window.location.href = "/profile.html";
		});
	}
}

document.addEventListener("casino:state-change", updateCoinViews);

document.addEventListener("DOMContentLoaded", () => {
	loadNavbar();
	if (window.CasinoFX) {
		window.CasinoFX.initAmbient();
	}
});

window.CasinoStore = CasinoStore;
window.loadNavbar = loadNavbar;
