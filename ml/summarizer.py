from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


MAX_TEXT_LENGTH = 100_000
MAX_QUOTE_LENGTH = 240

SECTION_HEADERS = {
    "judul laporan": "title",
    "kronologi atau teks pengguna": "chronology",
    "teks dari gambar atau video": "visual",
    "transkripsi audio atau video": "transcription",
}

NOISE_PATTERNS = [
    r"^\d+\s+unread messages?$",
    r"^(today|yesterday|message|messages|online|typing|read)$",
    r"^(hari ini|kemarin|pesan|dibaca)$",
    r"^[\W_]+$",
]

TIME_PATTERN = re.compile(
    r"\b(?:[01]?\d|2[0-3])[.:][0-5]\d"
    r"(?:\s?(?:am|pm|wib|wita|wit))?\b",
    re.IGNORECASE,
)

STOPWORDS = {
    "ada", "adalah", "agar", "akan", "aku", "anda", "atau",
    "bahwa", "bagi", "bisa", "dalam", "dan", "dari", "dengan",
    "dia", "di", "ini", "itu", "jadi", "jika", "juga", "kami",
    "karena", "ke", "ketika", "kita", "lagi", "maka", "mereka",
    "oleh", "pada", "saat", "saja", "saya", "sebagai", "setelah",
    "sudah", "tetapi", "tidak", "untuk", "yang", "nya", "pun",
    "sebuah", "tersebut", "lebih", "dapat", "dilakukan", "the",
    "and", "you", "your", "this", "that", "with", "from",
}

# Bobot bukan probabilitas dan tidak menentukan kesalahan seseorang.
CATEGORY_RULES = {
    "ancaman serius": {
        "weight": 8.0,
        "terms": {
            "bunuh", "membunuh", "kubunuh", "dibunuh", "habisi",
            "mati", "mampus", "celakai", "hancurkan", "kill",
        },
    },
    "ancaman atau intimidasi": {
        "weight": 5.0,
        "terms": {
            "ancam", "mengancam", "awas", "tunggu", "balas",
            "teror", "intimidasi", "takut", "jangan macam macam",
        },
    },
    "kekerasan fisik": {
        "weight": 6.0,
        "terms": {
            "pukul", "memukul", "tampar", "tendang", "serang",
            "cekik", "tusuk", "senjata", "darah", "luka",
        },
    },
    "pelecehan seksual": {
        "weight": 6.0,
        "terms": {
            "perkosa", "memperkosa", "pelecehan seksual", "telanjang",
            "foto intim", "video intim", "seks", "cabul", "raba",
        },
    },
    "pemaksaan atau pemerasan": {
        "weight": 5.0,
        "terms": {
            "paksa", "memaksa", "pemerasan", "tebus", "bayar",
            "sebar", "sebarkan", "viralkan", "bocorkan",
        },
    },
    "penguntitan atau doxing": {
        "weight": 5.0,
        "terms": {
            "ikuti", "mengikuti", "menguntit", "alamatmu", "lokasimu",
            "rumahmu", "datang ke rumah", "nomormu", "doxing",
        },
    },
    "bahasa kasar": {
        "weight": 2.5,
        "terms": {
            "anjing", "bangsat", "brengsek", "bajingan", "bodoh",
            "tolol", "goblok", "kampret", "fuck", "bitch",
        },
    },
    "diskriminasi": {
        "weight": 4.0,
        "terms": {
            "diskriminasi", "rasis", "perempuan tidak boleh",
            "wanita tidak pantas", "karena kamu perempuan",
        },
    },
}


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        raise TypeError("Teks harus berupa string.")

    text = text.strip()
    if not text:
        raise ValueError("Teks tidak boleh kosong.")
    if len(text) > MAX_TEXT_LENGTH:
        raise ValueError("Teks melebihi batas 100.000 karakter.")

    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def extract_sections(text: str) -> dict[str, list[str]]:
    sections = {
        "title": [],
        "chronology": [],
        "visual": [],
        "transcription": [],
        "other": [],
    }
    current_section = "other"

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        header_match = re.match(r"^([^:]+):\s*(.*)$", line)
        if header_match:
            possible_header = header_match.group(1).strip().lower()
            if possible_header in SECTION_HEADERS:
                current_section = SECTION_HEADERS[possible_header]
                remainder = header_match.group(2).strip()
                if remainder:
                    sections[current_section].append(remainder)
                continue

        sections[current_section].append(line)

    return sections


