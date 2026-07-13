/* ===========================================================================
   רדוד — script.js (V3)
   Vanilla JS. אין תלויות.
   ⬇⬇⬇  כל מה שמתחלף לעיתים קרובות נמצא ב-CONFIG. ערוך רק כאן.  ⬇⬇⬇
   =========================================================================== */
const CONFIG = {
  // וואטסאפ — פורמט בינלאומי בלי + ובלי 0 מוביל. לדוגמה: "972501234567".
  // <PLACEHOLDER>
  whatsapp: "",
  whatsappText: "היי, יש לי שאלה על רדוד",

  // מייל יצירת קשר. <PLACEHOLDER>
  email: "",

  /* =========================================================================
     PayMe — תשלומים (מוכן, כבוי כברירת מחדל)
     -------------------------------------------------------------------------
     Docs: https://docs.payme.io  ·  https://payme.stoplight.io
     Partner / keys: partners@payme.io

     ⚠ Frontend: רק payme_client_key (Partner Key / public).
        לעולם לא secret keys בדפדפן.

     איך מפעילים כשתקבל מפתח:
       1. הדבק את payme_client_key למטה
       2. מלא paymentLinks (קישור תשלום מוכן לכל חבילה) — מומלץ לאתר סטטי
          או: מלא saleUrls אם קיבלת sale_url ישיר מ-PayMe
       3. שים enabled: true
       4. (אופציונלי) successUrl / callbackUrl לפי ההגדרה אצל PayMe

     זרימה: לחיצה על "לרכישה" → פותח מודל עם iframe של דף התשלום של PayMe.
     ========================================================================= */
  payme: {
    // false = כבוי (הכפתורים מציגים הודעת "בקרוב"). true = פעיל.
    enabled: false,

    // Partner Key / payme_client_key — מפתח ציבורי בלבד.
    clientKey: "", // <TODO PAYME> לדוגמה: "pmc-xxxxxxxx"

    // Seller / MPL id (לעיתים נדרש ביצירת sale בצד שרת — לא secret card data).
    // באתר סטטי עדיף Payment Links מוכנים; השדה כאן לתיעוד / שימוש עתידי.
    sellerPaymeId: "", // <TODO PAYME> לדוגמה: "MPLXXXX-..."

    // קישורי תשלום מוכנים (Payment Link / sale_url) לכל חבילה.
    // כשמוגדרים — ה-iframe טוען אותם ישירות. הכי מתאים לאתר סטטי.
    paymentLinks: {
      single: "", // <TODO PAYME> חפיסה אחת · ₪149
      duo:    "", // <TODO PAYME> שניים · ₪249
      trio:   "", // <TODO PAYME> שלושה · ₪339
      // upsell דיגיטלי בדף thankyou.html
      mitachat: "", // <TODO PAYME> מתחת לתהום · ₪29
    },

    // מחירים (אגורות או שקלים — לפי מה שתגדיר ב-PayMe; כאן לתיעוד UI בלבד)
    packs: {
      single:   { label: "אחד",          amountILS: 149 },
      duo:      { label: "שניים",        amountILS: 249 },
      trio:     { label: "שלושה",        amountILS: 339 },
      mitachat: { label: "מתחת לתהום",   amountILS: 29  },
    },

    // לאן לחזור אחרי תשלום מוצלח (PayMe success redirect — אם תומך בקישור)
    successUrl: "https://radud.com/thankyou.html",
    // cancel / close — נשארים בדף
  },
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
   בחירת חבילה — duo נבחרת מראש.
   כפתור "לרכישה" → PayMe (כש-CONFIG.payme.enabled = true).
   =========================================================================== */
function initPricing() {
  const grid = $("[data-pricing]");
  const msg = $("[data-pricing-msg]");
  if (!grid) return;

  const packs = $$(".pack", grid);

  function select(pack) {
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

      const packId = btn.getAttribute("data-buy") || pack?.dataset?.pack || "single";
      startPaymeCheckout(packId, msg);
    });
  });
}

/* ===========================================================================
   PayMe — iframe checkout (מוכן, לא פעיל עד enabled + paymentLinks)
   -------------------------------------------------------------------------
   זרימה מומלצת לאתר סטטי:
     Payment Link / sale_url מוכן לכל חבילה → iframe src = הקישור
   אלטרנטיבה (דורשת בדרך כלל backend):
     Generate-Sale API עם payme_client_key → sale_url → iframe
   =========================================================================== */
function startPaymeCheckout(packId, msgEl) {
  const payme = CONFIG.payme || {};
  const packMeta = (payme.packs && payme.packs[packId]) || { label: packId, amountILS: "" };

  // --- כבוי / חסרים פרטים: שומרים על התנהגות בטוחה, בלי לפתוח תשלום ---
  if (!payme.enabled) {
    if (msgEl) {
      msgEl.textContent =
        "החבילה נבחרה. חיבור PayMe יושלם בקרוב" +
        (packMeta.amountILS ? ` · ₪${packMeta.amountILS}` : "") +
        ".";
    }
    return;
  }

  const link =
    (payme.paymentLinks && payme.paymentLinks[packId]) ||
    "";

  if (!link) {
    if (msgEl) {
      msgEl.textContent =
        "חסר קישור תשלום לחבילה הזו. מלא CONFIG.payme.paymentLinks." + packId;
    }
    console.warn("[PayMe] missing paymentLinks." + packId);
    return;
  }

  if (msgEl) msgEl.textContent = "";
  openPaymeModal(link, packMeta.label || packId);
}

function openPaymeModal(saleUrl, title) {
  const overlay = document.getElementById("payme-checkout");
  const iframe  = document.getElementById("payme-iframe");
  const heading = document.getElementById("payme-title");
  if (!overlay || !iframe) {
    // fallback: פתיחה בטאב חדש אם המודל לא קיים בדף
    window.open(saleUrl, "_blank", "noopener");
    return;
  }

  if (heading) heading.textContent = title ? `תשלום · ${title}` : "תשלום מאובטח";
  iframe.src = saleUrl;
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closePaymeModal() {
  const overlay = document.getElementById("payme-checkout");
  const iframe  = document.getElementById("payme-iframe");
  if (!overlay) return;
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  if (iframe) iframe.src = "about:blank";
  document.body.style.overflow = "";
}

function initPaymeModal() {
  const overlay = document.getElementById("payme-checkout");
  if (!overlay) return;

  const closeBtn = document.getElementById("payme-close");
  if (closeBtn) closeBtn.addEventListener("click", closePaymeModal);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePaymeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closePaymeModal();
  });

  // כפתורי upsell (למשל thankyou.html) עם data-buy="mitachat"
  $$("[data-payme-buy]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const packId = btn.getAttribute("data-payme-buy") || "mitachat";
      startPaymeCheckout(packId, $("[data-pricing-msg]"));
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
  initPricing();
  initPaymeModal();
  initSlider();
  initFaq();
  initStickyBar();
  initReveals();
  wireContacts();
  initLeadPopup();
  initKlaviyoForms();
});

