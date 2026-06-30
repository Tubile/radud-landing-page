/* ===========================================================================
   רדוד — script.js
   Vanilla JS. אין תלויות.
   ⬇⬇⬇  כל מה שמתחלף לעיתים קרובות נמצא ב-CONFIG. ערוך רק כאן.  ⬇⬇⬇
   =========================================================================== */
const CONFIG = {
  // כתובת ה-Web App של Google Apps Script (doGet מחזיר {remaining}).
  // השאר ריק עד שתעשה deploy — אז יוצג fallbackRemaining במקום.
  // <TODO> הדבק כאן את ה-URL מ-"Deploy as Web App".
  apiUrl: "",

  // מספר המלאי שיוצג כל עוד ה-API לא מחובר / לא זמין. <X> גודל המהדורה.
  fallbackRemaining: 250,

  // וואטסאפ — פורמט בינלאומי בלי + ובלי 0 מוביל. לדוגמה: "972501234567".
  // <PLACEHOLDER>
  whatsapp: "",
  whatsappText: "היי, יש לי שאלה על רדוד",

  // מייל יצירת קשר. <PLACEHOLDER>
  email: "",

  // שלושת הטריגרים לקלפי ההיפוך (ניתן להחלפה חופשית).
  triggers: [
    "כעס הוא עצב שלא נתנו לו לבכות.",
    "\u201Cככה אני\u201D הוא השם שנתת לפחד להשתנות.",
    "רוב האנשים לא מפחדים למות — אלא שאיש לא ישים לב שחיו.",
  ],
};

/* ===========================================================================
   עזרים קטנים
   =========================================================================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ערבוב מערך (Fisher–Yates) — להקצאת טריגרים אקראית
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===========================================================================
   לוגו — "רדוד." עם ה-ו' הצוללת. נבנה לכל אלמנט עם [data-logo].
   המבנה: ר ד ו(צוללת) ד  + נקודת פליז.
   =========================================================================== */
function buildLogo() {
  const WORD = "רדוד";
  const DIVE_INDEX = 2; // ה-ו' (אינדקס 2: ר=0, ד=1, ו=2, ד=3)

  $$("[data-logo]").forEach((el) => {
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
   פיצ'ר ההיפוך — שלושה קלפים, טריגרים אקראיים, היפוך אחד בלבד.
   =========================================================================== */
function buildFlip() {
  const row = $("[data-flip-row]");
  const hint = $("[data-flip-hint]");
  const more = $("[data-flip-more]");
  if (!row) return;

  const picks = shuffle(CONFIG.triggers).slice(0, 3);
  let used = false; // האם כבר הפכו קלף

  picks.forEach((text) => {
    const card = document.createElement("button");
    card.className = "flip-card";
    card.type = "button";
    card.setAttribute("aria-label", "הפוך קלף לחשיפת טריגר");

    card.innerHTML = `
      <span class="flip-card__inner">
        <span class="flip-card__face flip-card__cover">
          <span class="logo" data-logo aria-hidden="true"></span>
        </span>
        <span class="flip-card__face flip-card__trigger">
          <span class="trigger__text">${text}</span>
        </span>
      </span>`;

    card.addEventListener("click", () => {
      if (used) return;          // מותר להפוך קלף אחד בלבד
      used = true;

      card.classList.add("is-flipped");
      card.setAttribute("aria-label", "טריגר נחשף");
      row.classList.add("is-locked");

      // נעילת שאר הקלפים
      $$(".flip-card", row).forEach((c) => {
        if (c !== card) c.disabled = true;
      });

      if (hint) { hint.textContent = "זה אחד. נשארו עוד 59."; hint.classList.add("is-done"); }

      // חשיפת ה-CTA ב-fade
      if (more) {
        more.hidden = false;
        requestAnimationFrame(() => more.classList.add("is-visible"));
      }
    });

    row.appendChild(card);
  });

  // בניית הלוגו בתוך גב הקלפים (אחרי שנוספו ל-DOM)
  buildLogo();
}

/* ===========================================================================
   קריאת מלאי — doGet מחזיר {remaining}. עדכון המונה ונעילת רכישה אם 0.
   אם אין apiUrl / הקריאה נכשלת — נופלים ל-fallbackRemaining.
   =========================================================================== */
async function loadRemaining() {
  const countEl = $("[data-remaining]");
  let remaining = CONFIG.fallbackRemaining;

  if (CONFIG.apiUrl) {
    try {
      const res = await fetch(CONFIG.apiUrl, { method: "GET" });
      const data = await res.json();
      if (typeof data.remaining === "number") remaining = data.remaining;
    } catch (err) {
      // נכשל (למשל CORS) — נשארים עם ה-fallback. ראה README לחלופות.
      console.warn("שליפת מלאי נכשלה, מוצג fallback:", err);
    }
  }

  if (countEl) countEl.textContent = remaining;

  // אזל מהמלאי — נעילת כל כפתורי הרכישה
  if (remaining <= 0) {
    $$(".pack").forEach((p) => p.classList.add("is-sold-out"));
    const msg = $("[data-pricing-msg]");
    if (msg) msg.textContent = "אזל מהמלאי. מהדורה חדשה בקרוב.";
  }
}

/* ===========================================================================
   בחירת חבילה — כרטיס 2 (duo) נבחר מראש. לחיצה על כרטיס/CTA מסמנת.
   הכפתור הוא פלייסהולדר עד לחיבור GROW (ראה TODO ב-README).
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
    // לחיצה על הכרטיס בוחרת אותו
    pack.addEventListener("click", () => select(pack));
    // נגישות מקלדת — Enter/רווח
    pack.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(pack); }
    });
  });

  // כפתורי "לרכישה" — בוחרים את החבילה ומציגים הודעת ביניים (עד GROW)
  $$("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pack = btn.closest(".pack");
      select(pack);
      // <TODO GROW> כאן ייכנס מעבר לצ'קאאוט של החבילה הנבחרת.
      if (msg) msg.textContent = "החבילה נבחרה. חיבור הצ׳קאאוט יושלם בקרוב.";
    });
  });
}

/* ===========================================================================
   סליידר ההמלצות — חיצים (במובייל גוללים ביד; בדסקטופ יש חיצים)
   =========================================================================== */
function initSlider() {
  const track = $("[data-slider]");
  if (!track) return;
  const step = () => Math.min(track.clientWidth * 0.85, 360);

  $$("[data-slide]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // ב-RTL הכיוון הפיזי הפוך — prev גולל ימינה (ערך חיובי)
      const dir = btn.dataset.slide === "next" ? -1 : 1;
      track.scrollBy({ left: dir * step(), behavior: "smooth" });
    });
  });
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
  buildLogo();      // לוגואים סטטיים (נאב, פוטר)
  buildFlip();      // קלפי ההיפוך (בונה גם את הלוגו שבגב הקלף)
  loadRemaining();  // מונה המלאי
  initPricing();    // בחירת חבילות
  initSlider();     // סליידר המלצות
  wireContacts();   // וואטסאפ / מייל
});