def is_noise(text: str) -> bool:
    normalized = text.strip().lower()
    if not normalized:
        return True
    if TIME_PATTERN.fullmatch(normalized):
        return True
    return any(re.fullmatch(pattern, normalized) for pattern in NOISE_PATTERNS)


def normalize_candidate(text: str) -> str:
    text = TIME_PATTERN.sub(" ", text)
    text = re.sub(r"\b\d+\s+unread messages?\b", " ", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip(" -–—|:;,.")
    return text


def split_candidates(lines: list[str]) -> list[str]:
    candidates = []
    for line in lines:
        for part in re.split(r"(?<=[.!?])\s+|\s*[;|]\s*", line):
            part = normalize_candidate(part)
            if not is_noise(part):
                candidates.append(part)
    return remove_near_duplicates(candidates)


def tokenize(text: str) -> list[str]:
    words = re.findall(r"\b[a-zA-ZÀ-ÿ0-9'-]{2,}\b", text.lower())
    return [word for word in words if word not in STOPWORDS]


def normalized_for_comparison(text: str) -> set[str]:
    return set(tokenize(re.sub(r"\W+", " ", text.lower())))


def remove_near_duplicates(items: list[str]) -> list[str]:
    result: list[str] = []
    token_sets: list[set[str]] = []

    for item in items:
        current_tokens = normalized_for_comparison(item)
        if not current_tokens:
            continue

        duplicate = False
        for previous_tokens in token_sets:
            union = current_tokens | previous_tokens
            similarity = (
                len(current_tokens & previous_tokens) / len(union)
                if union else 1.0
            )
            if similarity >= 0.82:
                duplicate = True
                break

        if not duplicate:
            result.append(item)
            token_sets.append(current_tokens)

    return result


def find_categories(text: str) -> dict[str, list[str]]:
    lowered = text.lower()
    findings: dict[str, list[str]] = {}

    for category, rule in CATEGORY_RULES.items():
        matches = sorted(
            term for term in rule["terms"]
            if re.search(rf"(?<!\w){re.escape(term)}(?!\w)", lowered)
        )
        if matches:
            findings[category] = matches

    return findings


def candidate_score(text: str, source: str) -> float:
    words = tokenize(text)
    if not words:
        return -10.0

    findings = find_categories(text)
    score = 0.0

    for category, terms in findings.items():
        score += float(CATEGORY_RULES[category]["weight"])
        score += min(len(terms), 3) * 0.5

    source_bonus = {
        "chronology": 3.0,
        "transcription": 1.2,
        "visual": 1.0,
        "other": 0.2,
    }
    score += source_bonus.get(source, 0.0)

    word_count = len(words)
    if 4 <= word_count <= 35:
        score += 1.5
    elif word_count > 60:
        score -= 1.5

    alphabetic = sum(character.isalpha() for character in text)
    numeric = sum(character.isdigit() for character in text)
    if numeric > alphabetic:
        score -= 4.0

    return score


def shorten(text: str, maximum_length: int = MAX_QUOTE_LENGTH) -> str:
    text = text.strip()
    if len(text) <= maximum_length:
        return text
    return text[: maximum_length - 1].rstrip() + "…"


def readable_list(items: list[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} dan {items[1]}"
    return ", ".join(items[:-1]) + f", dan {items[-1]}"


def determine_risk(findings: dict[str, list[str]]) -> str:
    categories = set(findings)
    if "ancaman serius" in categories or "pelecehan seksual" in categories:
        return "tinggi"
    if categories & {
        "kekerasan fisik",
        "ancaman atau intimidasi",
        "pemaksaan atau pemerasan",
        "penguntitan atau doxing",
    }:
        return "sedang"
    if categories:
        return "perlu perhatian"
    return "belum teridentifikasi"


def calculate_confidence(
    findings: dict[str, list[str]],
    relevant_count: int,
    chronology_available: bool,
) -> float:
    score = 0.35
    score += min(len(findings) * 0.08, 0.32)
    score += min(relevant_count * 0.04, 0.16)
    if chronology_available:
        score += 0.08
    return round(min(score, 0.91), 4)


def summarize_text(
    text: str,
    maximum_sentences: int = 4,
    maximum_key_points: int = 5,
) -> dict[str, Any]:
    cleaned_text = clean_text(text)
    sections = extract_sections(cleaned_text)

    chronology_candidates = split_candidates(sections["chronology"])
    evidence_by_source = {
        "visual": split_candidates(sections["visual"]),
        "transcription": split_candidates(sections["transcription"]),
        "other": split_candidates(sections["other"]),
    }

    scored_evidence = []
    for source, candidates in evidence_by_source.items():
        for candidate in candidates:
            scored_evidence.append({
                "text": candidate,
                "source": source,
                "score": candidate_score(candidate, source),
                "categories": find_categories(candidate),
            })

    scored_evidence.sort(key=lambda item: item["score"], reverse=True)
    relevant_evidence = [
        item for item in scored_evidence
        if item["score"] >= 2.5
    ]

    analysis_text = " ".join(
        chronology_candidates
        + [item["text"] for item in relevant_evidence]
    )
    findings = find_categories(analysis_text)
    categories = list(findings)
    risk_level = determine_risk(findings)

    summary_parts = []
    if chronology_candidates:
        chronology_summary = " ".join(
            chronology_candidates[:2]
        )
        summary_parts.append(
            "Berdasarkan kronologi pengguna, "
            + shorten(chronology_summary, 320).rstrip(".")
            + "."
        )

    if categories:
        summary_parts.append(
            "Analisis awal mendeteksi indikasi "
            + readable_list(categories[:4])
            + "."
        )

    top_evidence = relevant_evidence[:2]
    if top_evidence:
        quotes = [f'“{shorten(item["text"], 150)}”' for item in top_evidence]
        summary_parts.append(
            "Bagian bukti yang paling relevan memuat "
            + readable_list(quotes)
            + "."
        )

    if not summary_parts:
        fallback = scored_evidence[:maximum_sentences]
        if not fallback:
            raise ValueError("Tidak ditemukan informasi yang dapat diringkas.")
        summary_parts.append(
            "Informasi yang berhasil diekstrak: "
            + " ".join(shorten(item["text"]) for item in fallback)
        )

    key_points = []
    if chronology_candidates:
        key_points.append(
            "Kronologi pengguna: "
            + shorten(" ".join(chronology_candidates[:2]), 300)
        )

    if categories:
        key_points.append(
            "Indikasi yang terdeteksi: "
            + readable_list(categories)
        )

    source_labels = {
        "visual": "OCR gambar/video",
        "transcription": "Transkripsi audio/video",
        "other": "Teks bukti",
    }
    for item in relevant_evidence:
        point = (
            f'{source_labels[item["source"]]}: '
            + shorten(item["text"], 260)
        )
        if point not in key_points:
            key_points.append(point)
        if len(key_points) >= maximum_key_points - 1:
            break

    timestamps = []
    for match in TIME_PATTERN.findall(cleaned_text):
        normalized_time = re.sub(r"\s+", " ", match.lower()).strip()
        if normalized_time not in timestamps:
            timestamps.append(normalized_time)
    if timestamps and len(key_points) < maximum_key_points:
        key_points.append(
            "Waktu yang terbaca pada bukti: "
            + ", ".join(timestamps[:6])
        )

    original_candidates = (
        chronology_candidates
        + evidence_by_source["visual"]
        + evidence_by_source["transcription"]
        + evidence_by_source["other"]
    )

    return {
        "success": True,
        "method": "evidence_aware_extractive_v2",
        "summary": " ".join(summary_parts[:maximum_sentences]),
        "key_points": key_points[:maximum_key_points],
        "risk_level": risk_level,
        "detected_categories": categories,
        "matched_terms": findings,
        "confidence": calculate_confidence(
            findings,
            len(relevant_evidence),
            bool(chronology_candidates),
        ),
        "original_sentence_count": len(original_candidates),
        "relevant_sentence_count": len(relevant_evidence),
        "summary_sentence_count": len(summary_parts),
        "disclaimer": (
            "Hasil merupakan analisis awal berbasis pola bahasa. "
            "Hasil bukan kesimpulan hukum, diagnosis, atau penentuan kesalahan."
        ),
    }


def main() -> None:
    if len(sys.argv) != 2:
        print("Penggunaan: python summarizer.py <file-teks>")
        raise SystemExit(1)

    path = Path(sys.argv[1])
    try:
        if not path.is_file():
            raise FileNotFoundError("File teks tidak ditemukan.")
        result = summarize_text(
            path.read_text(encoding="utf-8", errors="replace")
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({
            "success": False,
            "error": str(error),
        }, indent=2, ensure_ascii=False))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
