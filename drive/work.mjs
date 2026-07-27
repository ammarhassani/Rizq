/**
 * Doing a freelancer's actual work, through the actual forms.
 *
 * An empty account hides almost everything: every defect passes 3 to 6 found needed data to
 * exist first — a proposal to leak a price floor, income to contradict HADAF, an invoice to
 * carry VAT it should not. So an iteration builds its state by USING the product, never by
 * inserting rows. That way the building is itself under test: two of pass 5's findings were
 * in the act of saving, not in what was saved.
 *
 * Each action returns what the product did, so the caller can compare it against what the
 * product then claims elsewhere.
 */

const ARABIC_DIGITS = /[٠-٩]/g;

/** Read a figure out of Arabic (or Latin) copy as a number. */
export function parseFigure(text) {
  if (!text) return null;
  const latin = text
    .replace(ARABIC_DIGITS, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".");
  const m = latin.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/**
 * Add a client through /ar/clients/new. Returns its id from the URL the app lands on, so a
 * caller can look the row up — a save that navigates nowhere is itself a finding.
 */
export async function addClient({ page, go }, name) {
  await go("/ar/clients/new");
  await page.locator("input[type=text]").first().fill(name);
  await page.getByRole("button", { name: /حفظ العميل/ }).click();
  await page.waitForTimeout(6000);
  const id = page.url().match(/\/clients\/([0-9a-f-]{6,})/i)?.[1] ?? null;
  return { id, landedOn: page.url() };
}

/**
 * Log income through /ar/income/new — the form, the status chips, the save.
 * `amount` is typed as a person types it, so a form that accepts more precision than SAR
 * has shows up here rather than in the database three screens later.
 */
export async function logIncome({ page, go }, { amount, title, status = "مدفوع" }) {
  await go("/ar/income/new");
  const amountField = page.locator("input[type=number]").first();
  await amountField.fill("");
  await amountField.type(String(amount));
  await page.locator("input[type=text]").first().fill(title);
  const chip = page.getByRole("button", { name: new RegExp(status) }).first();
  if (await chip.count()) await chip.click();
  await page.waitForTimeout(500);
  const typed = await amountField.inputValue();
  await page.getByRole("button", { name: /حفظ المشروع/ }).click();
  await page.waitForTimeout(8000);
  return { typed, landedOn: page.url() };
}

/**
 * Build an invoice through /ar/invoices/new: pick the client, add a catalog item, optionally
 * turn VAT on. Returns the totals the screen showed, so they can be checked against the
 * stored invoice and against the client's own arithmetic on the printed unit price.
 */
export async function createInvoice({ page, go }, { clientName, itemName, unitPrice, quantity = 1, vat = false }) {
  await go("/ar/invoices/new");

  await page.locator("[role=combobox]").first().click();
  await page.waitForTimeout(1200);
  await page.getByText(new RegExp(clientName.slice(0, 12))).first().click({ force: true });
  await page.waitForTimeout(800);

  await page.locator("[role=combobox]").filter({ hasText: /اختر بندًا/ }).first().click();
  await page.waitForTimeout(1000);
  const existing = page.getByText(new RegExp(itemName)).first();
  if (await existing.count()) {
    await existing.click({ force: true });
  } else {
    await page.getByText(/إضافة بند جديد/).first().click();
    await page.waitForTimeout(1200);
    await page.locator('input[placeholder*="تصميم هوية"]').fill(itemName);
    await page.locator("input[type=number]").first().fill(String(unitPrice));
    await page.getByRole("button", { name: /حفظ البند/ }).click();
    await page.waitForTimeout(4000);
  }

  if (quantity !== 1) {
    await page.locator("input[type=number]").first().fill(String(quantity));
    await page.waitForTimeout(1200);
  }

  let vatApplied = false;
  const vatSwitch = page.locator("[role=switch]").first();
  if (vat && (await vatSwitch.count()) && (await vatSwitch.isEnabled())) {
    await vatSwitch.click();
    await page.waitForTimeout(1500);
    vatApplied = true;
  }

  const totals = await page.evaluate(() => {
    const lines = document.body.innerText.split("\n");
    const after = (label) => {
      const i = lines.findIndex((l) => l.includes(label));
      return i >= 0 ? (lines[i + 1] ?? "").trim() : null;
    };
    return {
      subtotal: after("المجموع الفرعي"),
      vat: after("ضريبة القيمة المضافة"),
      total: after("الإجمالي"),
    };
  });

  await page.getByRole("button", { name: /إنشاء الفاتورة/ }).click();
  await page.waitForTimeout(9000);
  const id = page.url().match(/\/invoices\/([0-9a-f-]{6,})/i)?.[1] ?? null;

  return { id, vatApplied, shown: totals, landedOn: page.url() };
}

/**
 * Run a pricing lookup. Returns the band and whatever provenance line the screen showed —
 * the sentence under the numbers is where "based on NaN Saudi freelancers" lived.
 */
export async function priceLookup({ page, go }, { specialty, city, tier }) {
  await go("/ar/tool");
  const pick = async (label, option) => {
    await page.locator(`[role=combobox][aria-label="${label}"]`).click();
    await page.waitForTimeout(900);
    await page.getByText(option, { exact: true }).first().click({ force: true });
    await page.waitForTimeout(600);
  };
  await pick("التخصص", specialty);
  await pick("المدينة", city);
  await pick("سنوات الخبرة", tier);
  await page.getByRole("button", { name: /احسب سعري/ }).click();
  await page.waitForTimeout(14000);

  return page.evaluate(() => {
    const t = document.body.innerText;
    const grab = (re) => t.match(re)?.[0] ?? null;
    return {
      gotBand: /نطاق سعرك العادل/.test(t),
      provenance: grab(/بناءً على[^\n]*/),
      citation: grab(/تقدير رِزق[^\n]*/),
      trend: grab(/تحرّك[^\n]*/),
      exhausted: /انتهت استعلاماتك|بلغت حدّك/.test(t),
    };
  });
}
