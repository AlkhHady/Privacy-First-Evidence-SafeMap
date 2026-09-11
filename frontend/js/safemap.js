"use strict";

const SERVICES = [
  { id: 1, name: "Polresta Padang", category: "polisi", categoryLabel: "Polisi", address: "Jl. M. Yamin, Kota Padang", phone: "110", latitude: -0.9497, longitude: 100.3596 },
  { id: 2, name: "RSUP Dr. M. Djamil", category: "kesehatan", categoryLabel: "Kesehatan", address: "Jl. Perintis Kemerdekaan, Kota Padang", phone: "(0751) 32371", latitude: -0.9424, longitude: 100.3672 },
  { id: 3, name: "UPTD Perlindungan Perempuan dan Anak", category: "konseling", categoryLabel: "Pendampingan", address: "Kota Padang, Sumatera Barat", phone: "(0751) 8950005", latitude: -0.9545, longitude: 100.3614 },
  { id: 4, name: "Puskesmas Padang Pasir", category: "kesehatan", categoryLabel: "Kesehatan", address: "Jl. Padang Pasir, Kota Padang", phone: "(0751) 893212", latitude: -0.9451, longitude: 100.3544 },
  { id: 5, name: "Lembaga Bantuan Hukum Padang", category: "hukum", categoryLabel: "Bantuan hukum", address: "Kota Padang, Sumatera Barat", phone: "(0751) 7055477", latitude: -0.958, longitude: 100.355 }
];

const searchInput = document.getElementById("location-search");
const serviceList = document.getElementById("service-list");
const serviceCount = document.getElementById("service-count");
const categoryButtons = document.querySelectorAll("#category-buttons [data-category]");
const locateButton = document.getElementById("locate-user");
const mapElement = document.getElementById("map");

let map = null;
let markerLayer = null;
let userMarker = null;
let selectedCategory = "semua";
let selectedServiceId = null;
let userPosition = null;

function escapeHTML(value = "") {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function createPhoneURL(phone) {
  return phone.replace(/[^\d+]/g, "");
}

function initializeMap() {
  if (!window.L) {
    mapElement.classList.add("map-fallback-active");
    return;
  }

  mapElement.innerHTML = "";
  map = L.map(mapElement).setView([-0.9471, 100.36], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}

async function loadRiskZones() {
  if (!map) return;

  try {
    const response = await fetch("http://localhost:3000/api/risk-zones");
    const result = await response.json();

    if (!result.success) {
      console.error("Data zona merah gagal diambil");
      return;
    }

    result.data.forEach(zone => {
      L.circle([zone.latitude, zone.longitude], {
        radius: zone.radius,
        color: "#b91c1c",
        fillColor: "#ef4444",
        fillOpacity: 0.25,
        weight: 2
      })
        .bindPopup(`
          <strong>Zona Risiko Tinggi</strong><br>
          Wilayah: ${zone.wilayah}<br>
          Jumlah kasus: ${zone.jumlahKasus}
        `)
        .addTo(map);
    });

  } catch (error) {
    console.error("Gagal mengambil data zona merah:", error);
  }
}

function calculateDistance(firstPosition, service) {
  if (!firstPosition) return null;
  const earthRadius = 6371;
  const toRadians = value => value * Math.PI / 180;
  const latitudeDifference = toRadians(service.latitude - firstPosition.latitude);
  const longitudeDifference = toRadians(service.longitude - firstPosition.longitude);
  const calculation = Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(firstPosition.latitude)) *
    Math.cos(toRadians(service.latitude)) *
    Math.sin(longitudeDifference / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));
}

function getFilteredServices() {
  const query = searchInput.value.trim().toLowerCase();
  return SERVICES.filter(service => {
    const categoryMatches = selectedCategory === "semua" || service.category === selectedCategory;
    const textMatches = `${service.name} ${service.address}`.toLowerCase().includes(query);
    return categoryMatches && textMatches;
  }).map(service => ({ ...service, distance: calculateDistance(userPosition, service) }))
    .sort((first, second) => (first.distance ?? 9999) - (second.distance ?? 9999));
}

function focusService(service, marker) {
  selectedServiceId = service.id;
  document.querySelectorAll(".service-card").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.serviceId) === service.id);
  });
  if (map) {
    map.setView([service.latitude, service.longitude], 16);
    marker?.openPopup();
  } else {
    window.open(`https://www.openstreetmap.org/?mlat=${service.latitude}&mlon=${service.longitude}#map=16/${service.latitude}/${service.longitude}`, "_blank", "noopener");
  }
}

function renderServices() {
  const services = getFilteredServices();
  if (markerLayer) markerLayer.clearLayers();
  serviceCount.textContent = services.length;

  if (services.length === 0) {
    serviceList.innerHTML = '<div class="empty-services">Layanan tidak ditemukan.</div>';
    return;
  }

  serviceList.innerHTML = services.map(service => `
    <button class="service-card ${selectedServiceId === service.id ? "active" : ""}" type="button" data-service-id="${service.id}">
      <div class="service-card-header">
        <h3>${escapeHTML(service.name)}</h3>
        <span class="service-category">${escapeHTML(service.categoryLabel)}</span>
      </div>
      <p class="service-address">${escapeHTML(service.address)}</p>
      <div class="service-information">
        <span>${service.distance === null ? "Lihat di peta" : `${service.distance.toFixed(1)} km`}</span>
        <a href="tel:${createPhoneURL(service.phone)}" onclick="event.stopPropagation()">${escapeHTML(service.phone)}</a>
      </div>
    </button>
  `).join("");

  services.forEach(service => {
    let marker = null;
    if (markerLayer) {
      marker = L.marker([service.latitude, service.longitude]);
      marker.bindPopup(`<strong>${escapeHTML(service.name)}</strong><br>${escapeHTML(service.address)}<br><br><a href="tel:${createPhoneURL(service.phone)}">Hubungi ${escapeHTML(service.phone)}</a>`);
      marker.addTo(markerLayer);
    }
    document.querySelector(`[data-service-id="${service.id}"]`).addEventListener("click", () => focusService(service, marker));
  });
}

categoryButtons.forEach(button => {
  button.addEventListener("click", function () {
    selectedCategory = button.dataset.category;
    categoryButtons.forEach(item => item.classList.toggle("active", item === button));
    renderServices();
  });
});

searchInput.addEventListener("input", renderServices);

locateButton.addEventListener("click", function () {
  if (!navigator.geolocation) {
    window.alert("Browser tidak mendukung fitur lokasi.");
    return;
  }
  locateButton.disabled = true;
  locateButton.textContent = "Mencari lokasi...";
  navigator.geolocation.getCurrentPosition(function (position) {
    userPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    if (map) {
      if (userMarker) map.removeLayer(userMarker);
      const locationIcon = L.divIcon({ className: "", html: '<div class="user-location-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      userMarker = L.marker([userPosition.latitude, userPosition.longitude], { icon: locationIcon }).bindPopup("Lokasi Anda").addTo(map);
      map.setView([userPosition.latitude, userPosition.longitude], 14);
    }
    locateButton.disabled = false;
    locateButton.textContent = "✓ Lokasi Ditemukan";
    renderServices();
  }, function () {
    locateButton.disabled = false;
    locateButton.textContent = "◎ Gunakan Lokasi Saya";
    window.alert("Lokasi tidak dapat diakses. Berikan izin lokasi pada browser.");
  }, { enableHighAccuracy: true, timeout: 10000 });
});

initializeMap();
renderServices();
