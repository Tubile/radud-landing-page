/* ===========================================================================
   רדוד — script.js (V3)
   Vanilla JS. אין תלויות.
   ⬇⬇⬇  כל מה שמתחלף לעיתים קרובות נמצא ב-CONFIG. ערוך רק כאן.  ⬇⬇⬇

   ⚠️ אם כבר מילאת apiUrl / whatsapp / email בקובץ הקודם —
      העתק אותם לכאן. אלו שלושת השדות היחידים שצריך להעביר.
      
   =========================================================================== */
const CONFIG = {
  // כתובת ה-Web App של Google Apps Script (doGet מחזיר {remaining}).
  // <TODO> הדבק כאן את ה-URL מ-"Deploy as Web App".
  apiUrl: "",

  // מספר המלאי שיוצג כל עוד ה-API לא מחובר / לא זמין.
  fallbackRemaining: 1000,

  // וואטסאפ — פורמט בינלאומי בלי + ובלי 0 מוביל. לדוגמה: "972501234567".
  // <PLACEHOLDER>
  whatsapp: "",
  whatsappText: "היי, יש לי שאלה על רדוד",

  // מייל יצירת קשר. <PLACEHOLDER>
  email: "",

  // מאגר הטריגרים לקלף שבהירו — כולם אמיתיים, מדרגת "מים רדודים".
  // בכל טעינה נשלף אחד אקראי. אפשר להוסיף/להחליף חופשי.
  triggers: [
    "עלבונות זוכרים מילה במילה. מחמאות? בערך.",
    "עצלנות היא לא חוסר באנרגיה. היא פחד שלבש בגדי נוחות.",
    "כעס הוא כמעט תמיד עצב שלא נתנו לו לבכות.",
    "רוב הזמן אנחנו לא באמת מחפשים עצה, אנחנו מחפשים קהל.",
    "אתה לא \u201Cעסוק\u201D. אתה פשוט בורח מלשבת לבד עם המחשבות שלך.",
    "מי שמרגיש צורך להזכיר לך שהוא הבוס, כנראה שהוא לא.",
  ],
};

/* ===========================================================================
   עזרים
   =========================================================================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const REDUCE_MOTION =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===========================================================================
   לוגו — "רדוד." עם ה-ו' הצוללת. נבנה לכל אלמנט עם [data-logo].
   =========================================================================== */
function buildLogo() {
  const WORD = "רדוד";
  const DIVE_INDEX = 2; // ה-ו'

  $$("[data-logo]").forEach((el) => {
    if (el.dataset.built) return;
    el.dataset.built = "1";

    const word = document.createElement("span");
    word.className = "logo__word";
    [...WORD].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "logo__l" + (i === DIVE_INDEX ? " logo__l--dive" : "");
      s.textContent = ch;
      word.appendChild(s);
    });
    const dot = document.createElement("span");
    dot.className = "logo__dot";
    dot.textContent = ".";

    el.innerHTML = "";
    el.append(word, dot);
  });
}

/* ===========================================================================
   קלף אחד, על החשבון — קלף בודד, טריגר אקראי אמיתי, היפוך אחד.
   =========================================================================== */
function buildFlip() {
  const row  = $("[data-flip-row]");
  const hint = $("[data-flip-hint]");
  if (!row) return;

  const text = CONFIG.triggers[Math.floor(Math.random() * CONFIG.triggers.length)];

  const card = document.createElement("button");
  card.className = "flip-card";
  card.type = "button";
  card.setAttribute("aria-label", "הפוך את הקלף");

  card.innerHTML = `
    <span class="flip-card__inner">
      <span class="flip-card__face flip-card__face--back flip-card__cover">
        <span class="logo" data-logo aria-hidden="true"></span>
      </span>
      <span class="flip-card__face flip-card__face--front flip-card__trigger">
        <span class="trigger__text">${text}</span>
      </span>
    </span>`;

  card.addEventListener("click", () => {
    if (card.classList.contains("is-flipped")) return;
    card.classList.add("is-flipped");
    card.setAttribute("aria-label", "הקלף נחשף");
    if (hint) {
      hint.textContent = "זה אחד. יש עוד 59.";
      hint.classList.add("is-done");
    }
  });

  row.appendChild(card);
  buildLogo(); // הלוגו שבגב הקלף
}

/* ===========================================================================
   קריאת מלאי — doGet מחזיר {remaining}. מעדכן את כל המונים בדף.
   =========================================================================== */
