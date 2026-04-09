const CASINO_STATE_KEY = "mongo-casino-state-v2";

const defaultState = {
	coins: 1000,
	username: "",
	profileImage:
		"https://static.vecteezy.com/system/resources/previews/023/465/688/non_2x/contact-dark-mode-glyph-ui-icon-address-book-profile-page-user-interface-design-white-silhouette-symbol-on-black-space-solid-pictogram-for-web-mobile-isolated-illustration-vector.jpg",
	email: "",
	bio: "",
	paymentMethod: "",
	dateOfBirth: "",
	hasAccount: false,
	isLoggedIn: false,
	password: "",
	authProvider: "local",
	sessionToken: "",
};

const FALLBACK_NAVBAR_HTML = `
<aside class="left-rail fade-in">
	<a href="/index.html" class="rail-brand" aria-label="Mongo Casino Home">
		<span class="rail-brand-mark">MC</span>
		<strong>MONGO-CASINO</strong>
	</a>

	<div class="rail-search-wrap">
		<input type="search" class="rail-search" placeholder="Search games..." aria-label="Search games" />
	</div>

	<nav class="rail-nav" aria-label="Sidebar navigation">
		<a href="/index.html" data-route="index"><span class="rail-icon">◆</span> Casino</a>
		<a href="/games/slot.html"><span class="rail-icon">◇</span> Slots</a>
		<a href="/games/poker.html"><span class="rail-icon">♣</span> Poker</a>
		<a href="/games/roulette.html"><span class="rail-icon">◎</span> Roulette</a>
		<a href="/games/plinko.html"><span class="rail-icon">●</span> Plinko</a>
		<a href="/games.html" data-route="games"><span class="rail-icon">▦</span> All Games</a>
		<a href="/buy-coins.html" data-route="buy-coins"><span class="rail-icon">₥</span> Buy MongoCoins</a>
		<a href="#" data-auth="guest" data-open-auth="signup"><span class="rail-icon">◍</span> Create Account</a>
	</nav>
</aside>

<header class="top-bar fade-in">
	<div class="top-bar-actions">
		<button class="header-btn ghost" data-auth="guest" data-open-auth="signup" type="button">Sign Up</button>
		<button class="header-btn outline" data-auth="guest" data-open-auth="login" type="button">Log In</button>
		<a href="/buy-coins.html" class="coins" id="coin-balance" title="Mongocoins" data-auth="user">₥ 1,000</a>

		<div class="avatar-menu" data-auth="user">
			<button class="avatar-button" id="avatar-menu-toggle" type="button" aria-label="Profile menu">
				<img
					id="top-avatar"
					src="https://static.vecteezy.com/system/resources/previews/023/465/688/non_2x/contact-dark-mode-glyph-ui-icon-address-book-profile-page-user-interface-design-white-silhouette-symbol-on-black-space-solid-pictogram-for-web-mobile-isolated-illustration-vector.jpg"
					alt="Profile Picture"
					class="avatar"
				/>
			</button>
			<div class="avatar-dropdown hidden" id="avatar-dropdown">
				<p><strong data-user-view>Gast</strong></p>
				<p class="muted-line" id="dropdown-email">Keine E-Mail hinterlegt</p>
				<p class="muted-line" id="dropdown-payment">Kein Zahlungsweg gespeichert</p>
				<label class="avatar-upload-btn" for="top-avatar-upload">Profilbild andern</label>
				<input id="top-avatar-upload" type="file" accept="image/*" class="hidden" />
				<a href="#" class="dropdown-link" data-open-auth="login">Account offnen</a>
			</div>
		</div>

		<a href="#" class="logout-link" id="logout-button" data-auth="user">Logout</a>
	</div>
</header>
`;

async function fetchTextIfOk(path) {
	try {
		const response = await fetch(path);
		if (!response.ok) {
			return null;
		}
		return await response.text();
	} catch (_error) {
		return null;
	}
}

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
	let response;
	try {
		response = await fetch(path, {
		method: options.method || "GET",
		headers: {
			"Content-Type": "application/json",
			...(options.token || state.sessionToken
				? { Authorization: `Bearer ${options.token || state.sessionToken}` }
				: {}),
		},
		body: options.body ? JSON.stringify(options.body) : undefined,
		});
	} catch (_error) {
		throw new Error("NETWORK_UNAVAILABLE");
	}

	const payload = await response.json().catch(() => ({}));
	if (!response.ok || payload.ok === false) {
		throw new Error(payload.message || "API_ERROR");
	}

	return payload;
}

