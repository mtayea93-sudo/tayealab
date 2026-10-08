/* TayeaLab — نظام معلومات المعامل | vanilla SPA + localStorage */
'use strict';
const KEY = 'tayealab_v2'; // legacy single-lab store (migrated)
const META_KEY = 'tayealab_meta_v1';
const SES = 'tayealab_ses';
const labKey = id => 'tayealab_lab_' + id;
const actKey = id => 'tayealab_act_' + id;
let META = null;   // { superUser:{user,pass}, labs:[{id,name,code,active,createdAt}] }
let LABID = null;  // current lab id (null for super session)

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => (Number(n) || 0).toLocaleString('en-US');
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
const uid = p => p + '_' + Math.random().toString(36).slice(2, 8);
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

/* ---------- store ---------- */
function seed() {
  const fields = (arr) => arr; // arr of [name, unit, low, high]
  const T = (id, name, cat, price, flds) => ({ id, name, cat, price, fields: flds });
  const tests = [
    T('t_cbc', 'CBC — تعداد دم كامل', 'أمصال', 120, fields([['WBC','×10³',4,11],['RBC','×10⁶',4.5,5.5],['HGB','g/dl',13,17],['HCT','%',40,50],['PLT','×10³',150,410],['MCV','fl',83,101],['MCH','pg',27,32],['MCHC','g/dl',31.5,34.5],['Neutrophils','%',40,70],['Lymphocytes','%',20,40]])),
    T('t_gluf', 'سكر صائم FBS', 'أمصال', 60, fields([['Glucose','mg/dl',70,100]])),
    T('t_glupp', 'سكر بعد الأكل 2h', 'أمصال', 60, fields([['Glucose 2h PP','mg/dl',70,140]])),
    T('t_hba', 'HbA1c — السكر التراكمي', 'أمصال', 180, fields([['HbA1c','%',4,5.7]])),
    T('t_lipid', 'Lipid Profile — دهون كاملة', 'أمصال', 200, fields([['Cholesterol','mg/dl',0,200],['Triglycerides','mg/dl',0,150],['HDL','mg/dl',40,60],['LDL','mg/dl',0,100],['Chol/HDL ratio','',0,4.5]])),
    T('t_lft', 'وظائف كبد', 'أمصال', 220, fields([['ALT (SGPT)','U/L',7,56],['AST (SGOT)','U/L',5,40],['ALP','U/L',44,147],['Total Bilirubin','mg/dl',0.3,1.2],['Direct Bilirubin','mg/dl',0,0.3],['Total Protein','g/dl',6.4,8.3],['Albumin','g/dl',3.5,5.2]])),
    T('t_kft', 'وظائف كلى', 'أمصال', 200, fields([['Urea','mg/dl',17,43],['Creatinine','mg/dl',0.7,1.3],['Uric Acid','mg/dl',3.5,7.2],['Sodium','mmol/L',136,145],['Potassium','mmol/L',3.5,5.1]])),
    T('t_tsh', 'هرمونات الغدة الدرقية TSH', 'هرمونات', 250, fields([['TSH','µIU/ml',0.27,4.2]])),
    T('t_ft4', 'T4 حر', 'هرمونات', 250, fields([['Free T4','ng/dl',0.93,1.7]])),
    T('t_psa', 'PSA — مستضد البروستاتا', 'أورام', 260, fields([['PSA total','ng/ml',0,4]])),
    T('t_vitd', 'فيتامين د', 'أمصال', 300, fields([['Vitamin D','ng/ml',30,100]])),
    T('t_urine', 'تحليل بول كامل', 'بول', 90, fields([['Color','','', ''],['Pus Cells','/HPF',0,5],['RBCs','/HPF',0,3],['Epithelial Cells','/HPF',0,5],['Albumin','','Negative',''],['Sugar','','Negative',''],['pH','',5,8]])),
    T('t_sfa', 'تحليل سائل منوي كامل — CASA', 'سائل منوي', 350, fields([['Volume','ml',1.5,''],['Concentration','M/ml',15,''],['Total Count','M',39,''],['Progressive Motility PR','%',32,''],['Total Motility','%',40,''],['Normal Morphology','%',4,''],['pH','',7.2,8]])),
    T('t_mar', 'مزرعة بول', 'مزارع', 150, fields([['Culture result','','', ''],['Sensitive','','', ''],['Resistant','','', '']])),
  ];
  // ---- الكتالوج المستورد (أسماء/أسعار/مرجعية) ----
  for (const r of (typeof YS_PANELS !== 'undefined' ? YS_PANELS : [])) {
    tests.push(T('yp_' + tests.length, r.n, r.c, r.p, r.f || []));
  }
  for (const r of (typeof YS_TESTS !== 'undefined' ? YS_TESTS : [])) {
    tests.push(T('yt_' + tests.length, r.n, r.c, r.p, r.f || []));
  }
  const users = [
    { id: 'u1', name: 'Mhmd tayea', user: 'mt', pass: 'mhmd@1993', role: 'مدير' },
    { id: 'u2', name: 'أحمد السيد', user: 'ahmed', pass: 'mhmd@1993', role: 'أخصائي' },
    { id: 'u3', name: 'سارة محمد', user: 'sara', pass: 'mhmd@1993', role: 'استقبال' },
  ];
  const patients = [
    { id: 'p1', name: 'محمد عبد الرحمن السيد', age: 38, gender: 'ذكر', phone: '01001234567', code: 'P-0001' },
    { id: 'p2', name: 'أحمد محمود حسن', age: 45, gender: 'ذكر', phone: '01115556677', code: 'P-0002' },
    { id: 'p3', name: 'خالد عمر إبراهيم', age: 30, gender: 'ذكر', phone: '01223334455', code: 'P-0003' },
  ];
  const visits = [
    mkVisit('v1', 'p1', today(), 'د/ محمد صقر', ['t_cbc', 't_gluf'], 0, true),
    mkVisit('v2', 'p2', today(), 'د/ سمير فوزي', ['t_sfa'], 0, false),
  ];
  function mkVisit(id, pid, date, doc, testIds, disc, paid) {
    return { id, no: id === 'v1' ? 1001 : 1002, invoiceNo: id === 'v1' ? 5001 : 5002,
      patientId: pid, date, doctor: doc, discount: disc, paid,
      tests: testIds.map(tid => ({ testId: tid, status: 'pending', results: {} })) };
  }
  return {
    lab: { name: 'معمل د محمد تايعة للتحاليل الطبية', branch: 'الفرع الرئيسي', branches: ['الفرع الرئيسي', 'فرع دكرنس'], footer: 'TayeaLab' },
    tests, users, patients, visits,
    seq: { patient: 4, visit: 1003, invoice: 5003 },
  };
}
let DB = null;
function loadMeta() {
  try { META = JSON.parse(localStorage.getItem(META_KEY)); } catch (e) { META = null; }
  if (!META || !META.labs) {
    META = { superUser: { user: 'mt', pass: 'mhmd@1993' }, labs: [] };
    // migrate legacy single-lab store into a first lab
    let old = null;
    try { old = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (old && old.tests) {
      const id = 'lab_main';
      META.labs.push({ id, name: old.lab?.name || 'معملك الأول', code: mkCode(), active: true, createdAt: today() });
      localStorage.setItem(labKey(id), JSON.stringify(old));
    }
    saveMeta();
  } else if (META.superUser && META.superUser.pass === 'mozo') {
    /* ترحيل تلقائي: الباسورد القديم بيتحدث لـ mhmd@1993 */
    META.superUser.pass = 'mhmd@1993'; saveMeta();
  }
}
function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(META));
  if (typeof cloudScheduleMetaPush === 'function') cloudScheduleMetaPush();
}
function loadLab(id) {
  LABID = id;
  try { DB = JSON.parse(localStorage.getItem(labKey(id))); } catch (e) { DB = null; }
  if (!DB || !DB.tests) { DB = seed(); save(); }
  /* توحيد الباسوردات: أي باسورد قديم بيتحدث لـ mhmd@1993 */
  let _mig = false;
  (DB.users || []).forEach(u => { if (u.pass !== 'mhmd@1993') { u.pass = 'mhmd@1993'; _mig = true; } });
  if (_mig) save();
  if (typeof cloudPullLab === 'function') cloudPullLab(id);
}
function save() {
  if (LABID) localStorage.setItem(labKey(LABID), JSON.stringify(DB));
  if (typeof cloudSchedulePush === 'function') cloudSchedulePush();
}
function labById(id) { return META.labs.find(l => l.id === id); }
function isActivated(id) { return localStorage.getItem(actKey(id)) === '1'; }
function activate(id) { localStorage.setItem(actKey(id), '1'); }
function resetDB() { if (confirm('هتمسح كل البيانات وترجع البيانات التجريبية. متأكد؟')) { DB = seed(); save(); location.reload(); } }

