/* ===========================================================================
   רדוד — Pre-Launch / Coming Soon (script.js)
   מבוסס על script.js של הדף החי, בלי רכישה / PayMe / מלאי.
   ⬇⬇⬇  CONFIG — ערוך רק כאן  ⬇⬇⬇
   =========================================================================== */
const CONFIG = {
  // וואטסאפ — פורמט בינלאומי בלי +. <PLACEHOLDER>
  whatsapp: "",
  whatsappText: "היי, יש לי שאלה על רדוד",

  // מייל יצירת קשר. <PLACEHOLDER>
  email: "",

  /* Klaviyo — List ייעודי להשקה (לא רשימת הדף החי).
     PUBLIC_KEY נשאר כמו באתר. LIST_ID: להחליף כשיוצרים List חדש. */
  klaviyoPublicKey: "Y3xwhu",
  klaviyoListId: "WBbhUg",

  /* אחרי הרשמה — כפתור מוביל לחוויית 5 הקלפים */
  hamishaUrl: "hamisha/",

  /* localStorage */
  leadKey: "radud_prelaunch_lead",
  popupSeenKey: "radud_prelaunch_popup_seen",
};

/* ===========================================================================
   עזרים
   =========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const REDUCE_MOTION =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function isLead() {
  try {
    return localStorage.getItem(CONFIG.leadKey) === "1";
  } catch {
    return false;
  }
}

function markLead() {
  try {
    localStorage.setItem(CONFIG.leadKey, "1");
  } catch {
    /* ignore */
  }
}

/* ===========================================================================
   src=share — שמירה למדידה (UTM / pixel)
   =========================================================================== */
function initShareParam() {
  const params = new URLSearchParams(location.search);
  if (params.get("src") === "share") {
    try {
      sessionStorage.setItem("radud_src", "share");
    } catch {
      /* ignore */
    }
  }
}

function shareSource() {
  try {
    return sessionStorage.getItem("radud_src") === "share" ? "share" : null;
  } catch {
    return null;
  }
}

/* ===========================================================================
   סליידר (המסע) — אותה קומפוננטה כמו proof
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
   קלפים מתהפכים (display:block על inner/faces — ראו styles)
   =========================================================================== */
function initFlipCards() {
  $$("[data-flip]").forEach((card) => {
    card.addEventListener("click", () => {
      card.classList.toggle("is-flipped");
      const flipped = card.classList.contains("is-flipped");
      card.setAttribute("aria-pressed", String(flipped));
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
      $$("details[open]", list).forEach((o) => {
        if (o !== d) o.open = false;
      });
    });
  });
}

/* ===========================================================================
   פס צף (מובייל) — אחרי ההירו, נעלם כשטופס נראה
   =========================================================================== */
function initStickyBar() {
  const bar = $("[data-stickybar]");
  const hero = $("#hero");
  if (!bar || !hero || isLead()) return;

  bar.hidden = false;

  let pastHero = false;
  let formVisible = false;

  const update = () => {
    bar.classList.toggle("show", pastHero && !formVisible && !isLead());
  };

  new IntersectionObserver(
    ([e]) => {
      pastHero = !e.isIntersecting;
      update();
    },
    { rootMargin: "-80px 0px 0px 0px" }
  ).observe(hero);

  $$("[data-lead-form]").forEach((form) => {
    new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) formVisible = true;
        else {
          /* any form still on screen? */
          formVisible = $$("[data-lead-form]").some((f) => {
            const r = f.getBoundingClientRect();
            return r.top < window.innerHeight && r.bottom > 0;
          });
        }
        update();
      },
      { threshold: 0.2 }
    ).observe(form);
  });
}

/* ===========================================================================
   חשיפה בגלילה
   =========================================================================== */
function initReveals() {
  const sections = $$("main > section");
  if (REDUCE_MOTION || !("IntersectionObserver" in window)) return;

  sections.forEach((s) => s.classList.add("reveal"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px" }
  );

  sections.forEach((s) => io.observe(s));
  setTimeout(() => sections.forEach((s) => s.classList.add("in")), 2500);
}

/* ===========================================================================
   וואטסאפ + מייל
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
   פופ-אפ — 25 שניות או 40% גלילה (המוקדם). לא למי שנרשם.
   =========================================================================== */
function initLeadPopup() {
  if (isLead()) return;
  try {
    if (localStorage.getItem(CONFIG.popupSeenKey)) return;
  } catch {
    /* continue */
  }

  const popup = document.getElementById("lead-popup");
  const closeBtn = document.getElementById("popup-close");
  if (!popup) return;

  let triggered = false;

  const open = () => {
    if (triggered || isLead()) return;
    triggered = true;
    popup.hidden = false;
    popup.setAttribute("aria-hidden", "false");
    try {
      localStorage.setItem(CONFIG.popupSeenKey, "1");
    } catch {
      /* ignore */
    }
    window.removeEventListener("scroll", onScroll);
    clearTimeout(timer);
  };

  const timer = setTimeout(open, 25000);

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    if (window.scrollY / max >= 0.4) open();
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      popup.hidden = true;
      popup.setAttribute("aria-hidden", "true");
    });
  }

  popup.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.hidden = true;
      popup.setAttribute("aria-hidden", "true");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !popup.hidden) {
      popup.hidden = true;
      popup.setAttribute("aria-hidden", "true");
    }
  });
}

