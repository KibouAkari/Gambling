const CASINO_STATE_KEY = "mongo-casino-state-v1";

const defaultState = {
	coins: 1000,
	username: "Guest",
	profileImage:
		"https://static.vecteezy.com/system/resources/previews/023/465/688/non_2x/contact-dark-mode-glyph-ui-icon-address-book-profile-page-user-interface-design-white-silhouette-symbol-on-black-space-solid-pictogram-for-web-mobile-isolated-illustration-vector.jpg",
	email: "",
	bio: "",
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
	const coins = CasinoStore.getCoins();
	const text = CasinoStore.formatCoins(coins);
	document.querySelectorAll("#coin-balance, [data-coins-view]").forEach((node) => {
		node.textContent = text;
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
			response = await fetch("navbar.html");
		}
	} catch (_error) {
		response = await fetch("navbar.html");
	}

	const markup = await response.text();
	placeholder.innerHTML = markup;
	highlightActiveRoute();
	updateCoinViews();
}

document.addEventListener("casino:state-change", updateCoinViews);

window.CasinoStore = CasinoStore;
window.loadNavbar = loadNavbar;