const testById = id => DB.tests.find(t => t.id === id);
const patById = id => DB.patients.find(p => p.id === id);
function visitTotal(v) {
  const sum = v.tests.reduce((a, t) => a + (testById(t.testId)?.price || 0), 0);
  return Math.max(0, sum - (v.discount || 0));
}
function visitStatus(v) {
  if (v.tests.every(t => t.status === 'done')) return 'done';
  if (v.tests.some(t => t.status === 'done')) return 'partial';
  return 'pending';
}

/* ---------- دفتر تحصيل الفواتير (يرتبط بالخزينة تلقائياً) ---------- */
function localToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function logPayment(v) {
  DB.payments = DB.payments || [];
  DB.payments.push({ id: uid('pay'), visitId: v.id, invoiceNo: v.invoiceNo,
    patient: (patById(v.patientId) || {}).name || '', amount: visitTotal(v),
    date: localToday(), at: new Date().toISOString() });
}
function invoiceIncome(date) {
  return (DB.payments || []).filter(p => p.date === date).reduce((a, p) => a + p.amount, 0);
}
function invoiceIncomeByShift(date) {
  let m = 0, e = 0;
  (DB.payments || []).filter(p => p.date === date).forEach(p => {
    if (new Date(p.at).getHours() < 14) m += p.amount; else e += p.amount;
  });
  return { m, e, total: m + e };
}

/* ---------- session ---------- */
function session() { try { return JSON.parse(sessionStorage.getItem(SES)); } catch (e) { return null; } }
function setSession(s) { sessionStorage.setItem(SES, JSON.stringify(s)); }

/* ---------- router ---------- */
function go(path) { location.hash = '#/' + path; }
function route() {
  const h = location.hash.replace(/^#\//, '');
  const ses = session();
  if (!ses) { LABID = null; return renderLogin(); }
  if (ses.type === 'super') {
    const [page] = h.split('/');
    if (page === 'settings') return renderSettings();
    return renderDistributor();
  }
  // lab session: ensure its DB is loaded
  if (LABID !== ses.labId) loadLab(ses.labId);
  const [page, arg] = h.split('/');
  if (!page || page === 'home') return renderHome();
  if (page === 'reception') return renderReception();
  if (page === 'results') return renderResults(arg);
  if (page === 'samples') return renderSamples();
  if (page === 'prices') return renderPrices();
  if (page === 'finance') return renderFinance();
  if (page === 'treasury') return renderTreasury();
  if (page === 'worklist') return renderWorklist();
  if (page === 'outbound') return renderOutbound();
  if (page === 'reports') return renderReports();
  if (page === 'users') return renderUsers();
  if (page === 'dashboard') return renderDashboard();
  if (page === 'settings') return renderSettings();
  renderHome();
}
window.addEventListener('hashchange', route);
window.addEventListener('load', () => { loadMeta(); cloudInit(); cloudPullMeta(); });

/* ---------- shell ---------- */
function shell(title, bodyHtml, showBack = true) {
  const ses = session();
  $('#root').innerHTML = `
  <div class="topbar">
    <img src="${DB.lab.logo || 'lis-assets/icon-192.png'}" alt="">
    <span class="t">TayeaLab</span>
    <span style="color:#8fa8d8;font-size:12.5px">${esc(DB.lab.name)} — ${esc(ses.branch)}</span>
    <span class="sp"></span>
    <span id="sync-badge" class="sync-badge off">…</span>
    <span class="who">${esc(ses.name)} (${esc(ses.role)})</span>
    <button class="icon-btn" onclick="go('home')" title="الرئيسية">🏠</button>
    <button class="icon-btn" onclick="logout()" title="خروج">⏻</button>
  </div>
  <div id="view">
    <div class="page-head">
      ${showBack ? '<button class="back" onclick="go(\'home\')">→</button>' : ''}
      <h2>${esc(title)}</h2>
    </div>
    ${bodyHtml}
  </div>`;
}
function logout() { sessionStorage.removeItem(SES); go(''); route(); }

/* ---------- login ---------- */
function renderLogin() {
  $('#root').innerHTML = `
  <div id="login-view"><div class="login-box">
    <img src="lis-assets/logo.png" alt="TayeaLab">
    <h1>نظام معلومات المعامل — TayeaLab</h1>
    <div style="display:flex;gap:8px;margin-bottom:18px">
      <button class="btn btn-p" style="width:auto;flex:1" id="tab-lab" onclick="loginTab('lab')">دخول معمل</button>
      <button class="btn btn-o" style="width:auto;flex:1" id="tab-super" onclick="loginTab('super')">دخول الموزّع</button>
    </div>
    <div id="login-body"></div>
  </div></div>`;
  loginTab('lab');
}
let loginMode = 'lab';
function loginTab(mode) {
  loginMode = mode;
  $('#tab-lab').className = 'btn ' + (mode === 'lab' ? 'btn-p' : 'btn-o');
  $('#tab-super').className = 'btn ' + (mode === 'super' ? 'btn-p' : 'btn-o');
  $('#login-body').innerHTML = mode === 'super' ? `
    <div id="login-err"></div>
    <div class="field"><label>اسم مستخدم الموزّع</label><input id="lg-user" autocomplete="off"></div>
    <div class="field"><label>كلمة المرور</label><input id="lg-pass" type="password"></div>
    <button class="btn btn-p" onclick="doLogin()">دخول لوحة الموزّع</button>
    <div class="hint">حساب الموزّع: mt / mhmd@1993</div>` : labLoginHtml();
  const p = $('#lg-pass'); if (p) p.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}
function labLoginHtml() {
  const labs = META.labs.filter(l => l.active);
  const sel = $('#login-lab')?.value || '';
  return `
    <div id="login-err"></div>
    <div class="field"><label>المعمل</label>
      <select id="login-lab" onchange="labLoginRefresh()">
        <option value="">— اختر المعمل —</option>
        ${META.labs.map(l => `<option value="${l.id}" ${!l.active ? 'disabled' : ''} ${l.id === sel ? 'selected' : ''}>${esc(l.name)}${l.active ? '' : ' (موقوف)'}</option>`).join('')}
      </select></div>
    <div id="lab-login-step">${labLoginStepHtml(sel)}</div>`;
}
function labLoginRefresh() { $('#lab-login-step').innerHTML = labLoginStepHtml($('#login-lab').value); const p = $('#lg-pass'); if (p) p.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }); }
function labLoginStepHtml(labId) {
  if (!labId) return '';
  const lab = labById(labId);
  const logoImg = DB && LABID === labId && DB.lab.logo ? DB.lab.logo : null;
  if (!isActivated(labId)) return `
    <div class="card" style="padding:14px;margin-bottom:14px;background:#fff8ec;border-color:#f0d9a0">
      <b style="color:var(--amber)">🔑 أول استخدام على هذا الجهاز</b>
      <div style="font-size:13px;color:var(--mut);margin:6px 0">أدخل كود التفعيل الخاص بمعمل <b>${esc(lab.name)}</b> — مرة واحدة فقط.</div>
      <div class="field" style="margin:0"><input id="lg-code" placeholder="كود التفعيل (xxxx-xxxx)" style="text-align:center;letter-spacing:2px" class="num"></div>
      <button class="btn btn-g" style="width:100%" onclick="doActivate()">تفعيل الجهاز</button>
    </div>`;
  return `
    <div class="field"><label>فرع تسجيل الدخول</label><select id="lg-branch">${(labBranches(labId)).map(b => `<option>${esc(b)}</option>`).join('')}</select></div>
    <div class="field"><label>اسم المستخدم</label><input id="lg-user" autocomplete="off"></div>
    <div class="field"><label>كلمة المرور</label><input id="lg-pass" type="password"></div>
    <button class="btn btn-p" onclick="doLogin()">تسجيل الدخول</button>
    <div class="hint">جرب: ahmed / mhmd@1993</div>`;
}
function labBranches(labId) {
  try { const d = JSON.parse(localStorage.getItem(labKey(labId))); if (d?.lab?.branches) return d.lab.branches; } catch (e) {}
  return ['الفرع الرئيسي'];
}
function doActivate() {
  const labId = $('#login-lab').value;
  const lab = labById(labId);
  const code = ($('#lg-code')?.value || '').trim().toLowerCase();
  if (code && code === String(lab.code).toLowerCase()) {
    activate(labId); toast('✅ تم تفعيل الجهاز'); labLoginRefresh();
  } else $('#login-err').innerHTML = '<div class="err">كود التفعيل غير صحيح — تواصل مع الموزّع</div>';
}
function doLogin() {
  if (loginMode === 'super') {
    const u = $('#lg-user').value.trim(), p = $('#lg-pass').value;
    if (u === META.superUser.user && p === META.superUser.pass) {
      setSession({ type: 'super', name: 'الموزّع', role: 'موزّع', user: u });
      go('distributor'); route();
    } else $('#login-err').innerHTML = '<div class="err">بيانات الموزّع غير صحيحة</div>';
    return;
  }
  const labId = $('#login-lab').value;
  if (!labId) { $('#login-err').innerHTML = '<div class="err">اختر المعمل أولًا</div>'; return; }
  if (!isActivated(labId)) { $('#login-err').innerHTML = '<div class="err">فعّل الجهاز بكود التفعيل أولًا</div>'; return; }
  const u = $('#lg-user').value.trim(), p = $('#lg-pass').value;
  loadLab(labId);
  const usr = DB.users.find(x => x.user === u && x.pass === p);
  if (!usr) { $('#login-err').innerHTML = '<div class="err">اسم المستخدم أو كلمة المرور غير صحيحة</div>'; return; }
  setSession({ type: 'lab', labId, name: usr.name, role: usr.role, user: usr.user, branch: $('#lg-branch').value });
  go('home'); route();
}

