import { supabase } from "./supabase.js";

function getValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function showMessage(message, isError = false) {
  const element = document.getElementById("message");

  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "#b42318" : "#067647";
}

function setLoading(button, loading) {
  if (!button) return;

  button.disabled = loading;
  button.textContent = loading
    ? "Memproses..."
    : button.dataset.defaultText;
}

const registerForm = document.getElementById("register-form");

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = getValue("register-name");
  const email = getValue("register-email").toLowerCase();
  const password = getValue("register-password");
  const confirmation = getValue("register-password-confirmation");
  const button = registerForm.querySelector("button[type='submit']");

  button.dataset.defaultText ||= button.textContent;

  if (!name || !email || !password) {
    showMessage("Semua data wajib diisi", true);
    return;
  }

  if (password.length < 8) {
    showMessage("Password minimal 8 karakter", true);
    return;
  }

  if (password !== confirmation) {
    showMessage("Password salah", true);
    return;
  }

  try {
    setLoading(button, true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name
        },
        emailRedirectTo: `${window.location.origin}/login.html`
      }
    });

    if (error) throw error;

    if (data.session) {
      window.location.href = "index.html";
      return;
    }

    registerForm.reset();
    showMessage("Registrasi berhasil. Periksa email untuk konfirmasi.");
  } catch (error) {
    showMessage(error.message || "Registrasi gagal.", true);
  } finally {
    setLoading(button, false);
  }
});

const loginForm = document.getElementById("login-form");

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = getValue("login-email").toLowerCase();
  const password = getValue("login-password");
  const button = loginForm.querySelector("button[type='submit']");

  button.dataset.defaultText ||= button.textContent;

  if (!email || !password) {
    showMessage("Email dan password wajib diisi.", true);
    return;
  }

  try {
    setLoading(button, true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    window.location.href = "index.html";
  } catch {
    showMessage("Email atau password salah.", true);
  } finally {
    setLoading(button, false);
  }
});

const forgotForm = document.getElementById("forgot-form");

forgotForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = getValue("forgot-email").toLowerCase();
  const button = forgotForm.querySelector("button[type='submit']");

  button.dataset.defaultText ||= button.textContent;

  if (!email) {
    showMessage("Masukkan email terlebih dahulu.", true);
    return;
  }

  try {
    setLoading(button, true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/update-password.html`
      }
    );

    if (error) throw error;

    forgotForm.reset();

    showMessage(
      "Jika email terdaftar, tautan pemulihan akan dikirim."
    );
  } catch {
    showMessage("Permintaan tidak dapat diproses.", true);
  } finally {
    setLoading(button, false);
  }
});

const updatePasswordForm =
  document.getElementById("update-password-form");

updatePasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = getValue("new-password");
  const confirmation = getValue("new-password-confirmation");
  const button =
    updatePasswordForm.querySelector("button[type='submit']");

  button.dataset.defaultText ||= button.textContent;

  if (password.length < 8) {
    showMessage("Password minimal 8 karakter.", true);
    return;
  }

  if (password !== confirmation) {
    showMessage("Konfirmasi password tidak sama.", true);
    return;
  }

  try {
    setLoading(button, true);

    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) throw error;

    showMessage("Password berhasil diperbarui.");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
  } catch (error) {
    showMessage(error.message || "Password gagal diperbarui.", true);
  } finally {
    setLoading(button, false);
  }
});

document
  .getElementById("logout-button")
  ?.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      showMessage("Logout gagal.", true);
      return;
    }

    window.location.href = "login.html";
  });
