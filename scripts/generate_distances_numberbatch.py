#!/usr/bin/env python3
"""
Generate a semantic distance matrix for QuickDraw categories using ConceptNet Numberbatch.

Downloads Numberbatch mini (English-only, ~30MB) if not present, extracts vectors
for all 345 labels, computes cosine similarity, and exports an optimized JSON file.

Usage:
    python3 scripts/generate_distances_numberbatch.py
"""

from __future__ import annotations

import gzip
import json
import sys
import urllib.request
from pathlib import Path

import numpy as np

# --- Configuration ---
NB_URL = "https://conceptnet.s3.amazonaws.com/downloads/2019/numberbatch/numberbatch-en-19.08.txt.gz"
NB_DIR = Path(__file__).parent / "numberbatch_data"
NB_GZ = NB_DIR / "numberbatch-en-19.08.txt.gz"
NB_FILE = NB_DIR / "numberbatch-en-19.08.txt"
OUTPUT_FILE = Path(__file__).parent.parent / "public" / "distances_nb.json"
LABELS_FILE = Path(__file__).parent.parent / "src" / "labels.ts"
DIMENSIONS = 300


# --- Extract labels from labels.ts ---
def extract_labels(path: Path) -> list[str]:
    """Parse the LABELS array from labels.ts."""
    text = path.read_text()
    labels = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith('"') and line.endswith('",'):
            labels.append(line.strip('",'))
        elif line.startswith('"') and line.endswith('"'):
            labels.append(line.strip('"'))
    return labels


# --- Download Numberbatch ---
def download_numberbatch():
    """Download and extract Numberbatch English mini embeddings."""
    NB_DIR.mkdir(parents=True, exist_ok=True)

    if NB_FILE.exists():
        print(f"Numberbatch file already exists: {NB_FILE}")
        return

    if not NB_GZ.exists():
        print(f"Downloading Numberbatch English mini (~30MB)...")
        print(f"URL: {NB_URL}")

        def progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            pct = min(100, downloaded * 100 // total_size) if total_size > 0 else 0
            mb = downloaded / (1024 * 1024)
            sys.stdout.write(f"\r  {mb:.1f}MB ({pct}%)")
            sys.stdout.flush()

        urllib.request.urlretrieve(NB_URL, NB_GZ, reporthook=progress)
        print()

    print("Decompressing...")
    with gzip.open(NB_GZ, "rt", encoding="utf-8") as fin:
        with open(NB_FILE, "w", encoding="utf-8") as fout:
            fout.write(fin.read())

    print(f"Extracted to {NB_FILE}")


# --- Load Numberbatch vectors ---
def load_numberbatch(path: Path) -> dict[str, np.ndarray]:
    """Load Numberbatch vectors into a dict."""
    print(f"Loading Numberbatch vectors from {path}...")
    vectors = {}
    with open(path, "r", encoding="utf-8") as f:
        header = f.readline()  # first line is "num_words dimensions"
        for line in f:
            parts = line.rstrip().split(" ")
            word = parts[0]
            vec = np.array([float(x) for x in parts[1:]], dtype=np.float32)
            vectors[word] = vec
    print(f"  Loaded {len(vectors)} word vectors ({DIMENSIONS}d)")
    return vectors


# --- Resolve label to Numberbatch vector ---
def resolve_label(label: str, nb: dict[str, np.ndarray]) -> np.ndarray | None:
    """
    Try multiple strategies to find a Numberbatch vector for a label:
    1. Exact match (lowercase)
    2. Replace underscores/hyphens with nothing
    3. Average of all tokens
    """
    clean = label.lower().replace("the_", "").strip("_")

    # Strategy 1: exact match
    if clean in nb:
        return nb[clean]

    # Strategy 2: replace separators
    joined = clean.replace("_", "").replace("-", "")
    if joined in nb:
        return nb[joined]

    # Strategy 3: tokenize and average
    tokens = clean.replace("-", "_").split("_")
    token_vecs = [nb[t] for t in tokens if t in nb]

    if token_vecs:
        return np.mean(token_vecs, axis=0).astype(np.float32)

    return None


# --- Compute cosine similarity matrix ---
def cosine_similarity_matrix(vectors: np.ndarray) -> np.ndarray:
    """Compute pairwise cosine similarity for row vectors."""
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normalized = vectors / norms
    return normalized @ normalized.T


def main():
    # 1. Extract labels
    labels = extract_labels(LABELS_FILE)
    print(f"Found {len(labels)} labels in labels.ts")

    # 2. Download Numberbatch
    download_numberbatch()

    # 3. Load Numberbatch
    nb = load_numberbatch(NB_FILE)

    # 4. Resolve vectors for each label
    vectors = []
    missing = []

    for label in labels:
        vec = resolve_label(label, nb)
        if vec is not None:
            vectors.append(vec)
        else:
            missing.append(label)
            vectors.append(np.zeros(DIMENSIONS, dtype=np.float32))

    print(f"\nResolution stats:")
    print(f"  Found:   {len(labels) - len(missing)}/{len(labels)}")
    if missing:
        print(f"  Missing: {missing}")

    # 5. Compute similarity matrix
    mat = np.array(vectors, dtype=np.float32)
    sim = cosine_similarity_matrix(mat)

    # Map from [-1, 1] to [0, 1]
    sim = (sim + 1.0) / 2.0
    np.clip(sim, 0.0, 1.0, out=sim)

    # 6. Sanity checks
    print("\nSanity checks:")
    test_pairs = [
        ("dog", "cat"),
        ("dog", "television"),
        ("duck", "swan"),
        ("duck", "hammer"),
        ("car", "truck"),
        ("car", "flower"),
    ]
    label_idx = {l: i for i, l in enumerate(labels)}
    for w1, w2 in test_pairs:
        if w1 in label_idx and w2 in label_idx:
            d = sim[label_idx[w1], label_idx[w2]]
            print(f"  {w1} <-> {w2}: {d:.4f}")

    # 7. Export as compact JSON (upper triangle, no diagonal)
    n = len(labels)
    upper_tri = []
    for i in range(n):
        for j in range(i + 1, n):
            upper_tri.append(round(float(sim[i, j]), 4))

    output = {
        "words": labels,
        "distances": upper_tri,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"\nOutput: {OUTPUT_FILE}")
    print(f"  Words: {n}")
    print(f"  Values: {len(upper_tri)} (upper triangle)")
    print(f"  File size: {size_kb:.1f} KB")

    if size_kb > 500:
        print("  WARNING: File exceeds 500KB target!")
    else:
        print("  OK: Under 500KB target")


if __name__ == "__main__":
    main()