function renderHome() {
  const ses = session();
  const tiles = [
    ['reception', 'الاستقبال', 'تسجيل زيارات جديدة وإصدار الفواتير للمرضى', '🧾', '#5bb8a2'],
    ['results', 'إدخال النتائج', 'استلام النتائج واعتمادها وتتبعها', '📄', '#7aa7d9'],
    ['dashboard', 'نظرة عامة', 'ملخص يومي لأداء الفرع والإيرادات', '📊', '#8f9fd6'],
    ['samples', 'تتبع العينات', 'أين وصلت عينات كل زيارة؟', '🧪', '#cbb27a'],
    ['prices', 'قائمة الأسعار', 'أسعار التحاليل وباقاتها — قابلة للتعديل بالكامل', '🏷️', '#d9a86f'],
    ['finance', 'الفواتير والتحصيل', 'فواتير الزيارات وتحصيل المدفوعات', '📋', '#c2d98a'],
    ['treasury', 'الخزينة', 'بيان الوارد والمصروف اليومي والشهري والتقارير', '💼', '#9fc7d9'],
    ['worklist', 'قوائم العمل', 'طلبات مرتبة حسب القسم أو التاريخ', '📑', '#c39ad9'],
    ['outbound', 'عينات خارجية', 'العينات المحوّلة لمختبرات مرجعية', '📤', '#8ac9c2'],
    ['reports', 'التقارير', 'إحصائيات وملخصات جاهزة للطباعة', '📈', '#d97f7f'],
    ['users', 'فريق العمل', 'حسابات الموظفين وصلاحياتهم', '👥', '#d98a8a'],
    ['settings', 'إعدادات الفرع', 'بيانات المعمل والنسخ الاحتياطي', '⚙️', '#9aa7c7'],
  ];
  $('#root').innerHTML = `
  <div class="topbar">
    <img src="lis-assets/icon-192.png" alt="">
    <span class="t">TayeaLab</span>
    <span class="sp"></span>
    <span id="sync-badge" class="sync-badge off">…</span>
    <span class="who">${esc(ses.name)} (${esc(ses.role)})</span>
    <button class="icon-btn" onclick="logout()" title="خروج">⏻</button>
  </div>
  <div id="view">
    <div class="lab-head">
      <img src="${DB.lab.logo || 'lis-assets/logo.png'}" alt="">
      <div>
        <div class="n">${esc(DB.lab.name)}</div>
        <div class="b">${esc(ses.branch)}</div>
        <div class="u">${esc(ses.name)}</div>
      </div>
    </div>
    <div class="tiles">
      ${tiles.map(t => `<div class="tile" style="background:${t[4]}33" onclick="goTile('${t[0]}')">
        <div class="ic" style="background:${t[4]}">${t[3]}</div>
        <div><h3>${t[1]}</h3><p>${t[2]}</p></div>
        <span class="arr">←</span></div>`).join('')}
    </div>
  </div>`;
}
function goTile(t) { go(t); route(); }

/* ================= RECEPTION ================= */
let recState = { patientId: null, testIds: new Set() };

function renderReception() {
  recState = { patientId: null, testIds: new Set() };
  shell('الاستقبال — تسجيل حالة جديدة', `
  <div class="card">
    <h3>١) بيانات المريض</h3>
    <div class="toolbar">
      <input id="rec-search" placeholder="🔍 بحث بالاسم أو كود أو موبايل…" style="flex:1;min-width:220px" oninput="recSearch()">
      <button class="btn btn-g btn-s" onclick="recNewPatient()">+ مريض جديد</button>
    </div>
    <div id="rec-pat-results"></div>
    <div id="rec-pat-selected" style="display:none"></div>
  </div>
  <div class="card" id="rec-tests-card" style="display:none">
    <h3>٢) اختبارات الزيارة</h3>
    <div class="toolbar">
      <input id="rec-test-search" placeholder="🔍 بحث في الاختبارات…" style="flex:1" oninput="recRenderTests()">
      <select id="rec-cat" onchange="recRenderTests()"><option value="">كل الأقسام</option></select>
    </div>
    <div id="rec-test-list"></div>
    <div class="grid3" style="margin-top:14px">
      <div class="field"><label>الطبيب المحيل</label><input id="rec-doc" placeholder="د/ …"></div>
      <div class="field"><label>خصم (ج.م)</label><input id="rec-disc" type="number" min="0" value="0" oninput="recSummary()"></div>
      <div class="field"><label>ملاحظات</label><input id="rec-notes"></div>
    </div>
    <div id="rec-summary" style="font-weight:900;font-size:18px;color:var(--navy);margin:10px 0"></div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-p" style="width:auto" onclick="recSave(false)">💾 حفظ الفاتورة</button>
      <button class="btn btn-g" style="width:auto" onclick="recSave(true)">💾 حفظ + دفع</button>
      <button class="btn btn-o" style="width:auto" onclick="recSave(true,true)">💾 حفظ + دفع + طباعة</button>
    </div>
  </div>
  <div class="card">
    <h3>زيارات اليوم</h3>
    <div id="rec-visits"></div>
  </div>`);
  const cats = [...new Set(DB.tests.map(t => t.cat))];
  $('#rec-cat').innerHTML += cats.map(c => `<option>${esc(c)}</option>`).join('');
  recRenderTests(); recRenderVisits();
}

function recSearch() {
  const q = $('#rec-search').value.trim();
  const box = $('#rec-pat-results');
  if (!q) { box.innerHTML = ''; return; }
  const hits = DB.patients.filter(p => p.name.includes(q) || p.code.includes(q) || (p.phone || '').includes(q));
  box.innerHTML = hits.length ? `<table><tr><th>الكود</th><th>الاسم</th><th>العمر</th><th>النوع</th><th>الموبايل</th><th></th></tr>
    ${hits.map(p => `<tr><td class="num">${esc(p.code)}</td><td>${esc(p.name)}</td><td>${p.age}</td><td>${p.gender}</td><td class="num">${esc(p.phone)}</td>
    <td><button class="btn btn-p btn-s" onclick="recPickPatient('${p.id}')">اختيار</button></td></tr>`).join('')}</table>`
    : '<div class="empty">لا توجد نتائج — اضغط "مريض جديد"</div>';
}

function recNewPatient() {
  const q = $('#rec-search').value.trim();
  modal(`<h3>تسجيل مريض جديد</h3>
    <div class="grid2">
      <div class="field"><label>الاسم بالكامل *</label><input id="np-name" value="${esc(q)}"></div>
      <div class="field"><label>العمر *</label><input id="np-age" type="number" min="0" max="120"></div>
      <div class="field"><label>النوع</label><select id="np-gender"><option>ذكر</option><option>أنثى</option></select></div>
      <div class="field"><label>الموبايل</label><input id="np-phone" class="num"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-p" onclick="recSavePatient()">💾 حفظ</button>
      <button class="btn btn-o" onclick="closeModal()">إلغاء</button>
    </div>`);
  setTimeout(() => $('#np-name').focus(), 50);
}

function recSavePatient() {
  const name = $('#np-name').value.trim(), age = +$('#np-age').value;
  if (!name || !age) { toast('⚠️ الاسم والعمر مطلوبان'); return; }
  const p = { id: uid('p'), name, age, gender: $('#np-gender').value, phone: $('#np-phone').value.trim(),
    code: 'P-' + String(DB.seq.patient++).padStart(4, '0') };
  DB.patients.push(p); save(); closeModal(); recPickPatient(p.id); toast('✅ تم تسجيل المريض ' + p.code);
}