async function loadRemaining() {
  let remaining = CONFIG.fallbackRemaining;

  if (CONFIG.apiUrl) {
    try {
      const res = await fetch(CONFIG.apiUrl, { method: "GET" });
      const data = await res.json();
      if (typeof data.remaining === "number") remaining = data.remaining;
    } catch (err) {
      console.warn("שליפת מלאי נכשלה, מוצג fallback:", err);
    }
  }

  $$("[data-remaining]").forEach((el) => (el.textContent = remaining));

  if (remaining <= 0) {
    $$(".pack").forEach((p) => p.classList.add("is-sold-out"));
    const msg = $("[data-pricing-msg]");
    if (msg) msg.textContent = "אזל מהמלאי. מהדורה חדשה בקרוב.";
  }
}

/* ===========================================================================
   בחירת חבילה — duo נבחרת מראש. הכפתור פלייסהולדר עד חיבור GROW.
   =========================================================================== */
function initPricing() {
  const grid = $("[data-pricing]");
  const msg = $("[data-pricing-msg]");
  if (!grid) return;

  const packs = $$(".pack", grid);

  function select(pack) {
    if (pack.classList.contains("is-sold-out")) return;
    packs.forEach((p) => p.setAttribute("aria-pressed", String(p === pack)));
  }

  packs.forEach((pack) => {
    pack.addEventListener("click", () => select(pack));
    pack.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(pack); }
    });
  });

  $$("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pack = btn.closest(".pack");
      select(pack);
      // <TODO GROW> כאן ייכנס המעבר לצ'קאאוט של החבילה הנבחרת.
      if (msg) msg.textContent = "החבילה נבחרה. חיבור הצ׳קאאוט יושלם בקרוב.";
    });
  });
}

/* ===========================================================================
   סליידר ההמלצות
   =========================================================================== */
function initSlider() {
  const track = $("[data-slider]");
  if (!track) return;
  const step = () => Math.min(track.clientWidth * 0.85, 360);

  $$("[data-slide]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.dataset.slide === "next" ? -1 : 1;
      track.scrollBy({ left: dir * step(), behavior: "smooth" });
    });
  });
}

/* ===========================================================================
   FAQ — פתיחה של אחד סוגרת את השאר
   =========================================================================== */
function initFaq() {
  const list = $("[data-faq]");
  if (!list) return;
  $$("details", list).forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      $$("details[open]", list).forEach((o) => { if (o !== d) o.open = false; });
    });
  });
}

/* ===========================================================================
   פס רכישה צף (מובייל) — מופיע אחרי שגוללים מעבר להירו,
   ונעלם כשמגיעים לאזור החבילות (כדי לא לכסות את הכפתורים).
   =========================================================================== */
function initStickyBar() {
  const bar = $("[data-stickybar]");
  const hero = $("#hero");
  const pricing = $("#pricing");
  if (!bar || !hero) return;

  bar.hidden = false;

  let pastHero = false;
  let inPricing = false;

  const update = () => bar.classList.toggle("show", pastHero && !inPricing);

  new IntersectionObserver(([e]) => {
    pastHero = !e.isIntersecting;
    update();
  }, { rootMargin: "-80px 0px 0px 0px" }).observe(hero);

  if (pricing) {
    new IntersectionObserver(([e]) => {
      inPricing = e.isIntersecting;
      update();
    }, { rootMargin: "0px 0px -35% 0px" }).observe(pricing);
  }
}

/* ===========================================================================
   חשיפה בגלילה — כל סקשן עולה בעדינות. מכבד reduced-motion.
   =========================================================================== */
function initReveals() {
  const sections = $$("main > section");
  if (REDUCE_MOTION || !("IntersectionObserver" in window)) return;

  sections.forEach((s) => s.classList.add("reveal"));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -10% 0px" });

  sections.forEach((s) => io.observe(s));

  // רשת ביטחון — אחרי 2.5 שניות הכל גלוי גם אם משהו השתבש
  setTimeout(() => sections.forEach((s) => s.classList.add("in")), 2500);
}

/* ===========================================================================
   חיווט וואטסאפ + מייל מתוך CONFIG
   =========================================================================== */
function wireContacts() {
  if (CONFIG.whatsapp) {
    const href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.whatsappText)}`;
    $$("[data-wa]").forEach((a) => (a.href = href));
  }
  if (CONFIG.email) {
    $$("[data-email]").forEach((a) => (a.href = `mailto:${CONFIG.email}`));
  }
}

/* ===========================================================================
   אתחול
   =========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  buildLogo();
  buildFlip();
  loadRemaining();
  initPricing();
  initSlider();
  initFaq();
  initStickyBar();
  initReveals();
  wireContacts();
});
