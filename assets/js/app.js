const READ_KEY = "claude-days:read";
const LAST_KEY = "claude-days:last";

const state = {
  manifest: null,
  docs: [],
  filtered: [],
  query: "",
  series: "all",
  activeId: null,
  read: loadSet(READ_KEY),
};

const $ = (id) => document.getElementById(id);
const els = {
  landing: $("landing"),
  explorer: $("explorer"),
  brandName: $("brand-name"),
  heroPill: $("hero-pill"),
  heroLead: $("hero-lead"),
  journeyMeta: $("journey-meta"),
  courseMap: $("course-map"),
  latest: $("latest"),
  railMeta: $("rail-meta"),
  filters: $("filters"),
  docList: $("doc-list"),
  gallery: $("gallery"),
  galleryWrap: $("gallery-wrap"),
  search: $("search"),
  progressChip: $("progress-chip"),
  progressLabel: $("progress-label"),
  btnStart: $("btn-start"),
  btnContinue: $("btn-continue"),
  readerFrame: $("reader-frame"),
  readerPills: $("reader-pills"),
  readerTitle: $("reader-title"),
  readerSummary: $("reader-summary"),
  readerFootLabel: $("reader-foot-label"),
  readerDots: $("reader-dots"),
  pdfFrame: $("pdf-frame"),
  btnBack: $("btn-back"),
  btnPrev: $("btn-prev"),
  btnNext: $("btn-next"),
  btnMark: $("btn-mark"),
  btnOpen: $("btn-open"),
};

function loadSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}

function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* private mode */
  }
}

function remember(id) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* ignore */
  }
}

