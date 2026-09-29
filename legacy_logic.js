<script>
/* keep an untouched copy of this page so a shareable file can be made from it later */
const PRISTINE_HTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
/* ============================================================
   CONFIG
============================================================ */
const UNIT_SHEETS = { 'U02':'B1U2', 'U03':'B1U3', 'U04':'B1U4', 'B2U2':'B2U2', 'B2U3':'B2U3' };
const UNIT_ORDER  = ['B1U2','B1U3','B1U4','B2U2','B2U3'];
const UNIT_LABEL  = { B1U2:'B1 Unit-02', B1U3:'B1 Unit-03', B1U4:'B1 Unit-04', B2U2:'B2 Unit-02', B2U3:'B2 Unit-03' };
const UNIT_GROUP  = { B1U2:'B1', B1U3:'B1', B1U4:'B1', B2U2:'B2', B2U3:'B2' };

const DEFAULT_BUYER_MAP = {
  'MS':'MS', 'MGFLaneBryant':'MGF/LB', 'SAINSBURYS':'SBY', 'TESCO':'Tesco',
  'GAP':'GAP', 'HEMA':'HEMA', 'LIDLASIAPTELIMIT':'LIDL', 'YamamayInticom':'Yamamay', "H&M":"H&M"
};

// Per-unit average working hour per man-power per day, taken directly from the plan's
// own reference summary (Plan Clock Hour ÷ (Plan MO × Working Days)) — not a flat assumption.
const UNIT_SHIFT_HOURS = {
  B1U2: 9.84715719063545,
  B1U3: 9.03275540436739,
  B1U4: 9.24131198750488,
  B2U2: 10.5,
  B2U3: 10.451662116589
};

const HEADER_ALIASES = {
  line: ['line'], manpower: ['man-power','manpower'], unit: ['unit'],
  styleref: ['style ref.','style ref','styleref'], article: ['article'],
  buyer: ['buyer'], type: ['type'], smv: ['smv'], psd: ['psd'],
  odrqty: ['odr qty','order qty','order quantity']
};

/* ============================================================
   STATE
============================================================ */
let STATE = {
  rows: [],          // parsed style rows
  dateKeys: [],       // sorted 'YYYY-MM-DD'
  dateLabels: {},      // dateKey -> Date obj
  sahDirect: {},        // unit -> line -> dateKey -> real SAH, straight from the plan's recap row
  machineHourDirect: {}, // unit -> line -> dateKey -> real Machine Hour, same source
  capacity: {},        // unit -> number
  buyerMap: {},         // buyer -> short code
  computed: {}           // cached report outputs
};

/* ============================================================
   HELPERS
============================================================ */
function pad(n){ return n<10 ? '0'+n : ''+n; }
// The physical line number for the Change Over report's "Team No" column.
// Must be each line's OWN number as written in the plan (e.g. "U03-11" -> "11"),
// never the row's position in a sorted list — a missing line number (no line 10 in
// a unit, say) would otherwise shift every later line's team number down by one.
function lineTeamNo(lineStr){
  const s = String(lineStr===null||lineStr===undefined?'':lineStr).trim();
  const m = s.match(/^(?:b[12][\s_\-]*)?u0*\d+[\s_.\-]+(.+)$/i);
  return (m && m[1]) ? m[1].trim() : s;
}
function dateKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function dateShort(d){ return pad(d.getMonth()+1)+'/'+pad(d.getDate()); }
// Full date as plain text, e.g. "09/01/2026" — used for Excel EXPORT headers only.
// We deliberately write dates as plain strings rather than JS Date objects when
// exporting: ExcelJS's date-to-serial conversion has shown timezone-dependent
// off-by-one-day behaviour in some browsers, and a report header doesn't need
// real Excel date arithmetic anyway — a plain label sidesteps the bug entirely.
function dateHeaderLabel(d){ return pad(d.getMonth()+1)+'/'+pad(d.getDate())+'/'+d.getFullYear(); }
function normHeader(h){ return (h===null||h===undefined) ? '' : String(h).trim().toLowerCase(); }
function findCol(header, aliases){
  for(let i=0;i<header.length;i++){
    const h = normHeader(header[i]);
    if(aliases.includes(h)) return i;
  }
  return -1;
}
function num(v){ const n = Number(v); return isFinite(n) ? n : 0; }
// SheetJS date-cell parsing can land a few tens of ms/seconds off true midnight due to
// floating point rounding of the Excel serial. That's invisible at UTC but shows up as a
// whole calendar day shift once the browser's timezone offset is applied (e.g. GMT+6).
// Snapping to the nearest minute removes the jitter so the date always lands on the
// intended calendar day, in any timezone.
function snapDate(d){ return new Date(Math.round(d.getTime()/60000)*60000); }
function fmt(n, dp){
  if(n===undefined||n===null||isNaN(n)) return '';
  dp = dp===undefined?0:dp;
  return Number(n).toLocaleString(undefined,{minimumFractionDigits:dp, maximumFractionDigits:dp});
}
function pct(n){ if(!isFinite(n)) return '0%'; return Math.round(n*100)+'%'; }

function monthKeyOf(dk){ return dk.slice(0,7); } // 'YYYY-MM'
function daysInMonth(year, month0){ return new Date(year, month0+1, 0).getDate(); } // month0 is 0-based
function monthLabel(monthKey){
  const [y,m] = monthKey.split('-').map(Number);
  const d = new Date(y, m-1, 1);
  return d.toLocaleString(undefined,{month:'long', year:'numeric'});
}
// Builds the full list of calendar-day keys for a given 'YYYY-MM', regardless of
// which days actually have columns in the uploaded plan.
function fullMonthDateKeys(monthKey){
  const [y,m] = monthKey.split('-').map(Number);
  const n = daysInMonth(y, m-1);
  const keys = [];
  for(let day=1; day<=n; day++){
    const d = new Date(y, m-1, day);
    const k = dateKey(d);
    keys.push(k);
    if(!STATE.dateLabels[k]) STATE.dateLabels[k] = d; // fill label for days absent from the plan file
  }
  return keys;
}
function availableMonths(){
  return Array.from(new Set(STATE.dateKeys.map(monthKeyOf))).sort();
}

/* ============================================================
   PARSE WORKBOOK
============================================================ */

/* ============================================================
   SHEET NAME MATCHING
   The plan file's tab names can change between months (e.g. "U02" becomes
   "U02 Sep" or "Unit-02"). Instead of requiring exact names we:
     1. accept a known name or a close variant of it,
     2. remember any mapping the user picked by hand (per sheet name),
     3. let the user pick the unit for any sheet we could not match.
============================================================ */
const MAP_STORE_KEY = 'birichina_sheet_map_v1';
const SHEET_CACHE = {};   // sheet name -> parsed rows-of-arrays (cleared on every new file)

