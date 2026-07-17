/* ===========================================================================
   AdminStore — data layer for רדוד admin v1
   ---------------------------------------------------------------------------
   Storage: browser localStorage (key below).
   Seed:    ./data/seed.json (defaults when storage is empty).

   Public API used by app.js and future integrations:
     AdminStore.load()
     AdminStore.save(state)
     AdminStore.getState()
     AdminStore.reset()
     AdminStore.adjustStock(delta, reason)
     AdminStore.addOrder(orderInput)
     AdminStore.setOrderStatus(orderId, status)
     AdminStore.getSummary()
     AdminStore.exportJson()
     AdminStore.importJson(obj)
   =========================================================================== */

const AdminStore = (() => {
  const STORAGE_KEY = "radud_admin_v1";
  const SEED_URL = "data/seed.json";

  /** @type {AdminState | null} */
  let state = null;

  /**
   * @typedef {Object} Order
   * @property {string} id
   * @property {string} customerName
   * @property {string} customerEmail
   * @property {number} quantity
   * @property {string} packId
   * @property {string} status  - pending | shipped | cancelled
   * @property {string} createdAt  ISO
   * @property {string|null} shippedAt
   * @property {string} source  - manual | payme | import
   * @property {string|null} externalId  - PayMe sale id later
   */

  /**
   * @typedef {Object} StockLogEntry
   * @property {string} id
   * @property {string} at
   * @property {number} delta
   * @property {number} stockAfter
   * @property {string} reason
   */

  /**
   * @typedef {Object} AdminState
   * @property {number} version
   * @property {number} stock
   * @property {number} initialStock
   * @property {Order[]} orders
   * @property {StockLogEntry[]} stockLog
   * @property {{ updatedAt: string|null }} meta
   */

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function defaultState() {
    return {
      version: 1,
      stock: 1000,
      initialStock: 1000,
      orders: [],
      stockLog: [],
      meta: { updatedAt: null },
    };
  }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;

    return {
      version: 1,
      stock: Number.isFinite(Number(raw.stock)) ? Number(raw.stock) : base.stock,
      initialStock: Number.isFinite(Number(raw.initialStock))
        ? Number(raw.initialStock)
        : base.initialStock,
      orders: Array.isArray(raw.orders) ? raw.orders.map(normalizeOrder).filter(Boolean) : [],
      stockLog: Array.isArray(raw.stockLog) ? raw.stockLog : [],
      meta: {
        updatedAt: (raw.meta && raw.meta.updatedAt) || null,
      },
    };
  }

  function normalizeOrder(o) {
    if (!o || typeof o !== "object") return null;
    const qty = Math.max(0, parseInt(o.quantity, 10) || 0);
    if (!o.customerName && !o.customerEmail) return null;
    return {
      id: o.id || uid("ord"),
      customerName: String(o.customerName || "").trim(),
      customerEmail: String(o.customerEmail || "").trim(),
      quantity: qty,
      packId: String(o.packId || "manual"),
      status: ["pending", "shipped", "cancelled"].includes(o.status) ? o.status : "pending",
      createdAt: o.createdAt || nowIso(),
      shippedAt: o.shippedAt || null,
      source: o.source || "manual",
      externalId: o.externalId || null,
    };
  }

  function touch(s) {
    s.meta.updatedAt = nowIso();
    return s;
  }

  function persist() {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error("[AdminStore] save failed", err);
      throw new Error("שמירה נכשלה (localStorage מלא או חסום).");
    }
  }

  async function loadFromSeedFile() {
    try {
      const res = await fetch(SEED_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      return normalize(await res.json());
    } catch {
      return defaultState();
    }
  }

  async function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = normalize(JSON.parse(raw));
        return state;
      }
    } catch (err) {
      console.warn("[AdminStore] corrupt storage, reseeding", err);
    }

    state = await loadFromSeedFile();
    touch(state);
    persist();
    return state;
  }

  function getState() {
    if (!state) throw new Error("AdminStore not loaded. Call load() first.");
    return state;
  }

  function save(next) {
    state = normalize(next);
    touch(state);
    persist();
    return state;
  }

  async function reset() {
    state = await loadFromSeedFile();
    // ensure clean start
    state.orders = [];
    state.stockLog = [];
    state.stock = state.initialStock || 1000;
    touch(state);
    persist();
    return state;
  }

  /**
   * @param {number} delta  positive = add, negative = subtract
   * @param {string} reason
   */
  function adjustStock(delta, reason) {
    const s = getState();
    const d = parseInt(delta, 10);
    if (!Number.isFinite(d) || d === 0) {
      throw new Error("הזן מספר שונה מאפס.");
    }
    const next = s.stock + d;
    if (next < 0) {
      throw new Error(`לא ניתן לרדת מתחת לאפס (מלאי נוכחי: ${s.stock}).`);
    }
    s.stock = next;
    s.stockLog.unshift({
      id: uid("log"),
      at: nowIso(),
      delta: d,
      stockAfter: next,
      reason: String(reason || "עדכון ידני").trim() || "עדכון ידני",
    });
    // keep log reasonable size
    if (s.stockLog.length > 200) s.stockLog.length = 200;
    touch(s);
    persist();
    return s;
  }

  /**
   * @param {object} input
   * @param {string} input.customerName
   * @param {string} input.customerEmail
   * @param {number} input.quantity
   * @param {string} [input.packId]
   * @param {boolean} [input.deductStock]
   * @param {string} [input.source]
   * @param {string|null} [input.externalId]
   */
  function addOrder(input) {
    const s = getState();
    const quantity = Math.max(1, parseInt(input.quantity, 10) || 1);
    const deduct = input.deductStock !== false;

    // PayMe / external idempotency
    if (input.externalId) {
      const exists = s.orders.some((o) => o.externalId === input.externalId);
      if (exists) {
        throw new Error("הזמנה עם מזהה חיצוני זה כבר קיימת.");
      }
    }

    if (deduct && s.stock < quantity) {
      throw new Error(`אין מספיק מלאי (יש ${s.stock}, מבוקש ${quantity}).`);
    }

    /** @type {Order} */
    const order = {
      id: uid("ord"),
      customerName: String(input.customerName || "").trim(),
      customerEmail: String(input.customerEmail || "").trim(),
      quantity,
      packId: String(input.packId || "manual"),
      status: "pending",
      createdAt: nowIso(),
      shippedAt: null,
      source: input.source || "manual",
      externalId: input.externalId || null,
    };

    if (!order.customerName || !order.customerEmail) {
      throw new Error("שם ואימייל הם שדות חובה.");
    }

    if (deduct) {
      s.stock -= quantity;
      s.stockLog.unshift({
        id: uid("log"),
        at: nowIso(),
        delta: -quantity,
        stockAfter: s.stock,
        reason: `הזמנה ${order.id} · ${order.customerName}`,
      });
    }

    s.orders.unshift(order);
    touch(s);
    persist();
    return order;
  }

  /**
   * Hook for future PayMe integration — same shape as addOrder + externalId.
   * @param {object} payload
   */
  function addOrderFromPayMe(payload) {
    return addOrder({
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      quantity: payload.quantity,
      packId: payload.packId || "single",
      deductStock: payload.deductStock !== false,
      source: "payme",
      externalId: payload.saleId || payload.externalId || null,
    });
  }

  function setOrderStatus(orderId, status) {
    const s = getState();
    const allowed = ["pending", "shipped", "cancelled"];
    if (!allowed.includes(status)) throw new Error("סטטוס לא חוקי.");

    const order = s.orders.find((o) => o.id === orderId);
    if (!order) throw new Error("הזמנה לא נמצאה.");

    const prev = order.status;
    if (prev === status) return order;

    // Restock if cancelling a non-cancelled order that reduced stock
    if (status === "cancelled" && prev !== "cancelled" && order.source !== "import-skip-stock") {
      // Only auto-restock if order was not already cancelled
      s.stock += order.quantity;
      s.stockLog.unshift({
        id: uid("log"),
        at: nowIso(),
        delta: order.quantity,
        stockAfter: s.stock,
        reason: `ביטול הזמנה ${order.id}`,
      });
    }

    order.status = status;
    order.shippedAt = status === "shipped" ? nowIso() : order.shippedAt;

    touch(s);
    persist();
    return order;
  }

  function getSummary() {
    const s = getState();
    const active = s.orders.filter((o) => o.status !== "cancelled");
    const unitsSold = active.reduce((sum, o) => sum + o.quantity, 0);
    return {
      stock: s.stock,
      initialStock: s.initialStock,
      totalOrders: active.length,
      totalUnitsSold: unitsSold,
      pendingOrders: s.orders.filter((o) => o.status === "pending").length,
      shippedOrders: s.orders.filter((o) => o.status === "shipped").length,
      cancelledOrders: s.orders.filter((o) => o.status === "cancelled").length,
      updatedAt: s.meta.updatedAt,
    };
  }

  function exportJson() {
    return JSON.stringify(getState(), null, 2);
  }

  function importJson(obj) {
    state = normalize(obj);
    touch(state);
    persist();
    return state;
  }

  return {
    STORAGE_KEY,
    load,
    save,
    getState,
    reset,
    adjustStock,
    addOrder,
    addOrderFromPayMe,
    setOrderStatus,
    getSummary,
    exportJson,
    importJson,
  };
})();
