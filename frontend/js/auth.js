import { supabase } from "./supabase.js";

const currentPage = window.location.pathname
  .split("/")
  .pop()
  .toLowerCase();

const form = document.querySelector("form.auth-form");

function getTextValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function getPasswordValue(id) {
  return document.getElementById(id)?.value || "";
}

function getSubmitButton() {
  return form?.querySelector("button[type='submit']");
}

function setLoading(isLoading, loadingText = "Memproses...") {
  const button = getSubmitButton();

  if (!button) return;

  if (!button.dataset.originalText) {
    button.dataset.originalText = button.textContent;
  }

  button.disabled = isLoading;

  button.textContent = isLoading
    ? loadingText
    : button.dataset.originalText;
}

function getMessageElement() {
  let messageElement = document.getElementById("auth-message");

  if (!messageElement && form) {
    messageElement = document.createElement("p");
    messageElement.id = "auth-message";
    messageElement.setAttribute("role", "alert");

    messageElement.style.marginTop = "12px";
    messageElement.style.fontSize = "13px";
    messageElement.style.textAlign = "center";

    form.appendChild(messageElement);
  }

  return messageElement;
}

function showMessage(message, isError = false) {
  const messageElement = getMessageElement();

  if (!messageElement) {
    window.alert(message);
    return;
  }

  messageElement.textContent = message;
  messageElement.style.color = isError
    ? "#b42318"
    : "#067647";
}

function clearMessage() {
  const messageElement = document.getElementById("auth-message");

  if (messageElement) {
    messageElement.textContent = "";
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSafeErrorMessage(error, defaultMessage) {
  console.error("Supabase Auth Error:", error);

  const message = error?.message?.toLowerCase() || "";

  if (
    message.includes("email signups are disabled") ||
    error?.code === "email_provider_disabled"
  ) {
    return "Pendaftaran email belum diaktifkan pada Supabase.";
  }

  if (message.includes("invalid login credentials")) {
    return "Email atau kata sandi salah.";
  }

  if (message.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Periksa kotak masuk email.";
  }

  if (message.includes("user already registered")) {
    return "Email tersebut sudah terdaftar.";
  }

  if (message.includes("password")) {
    return "Kata sandi belum memenuhi persyaratan.";
  }

  if (message.includes("rate limit")) {
    return "Terlalu banyak permintaan. Tunggu beberapa saat.";
  }

  return defaultMessage;
}

/*
 * REGISTER
 */
async function handleRegister(event) {
  event.preventDefault();
  clearMessage();

  const name = getTextValue("name");
  const email = getTextValue("email").toLowerCase();
  const password = getPasswordValue("password");
  const confirmation = getPasswordValue("confirm-password");

  if (!name || !email || !password || !confirmation) {
    showMessage("Semua data wajib diisi.", true);
    return;
  }

  if (!isValidEmail(email)) {
    showMessage("Format email tidak valid.", true);
    return;
  }

  if (password.length < 8) {
    showMessage("Kata sandi minimal 8 karakter.", true);
    return;
  }

  if (password !== confirmation) {
    showMessage("Konfirmasi kata sandi tidak sama.", true);
    return;
  }

  const termsCheckbox = form.querySelector(
    "input[type='checkbox']"
  );

  if (termsCheckbox && !termsCheckbox.checked) {
    showMessage(
      "Anda harus menyetujui syarat dan ketentuan.",
      true
    );
    return;
  }

  try {
    setLoading(true, "Mendaftarkan...");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          display_name: name
        },

        emailRedirectTo:
          `${window.location.origin}/login.html`
      }
    });

    if (error) {
      throw error;
    }

    /*
     * Jika Confirm Email dimatikan,
     * session langsung tersedia.
     */
    if (data.session) {
      showMessage("Registrasi berhasil.");

      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 800);

      return;
    }

    /*
     * Jika Confirm Email diaktifkan,
     * pengguna harus membuka email dahulu.
     */
    form.reset();

    showMessage(
      "Registrasi berhasil. Periksa email untuk melakukan konfirmasi."
    );
  } catch (error) {
    showMessage(
      getSafeErrorMessage(error, "Registrasi gagal."),
      true
    );
  } finally {
    setLoading(false);
  }
}

/*
 * LOGIN
 */
async function handleLogin(event) {
  event.preventDefault();
  clearMessage();

  const email = getTextValue("email").toLowerCase();
  const password = getPasswordValue("password");

  if (!email || !password) {
    showMessage(
      "Email dan kata sandi wajib diisi.",
      true
    );
    return;
  }

  if (!isValidEmail(email)) {
    showMessage("Format email tidak valid.", true);
    return;
  }

  try {
    setLoading(true, "Memasuki akun...");

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    showMessage("Login berhasil.");

    window.setTimeout(() => {
      window.location.href = "index.html";
    }, 600);
  } catch (error) {
    showMessage(
      getSafeErrorMessage(
        error,
        "Login tidak berhasil."
      ),
      true
    );
  } finally {
    setLoading(false);
  }
}

/*
 * FORGOT PASSWORD
 */
async function handleForgotPassword(event) {
  event.preventDefault();
  clearMessage();

  const email = getTextValue("email").toLowerCase();

  if (!email) {
    showMessage("Masukkan email terlebih dahulu.", true);
    return;
  }

  if (!isValidEmail(email)) {
    showMessage("Format email tidak valid.", true);
    return;
  }

  try {
    setLoading(true, "Mengirim tautan...");

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${window.location.origin}/update-password.html`
        }
      );

    if (error) {
      throw error;
    }

    form.reset();

    /*
     * Jangan memberitahukan apakah email terdaftar.
     * Ini mencegah orang menebak akun pengguna.
     */
    showMessage(
      "Jika email terdaftar, tautan pemulihan akan dikirim."
    );
  } catch (error) {
    showMessage(
      getSafeErrorMessage(
        error,
        "Permintaan reset kata sandi gagal."
      ),
      true
    );
  } finally {
    setLoading(false);
  }
}

/*
 * LOGOUT
 * Dapat dipanggil oleh halaman lain menggunakan:
 * logout()
 */
window.logout = async function logout(event) {
  event?.preventDefault();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout gagal:", error);
    window.alert("Logout gagal. Silakan coba kembali.");
  }
};

/*
 * Tombol lihat/sembunyikan password.
 * Tetap kompatibel dengan HTML tim.
 */
window.togglePassword = function togglePassword(id, button) {
  const input = document.getElementById(id);

  if (!input) return;

  input.type =
    input.type === "password" ? "text" : "password";

  const icon = button?.querySelector("i");

  if (icon) {
    icon.classList.toggle("fa-eye");
    icon.classList.toggle("fa-eye-slash");
  }
};

/*
 * Menentukan fungsi berdasarkan halaman.
 */
if (form) {
  if (currentPage.includes("register")) {
    form.addEventListener("submit", handleRegister);
  } else if (currentPage.includes("forgot-password")) {
    form.addEventListener(
      "submit",
      handleForgotPassword
    );
  } else if (currentPage.includes("login")) {
    form.addEventListener("submit", handleLogin);
  }
}