function esc(v){
  return String(v===null||v===undefined?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function loadSavedMap(){
  try{ return JSON.parse(localStorage.getItem(MAP_STORE_KEY) || '{}') || {}; }catch(e){ return {}; }
}
function saveMap(m){
  try{ localStorage.setItem(MAP_STORE_KEY, JSON.stringify(m)); }catch(e){}
}
function normSheetName(n){ return String(n===null||n===undefined?'':n).toLowerCase().replace(/[^a-z0-9]/g,''); }

// "U02", "U-02", "Unit 2", "Unit-02", "B2U2", "B2 Unit-02", "U02 Sep", "B2U3-2026", "Unit 3 (B2)", "Plan U02" ...
// score: 2 = the whole name is a unit name, 3 = name starts with a unit name, 4 = a unit name appears inside the name
function guessUnitFromName(name){
  const raw = String(name===null||name===undefined?'':name).toLowerCase().trim();
  const SEP = '[\\s_\\-.]*';
  let m = raw.match(new RegExp('^(?:b\\s*([12])' + SEP + ')?(?:unit|u)' + SEP + '0*([1-9])(?![0-9])'));
  let score = 3;
  if(!m){
    m = raw.match(new RegExp('(?:^|[^a-z0-9])(?:b\\s*([12])' + SEP + ')?(?:unit|u)' + SEP + '0*([1-9])(?![0-9])'));
    score = 4;
  }
  if(!m) return null;
  let b = m[1] || null;
  const rest = raw.slice(m.index + m[0].length);
  if(!b){ const r = rest.match(/^[\s_\-.(\[]*b\s*([12])(?![0-9])/); if(r) b = r[1]; }
  const unit = 'B' + (b || '1') + 'U' + m[2];
  if(!UNIT_ORDER.includes(unit)) return null;
  if(score === 3 && normSheetName(rest) === '') score = 2;
  return { unit, score };
}

// header row = the first of the top 15 rows that has a Line column and a Style Ref. or Buyer column
function findHeaderRow(aoa){
  const lim = Math.min(aoa.length, 15);
  for(let i=0;i<lim;i++){
    const h = aoa[i];
    if(!h) continue;
    if(findCol(h, HEADER_ALIASES.line) >= 0 &&
       (findCol(h, HEADER_ALIASES.styleref) >= 0 || findCol(h, HEADER_ALIASES.buyer) >= 0)) return i;
  }
  return -1;
}
// Which unit does one plan row belong to? Used for sheets that hold every unit in one tab.
//   1) the Unit column, when it holds a full unit code ("B1U2", "B1U3", "B1U4", "B2U2", "B2U3")
//   2) otherwise the line name: "U02-01" -> B1U2, "B2U3-13" -> B2U3 (the Unit column may just say "B2")
function resolveRowUnit(unitVal, lineStr){
  const cu = String(unitVal===null||unitVal===undefined?'':unitVal).toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(UNIT_ORDER.includes(cu)) return cu;
  const g = guessUnitFromName(lineStr);
  if(g && g.unit){
    // if the Unit column names only the building ("B2") it must agree with the line's building
    const bm = cu.match(/^B([12])$/);
    if(bm && g.unit.charAt(1) !== bm[1]) return null;
    return g.unit;
  }
  return null;
}
function analyseSheetUnits(aoa, hIdx){
  const header = aoa[hIdx] || [];
  const cLine = findCol(header, HEADER_ALIASES.line);
  const cUnit = findCol(header, HEADER_ALIASES.unit);
  const counts = {};
  for(let r=hIdx+1;r<aoa.length;r++){
    const row = aoa[r]; if(!row || cLine<0) continue;
    const lv = row[cLine];
    const line = (lv===null||lv===undefined) ? '' : String(lv).trim();
    if(!line || line==='-') continue;
    const u = resolveRowUnit(cUnit>=0 ? row[cUnit] : null, line);
    if(u) counts[u] = (counts[u]||0) + 1;
  }
  return counts;
}
function getSheetAoa(wb, name){
  if(!SHEET_CACHE[name]){
    SHEET_CACHE[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1, raw:true, defval:null});
  }
  return SHEET_CACHE[name];
}
function detectPlanSheets(wb){
  return wb.SheetNames.map(name=>{
    let hdr = -1, counts = {};
    try{
      const aoa = getSheetAoa(wb, name);
      hdr = findHeaderRow(aoa);
      if(hdr >= 0) counts = analyseSheetUnits(aoa, hdr);
    }catch(e){ hdr = -1; }
    return { name, valid: hdr >= 0, counts, units: Object.keys(counts) };
  });
}
function proposeMapping(sheets){
  const saved = loadSavedMap();
  const cands = [];
  sheets.forEach((sh, idx)=>{
    if(!sh.valid) return;
    const n = normSheetName(sh.name);
    // a sheet whose rows belong to several units (one tab for the whole factory): read all units from it
    if(sh.units.length >= 2){
      cands.push({sheet:sh.name, unit:'*', score:-1, len:n.length, idx});
      return;
    }
    Object.keys(UNIT_SHEETS).forEach(k=>{
      if(normSheetName(k) === n) cands.push({sheet:sh.name, unit:UNIT_SHEETS[k], score:0, len:n.length, idx});
    });
    if(saved[sh.name] && (UNIT_ORDER.includes(saved[sh.name]) || saved[sh.name]==='*')){
      cands.push({sheet:sh.name, unit:saved[sh.name], score:1, len:n.length, idx});
    }
    const g = guessUnitFromName(sh.name);
    if(g) cands.push({sheet:sh.name, unit:g.unit, score:g.score, len:n.length, idx});
    // a sheet whose rows all belong to one unit (Unit column / line names) tells us its own unit
    if(sh.units.length === 1) cands.push({sheet:sh.name, unit:sh.units[0], score:2.5, len:n.length, idx});
  });
  cands.sort((a,b)=> a.score-b.score || a.len-b.len || a.idx-b.idx);
  const map = {}, taken = {};
  cands.forEach(c=>{
    if(map[c.sheet]) return;
    if(c.unit === '*'){
      const sh = sheets.find(x=>x.name===c.sheet);
      if(sh.units.some(u=>taken[u])) return;
      map[c.sheet] = '*'; sh.units.forEach(u=>{ taken[u] = c.sheet; });
      return;
    }
    if(taken[c.unit]) return;
    map[c.sheet] = c.unit; taken[c.unit] = c.sheet;
  });
  return {
    map,
    unmatched: sheets.filter(sh=> sh.valid && !map[sh.name]).map(sh=>sh.name),
    missing: UNIT_ORDER.filter(u=> !taken[u])
  };
}
function describeMap(map, sheets){
  const parts = [];
  Object.keys(map).forEach(sh=>{
    if(map[sh] === '*'){
      const info = (sheets||CURRENT_SHEETS).find(x=>x.name===sh);
      const us = info ? UNIT_ORDER.filter(u=> info.counts[u]) : [];
      parts.push('<b>'+esc(sh)+'</b> → all units in this sheet' + (us.length ? ' ('+us.map(u=>esc(UNIT_LABEL[u])).join(', ')+')' : ''));
    }
  });
  UNIT_ORDER.forEach(u=>{
    const sh = Object.keys(map).find(k=> map[k]===u);
    if(sh) parts.push('<b>'+esc(sh)+'</b> → '+esc(UNIT_LABEL[u]));
  });
  return parts.join(' &nbsp;·&nbsp; ');
}
function renderMappingCard(sheets, map){
  const card = document.getElementById('mappingCard');
  const grid = document.getElementById('mappingGrid');
  const valid = sheets.filter(sh=>sh.valid);
  grid.innerHTML = '';
  valid.forEach(sh=>{
    const div = document.createElement('div'); div.className = 'field';
    const lab = document.createElement('label'); lab.textContent = 'Sheet: ' + sh.name;
    const sel = document.createElement('select'); sel.dataset.sheet = sh.name;
    const o0 = document.createElement('option'); o0.value = ''; o0.textContent = '— skip this sheet —'; sel.appendChild(o0);
    const oAll = document.createElement('option'); oAll.value = '*'; oAll.textContent = 'All units in this sheet (by Unit column / line name)'; sel.appendChild(oAll);
    UNIT_ORDER.forEach(u=>{
      const o = document.createElement('option'); o.value = u; o.textContent = UNIT_LABEL[u]; sel.appendChild(o);
    });
    sel.value = map[sh.name] || '';
    div.appendChild(lab); div.appendChild(sel); grid.appendChild(div);
  });
  const ignored = sheets.length - valid.length;
  document.getElementById('mappingSub').textContent =
    'Choose which unit each plan sheet belongs to, then click Apply. Your choice is remembered for the same sheet name next time.' +
    (ignored ? ' ' + ignored + ' other sheet' + (ignored===1?'':'s') + ' without plan columns ' + (ignored===1?'is':'are') + ' ignored.' : '');
  card.style.display = valid.length ? '' : 'none';
}
function readMappingFromCard(){
  const map = {};
  document.querySelectorAll('#mappingGrid select').forEach(sel=>{
    if(sel.value) map[sel.dataset.sheet] = sel.value;
  });
  return map;
}

function parseWorkbook(wb, sheetUnitMap){
  const rows = [];
  const dateKeySet = new Set();
  const dateLabels = {};
  const sahDirect = {};         // unit -> line -> dateKey -> real SAH, read straight from the plan's per-line recap row
  const machineHourDirect = {}; // unit -> line -> dateKey -> real Machine Hour, same source
  UNIT_ORDER.forEach(u=>{ sahDirect[u] = {}; machineHourDirect[u] = {}; });

  // process sheets in unit order (B1U2, B1U3, B1U4, B2U2, B2U3), whatever the sheets are called
  const sheetJobs = Object.keys(sheetUnitMap || {})
    .filter(nm=> sheetUnitMap[nm] && wb.SheetNames.includes(nm))
    .sort((a,b)=> UNIT_ORDER.indexOf(sheetUnitMap[a]) - UNIT_ORDER.indexOf(sheetUnitMap[b]));
  let skippedNoUnit = 0;

  sheetJobs.forEach(sheetName=>{
    const fixedUnit = sheetUnitMap[sheetName] === '*' ? null : sheetUnitMap[sheetName];   // null = work out the unit row by row
    let unit = fixedUnit;
    const aoa = getSheetAoa(wb, sheetName);
    if(!aoa.length) return;
    let hIdx = findHeaderRow(aoa);
    if(hIdx < 0) hIdx = 0;
    const header = aoa[hIdx];

    const cLine = findCol(header, HEADER_ALIASES.line);
    const cMp   = findCol(header, HEADER_ALIASES.manpower);
    const cStyle= findCol(header, HEADER_ALIASES.styleref);
    const cArt  = findCol(header, HEADER_ALIASES.article);
    const cBuyer= findCol(header, HEADER_ALIASES.buyer);
    const cType = findCol(header, HEADER_ALIASES.type);
    const cSmv  = findCol(header, HEADER_ALIASES.smv);
    const cPsd  = findCol(header, HEADER_ALIASES.psd);
    const cOdrQty = findCol(header, HEADER_ALIASES.odrqty);
    const cPlanDay = findCol(header, ['plan/day']);
    const cUnit = findCol(header, HEADER_ALIASES.unit);

    const dateCols = [];
    header.forEach((h,idx)=>{
      if(h instanceof Date){
        const hd = snapDate(h);
        const k = dateKey(hd);
        dateCols.push({idx, key:k});
        dateKeySet.add(k);
        dateLabels[k] = hd;
      }
    });

    // Each real line's order rows are followed by a 4-row recap block (Plan/Day, SAH,
    // Machine HR, Effi. plan/D) carrying that line's real numbers straight from the plan.
    // The sheet also carries ONE extra whole-unit recap block at the very end, in the same
    // shape but with Line = "-" on its Plan/Day row — that one must NOT be attributed to
    // any single line (it's the unit total, already reflected by summing every line).
    let recapTargetLine = null;
    let recapTargetUnit = null;

    for(let r=hIdx+1;r<aoa.length;r++){
      const row = aoa[r];
      if(!row) continue;
      const lineVal = cLine>=0 ? row[cLine] : null;
      const line = (lineVal===null||lineVal===undefined) ? '' : String(lineVal).trim();
      const validLine = line && line !== '-';
      // the unit of this row: fixed for a per-unit sheet, read from the row for a whole-factory sheet
      if(!fixedUnit){ unit = validLine ? resolveRowUnit(cUnit>=0 ? row[cUnit] : null, line) : null; }

      const daily = {};
      let anyQty = false;
      dateCols.forEach(dc=>{
        const q = num(row[dc.idx]);
        daily[dc.key] = q;
        if(q>0) anyQty = true;
      });

      const planDayLabel = cPlanDay>=0 ? row[cPlanDay] : null;
      // Some plan files write the text "Plan/Day" on EVERY row of that column (order rows too), so the
      // label alone no longer marks a recap block. A recap-start row is the "Plan/Day" row that has no
      // real Style Ref. / Buyer / Article (blank or "-").
      const isReal = v => v!==null && v!==undefined && String(v).trim()!=='' && String(v).trim()!=='-';
      const realIdentity = (cStyle>=0 && isReal(row[cStyle])) || (cBuyer>=0 && isReal(row[cBuyer])) || (cArt>=0 && isReal(row[cArt]));
      if(planDayLabel === 'Plan/Day' && !realIdentity){
        // start (or end) of a recap block — decide who it belongs to before moving on
        recapTargetLine = validLine ? line : null;
        recapTargetUnit = validLine ? unit : null;
        if(!recapTargetUnit) recapTargetLine = null;
        continue;
      }
      if(planDayLabel === 'SAH' && recapTargetLine && recapTargetUnit){
        if(!sahDirect[recapTargetUnit][recapTargetLine]) sahDirect[recapTargetUnit][recapTargetLine] = {};
        dateCols.forEach(dc=>{
          const v = row[dc.idx];
          if(typeof v === 'number') sahDirect[recapTargetUnit][recapTargetLine][dc.key] = v;
        });
        continue;
      }
      if(planDayLabel === 'Machine HR' && recapTargetLine && recapTargetUnit){
        if(!machineHourDirect[recapTargetUnit][recapTargetLine]) machineHourDirect[recapTargetUnit][recapTargetLine] = {};
        dateCols.forEach(dc=>{
          const v = row[dc.idx];
          if(typeof v === 'number') machineHourDirect[recapTargetUnit][recapTargetLine][dc.key] = v;
        });
        continue;
      }
      if(planDayLabel === 'Effi. plan/D'){ continue; }

      // skip fully empty rows (no line AND no plan qty at all)
      if(!validLine && !anyQty) continue;

      // skip rows with no Style Ref / Buyer / Article — not real orders
      const styleVal = cStyle>=0 ? row[cStyle] : null;
      const buyerVal = cBuyer>=0 ? row[cBuyer] : null;
      const artVal   = cArt>=0 ? row[cArt] : null;
      const hasIdentity = (styleVal!==null && styleVal!==undefined && String(styleVal).trim()!=='') ||
                          (buyerVal!==null && buyerVal!==undefined && String(buyerVal).trim()!=='') ||
                          (artVal!==null && artVal!==undefined && String(artVal).trim()!=='');
      if(!hasIdentity) continue;
      if(!unit){ skippedNoUnit++; continue; }

      rows.push({
        unit,
        line: validLine ? line : '',
        manpower: cMp>=0 ? num(row[cMp]) : 0,
        styleRef: cStyle>=0 ? (row[cStyle]===null?'':String(row[cStyle]).trim()) : '',
        article: cArt>=0 ? (row[cArt]===null?'':String(row[cArt]).trim()) : '',
        buyer: cBuyer>=0 ? (row[cBuyer]===null?'':String(row[cBuyer]).trim()) : '',
        type: cType>=0 ? (row[cType]===null?'':String(row[cType]).trim()) : '',
        smv: cSmv>=0 ? num(row[cSmv]) : 0,
        odrQty: cOdrQty>=0 ? num(row[cOdrQty]) : 0,
        psd: (cPsd>=0 && row[cPsd] instanceof Date) ? snapDate(row[cPsd]) : null,
        daily
      });
    }
  });

  const dateKeys = Array.from(dateKeySet).sort();
  return {rows, dateKeys, dateLabels, sahDirect, machineHourDirect, skippedNoUnit};
}

/* ============================================================
   REPORT: RUN LINES
============================================================ */
function computeRunLines(monthKey){
  const rows = STATE.rows;
  const dateKeys = monthKey ? fullMonthDateKeys(monthKey) : STATE.dateKeys;
  const running = {}; // unit -> dateKey -> Set(line)
  UNIT_ORDER.forEach(u=> running[u] = {});
  dateKeys.forEach(dk=> UNIT_ORDER.forEach(u=> running[u][dk] = new Set()));

  rows.forEach(row=>{
    if(!row.line) return;
    dateKeys.forEach(dk=>{
      // count a line as running on a day only if that day's SAH > 0
      // (Plan Qty for that date x SMV / 60) — not just qty being non-zero
      const daySah = (row.daily[dk] || 0) * row.smv / 60;
      if(daySah > 0) running[row.unit][dk].add(row.line);
    });
  });

  const counts = {}; // unit -> dateKey -> n
  UNIT_ORDER.forEach(u=>{
    counts[u] = {};
    dateKeys.forEach(dk=> counts[u][dk] = running[u][dk].size);
  });

  function groupSum(units, dk){ return units.reduce((s,u)=> s + counts[u][dk], 0); }

  const b1units = UNIT_ORDER.filter(u=>UNIT_GROUP[u]==='B1');
  const b2units = UNIT_ORDER.filter(u=>UNIT_GROUP[u]==='B2');

  const out = { dateKeys, unitRows: [], groupRows: {} };
  UNIT_ORDER.forEach(u=>{
    out.unitRows.push({ key:u, label:UNIT_LABEL[u], values: dateKeys.map(dk=>counts[u][dk]) });
  });

  const b1cap = b1units.reduce((s,u)=> s + (STATE.capacity[u]||0), 0);
  const b2cap = b2units.reduce((s,u)=> s + (STATE.capacity[u]||0), 0);

  out.b1Total   = dateKeys.map(dk=> groupSum(b1units, dk));
  out.b1Idle    = out.b1Total.map(v=> v - b1cap);
  out.b2Total   = dateKeys.map(dk=> groupSum(b2units, dk));
  out.b2Idle    = out.b2Total.map(v=> v - b2cap);
  out.grandTotal= dateKeys.map((dk,i)=> out.b1Total[i] + out.b2Total[i]);

  return out;
}

/* ============================================================
   REPORT: CHANGE OVER
============================================================ */
function computeChangeOver(){
  const {rows, dateKeys, dateLabels} = STATE;

  // group each line's rows together (all styles that ever ran on it)
  const byUnitLineRows = {};
  UNIT_ORDER.forEach(u=> byUnitLineRows[u] = {});
  rows.forEach(row=>{
    if(!row.line || !row.styleRef) return;
    (byUnitLineRows[row.unit][row.line] = byUnitLineRows[row.unit][row.line] || []).push(row);
  });

  const result = {}; // unit -> [{line, teamNo, runningStyle, changeovers:{dateKey:label}}]
  const dailyCount = {}; // unit -> dateKey -> count
  UNIT_ORDER.forEach(u=> dailyCount[u] = {});
  dateKeys.forEach(dk=> UNIT_ORDER.forEach(u=> dailyCount[u][dk]=0));

  const label = run => {
    const code = STATE.buyerMap[run.buyer] || run.buyer || '';
    const head = run.styleRef + (run.type? ' · '+run.type : '') + (code? ' ('+code+')' : '');
    const smvTxt = run.smv ? 'SMV ' + Math.round(run.smv) : '';
    const qtyTxt = run.planQty ? 'Plan Qty ' + fmt(run.planQty) : '';
    const meta = [smvTxt, qtyTxt].filter(Boolean).join(' · ');
    return meta ? head + '\n' + meta : head;
  };

  UNIT_ORDER.forEach(u=>{
    const lines = Object.keys(byUnitLineRows[u]).sort((a,b)=> a.localeCompare(b, undefined, {numeric:true}));
    const unitRows = [];
    lines.forEach((line, idx)=>{
      const lineRows = byUnitLineRows[u][line];

      // Two kinds of run make up this line's changeover timeline:
      //  - DOMINANT runs: each day, whichever style has the biggest qty that day is the
      //    line's "running style" that day; a run is a stretch of consecutive such days
      //    with the same style. This is what actually flips A -> B -> A when the line
      //    hands over TO another style and then genuinely hands back — the switch is
      //    driven by which style dominates each day, not by a style's qty hitting zero
      //    (the outgoing style can keep a little residual qty through the handover
      //    without that blocking the "handed back" run from being recognised later).
      //  - MINOR runs: a style that never once has the day's biggest qty (a small side
      //    batch running alongside a bigger style, say) would never appear in the
      //    dominant sequence at all and used to vanish from the report entirely. Every
      //    such style still gets its own run(s), built from its own contiguous days of
      //    activity, and is merged into the timeline in start-day order.
      // Either way, a run's Plan Qty always equals that style's own real pieces — never
      // reduced just because another style also had qty the same day.
      const dateIndex = {}; dateKeys.forEach((dk,i)=>{ dateIndex[dk] = i; });
      const styleDayQty = {}; // styleRef -> dateKey -> qty (this style's own pieces that day)
      lineRows.forEach(r=>{
        if(!styleDayQty[r.styleRef]) styleDayQty[r.styleRef] = {};
        dateKeys.forEach(dk=>{
          const q = r.daily[dk] || 0;
          if(q>0) styleDayQty[r.styleRef][dk] = (styleDayQty[r.styleRef][dk]||0) + q;
        });
      });

      // day-by-day winner (dominant style) → dominant runs
      const dayWinner = {};
      const lineActiveDays = dateKeys.filter(dk=>{
        let best=null;
        Object.keys(styleDayQty).forEach(sref=>{
          const q = styleDayQty[sref][dk] || 0;
          if(q>0 && (!best || q > styleDayQty[best][dk])) best = sref;
        });
        if(best){ dayWinner[dk] = best; return true; }
        return false;
      });
      if(!lineActiveDays.length) return;

      const runs = [];
      let cur = null;
      lineActiveDays.forEach(dk=>{
        const style = dayWinner[dk];
        if(!cur || cur.styleRef !== style){ cur = { styleRef: style, firstDay: dk, lastDay: dk }; runs.push(cur); }
        else cur.lastDay = dk;
      });

      // dominant runs' Plan Qty: attribute each of this style's own days to whichever of
      // ITS OWN runs is chronologically closest (0 = falls inside that run's own window),
      // so a changeover handover day — where the losing side still has real leftover qty —
      // still counts fully, and a style with two separate dominant runs (A -> B -> A) gets
      // each of its days correctly split between its two runs by nearest-run distance.
      const runsByStyle = {};
      runs.forEach(r=> (runsByStyle[r.styleRef] = runsByStyle[r.styleRef] || []).push(r));
      Object.keys(runsByStyle).forEach(styleRef=>{
        const styleRuns = runsByStyle[styleRef];
        const qtyMap = styleDayQty[styleRef] || {};
        Object.keys(qtyMap).forEach(dk=>{
          const di = dateIndex[dk];
          let best = styleRuns[0], bestDist = Infinity;
          styleRuns.forEach(run=>{
            const fi = dateIndex[run.firstDay], li = dateIndex[run.lastDay];
            const dist = di < fi ? (fi - di) : (di > li ? (di - li) : 0);
            if(dist < bestDist){ bestDist = dist; best = run; }
          });
          best.planQty = (best.planQty||0) + qtyMap[dk];
        });
      });

      // minor runs: any style that never won a single day gets its own run(s), built the
      // same way dominant runs are (contiguous stretches of the line's active days where
      // this style itself has qty), with an exact, unambiguous window sum for Plan Qty.
      Object.keys(styleDayQty).forEach(styleRef=>{
        if(runsByStyle[styleRef]) return; // already covered as a dominant run
        const qtyMap = styleDayQty[styleRef];
        let mcur = null;
        lineActiveDays.forEach(dk=>{
          if(qtyMap[dk] > 0){
            if(!mcur){ mcur = { styleRef, firstDay: dk, lastDay: dk }; runs.push(mcur); }
            else mcur.lastDay = dk;
          } else {
            mcur = null;
          }
        });
      });
      runs.forEach(run=>{
        if(run.planQty !== undefined) return; // dominant run, already filled above
        const qtyMap = styleDayQty[run.styleRef];
        const rangeDates = dateKeys.slice(dateIndex[run.firstDay], dateIndex[run.lastDay]+1);
        run.planQty = rangeDates.reduce((s,dk)=> s + (qtyMap[dk]||0), 0);
      });

      // chronological order across BOTH kinds of run; same start day → bigger run leads
      runs.sort((a,b)=>{
        const d = dateIndex[a.firstDay] - dateIndex[b.firstDay];
        return d || (b.planQty - a.planQty);
      });

      // metadata (SMV, buyer, type) for every run
      runs.forEach(run=>{
        let smv=0, buyer='', type='';
        lineRows.forEach(r=>{
          if(r.styleRef !== run.styleRef) return;
          if(!smv) smv = r.smv;
          if(!buyer) buyer = r.buyer;
          if(!type) type = r.type;
        });
        run.smv = smv; run.buyer = buyer; run.type = type;
      });

      const changeovers = {};
      runs.slice(1).forEach(run=>{
        const lab = label(run);
        changeovers[run.firstDay] = changeovers[run.firstDay] ? changeovers[run.firstDay]+'\n'+lab : lab;
        dailyCount[u][run.firstDay] = (dailyCount[u][run.firstDay]||0) + 1;
      });

      // full run list retained (in addition to the changeovers map above) purely so the
      // calendar view can paint every day's running style, not just the changeover days —
      // no change to how changeovers/runningStyle themselves are computed.
      const runsForCalendar = runs.map(r=>({ styleRef: r.styleRef, firstDay: r.firstDay, lastDay: r.lastDay, planQty: r.planQty, smv: r.smv, buyer: r.buyer }));

      // Per-day breakdown of EVERY style with real qty that day (not just the day's
      // dominant/"winning" style) — a handover day can genuinely have two styles running
      // at once (the outgoing style's leftover pieces alongside the incoming style), and
      // the calendar needs to show both, not just the one the dominant-run logic picked.
      const dailyStyles = {};
      dateKeys.forEach(dk=>{
        const list = [];
        Object.keys(styleDayQty).forEach(sref=>{
          const q = styleDayQty[sref][dk] || 0;
          if(q>0) list.push({ styleRef: sref, qty: q });
        });
        if(list.length) dailyStyles[dk] = list.sort((a,b)=> b.qty - a.qty);
      });

      unitRows.push({ line, teamNo: lineTeamNo(line), runningStyle: label(runs[0]), changeovers, runs: runsForCalendar, dailyStyles });
    });
    result[u] = unitRows;
  });

  return { byUnit: result, dailyCount, dateKeys, dateLabels };
}

/* ============================================================
   REPORT: PLAN SUMMARY
============================================================ */
function computePlanSummary(){
  const {rows, dateKeys} = STATE;
  const pcs = {}, sah = {}, hourManpower = {};
  UNIT_ORDER.forEach(u=>{ pcs[u]={}; sah[u]={}; hourManpower[u]={}; dateKeys.forEach(dk=>{ pcs[u][dk]=0; sah[u][dk]=0; hourManpower[u][dk]=new Set(); }); });

  const lineManpower = {}; // unit -> line -> manpower (constant)
  UNIT_ORDER.forEach(u=> lineManpower[u] = {});

  rows.forEach(row=>{
    if(row.line && !(row.line in lineManpower[row.unit])) lineManpower[row.unit][row.line] = row.manpower;
    dateKeys.forEach(dk=>{
      const q = row.daily[dk] || 0;
      if(q>0){
        pcs[row.unit][dk] += q;
        sah[row.unit][dk] += (q * row.smv) / 60;
        if(row.line) hourManpower[row.unit][dk].add(row.line);
      }
    });
  });

  // Available Hour = Machine HR, straight from the plan's own per-line recap row (the
  // same number Line Detail shows) — not a calculated capacity (manpower x shift hours).
  // Summed across every line the unit has, for every day the plan gives that line an
  // hours figure — including a day the line logs hours (setup, changeover, idle) with
  // zero pieces produced, which a "PCS > 0 that day" line list would otherwise miss.
  // Only falls back to the manpower x shift-hours calculation where the plan's recap
  // block doesn't cover a line/day at all.
  const hour = {};
  UNIT_ORDER.forEach(u=>{
    hour[u] = {};
    dateKeys.forEach(dk=>{
      let h = 0;
      const lines = new Set(hourManpower[u][dk]); // lines with real output that day
      const mhForDay = STATE.machineHourDirect[u] || {};
      Object.keys(mhForDay).forEach(line=>{ if(mhForDay[line][dk] !== undefined) lines.add(line); });
      lines.forEach(line=>{
        const mh = mhForDay[line] && mhForDay[line][dk];
        h += (mh !== undefined) ? mh : (lineManpower[u][line]||0) * (UNIT_SHIFT_HOURS[u]||10);
      });
      hour[u][dk] = h;
    });
  });

  function groupAgg(units, metric, dk){ return units.reduce((s,u)=> s + metric[u][dk], 0); }
  const b1units = UNIT_ORDER.filter(u=>UNIT_GROUP[u]==='B1');
  const b2units = UNIT_ORDER.filter(u=>UNIT_GROUP[u]==='B2');

  return { pcs, sah, hour, dateKeys, b1units, b2units, groupAgg };
}

/* ============================================================
   REPORT: LINE DETAIL (Man-power / Man Hour / SAH / PCS, per line per day)
============================================================ */
function computeLineDetail(){
  const {rows, dateKeys} = STATE;
  const byUnit = {}; // unit -> line -> { manpower, sah:{dk}, pcs:{dk}, machineHour:{dk} } — straight from the plan
  UNIT_ORDER.forEach(u=> byUnit[u] = {});

  rows.forEach(row=>{
    if(!row.line) return;
    if(!byUnit[row.unit][row.line]){
      byUnit[row.unit][row.line] = { manpower: row.manpower, sah:{}, pcs:{}, machineHour:{} };
    }
    const rec = byUnit[row.unit][row.line];
    dateKeys.forEach(dk=>{
      const qty = row.daily[dk] || 0;
      const daySah = qty * row.smv / 60;
      rec.pcs[dk] = (rec.pcs[dk]||0) + qty;
      rec.sah[dk] = (rec.sah[dk]||0) + daySah; // fallback if the plan carries no recap row for this line
    });
  });

  // Prefer the plan's OWN per-line SAH / Machine Hour recap rows when they exist — no
  // calculation, just the numbers the plan already has for that line, that date.
  UNIT_ORDER.forEach(u=>{
    Object.keys(byUnit[u]).forEach(line=>{
      const rec = byUnit[u][line];
      const sahDirect = STATE.sahDirect[u] && STATE.sahDirect[u][line];
      if(sahDirect){
        dateKeys.forEach(dk=>{ if(sahDirect[dk] !== undefined) rec.sah[dk] = sahDirect[dk]; });
      }
      const mhDirect = STATE.machineHourDirect[u] && STATE.machineHourDirect[u][line];
      dateKeys.forEach(dk=>{ rec.machineHour[dk] = mhDirect && mhDirect[dk] !== undefined ? mhDirect[dk] : 0; });
    });
  });

  // Working Hour = that line's Machine Hour that date ÷ that line's Man-power
  UNIT_ORDER.forEach(u=>{
    Object.values(byUnit[u]).forEach(rec=>{
      rec.workinghour = {};
      dateKeys.forEach(dk=>{
        rec.workinghour[dk] = rec.manpower ? (rec.machineHour[dk]||0) / rec.manpower : 0;
      });
    });
  });

  return { byUnit, dateKeys };
}

/* ============================================================
   RENDER: UPLOAD / KPIs
============================================================ */
function renderKpis(){
  const {rows, dateKeys} = STATE;
  const lineCount = new Set(rows.filter(r=>r.line).map(r=> r.unit+'|'+r.line)).size;
  const buyerCount = new Set(rows.map(r=>r.buyer).filter(Boolean)).size;
  let totalPcs = 0, totalSah = 0;
  rows.forEach(r=> dateKeys.forEach(dk=>{ const q = r.daily[dk]||0; totalPcs += q; totalSah += q*r.smv/60; }));

  document.getElementById('summarySub').textContent =
    `${dateKeys.length} days (${dateShort(STATE.dateLabels[dateKeys[0]])} – ${dateShort(STATE.dateLabels[dateKeys[dateKeys.length-1]])}) · ${rows.length} order rows`;

  const kpis = [
    ['Active lines', fmt(lineCount)],
    ['Style rows', fmt(rows.length)],
    ['Buyers', fmt(buyerCount)],
    ['Plan qty (month)', fmt(totalPcs)],
    ['Plan SAH (month)', fmt(totalSah)],
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(([l,v])=>
    `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
  document.getElementById('summaryCard').style.display = 'block';
}

/* ============================================================
   RENDER: SETTINGS
============================================================ */
function renderSettings(){
  const capGrid = document.getElementById('capacityGrid');
  capGrid.innerHTML = UNIT_ORDER.map(u=>
    `<div class="field"><label>${UNIT_LABEL[u]} — total lines</label>
     <input type="number" min="0" data-unit="${u}" class="capInput" value="${STATE.capacity[u]}"></div>`
  ).join('');

  const buyers = Array.from(new Set(STATE.rows.map(r=>r.buyer).filter(Boolean))).sort();
  const buyerGrid = document.getElementById('buyerMapGrid');
  buyerGrid.innerHTML = buyers.map(b=>
    `<div class="buyerrow"><div class="orig">${b}</div>
     <input type="text" data-buyer="${b}" class="buyerInput" value="${STATE.buyerMap[b] !== undefined ? STATE.buyerMap[b] : b}"></div>`
  ).join('');
}

function readSettingsFromForm(){
  document.querySelectorAll('.capInput').forEach(inp=>{
    STATE.capacity[inp.dataset.unit] = num(inp.value);
  });
  document.querySelectorAll('.buyerInput').forEach(inp=>{
    STATE.buyerMap[inp.dataset.buyer] = inp.value;
  });
}

/* ============================================================
   RENDER: RUN LINES TABLE
============================================================ */
function populateRlMonthSelect(){
  const sel = document.getElementById('rlMonthSelect');
  const months = availableMonths();
  sel.innerHTML = months.map(m=> `<option value="${m}">${monthLabel(m)}</option>`).join('');
}

function renderRunLines(){
  const monthKey = document.getElementById('rlMonthSelect').value || availableMonths()[0];
  const rl = computeRunLines(monthKey);
  STATE.computed.runlines = rl;
  const dk = rl.dateKeys;
  const isOffArr = dk.map(d=> STATE.dateLabels[d].getDay() === 5); // Friday is the weekly off day
  let html = '<table><thead><tr><th>Unit</th>' + dk.map((d,i)=>`<th class="${isOffArr[i]?'off-col':''}">${dateShort(STATE.dateLabels[d])}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';

  const b1units = UNIT_ORDER.filter(u=>UNIT_GROUP[u]==='B1');
  const b2units = UNIT_ORDER.filter(u=>UNIT_GROUP[u]==='B2');

  function row(label, values, cls){
    const total = values.reduce((s,v)=>s+v,0);
    return `<tr class="${cls||''}"><td>${label}</td>${values.map((v,i)=>`<td class="${isOffArr[i]?'off-col':''}">${fmt(v)}</td>`).join('')}<td>${fmt(total)}</td></tr>`;
  }

  b1units.forEach(u=>{
    const r = rl.unitRows.find(x=>x.key===u);
    html += row(r.label, r.values);
  });
  html += row('Birichina-1 (B1 total)', rl.b1Total, 'grouprow');
  html += row('Idle Lines (B1)', rl.b1Idle, 'idlerow');

  b2units.forEach(u=>{
    const r = rl.unitRows.find(x=>x.key===u);
    html += row(r.label, r.values);
  });
  html += row('Birichina-2 (B2 total)', rl.b2Total, 'grouprow');
  html += row('Idle Lines (B2)', rl.b2Idle, 'idlerow');
  html += row('Birichina Total', rl.grandTotal, 'grouprow');

  html += '</tbody></table>';
  document.getElementById('runlinesTable').innerHTML = html;
}

/* ============================================================
   RENDER: CHANGE OVER TABLE
============================================================ */
function populateCoUnitSelect(){
  const sel = document.getElementById('coUnitSelect');
  sel.innerHTML = UNIT_ORDER.map(u=>`<option value="${u}">${UNIT_LABEL[u]}</option>`).join('');
}
// Compact "63.7k" style number for the calendar cells. Purely display — the underlying
// planQty value being formatted is untouched.
function fmtK(n){
  if(!n) return '';
  if(n>=1000){
    return Math.round(n/1000) + 'k';
  }
  return fmt(n);
}
const CO_PALETTE_SIZE = 6; // must match .co-c0 .. .co-c5 in CSS

function renderChangeOver(){
  const co = computeChangeOver();
  STATE.computed.changeover = co;
  const unit = document.getElementById('coUnitSelect').value || UNIT_ORDER[0];
  const dk = co.dateKeys;
  const rowsForUnit = co.byUnit[unit];

  if(!rowsForUnit || !rowsForUnit.length){
    document.getElementById('changeoverTable').innerHTML = '<div class="empty">No style data found for this unit.</div>';
    return;
  }

  // Header: day number on top, short weekday below; Saturday (weekly off) column greyed.
  let html = '<table><thead><tr><th class="co-linecol">Line</th>' +
    dk.map(d=>{
      const date = co.dateLabels[d];
      const isOff = date.getDay() === 5; // Friday is the weekly off day
      const dayName = date.toLocaleDateString('en-US', {weekday:'short'}).slice(0,2);
      return `<th class="${isOff?'co-off':''}"><span class="daynum">${date.getDate()}</span><span class="dayname">${dayName}</span></th>`;
    }).join('') + '</tr></thead><tbody>';

  rowsForUnit.forEach(r=>{
    const coCount = dk.filter(d=> r.changeovers[d]).length;

    // expand this line's runs into a per-day lookup so every day in the range shows
    // its running style, not just the day a changeover happened
    const dayInfo = {};
    (r.runs || []).forEach((run, idx)=>{
      const fi = dk.indexOf(run.firstDay), li = dk.indexOf(run.lastDay);
      if(fi < 0 || li < 0) return;
      for(let i=fi; i<=li; i++) dayInfo[dk[i]] = { run, color: idx % CO_PALETTE_SIZE };
    });

    html += `<tr><td class="co-linecol"><span class="co-linename">${r.line}</span><span class="co-chgcount">${fmt(coCount)} chg</span></td>` +
      dk.map(d=>{
        const date = co.dateLabels[d];
        const isOff = date.getDay() === 5; // Friday is the weekly off day
        const info = dayInfo[d];
        if(info){
          // a handover day can have another style with real leftover/starting qty
          // running alongside the day's dominant style — show it too, don't hide it.
          const others = (r.dailyStyles[d] || []).filter(s => s.styleRef !== info.run.styleRef);
          const extra = others.map(s => `<span class="co-extra">+${s.styleRef} ${fmtK(s.qty)}</span>`).join('');
          const buyerCode = STATE.buyerMap[info.run.buyer] || info.run.buyer || '';
          const smvTxt = info.run.smv ? 'SMV ' + Math.round(info.run.smv) : '';
          const metaBits = [buyerCode, smvTxt].filter(Boolean).join(' · ');
          const meta = metaBits ? `<span class="co-meta">${metaBits}</span>` : '';
          return `<td class="co-day co-c${info.color}"><span class="co-style">${info.run.styleRef}</span>${meta}<span class="co-oq">OQ ${fmtK(info.run.planQty)}</span>${extra}</td>`;
        }
        return `<td class="co-day${isOff?' co-off':''}"></td>`;
      }).join('') + '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('changeoverTable').innerHTML = html;
}

/* ============================================================
   RENDER: PLAN SUMMARY TABLE
============================================================ */
function renderPlanSummary(){
  const ps = computePlanSummary();
  STATE.computed.plansummary = ps;
  const dk = ps.dateKeys;
  const isOffArr = dk.map(d=> STATE.dateLabels[d].getDay() === 5); // Friday is the weekly off day

  let html = '<table><thead><tr><th>Unit / Metric</th>' + dk.map((d,i)=>`<th class="${isOffArr[i]?'off-col':''}">${dateShort(STATE.dateLabels[d])}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';

  function metricRow(label, unit, arr, isEff, cls){
    const total = isEff ? null : arr.reduce((s,v)=>s+v,0);
    return `<tr class="${cls||''}"><td>${label}</td>` +
      arr.map((v,i)=> `<td class="${isOffArr[i]?'off-col':''}">${isEff? pct(v) : fmt(v)}</td>`).join('') +
      `<td>${isEff? '' : fmt(total)}</td></tr>`;
  }

  function unitBlock(u){
    const pcsArr = dk.map(d=> ps.pcs[u][d]);
    const sahArr = dk.map(d=> ps.sah[u][d]);
    const hourArr= dk.map(d=> ps.hour[u][d]);
    const effArr = dk.map((d,i)=> hourArr[i] ? sahArr[i]/hourArr[i] : 0);
    html += metricRow(UNIT_LABEL[u]+' — PCS', u, pcsArr);
    html += metricRow('SAH', u, sahArr);
    html += metricRow('Available Hour', u, hourArr);
    html += metricRow('Efficiency', u, effArr, true);
  }

  function groupBlock(label, units){
    const pcsArr = dk.map(d=> ps.groupAgg(units, ps.pcs, d));
    const sahArr = dk.map(d=> ps.groupAgg(units, ps.sah, d));
    const hourArr= dk.map(d=> ps.groupAgg(units, ps.hour, d));
    const effArr = dk.map((d,i)=> hourArr[i] ? sahArr[i]/hourArr[i] : 0);
    html += metricRow(label+' — PCS', null, pcsArr, false, 'grouprow');
    html += metricRow('SAH', null, sahArr, false, 'grouprow');
    html += metricRow('Available Hour', null, hourArr, false, 'grouprow');
    html += metricRow('Efficiency', null, effArr, true, 'grouprow');
  }

  ps.b1units.forEach(unitBlock);
  groupBlock('Birichina-1 Total', ps.b1units);
  ps.b2units.forEach(unitBlock);
  groupBlock('Birichina-2 Total', ps.b2units);
  groupBlock('Birichina Grand Total', UNIT_ORDER);

  html += '</tbody></table>';
  document.getElementById('plansummaryTable').innerHTML = html;
}

/* ============================================================
   RENDER: LINE DETAIL TABLE
============================================================ */
function populateLdUnitSelect(){
  const sel = document.getElementById('ldUnitSelect');
  sel.innerHTML = UNIT_ORDER.map(u=>`<option value="${u}">${UNIT_LABEL[u]}</option>`).join('');
}
const LD_METRIC_LABEL = { manpower:'Man-power', sah:'SAH', machinehour:'Machine Hour', workinghour:'Working Hour', pcs:'PCS' };
function renderLineDetail(){
  const ld = computeLineDetail();
  STATE.computed.linedetail = ld;
  const unit = document.getElementById('ldUnitSelect').value || UNIT_ORDER[0];
  const metric = document.getElementById('ldMetricSelect').value || 'manpower';
  const dk = ld.dateKeys;
  const lines = Object.keys(ld.byUnit[unit]).sort((a,b)=> a.localeCompare(b, undefined, {numeric:true}));
  const isRate = metric === 'manpower'; // a headcount snapshot isn't meaningful to sum across days
  const isOffArr = dk.map(d=> STATE.dateLabels[d].getDay() === 5); // Friday is the weekly off day

  let html = '<table><thead><tr><th>Line</th>' + dk.map((d,i)=>`<th class="${isOffArr[i]?'off-col':''}">${dateShort(STATE.dateLabels[d])}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';
  const dailyTotals = dk.map(()=>0);
  lines.forEach(line=>{
    const rec = ld.byUnit[unit][line];
    let vals;
    if(metric==='manpower') vals = dk.map(()=> rec.manpower);
    else if(metric==='sah') vals = dk.map(d=> rec.sah[d]||0);
    else if(metric==='machinehour') vals = dk.map(d=> rec.machineHour[d]||0);
    else if(metric==='workinghour') vals = dk.map(d=> rec.workinghour[d]||0);
    else vals = dk.map(d=> rec.pcs[d]||0);
    vals.forEach((v,i)=> dailyTotals[i]+=v);
    const rowTotal = isRate ? '' : fmt(vals.reduce((s,v)=>s+v,0), (metric==='sah'||metric==='workinghour')?1:0);
    const cells = vals.map(v=> fmt(v));
    html += `<tr><td>${line}</td>` + cells.map((v,i)=>`<td class="${isOffArr[i]?'off-col':''}">${v}</td>`).join('') + `<td>${rowTotal}</td></tr>`;
  });
  const grandTotal = isRate ? '' : fmt(dailyTotals.reduce((s,v)=>s+v,0), (metric==='sah'||metric==='workinghour')?1:0);
  html += `<tr class="grouprow"><td>Grand Total</td>` +
    dailyTotals.map((v,i)=> `<td class="${isOffArr[i]?'off-col':''}">${isRate ? '' : fmt(v, (metric==='sah'||metric==='workinghour')?1:0)}</td>`).join('') + `<td>${grandTotal}</td></tr>`;
  html += '</tbody></table>';
  document.getElementById('linedetailTable').innerHTML = html || '<div class="empty">No lines found for this unit.</div>';
}

/* ============================================================
   REGENERATE ALL
============================================================ */
function regenerateAll(){
  renderRunLines();
  renderChangeOver();
  renderPlanSummary();
  renderLineDetail();
}

/* ============================================================
   EXPORTS
============================================================ */
function downloadAoa(sheetsObj, filename){
  const wb = new ExcelJS.Workbook();
  Object.keys(sheetsObj).forEach(name=>{
    const data = sheetsObj[name];
    const ws = wb.addWorksheet(name.substring(0,31), {
      pageSetup: {
        paperSize: 9,          // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,        // fit width to one page, allow multiple pages tall
        margins: { left:0.3, right:0.3, top:0.4, bottom:0.4, header:0.2, footer:0.2 }
      }
    });

    data.forEach(rowArr=> ws.addRow(rowArr));

    // column widths: fit to the longest cell in that column, within sane bounds
    const colCount = data.reduce((m,r)=> Math.max(m, r.length), 0);
    for(let c=1; c<=colCount; c++){
      let maxLen = 8;
      data.forEach(r=>{
        const v = r[c-1];
        if(v===null||v===undefined) return;
        const s = (v instanceof Date) ? dateShort(v) : String(v);
        s.split('\n').forEach(line=>{ maxLen = Math.max(maxLen, line.length); });
      });
      ws.getColumn(c).width = Math.min(Math.max(maxLen+2, 8), 34);
    }

    // Calibri 11 + thin border on every used cell; bold + shaded header row
    ws.eachRow({includeEmpty:false}, (row, rowNum)=>{
      row.eachCell({includeEmpty:true}, cell=>{
        cell.font = { name:'Calibri', size:11, bold: rowNum===1 };
        cell.border = {
          top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'}
        };
        cell.alignment = { vertical:'middle', wrapText:true };
        if(rowNum===1){
          cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFEFEFEF'} };
        }
      });
    });
    ws.views = [{ state:'frozen', ySplit:1 }];
  });

  wb.xlsx.writeBuffer().then(async buf=>{
    const blob = new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    // When running as a published page, use the downloads capability (plain
    // anchor-click downloads are inert there). When run as a local/offline
    // HTML file, fall back to the classic blob+anchor download.
    let handled = false;
    if(window.claude && typeof window.claude.use === 'function'){
      try{
        const downloads = await window.claude.use('downloads');
        if(downloads){
          await downloads.save({ filename, data: blob });
          handled = true;
        }
      }catch(err){
        console.warn('downloads.save failed, falling back to direct download', err);
      }
    }
    if(!handled){
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  });
}

function exportRunLines(){
  const monthKey = document.getElementById('rlMonthSelect').value || availableMonths()[0];
  const rl = computeRunLines(monthKey);
  const dk = rl.dateKeys;
  const header = ['Unit', ...dk.map(d=>dateHeaderLabel(STATE.dateLabels[d])), 'Total'];
  const aoa = [header];
  const b1units = UNIT_ORDER.filter(u=>UNIT_GROUP[u]==='B1');
  const b2units = UNIT_ORDER.filter(u=>UNIT_GROUP[u]==='B2');
  const withTotal = (label, arr) => [label, ...arr, arr.reduce((s,v)=>s+v,0)];
  b1units.forEach(u=> aoa.push(withTotal(UNIT_LABEL[u], rl.unitRows.find(x=>x.key===u).values)));
  aoa.push(withTotal('Birichina-1', rl.b1Total));
  aoa.push(withTotal('Idle Lines', rl.b1Idle));
  b2units.forEach(u=> aoa.push(withTotal(UNIT_LABEL[u], rl.unitRows.find(x=>x.key===u).values)));
  aoa.push(withTotal('Birichina-2', rl.b2Total));
  aoa.push(withTotal('Idle Lines', rl.b2Idle));
  aoa.push(withTotal('Birichina Total', rl.grandTotal));
  downloadAoa({'Run Lines': aoa}, 'Run_Lines_Report.xlsx');
}

function exportChangeOver(){
  const co = STATE.computed.changeover || computeChangeOver();
  const dk = co.dateKeys;
  const sheets = {};

  UNIT_ORDER.forEach(u=>{
    const header = ['Team No', 'Running Style', ...dk.map(d=>dateHeaderLabel(co.dateLabels[d])), 'Total Changeovers'];
    const aoa = [header];
    const dailyTotals = dk.map(()=>0);
    co.byUnit[u].forEach(r=>{
      const coCount = dk.filter(d=> r.changeovers[d]).length;
      dk.forEach((d,i)=>{ if(r.changeovers[d]) dailyTotals[i]++; });
      aoa.push([r.teamNo, r.runningStyle, ...dk.map(d=> r.changeovers[d] || ''), coCount]);
    });
    aoa.push(['Grand Total (changeovers)', '', ...dailyTotals, dailyTotals.reduce((s,v)=>s+v,0)]);
    sheets[u] = aoa;
  });

  const sumHeader = ['Unit', ...dk.map(d=>dateHeaderLabel(co.dateLabels[d])), 'Total'];
  const sumAoa = [sumHeader];
  const unitTotals = dk.map(()=>0);
  UNIT_ORDER.forEach(u=>{
    const vals = dk.map(d=> co.dailyCount[u][d]||0);
    vals.forEach((v,i)=> unitTotals[i]+=v);
    sumAoa.push([UNIT_LABEL[u], ...vals, vals.reduce((s,v)=>s+v,0)]);
  });
  sumAoa.push(['Grand Total', ...unitTotals, unitTotals.reduce((s,v)=>s+v,0)]);
  sheets['B1&B2 Summary'] = sumAoa;

  downloadAoa(sheets, 'Change_Over_Dashboard.xlsx');
}

function exportPlanSummary(){
  const ps = STATE.computed.plansummary || computePlanSummary();
  const dk = ps.dateKeys;
  const header = ['Unit / Metric', ...dk.map(d=>dateHeaderLabel(STATE.dateLabels[d])), 'Total'];
  const aoa = [header];

  function metricRow(label, arr, isEff){
    const total = isEff ? '' : arr.reduce((s,v)=>s+v,0);
    return [label, ...arr, total];
  }
  function unitBlock(u){
    const pcsArr = dk.map(d=> ps.pcs[u][d]);
    const sahArr = dk.map(d=> ps.sah[u][d]);
    const hourArr= dk.map(d=> ps.hour[u][d]);
    const effArr = dk.map((d,i)=> hourArr[i] ? sahArr[i]/hourArr[i] : 0);
    aoa.push(metricRow(UNIT_LABEL[u]+' - PCS', pcsArr));
    aoa.push(metricRow('SAH', sahArr));
    aoa.push(metricRow('Available Hour', hourArr));
    aoa.push(metricRow('Efficiency', effArr, true));
  }
  function groupBlock(label, units){
    const pcsArr = dk.map(d=> ps.groupAgg(units, ps.pcs, d));
    const sahArr = dk.map(d=> ps.groupAgg(units, ps.sah, d));
    const hourArr= dk.map(d=> ps.groupAgg(units, ps.hour, d));
    const effArr = dk.map((d,i)=> hourArr[i] ? sahArr[i]/hourArr[i] : 0);
    aoa.push(metricRow(label+' - PCS', pcsArr));
    aoa.push(metricRow('SAH', sahArr));
    aoa.push(metricRow('Available Hour', hourArr));
    aoa.push(metricRow('Efficiency', effArr, true));
  }
  ps.b1units.forEach(unitBlock);
  groupBlock('Birichina-1 Total', ps.b1units);
  ps.b2units.forEach(unitBlock);
  groupBlock('Birichina-2 Total', ps.b2units);
  groupBlock('Birichina Grand Total', UNIT_ORDER);

  downloadAoa({'Plan Summary': aoa}, 'Plan_Summary_Report.xlsx');
}

function exportLineDetail(){
  const ld = STATE.computed.linedetail || computeLineDetail();
  const dk = ld.dateKeys;
  const sheets = {};
  UNIT_ORDER.forEach(u=>{
    const lines = Object.keys(ld.byUnit[u]).sort((a,b)=> a.localeCompare(b, undefined, {numeric:true}));
    const header = ['Line', ...dk.map(d=>dateHeaderLabel(STATE.dateLabels[d])), 'Total'];
    const aoa = [];
    ['manpower','sah','machinehour','workinghour','pcs'].forEach(metric=>{
      const isRate = metric === 'manpower';
      aoa.push([LD_METRIC_LABEL[metric]]);
      aoa.push(header);
      const dailyTotals = dk.map(()=>0);
      lines.forEach(line=>{
        const rec = ld.byUnit[u][line];
        let vals;
        if(metric==='manpower') vals = dk.map(()=> rec.manpower);
        else if(metric==='sah') vals = dk.map(d=> Math.round((rec.sah[d]||0)*100)/100);
        else if(metric==='machinehour') vals = dk.map(d=> rec.machineHour[d]||0);
        else if(metric==='workinghour') vals = dk.map(d=> Math.round((rec.workinghour[d]||0)*100)/100);
        else vals = dk.map(d=> rec.pcs[d]||0);
        vals.forEach((v,i)=> dailyTotals[i]+=v);
        const rowTotal = isRate ? '' : Math.round(vals.reduce((s,v)=>s+v,0)*100)/100;
        aoa.push([line, ...vals, rowTotal]);
      });
      const grandTotal = isRate ? '' : Math.round(dailyTotals.reduce((s,v)=>s+v,0)*100)/100;
      aoa.push(['Grand Total', ...(isRate ? dailyTotals.map(()=>'') : dailyTotals.map(v=>Math.round(v*100)/100)), grandTotal]);
      aoa.push([]); // spacer row between metric blocks
    });
    sheets[u] = aoa;
  });
  downloadAoa(sheets, 'Line_Detail_Report.xlsx');
}

/* ============================================================
   NAVIGATION
============================================================ */
const TITLES = {
  upload: ['Upload Plan', "Load this month's Sign-off Production Plan to begin."],
  settings: ['Settings', 'Line capacity and buyer short codes.'],
  runlines: ['Run Lines', 'Lines with an active plan, per unit per day.'],
  changeover: ['Change Over Dashboard', 'Style changeovers by line and day.'],
  plansummary: ['Plan Summary', 'PCS, SAH, Available Hour and Efficiency by unit and day.'],
  linedetail: ['Line Detail', 'Man-power, SAH, Machine Hour, Working Hour and PCS, per line per day.']
};

function goTo(view){
  document.querySelectorAll('.navbtn').forEach(b=> b.classList.toggle('active', b.dataset.view===view));
  document.querySelectorAll('.view').forEach(v=> v.classList.toggle('active', v.id === 'view-'+view));
  document.getElementById('pageTitle').textContent = TITLES[view][0];
  document.getElementById('pageSub').textContent = TITLES[view][1];
}
document.querySelectorAll('.navbtn').forEach(btn=>{
  btn.addEventListener('click', ()=>{ if(!btn.disabled) goTo(btn.dataset.view); });
});

/* ============================================================
   FILE HANDLING
============================================================ */
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');

dropzone.addEventListener('dragover', e=>{ e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', ()=> dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', e=>{
  e.preventDefault(); dropzone.classList.remove('drag');
  if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e=>{
  if(e.target.files.length) handleFile(e.target.files[0]);
});

function applyParsedData(parsed, displayName, opts){
  STATE.rows = parsed.rows;
  STATE.dateKeys = parsed.dateKeys;
  STATE.dateLabels = parsed.dateLabels;
  STATE.sahDirect = parsed.sahDirect;
  STATE.machineHourDirect = parsed.machineHourDirect;

  // default capacity = distinct lines seen per unit this month
  STATE.capacity = {};
  UNIT_ORDER.forEach(u=>{
    STATE.capacity[u] = new Set(parsed.rows.filter(r=>r.unit===u && r.line).map(r=>r.line)).size;
  });
  // default buyer map
  STATE.buyerMap = {};
  Array.from(new Set(parsed.rows.map(r=>r.buyer).filter(Boolean))).forEach(b=>{
    STATE.buyerMap[b] = DEFAULT_BUYER_MAP[b] || b;
  });
  // settings that came with a shared file win over the defaults
  if(opts && opts.capacity) Object.keys(opts.capacity).forEach(u=>{ if(UNIT_ORDER.includes(u)) STATE.capacity[u] = opts.capacity[u]; });
  if(opts && opts.buyerMap) Object.keys(opts.buyerMap).forEach(b=>{ STATE.buyerMap[b] = opts.buyerMap[b]; });

  renderKpis();
  renderSettings();
  populateRlMonthSelect();
  populateCoUnitSelect();
  populateLdUnitSelect();
  regenerateAll();

  ['navSettings','navRunlines','navChangeover','navPlansummary','navLinedetail'].forEach(id=>{
    document.getElementById(id).disabled = false;
  });
  document.getElementById('statusPill').textContent = displayName;
  document.getElementById('statusPill').classList.add('ok');
  document.getElementById('shareCard').style.display = '';
  document.getElementById('shareMsg').textContent = '';
}

let CURRENT_WB = null, CURRENT_FILE = '', CURRENT_SHEETS = [];
let READONLY = false;

/* ============================================================
   SHAREABLE FILE  (one HTML file with the plan data inside)
============================================================ */
function keyToDate(k){ const p = String(k).split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); }

function buildSnapshotPayload(){
  try{ readSettingsFromForm(); }catch(e){}
  return {
    v: 1,
    shared: true,
    fileName: CURRENT_FILE || document.getElementById('statusPill').textContent,
    savedAt: new Date().toISOString(),
    dateKeys: STATE.dateKeys,
    rows: STATE.rows.map(r=>({
      unit: r.unit, line: r.line, manpower: r.manpower, styleRef: r.styleRef, article: r.article,
      buyer: r.buyer, type: r.type, smv: r.smv, odrQty: r.odrQty,
      psd: r.psd ? dateKey(r.psd) : null,      // date parts only, so every time zone shows the same day
      daily: r.daily
    })),
    sahDirect: STATE.sahDirect,
    machineHourDirect: STATE.machineHourDirect,
    capacity: STATE.capacity,
    buyerMap: STATE.buyerMap
  };
}
function makeShareableHtml(){
  const json = JSON.stringify(buildSnapshotPayload()).replace(/</g, '\\u003c');
  const re = /(<script id="snapshotData" type="application\/json">)[\s\S]*?(<\/script>)/;
  if(!re.test(PRISTINE_HTML)) throw new Error('Could not prepare the shareable file.');
  return PRISTINE_HTML.replace(re, (m, a, b)=> a + json + b);
}
function downloadShareable(){
  const msg = document.getElementById('shareMsg');
  try{
    if(!STATE.rows.length){ msg.textContent = 'Load a plan first.'; return; }
    const html = makeShareableHtml();
    const mk = (STATE.dateKeys[0] || '').slice(0,7) || 'plan';
    const d = new Date();
    const stamp = d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'_'+pad(d.getHours())+pad(d.getMinutes());
    const name = 'Birichina_Reports_' + mk + '_' + stamp + '.html';
    const blob = new Blob([html], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(a.href), 4000);
    msg.textContent = 'Saved ' + name + ' (' + Math.round(html.length/1048576) + ' MB). Send this file — it opens on any computer or phone browser with this plan already loaded.';
  }catch(err){
    console.error(err);
    msg.textContent = 'Could not create the shareable file: ' + err.message;
  }
}
// Locks the app into a view-only state: no upload, no editing, no downloads/export.
// Every "Download shareable file" always produces a locked copy — this only runs
// when the app was opened from one of those shared files.
function enableReadOnlyMode(){
  READONLY = true;

  const fi = document.getElementById('fileInput'); if(fi) fi.disabled = true;
  const dz = document.getElementById('dropzone'); if(dz) dz.style.display = 'none';
  const mc = document.getElementById('mappingCard'); if(mc) mc.style.display = 'none';
  const sc = document.getElementById('shareCard'); if(sc) sc.style.display = 'none';

  // Every button that edits, uploads, exports, or re-shares gets hidden.
  ['dlRunlines','dlChangeover','dlPlansummary','dlLinedetail','shareBtn','applySettingsBtn','applyMappingBtn'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.disabled = true; el.style.display = 'none'; }
  });

  // Settings values remain visible but can no longer be changed.
  document.querySelectorAll('.capInput,.buyerInput').forEach(el=> el.disabled = true);

  const pill = document.getElementById('statusPill');
  if(pill){
    const badge = document.createElement('span');
    badge.textContent = ' · View only';
    badge.style.opacity = '0.85';
    pill.appendChild(badge);
  }
}

function restoreSnapshot(snap){
  const dateLabels = {};
  snap.dateKeys.forEach(k=>{ dateLabels[k] = keyToDate(k); });
  const rows = snap.rows.map(r=> Object.assign({}, r, { psd: r.psd ? keyToDate(r.psd) : null }));
  CURRENT_FILE = snap.fileName || 'Shared plan';
  applyParsedData(
    { rows, dateKeys: snap.dateKeys, dateLabels, sahDirect: snap.sahDirect, machineHourDirect: snap.machineHourDirect },
    CURRENT_FILE,
    { capacity: snap.capacity, buyerMap: snap.buyerMap }
  );
  renderSettings();
  const when = new Date(snap.savedAt).toLocaleString();
  if(snap.shared){
    document.getElementById('uploadMsg').innerHTML = '<div class="hint">View-only shared report. Plan: <b>'+esc(CURRENT_FILE)+'</b> · data saved '+esc(when)+'. Uploading, editing and downloading are turned off in this file.</div>';
    document.getElementById('shareMsg').textContent = '';
    enableReadOnlyMode();
  } else {
    document.getElementById('uploadMsg').innerHTML = '<div class="hint">Opened from a shared file. Plan: <b>'+esc(CURRENT_FILE)+'</b> · data saved '+esc(when)+'. Upload a newer plan here to replace it.</div>';
    document.getElementById('shareMsg').textContent = 'This copy shows the plan as it was on ' + when + '.';
  }
  goTo('plansummary');
}

// Parse the workbook with a sheet -> unit map, and load the result into the app.
// Returns true when at least one plan row was found.
function loadWithMap(map, notes){
  const msg = document.getElementById('uploadMsg');
  const parsed = parseWorkbook(CURRENT_WB, map);
  if(!parsed.rows.length){
    msg.innerHTML = '<div class="warn">No plan rows were found in the sheets you picked. Check the sheet mapping below.</div>';
    return false;
  }
  applyParsedData(parsed, CURRENT_FILE);
  let html = '<div class="hint">Loaded successfully — reports are ready in the tabs above.<br>Sheets read: ' + describeMap(map, CURRENT_SHEETS) + '</div>';
  if(parsed.skippedNoUnit){
    notes = (notes || []).concat(['<b>' + parsed.skippedNoUnit + '</b> order row(s) were skipped because their unit could not be worked out from the Unit column or the line name.']);
  }
  (notes || []).forEach(n=>{ html += '<div class="warn">'+n+'</div>'; });
  msg.innerHTML = html;
  return true;
}

function handleFile(file){
  const msg = document.getElementById('uploadMsg');
  msg.innerHTML = '<div class="hint">Reading '+esc(file.name)+'…</div>';
  const reader = new FileReader();
  reader.onload = evt=>{
    try{
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, {type:'array', cellDates:true});
      Object.keys(SHEET_CACHE).forEach(k=> delete SHEET_CACHE[k]);
      CURRENT_WB = wb; CURRENT_FILE = file.name;
      CURRENT_SHEETS = detectPlanSheets(wb);
      const validSheets = CURRENT_SHEETS.filter(sh=>sh.valid);
      if(!validSheets.length){
        document.getElementById('mappingCard').style.display = 'none';
        msg.innerHTML = '<div class="warn">Could not find any plan sheet with Line and Style Ref. / Buyer columns in this file. Sheets found: '
          + wb.SheetNames.map(esc).join(', ') + '.</div>';
        return;
      }
      const prop = proposeMapping(CURRENT_SHEETS);
      renderMappingCard(CURRENT_SHEETS, prop.map);
      const notes = [];
      if(prop.unmatched.length){
        notes.push('These plan sheets were not used (no unit matched): <b>' + prop.unmatched.map(esc).join(', ') +
                   '</b>. If one of them should be read, pick its unit in <b>Sheet mapping</b> below and click Apply.');
      }
      if(prop.missing.length){
        notes.push('No sheet was matched for: <b>' + prop.missing.map(u=>esc(UNIT_LABEL[u])).join(', ') +
                   '</b>. Reports only include the units that were matched.' +
                   (prop.unmatched.length ? '' : ' If this unit has a sheet with a different name, pick it in <b>Sheet mapping</b> below.'));
      }
      if(!Object.keys(prop.map).length){
        msg.innerHTML = '<div class="warn">Plan sheets were found but none could be matched to a unit automatically. Pick a unit for each sheet in <b>Sheet mapping</b> below and click Apply.' +
          (STATE.rows.length ? ' The reports still show the previous file until you apply.' : '') + '</div>';
        return;
      }
      loadWithMap(prop.map, notes);
    }catch(err){
      console.error(err);
      msg.innerHTML = '<div class="warn">Could not read this file: '+esc(err.message)+'</div>';
    }
  };
  reader.readAsArrayBuffer(file);
}

function applyMappingFromCard(){
  const msg = document.getElementById('uploadMsg');
  if(!CURRENT_WB){ msg.innerHTML = '<div class="warn">Load a plan file first.</div>'; return; }
  const map = readMappingFromCard();
  const used = {};
  let dup = null;
  Object.keys(map).forEach(sh=>{ if(used[map[sh]]) dup = map[sh]; used[map[sh]] = sh; });
  if(map && Object.values(map).includes('*') && Object.keys(map).length > 1){
    msg.innerHTML = '<div class="warn">A sheet set to <b>All units</b> already contains every unit. Set the other sheets to “skip”, or set this one to a single unit.</div>';
    return;
  }
  if(dup){
    msg.innerHTML = '<div class="warn">Two sheets are set to <b>'+esc(UNIT_LABEL[dup]||dup)+'</b>. Each unit can use only one sheet.</div>';
    return;
  }
  if(!Object.keys(map).length){
    msg.innerHTML = '<div class="warn">Pick a unit for at least one sheet.</div>';
    return;
  }
  // remember the choices for the next file that uses the same sheet names
  const saved = loadSavedMap();
  document.querySelectorAll('#mappingGrid select').forEach(sel=>{
    if(sel.value) saved[sel.dataset.sheet] = sel.value; else delete saved[sel.dataset.sheet];
  });
  saveMap(saved);
  const notes = [];
  const covered = {};
  Object.keys(map).forEach(sh=>{
    if(map[sh]==='*'){ const info = CURRENT_SHEETS.find(x=>x.name===sh); (info?info.units:[]).forEach(u=>covered[u]=1); }
    else covered[map[sh]] = 1;
  });
  const missing = UNIT_ORDER.filter(u=> !covered[u]);
  if(missing.length){
    notes.push('No sheet chosen for: <b>' + missing.map(u=>esc(UNIT_LABEL[u])).join(', ') + '</b>. Reports only include the units that have a sheet.');
  }
  loadWithMap(map, notes);
}


/* ============================================================
   EVENT WIRING
============================================================ */
document.getElementById('applySettingsBtn').addEventListener('click', ()=>{
  readSettingsFromForm();
  regenerateAll();
});
document.getElementById('applyMappingBtn').addEventListener('click', applyMappingFromCard);
document.getElementById('shareBtn').addEventListener('click', downloadShareable);
document.getElementById('rlMonthSelect').addEventListener('change', renderRunLines);
document.getElementById('coUnitSelect').addEventListener('change', renderChangeOver);
document.getElementById('ldUnitSelect').addEventListener('change', renderLineDetail);
document.getElementById('ldMetricSelect').addEventListener('change', renderLineDetail);

document.getElementById('dlRunlines').addEventListener('click', exportRunLines);
document.getElementById('dlChangeover').addEventListener('click', exportChangeOver);
document.getElementById('dlPlansummary').addEventListener('click', exportPlanSummary);
document.getElementById('dlLinedetail').addEventListener('click', exportLineDetail);

/* open straight into the data when this is a shared file */
(function(){
  const el = document.getElementById('snapshotData');
  const t = el ? el.textContent.trim() : '';
  if(!t) return;
  try{ restoreSnapshot(JSON.parse(t)); }
  catch(err){
    console.error(err);
    document.getElementById('uploadMsg').innerHTML = '<div class="warn">This shared file could not be opened: '+esc(err.message)+'</div>';
  }
})();
</script>