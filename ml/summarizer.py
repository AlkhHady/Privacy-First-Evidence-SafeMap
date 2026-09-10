from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any


MAX_TEXT_LENGTH = 100_000

INDONESIAN_STOPWORDS = {
    "ada", "adalah", "agar", "akan", "aku", "anda",
    "atau", "bahwa", "bagi", "bisa", "dalam", "dan",
    "dari", "dengan", "dia", "di", "ini", "itu",
    "jadi", "jika", "juga", "kami", "karena", "ke",
    "ketika", "kita", "lagi", "maka", "mereka",
    "oleh", "pada", "saat", "saja", "saya",
    "sebagai", "setelah", "sudah", "tetapi", "tidak",
    "untuk", "yang", "nya", "pun", "sebuah",
    "tersebut", "lebih", "dapat", "dilakukan"
}


def clean_text(text: str) -> str:
    """
    clean spasi berlebih tanpa mengubah isi kalimat
    """
    if not isinstance(text, str):
        raise TypeError("Teks harus berupa string.")

    text = text.strip()

    if not text:
        raise ValueError("Teks tidak boleh kosong.")

    if len(text) > MAX_TEXT_LENGTH:
        raise ValueError("Teks melebihi batas 100.000 karakter.")

    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text


def split_sentences(text: str) -> list[str]:
    """
    pisahkan teks berdasarkan tanda akhir kalimat dan baris.
    """
    sentences = re.split(
        r"(?<=[.!?])\s+|\n+",
        text
    )

    return [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]


def tokenize(text: str) -> list[str]:
    """
    ubah kalimat menjadi kumpulan kata.
    """
    words = re.findall(
        r"\b[a-zA-ZÀ-ÿ0-9'-]{2,}\b",
        text.lower()
    )

    return [
        word for word in words
        if word not in INDONESIAN_STOPWORDS
    ]


def calculate_sentence_scores(
    sentences: list[str]
) -> list[tuple[int, float]]:
    """
    beri nilai berdasarkan kemunculan kata penting.
    """
    all_words = []

    for sentence in sentences:
        all_words.extend(tokenize(sentence))

    frequencies = Counter(all_words)

    if not frequencies:
        return [
            (index, 0.0)
            for index in range(len(sentences))
        ]

    highest_frequency = max(frequencies.values())

    normalized_frequencies = {
        word: frequency / highest_frequency
        for word, frequency in frequencies.items()
    }

    scores = []

    for index, sentence in enumerate(sentences):
        words = tokenize(sentence)

        if not words:
            scores.append((index, 0.0))
            continue

        word_score = sum(
            normalized_frequencies.get(word, 0.0)
            for word in words
        )

        score = word_score / len(words)

        if index == 0:
            score *= 1.10

        scores.append((index, score))

    return scores


def remove_duplicates(
    sentences: list[str]
) -> list[str]:
    """
    hapus kalimat yang sama tanpa mengubah urutan.
    """
    result = []
    seen = set()

    for sentence in sentences:
        normalized = re.sub(
            r"\W+",
            " ",
            sentence.lower()
        ).strip()

        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(sentence)

    return result


def summarize_text(
    text: str,
    maximum_sentences: int = 4,
    maximum_key_points: int = 5
) -> dict[str, Any]:
    """
    dapat ringkasan dan poin penting dari teks.
    """
    cleaned_text = clean_text(text)
    sentences = remove_duplicates(
        split_sentences(cleaned_text)
    )

    if not sentences:
        raise ValueError("Tidak ditemukan kalimat yang dapat diringkas.")

    scores = calculate_sentence_scores(sentences)

    ranked_sentences = sorted(
        scores,
        key=lambda item: item[1],
        reverse=True
    )

    summary_indexes = sorted(
        index
        for index, _ in ranked_sentences[
            :maximum_sentences
        ]
    )

    summary_sentences = [
        sentences[index]
        for index in summary_indexes
    ]

    key_points = [
        sentences[index]
        for index, _ in ranked_sentences[
            :maximum_key_points
        ]
    ]

    return {
        "success": True,
        "method": "extractive_frequency",
        "summary": " ".join(summary_sentences),
        "key_points": key_points,
        "original_sentence_count": len(sentences),
        "summary_sentence_count": len(summary_sentences),
        "disclaimer": (
            "Ringkasan dibuat dari teks yang diberikan dan "
            "bukan kesimpulan hukum atau penentuan kesalahan."
        )
    }


def main() -> None:
    """
    test python summarizer.py file.txt
    """
    if len(sys.argv) != 2:
        print("Penggunaan: python summarizer.py <file-teks>")
        raise SystemExit(1)

    path = Path(sys.argv[1])

    try:
        if not path.is_file():
            raise FileNotFoundError("File teks tidak ditemukan.")

        text = path.read_text(
            encoding="utf-8",
            errors="replace"
        )

        result = summarize_text(text)

        print(json.dumps(
            result,
            indent=2,
            ensure_ascii=False
        ))
    except Exception as error:
        print(json.dumps({
            "success": False,
            "error": str(error)
        }, indent=2, ensure_ascii=False))

        raise SystemExit(1)


if __name__ == "__main__":
    main()
