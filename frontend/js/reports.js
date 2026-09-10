"use strict";

const DEFAULT_REPORTS = [
  {
    id: "RA-DEMO-001",
    title: "Pelecehan Online",
    category: "pelecehan-online",
    incidentDate: "2026-08-12",
    createdAt: "2026-08-15T08:15:00",
    status: "Selesai",
    fileName: "bukti-chat.png",
    description:
      "Pengguna menerima pesan dengan bahasa kasar dan ancaman melalui percakapan daring.",
    summary:
      "Bukti berupa tangkapan layar telah dibaca. Sistem menemukan bahasa kasar dan indikasi ancaman yang perlu diverifikasi lebih lanjut.",
    analysis: [
      "Teks pada gambar berhasil dibaca menggunakan OCR.",
      "Ditemukan kata atau kalimat dengan nada kasar.",
      "Waktu percakapan yang terbaca sekitar pukul 08.00 sampai 08.05.",
      "Identitas dan konteks kejadian tetap memerlukan verifikasi manusia."
    ],
    timeline: [
      {
        date: "2026-08-12T08:00:00",
        label: "Kejadian pertama terjadi"
      },
      {
        date: "2026-08-12T08:05:00",
        label: "Pesan ancaman diterima"
      },
      {
        date: "2026-08-12T08:10:00",
        label: "Bukti tambahan diunggah"
      },
      {
        date: "2026-08-15T08:15:00",
        label: "Laporan diselesaikan"
      }
    ]
  }
];

function getSavedReports() {
  try {
    const reports = JSON.parse(
      localStorage.getItem("ruangAmanReports") || "[]"
    );

    return [...reports, ...DEFAULT_REPORTS];
  } catch (error) {
    console.error("Data laporan tidak dapat dibaca:", error);
    return DEFAULT_REPORTS;
  }
}

function escapeHTML(value = "") {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function getStatusClass(status) {
  return status === "Selesai" ? "done" : "waiting";
}

function renderReportsPage() {
  const reportList = document.getElementById("report-list");
  const emptyReport = document.getElementById("empty-report");
  const searchInput = document.getElementById("report-search");
  const categoryFilter = document.getElementById("category-filter");
  const statusButtons = document.querySelectorAll(
    "#status-tabs [data-status]"
  );

  let selectedStatus = "Semua";
  const reports = getSavedReports();

  function updateReports() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;

    const filteredReports = reports.filter(function (report) {
      const matchesSearch = report.title
        .toLowerCase()
        .includes(query);

      const matchesCategory =
        category === "Semua" || report.category === category;

      const matchesStatus =
        selectedStatus === "Semua" ||
        report.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    reportList.innerHTML = filteredReports
      .map(function (report, index) {
        return `
          <tr>
            <td>${index + 1}</td>

            <td>
              <span class="report-title">
                ${escapeHTML(report.title)}
              </span>
            </td>

            <td>${formatDate(report.createdAt)}</td>

            <td>
              <span class="status-badge ${getStatusClass(report.status)}">
                ${escapeHTML(report.status)}
              </span>
            </td>

            <td>
              <a
                class="detail-link"
                href="report-detail.html?id=${encodeURIComponent(report.id)}"
              >
                Detail →
              </a>
            </td>
          </tr>
        `;
      })
      .join("");

    emptyReport.classList.toggle(
      "hidden",
      filteredReports.length > 0
    );
  }

  searchInput.addEventListener("input", updateReports);
  categoryFilter.addEventListener("change", updateReports);

  statusButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectedStatus = button.dataset.status;

      statusButtons.forEach(function (item) {
        item.classList.toggle("active", item === button);
      });

      updateReports();
    });
  });

  updateReports();
}

function renderReportDetailPage() {
  const reportId = new URLSearchParams(window.location.search).get("id");

  const reports = getSavedReports();
  const report =
    reports.find(function (item) {
      return item.id === reportId;
    }) || reports[0];

  if (!report) {
    window.location.href = "reports.html";
    return;
  }

  document.title = `${report.title} | Ruang Aman`;

  document.getElementById("detail-title").textContent =
    report.title;

  document.getElementById("detail-created-date").textContent =
    formatDate(report.createdAt);

  document.getElementById("detail-status").textContent =
    report.status;

  document.getElementById("detail-evidence-count").textContent =
    report.fileName ? "1" : "0";

  document.getElementById("detail-summary").textContent =
    report.summary || "Ringkasan belum tersedia.";

  document.getElementById("detail-file-name").textContent =
    report.fileName || "Tidak ada file";

  document.getElementById("detail-description").textContent =
    report.description || "Tidak ada catatan.";

  const timeline = report.timeline || [
    {
      date: report.createdAt,
      label: "Laporan dibuat"
    }
  ];

  document.getElementById("timeline-list").innerHTML = timeline
    .map(function (item) {
      return `
        <li>
          <span class="timeline-date">
            ${formatDate(item.date)}
          </span>

          <span class="timeline-label">
            ${escapeHTML(item.label)}
          </span>
        </li>
      `;
    })
    .join("");

  if (Array.isArray(report.analysis)) {
    document.getElementById("analysis-list").innerHTML =
      report.analysis
        .map(function (item) {
          return `<li>${escapeHTML(item)}</li>`;
        })
        .join("");
  }

  const tabButtons = document.querySelectorAll(
    "#detail-tabs [data-tab]"
  );

  const panels = {
    chronology: document.getElementById("chronology-panel"),
    evidence: document.getElementById("evidence-panel"),
    analysis: document.getElementById("analysis-panel"),
    notes: document.getElementById("notes-panel")
  };

  tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const selectedTab = button.dataset.tab;

      tabButtons.forEach(function (item) {
        item.classList.toggle("active", item === button);
      });

      Object.entries(panels).forEach(function ([name, panel]) {
        panel.classList.toggle("hidden", name !== selectedTab);
      });
    });
  });

  document
    .getElementById("print-report")
    .addEventListener("click", function () {
      window.print();
    });
}

const currentPage = document.body.dataset.page;

if (currentPage === "reports") {
  renderReportsPage();
}

if (currentPage === "report-detail") {
  renderReportDetailPage();
}
