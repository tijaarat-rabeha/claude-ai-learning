#!/usr/bin/env python3
"""Build manifest.json (and cover thumbnails) from the PDFs in docs/.

- Every *.pdf under docs/ becomes an entry. "... Day N.pdf" files are ordered by N.
- docs/catalog.json (optional) adds a title / tag / summary per day, plus course info.
- Cover thumbnails are rendered from page 1 into assets/covers/ when PyMuPDF is
  installed (pip install pymupdf). Without it the app falls back to a styled tile.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = ROOT / "docs"
COVERS_DIR = ROOT / "assets" / "covers"
CATALOG = DOCS_DIR / "catalog.json"
OUT = ROOT / "manifest.json"

DAY_RE = re.compile(r"(?:day|d)\s*[_\-]?\s*(\d+)", re.I)
SERIES_RE = re.compile(r"^(.+?)\s+(?:day|d)\s*[_\-]?\s*\d+", re.I)
ID_RE = re.compile(r"[^a-z0-9]+")

try:
    import pymupdf  # type: ignore
except ImportError:  # pragma: no cover
    try:
        import fitz as pymupdf  # type: ignore
    except ImportError:
        pymupdf = None


def slug(text: str) -> str:
    return ID_RE.sub("-", text.lower()).strip("-")


def load_catalog() -> dict:
    if not CATALOG.is_file():
        return {}
    try:
        return json.loads(CATALOG.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        print(f"warning: could not parse {CATALOG.name}: {err}", file=sys.stderr)
        return {}


def inspect_pdf(path: Path, doc_id: str) -> tuple[int | None, str | None]:
    """Return (page_count, cover_rel_path). Renders the cover if missing/stale."""
    if pymupdf is None:
        return None, None
    try:
        pdf = pymupdf.open(path)
        pages = pdf.page_count
        cover = COVERS_DIR / f"{doc_id}.jpg"
        if not cover.exists() or cover.stat().st_mtime < path.stat().st_mtime:
            COVERS_DIR.mkdir(parents=True, exist_ok=True)
            page = pdf[0]
            zoom = 520 / page.rect.width
            pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
            pix.save(str(cover), jpg_quality=82)
        return pages, cover.relative_to(ROOT).as_posix()
    except Exception as err:  # noqa: BLE001
        print(f"warning: could not read {path.name}: {err}", file=sys.stderr)
        return None, None


def main() -> int:
    if not DOCS_DIR.is_dir():
        print("No docs/ directory found.", file=sys.stderr)
        return 1

    catalog = load_catalog()
    course = catalog.get("course", {})
    days_meta = catalog.get("days", {})
    by_file = catalog.get("files", {})  # optional overrides keyed by filename

    docs = []
    for path in sorted(DOCS_DIR.rglob("*.pdf")):
        if not path.is_file():
            continue
        stem = path.stem
        day_m = DAY_RE.search(stem)
        day = int(day_m.group(1)) if day_m else None
        series_m = SERIES_RE.match(stem)
        series = series_m.group(1).strip() if series_m else None
        doc_id = slug(stem)

        meta = {}
        if day is not None:
            meta.update(days_meta.get(str(day), {}))
        meta.update(by_file.get(path.name, {}))

        pages, cover = inspect_pdf(path, doc_id)
        label = f"Day {day}" if day is not None else stem
        docs.append(
            {
                "id": doc_id,
                "label": label,
                "title": meta.get("title") or label,
                "tag": meta.get("tag"),
                "summary": meta.get("summary"),
                "subtitle": series or stem,
                "filename": path.name,
                "path": path.relative_to(ROOT).as_posix(),
                "day": day,
                "series": series,
                "pages": pages,
                "cover": cover,
                "bytes": path.stat().st_size,
                "updatedAt": datetime.fromtimestamp(
                    path.stat().st_mtime, tz=timezone.utc
                ).isoformat(),
            }
        )

    if COVERS_DIR.is_dir():
        keep = {Path(d["cover"]).name for d in docs if d["cover"]}
        for stale in COVERS_DIR.glob("*.jpg"):
            if stale.name not in keep and pymupdf is not None:
                stale.unlink()

    docs.sort(
        key=lambda d: (
            d["day"] is None,
            d["day"] if d["day"] is not None else 10**9,
            d["label"].lower(),
        )
    )

    highest_day = max((d["day"] for d in docs if d["day"] is not None), default=0)
    total_days = max(int(course.get("totalDays", 0) or 0), highest_day) or None

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "title": "Claude Days",
        "course": course.get("name", "Claude learning notes"),
        "totalDays": total_days,
        "tagline": course.get(
            "tagline",
            "Short daily lessons for people who want Claude to actually help with the work.",
        ),
        "count": len(docs),
        "series": sorted({d["series"] for d in docs if d["series"]}),
        "documents": docs,
    }

    OUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    note = "" if pymupdf else " (PyMuPDF missing: no covers/page counts)"
    print(f"Wrote {OUT.name}: {len(docs)} documents{note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
