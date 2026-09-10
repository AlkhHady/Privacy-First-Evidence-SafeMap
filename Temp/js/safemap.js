// safemap.js
// Mock location data + filter helpers for the SafeMap page.
// Swap MOCK_LOCATIONS / geolocation with a real API (Supabase table + browser geolocation).

export const CATEGORIES = [
  { key: "semua", label: "Semua" },
  { key: "hukum", label: "Layanan Hukum" },
  { key: "konseling", label: "Konseling" },
  { key: "kesehatan", label: "Kesehatan" },
  { key: "pemberdayaan", label: "Lembaga Pemberdayaan" },
  { key: "lainnya", label: "Lainnya" },
];

export const MOCK_LOCATIONS = [
  {
    id: "loc-1",
    name: "LBH Perempuan Jakarta",
    category: "hukum",
    verified: true,
    distanceKm: 2.3,
    address: "Jl. Melati No. 10, Jakarta Selatan",
    hours: "Senin - Jumat, 08.00 - 16.00",
    phone: "(021) 1234 5678",
    email: "info@lbhperempuan.or.id",
    description:
      "Lembaga bantuan hukum yang menyediakan pendampingan bagi korban kekerasan berbasis gender.",
    lat: -6.261, lng: 106.81,
  },
  {
    id: "loc-2",
    name: "Pusat Konseling Pulih",
    category: "konseling",
    verified: true,
    distanceKm: 3.8,
    address: "Jl. Anggrek No. 5, Jakarta Selatan",
    hours: "Setiap hari, 09.00 - 18.00",
    phone: "(021) 8765 4321",
    email: "halo@pulih.or.id",
    description: "Layanan konseling psikologis untuk penyintas kekerasan dan keluarga.",
    lat: -6.255, lng: 106.803,
  },
  {
    id: "loc-3",
    name: "RS Bhakti Sehat",
    category: "kesehatan",
    verified: false,
    distanceKm: 5.1,
    address: "Jl. Kenanga No. 22, Jakarta Selatan",
    hours: "24 jam",
    phone: "(021) 2233 4455",
    email: "igd@bhaktisehat.co.id",
    description: "Layanan visum dan pemeriksaan medis untuk korban kekerasan.",
    lat: -6.27, lng: 106.82,
  },
];

export function filterLocations(locations, categoryKey, query) {
  return locations.filter((loc) => {
    const matchCategory = categoryKey === "semua" || loc.category === categoryKey;
    const matchQuery =
      !query || loc.name.toLowerCase().includes(query.toLowerCase()) || loc.address.toLowerCase().includes(query.toLowerCase());
    return matchCategory && matchQuery;
  });
}