function recPickPatient(id) {
  recState.patientId = id;
  const p = patById(id);
  $('#rec-pat-selected').style.display = 'block';
  $('#rec-pat-selected').innerHTML = `<table><tr><th>الكود</th><th>الاسم</th><th>العمر</th><th>النوع</th><th>الموبايل</th></tr>
    <tr style="background:#f0f7ff"><td class="num">${esc(p.code)}</td><td><b>${esc(p.name)}</b></td><td>${p.age}</td><td>${p.gender}</td><td class="num">${esc(p.phone)}</td></tr></table>`;
  $('#rec-pat-results').innerHTML = ''; $('#rec-search').value = '';
  $('#rec-tests-card').style.display = 'block';
  $('#rec-tests-card').scrollIntoView({ behavior: 'smooth' });
}

function recRenderTests() {
  const q = ($('#rec-test-search')?.value || '').trim();
  const cat = $('#rec-cat')?.value || '';
  const ql = q.toLowerCase();
  const list = DB.tests.filter(t => (!q || t.name.toLowerCase().includes(ql)) && (!cat || t.cat === cat));
  $('#rec-test-list').innerHTML = list.map(t => {
    const on = recState.testIds.has(t.id);
    return `<label style="display:inline-flex;align-items:center;gap:6px;margin:4px 6px;padding:7px 14px;border-radius:999px;cursor:pointer;
      border:1.5px solid ${on ? 'var(--blue)' : 'var(--line)'};background:${on ? '#e3edff' : '#fff'};font-size:13.5px;font-weight:700">
      <input type="checkbox" ${on ? 'checked' : ''} onchange="recToggleTest('${t.id}')" style="accent-color:var(--blue)">
      ${esc(t.name)} <span style="color:var(--mut)" class="num">${fmt(t.price)}</span></label>`;
  }).join('') || '<div class="empty">لا توجد اختبارات مطابقة</div>';
}
function recToggleTest(id) {
  recState.testIds.has(id) ? recState.testIds.delete(id) : recState.testIds.add(id);
  recRenderTests(); recSummary();
}
function recSummary() {
  const total = [...recState.testIds].reduce((a, id) => a + testById(id).price, 0);
  const disc = +($('#rec-disc')?.value || 0);
  $('#rec-summary').textContent = `الإجمالي: ${fmt(total)} ج.م — بعد الخصم: ${fmt(Math.max(0, total - disc))} ج.م`;
}
function recSave(paid, printIt) {
  if (!recState.patientId) { toast('⚠️ اختر المريض أولًا'); return; }
  if (!recState.testIds.size) { toast('⚠️ اختر اختبارًا واحدًا على الأقل'); return; }
  const v = {
    id: uid('v'), no: DB.seq.visit++, invoiceNo: DB.seq.invoice++,
    patientId: recState.patientId, date: today(), doctor: $('#rec-doc').value.trim(),
    discount: +$('#rec-disc').value || 0, paid: !!paid, notes: $('#rec-notes').value.trim(),
    tests: [...recState.testIds].map(tid => ({ testId: tid, status: 'pending', results: {} })),
  };
  DB.visits.unshift(v);
  if (v.paid) logPayment(v);
  save();
  toast('✅ تم حفظ الزيارة — فاتورة رقم ' + v.invoiceNo);
  if (printIt) printInvoice(v.id);
  recState = { patientId: null, testIds: new Set() };
  renderReception();
}

function recRenderVisits() {
  const vs = DB.visits.filter(v => v.date === today());
  $('#rec-visits').innerHTML = vs.length ? `<table>
    <tr><th>رقم الفاتورة</th><th>الكود</th><th>المريض</th><th>الطبيب</th><th>الاختبارات</th><th>الإجمالي</th><th>الدفع</th><th>الحالة</th><th></th></tr>
    ${vs.map(v => { const p = patById(v.patientId); return `<tr>
      <td class="num">${v.invoiceNo}</td><td class="num">${esc(p?.code)}</td><td>${esc(p?.name)}</td><td>${esc(v.doctor)}</td>
      <td>${v.tests.length}</td><td class="num"><b>${fmt(visitTotal(v))}</b></td>
      <td>${v.paid ? '<span class="pill p-paid">مدفوعة</span>' : '<span class="pill p-unpaid">آجلة</span>'}</td>
      <td>${statusPill(visitStatus(v))}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-o btn-s" onclick="printInvoice('${v.id}')">🖨️</button>
        <button class="btn btn-o btn-s" onclick="printResult('${v.id}')" ${visitStatus(v) === 'pending' ? 'disabled' : ''}>📄</button>
      </td></tr>`; }).join('')}</table>` : '<div class="empty">لا توجد زيارات مسجلة اليوم</div>';
}
function statusPill(s) {
  return s === 'done' ? '<span class="pill p-done">مكتملة</span>'
    : s === 'partial' ? '<span class="pill p-prog">جزئية</span>' : '<span class="pill p-wait">قيد الانتظار</span>';
}