function recall() {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

const findDoc = (id) => state.docs.find((d) => d.id === id) || null;
const findByDay = (day) => state.docs.find((d) => d.day === day) || null;
const activeIndex = () => state.docs.findIndex((d) => d.id === state.activeId);
const dayNum = (d) => (d.day != null ? String(d.day).padStart(2, "0") : "•");
const latestDoc = () =>
  [...state.docs].sort((a, b) => (b.day ?? -1) - (a.day ?? -1))[0] || null;

function dayPill(d) {
  const total = state.manifest?.totalDays;
  if (d.day == null) return d.label;
  return total ? `Day ${d.day}/${total}` : `Day ${d.day}`;
}

function parseRoute() {
  const [view, param] = location.hash.replace(/^#\/?/, "").split("/");
  if (view === "library") return { view: "library" };
  if (view === "doc" && param)
    return { view: "doc", doc: findDoc(decodeURIComponent(param)) };
  if (view === "day" && param)
    return { view: "doc", doc: findByDay(Number(param)) };
  return { view: "home" };
}

function go(hash) {
  if (location.hash === hash) renderRoute();
  else location.hash = hash;
}

function renderRoute() {
  const route = parseRoute();
  if (route.view === "home") showLanding();
  else showLibrary(route.doc || null);
  window.scrollTo({
    top: 0,
    behavior: "instant" in window ? "instant" : "auto",
  });
}

function applyFilter() {
  const q = state.query.trim().toLowerCase();
  state.filtered = state.docs.filter((d) => {
    if (state.series !== "all" && d.series !== state.series) return false;
    if (!q) return true;
    return [d.label, d.title, d.tag, d.summary, d.series, d.filename, d.day]
      .filter((v) => v != null)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

function updateProgress() {
  const total = state.docs.length;
  const done = state.docs.filter((d) => state.read.has(d.id)).length;
  els.progressLabel.textContent = `${done}/${total}`;
  els.progressChip.hidden = total === 0;
  els.progressChip.title = `${done} of ${total} lessons marked done`;
}

function renderCourseMap() {
  const { totalDays } = state.manifest;
  const numbered = state.docs.filter((d) => d.day != null);
  const extras = state.docs.filter((d) => d.day == null);
  const slots = Math.max(totalDays || 0, numbered.length);
  const tiles = [];

  for (let n = 1; n <= slots; n += 1) {
    const doc = findByDay(n);
    if (doc) {
      const cls = state.read.has(doc.id) ? "is-read" : "is-new";
      tiles.push(
        `<li><button type="button" class="tile ${cls}" data-open="${esc(doc.id)}" title="${esc(`Day ${n} · ${doc.title}`)}">${n}</button></li>`,
      );
    } else {
      tiles.push(
        `<li><span class="tile is-soon" title="Day ${n} — still on the way">${n}</span></li>`,
      );
    }
  }

  extras.forEach((doc) => {
    const cls = state.read.has(doc.id) ? "is-read" : "is-new";
    tiles.push(
      `<li><button type="button" class="tile ${cls}" data-open="${esc(doc.id)}" title="${esc(doc.title)}">+</button></li>`,
    );
  });

  els.courseMap.innerHTML = tiles.join("");
  const published = state.docs.length;
  els.journeyMeta.textContent = totalDays
    ? `${published} of ${totalDays}`
    : `${published} lessons`;
}

function showLanding() {
  els.landing.hidden = false;
  els.explorer.hidden = true;
  state.activeId = null;
  els.pdfFrame.removeAttribute("src");
  document.title = "Learning Claude · AI Tijaarat Rabeha";

  const last = findDoc(recall());
  els.btnContinue.hidden = !last;
  if (last) els.btnContinue.textContent = `Continue ${last.label}`;

  const latest = latestDoc();
  if (latest) {
    els.latest.hidden = false;
    els.latest.dataset.open = latest.id;
    els.latest.innerHTML = `
      <span class="callout-kicker">Just added · ${esc(latest.label)}</span>
      <strong>${esc(latest.title)}</strong>`;
  } else {
    els.latest.hidden = true;
  }

  renderCourseMap();
}

function renderFilters() {
  const series = state.manifest.series || [];
  els.filters.hidden = series.length < 2;
  if (els.filters.hidden) return;
  els.filters.innerHTML = ["all", ...series]
    .map(
      (s) =>
        `<button type="button" class="filter-btn ${state.series === s ? "is-active" : ""}" data-series="${esc(s)}">${s === "all" ? "All" : esc(s)}</button>`,
    )
    .join("");
}

function renderDocList() {
  els.railMeta.textContent = `${state.filtered.length}/${state.docs.length}`;
  if (!state.filtered.length) {
    els.docList.innerHTML = `<li class="empty-state">No lesson matches “${esc(state.query)}”.</li>`;
    return;
  }
  els.docList.innerHTML = state.filtered
    .map((d) => {
      const read = state.read.has(d.id);
      return `
        <li>
          <button type="button" class="${d.id === state.activeId ? "is-active" : ""}" data-open="${esc(d.id)}">
            <span class="day-num ${read ? "is-read" : ""}">${read ? "✓" : dayNum(d)}</span>
            <span class="meta">
              <strong>${esc(d.title)}</strong>
              <span>${esc(d.tag || d.label)}</span>
            </span>
          </button>
        </li>`;
    })
    .join("");
}

function renderGallery() {
  if (!state.filtered.length) {
    els.gallery.innerHTML = `<li class="empty-state">No lesson matches “${esc(state.query)}”.</li>`;
    return;
  }
  els.gallery.innerHTML = state.filtered
    .map((d) => {
      const read = state.read.has(d.id);
      const cover = d.cover
        ? `<img src="${esc(encodePath(d.cover))}" alt="" loading="lazy" />`
        : `<span class="cover-fallback">${esc(d.label)}</span>`;
      return `
        <li>
          <button type="button" class="card ring lesson-card" data-open="${esc(d.id)}">
            <span class="lesson-cover">${cover}${read ? '<span class="badge-read">Done</span>' : ""}</span>
            <span class="lesson-body">
              <span class="lesson-meta">
                <span class="pill">${esc(dayPill(d))}</span>
                ${d.tag ? `<span class="pill muted">${esc(d.tag)}</span>` : ""}
              </span>
              <strong>${esc(d.title)}</strong>
            </span>
          </button>
        </li>`;
    })
    .join("");
}

function renderDots() {
  els.readerDots.innerHTML = state.docs
    .map((d) => {
      const cls = [
        d.id === state.activeId ? "is-active" : "",
        state.read.has(d.id) ? "is-read" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<button type="button" class="${cls}" data-open="${esc(d.id)}" title="${esc(`${d.label} · ${d.title}`)}" aria-label="${esc(d.label)}"></button>`;
    })
    .join("");
}

function showGallery() {
  state.activeId = null;
  els.galleryWrap.hidden = false;
  els.readerFrame.hidden = true;
  els.pdfFrame.removeAttribute("src");
  document.title = "All lessons · Learning Claude";
  renderGallery();
  renderDocList();
}

function showLibrary(doc) {
  els.landing.hidden = true;
  els.explorer.hidden = false;
  applyFilter();
  renderFilters();
  if (doc) showDoc(doc);
  else showGallery();
}

function showDoc(doc) {
  state.activeId = doc.id;
  remember(doc.id);

  els.galleryWrap.hidden = true;
  els.readerFrame.hidden = false;
  els.readerPills.innerHTML = [
    `<span class="pill">${esc(dayPill(doc))}</span>`,
    doc.tag ? `<span class="pill muted">${esc(doc.tag)}</span>` : "",
    doc.pages ? `<span class="pill muted">${doc.pages} pages</span>` : "",
  ].join("");
  els.readerTitle.textContent = doc.title;
  els.readerSummary.textContent = doc.summary || "";
  els.readerSummary.hidden = !doc.summary;
  els.btnOpen.href = encodePath(doc.path);

  const src = `${encodePath(doc.path)}#view=FitH`;
  if (els.pdfFrame.getAttribute("src") !== src) els.pdfFrame.src = src;

  const idx = activeIndex();
  els.btnPrev.disabled = idx <= 0;
  els.btnNext.disabled = idx < 0 || idx >= state.docs.length - 1;
  els.btnMark.textContent = state.read.has(doc.id) ? "Done ✓" : "Mark done";
  els.readerFootLabel.textContent =
    idx < state.docs.length - 1
      ? `Next up: ${state.docs[idx + 1].label}`
      : "That’s the latest lesson for now";
  document.title = `${doc.label}: ${doc.title} · Learning Claude`;
  renderDocList();
  renderDots();
}

function openDoc(doc) {
  if (doc) go(`#/doc/${encodeURIComponent(doc.id)}`);
}

function move(delta) {
  const idx = activeIndex();
  openDoc(idx < 0 ? state.docs[0] : state.docs[idx + delta]);
}

function toggleRead(doc) {
  if (!doc) return;
  if (state.read.has(doc.id)) state.read.delete(doc.id);
  else state.read.add(doc.id);
  saveSet(READ_KEY, state.read);
  updateProgress();
  els.btnMark.textContent = state.read.has(doc.id) ? "Done ✓" : "Mark done";
  renderDocList();
  renderDots();
}

function bindEvents() {
  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    applyFilter();
    if (!els.landing.hidden && state.query.trim()) {
      go("#/library");
      return;
    }
    if (!els.explorer.hidden) {
      renderDocList();
      if (!els.galleryWrap.hidden) renderGallery();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target?.tagName || "");
    if (e.key === "/" && !typing) {
      e.preventDefault();
      els.search.focus();
      els.search.select();
      return;
    }
    if (e.key === "Escape") {
      if (typing) els.search.blur();
      else go(state.activeId ? "#/library" : "#/");
      return;
    }
    if (typing) return;
    if (e.key === "j" || e.key === "ArrowRight") move(1);
    if (e.key === "k" || e.key === "ArrowLeft") move(-1);
  });

  els.btnStart.addEventListener("click", () => openDoc(state.docs[0]));
  els.btnContinue.addEventListener("click", () => openDoc(findDoc(recall())));
  els.btnBack.addEventListener("click", () => go("#/library"));
  els.btnPrev.addEventListener("click", () => move(-1));
  els.btnNext.addEventListener("click", () => move(1));
  els.btnMark.addEventListener("click", () =>
    toggleRead(findDoc(state.activeId)),
  );

  document.body.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open]");
    if (openBtn) {
      openDoc(findDoc(openBtn.dataset.open));
      return;
    }
    const seriesBtn = e.target.closest("[data-series]");
    if (seriesBtn) {
      state.series = seriesBtn.dataset.series;
      applyFilter();
      renderFilters();
      renderDocList();
      if (!els.galleryWrap.hidden) renderGallery();
    }
  });

  window.addEventListener("hashchange", renderRoute);
}

async function boot() {
  bindEvents();
  try {
    const res = await fetch("./manifest.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`manifest.json → HTTP ${res.status}`);
    state.manifest = await res.json();
    state.docs = state.manifest.documents || [];

    if (state.manifest.course) {
      const short = String(state.manifest.course).split("·")[0].trim();
      els.brandName.textContent = short || state.manifest.course;
    }
    els.heroLead.textContent =
      state.manifest.tagline ||
      "Short daily lessons for people who want Claude to actually help with the work.";

    const newest = latestDoc();
    els.heroPill.textContent = newest
      ? `${dayPill(newest)} is ready`
      : "Coming soon";

    applyFilter();
    updateProgress();
    renderRoute();
  } catch (err) {
    console.error(err);
    els.landing.hidden = false;
    els.heroLead.textContent =
      "The lesson list didn’t load. Try refreshing in a moment.";
  }
}

boot();
