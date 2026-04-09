document.addEventListener("DOMContentLoaded", async () => {
  if (!window.CasinoStore) {
    return;
  }

  const authContainer = document.getElementById("auth-container");
  const profileContainer = document.getElementById("profile-edit-container");
  const loginForm = document.getElementById("login-form");
  const signInForm = document.getElementById("signin-form");
  const showSignIn = document.getElementById("show-signin");
  const showLogin = document.getElementById("show-login");
  const loginBtn = document.getElementById("login-btn");
  const signInBtn = document.getElementById("signin-btn");
  const authFeedback = document.getElementById("auth-feedback");

  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const bioInput = document.getElementById("bio");
  const userForm = document.getElementById("user-form");
  const payForm = document.getElementById("pay-form");
  const creditCardInput = document.getElementById("creditcard");
  const expiryInput = document.getElementById("expiry-date");

  const fileInput = document.getElementById("file-upload");
  const urlInput = document.getElementById("url-input");
  const profileImg = document.getElementById("profile-img");

  const stored = CasinoStore.getState();
  usernameInput.value = stored.username || "";
  emailInput.value = stored.email || "";
  bioInput.value = stored.bio || "";
  profileImg.src = stored.profileImage;

  if (stored.paymentMethod && creditCardInput) {
    creditCardInput.value = stored.paymentMethod;
  }

  function openProfileEditor() {
    authContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    profileContainer.classList.add("fade-in");
  }

  function openAuthView() {
    profileContainer.classList.add("hidden");
    authContainer.classList.remove("hidden");
  }

  function saveProfileImage(src) {
    profileImg.src = src;
    CasinoStore.syncProfile({ profileImage: src }).catch(() => {});
  }

  showSignIn.addEventListener("click", (event) => {
    event.preventDefault();
    loginForm.classList.add("hidden");
    signInForm.classList.remove("hidden");
  });

  showLogin.addEventListener("click", (event) => {
    event.preventDefault();
    signInForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  });

  loginBtn.addEventListener("click", async () => {
    const loginUsername = document.getElementById("login-username").value.trim();
    const loginPassword = document.getElementById("login-password").value.trim();
    const response = await CasinoStore.loginAccount({
      username: loginUsername,
      password: loginPassword,
    });

    if (!response.ok) {
      authFeedback.textContent = response.message;
      return;
    }

    const next = CasinoStore.getState();
    authFeedback.textContent = "";
    usernameInput.value = next.username;
    emailInput.value = next.email;
    bioInput.value = next.bio;
    profileImg.src = next.profileImage;
    usernameInput.value = loginUsername;
    openProfileEditor();
  });

  signInBtn.addEventListener("click", async () => {
    const signInUsername = document.getElementById("signin-username").value.trim();
    const signInEmail = document.getElementById("signin-email").value.trim();
    const signInPassword = document.getElementById("signin-password").value.trim();

    const response = await CasinoStore.registerAccount({
      username: signInUsername,
      email: signInEmail,
      password: signInPassword,
    });

    if (!response.ok) {
      authFeedback.textContent = response.message;
      return;
    }

    authFeedback.textContent = "";
    usernameInput.value = signInUsername;
    emailInput.value = signInEmail;
    openProfileEditor();
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tabTarget;

      document.querySelectorAll(".tab-button").forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");

      document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active");
      });

      const targetNode = document.querySelector(`.${target}`);
      if (targetNode) {
        targetNode.classList.add("active");
      }
    });
  });

  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await CasinoStore.syncProfile({
      username: usernameInput.value.trim(),
      email: emailInput.value.trim(),
      bio: bioInput.value.trim(),
    });
  });

  payForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const card = (creditCardInput?.value || "").replace(/\s+/g, "").trim();
    const expiry = (expiryInput?.value || "").trim();
    const masked = card.length >= 4 ? `**** **** **** ${card.slice(-4)}${expiry ? ` (${expiry})` : ""}` : "";

    await CasinoStore.syncProfile({ paymentMethod: masked });
  });

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      if (typeof loadEvent.target?.result === "string") {
        saveProfileImage(loadEvent.target.result);
      }
    };
    reader.readAsDataURL(file);
  });

  urlInput.addEventListener("change", () => {
    const url = urlInput.value.trim();
    if (url) {
      saveProfileImage(url);
    }
  });

  await CasinoStore.refreshSession();
  const current = CasinoStore.getState();

  if (current.hasAccount && current.isLoggedIn) {
    openProfileEditor();
    usernameInput.value = current.username || "";
    emailInput.value = current.email || "";
    bioInput.value = current.bio || "";
    profileImg.src = current.profileImage;
    if (current.paymentMethod && creditCardInput) {
      creditCardInput.value = current.paymentMethod;
    }
  } else {
    openAuthView();
  }
});