/* ===========================================================================
   הצלחת הרשמה — הודעה + כפתור לקלפים (בלי רידיירקט)
   =========================================================================== */
function showFormSuccess(form) {
  form.classList.add("is-done");
  markLead();

  /* עדכן כפתורי hamisha אם ה-URL ב-CONFIG שונה */
  form.querySelectorAll(".lead-form__success a").forEach((a) => {
    a.href = CONFIG.hamishaUrl;
  });

  /* הסתר sticky */
  const bar = $("[data-stickybar]");
  if (bar) {
    bar.classList.remove("show");
    bar.hidden = true;
  }

  /* Meta Pixel */
  if (typeof window.fbq === "function") {
    const params = {};
    if (shareSource()) params.utm_source = "share";
    window.fbq("track", "Lead", params);
    window.fbq("track", "CompleteRegistration", params);
  }
}

async function subscribeEmail(email) {
  const listId = CONFIG.klaviyoListId;
  const publicKey = CONFIG.klaviyoPublicKey;

  if (!listId || !publicKey) {
    console.warn("[pre-launch] Klaviyo List ID missing — local success only. Set CONFIG.klaviyoListId.");
    return { ok: true, local: true };
  }

  const res = await fetch(
    `https://a.klaviyo.com/client/subscriptions/?company_id=${publicKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        revision: "2024-10-15",
      },
      body: JSON.stringify({
        data: {
          type: "subscription",
          attributes: {
            profile: {
              data: {
                type: "profile",
                attributes: {
                  email,
                  properties: shareSource()
                    ? { source: "share", utm_source: "share" }
                    : { source: "pre-launch" },
                },
              },
            },
          },
          relationships: {
            list: { data: { type: "list", id: listId } },
          },
        },
      }),
    }
  );

  return { ok: res.ok || res.status === 202, status: res.status };
}

function initLeadForms() {
  $$("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('input[name="email"]');
      const btn = form.querySelector('button[type="submit"]');
      const micro = form.querySelector(".lead-form__micro");
      const email = (emailInput?.value || "").trim();

      if (!email || !emailInput.checkValidity()) {
        emailInput?.reportValidity();
        return;
      }

      const original = btn.textContent;
      btn.textContent = "שומר מקום…";
      btn.disabled = true;

      try {
        const result = await subscribeEmail(email);
        if (!result.ok) throw new Error("subscribe failed " + result.status);

        showFormSuccess(form);

        /* בפופ-אפ — משאירים את הודעת ההצלחה + כפתור הקלפים (בלי סגירה אוטומטית) */
      } catch (err) {
        console.error(err);
        btn.textContent = original;
        btn.disabled = false;
        if (micro) micro.textContent = "משהו השתבש בדרך. נסה שוב.";
      }
    });
  });

  /* אם כבר נרשמו בסשן קודם — הצג הצלחה בטופס ההירו */
  if (isLead()) {
    const hero = $("#hero-lead-form");
    if (hero) showFormSuccess(hero);
  }
}

/* ===========================================================================
   Meta Pixel helpers (PageView / ViewContent) — אופציונלי אם fbq קיים
   =========================================================================== */
function initPixels() {
  if (typeof window.fbq !== "function") return;

  window.fbq("track", "PageView");

  const depths = $("#how");
  if (depths && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          window.fbq("track", "ViewContent", { content_name: "depths" });
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(depths);
  }
}

/* ===========================================================================
   גלילה מדויקת לטופס ההרשמה בהירו (#hero-form)
   מפצה על ה-nav הדביק — נחיתה על ראש הטופס, לא מעט מתחתיו.
   =========================================================================== */
function scrollToHeroForm({ updateHash = true } = {}) {
  const target = $("#hero-form");
  if (!target) return;

  const nav = $(".nav");
  const offset = (nav ? nav.offsetHeight : 0) + 12;
  const top = Math.max(
    0,
    target.getBoundingClientRect().top + window.pageYOffset - offset
  );

  window.scrollTo({
    top,
    behavior: REDUCE_MOTION ? "auto" : "smooth",
  });

  if (updateHash && history.replaceState) {
    history.replaceState(null, "", "#hero-form");
  }
}

function initScrollToHeroForm() {
  $$('a[href="#hero-form"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = $("#hero-form");
      if (!target) return;
      e.preventDefault();
      scrollToHeroForm();
    });
  });

  /* Hash ישיר / רענון עם #hero-form */
  if (location.hash === "#hero-form") {
    requestAnimationFrame(() => scrollToHeroForm({ updateHash: false }));
  }
}

/* ===========================================================================
   אתחול
   =========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initShareParam();
  initFlipCards();
  initSlider();
  initFaq();
  initStickyBar();
  initReveals();
  wireContacts();
  initLeadPopup();
  initLeadForms();
  initPixels();
  initScrollToHeroForm();
});
