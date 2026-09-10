import React, { useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import { CATEGORIES, MOCK_LOCATIONS, filterLocations } from "../js/safemap";
import "../css/safemap.css";

export default function SafeMap() {
  const [category, setCategory] = useState("semua");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(MOCK_LOCATIONS[0]?.id ?? null);

  const results = useMemo(
    () => filterLocations(MOCK_LOCATIONS, category, query),
    [category, query]
  );

  const selected = results.find((l) => l.id === selectedId) || results[0] || null;

  return (
    <AppShell activeLabel="SafeMap">
      <div className="safemap">
        <section className="safemap__list-panel">
          <h1>SafeMap</h1>
          <p className="safemap__subtitle">Temukan lokasi bantuan terdekat di sekitar Anda.</p>

          <div className="safemap__search">
            <input
              type="text"
              placeholder="Cari lokasi, layanan, atau kata kunci..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="safemap__categories">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={"safemap__chip" + (category === c.key ? " safemap__chip--active" : "")}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="safemap__results">
            {results.length === 0 && <p className="safemap__empty">Tidak ada lokasi ditemukan.</p>}
            {results.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className={"safemap__result" + (selected?.id === loc.id ? " safemap__result--active" : "")}
                onClick={() => setSelectedId(loc.id)}
              >
                <div className="safemap__result-top">
                  <p className="safemap__result-name">{loc.name}</p>
                  {loc.verified && <span className="safemap__verified">Terverifikasi</span>}
                </div>
                <p className="safemap__result-address">{loc.address}</p>
                <span className="safemap__result-distance">{loc.distanceKm} km</span>
              </button>
            ))}
          </div>
        </section>

        <section className="safemap__map-area">
          <div className="safemap__map">
            {results.map((loc, i) => (
              <button
                key={loc.id}
                type="button"
                className={"safemap__pin" + (selected?.id === loc.id ? " safemap__pin--active" : "")}
                style={{ left: `${20 + ((i * 27) % 60)}%`, top: `${25 + ((i * 21) % 50)}%` }}
                onClick={() => setSelectedId(loc.id)}
                aria-label={loc.name}
              >
                📍
              </button>
            ))}
            <div className="safemap__map-legend">
              <span><i className="safemap__legend-dot safemap__legend-dot--help" /> Lokasi Bantuan</span>
              <span><i className="safemap__legend-dot safemap__legend-dot--zone" /> Zona Rawan</span>
              <span><i className="safemap__legend-dot safemap__legend-dot--me" /> Lokasi Kamu</span>
            </div>
          </div>

          {selected && (
            <div className="safemap__detail">
              <div className="safemap__detail-header">
                <div>
                  <div className="safemap__detail-badges">
                    <span className="safemap__badge">Bantuan Hukum</span>
                    {selected.verified && <span className="safemap__badge safemap__badge--verified">Terverifikasi</span>}
                  </div>
                  <h2>{selected.name}</h2>
                </div>
              </div>

              <ul className="safemap__detail-info">
                <li>📍 {selected.address}</li>
                <li>🕒 {selected.hours}</li>
                <li>📞 {selected.phone}</li>
                <li>✉️ {selected.email}</li>
              </ul>

              <p className="safemap__detail-desc">{selected.description}</p>

              <div className="safemap__detail-actions">
                <a className="safemap__call" href={`tel:${selected.phone.replace(/\D/g, "")}`}>
                  📞 Hubungi
                </a>
                <a
                  className="safemap__direction"
                  href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  🧭 Petunjuk Arah
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