/* ================= RESULTS ================= */
function renderResults(visitId) {
  const pend = DB.visits.filter(v => v.tests.some(t => t.status !== 'done'));
  let body = `
  <div class="card">
    <h3>اختبارات قيد إدخال النتائج</h3>
    ${pend.length ? `<table><tr><th>الفاتورة</th><th>التاريخ</th><th>المريض</th><th>الاختبار</th><th>القسم</th><th>الحالة</th><th></th></tr>
      ${pend.flatMap(v => v.tests.filter(t => t.status !== 'done').map(t => {
        const p = patById(v.patientId), tt = testById(t.testId);
        return `<tr><td class="num">${v.invoiceNo}</td><td>${v.date}</td><td>${esc(p?.name)}</td><td>${esc(tt?.name)}</td><td>${esc(tt?.cat)}</td>
        <td>${t.status === 'pending' ? '<span class="pill p-wait">بانتظار النتيجة</span>' : '<span class="pill p-prog">جزئي</span>'}</td>
        <td><button class="btn btn-p btn-s" onclick="go('results/${v.id}')">إدخال النتيجة</button></td></tr>`;
      })).join('')}</table>` : '<div class="empty">🎉 كل الاختبارات تم إدخال نتائجها</div>'}
  </div>`;
  if (visitId) body += resultEntryHtml(visitId);
  shell('النتائج', body);
}
function resultEntryHtml(visitId) {
  const v = DB.visits.find(x => x.id === visitId);
  if (!v) return '';
  const p = patById(v.patientId);
  return `
  <div class="card">
    <h3>إدخال نتائج الفاتورة <span class="num">#${v.invoiceNo}</span> — ${esc(p?.name)} (${esc(p?.code)}) — ${v.date}</h3>
    ${v.tests.map((t, ti) => {
      const tt = testById(t.testId);
      return `<div style="margin-bottom:22px;border:1px solid var(--line);border-radius:12px;padding:14px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <b style="color:var(--navy)">${esc(tt.name)}</b>
          <span class="pill ${t.status === 'done' ? 'p-done' : 'p-wait'}">${t.status === 'done' ? 'تم إدخال النتيجة' : 'قيد الإدخال'}</span>
        </div>
        <table class="res-grid"><tr><th>البند</th><th>الوحدة</th><th>المرجع من</th><th>المرجع إلى</th><th>النتيجة</th><th>التقييم</th></tr>
        ${tt.fields.map((f, fi) => {
          const val = t.results['f' + fi] ?? '';
          let evalHtml = '';
          const lo = parseFloat(f[2]), hi = parseFloat(f[3]);
          const nv = parseFloat(val);
          if (val !== '' && !isNaN(nv) && !isNaN(lo) && !isNaN(hi)) {
            evalHtml = nv > hi ? '<span class="flag-H flag">H ↑ مرتفع</span>' : nv < lo ? '<span class="flag-L flag">L ↓ منخفض</span>' : '<span style="color:var(--green);font-weight:900">طبيعي</span>';
          }
          return `<tr><td>${esc(f[0])}</td><td class="num">${esc(f[1])}</td>
            <td class="num">${esc(String(f[2]))}</td><td class="num">${esc(String(f[3]))}</td>
            <td style="width:140px"><input class="cell num" value="${esc(val)}" onchange="resSet('${v.id}',${ti},${fi},this.value,this)"></td>
            <td>${evalHtml}</td></tr>`;
        }).join('')}</table>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
          <button class="btn btn-g btn-s" onclick="resComplete('${v.id}',${ti})">✅ اعتماد نتيجة هذا الاختبار</button>
          <input id="comment-${ti}" placeholder="تعليق على الاختبار…" style="flex:1;padding:7px 12px;border:1.5px solid var(--line);border-radius:9px" value="${esc(t.comment || '')}">
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
function resSet(visitId, ti, fi, val, el) {
  const v = DB.visits.find(x => x.id === visitId);
  v.tests[ti].results['f' + fi] = val;
  v.tests[ti].comment = $('#comment-' + ti)?.value || v.tests[ti].comment;
  save();
  // update evaluation cell in place without re-render (keeps focus)
  const tt = testById(v.tests[ti].testId);
  const f = tt.fields[fi];
  const lo = parseFloat(f[2]), hi = parseFloat(f[3]); const nv = parseFloat(val);
  let html = '';
  if (val !== '' && !isNaN(nv) && !isNaN(lo) && !isNaN(hi)) {
    html = nv > hi ? '<span class="flag-H flag">H ↑ مرتفع</span>'
      : nv < lo ? '<span class="flag-L flag">L ↓ منخفض</span>'
      : '<span style="color:var(--green);font-weight:900">طبيعي</span>';
  }
  const td = el.closest('tr').querySelector('td:last-child');
  if (td) td.innerHTML = html;
}
function resComplete(visitId, ti) {
  const v = DB.visits.find(x => x.id === visitId);
  const t = v.tests[ti];
  t.comment = $('#comment-' + ti)?.value || t.comment;
  const tt = testById(t.testId);
  const empty = tt.fields.filter((f, fi) => {
    const lo = parseFloat(f[2]);
    return !isNaN(lo) && (t.results['f' + fi] === undefined || t.results['f' + fi] === '');
  }).length;
  if (empty) { toast('⚠️ فيه بنود رقمية فاضية — املأها أو اكتب نصًا'); }
  t.status = 'done'; save(); toast('✅ تم اعتماد نتيجة ' + tt.name); renderResults(visitId);
}

/* ================= SAMPLES ================= */
function renderSamples() {
  const rows = DB.visits.flatMap(v => v.tests.map((t, i) => ({ v, t, i })));
  shell('العينات', `
  <div class="card"><h3>كل العينات المسجلة</h3>
  ${rows.length ? `<table><tr><th>كود العينة</th><th>التاريخ</th><th>المريض</th><th>الاختبار</th><th>القسم</th><th>حالة النتيجة</th><th>حالة الدفع</th></tr>
    ${rows.map(({ v, t }) => { const p = patById(v.patientId), tt = testById(t.testId);
      return `<tr><td class="num"><b>S-${v.invoiceNo}-${t.testId.slice(-3).toUpperCase()}</b></td><td>${v.date}</td>
      <td>${esc(p?.name)}</td><td>${esc(tt?.name)}</td><td>${esc(tt?.cat)}</td>
      <td>${t.status === 'done' ? '<span class="pill p-done">تم</span>' : '<span class="pill p-wait">معلقة</span>'}</td>
      <td>${v.paid ? '<span class="pill p-paid">مدفوعة</span>' : '<span class="pill p-unpaid">آجلة</span>'}</td></tr>`; }).join('')}</table>` : '<div class="empty">لا توجد عينات</div>'}
  </div>`);
}

/* ================= PRICES ================= */
function renderPrices() {
  shell('خطط الأسعار', `
  <div class="toolbar">
    <input id="pr-q" placeholder="🔍 بحث…" style="flex:1" oninput="prRender()">
    <button class="btn btn-g" onclick="prEdit('')">+ اختبار جديد</button>
  </div>
  <div class="card"><div id="pr-list"></div></div>`);
  prRender();
}
function prRender() {
  const q = ($('#pr-q')?.value || '').trim();
  const list = DB.tests.filter(t => !q || t.name.includes(q) || t.cat.includes(q));
  $('#pr-list').innerHTML = `<table><tr><th>الاختبار</th><th>القسم</th><th>عدد البنود</th><th>السعر (ج.م)</th><th></th></tr>
    ${list.map(t => `<tr><td><b>${esc(t.name)}</b></td><td>${esc(t.cat)}</td><td>${t.fields.length}</td>
    <td class="num"><b>${fmt(t.price)}</b></td>
    <td style="white-space:nowrap"><button class="btn btn-o btn-s" onclick="prEdit('${t.id}')">✏️ تعديل</button>
    <button class="btn btn-red btn-s" onclick="prDel('${t.id}')">🗑️</button></td></tr>`).join('')}</table>`;
}
function prEdit(id) {
  const t = id ? testById(id) : { id: '', name: '', cat: 'أمصال', price: 100, fields: [] };
  modal(`<h3>${id ? 'تعديل' : 'إضافة'} اختبار</h3>
    <div class="grid2">
      <div class="field"><label>اسم الاختبار *</label><input id="pt-name" value="${esc(t.name)}"></div>
      <div class="field"><label>القسم</label><input id="pt-cat" value="${esc(t.cat)}"></div>
      <div class="field"><label>السعر (ج.م) *</label><input id="pt-price" type="number" min="0" value="${t.price}" class="num"></div>
    </div>
    <h3 style="margin:14px 0 8px;font-size:15px">بنود النتيجة والمرجع</h3>
    <div id="pt-fields">${t.fields.map((f, i) => ptFieldRow(f, i)).join('')}</div>
    <button class="btn btn-o btn-s" onclick="$('#pt-fields').insertAdjacentHTML('beforeend', ptFieldRow(['','','',''], 99)); ptFixIdx()">+ بند</button>
    <div class="modal-actions">
      <button class="btn btn-p" onclick="prSave('${id}')">💾 حفظ</button>
      <button class="btn btn-o" onclick="closeModal()">إلغاء</button>
    </div>`);
}
function ptFieldRow(f, i) {
  return `<div class="grid4 pt-row" style="grid-template-columns:2fr 1fr 1fr 1fr 40px;align-items:end;margin-bottom:8px">
    <div class="field" style="margin:0"><input class="pt-f0" placeholder="البند" value="${esc(f[0])}"></div>
    <div class="field" style="margin:0"><input class="pt-f1" placeholder="الوحدة" value="${esc(f[1])}"></div>
    <div class="field" style="margin:0"><input class="pt-f2 num" placeholder="من" value="${esc(String(f[2]))}"></div>
    <div class="field" style="margin:0"><input class="pt-f3 num" placeholder="إلى" value="${esc(String(f[3]))}"></div>
    <button class="btn btn-red btn-s" onclick="this.closest('.pt-row').remove()">✖</button></div>`;
}
function prSave(id) {
  const name = $('#pt-name').value.trim(), price = +$('#pt-price').value;
  if (!name || !price) { toast('⚠️ الاسم والسعر مطلوبان'); return; }
  const fields = [...document.querySelectorAll('.pt-row')].map(r =>
    [r.querySelector('.pt-f0').value.trim(), r.querySelector('.pt-f1').value.trim(),
     r.querySelector('.pt-f2').value.trim(), r.querySelector('.pt-f3').value.trim()]).filter(f => f[0]);
  if (!fields.length) { toast('⚠️ أضف بند نتيجة واحد على الأقل'); return; }
  if (id) { const t = testById(id); Object.assign(t, { name, cat: $('#pt-cat').value.trim() || 'عام', price, fields }); }
  else DB.tests.push({ id: uid('t'), name, cat: $('#pt-cat').value.trim() || 'عام', price, fields });
  save(); closeModal(); prRender(); toast('✅ تم الحفظ');
}
function prDel(id) {
  if (!confirm('حذف هذا الاختبار؟')) return;
  DB.tests = DB.tests.filter(t => t.id !== id); save(); prRender(); toast('🗑️ تم الحذف');
}

/* ================= FINANCE ================= */
function renderFinance() {
  const vs = DB.visits;
  const totalRev = vs.reduce((a, v) => a + (v.paid ? visitTotal(v) : 0), 0);
  const due = vs.reduce((a, v) => a + (!v.paid ? visitTotal(v) : 0), 0);
  shell('الأمور المالية والمطالبات', `
  <div class="stats">
    <div class="stat green"><div class="v">${fmt(totalRev)} ج.م</div><div class="l">إيرادات محصلة</div></div>
    <div class="stat"><div class="v">${fmt(due)} ج.م</div><div class="l">مستحقات آجلة</div></div>
    <div class="stat blue"><div class="v">${vs.length}</div><div class="l">عدد الفواتير</div></div>
  </div>
  <div class="card"><h3>فواتير المعمل</h3>
  ${vs.length ? `<table><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>المريض</th><th>الإجمالي</th><th>الدفع</th><th>العمليات</th></tr>
    ${vs.map(v => { const p = patById(v.patientId); return `<tr>
      <td class="num">${v.invoiceNo}</td><td>${v.date}</td><td>${esc(p?.name)}</td><td class="num"><b>${fmt(visitTotal(v))}</b></td>
      <td>${v.paid ? '<span class="pill p-paid">مدفوعة</span>' : `<button class="btn btn-g btn-s" onclick="finPay('${v.id}')">تسجيل دفع</button>`}</td>
      <td><button class="btn btn-o btn-s" onclick="printInvoice('${v.id}')">🖨️ فاتورة</button></td></tr>`; }).join('')}</table>` : '<div class="empty">لا توجد فواتير</div>'}
  </div>`);
}
function finPay(id) {
  const v = DB.visits.find(x => x.id === id);
  if (!v.paid) { v.paid = true; logPayment(v); save(); }
  toast('✅ تم تسجيل الدفع — فاتورة ' + v.invoiceNo + ' — اتسجلت في الخزينة');
  renderFinance();
}

/* ================= WORKLIST ================= */
function renderWorklist() {
  shell('قوائم العمل', `
  <div class="toolbar">
    <select id="wl-status" onchange="wlRender()">
      <option value="">كل الحالات</option><option value="pending">قيد الانتظار</option>
      <option value="partial">جزئية</option><option value="done">مكتملة</option>
    </select>
    <input id="wl-date" type="date" value="${today()}" onchange="wlRender()">
  </div>
  <div class="card"><div id="wl-list"></div></div>`);
  wlRender();
}
function wlRender() {
  const st = $('#wl-status').value, d = $('#wl-date').value;
  let vs = DB.visits.filter(v => !d || v.date === d);
  if (st) vs = vs.filter(v => visitStatus(v) === st);
  $('#wl-list').innerHTML = vs.length ? `<table><tr><th>الفاتورة</th><th>التاريخ</th><th>المريض</th><th>الاختبارات</th><th>الإجمالي</th><th>الحالة</th><th></th></tr>
    ${vs.map(v => { const p = patById(v.patientId); return `<tr><td class="num">${v.invoiceNo}</td><td>${v.date}</td><td>${esc(p?.name)}</td>
    <td>${v.tests.map(t => esc(testById(t.testId)?.name)).join('، ')}</td><td class="num">${fmt(visitTotal(v))}</td>
    <td>${statusPill(visitStatus(v))}</td>
    <td><button class="btn btn-p btn-s" onclick="go('results/${v.id}')">فتح</button></td></tr>`; }).join('')}</table>` : '<div class="empty">لا توجد حالات مطابقة</div>';
}

/* ================= OUTBOUND ================= */
function renderOutbound() {
  shell('العينات الصادرة', `
  <div class="card"><h3>عينات محولة لمختبرات خارجية</h3>
  <div class="toolbar"><button class="btn btn-g" onclick="outNew()">+ تسجيل عينة صادرة</button></div>
  <div id="out-list">${outListHtml()}</div></div>`);
}
let outbound = [];
function outListHtml() {
  outbound = DB.outbound || [];
  return outbound.length ? `<table><tr><th>التاريخ</th><th>المريض</th><th>الاختبار</th><th>المختبر المحوّل إليه</th><th>الحالة</th></tr>
    ${outbound.map(o => `<tr><td>${o.date}</td><td>${esc(o.patient)}</td><td>${esc(o.test)}</td><td>${esc(o.lab)}</td>
    <td>${o.done ? '<span class="pill p-done">تمت النتيجة</span>' : '<span class="pill p-wait">بانتظار النتيجة</span>'}</td></tr>`).join('')}</table>` : '<div class="empty">لا توجد عينات صادرة</div>';
}
function outNew() {
  modal(`<h3>تسجيل عينة صادرة</h3>
    <div class="grid2">
      <div class="field"><label>اسم المريض *</label><input id="out-p"></div>
      <div class="field"><label>الاختبار *</label><input id="out-t"></div>
      <div class="field"><label>المختبر المحوّل إليه *</label><input id="out-l"></div>
    </div>
    <div class="modal-actions"><button class="btn btn-p" onclick="outSave()">💾 حفظ</button>
    <button class="btn btn-o" onclick="closeModal()">إلغاء</button></div>`);
}
function outSave() {
  const p = $('#out-p').value.trim(), t = $('#out-t').value.trim(), l = $('#out-l').value.trim();
  if (!p || !t || !l) { toast('⚠️ املأ كل الحقول'); return; }
  DB.outbound = DB.outbound || [];
  DB.outbound.unshift({ date: today(), patient: p, test: t, lab: l, done: false });
  save(); closeModal(); renderOutbound(); toast('✅ تم التسجيل');
}

/* ================= REPORTS ================= */
function renderReports() {
  const byDay = {};
  DB.visits.forEach(v => { byDay[v.date] = (byDay[v.date] || 0) + visitTotal(v); });
  const testCount = {};
  DB.visits.forEach(v => v.tests.forEach(t => { const n = testById(t.testId)?.name; if (n) testCount[n] = (testCount[n] || 0) + 1; }));
  const top = Object.entries(testCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const done = DB.visits.reduce((a, v) => a + v.tests.filter(t => t.status === 'done').length, 0);
  const all = DB.visits.reduce((a, v) => a + v.tests.length, 0);
  shell('التقارير الإحصائية', `
  <div class="stats">
    <div class="stat"><div class="v">${DB.visits.length}</div><div class="l">إجمالي الزيارات</div></div>
    <div class="stat blue"><div class="v">${all}</div><div class="l">إجمالي الاختبارات</div></div>
    <div class="stat green"><div class="v">${all ? Math.round(done / all * 100) : 0}%</div><div class="l">نسبة إتمام النتائج</div></div>
    <div class="stat gold"><div class="v">${fmt(Object.values(byDay).reduce((a, b) => a + b, 0))} ج.م</div><div class="l">إجمالي الإيرادات</div></div>
  </div>
  <div class="grid2">
    <div class="card"><h3>الإيرادات اليومية</h3>
      <table><tr><th>اليوم</th><th>الإيراد (ج.م)</th></tr>
      ${Object.entries(byDay).sort().reverse().map(([d, r]) => `<tr><td class="num">${d}</td><td class="num"><b>${fmt(r)}</b></td></tr>`).join('') || '<tr><td colspan="2" class="empty">لا بيانات</td></tr>'}</table>
    </div>
    <div class="card"><h3>أكثر الاختبارات طلبًا</h3>
      <table><tr><th>الاختبار</th><th>العدد</th></tr>
      ${top.map(([n, c]) => `<tr><td>${esc(n)}</td><td class="num"><b>${c}</b></td></tr>`).join('') || '<tr><td colspan="2" class="empty">لا بيانات</td></tr>'}</table>
    </div>
  </div>
  <button class="btn btn-p no-print" onclick="window.print()">🖨️ طباعة التقرير</button>`);
}

/* ================= USERS ================= */
function renderUsers() {
  shell('المستخدمون', `
  <div class="toolbar"><button class="btn btn-g" onclick="usrEdit('')">+ مستخدم جديد</button></div>
  <div class="card"><table><tr><th>الاسم</th><th>اسم المستخدم</th><th>الصلاحية</th><th></th></tr>
    ${DB.users.map(u => `<tr><td><b>${esc(u.name)}</b></td><td class="num">${esc(u.user)}</td><td>${esc(u.role)}</td>
    <td><button class="btn btn-o btn-s" onclick="usrEdit('${u.id}')">✏️</button>
    ${u.user !== 'mt' ? `<button class="btn btn-red btn-s" onclick="usrDel('${u.id}')">🗑️</button>` : ''}</td></tr>`).join('')}</table></div>`);
}
function usrEdit(id) {
  const u = id ? DB.users.find(x => x.id === id) : { name: '', user: '', pass: '', role: 'أخصائي' };
  modal(`<h3>${id ? 'تعديل' : 'إضافة'} مستخدم</h3>
    <div class="grid2">
      <div class="field"><label>الاسم *</label><input id="uu-name" value="${esc(u.name)}"></div>
      <div class="field"><label>اسم المستخدم *</label><input id="uu-user" value="${esc(u.user)}"></div>
      <div class="field"><label>كلمة المرور *</label><input id="uu-pass" value="${esc(u.pass)}"></div>
      <div class="field"><label>الصلاحية</label><select id="uu-role">${['مدير', 'أخصائي', 'استقبال'].map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
    </div>
    <div class="modal-actions"><button class="btn btn-p" onclick="usrSave('${id}')">💾 حفظ</button>
    <button class="btn btn-o" onclick="closeModal()">إلغاء</button></div>`);
}
function usrSave(id) {
  const name = $('#uu-name').value.trim(), user = $('#uu-user').value.trim(), pass = $('#uu-pass').value;
  if (!name || !user || !pass) { toast('⚠️ املأ كل الحقول'); return; }
  if (id) Object.assign(DB.users.find(x => x.id === id), { name, user, pass, role: $('#uu-role').value });
  else DB.users.push({ id: uid('u'), name, user, pass, role: $('#uu-role').value });
  save(); closeModal(); renderUsers(); toast('✅ تم الحفظ');
}
function usrDel(id) {
  if (!confirm('حذف هذا المستخدم؟')) return;
  DB.users = DB.users.filter(u => u.id !== id); save(); renderUsers(); toast('🗑️ تم الحذف');
}

/* ================= DASHBOARD ================= */
function renderDashboard() {
  const todayVisits = DB.visits.filter(v => v.date === today());
  const todayRev = todayVisits.reduce((a, v) => a + visitTotal(v), 0);
  const pend = DB.visits.reduce((a, v) => a + v.tests.filter(t => t.status !== 'done').length, 0);
  shell('نظرة عامة', `
  <div class="stats">
    <div class="stat blue"><div class="v">${todayVisits.length}</div><div class="l">زيارات اليوم</div></div>
    <div class="stat gold"><div class="v">${fmt(todayRev)} ج.م</div><div class="l">إيرادات اليوم</div></div>
    <div class="stat"><div class="v">${DB.patients.length}</div><div class="l">إجمالي المرضى</div></div>
    <div class="stat green"><div class="v">${pend}</div><div class="l">اختبارات معلقة</div></div>
  </div>
  <div class="card"><h3>آخر الزيارات</h3>${miniVisitsTable(DB.visits.slice(0, 8))}</div>`);
}
function miniVisitsTable(vs) {
  return vs.length ? `<table><tr><th>الفاتورة</th><th>التاريخ</th><th>المريض</th><th>الإجمالي</th><th>الحالة</th></tr>
    ${vs.map(v => { const p = patById(v.patientId); return `<tr><td class="num">${v.invoiceNo}</td><td>${v.date}</td>
    <td>${esc(p?.name)}</td><td class="num">${fmt(visitTotal(v))}</td><td>${statusPill(visitStatus(v))}</td></tr>`; }).join('')}</table>` : '<div class="empty">لا توجد زيارات</div>';
}

/* ================= SETTINGS ================= */
function renderSettings() {
  shell('الإعدادات', `
  <div class="card"><h3>بيانات المعمل وهويته</h3>
    <div style="display:flex;gap:20px;align-items:center;margin-bottom:16px">
      <img id="st-logo-preview" src="${DB.lab.logo || 'lis-assets/logo.png'}" style="width:84px;height:84px;object-fit:contain;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:6px">
      <div>
        <b>شعار المعمل</b>
        <div style="font-size:12.5px;color:var(--mut);margin:4px 0">بيظهر في صفحة الدخول والشريط العلوي والتقارير المطبوعة</div>
        <input type="file" accept="image/*" id="st-logo-file" style="display:none" onchange="stLogoFile(this)">
        <div style="display:flex;gap:8px">
          <button class="btn btn-o btn-s" onclick="$('#st-logo-file').click()">⬆️ رفع شعار</button>
          ${DB.lab.logo ? '<button class="btn btn-red btn-s" onclick="stLogoClear()">إزالة الشعار</button>' : ''}
        </div>
      </div>
    </div>
    <div class="grid2">
      <div class="field"><label>اسم المعمل</label><input id="st-name" value="${esc(DB.lab.name)}"></div>
      <div class="field"><label>الفروع (افصل بفاصلة)</label><input id="st-branches" value="${esc(DB.lab.branches.join('، '))}"></div>
    </div>
    <button class="btn btn-p" onclick="stSave()">💾 حفظ</button>
  </div>
  <div class="card"><h3>النسخ الاحتياطي</h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-o" onclick="backup()">⬇️ تنزيل نسخة احتياطية</button>
      <button class="btn btn-o" onclick="$('#restore-file').click()">⬆️ استعادة من نسخة</button>
      <input type="file" id="restore-file" accept=".json" style="display:none" onchange="restoreFile(this)">
      <button class="btn btn-red" onclick="resetDB()">🗑️ إعادة تعيين البيانات التجريبية</button>
    </div>
  </div>`);
}
function stSave() {
  DB.lab.name = $('#st-name').value.trim() || DB.lab.name;
  DB.lab.branches = $('#st-branches').value.split(/[،,]/).map(s => s.trim()).filter(Boolean);
  const lab = labById(LABID);
  if (lab) { lab.name = DB.lab.name; saveMeta(); }
  save(); toast('✅ تم الحفظ'); route();
}
function stLogoFile(inp) {
  const f = inp.files[0]; if (!f) return;
  if (f.size > 400 * 1024) { toast('⚠️ حجم الشعار كبير — اختر صورة أقل من 400KB'); return; }
  const r = new FileReader();
  r.onload = () => {
    DB.lab.logo = r.result; save();
    const lab = labById(LABID);
    if (lab) { /* name unchanged */ }
    toast('✅ تم تحديث الشعار'); renderSettings();
  };
  r.readAsDataURL(f);
}
function stLogoClear() { delete DB.lab.logo; save(); toast('تمت إزالة الشعار'); renderSettings(); }
function backup() {
  const blob = new Blob([JSON.stringify(DB)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tayealab-backup-${today()}.json`;
  a.click();
}
function restoreFile(inp) {
  const f = inp.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { DB = JSON.parse(r.result); save(); toast('✅ تمت الاستعادة'); route(); } catch (e) { toast('❌ ملف غير صالح'); } };
  r.readAsText(f);
}


/* ================= DISTRIBUTOR PANEL ================= */
function mkCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const s = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return s.slice(0, 4) + '-' + s.slice(4);
}
function renderDistributor() {
  const labs = META.labs;
  $('#root').innerHTML = `
  <div class="topbar">
    <img src="lis-assets/icon-192.png" alt="">
    <span class="t">TayeaLab — لوحة الموزّع</span>
    <span style="color:#8fa8d8;font-size:12.5px">توزيع البرنامج على المعامل</span>
    <span class="sp"></span>
    <span class="who">الموزّع العام</span>
    <button class="icon-btn" onclick="logout()" title="خروج">⏻</button>
  </div>
  <div id="view">
    <div class="stats">
      <div class="stat blue"><div class="v">${labs.length}</div><div class="l">إجمالي المعامل</div></div>
      <div class="stat green"><div class="v">${labs.filter(l => l.active).length}</div><div class="l">معامل نشطة</div></div>
      <div class="stat"><div class="v">${labs.filter(l => !l.active).length}</div><div class="l">معامل موقوفة</div></div>
    </div>
    <div class="toolbar">
      <input id="dl-name" placeholder="اسم المعمل الجديد…" style="flex:1">
      <button class="btn btn-g" onclick="dlAdd()">+ إنشاء معمل + كود تفعيل</button>
    </div>
    <div class="card"><h3>المعامل المشتركة</h3>
      ${labs.length ? `<table><tr><th>المعمل</th><th>كود التفعيل</th><th>الحالة</th><th>تاريخ الإنشاء</th><th>الأجهزة المفعلة (هذا المتصفح)</th><th></th></tr>
      ${labs.map(l => `<tr>
        <td><b>${esc(l.name)}</b></td>
        <td><span class="num" style="background:#fff4dd;padding:4px 12px;border-radius:8px;font-weight:900;letter-spacing:1px">${esc(l.code)}</span></td>
        <td>${l.active ? '<span class="pill p-done">نشط</span>' : '<span class="pill p-unpaid">موقوف</span>'}</td>
        <td class="num">${l.createdAt}</td>
        <td>${isActivated(l.id) ? '✔ مفعّل' : '—'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-o btn-s" onclick="dlRename('${l.id}')">✏️ اسم</button>
          <button class="btn btn-o btn-s" onclick="dlRecode('${l.id}')">🔄 كود جديد</button>
          <button class="btn ${l.active ? 'btn-red' : 'btn-g'} btn-s" onclick="dlToggle('${l.id}')">${l.active ? 'إيقاف' : 'تشغيل'}</button>
          <button class="btn btn-red btn-s" onclick="dlDel('${l.id}')">🗑️</button>
        </td></tr>`).join('')}</table>` : '<div class="empty">لا توجد معامل بعد — أنشئ أول معمل من الأعلى</div>'}
    </div>
    <div class="card"><h3>حساب الموزّع</h3>
      <div class="grid2">
        <div class="field"><label>اسم المستخدم</label><input id="sp-user" value="${esc(META.superUser.user)}"></div>
        <div class="field"><label>كلمة المرور</label><input id="sp-pass" value="${esc(META.superUser.pass)}"></div>
      </div>
      <button class="btn btn-p" onclick="spSave()">💾 حفظ بيانات الموزّع</button>
    </div>
    <div class="card"><h3>نسخ احتياطي شامل (كل المعامل)</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-o" onclick="backupAll()">⬇️ تنزيل كل البيانات</button>
      </div>
    </div>
  </div>`;
}
function dlAdd() {
  const name = $('#dl-name').value.trim();
  if (!name) { toast('⚠️ اكتب اسم المعمل'); return; }
  const id = uid('lab');
  META.labs.unshift({ id, name, code: mkCode(), active: true, createdAt: today() });
  const fresh = seed();
  fresh.lab.name = name;
  localStorage.setItem(labKey(id), JSON.stringify(fresh));
  saveMeta(); renderDistributor();
  toast('✅ تم إنشاء "' + name + '" — كود التفعيل ظاهر في الجدول');
}
function dlRename(id) {
  const l = labById(id);
  modal(`<h3>تغيير اسم المعمل</h3>
    <div class="field"><input id="dl-rn" value="${esc(l.name)}"></div>
    <div class="modal-actions"><button class="btn btn-p" onclick="dlRenameSave('${id}')">💾 حفظ</button>
    <button class="btn btn-o" onclick="closeModal()">إلغاء</button></div>`);
}
function dlRenameSave(id) {
  const l = labById(id);
  l.name = $('#dl-rn').value.trim() || l.name;
  try { const d = JSON.parse(localStorage.getItem(labKey(id))); if (d?.lab) { d.lab.name = l.name; localStorage.setItem(labKey(id), JSON.stringify(d)); } } catch (e) {}
  saveMeta(); closeModal(); renderDistributor(); toast('✅ تم التحديث');
}
function dlRecode(id) {
  const l = labById(id);
  l.code = mkCode(); saveMeta(); renderDistributor();
  toast('🔄 كود جديد لـ ' + l.name + ': ' + l.code);
}
function dlToggle(id) {
  const l = labById(id); l.active = !l.active; saveMeta(); renderDistributor();
  toast(l.active ? '▶ تم تشغيل ' + l.name : '⏸ تم إيقاف ' + l.name);
}
function dlDel(id) {
  const l = labById(id);
  if (!confirm(`حذف معمل "${l.name}" وكل بياناته نهائيًا؟`)) return;
  META.labs = META.labs.filter(x => x.id !== id);
  localStorage.removeItem(labKey(id));
  localStorage.removeItem(actKey(id));
  saveMeta(); renderDistributor(); toast('🗑️ تم الحذف');
}
function spSave() {
  const u = $('#sp-user').value.trim(), p = $('#sp-pass').value;
  if (!u || !p) { toast('⚠️ أكمل البيانات'); return; }
  META.superUser = { user: u, pass: p }; saveMeta(); toast('✅ تم حفظ حساب الموزّع');
}
function backupAll() {
  const data = { meta: META, labs: {} };
  META.labs.forEach(l => { const d = localStorage.getItem(labKey(l.id)); if (d) data.labs[l.id] = JSON.parse(d); });
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tayealab-all-labs-${today()}.json`;
  a.click();
}

/* ================= PRINTING ================= */
function printInvoice(visitId) {
  const v = DB.visits.find(x => x.id === visitId); if (!v) return;
  const p = patById(v.patientId);
  printWin(`فاتورة رقم ${v.invoiceNo}`, `
  <div style="text-align:center;margin-bottom:14px">
    <img src="${DB.lab.logo || 'lis-assets/logo.png'}" style="width:130px">
    <h2 style="margin:4px 0">${esc(DB.lab.name)}</h2>
    <div>${esc(session()?.branch || '')}</div>
    <h3>فاتورة رقم <span class="num">${v.invoiceNo}</span> — ${v.date}</h3>
  </div>
  <table>
    <tr><td><b>المريض:</b> ${esc(p?.name)} (${esc(p?.code)})</td><td><b>العمر:</b> ${p?.age} ${esc(p?.gender || '')}</td>
    <td><b>الطبيب:</b> ${esc(v.doctor || '—')}</td></tr>
  </table>
  <table border="1" cellpadding="8" style="margin-top:10px">
    <tr><th>#</th><th>الاختبار</th><th>القسم</th><th>السعر</th></tr>
    ${v.tests.map((t, i) => { const tt = testById(t.testId); return `<tr><td>${i + 1}</td><td>${esc(tt?.name)}</td><td>${esc(tt?.cat)}</td><td class="num">${fmt(tt?.price)}</td></tr>`; }).join('')}
    ${v.discount ? `<tr><td colspan="3">الخصم</td><td class="num">-${fmt(v.discount)}</td></tr>` : ''}
    <tr><td colspan="3"><b>الإجمالي</b></td><td class="num"><b>${fmt(visitTotal(v))} ج.م</b></td></tr>
  </table>
  <p style="margin-top:10px">حالة الدفع: ${v.paid ? '<b>مدفوعة</b>' : '<b>آجلة</b>'}</p>`);
}
function printResult(visitId) {
  const v = DB.visits.find(x => x.id === visitId); if (!v) return;
  const p = patById(v.patientId);
  printWin(`نتيجة ${p?.name}`, `
  <div style="text-align:center;margin-bottom:12px">
    <img src="${DB.lab.logo || 'lis-assets/logo.png'}" style="width:110px">
    <h2 style="margin:4px 0">${esc(DB.lab.name)}</h2>
    <div>تقرير نتائج تحاليل — ${v.date}</div>
  </div>
  <table><tr><td><b>الاسم:</b> ${esc(p?.name)}</td><td><b>العمر:</b> ${p?.age}</td>
  <td><b>النوع:</b> ${esc(p?.gender || '')}</td><td><b>الكود:</b> <span class="num">${esc(p?.code)}</span></td>
  <td><b>الطبيب:</b> ${esc(v.doctor || '—')}</td></tr></table>
  ${v.tests.filter(t => t.status === 'done').map(t => { const tt = testById(t.testId); return `
    <h3 style="margin:14px 0 6px;color:#0d1b3a">${esc(tt.name)}</h3>
    <table border="1" cellpadding="6">
      <tr><th>البند</th><th>الوحدة</th><th>النتيجة</th><th>المرجع</th><th>التقييم</th></tr>
      ${tt.fields.map((f, fi) => {
        const val = t.results['f' + fi] ?? '';
        let ev = '';
        const lo = parseFloat(f[2]), hi = parseFloat(f[3]); const nv = parseFloat(val);
        if (val !== '' && !isNaN(nv) && !isNaN(lo) && !isNaN(hi)) ev = nv > hi ? 'مرتفع ↑' : nv < lo ? 'منخفض ↓' : 'طبيعي';
        return `<tr><td>${esc(f[0])}</td><td class="num">${esc(f[1])}</td><td class="num"><b>${esc(val)}</b></td>
        <td class="num">${esc(String(f[2]))} - ${esc(String(f[3]))}</td><td>${ev}</td></tr>`;
      }).join('')}
    </table>
    ${t.comment ? `<div style="font-size:13px;margin-top:4px"><b>تعليق:</b> ${esc(t.comment)}</div>` : ''}`; }).join('')}
  <div style="margin-top:20px;text-align:center;font-size:12px;color:#666">تمت الطباعة باستخدام TayeaLab — ${now()}</div>`);
}
function printWin(title, bodyHtml) {
  const w = window.open('', '_blank', 'width=800,height=900');
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
  <style>body{font-family:'Cairo',sans-serif;padding:24px;color:#1c2437;font-size:14px}
  table{width:100%;border-collapse:collapse}td{padding:6px}th{background:#f2f5fb}
  .num{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:embed}
  @media print{.no-print{display:none}}</style></head><body>
  ${bodyHtml}
  <script>window.onload=()=>{setTimeout(()=>window.print(),400)}<\/script>
  </body></html>`);
  w.document.close();
}

/* ================= modal ================= */
function modal(html) {
  closeModal();
  const w = document.createElement('div');
  w.className = 'modal-wrap'; w.id = 'modal-wrap';
  w.innerHTML = `<div class="modal">${html}</div>`;
  w.addEventListener('click', e => { if (e.target === w) closeModal(); });
  document.body.appendChild(w);
}
function closeModal() { $('#modal-wrap')?.remove(); }

/* ================= boot ================= */
loadMeta();
window.addEventListener('DOMContentLoaded', route);
if (document.readyState !== 'loading') route();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