function normalizeRemoteUser(user) {
	return {
		username: user?.username || "",
		email: user?.email || "",
		bio: user?.bio || "",
		paymentMethod: user?.paymentMethod || "",
		dateOfBirth: user?.dateOfBirth || "",
		profileImage: user?.profileImage || defaultState.profileImage,
		coins: typeof user?.coins === "number" ? user.coins : 1000,
	};
}

function ensureAuthModal() {
	if (document.getElementById("auth-modal")) {
		return;
	}

	const modal = document.createElement("section");
	modal.id = "auth-modal";
	modal.className = "auth-modal hidden";
	modal.innerHTML = `
		<div class="auth-modal-shell">
			<button class="auth-close" type="button" id="auth-modal-close" aria-label="Close">×</button>
			<div class="auth-left">
				<h3>WELCOME BONUS</h3>
				<p>200% BONUS UP TO 1 BTC</p>
			</div>
			<div class="auth-right">
				<h2 id="auth-modal-title">Sign up for a new account</h2>
				<form id="auth-signup-form" class="auth-form">
					<label>Email*</label>
					<input id="auth-signup-email" type="email" placeholder="ex. name@email.com" required />
					<label>Username*</label>
					<input id="auth-signup-username" type="text" placeholder="ex. Name_123" required />
					<label>Password*</label>
					<input id="auth-signup-password" type="password" placeholder="Enter your password" required />
					<label>Date of birth*</label>
					<input id="auth-signup-dob" type="date" required />
					<label>Promo Code (optional)</label>
					<input id="auth-signup-promo" type="text" placeholder="Promo code" />
					<button type="submit" class="btn auth-submit">Sign Up</button>
					<p class="auth-note">Already a member? <a href="#" id="modal-switch-login">Log in</a></p>
				</form>
				<form id="auth-login-form" class="auth-form hidden">
					<label>Username*</label>
					<input id="auth-login-username" type="text" placeholder="Username" required />
					<label>Password*</label>
					<input id="auth-login-password" type="password" placeholder="Password" required />
					<button type="submit" class="btn auth-submit">Log In</button>
					<p class="auth-note">No account yet? <a href="#" id="modal-switch-signup">Sign up</a></p>
				</form>
				<p id="auth-modal-feedback" class="auth-feedback"></p>
			</div>
		</div>
	`;

	document.body.appendChild(modal);

	const closeButton = modal.querySelector("#auth-modal-close");
	closeButton?.addEventListener("click", () => modal.classList.add("hidden"));
	modal.addEventListener("click", (event) => {
		if (event.target === modal) {
			modal.classList.add("hidden");
		}
	});

	const signupForm = modal.querySelector("#auth-signup-form");
	const loginForm = modal.querySelector("#auth-login-form");
	const feedback = modal.querySelector("#auth-modal-feedback");
	const title = modal.querySelector("#auth-modal-title");

	function openMode(mode) {
		const isSignup = mode !== "login";
		signupForm?.classList.toggle("hidden", !isSignup);
		loginForm?.classList.toggle("hidden", isSignup);
		if (title) {
			title.textContent = isSignup ? "Sign up for a new account" : "Log in to your account";
		}
		if (feedback) {
			feedback.textContent = "";
		}
	}

	modal.querySelector("#modal-switch-login")?.addEventListener("click", (event) => {
		event.preventDefault();
		openMode("login");
	});
	modal.querySelector("#modal-switch-signup")?.addEventListener("click", (event) => {
		event.preventDefault();
		openMode("signup");
	});

	signupForm?.addEventListener("submit", async (event) => {
		event.preventDefault();
		const response = await CasinoStore.registerAccount({
			email: modal.querySelector("#auth-signup-email")?.value || "",
			username: modal.querySelector("#auth-signup-username")?.value || "",
			password: modal.querySelector("#auth-signup-password")?.value || "",
			dateOfBirth: modal.querySelector("#auth-signup-dob")?.value || "",
			promoCode: modal.querySelector("#auth-signup-promo")?.value || "",
		});

		if (!response.ok) {
			if (feedback) {
				feedback.textContent = response.message;
			}
			return;
		}

		modal.classList.add("hidden");
		updateCoinViews();
	});

	loginForm?.addEventListener("submit", async (event) => {
		event.preventDefault();
		const response = await CasinoStore.loginAccount({
			username: modal.querySelector("#auth-login-username")?.value || "",
			password: modal.querySelector("#auth-login-password")?.value || "",
		});

		if (!response.ok) {
			if (feedback) {
				feedback.textContent = response.message;
			}
			return;
		}

		modal.classList.add("hidden");
		updateCoinViews();
	});

	window.openAuthModal = (mode) => {
		openMode(mode || "signup");
		modal.classList.remove("hidden");
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
		const dateOfBirth = String(payload.dateOfBirth || "").trim();

		if (!username || !email || !password) {
			return { ok: false, message: "Bitte alle Felder ausfüllen." };
		}

		try {
			const response = await requestApi("/api/auth/register", {
				method: "POST",
				body: {
					username,
					email,
					password,
					dateOfBirth,
					promoCode: String(payload.promoCode || "").trim(),
				},
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
			if (_error?.message !== "NETWORK_UNAVAILABLE") {
				return { ok: false, message: _error?.message || "Registrierung fehlgeschlagen." };
			}

			// Fallback for local preview/dev without reachable serverless deployment.
			this.setState({
				hasAccount: true,
				isLoggedIn: true,
				username,
				email,
				dateOfBirth,
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
			if (_error?.message !== "NETWORK_UNAVAILABLE") {
				return { ok: false, message: _error?.message || "Login fehlgeschlagen." };
			}

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
						<button class="btn" type="button" data-open-auth="signup">Jetzt registrieren</button>
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

	const avatarImage = document.getElementById("top-avatar");
	if (avatarImage) {
		avatarImage.src = state.profileImage || defaultState.profileImage;
	}

	const emailLine = document.getElementById("dropdown-email");
	if (emailLine) {
		emailLine.textContent = state.email || "Keine E-Mail hinterlegt";
	}

	const paymentLine = document.getElementById("dropdown-payment");
	if (paymentLine) {
		paymentLine.textContent = state.paymentMethod || "Kein Zahlungsweg gespeichert";
	}
}

async function loadNavbar() {
	const placeholder = document.getElementById("navbar-placeholder");
	if (!placeholder) {
		return;
	}

	const markup =
		(await fetchTextIfOk("/navbar.html")) ||
		(await fetchTextIfOk("../navbar.html")) ||
		(await fetchTextIfOk("/public/navbar.html")) ||
		(await fetchTextIfOk("navbar.html")) ||
		FALLBACK_NAVBAR_HTML;

	placeholder.innerHTML = markup;
	highlightActiveRoute();
	updateCoinViews();

	const railSearch = document.querySelector(".rail-search");
	if (railSearch) {
		railSearch.addEventListener("keydown", (event) => {
			if (event.key !== "Enter") {
				return;
			}

			event.preventDefault();
			const query = railSearch.value.trim();
			if (query) {
				window.location.href = `/games.html?q=${encodeURIComponent(query)}`;
			} else {
				window.location.href = "/games.html";
			}
		});
	}

	ensureAuthModal();

	document.querySelectorAll("[data-open-auth]").forEach((button) => {
		button.addEventListener("click", (event) => {
			event.preventDefault();
			const mode = button.getAttribute("data-open-auth") || "signup";
			if (window.openAuthModal) {
				window.openAuthModal(mode);
			}
		});
	});

	const avatarToggle = document.getElementById("avatar-menu-toggle");
	const avatarDropdown = document.getElementById("avatar-dropdown");
	if (avatarToggle && avatarDropdown) {
		avatarToggle.addEventListener("click", () => {
			avatarDropdown.classList.toggle("hidden");
		});

		document.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) {
				return;
			}
			if (!target.closest(".avatar-menu")) {
				avatarDropdown.classList.add("hidden");
			}
		});
	}

	const avatarUpload = document.getElementById("top-avatar-upload");
	if (avatarUpload) {
		avatarUpload.addEventListener("change", (event) => {
			const file = event.target?.files?.[0];
			if (!file) {
				return;
			}

			const reader = new FileReader();
			reader.onload = (loadEvent) => {
				const result = loadEvent.target?.result;
				if (typeof result === "string") {
					CasinoStore.syncProfile({ profileImage: result }).catch(() => {});
				}
			};
			reader.readAsDataURL(file);
		});
	}

	const logoutButton = document.getElementById("logout-button");
	if (logoutButton) {
		logoutButton.addEventListener("click", async (event) => {
			event.preventDefault();
			await CasinoStore.logout();
			updateCoinViews();
			if (window.openAuthModal) {
				window.openAuthModal("login");
			}
		});
	}
}

document.addEventListener("casino:state-change", updateCoinViews);

document.addEventListener("DOMContentLoaded", async () => {
	const isEmbed = new URLSearchParams(window.location.search).get("embed") === "1";
	const authMode = new URLSearchParams(window.location.search).get("auth");
	if (isEmbed) {
		document.body.classList.add("embed-mode");
	} else {
		await loadNavbar();
		await CasinoStore.refreshSession();
		updateCoinViews();
		if (authMode === "login" || authMode === "signup") {
			window.openAuthModal?.(authMode);
		}
	}

	if (window.CasinoFX && !isEmbed) {
		window.CasinoFX.initAmbient();
	}
});

window.CasinoStore = CasinoStore;
window.loadNavbar = loadNavbar;
