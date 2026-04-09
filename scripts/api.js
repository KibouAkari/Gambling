const CASINO_STATE_KEY = "mongo-casino-state-v2";

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
	authProvider: "local",
	sessionToken: "",
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

async function requestApi(path, options = {}) {
	const state = readState();
	const response = await fetch(path, {
		method: options.method || "GET",
		headers: {
			"Content-Type": "application/json",
			...(options.token || state.sessionToken
				? { Authorization: `Bearer ${options.token || state.sessionToken}` }
				: {}),
		},
		body: options.body ? JSON.stringify(options.body) : undefined,
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok || payload.ok === false) {
		throw new Error(payload.message || "API-Fehler");
	}

	return payload;
}

function normalizeRemoteUser(user) {
	return {
		username: user?.username || "",
		email: user?.email || "",
		bio: user?.bio || "",
		profileImage: user?.profileImage || defaultState.profileImage,
		coins: typeof user?.coins === "number" ? user.coins : 1000,
	};
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
		const state = readState();
		const next = this.setState({ coins: state.coins + Math.max(0, amount) });
		this.syncProfile({ coins: next.coins }).catch(() => {});
		return next;
	},

	spendCoins(amount) {
		const state = readState();
		if (state.coins < amount) {
			return null;
		}

		const next = this.setState({ coins: state.coins - amount });
		this.syncProfile({ coins: next.coins }).catch(() => {});
		return next;
	},

	isAccountReady() {
		const state = readState();
		return state.hasAccount && state.isLoggedIn;
	},

	async registerAccount(payload) {
		const username = String(payload.username || "").trim();
		const email = String(payload.email || "").trim();
		const password = String(payload.password || "").trim();

		if (!username || !email || !password) {
			return { ok: false, message: "Bitte alle Felder ausfüllen." };
		}

		try {
			const response = await requestApi("/api/auth/register", {
				method: "POST",
				body: { username, email, password },
			});

			const remoteUser = normalizeRemoteUser(response.user);
			this.setState({
				...remoteUser,
				hasAccount: true,
				isLoggedIn: true,
				authProvider: "blob",
				sessionToken: response.token || "",
				password: "",
			});
			return { ok: true };
		} catch (_error) {
			// Fallback for local preview/dev without serverless deployment.
			this.setState({
				hasAccount: true,
				isLoggedIn: true,
				username,
				email,
				password,
				authProvider: "local",
			});
			return { ok: true };
		}
	},

	async loginAccount(payload) {
		const state = readState();
		const username = String(payload.username || "").trim();
		const password = String(payload.password || "").trim();

		if (!username || !password) {
			return { ok: false, message: "Bitte Username und Passwort eingeben." };
		}

		try {
			const response = await requestApi("/api/auth/login", {
				method: "POST",
				body: { username, password },
			});

			const remoteUser = normalizeRemoteUser(response.user);
			this.setState({
				...remoteUser,
				hasAccount: true,
				isLoggedIn: true,
				authProvider: "blob",
				sessionToken: response.token || "",
				password: "",
			});
			return { ok: true };
		} catch (_error) {
			if (!state.hasAccount) {
				return { ok: false, message: "Bitte zuerst einen Account erstellen." };
			}
			if (username !== state.username || password !== state.password) {
				return { ok: false, message: "Login fehlgeschlagen. Bitte Daten prüfen." };
			}

			this.setState({ isLoggedIn: true, authProvider: "local" });
			return { ok: true };
		}
	},

	async logout() {
		const state = readState();
		if (state.authProvider === "blob" && state.sessionToken) {
			try {
				await requestApi("/api/auth/login", {
					method: "POST",
					body: { action: "logout" },
					token: state.sessionToken,
				});
			} catch (_error) {
				// Ignore remote logout failures and still clear local session.
			}
		}

		this.setState({ isLoggedIn: false, sessionToken: "" });
	},

	async refreshSession() {
		const state = readState();
		if (!state.sessionToken) {
			return false;
		}

		try {
			const response = await requestApi("/api/auth/me", {
				method: "GET",
				token: state.sessionToken,
			});
			const remoteUser = normalizeRemoteUser(response.user);
			this.setState({
				...remoteUser,
				hasAccount: true,
				isLoggedIn: true,
				authProvider: "blob",
			});
			return true;
		} catch (_error) {
			this.setState({ isLoggedIn: false, sessionToken: "" });
			return false;
		}
	},

	async syncProfile(patch) {
		const state = this.setState(patch);
		if (state.authProvider !== "blob" || !state.sessionToken) {
			return { ok: true };
		}

		try {
			await requestApi("/api/auth/me", {
				method: "POST",
				body: patch,
				token: state.sessionToken,
			});
			return { ok: true };
		} catch (_error) {
			return { ok: false };
		}
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
						<h2>Account erforderlich</h2>
						<p>Bitte erstelle zuerst einen Account, bevor du Coins kaufen oder Games spielen kannst.</p>
						<a class="btn" href="/profile.html">Jetzt registrieren</a>
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
	const isReady = state.hasAccount && state.isLoggedIn;
	const text = isReady ? CasinoStore.formatCoins(state.coins) : "Account nötig";

	document.querySelectorAll("#coin-balance, [data-coins-view]").forEach((node) => {
		node.textContent = text;
	});

	document.querySelectorAll("[data-user-view]").forEach((node) => {
		node.textContent = isReady ? state.username : "Gast";
	});

	document.querySelectorAll('[data-auth="guest"]').forEach((node) => {
		node.style.display = isReady ? "none" : "inline-flex";
	});

	document.querySelectorAll('[data-auth="user"]').forEach((node) => {
		node.style.display = isReady ? "inline-flex" : "none";
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
		logoutButton.addEventListener("click", async (event) => {
			event.preventDefault();
			await CasinoStore.logout();
			window.location.href = "/profile.html";
		});
	}
}

document.addEventListener("casino:state-change", updateCoinViews);

document.addEventListener("DOMContentLoaded", async () => {
	await loadNavbar();
	await CasinoStore.refreshSession();
	updateCoinViews();

	if (window.CasinoFX) {
		window.CasinoFX.initAmbient();
	}
});

window.CasinoStore = CasinoStore;
window.loadNavbar = loadNavbar;
