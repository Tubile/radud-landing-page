/* ===========================================================================
   רדוד Admin v1 — UI controller
   Depends on: store.js, integrations/payme.js
   =========================================================================== */

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const PACK_LABELS = {
    single: "אחד",
    duo: "שניים",
    trio: "שלושה",
    mitachat: "מתחת לתהום",
    manual: "ידני",
  };

  const STATUS_LABELS = {
    pending: "ממתין",
    shipped: "נשלח",
    cancelled: "בוטל",
  };

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("he-IL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function setMsg(el, text, isError) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("is-error", Boolean(isError));
  }

  function statusPill(status) {
    const label = STATUS_LABELS[status] || status;
    const cls =
      status === "shipped"
        ? "pill--ok"
        : status === "cancelled"
          ? "pill--cancelled"
          : "pill--pending";
    return `<span class="pill ${cls}">${label}</span>`;
  }

  function renderSummary() {
    const sum = AdminStore.getSummary();
    $("#stock-value").textContent = String(sum.stock);
    $("#initial-stock").textContent = String(sum.initialStock);
    $("#stat-orders").textContent = String(sum.totalOrders);
    $("#stat-units").textContent = String(sum.totalUnitsSold);
    $("#stat-pending").textContent = String(sum.pendingOrders);
    $("#stat-shipped").textContent = String(sum.shippedOrders);
    $("#updated-at").textContent = sum.updatedAt ? formatDate(sum.updatedAt) : "—";
  }

  function renderOrders() {
    const filter = $("#filter-status")?.value || "all";
    const tbody = $("#orders-body");
    const empty = $("#orders-empty");
    const orders = AdminStore.getState().orders.filter(
      (o) => filter === "all" || o.status === filter
    );

    tbody.innerHTML = "";

    if (!orders.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    const frag = document.createDocumentFragment();
    orders.forEach((order) => {
      const tr = document.createElement("tr");
      tr.dataset.orderId = order.id;

      const actions = [];
      if (order.status === "pending") {
        actions.push(
          `<button type="button" class="btn btn--sm btn--ok" data-action="ship" data-id="${order.id}">סמן כנשלח</button>`
        );
        actions.push(
          `<button type="button" class="btn btn--sm btn--ghost" data-action="cancel" data-id="${order.id}">בטל</button>`
        );
      } else if (order.status === "shipped") {
        actions.push(
          `<button type="button" class="btn btn--sm btn--ghost" data-action="pending" data-id="${order.id}">החזר לממתין</button>`
        );
      } else if (order.status === "cancelled") {
        actions.push(`<span class="card__hint">—</span>`);
      }

      tr.innerHTML = `
        <td>${formatDate(order.createdAt)}</td>
        <td>${escapeHtml(order.customerName)}</td>
        <td><a href="mailto:${escapeAttr(order.customerEmail)}">${escapeHtml(order.customerEmail)}</a></td>
        <td>${order.quantity}</td>
        <td>${PACK_LABELS[order.packId] || order.packId}</td>
        <td>${statusPill(order.status)}</td>
        <td><div class="table__actions">${actions.join("")}</div></td>
      `;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  function renderStockLog() {
    const tbody = $("#stock-log-body");
    const empty = $("#stock-log-empty");
    const log = AdminStore.getState().stockLog;

    tbody.innerHTML = "";
    if (!log.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    const frag = document.createDocumentFragment();
    log.slice(0, 50).forEach((entry) => {
      const tr = document.createElement("tr");
      const cls = entry.delta >= 0 ? "delta-pos" : "delta-neg";
      const sign = entry.delta > 0 ? `+${entry.delta}` : String(entry.delta);
      tr.innerHTML = `
        <td>${formatDate(entry.at)}</td>
        <td class="${cls}">${sign}</td>
        <td>${entry.stockAfter}</td>
        <td>${escapeHtml(entry.reason)}</td>
      `;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  function renderAll() {
    renderSummary();
    renderOrders();
    renderStockLog();
    const paymeEl = $("#payme-status");
    if (paymeEl && typeof PayMeAdmin !== "undefined") {
      paymeEl.textContent = PayMeAdmin.statusLabel();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  /* ----- Events ----- */

  function bindEvents() {
    $("#stock-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const delta = $("#stock-delta").value;
      const note = $("#stock-note").value;
      try {
        AdminStore.adjustStock(delta, note);
        $("#stock-delta").value = "";
        $("#stock-note").value = "";
        setMsg($("#stock-msg"), "המלאי עודכן.");
        renderAll();
      } catch (err) {
        setMsg($("#stock-msg"), err.message || "שגיאה", true);
      }
    });

    $("#order-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        AdminStore.addOrder({
          customerName: $("#order-name").value,
          customerEmail: $("#order-email").value,
          quantity: $("#order-qty").value,
          packId: $("#order-pack").value,
          deductStock: $("#order-deduct").checked,
          source: "manual",
        });
        e.target.reset();
        $("#order-qty").value = "1";
        $("#order-deduct").checked = true;
        setMsg($("#order-msg"), "ההזמנה נוספה.");
        renderAll();
      } catch (err) {
        setMsg($("#order-msg"), err.message || "שגיאה", true);
      }
    });

    $("#orders-body")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      const map = { ship: "shipped", cancel: "cancelled", pending: "pending" };
      const status = map[action];
      if (!status || !id) return;

      if (action === "cancel" && !confirm("לבטל את ההזמנה? המלאי יוחזר.")) return;

      try {
        AdminStore.setOrderStatus(id, status);
        renderAll();
      } catch (err) {
        alert(err.message || "שגיאה");
      }
    });

    $("#filter-status")?.addEventListener("change", () => renderOrders());

    $("#btn-export")?.addEventListener("click", () => {
      const blob = new Blob([AdminStore.exportJson()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `radud-admin-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    $("#btn-import")?.addEventListener("click", () => $("#import-file")?.click());

    $("#import-file")?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        if (!confirm("ייבוא יחליף את כל הנתונים השמורים בדפדפן זה. להמשיך?")) {
          e.target.value = "";
          return;
        }
        AdminStore.importJson(obj);
        renderAll();
        alert("הייבוא הושלם.");
      } catch (err) {
        alert("ייבוא נכשל: " + (err.message || "קובץ לא תקין"));
      }
      e.target.value = "";
    });

    $("#btn-reset")?.addEventListener("click", async () => {
      if (!confirm("לאפס את כל הנתונים? מלאי יחזור ל-1000 והזמנות יימחקו.")) return;
      await AdminStore.reset();
      renderAll();
    });
  }

  /* ----- Boot ----- */

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await AdminStore.load();
      bindEvents();
      renderAll();
    } catch (err) {
      console.error(err);
      document.body.insertAdjacentHTML(
        "afterbegin",
        `<p style="padding:1rem;color:#9b2c2c;background:#fdecec;">שגיאה בטעינת הלוח: ${escapeHtml(err.message || err)}</p>`
      );
    }
  });
})();
