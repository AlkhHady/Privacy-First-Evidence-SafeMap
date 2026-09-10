import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchReports, statusLabel, formatDate } from "../js/reports";
import "../css/reports.css";

export default function Reports() {
  const [reports, setReports] = useState(null);

  useEffect(() => {
    fetchReports().then(setReports);
  }, []);

  return (
    <AppShell activeLabel="Proses Bukti">
      <div className="reports">
        <div className="reports__header">
          <div>
            <h1>Laporan</h1>
            <p>Daftar laporan yang tersimpan dari bukti yang sudah kamu proses.</p>
          </div>
          <Link to="/proses-bukti" className="reports__new">
            + Proses Bukti Baru
          </Link>
        </div>

        {reports === null && <p className="reports__loading">Memuat laporan...</p>}

        {reports?.length === 0 && (
          <div className="reports__empty">
            <p>Belum ada laporan. Mulai dengan memproses bukti pertamamu.</p>
          </div>
        )}

        <div className="reports__list">
          {reports?.map((r) => (
            <Link to={`/laporan/${r.id}`} className="reports__card" key={r.id}>
              <div className="reports__card-top">
                <span className={`reports__badge reports__badge--${r.status}`}>{statusLabel(r.status)}</span>
                <span className="reports__date">{formatDate(r.createdAt)}</span>
              </div>
              <p className="reports__card-title">{r.title}</p>
              <p className="reports__card-summary">{r.summary}</p>
              <div className="reports__card-footer">
                <span>{r.itemCount} bukti</span>
                <span className="reports__view">Lihat detail &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
