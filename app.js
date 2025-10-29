/* ================================================================
   Student: Sri Bhargava Dendukuri (SriBhargava_Dendukuri@student.uml.edu)
  Course: COMP 4610 – GUI I, HW3
  Repo: https://github.com/<username>/hw3-dynamic-table
  Live: https://<username>.github.io/hw3-dynamic-table/
   - I’m keeping everything in plain JS. No libs.
   - I validate as integers, normalize ranges, and cap total cells.
   - I render with a DocumentFragment to avoid thrash/reflow.
   - I store the last inputs in localStorage (quality-of-life).
================================================================ */

document.addEventListener('DOMContentLoaded', initMultiplicationApp);

function initMultiplicationApp(){
  // === Tunables (if the rubric changes, I tweak here) ===========
  const BOUNDS = { min: -50, max: 50 };     // per spec
  const SAFE_CELL_BUDGET = 15000;           // my safety rail to avoid lockups
  const LS_KEY_PREFIX = 'gui4610_hw3_';     // less collision-y than generic keys

  // === Small utilities I actually use ============================
  const $ = (sel, root = document) => root.querySelector(sel);

  // I prefer explicit read helper so I can centralize integer semantics.
  function readInt(id){
    const raw = $(`#${id}`).value.trim();
    // parseInt handles leading spaces; I still reject NaN and non-int like "3.2"
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n)){
      return { ok:false, error:`Field "${id}" must be a whole number.` };
    }
    return { ok:true, value:n };
  }

  // Just to keep the math readable below.
  const countCells = (hs, he, vs, ve) => (he - hs + 1) * (ve - vs + 1);

  // Create elements quickly without sprinkling innerHTML everywhere.
  function el(tag, props = {}, ...kids){
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const k of kids) node.append(k);
    return node;
  }

  // === Grab DOM refs once =======================================
  const form    = $('#hw3-form');
  const okMsg   = $('#okMsg');
  const errMsg  = $('#errMsg');
  const table   = $('#grid');
  const thead   = table.tHead   || table.createTHead();
  const tbody   = table.tBodies[0] || table.createTBody();

  // === On load: try to restore last used values =================
  ['hStart','hEnd','vStart','vEnd'].forEach(id => {
    const saved = localStorage.getItem(LS_KEY_PREFIX + id);
    if (saved !== null) { $(`#${id}`).value = saved; }
  });

  // If empty, I set a sensible demo to show the feature quickly.
  if (!$('#hStart').value && !$('#hEnd').value && !$('#vStart').value && !$('#vEnd').value){
    $('#hStart').value = -5; $('#hEnd').value = 5;
    $('#vStart').value = -5; $('#vEnd').value = 5;
  }

  // === Events ====================================================
  $('#resetBtn').addEventListener('click', () => {
    ['hStart','hEnd','vStart','vEnd'].forEach(id => {
      $(`#${id}`).value = '';
      localStorage.removeItem(LS_KEY_PREFIX + id);
    });
    clearStatus();
    clearTable();
  });

  form.addEventListener('submit', (evt) => {
    evt.preventDefault();
    clearStatus();

    // 1) Read + validate as integers (my readInt helper keeps this concise)
    const Hs = readInt('hStart');
    const He = readInt('hEnd');
    const Vs = readInt('vStart');
    const Ve = readInt('vEnd');

    const invalid = [Hs,He,Vs,Ve].find(x => !x.ok);
    if (invalid){
      return showError(invalid.error);
    }

    // Put raw values into LS (I store *what was typed*, not normalized)
    ['hStart','hEnd','vStart','vEnd'].forEach(id => {
      localStorage.setItem(LS_KEY_PREFIX + id, $(`#${id}`).value.trim());
    });

    // 2) Normalize swapped ranges — this reduces edge-case branching later.
    let hStart = Hs.value, hEnd = He.value;
    let vStart = Vs.value, vEnd = Ve.value;
    if (hStart > hEnd) [hStart, hEnd] = [hEnd, hStart];
    if (vStart > vEnd) [vStart, vEnd] = [vEnd, vStart];

    // 3) Hard bounds per rubric
    if (hStart < BOUNDS.min || hEnd > BOUNDS.max || vStart < BOUNDS.min || vEnd > BOUNDS.max){
      return showError(`Out of bounds. Keep all values between ${BOUNDS.min} and ${BOUNDS.max}.`);
    }

    // 4) Cell budget check — defensive programming for UX (no frozen tabs)
    const cells = countCells(hStart, hEnd, vStart, vEnd);
    if (cells > SAFE_CELL_BUDGET){
      return showError(`Grid too large (${cells.toLocaleString()} cells). Reduce the range or split it.`);
    }

    // 5) Build table — I time this for my own sanity when ranges are big.
    const t0 = performance.now();
    buildTable({ hStart, hEnd, vStart, vEnd });
    const t1 = performance.now();

    okMsg.textContent = `Built ${(vEnd - vStart + 1)}×${(hEnd - hStart + 1)} table in ${Math.round(t1 - t0)} ms.`;

    // For grading step “print values”: I log normalized inputs + shape.
    console.log('Normalized inputs:', { hStart, hEnd, vStart, vEnd });
    console.log('Shape:', { rows: (vEnd - vStart + 1), cols: (hEnd - hStart + 1), cells });
  });

  // === Helpers: status + table ==================================
  function clearTable(){
    thead.innerHTML = '';
    tbody.innerHTML = '';
  }
  function clearStatus(){
    okMsg.textContent = '';
    errMsg.textContent = '';
  }
  function showError(text){
    clearTable();
    errMsg.textContent = text;
  }

  // I split header/body generation for readability. Both use a fragment to
  // minimize reflow (this matters when ranges are wide).
  function buildTable({ hStart, hEnd, vStart, vEnd }){
    clearTable();

    // --- Header row ---
    const hRow = document.createElement('tr');
    // Corner cell: I like using × so it reads quickly as a mult table.
    hRow.append(el('th', { className:'corner', scope:'col' }, '×'));
    for (let h = hStart; h <= hEnd; h++){
      hRow.append(el('th', { scope:'col', title: `Multiplier ${h}` }, String(h)));
    }
    thead.append(hRow);

    // --- Body rows ---
    const frag = document.createDocumentFragment();
    for (let v = vStart; v <= vEnd; v++){
      const row = document.createElement('tr');
      row.append(el('th', { scope:'row', title:`Multiplicand ${v}` }, String(v)));

      // Inner loop: I keep it tight; just compute and append.
      for (let h = hStart; h <= hEnd; h++){
        const prod = v * h;
        row.append(el('td', { title: `${v} × ${h} = ${prod}` }, String(prod)));
      }
      frag.append(row);
    }
    tbody.append(frag);
  }
}
