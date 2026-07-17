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
      <span class="flip-card__inner" style="display: block;">
        <span class="flip-card__face flip-card__face--back flip-card__cover" style="display: flex; padding: 0; border: none;">
          <img src="../assets/ui/backfeaturecard.png" alt="גב הקלף" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;" />
        </span>
        <span class="flip-card__face flip-card__face--front flip-card__trigger" style="display: flex; padding: 0; border: none;">
          <img src="archived-assets/featurecard.jpg" alt="קלף טריגר" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;" />
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
   מגנט לידים — פופ-אפ לוגיקה
   =========================================================================== */
function initLeadPopup() {
  if (localStorage.getItem("radud_popup_seen") || localStorage.getItem("radud_lead")) return;

  const popup = document.getElementById("lead-popup");
  const closeBtn = document.getElementById("popup-close");
  if (!popup) return;

  let isTriggered = false;

  const triggerPopup = () => {
    if (isTriggered) return;
    isTriggered = true;
    
    popup.hidden = false;
    localStorage.setItem("radud_popup_seen", "1"); 
    
    window.removeEventListener("scroll", scrollCheck);
  };

  const timer = setTimeout(triggerPopup, 45000);

  const scrollCheck = () => {
    const scrollPosition = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = scrollPosition / documentHeight;

    if (scrollPercentage >= 0.6) {
      clearTimeout(timer);
      triggerPopup();
    }
  };

  window.addEventListener("scroll", scrollCheck);

  closeBtn.addEventListener("click", () => {
    popup.hidden = true;
  });

  popup.addEventListener("click", (e) => {
    if (e.target === popup) popup.hidden = true;
  });
}

/* ===========================================================================
   חיבור טפסים לקלאביו (AJAX שקט)
   =========================================================================== */
function initKlaviyoForms() {
  // TODO: החלף את המילים פה בקוד ה-List ID שהעתקת מקלאביו
  const LIST_ID = "UV4h7a";
  const PUBLIC_KEY = "Y3xwhu";

  const forms = [document.getElementById("inline-lead-form"), document.getElementById("popup-lead-form")];

  forms.forEach(form => {
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault(); // מונע מהדף להתרענן
      
      const emailInput = form.querySelector('input[name="email"]');
      const btn = form.querySelector('button[type="submit"]');
      const micro = form.querySelector('.lead-form__micro');
      
      const email = emailInput.value.trim();
      if (!email) return;

      // שינוי מצב כפתור בזמן שליחה
      const originalBtnText = btn.textContent;
      btn.textContent = "שולח...";
      btn.disabled = true;

      // שיגור ל-Klaviyo Client API (הדרך הרשמית מאתר סטטי)
      fetch('https://a.klaviyo.com/client/subscriptions/?company_id=' + PUBLIC_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'revision': '2024-10-15'
        },
        body: JSON.stringify({
          data: {
            type: 'subscription',
            attributes: {
              profile: { data: { type: 'profile', attributes: { email: email } } }
            },
            relationships: { list: { data: { type: 'list', id: LIST_ID } } }
          }
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('klaviyo ' + res.status);
      })
      .then(() => {
        // עיצוב ההצלחה
        btn.textContent = "נשלח.";
        micro.textContent = "הקלפים בדרך למייל שלך.";
        micro.style.color = "var(--brass)"; // צבע פליז כדי לאשר הצלחה
        
        // סימון שהליד נרשם כדי לא להציג לו את הפופ-אפ יותר לעולם
        localStorage.setItem("radud_lead", "1");
        
        // אם זה הפופ-אפ, נסגור אותו באלגנטיות אחרי 2 שניות
        if (form.id === "popup-lead-form") {
          setTimeout(() => {
            const popup = document.getElementById("lead-popup");
            if (popup) popup.hidden = true;
          }, 2000);
        }
      })
      .catch(err => {
        // במידה ויש שגיאת רשת
        btn.textContent = originalBtnText;
        btn.disabled = false;
        micro.textContent = "משהו השתבש בדרך. נסה שוב.";
      });
    });
  });
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
  initLeadPopup();
  initKlaviyoForms();
});

