import { getReports } from "./database.js";
import { requireAuthenticatedUser } from "./auth-guard.js";

function escapeHTML(value = "") {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "long", year: "numeric"
  }).format(date);
}

function statusLabel(status) {
  if (status === "completed") return "Selesai";
  if (status === "failed") return "Gagal";
  return "Menunggu Diproses";
}

function normalizeDatabaseReport(item) {
  const evidence = Array.isArray(item.evidence) ? item.evidence : [];
  const analysisRow = Array.isArray(item.analysis_results)
    ? item.analysis_results[0]
    : item.analysis_results;

  return {
    id: item.id,
    title: item.title,
    category: item.category || "lainnya",
    incidentDate: item.incident_date,
    createdAt: item.created_at,
    status: statusLabel(item.status),
    fileName: evidence[0]?.original_name || "Tidak ada file",
    evidence,
    evidenceCount: evidence.length,
    description: item.chronology,
    summary: analysisRow?.summary || "Hasil analisis belum tersedia.",
    analysis: Array.isArray(analysisRow?.key_points) ? analysisRow.key_points : [],
    modelName: analysisRow?.model_name || "",
    timeline: [
      { date: item.incident_date, label: "Tanggal kejadian yang dilaporkan" },
      { date: item.created_at, label: "Laporan dan bukti dikirim" },
      {
        date: item.created_at,
        label: item.status === "completed"
          ? "Analisis bukti selesai"
          : item.status === "failed" ? "Analisis bukti gagal" : "Bukti sedang diproses"
      }
    ]
  };
}

function getLocalReports() {
  try {
    return JSON.parse(localStorage.getItem("ruangAmanReports") || "[]");
  } catch {
    return [];
  }
}

async function loadReports() {
  try {
    const reports = await getReports();
    return reports.map(normalizeDatabaseReport);
  } catch (error) {
    console.error(error);
    return getLocalReports();
  }
}

function getStatusClass(status) {
  return status === "Selesai" ? "done" : "waiting";
}

async function renderReportsPage() {
  const reportList = document.getElementById("report-list");
  const emptyReport = document.getElementById("empty-report");
  const searchInput = document.getElementById("report-search");
  const categoryFilter = document.getElementById("category-filter");
  const statusButtons = document.querySelectorAll("#status-tabs [data-status]");
  let selectedStatus = "Semua";

  reportList.innerHTML = '<tr><td colspan="5">Memuat laporan...</td></tr>';
  const reports = await loadReports();

  function updateReports() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;
    const filteredReports = reports.filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(query);
      const matchesCategory = category === "Semua" || report.category === category;
      const matchesStatus = selectedStatus === "Semua" || report.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    reportList.innerHTML = filteredReports.map(function (report, index) {
      return `
        <tr>
          <td>${index + 1}</td>
          <td><span class="report-title">${escapeHTML(report.title)}</span></td>
          <td>${formatDate(report.createdAt)}</td>
          <td><span class="status-badge ${getStatusClass(report.status)}">${escapeHTML(report.status)}</span></td>
          <td><a class="detail-link" href="report-detail.html?id=${encodeURIComponent(report.id)}">Detail →</a></td>
        </tr>
      `;
    }).join("");

    emptyReport.classList.toggle("hidden", filteredReports.length > 0);
  }

  searchInput.addEventListener("input", updateReports);
  categoryFilter.addEventListener("change", updateReports);
  statusButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectedStatus = button.dataset.status;
      statusButtons.forEach(item => item.classList.toggle("active", item === button));
      updateReports();
    });
  });
  updateReports();
}

async function renderReportDetailPage() {
  const reportId = new URLSearchParams(window.location.search).get("id");
  const reports = await loadReports();
  const localReports = getLocalReports();
  const report = reports.find(item => item.id === reportId)
    || localReports.find(item => item.id === reportId)
    || reports[0];

  if (!report) {
    window.location.href = "reports.html";
    return;
  }

  document.title = `${report.title} | Ruang Aman`;
  document.getElementById("detail-title").textContent = report.title;
  document.getElementById("detail-created-date").textContent = formatDate(report.createdAt);
  document.getElementById("detail-status").textContent = report.status;
  document.getElementById("detail-evidence-count").textContent = String(report.evidenceCount || 0);
  document.getElementById("detail-summary").textContent = report.summary || "Ringkasan belum tersedia.";
  document.getElementById("detail-file-name").textContent = report.fileName || "Tidak ada file";
  document.getElementById("detail-description").textContent = report.description || "Tidak ada catatan.";

  const timeline = report.timeline || [{ date: report.createdAt, label: "Laporan dibuat" }];
  document.getElementById("timeline-list").innerHTML = timeline.map(function (item) {
    return `
      <li>
        <span class="timeline-date">${formatDate(item.date)}</span>
        <span class="timeline-label">${escapeHTML(item.label)}</span>
      </li>
    `;
  }).join("");

  const analysis = Array.isArray(report.analysis) ? report.analysis : [];
  document.getElementById("analysis-list").innerHTML = analysis.length
    ? analysis.map(item => `<li>${escapeHTML(item)}</li>`).join("")
    : "<li>Hasil analisis belum tersedia.</li>";

  const tabButtons = document.querySelectorAll("#detail-tabs [data-tab]");
  const panels = {
    chronology: document.getElementById("chronology-panel"),
    evidence: document.getElementById("evidence-panel"),
    analysis: document.getElementById("analysis-panel"),
    notes: document.getElementById("notes-panel")
  };

  tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const selectedTab = button.dataset.tab;
      tabButtons.forEach(item => item.classList.toggle("active", item === button));
      Object.entries(panels).forEach(([name, panel]) => {
        panel.classList.toggle("hidden", name !== selectedTab);
      });
    });
  });

  document.getElementById("print-report").addEventListener("click", () => window.print());
}

async function initializeProtectedReportPage() {
  const user = await requireAuthenticatedUser();
  if (!user) return;

  const currentPage = document.body.dataset.page;
  if (currentPage === "reports") await renderReportsPage();
  if (currentPage === "report-detail") await renderReportDetailPage();
}

initializeProtectedReportPage();
