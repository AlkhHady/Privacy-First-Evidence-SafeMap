import "../css/global.css";
import "../css/auth.css";
import { supabase } from "./supabase.js";

const navbarGuest = document.getElementById("navbar-guest");
const navbarUser = document.getElementById("navbar-user");

function displayName(user) {
  return user.user_metadata?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "Pengguna";
}

async function renderSession() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    if (navbarGuest) navbarGuest.style.display = "flex";
    if (navbarUser) navbarUser.style.display = "none";
    return;
  }
  if (navbarGuest) navbarGuest.style.display = "none";
  if (navbarUser) navbarUser.style.display = "flex";
  const nameElement = navbarUser?.querySelector(".nav-username");
  if (nameElement) {
    nameElement.textContent = `Hai, ${displayName(user)}`;
    nameElement.title = user.email || "";
  }
}

window.toggleUserMenu = function toggleUserMenu(event) {
  event.stopPropagation();
  event.currentTarget.classList.toggle("open");
};

document.addEventListener("click", function (event) {
  const userMenu = document.querySelector(".nav-user");
  if (userMenu && !userMenu.contains(event.target)) userMenu.classList.remove("open");
});

window.logout = async function logout(event) {
  event?.preventDefault();
  const { error } = await supabase.auth.signOut();
  if (error) {
    window.alert("Logout gagal. Silakan coba kembali.");
    return;
  }
  window.location.href = "index.html";
};

renderSession();

supabase.auth.onAuthStateChange(() => {
  renderSession();
});
