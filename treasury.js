/* ================= الخزينة — بيان الوارد والمصروف =================
   منقول من نظام معدل استهلاك المعمل (lab.mtayea.com) — نفس المنطق الحسابي
   التخزين داخل DB الخاص بكل معمل: DB.treasury = { days: {}, balances: [] } */
(function () {
  const EXPENSE_FIELDS = ['e-tissues','e-gloves','e-cotton','e-syringes','e-pens','e-pins','e-sticks','e-saline','e-water','e-insulin','e-heparin','e-bags','e-incinerator','e-sugar','e-tea','e-coffee','e-food','e-doctor','e-other','e-lab-m','e-lab-e'];
  const EXPENSE_GROUPS = [
    ['🧴 مستلزمات', [['e-tissues','مناديل'],['e-gloves','جوانتي'],['e-cotton','قطن'],['e-syringes','سرنجات']]],
    ['🖊️ مكتبة', [['e-pens','أقلام'],['e-pins','دبابيس'],['e-sticks','اساتيك']]],
    ['💊 صيدلية', [['e-saline','محلول ملح'],['e-water','مياه حقن'],['e-insulin','سرنجات انسولين'],['e-heparin','هيبارين']]],
    ['🔥 محرقة', [['e-bags','أكياس'],['e-incinerator','محرقة']]],
    ['☕ بوفيه', [['e-sugar','سكر'],['e-tea','شاي'],['e-coffee','قهوة'],['e-food','أكل']]],
    ['👨‍⚕️ دكتور وأخرى', [['e-doctor','دكتور'],['e-other','أخرى']]],
    ['🔬 لاب (صباحي/مسائي)', [['e-lab-m','لاب - صباحي'],['e-lab-e','لاب - مسائي']]],
  ];
  let trDiscounts = [];
  let trExpDetails = [];

  function tdata() {
    if (!DB.treasury) DB.treasury = { days: {}, balances: [] };
    if (!DB.treasury.days) DB.treasury.days = {};
    if (!DB.treasury.balances) DB.treasury.balances = [];
    return DB.treasury;
  }
  const gv = id => parseFloat((document.getElementById(id) || {}).value) || 0;
  const sv = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

  window.renderTreasury = function () {
    tdata();
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    trDiscounts = [];
    trExpDetails = [];

    shell('الخزينة — بيان الوارد والمصروف', `
    <style>
      .trs-hint{background:#e8f0fe;border-right:4px solid #1565C0;padding:10px 14px;border-radius:10px;color:#0d3c78;font-size:13px;margin-bottom:14px}
      .trs-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}
      .trs-stat{background:#fff;border:1px solid #e3e8f0;border-radius:14px;padding:14px;text-align:center}
      .trs-stat .n{font-size:22px;font-weight:800;color:#0d3c6e}
      .trs-stat .l{font-size:12px;color:#7a8aa0;margin-top:4px}
      .trs-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      @media(max-width:900px){.trs-cols{grid-template-columns:1fr}}
      .trs-sub{background:#fff;border:1px solid #e3e8f0;border-radius:16px;padding:16px;margin-bottom:16px}
      .trs-sub h3{margin:0 0 12px;font-size:16px;color:#0d3c6e;border-bottom:2px solid #eef2f8;padding-bottom:8px}
      .trs-sub h4{margin:16px 0 10px;font-size:14px;color:#444}
      .trs-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
      .trs-f{display:flex;flex-direction:column;gap:4px;flex:1;min-width:110px}
      .trs-f label{font-size:12px;color:#7a8aa0;font-weight:600}
      .trs-f input,.trs-f select{padding:10px 12px;border:2px solid #e3e8f0;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;width:100%}
      .trs-f input[readonly]{background:#f2f6fb}
      .trs-f input.ro-green{background:#e8f5e9;color:#2e7d32;font-weight:800}
      .trs-f input.ro-blue{background:#e3f2fd}
      .trs-f input.ro-orange{background:#fff3e0}
      table.trs-t{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
      table.trs-t th{background:#0d3c6e;color:#fff;padding:9px 8px;font-weight:700;white-space:nowrap}
      table.trs-t td{padding:8px;border-bottom:1px solid #eef2f8;text-align:center}
      table.trs-t tr:nth-child(even) td{background:#f8fafd}
      .trs-xp{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
      .trs-totalbox{margin-top:16px;padding:14px;background:#e8f5e9;border-radius:12px;text-align:center;font-size:17px;font-weight:800;color:#2e7d32}
      .trs-badge{display:inline-block;padding:3px 12px;border-radius:14px;font-size:12px;font-weight:700;white-space:nowrap}
      .trs-chips{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
      .trs-chips span{padding:7px 16px;border-radius:12px;font-weight:800;font-size:13px}
      .trs-empty{text-align:center;color:#98a4b8;padding:22px}
      .trs-sec{margin:22px 0 10px;font-size:17px;font-weight:800;color:#0d3c6e;display:flex;align-items:center;gap:8px}
      @media print {.topbar,.page-head .back,.icon-btn{display:none!important}}
    </style>

    <div class="trs-hint">💡 «المصاريف» = مجموع كل المصاريف التفصيلية فقط — الخصومات تُعرض منفصلة ولا تُخصم من الإجمالي. مصاريف اللاب = مجموع التفاصيل الإضافية تلقائياً.</div>

    <div class="card">
      <div class="trs-row">
        <div class="trs-f" style="min-width:200px"><label>📅 تاريخ اليوم</label><input type="date" id="tr-date" value="${todayStr}" onchange="trLoadDay()"></div>
        <button class="btn btn-p" style="width:auto" onclick="trSaveDay()">💾 حفظ بيانات اليوم</button>
        <button class="btn btn-o" style="width:auto" onclick="window.print()">🖨️ طباعة</button>
      </div>

      <div class="trs-sub" style="border-right:4px solid #2e7d32;background:#f4faf6">
        <h3 style="color:#2e7d32">🧾 وارد الفواتير المُحصّلة — تلقائي من الاستقبال</h3>
        <div class="trs-row">
          <div class="trs-f"><label>صباحي (قبل 2 ظهراً)</label><input type="number" id="tr-inv-m" value="0" readonly class="ro-green"></div>
          <div class="trs-f"><label>مسائي (بعد 2 ظهراً)</label><input type="number" id="tr-inv-e" value="0" readonly class="ro-green"></div>
          <div class="trs-f"><label>إجمالي وارد الفواتير</label><input type="number" id="tr-inv-t" value="0" readonly style="background:#c8e6c9;color:#1b5e20;font-weight:800"></div>
          <div class="trs-f" style="flex:2;justify-content:center"><label>&nbsp;</label><div style="font-size:12.5px;color:#4b6355">أي فاتورة بتتدفع في صفحة الفواتير أو «حفظ + دفع» في الاستقبال بتتحسب هنا فوراً لنفس اليوم</div></div>
        </div>
      </div>

      <div class="trs-stats">
        <div class="trs-stat"><div class="n" id="tr-st-inv" style="color:#2e7d32">0</div><div class="l">وارد الفواتير (تلقائي)</div></div>
        <div class="trs-stat"><div class="n" id="tr-st-p">0</div><div class="l">إجمالي البيشنت</div></div>
        <div class="trs-stat"><div class="n" id="tr-st-l">0</div><div class="l">إجمالي اللاب</div></div>
        <div class="trs-stat"><div class="n" id="tr-st-e">0</div><div class="l">مصاريف</div></div>
        <div class="trs-stat"><div class="n" id="tr-st-d">0</div><div class="l">إجمالي الخصومات</div></div>
        <div class="trs-stat"><div class="n" id="tr-st-b" style="color:#2e7d32">0</div><div class="l">الباقي الكلي</div></div>
        <div class="trs-stat"><div class="n" id="tr-st-g" style="color:#1565C0">0</div><div class="l">إجمالي الوارد الكلي</div></div>
      </div>

      <div class="trs-cols">
        <!-- فرع البيشنت -->
        <div class="trs-sub">
          <h3>🧑‍⚕️ بيان مصاريف البيشنت</h3>
          <div class="trs-row">
            <div class="trs-f"><label>صباحي</label><input type="number" id="tr-p-m" value="0" oninput="trCalcPatient()"></div>
            <div class="trs-f"><label>مسائي</label><input type="number" id="tr-p-e" value="0" oninput="trCalcPatient()"></div>
            <div class="trs-f"><label>الإجمالي</label><input type="number" id="tr-p-t" value="0" readonly></div>
          </div>
          <div class="trs-row" style="margin-top:10px">
            <div class="trs-f"><label>المصاريف (تلقائي)</label><input type="number" id="tr-p-exp" value="0" readonly class="ro-orange"></div>
            <div class="trs-f"><label>الباقي</label><input type="number" id="tr-p-bal" value="0" readonly class="ro-green"></div>
          </div>

          <h4>✂️ خصومات البيشنت</h4>
          <div class="trs-row">
            <div class="trs-f" style="flex:2"><label>اسم الحالة *</label><input type="text" id="tr-d-name" placeholder="اسم المريض"></div>
            <div class="trs-f"><label>الحساب *</label><input type="number" id="tr-d-total" placeholder="0" oninput="trCalcDiscPaid()"></div>
            <div class="trs-f"><label>قيمة الخصم *</label><input type="number" id="tr-d-amount" placeholder="0" oninput="trCalcDiscPaid()"></div>
            <div class="trs-f"><label>المدفوع (تلقائي)</label><input type="number" id="tr-d-paid" value="0" readonly class="ro-green"></div>
            <div class="trs-f" style="flex:2"><label>سبب الخصم *</label><input type="text" id="tr-d-reason" placeholder="سبب الخصم"></div>
            <div class="trs-f" style="flex:2"><label>القائم بالخصم *</label><input type="text" id="tr-d-by" placeholder="اسم القائم بالخصم"></div>
            <button class="btn btn-p" style="width:auto" onclick="trAddDiscount()">➕ إضافة</button>
          </div>
          <table class="trs-t" id="tr-disc-table">
            <thead><tr><th>اسم الحالة</th><th>الحساب</th><th>الخصم</th><th>المدفوع</th><th>السبب</th><th>القائم بالخصم</th><th>حذف</th></tr></thead>
            <tbody></tbody>
          </table>

          <h4>🧾 باقي حساب <span style="font-size:11px;color:#98a4b8">(قائمة ثابتة بتفضل ظاهرة وتترحل كل يوم لحد «تم السداد»)</span></h4>
          <div class="trs-row">
            <div class="trs-f" style="flex:2"><label>الاسم *</label><input type="text" id="tr-b-name" placeholder="الاسم"></div>
            <div class="trs-f"><label>النوع *</label><select id="tr-b-type"><option value="بيشنت">بيشنت</option><option value="لاب">لاب</option></select></div>
            <div class="trs-f"><label>باقي الحساب *</label><input type="number" id="tr-b-amount" placeholder="0"></div>
            <button class="btn btn-p" style="width:auto" onclick="trAddBalance()">➕ إضافة</button>
          </div>
          <table class="trs-t" id="tr-bal-table">
            <thead><tr><th>الاسم</th><th>النوع</th><th>باقي الحساب</th><th>تاريخ التسجيل</th><th>تم السداد</th><th>حذف</th></tr></thead>
            <tbody></tbody>
          </table>
          <div class="trs-chips" id="tr-bal-totals"></div>
        </div>

        <!-- فرع اللاب -->
        <div class="trs-sub">
          <h3>🔬 بيان مصاريف اللاب</h3>
          <input type="hidden" id="tr-l-m" value="0">
          <input type="hidden" id="tr-l-e" value="0">

          <h4>🔬 لاب بيشنت وخارجي</h4>
          <div class="trs-row">
            <div class="trs-f"><label>لاب بيشنت - صباحي</label><input type="number" id="tr-l-patm" value="0" readonly class="ro-blue"></div>
            <div class="trs-f"><label>لاب بيشنت - مسائي</label><input type="number" id="tr-l-pate" value="0" readonly class="ro-blue"></div>
            <div class="trs-f"><label>لاب خارجي - صباحي</label><input type="number" id="tr-l-extm" value="0" oninput="trCalcLab()"></div>
            <div class="trs-f"><label>لاب خارجي - مسائي</label><input type="number" id="tr-l-exte" value="0" oninput="trCalcLab()"></div>
          </div>
          <div class="trs-row" style="margin-top:10px">
            <div class="trs-f"><label>الإجمالي</label><input type="number" id="tr-l-total" value="0" readonly></div>
            <div class="trs-f"><label>المصاريف (تلقائي من التفاصيل)</label><input type="number" id="tr-l-exp" value="0" readonly class="ro-orange"></div>
            <div class="trs-f"><label>الباقي</label><input type="number" id="tr-l-bal" value="0" readonly class="ro-green"></div>
          </div>

          <h4>📋 تفاصيل إضافية</h4>
          <div class="trs-row">
            <div class="trs-f"><label>القمة - صباحي</label><input type="number" id="tr-l-peakm" value="0" oninput="trCalcLabDetails()"></div>
            <div class="trs-f"><label>القمة - مسائي</label><input type="number" id="tr-l-peake" value="0" oninput="trCalcLabDetails()"></div>
            <div class="trs-f"><label>باسم - صباحي</label><input type="number" id="tr-l-basemm" value="0" oninput="trCalcLabDetails()"></div>
            <div class="trs-f"><label>باسم - مسائي</label><input type="number" id="tr-l-baseme" value="0" oninput="trCalcLabDetails()"></div>
          </div>
          <div class="trs-row" style="margin-top:10px">
            <div class="trs-f"><label>باثولوجي</label><input type="number" id="tr-l-path" value="0" oninput="trCalcLabDetails()"></div>
            <div class="trs-f"><label>أخرى</label><input type="number" id="tr-l-other" value="0" oninput="trCalcLabDetails()"></div>
          </div>

          <h4>📊 حساب باسم (النسبة 8% تلقائي)</h4>
          <table class="trs-t">
            <thead><tr><th></th><th>صباحي</th><th>مسائي</th><th>الإجمالي</th><th>النسبة (8%)</th><th>الباقي</th></tr></thead>
            <tbody><tr>
              <td style="font-weight:700">داخل</td>
              <td><input type="number" id="tr-basem-inm" value="0" oninput="trCalcBasem()"></td>
              <td><input type="number" id="tr-basem-ine" value="0" oninput="trCalcBasem()"></td>
              <td><input type="number" id="tr-basem-intotal" value="0" readonly></td>
              <td><input type="number" id="tr-basem-ratio" value="0" readonly class="ro-blue"></td>
              <td><input type="number" id="tr-basem-bal" value="0" readonly style="color:#2e7d32;font-weight:700"></td>
            </tr></tbody>
          </table>

          <h4>📈 الوارد من غير باسم (تلقائي = اللاب - داخل باسم)</h4>
          <div class="trs-row">
            <div class="trs-f"><label>صباحي</label><input type="number" id="tr-nb-m" value="0" readonly class="ro-green"></div>
            <div class="trs-f"><label>مسائي</label><input type="number" id="tr-nb-e" value="0" readonly class="ro-green"></div>
            <div class="trs-f"><label>الإجمالي</label><input type="number" id="tr-nb-t" value="0" readonly class="ro-green" style="font-weight:700"></div>
          </div>
        </div>
      </div>

      <!-- المصاريف التفصيلية -->
      <div class="trs-sec">📋 بيان المصاريف التفصيلي</div>
      <div class="trs-sub">
        ${EXPENSE_GROUPS.map(g => `
          <h4>${g[0]}</h4>
          <div class="trs-xp">
            ${g[1].map(f => `<div class="trs-f"><label>${f[1]}</label><input type="number" id="${f[0]}" value="0" oninput="trCalcExpenses()"></div>`).join('')}
          </div>`).join('')}
        <div class="trs-row" style="margin-top:10px">
          <div class="trs-f"><label>لاب - إجمالي</label><input type="number" id="e-lab-total" value="0" readonly></div>
        </div>
        <div class="trs-totalbox">إجمالي المصاريف التفصيلية: <span id="tr-exp-grand">0</span> ج.م</div>
      </div>

      <!-- المصاريف الحرة -->
      <div class="trs-sub" style="border-right:4px solid #c62828">
        <h3 style="color:#c62828">📝 بيان المصاريف (بيان + جهة + مبلغ)</h3>
        <div class="trs-hint" style="background:#ffebee;border-right-color:#c62828;color:#c62828">💡 أضف تفاصيل كل مصروف (البيان + المبلغ + الجهة).</div>
        <div class="trs-row" style="margin-top:10px">
          <div class="trs-f" style="flex:2"><label>البيان / الوصف</label><input type="text" id="tr-x-desc" placeholder="مثال: فاتورة كهرباء"></div>
          <div class="trs-f"><label>المبلغ</label><input type="number" id="tr-x-amount" placeholder="0" step="0.01"></div>
          <div class="trs-f" style="flex:1.5"><label>الجهة</label><select id="tr-x-party" onchange="document.getElementById('tr-x-party-other-wrap').style.display = this.value === 'أخرى' ? '' : 'none'">
            <option value="">-- اختر الجهة --</option>
            <option value="دلتا كير">دلتا كير</option>
            <option value="أحمد عصام">أحمد عصام</option>
            <option value="بيور">بيور</option>
            <option value="أخرى">أخرى</option>
          </select></div>
          <div class="trs-f" id="tr-x-party-other-wrap" style="display:none;flex:1.5"><label>اسم الجهة الأخرى</label><input type="text" id="tr-x-party-other" placeholder="اكتب اسم الجهة"></div>
          <button class="btn" style="width:auto;background:linear-gradient(135deg,#c62828,#b71c1c);color:#fff" onclick="trAddExpDetail()">➕ إضافة مصروف</button>
        </div>
        <div id="tr-x-table"></div>
      </div>

      <!-- ملخص الشهر -->
      <div class="trs-sec">📅 ملخص الشهر — كل الأيام المحفوظة</div>
      <div class="trs-sub">
        <table class="trs-t" id="tr-monthly">
          <thead><tr>
            <th>اليوم</th><th>بيشنت صباحي</th><th>بيشنت مسائي</th><th>بيشنت إجمالي</th>
            <th>لاب صباحي</th><th>لاب مسائي</th><th>لاب إجمالي</th>
            <th>فواتير محصّلة</th><th>مصاريف</th><th>خصومات</th><th>باقي</th><th>إجراءات</th>
          </tr></thead>
          <tbody></tbody>
        </table>
        <div class="trs-empty" id="tr-monthly-empty" style="display:none">📭 لا توجد بيانات مسجلة بعد. اختر تاريخ وحفظ اليوم.</div>
      </div>

      <!-- التقارير -->
      <div class="trs-sec">📈 التقارير</div>
      <div class="trs-sub">
        <h4>📥 تقرير الوارد (الصباحي + المسائي)</h4>
        <div id="tr-rep-inward"></div>
      </div>
      <div class="trs-sub">
        <h4>📤 تقرير المنصرف (المصاريف)</h4>
        <div id="tr-rep-outward"></div>
      </div>
      <div class="trs-sub">
        <h4>📝 تقرير بيان المصاريف التفصيلية</h4>
        <div id="tr-rep-expenses"></div>
      </div>
      <div class="trs-sub">
        <h4>📒 حركة الخزينة — دفتر اليومية (وارد ومصروف وصافي كل يوم)</h4>
        <div id="tr-rep-ledger"></div>
      </div>
      <div class="trs-sub">
        <h4>💰 الأرباح الشهرية</h4>
        <div class="trs-row" style="margin-bottom:10px">
          <div class="trs-f" style="min-width:200px"><label>الشهر</label><input type="month" id="tr-month-pick" onchange="trRenderReports()"></div>
        </div>
        <div id="tr-rep-profit"></div>
      </div>
    </div>`);

    const mp = document.getElementById('tr-month-pick');
    if (mp) mp.value = todayStr.slice(0, 7);
    trLoadDay();
    trRenderBalances();
  };

  /* ---------- الحسابات ---------- */
  window.trCalcPatient = function () {
    sv('tr-p-t', gv('tr-p-m') + gv('tr-p-e'));
    trUpdateCombined();
  };

  window.trCalcLab = function () {
    const labPatM = gv('e-lab-m'), labPatE = gv('e-lab-e');
    sv('tr-l-patm', labPatM);
    sv('tr-l-pate', labPatE);
    sv('tr-l-total', labPatM + labPatE + gv('tr-l-extm') + gv('tr-l-exte'));
    trCalcNonBasem();
    trUpdateStats();
  };

  window.trCalcLabDetails = function () {
    sv('tr-l-exp', gv('tr-l-peakm') + gv('tr-l-peake') + gv('tr-l-basemm') + gv('tr-l-baseme') + gv('tr-l-path') + gv('tr-l-other'));
    sv('tr-l-bal', gv('tr-l-total') - gv('tr-l-exp'));
    trCalcBasem();
    trUpdateStats();
  };

  window.trCalcBasem = function () {
    const m = gv('tr-basem-inm'), e = gv('tr-basem-ine');
    sv('tr-basem-intotal', m + e);
    sv('tr-basem-ratio', Math.round((m + e) * 0.08));
    sv('tr-basem-bal', Math.round((m + e) * 0.92));
    sv('tr-l-basemm', Math.round(m * 0.08));
    sv('tr-l-baseme', Math.round(e * 0.08));
    trCalcNonBasem();
    trCalcLabDetailsTotalOnly();
  };
  // تفادي دورة لا نهائية: تحديث إجمالي مصاريف اللاب فقط
  function trCalcLabDetailsTotalOnly() {
    sv('tr-l-exp', gv('tr-l-peakm') + gv('tr-l-peake') + gv('tr-l-basemm') + gv('tr-l-baseme') + gv('tr-l-path') + gv('tr-l-other'));
    sv('tr-l-bal', gv('tr-l-total') - gv('tr-l-exp'));
    trUpdateStats();
  }

  function trCalcNonBasem() {
    const nonM = (gv('tr-l-patm') + gv('tr-l-extm')) - gv('tr-basem-inm');
    const nonE = (gv('tr-l-pate') + gv('tr-l-exte')) - gv('tr-basem-ine');
    sv('tr-nb-m', nonM);
    sv('tr-nb-e', nonE);
    sv('tr-nb-t', nonM + nonE);
  }

  window.trCalcExpenses = function () {
    let sum = 0;
    EXPENSE_FIELDS.forEach(id => { sum += gv(id); });
    sv('e-lab-total', gv('e-lab-m') + gv('e-lab-e'));
    const el = document.getElementById('tr-exp-grand');
    if (el) el.textContent = sum.toLocaleString();
    trCalcLab();
    trUpdateCombined();
  };

  function trUpdateCombined() {
    let sumExp = 0;
    EXPENSE_FIELDS.forEach(id => { sumExp += gv(id); });
    sv('tr-p-exp', sumExp);
    sv('tr-p-bal', gv('tr-p-t') - sumExp);
    trUpdateStats();
  }

  function trUpdateStats() {
    const pExp = gv('tr-p-exp'), lExp = gv('tr-l-exp');
    const disc = trDiscounts.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
    const bal = gv('tr-p-bal') + gv('tr-l-bal');
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v.toLocaleString(); };
    set('tr-st-p', gv('tr-p-t'));
    set('tr-st-l', gv('tr-l-total'));
    set('tr-st-e', pExp + lExp);
    set('tr-st-d', disc);
    set('tr-st-b', bal);
    const g = document.getElementById('tr-st-g');
    if (g) g.textContent = (gv('tr-p-t') + gv('tr-l-total') + gv('tr-inv-t')).toLocaleString();
  }

  /* ---------- الخصومات ---------- */
  window.trCalcDiscPaid = function () {
    sv('tr-d-paid', gv('tr-d-total') - gv('tr-d-amount'));
  };

  window.trAddDiscount = function () {
    const name = (document.getElementById('tr-d-name').value || '').trim();
    const total = gv('tr-d-total');
    const amount = gv('tr-d-amount');
    const reason = (document.getElementById('tr-d-reason').value || '').trim();
    const by = (document.getElementById('tr-d-by').value || '').trim();
    if (!name) return alert('أدخل اسم الحالة');
    if (!total) return alert('أدخل الحساب');
    if (!amount) return alert('أدخل قيمة الخصم');
    if (amount > total) return alert('⚠️ قيمة الخصم أكبر من الحساب!');
    if (!reason) return alert('أدخل سبب الخصم');
    if (!by) return alert('أدخل اسم القائم بالخصم');
    trDiscounts.push({ name, total, amount, paid: total - amount, reason, by });
    trRenderDiscounts();
    ['tr-d-name', 'tr-d-total', 'tr-d-amount', 'tr-d-paid', 'tr-d-reason', 'tr-d-by'].forEach(id => sv(id, id === 'tr-d-paid' ? '0' : ''));
    trUpdateStats();
  };

  window.trRemoveDiscount = function (i) {
    trDiscounts.splice(i, 1);
    trRenderDiscounts();
    trUpdateStats();
  };

  function trRenderDiscounts() {
    const tb = document.querySelector('#tr-disc-table tbody');
    if (!tb) return;
    tb.innerHTML = trDiscounts.map((d, i) => `
      <tr><td style="font-weight:700">${esc(d.name)}</td><td>${d.total}</td><td>${d.amount}</td>
      <td style="color:#2e7d32;font-weight:700">${d.paid}</td><td>${esc(d.reason)}</td><td>${esc(d.by)}</td>
      <td><button class="btn btn-o btn-s" onclick="trRemoveDiscount(${i})">🗑️</button></td></tr>`).join('');
  }

  /* ---------- باقي الحساب ---------- */
  window.trAddBalance = function () {
    const name = (document.getElementById('tr-b-name').value || '').trim();
    const type = document.getElementById('tr-b-type').value;
    const amount = gv('tr-b-amount');
    if (!name) return alert('أدخل الاسم');
    if (!amount) return alert('أدخل باقي الحساب');
    const t = tdata();
    t.balances.push({ id: Date.now(), name, type, amount, date: document.getElementById('tr-date').value || new Date().toISOString().split('T')[0] });
    save();
    trRenderBalances();
    sv('tr-b-name', ''); sv('tr-b-amount', '');
  };

  window.trBalancePaid = function (id) {
    const t = tdata();
    t.balances = t.balances.filter(b => b.id !== id);
    save();
    trRenderBalances();
  };

  window.trRemoveBalance = function (id) {
    const t = tdata();
    t.balances = t.balances.filter(b => b.id !== id);
    save();
    trRenderBalances();
  };

  function trRenderBalances() {
    const tb = document.querySelector('#tr-bal-table tbody');
    if (!tb) return;
    const list = tdata().balances;
    let sumP = 0, sumL = 0;
    tb.innerHTML = list.map(b => {
      const amt = parseFloat(b.amount) || 0;
      if (b.type === 'لاب') sumL += amt; else sumP += amt;
      const badge = b.type === 'لاب'
        ? '<span class="trs-badge" style="background:#fff3e0;color:#e65100">🧪 لاب</span>'
        : '<span class="trs-badge" style="background:#e3f2fd;color:#1565C0">🧍 بيشنت</span>';
      return `<tr>
        <td style="font-weight:700">${esc(b.name)}</td><td>${badge}</td>
        <td style="color:#c62828;font-weight:700">${b.amount}</td><td>${b.date}</td>
        <td><input type="checkbox" title="تم السداد — هتتشال من القايمة" onchange="trBalancePaid(${b.id})" style="width:19px;height:19px;cursor:pointer"></td>
        <td><button class="btn btn-o btn-s" onclick="trRemoveBalance(${b.id})">🗑️</button></td></tr>`;
    }).join('');
    const tot = document.getElementById('tr-bal-totals');
    if (tot) tot.innerHTML =
      `<span style="background:#e3f2fd;color:#1565C0">🧍 مجموع البيشنت: ${sumP}</span>
       <span style="background:#fff3e0;color:#e65100">🧪 مجموع اللاب: ${sumL}</span>
       <span style="background:#f5f5f5;color:#333">الإجمالي: ${sumP + sumL}</span>`;
  }

  /* ---------- المصاريف الحرة ---------- */
  window.trAddExpDetail = function () {
    const desc = (document.getElementById('tr-x-desc').value || '').trim();
    const amount = parseFloat(document.getElementById('tr-x-amount').value) || 0;
    let party = document.getElementById('tr-x-party').value;
    if (party === 'أخرى') {
      party = (document.getElementById('tr-x-party-other').value || '').trim();
      if (!party) { alert('أدخل اسم الجهة'); return; }
    }
    if (!desc) { alert('أدخل بيان المصروف'); return; }
    if (amount <= 0) { alert('أدخل مبلغ صحيح'); return; }
    if (!party) { alert('اختر الجهة'); return; }
    trExpDetails.push({ desc, amount, party });
    trRenderExpDetails();
    sv('tr-x-desc', ''); sv('tr-x-amount', ''); sv('tr-x-party', '');
    sv('tr-x-party-other', '');
    document.getElementById('tr-x-party-other-wrap').style.display = 'none';
  };

  window.trRemoveExpDetail = function (i) {
    trExpDetails.splice(i, 1);
    trRenderExpDetails();
  };

  function trRenderExpDetails() {
    const c = document.getElementById('tr-x-table');
    if (!c) return;
    if (trExpDetails.length === 0) {
      c.innerHTML = '<div class="trs-empty">لا توجد مصاريف مسجلة</div>';
      return;
    }
    let total = 0;
    let html = `<table class="trs-t"><thead><tr><th>#</th><th>البيان</th><th>الجهة</th><th>المبلغ</th><th>إجراءات</th></tr></thead><tbody>`;
    trExpDetails.forEach((e, i) => {
      total += parseFloat(e.amount) || 0;
      html += `<tr><td>${i + 1}</td><td style="font-weight:600">${esc(e.desc)}</td><td>${esc(e.party || '-')}</td>
        <td style="font-weight:700;color:#c62828">${parseFloat(e.amount).toFixed(2)} ج.م</td>
        <td><button class="btn btn-o btn-s" onclick="trRemoveExpDetail(${i})">🗑️</button></td></tr>`;
    });
    html += `<tr style="background:#ffebee;font-weight:700"><td colspan="3">إجمالي المصاريف</td>
      <td style="font-weight:800;color:#c62828">${total.toFixed(2)} ج.م</td><td></td></tr></tbody></table>`;
    c.innerHTML = html;
  }

  /* ---------- حفظ / تحميل اليوم ---------- */
  window.trSaveDay = function () {
    const date = document.getElementById('tr-date').value;
    if (!date) return alert('اختر تاريخ اليوم أولاً');
    const t = tdata();
    const dayData = {
      date,
      patient: { morning: gv('tr-p-m'), evening: gv('tr-p-e'), total: gv('tr-p-t'), expense: gv('tr-p-exp'), balance: gv('tr-p-bal') },
      lab: {
        morning: gv('tr-l-m'), evening: gv('tr-l-e'), total: gv('tr-l-total'), expense: gv('tr-l-exp'), balance: gv('tr-l-bal'),
        peakM: gv('tr-l-peakm'), peakE: gv('tr-l-peake'), basemM: gv('tr-l-basemm'), basemE: gv('tr-l-baseme'),
        path: gv('tr-l-path'), other: gv('tr-l-other'), patM: gv('tr-l-patm'), patE: gv('tr-l-pate'),
        extM: gv('tr-l-extm'), extE: gv('tr-l-exte')
      },
      basem: { inM: gv('tr-basem-inm'), inE: gv('tr-basem-ine'), inTotal: gv('tr-basem-intotal'), ratio: gv('tr-basem-ratio'), balance: gv('tr-basem-bal') },
      nonBasem: { m: gv('tr-nb-m'), e: gv('tr-nb-e'), total: gv('tr-nb-t') },
      invoiceIncome: invoiceIncomeByShift(date),
      expenses: {},
      discounts: JSON.parse(JSON.stringify(trDiscounts)),
      expenseDetails: JSON.parse(JSON.stringify(trExpDetails))
    };
    EXPENSE_FIELDS.forEach(id => { dayData.expenses[id] = gv(id); });
    t.days[date] = dayData;
    save();
    alert('✅ تم حفظ بيانات اليوم بنجاح');
    trRenderMonthly();
    trRenderReports();
  };

  window.trRefreshInv = function () {
    const date = document.getElementById('tr-date').value;
    if (!date) return;
    const inv = invoiceIncomeByShift(date);
    sv('tr-inv-m', inv.m); sv('tr-inv-e', inv.e); sv('tr-inv-t', inv.total);
    const el = document.getElementById('tr-st-inv');
    if (el) el.textContent = inv.total.toLocaleString();
    const g = document.getElementById('tr-st-g');
    if (g) g.textContent = (gv('tr-p-t') + gv('tr-l-total') + inv.total).toLocaleString();
  };

  window.trLoadDay = function () {
    const date = document.getElementById('tr-date').value;
    if (!date) return;
    trRefreshInv();
    const day = tdata().days[date];
    trDiscounts = [];
    trExpDetails = [];
    if (!day) {
      ['tr-p-m','tr-p-e','tr-l-m','tr-l-e','tr-l-peakm','tr-l-peake','tr-l-patm','tr-l-pate','tr-l-basemm','tr-l-baseme','tr-l-path','tr-l-other','tr-basem-inm','tr-basem-ine','tr-nb-m','tr-nb-e','tr-l-extm','tr-l-exte'].forEach(id => sv(id, 0));
      EXPENSE_FIELDS.forEach(id => sv(id, 0));
      trRenderDiscounts(); trRenderExpDetails();
      trCalcPatient(); trCalcLab(); trCalcLabDetails(); trCalcBasem(); trCalcExpenses();
      trRenderMonthly(); trRenderReports();
      return;
    }
    sv('tr-p-m', day.patient.morning); sv('tr-p-e', day.patient.evening);
    sv('tr-l-m', day.lab.morning); sv('tr-l-e', day.lab.evening);
    sv('tr-l-extm', day.lab.extM !== undefined ? day.lab.extM : day.lab.morning);
    sv('tr-l-exte', day.lab.extE !== undefined ? day.lab.extE : day.lab.evening);
    sv('tr-l-peakm', day.lab.peakM || 0); sv('tr-l-peake', day.lab.peakE || 0);
    sv('tr-l-basemm', day.lab.basemM || 0); sv('tr-l-baseme', day.lab.basemE || 0);
    sv('tr-l-path', day.lab.path || 0); sv('tr-l-other', day.lab.other || 0);
    sv('tr-l-patm', day.lab.patM || 0); sv('tr-l-pate', day.lab.patE || 0);
    sv('tr-basem-inm', day.basem ? (day.basem.inM || 0) : 0);
    sv('tr-basem-ine', day.basem ? (day.basem.inE || 0) : 0);
    EXPENSE_FIELDS.forEach(id => sv(id, (day.expenses || {})[id] || 0));
    trDiscounts = day.discounts || [];
    trExpDetails = day.expenseDetails || [];
    trRenderDiscounts(); trRenderExpDetails();
    trCalcPatient(); trCalcLab(); trCalcLabDetails(); trCalcBasem(); trCalcExpenses();
    trRenderMonthly(); trRenderReports();
  };

  window.trDeleteDay = function (date) {
    if (!confirm('هل أنت متأكد من حذف بيانات ' + date + '؟')) return;
    const t = tdata();
    delete t.days[date];
    save();
    trRenderMonthly(); trRenderReports();
    if (document.getElementById('tr-date').value === date) trLoadDay();
  };

  window.trEditDay = function (date) {
    sv('tr-date', date);
    trLoadDay();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function trRenderMonthly() {
    const data = tdata().days;
    const tbody = document.querySelector('#tr-monthly tbody');
    if (!tbody) return;
    const empty = document.getElementById('tr-monthly-empty');
    const dates = Object.keys(data).sort();
    if (dates.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    tbody.innerHTML = dates.map(date => {
      const d = data[date];
      const disc = (d.discounts || []).reduce((a, b) => a + (b.amount || 0), 0);
      const totalBal = (d.patient.balance || 0) + (d.lab.balance || 0);
      return `<tr>
        <td style="font-weight:700">${date}</td>
        <td>${d.patient.morning}</td><td>${d.patient.evening}</td><td><strong>${d.patient.total}</strong></td>
        <td>${d.lab.morning}</td><td>${d.lab.evening}</td><td><strong>${d.lab.total}</strong></td>
        <td style="color:#2e7d32;font-weight:700">${d.invoiceIncome ? d.invoiceIncome.total : 0}</td>
        <td>${d.patient.expense + d.lab.expense}</td><td>${disc}</td>
        <td style="color:#2e7d32;font-weight:700">${totalBal}</td>
        <td>
          <button class="btn btn-o btn-s" onclick="trEditDay('${date}')">✏️</button>
          <button class="btn btn-o btn-s" onclick="trDeleteDay('${date}')">🗑️</button>
        </td></tr>`;
    }).join('');
  }

  /* ---------- التقارير ---------- */
  const fmtDate = ds => { const d = new Date(ds + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };

  function trRenderReports() {
    const data = Object.assign({}, tdata().days);
    // دمج أيام فيها تحصيل فواتير حتى لو مفيش عليها بيان يدوي محفوظ
    (DB.payments || []).forEach(p => {
      if (!data[p.date]) data[p.date] = { date: p.date, patient: { total: 0 }, lab: { total: 0 }, expenses: {}, discounts: [], expenseDetails: [] };
    });
    const invOf = (date, d) => d.invoiceIncome || invoiceIncomeByShift(date);
    const dates = Object.keys(data).sort((a, b) => new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00'));

    // تقرير الوارد
    const inward = document.getElementById('tr-rep-inward');
    if (inward) {
      if (!dates.length) { inward.innerHTML = '<div class="trs-empty">لا توجد بيانات</div>'; }
      else {
        let grand = 0;
        let html = `<table class="trs-t"><thead><tr><th>#</th><th>التاريخ</th><th>الصباحي</th><th>المسائي</th><th>إجمالي الوارد</th><th>الفواتير</th></tr></thead><tbody>`;
        dates.forEach((date, i) => {
          const d = data[date];
          const inv = invOf(date, d);
          const morning = (d.patient.morning || 0) + (d.lab.patM || 0) + (d.lab.extM || 0) + inv.m;
          const evening = (d.patient.evening || 0) + (d.lab.patE || 0) + (d.lab.extE || 0) + inv.e;
          const total = morning + evening;
          grand += total;
          html += `<tr><td>${i + 1}</td><td style="font-weight:600">${fmtDate(date)}</td>
            <td style="color:#4caf50;font-weight:600">${morning.toFixed(2)} ج.م</td>
            <td style="color:#FF9800;font-weight:600">${evening.toFixed(2)} ج.م</td>
            <td style="font-weight:700;color:#1565C0">${total.toFixed(2)} ج.م</td>
            <td style="color:#2e7d32;font-size:12px">منها فواتير: ${inv.total.toFixed(2)} ج.م</td></tr>`;
        });
        html += `<tr style="background:#e3f0ff;font-weight:800"><td colspan="4">إجمالي الوارد الكلي</td>
          <td style="font-weight:800;color:#1565C0">${grand.toFixed(2)} ج.م</td></tr></tbody></table>`;
        inward.innerHTML = html;
      }
    }

    // تقرير المنصرف
    const outward = document.getElementById('tr-rep-outward');
    if (outward) {
      if (!dates.length) { outward.innerHTML = '<div class="trs-empty">لا توجد بيانات</div>'; }
      else {
        let grand = 0;
        let html = `<table class="trs-t"><thead><tr><th>#</th><th>التاريخ</th><th>المصاريف الإجمالية</th><th>عدد المصاريف التفصيلية</th></tr></thead><tbody>`;
        dates.forEach((date, i) => {
          const d = data[date];
          const exp = (d.patient.expense || 0) + (d.lab.expense || 0);
          const detailCount = (d.expenseDetails || []).length;
          grand += exp;
          html += `<tr><td>${i + 1}</td><td style="font-weight:600">${fmtDate(date)}</td>
            <td style="font-weight:700;color:#c62828">${exp.toFixed(2)} ج.م</td><td>${detailCount} مصروف</td></tr>`;
        });
        html += `<tr style="background:#ffebee;font-weight:800"><td colspan="2">إجمالي المنصرف الكلي</td>
          <td style="font-weight:800;color:#c62828">${grand.toFixed(2)} ج.م</td><td></td></tr></tbody></table>`;
        outward.innerHTML = html;
      }
    }

    // تقرير المصاريف التفصيلية
    const exps = document.getElementById('tr-rep-expenses');
    if (exps) {
      let all = [];
      dates.forEach(date => {
        (data[date].expenseDetails || []).forEach(e => {
          all.push({ date, desc: e.desc, party: e.party || '-', amount: parseFloat(e.amount) || 0 });
        });
      });
      if (!all.length) { exps.innerHTML = '<div class="trs-empty">لا توجد مصاريف مسجلة</div>'; }
      else {
        let total = 0;
        let html = `<table class="trs-t"><thead><tr><th>#</th><th>التاريخ</th><th>البيان</th><th>الجهة</th><th>المبلغ</th></tr></thead><tbody>`;
        all.forEach((e, i) => {
          total += e.amount;
          html += `<tr><td>${i + 1}</td><td style="font-weight:600">${fmtDate(e.date)}</td>
            <td style="font-weight:600">${esc(e.desc)}</td><td>${esc(e.party)}</td>
            <td style="font-weight:700;color:#c62828">${e.amount.toFixed(2)} ج.م</td></tr>`;
        });
        html += `<tr style="background:#ffebee;font-weight:800"><td colspan="4">إجمالي المصاريف</td>
          <td style="font-weight:800;color:#c62828">${total.toFixed(2)} ج.م</td></tr></tbody></table>`;
        exps.innerHTML = html;
      }
    }

    // 📒 دفتر اليومية — حركة الخزينة
    const led = document.getElementById('tr-rep-ledger');
    if (led) {
      if (!dates.length) { led.innerHTML = '<div class="trs-empty">لا توجد حركات مسجلة</div>'; }
      else {
        let balance = 0;
        let tIn = 0, tOut = 0;
        let html = `<table class="trs-t"><thead><tr><th>#</th><th>التاريخ</th><th>وارد يدوي</th><th>وارد فواتير</th><th>إجمالي الوارد</th><th>مصروفات</th><th>الصافي</th><th>الرصيد المتراكم</th></tr></thead><tbody>`;
        dates.slice().reverse().forEach((date, i) => {
          const d = data[date];
          const inv = invOf(date, d);
          const manual = (d.patient.total || 0) + (d.lab.total || 0);
          const income = manual + inv.total;
          const expFieldsSum = Object.values(d.expenses || {}).reduce((a, b) => a + (+b || 0), 0);
          const expFree = (d.expenseDetails || []).reduce((a, e) => a + (parseFloat(e.amount) || 0), 0);
          const out = expFieldsSum + expFree;
          const net = income - out;
          balance += net;
          tIn += income; tOut += out;
          html += `<tr><td>${i + 1}</td><td style="font-weight:600">${fmtDate(date)}</td>
            <td>${manual.toFixed(2)}</td>
            <td style="color:#2e7d32;font-weight:600">${inv.total.toFixed(2)}</td>
            <td style="color:#1565C0;font-weight:700">${income.toFixed(2)}</td>
            <td style="color:#c62828;font-weight:600">${out.toFixed(2)}</td>
            <td style="font-weight:700;color:${net >= 0 ? '#2e7d32' : '#c62828'}">${net.toFixed(2)}</td>
            <td style="font-weight:800">${balance.toFixed(2)}</td></tr>`;
        });
        html += `<tr style="background:#e3f0ff;font-weight:800"><td colspan="4">الإجمالي — وارد ${tIn.toFixed(2)} / مصروف ${tOut.toFixed(2)}</td>
          <td style="color:#1565C0">${tIn.toFixed(2)}</td><td style="color:#c62828">${tOut.toFixed(2)}</td>
          <td style="color:${tIn - tOut >= 0 ? '#2e7d32' : '#c62828'}">${(tIn - tOut).toFixed(2)}</td><td></td></tr></tbody></table>`;
        led.innerHTML = html;
      }
    }

    // 💰 الأرباح الشهرية
    const prof = document.getElementById('tr-rep-profit');
    if (prof) {
      const mp = document.getElementById('tr-month-pick');
      const month = mp && mp.value ? mp.value : dates.length ? dates[0].slice(0, 7) : '';
      const monthDates = dates.filter(d => d.slice(0, 7) === month);
      if (!monthDates.length) { prof.innerHTML = '<div class="trs-empty">لا توجد بيانات في هذا الشهر</div>'; }
      else {
        let tIn = 0, tOut = 0;
        let html = `<table class="trs-t"><thead><tr><th>#</th><th>اليوم</th><th>وارد يدوي</th><th>وارد فواتير</th><th>إجمالي الوارد</th><th>مصروفات</th><th>صافي الربح</th></tr></thead><tbody>`;
        monthDates.slice().reverse().forEach((date, i) => {
          const d = data[date];
          const inv = invOf(date, d);
          const manual = (d.patient.total || 0) + (d.lab.total || 0);
          const income = manual + inv.total;
          const expFieldsSum = Object.values(d.expenses || {}).reduce((a, b) => a + (+b || 0), 0);
          const expFree = (d.expenseDetails || []).reduce((a, e) => a + (parseFloat(e.amount) || 0), 0);
          const out = expFieldsSum + expFree;
          const net = income - out;
          tIn += income; tOut += out;
          html += `<tr><td>${i + 1}</td><td style="font-weight:600">${fmtDate(date)}</td>
            <td>${manual.toFixed(2)}</td><td style="color:#2e7d32">${inv.total.toFixed(2)}</td>
            <td style="color:#1565C0;font-weight:700">${income.toFixed(2)}</td>
            <td style="color:#c62828">${out.toFixed(2)}</td>
            <td style="font-weight:800;color:${net >= 0 ? '#2e7d32' : '#c62828'}">${net.toFixed(2)}</td></tr>`;
        });
        const net = tIn - tOut;
        html += `<tr style="background:${net >= 0 ? '#e8f5e9' : '#ffebee'};font-weight:800">
          <td colspan="4">إجمالي الشهر (${monthDates.length} يوم)</td>
          <td style="color:#1565C0">${tIn.toFixed(2)} ج.م</td><td style="color:#c62828">${tOut.toFixed(2)} ج.م</td>
          <td style="font-size:16px;color:${net >= 0 ? '#2e7d32' : '#c62828'}">${net.toFixed(2)} ج.م</td></tr></tbody></table>`;
        prof.innerHTML = html;
      }
    }
  }
})();
