/* ===========================================================================
   PayMe integration — PREPARED, NOT ACTIVE (admin v1)
   ---------------------------------------------------------------------------
   Public landing checkout (CONFIG.payme) lives in /script.js.
   This file is the *admin-side* bridge for future automatic orders.

   When ready:
     1. Receive webhook / poll PayMe sales (needs a small backend or Apps Script).
     2. Map sale → order fields.
     3. Call AdminStore.addOrderFromPayMe({ ... }).

   Do NOT put secret API keys here. Frontend can only hold public keys.
   Secrets belong on a server / serverless function.

   Docs: https://docs.payme.io · https://payme.stoplight.io
   Partner: partners@payme.io
   =========================================================================== */

const PayMeAdmin = (() => {
  const CONFIG = {
    /** Flip to true only after backend + keys are ready */
    enabled: false,

    /** Public partner key only — optional reference for future polling */
    clientKey: "", // payme_client_key

    /**
     * Map Payment Link / product code → packId + default quantity
     * Align with public CONFIG.payme.paymentLinks in /script.js
     */
    packMap: {
      single:   { packId: "single",   quantity: 1 },
      duo:      { packId: "duo",      quantity: 2 },
      trio:     { packId: "trio",     quantity: 3 },
      mitachat: { packId: "mitachat", quantity: 0 }, // digital — usually no physical stock
    },

    /** Digital packs that should NOT reduce physical stock */
    noStockPacks: ["mitachat"],
  };

  function statusLabel() {
    if (!CONFIG.enabled) return "לא מחובר";
    if (!CONFIG.clientKey) return "מופעל · חסר clientKey";
    return "מופעל (ממתין ל-backend)";
  }

  /**
   * Normalize a future PayMe sale payload into AdminStore order input.
   * Adjust field names when real PayMe webhook schema is known.
   *
   * @param {object} sale  — placeholder shape
   * @returns {object} input for AdminStore.addOrderFromPayMe
   */
  function mapSaleToOrder(sale) {
    if (!sale) throw new Error("PayMe: empty sale payload");

    const packKey = sale.packKey || sale.product_code || "single";
    const mapped = CONFIG.packMap[packKey] || { packId: packKey, quantity: 1 };
    const quantity = Number(sale.quantity) || mapped.quantity || 1;
    const packId = mapped.packId;
    const deductStock = !CONFIG.noStockPacks.includes(packId);

    return {
      customerName:
        sale.buyer_name ||
        sale.customerName ||
        [sale.first_name, sale.last_name].filter(Boolean).join(" ") ||
        "לקוח PayMe",
      customerEmail: sale.buyer_email || sale.customerEmail || sale.email || "",
      quantity,
      packId,
      deductStock,
      saleId: sale.sale_id || sale.saleId || sale.id || null,
    };
  }

  /**
   * Ingest one sale into the admin store (idempotent via externalId).
   * Safe to call only when CONFIG.enabled and AdminStore is loaded.
   */
  function ingestSale(sale) {
    if (!CONFIG.enabled) {
      console.info("[PayMeAdmin] disabled — sale ignored", sale);
      return null;
    }
    if (typeof AdminStore === "undefined") {
      throw new Error("AdminStore missing");
    }
    const input = mapSaleToOrder(sale);
    return AdminStore.addOrderFromPayMe(input);
  }

  /**
   * Future: pull new sales from a backend endpoint you control.
   * Example endpoint would validate PayMe signatures server-side.
   */
  async function pollNewSales(/* endpointUrl */) {
    if (!CONFIG.enabled) return [];
    // TODO: fetch(endpointUrl) → array of sales → ingestSale each
    console.info("[PayMeAdmin] pollNewSales not implemented yet");
    return [];
  }

  return {
    CONFIG,
    statusLabel,
    mapSaleToOrder,
    ingestSale,
    pollNewSales,
  };
})();
