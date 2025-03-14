// Wechsel zwischen Login & Sign-In
document.getElementById("show-signin").addEventListener("click", function () {
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("signin-form").classList.remove("hidden");
});

document.getElementById("show-login").addEventListener("click", function () {
  document.getElementById("signin-form").classList.add("hidden");
  document.getElementById("login-form").classList.remove("hidden");
});

// Login-Button Funktion
document.getElementById("login-btn").addEventListener("click", function () {
  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("profile-edit-container").classList.remove("hidden");
});

// Funktion für das Wechseln zwischen den Tabs
function showTab(tabName) {
  const tabs = document.querySelectorAll(".tab-content");
  const tabButtons = document.querySelectorAll(".tab-button");

  tabs.forEach((tab) => {
    tab.classList.remove("active");
  });

  tabButtons.forEach((button) => {
    button.classList.remove("active");
  });

  document.querySelector(`.${tabName}-tab`).classList.add("active");
  document
    .querySelector(`.tab-button[onclick="showTab('${tabName}')"]`)
    .classList.add("active");
}

// Profilbild hochladen
const fileInput = document.getElementById("file-upload");
const urlInput = document.getElementById("url-input");
const profileImg = document.getElementById("profile-img");

fileInput.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      profileImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

urlInput.addEventListener("input", function () {
  const url = urlInput.value;
  if (url) {
    profileImg.src = url;
  }
});
