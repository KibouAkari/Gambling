document.addEventListener("DOMContentLoaded", () => {
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

  const fileInput = document.getElementById("file-upload");
  const urlInput = document.getElementById("url-input");
  const profileImg = document.getElementById("profile-img");

  const stored = CasinoStore.getState();
  usernameInput.value = stored.username || "";
  emailInput.value = stored.email || "";
  bioInput.value = stored.bio || "";
  profileImg.src = stored.profileImage;

  function openProfileEditor() {
    authContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    profileContainer.classList.add("fade-in");
  }

  function saveProfileImage(src) {
    profileImg.src = src;
    CasinoStore.setState({ profileImage: src });
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

  loginBtn.addEventListener("click", () => {
    const loginUsername = document.getElementById("login-username").value.trim();
    if (!loginUsername) {
      authFeedback.textContent = "Bitte gib einen Username ein.";
      return;
    }

    CasinoStore.setState({ username: loginUsername });
    usernameInput.value = loginUsername;
    authFeedback.textContent = "";
    openProfileEditor();
  });

  signInBtn.addEventListener("click", () => {
    const signInUsername = document.getElementById("signin-username").value.trim();
    const signInEmail = document.getElementById("signin-email").value.trim();

    if (!signInUsername || !signInEmail) {
      authFeedback.textContent = "Bitte Username und E-Mail angeben.";
      return;
    }

    CasinoStore.setState({ username: signInUsername, email: signInEmail });
    usernameInput.value = signInUsername;
    emailInput.value = signInEmail;
    authFeedback.textContent = "";
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

  userForm.addEventListener("submit", (event) => {
    event.preventDefault();
    CasinoStore.setState({
      username: usernameInput.value.trim(),
      email: emailInput.value.trim(),
      bio: bioInput.value.trim(),
    });
  });

  payForm.addEventListener("submit", (event) => {
    event.preventDefault();
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

  if (stored.username && stored.username !== "Guest") {
    openProfileEditor();
  }
});
