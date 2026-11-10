# Claude Days

A living knowledge atlas for the PDFs in `docs/`, hosted as a static site on GitHub Pages.

- **Course map** – all 40 days at a glance; unpublished days show as "coming soon"
- **Library** – cover gallery + sidebar, instant search (titles, commands, summaries)
- **Reader** – in-browser PDF viewer, prev/next, "mark read" (progress saved in the browser)
- **Shortcuts** – `/` search · `j` / `k` next/prev · `Esc` back

## Add a new day

1. Drop the PDF into `docs/` (e.g. `Learning Claude Day 13.pdf`). Days are ordered by the number in the filename; any other `*.pdf` also works.
2. _(Optional, recommended)_ add its title/tag/summary to `docs/catalog.json`:

   ```json
   "13": { "title": "…", "tag": "/command", "summary": "One-line description." }
   ```

3. Commit and push. The **Deploy GitHub Pages** workflow rebuilds `manifest.json` and the cover thumbnails and publishes the site. Nothing else to edit.

Change the course name or total day count in the `course` block of `docs/catalog.json`.

## Enable GitHub Pages (once)

Repo **Settings → Pages → Source: GitHub Actions**, then push to `main`.

Site: `https://tijaarat-rabeha.github.io/claude-ai-learning/`

## Preview locally

```bash
pip install pymupdf            # optional: cover thumbnails + page counts
python3 scripts/generate-manifest.py
python3 -m http.server 8080    # open http://localhost:8080
```

Without PyMuPDF the site still works; cards just show a plain tile instead of a cover.
