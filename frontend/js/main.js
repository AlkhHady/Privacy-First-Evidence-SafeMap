import "../css/global.css";
import "../css/auth.css";

console.log('🚀 Ruang Aman - Vite dev server running!');

// ============================================================
//  KONFIGURASI SESSION
// ============================================================
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 hari

const USERS_KEY = 'ruangAman_users';
const SESSION_KEY = 'ruangAman_session';

// ============================================================
//  USER DATABASE (localStorage)
// ============================================================
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUserByEmail(email) {
  return getUsers().find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}

// ============================================================
//  SESSION MANAGEMENT (dengan expiry 7 hari)
// ============================================================
function setSession(user) {
  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    loginAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);

    // Cek expired
    if (!session.expiresAt || Date.now() > session.expiresAt) {
      console.log('⏰ Session expired, silakan login ulang.');
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    // Sliding expiry — perpanjang 7 hari lagi
    session.expiresAt = Date.now() + SESSION_DURATION;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ============================================================
//  NAVBAR SWITCHER
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const navbarGuest = document.getElementById('navbar-guest');
  const navbarUser = document.getElementById('navbar-user');

  if (!navbarGuest && !navbarUser) return;

  const session = getSession();

  if (session) {
    if (navbarGuest) navbarGuest.style.display = 'none';
    if (navbarUser) {
      navbarUser.style.display = 'flex';
      const nameEl = navbarUser.querySelector('.nav-username');
      if (nameEl) {
        const firstName = session.name.split(' ')[0];
        nameEl.textContent = `Hai, ${firstName}`;
      }
    }
  } else {
    if (navbarGuest) navbarGuest.style.display = 'flex';
    if (navbarUser) navbarUser.style.display = 'none';
  }
});

// ============================================================
//  DROPDOWN TOGGLE
// ============================================================
window.toggleUserMenu = function (event) {
  event.stopPropagation();
  event.currentTarget.classList.toggle('open');
};

document.addEventListener('click', (e) => {
  const userEl = document.querySelector('.nav-user');
  if (userEl && !userEl.contains(e.target)) {
    userEl.classList.remove('open');
  }
});

// ============================================================
//  LOGOUT — Keluar & Redirect ke Home (Guest Mode)
// ============================================================
window.logout = function (event) {
  event.preventDefault();

  // Hapus session
  localStorage.removeItem('ruangAman_session');

  console.log('👋 Logout berhasil. Redirect ke home...');

  // Redirect ke home (paksa reload biar navbar reset)
  window.location.href = '/';
};

// ============================================================
//  TOGGLE PASSWORD
// ============================================================
window.togglePassword = function (id, btn) {
  const input = document.getElementById(id);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
};

// ============================================================
//  MODAL NOTIFIKASI
// ============================================================
window.showModal = function (type, title, message) {
  const old = document.querySelector('.auth-modal-overlay');
  if (old) old.remove();

  const icon = type === 'success' ? 'fa-check' : 'fa-times';
  const iconClass = type === 'success' ? 'success' : 'error';

  const modalHTML = `
    <div class="auth-modal-overlay show" id="auth-modal">
      <div class="auth-modal">
        <div class="auth-modal-icon ${iconClass}">
          <i class="fas ${icon}"></i>
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
        <button class="btn-modal" onclick="document.getElementById('auth-modal').remove()">OK</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// ============================================================
//  FORM HANDLER
// ============================================================
const form = document.querySelector('form.auth-form');
const pagePath = window.location.pathname;

// ---------- REGISTER ----------
if (form && pagePath.includes('register')) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const terms = form.querySelector('input[type="checkbox"]');

    if (!name || !email || !password) {
      showModal('error', 'Data Tidak Lengkap', 'Mohon isi semua field.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('error', 'Email Tidak Valid', 'Format email tidak benar.');
      return;
    }

    if (password.length < 8) {
      showModal('error', 'Kata Sandi Lemah', 'Kata sandi minimal 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      showModal('error', 'Kata Sandi Berbeda', 'Kata sandi dan konfirmasi tidak sama.');
      return;
    }

    if (terms && !terms.checked) {
      showModal('error', 'Syarat Belum Disetujui', 'Anda harus menyetujui Syarat & Ketentuan.');
      return;
    }

    if (findUserByEmail(email)) {
      showModal('error', 'Email Sudah Terdaftar', 'Silakan masuk dengan akun yang ada.');
      return;
    }

    const users = getUsers();
    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);

    setSession(newUser);

    showModal(
      'success',
      'Registrasi Berhasil!',
      `Selamat datang, <strong>${name}</strong>!<br><br>Anda akan diarahkan ke beranda...`
    );

    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  });
}

// ---------- LOGIN ----------
if (form && pagePath.includes('login')) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showModal('error', 'Data Kosong', 'Mohon isi email dan kata sandi.');
      return;
    }

    const user = findUserByEmail(email);

    if (!user) {
      showModal('error', 'Email Tidak Terdaftar', 'Silakan daftar akun baru terlebih dahulu.');
      return;
    }

    if (user.password !== password) {
      showModal('error', 'Kata Sandi Salah', 'Periksa kembali kata sandi Anda.');
      return;
    }

    setSession(user);

    showModal(
      'success',
      'Login Berhasil!',
      `Selamat datang kembali, <strong>${user.name}</strong>!<br><br>Anda akan diarahkan ke beranda...`
    );

    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  });
}

// ---------- FORGOT PASSWORD ----------
if (form && pagePath.includes('forgot-password')) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();

    if (!email) {
      showModal('error', 'Email Kosong', 'Mohon masukkan email Anda.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('error', 'Email Tidak Valid', 'Format email tidak benar.');
      return;
    }

    const user = findUserByEmail(email);

    if (!user) {
      showModal(
        'error',
        'Email Tidak Terdaftar',
        `Email <strong>${email}</strong> belum terdaftar.<br><br>Silakan daftar akun baru.`
      );
      return;
    }

    showModal(
      'success',
      'Email Terkirim!',
      `Tautan reset kata sandi telah dikirim ke <strong>${email}</strong>.<br><br>Silakan cek inbox atau folder spam Anda.`
    );

    document.getElementById('email').value = '';
  });
}
