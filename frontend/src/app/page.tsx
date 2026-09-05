export default function Home() {
  return (
    <main>
      <nav>
        <a className="brand" href="/">Ruang Aman</a>
        <a href="/login">Masuk</a>
      </nav>

      <section className="hero">
        <p className="eyebrow">Privasi menjadi prioritas</p>
        <h1>Susun bukti dengan lebih aman dan terstruktur.</h1>
        <p className="lead">
          Simpan bukti sementara, rangkai kronologi, dan dapatkan ringkasan untuk membantu menentukan langkah berikutnya.
        </p>
        <div className="actions">
          <a className="primary" href="/evidence">Mulai susun bukti</a>
          <a className="secondary" href="/safe-map">Lihat SafeMap</a>
        </div>
        <p className="notice">Jika berada dalam bahaya langsung, hubungi layanan darurat atau orang tepercaya di sekitar Anda.</p>
      </section>

      <section className="features" aria-label="Fitur utama">
        <article><h2>Bukti privat</h2><p>File disimpan di bucket privat dan dirancang untuk dihapus setelah diproses.</p></article>
        <article><h2>Ringkasan kasus</h2><p>Kronologi dan hasil ekstraksi disusun agar lebih mudah ditinjau pengguna.</p></article>
        <article><h2>Akses bantuan</h2><p>SafeMap membantu menemukan layanan pendampingan yang relevan.</p></article>
      </section>
    </main>
  );
}
