import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchReportById, statusLabel, formatDate } from "../js/reports";
import "../css/reports.css";

const TYPE_ICON = { photo: "🖼️", video: "🎬", audio: "🎧", document: "📄" };

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchReportById(id).then(setReport);
  }, [id]);

  if (!report) {
    return (
      <AppShell activeLabel="Proses Bukti">
        <p className="reports__loading">Memuat laporan...</p>
      </AppShell>
    );
  }

  return (
    <AppShell activeLabel="Proses Bukti">
      <div className="report-detail">
        <Link to="/laporan" className="report-detail__back">
          &larr; Kembali ke Laporan
        </Link>

        <div className="report-detail__header">
          <div>
            <span className={`reports__badge reports__badge--${report.status}`}>
              {statusLabel(report.status)}
            </span>
            <h1>{report.title}</h1>
            <p className="report-detail__meta">
              {report.id} &middot; Dibuat {formatDate(report.createdAt)} &middot; {report.itemCount} bukti
            </p>
          </div>
          <button type="button" className="report-detail__export">Ekspor Ringkasan</button>
        </div>

        <div className="report-detail__grid">
          <section className="report-detail__panel">
            <h2>Ringkasan</h2>
            <p>{report.summary}</p>

            <h2>Kronologi</h2>
            <ul className="report-detail__timeline">
              {report.timeline.map((t, i) => (
                <li key={i}>
                  <span className="report-detail__time">{t.time}</span>
                  <span className="report-detail__dot" />
                  <span>{t.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="report-detail__panel">
            <h2>Bukti Terlampir</h2>
            <ul className="report-detail__evidence">
              {report.evidence.map((e, i) => (
                <li key={i}>
                  <span className="report-detail__evidence-icon">{TYPE_ICON[e.type] || "📎"}</span>
                  <span>{e.name}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
