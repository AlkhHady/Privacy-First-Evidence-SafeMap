import { supabase } from "./supabase.js";

function displayName(user) {
  return user.user_metadata?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "Pengguna";
}

function setProtectedNavigationVisibility(navigation, isAuthenticated) {
  navigation
    .querySelectorAll('a[href="evidence.html"], a[href="reports.html"]')
    .forEach(link => {
      link.hidden = !isAuthenticated;
    });
}

async function renderSessionControl() {
  const navigation = document.querySelector(".navigation");
  if (!navigation) return;

  const { data: { user }, error } = await supabase.auth.getUser();
  setProtectedNavigationVisibility(navigation, Boolean(user) && !error);

  if (error || !user) {
    const loginLink = document.createElement("a");
    loginLink.href = "login.html";
    loginLink.textContent = "Masuk";
    navigation.appendChild(loginLink);
    return;
  }

  const userLabel = document.createElement("span");
  userLabel.className = "session-user";
  userLabel.textContent = `✓ ${displayName(user)}`;
  userLabel.title = user.email || "";

  const logoutButton = document.createElement("button");
  logoutButton.className = "session-logout";
  logoutButton.type = "button";
  logoutButton.textContent = "Keluar";
  logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;
    const { error: logoutError } = await supabase.auth.signOut({ scope: "local" });

    if (logoutError) {
      logoutButton.disabled = false;
      window.alert("Logout gagal. Silakan coba kembali.");
      return;
    }

    window.location.href = "index.html";
  });

  navigation.append(userLabel, logoutButton);
}

renderSessionControl();
