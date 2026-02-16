#!/usr/bin/env python3
"""
Generate a semantic distance matrix for QuickDraw categories using GloVe embeddings.

Downloads GloVe 6B 50d if not present, extracts vectors for all 345 labels,
computes cosine similarity, and exports an optimized JSON file.

Usage:
    python3 scripts/generate_distances.py
"""

import json
import os
import sys
import zipfile
import urllib.request
from pathlib import Path

import numpy as np

# --- Configuration ---
GLOVE_URL = "https://nlp.stanford.edu/data/glove.6B.zip"
GLOVE_DIR = Path(__file__).parent / "glove_data"
GLOVE_ZIP = GLOVE_DIR / "glove.6B.zip"
GLOVE_FILE = GLOVE_DIR / "glove.6B.50d.txt"
OUTPUT_FILE = Path(__file__).parent.parent / "public" / "distances.json"
LABELS_FILE = Path(__file__).parent.parent / "src" / "labels.ts"
DIMENSIONS = 50

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


# --- Download GloVe ---
def download_glove():
    """Download and extract GloVe 6B embeddings."""
    GLOVE_DIR.mkdir(parents=True, exist_ok=True)

    if GLOVE_FILE.exists():
        print(f"GloVe file already exists: {GLOVE_FILE}")
        return

    if not GLOVE_ZIP.exists():
        print(f"Downloading GloVe 6B (~862MB)...")
        print(f"URL: {GLOVE_URL}")

        def progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            pct = min(100, downloaded * 100 // total_size) if total_size > 0 else 0
            mb = downloaded / (1024 * 1024)
            sys.stdout.write(f"\r  {mb:.0f}MB ({pct}%)")
            sys.stdout.flush()

        urllib.request.urlretrieve(GLOVE_URL, GLOVE_ZIP, reporthook=progress)
        print()

    print("Extracting glove.6B.50d.txt...")
    with zipfile.ZipFile(GLOVE_ZIP, "r") as zf:
        # Extract only the 50d file
        zf.extract("glove.6B.50d.txt", GLOVE_DIR)

    print(f"Extracted to {GLOVE_FILE}")


# --- Load GloVe vectors ---
def load_glove(path: Path) -> dict[str, np.ndarray]:
    """Load GloVe vectors into a dict."""
    print(f"Loading GloVe vectors from {path}...")
    vectors = {}
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.split()
            word = parts[0]
            vec = np.array([float(x) for x in parts[1:]], dtype=np.float32)
            vectors[word] = vec
    print(f"  Loaded {len(vectors)} word vectors ({DIMENSIONS}d)")
    return vectors


# --- Resolve label to GloVe vector ---
def resolve_label(label: str, glove: dict[str, np.ndarray]) -> np.ndarray | None:
    """
    Try multiple strategies to find a GloVe vector for a label:
    1. Exact match (lowercase)
    2. Replace underscores/hyphens with nothing
    3. First token of multi-word label
    4. Average of all tokens
    """
    # Normalize: lowercase, replace special chars
    clean = label.lower().replace("the_", "").strip("_")

    # Strategy 1: exact match
    if clean in glove:
        return glove[clean]

    # Strategy 2: replace separators
    joined = clean.replace("_", "").replace("-", "")
    if joined in glove:
        return glove[joined]

    # Strategy 3 & 4: tokenize
    tokens = clean.replace("-", "_").split("_")
    token_vecs = [glove[t] for t in tokens if t in glove]

    if token_vecs:
        # Return average of found token vectors
        return np.mean(token_vecs, axis=0).astype(np.float32)

    return None


# --- Compute cosine similarity matrix ---
def cosine_similarity_matrix(vectors: np.ndarray) -> np.ndarray:
    """Compute pairwise cosine similarity for row vectors."""
    # Normalize each row
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1  # avoid division by zero
    normalized = vectors / norms
    # Cosine similarity = dot product of normalized vectors
    return normalized @ normalized.T


def main():
    # 1. Extract labels
    labels = extract_labels(LABELS_FILE)
    print(f"Found {len(labels)} labels in labels.ts")

    # 2. Download GloVe
    download_glove()

    # 3. Load GloVe
    glove = load_glove(GLOVE_FILE)

    # 4. Resolve vectors for each label
    vectors = []
    found = []
    missing = []

    for label in labels:
        vec = resolve_label(label, glove)
        if vec is not None:
            vectors.append(vec)
            found.append(label)
        else:
            missing.append(label)
            # Use zero vector as fallback (will result in 0 similarity)
            vectors.append(np.zeros(DIMENSIONS, dtype=np.float32))
            found.append(label)

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
            # Round to 4 decimal places for compactness
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
