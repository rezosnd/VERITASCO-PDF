/* =========================================================
   VERITASCO RECHECK SHEET — app.js
   ========================================================= */

const WATERMARK_PATH = './public/veritasco.png';

// ── State ──────────────────────────────────────────────────
let state = {
  studentName: '',
  subjects: [],          // ['Physics', 'Chemistry', ...]
  activeTab: 0,
  rows: {},          // { 'Physics': [ {qno,pgno,awarded,claimed,reason}, ... ] }
};

// ── DOM Refs ────────────────────────────────────────────────
const pages = () => document.querySelectorAll('.page');
const stepPills = () => document.querySelectorAll('.step-pill');
const toast = document.getElementById('toast');
const pdfOverlay = document.getElementById('pdf-overlay');

// ── Utils ───────────────────────────────────────────────────
function showPage(n) {
  document.querySelectorAll('.page').forEach((p, i) => {
    p.classList.toggle('active', i === n);
  });
  document.querySelectorAll('.step-pill').forEach((p, i) => {
    p.classList.toggle('active', i === n);
  });
}

function showToast(msg, type = 'success') {
  toast.textContent = (type === 'success' ? '✓  ' : '✕  ') + msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.classList.remove('show'); }, 3200);
}

function makeId(subject) {
  return subject.replace(/\s+/g, '_').toLowerCase();
}

function blankRow() {
  return { qno: '', pgno: '', awarded: '', claimed: '', reason: '' };
}

// ── PAGE 1 — SETUP ──────────────────────────────────────────
const nameInput = document.getElementById('student-name');
const subjectInput = document.getElementById('subject-input');
const addSubjectBtn = document.getElementById('add-subject-btn');
const subjectsList = document.getElementById('subjects-list');
const proceedBtn = document.getElementById('proceed-btn');

function renderSubjectsList() {
  subjectsList.innerHTML = '';
  state.subjects.forEach((sub, idx) => {
    const row = document.createElement('div');
    row.className = 'subject-row';
    row.innerHTML = `
      <span class="subject-badge">${idx + 1}</span>
      <span>${sub}</span>
      <button class="btn-icon" onclick="removeSubject(${idx})" title="Remove">✕</button>
    `;
    subjectsList.appendChild(row);
  });
}

function addSubject() {
  const val = subjectInput.value.trim();
  if (!val) return subjectInput.focus();
  if (state.subjects.map(s => s.toLowerCase()).includes(val.toLowerCase())) {
    showToast('Subject already added', 'error');
    return;
  }
  if (state.subjects.length >= 10) {
    showToast('Max 10 subjects allowed', 'error'); return;
  }
  state.subjects.push(val);
  if (!state.rows[val]) state.rows[val] = [blankRow(), blankRow(), blankRow()];
  subjectInput.value = '';
  renderSubjectsList();
  subjectInput.focus();
}

window.removeSubject = function (idx) {
  const sub = state.subjects[idx];
  state.subjects.splice(idx, 1);
  delete state.rows[sub];
  renderSubjectsList();
};

addSubjectBtn.addEventListener('click', addSubject);
subjectInput.addEventListener('keydown', e => { if (e.key === 'Enter') addSubject(); });

proceedBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) { showToast('Please enter student name', 'error'); nameInput.focus(); return; }
  if (state.subjects.length === 0) { showToast('Add at least one subject', 'error'); return; }
  state.studentName = name;
  state.activeTab = 0;
  buildSheetPage();
  showPage(1);
});

// ── PAGE 2 — SHEET ──────────────────────────────────────────
const sheetName = document.getElementById('sheet-name');
const subjectTabs = document.getElementById('subject-tabs');
const tableBody = document.getElementById('table-body');
const subjectLabel = document.getElementById('current-subject');
const rowCount = document.getElementById('row-count');
const addRowBtn = document.getElementById('add-row-btn');
const backBtn = document.getElementById('back-btn');
const exportBtn = document.getElementById('export-pdf-btn');
const totalAwarded = document.getElementById('total-awarded');
const totalClaimed = document.getElementById('total-claimed');
const totalSubj = document.getElementById('total-subjects');

function buildSheetPage() {
  sheetName.textContent = state.studentName;
  renderTabs();
  renderTable();
  updateSummary();
}

function renderTabs() {
  subjectTabs.innerHTML = '';
  state.subjects.forEach((sub, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (idx === state.activeTab ? ' active' : '');
    btn.textContent = sub;
    btn.onclick = () => { state.activeTab = idx; renderTabs(); renderTable(); updateSummary(); };
    subjectTabs.appendChild(btn);
  });
}

function currentSubject() {
  return state.subjects[state.activeTab];
}

function renderTable() {
  const sub = currentSubject();
  const rows = state.rows[sub];
  subjectLabel.textContent = sub;
  rowCount.textContent = `${rows.length} question${rows.length !== 1 ? 's' : ''}`;
  tableBody.innerHTML = '';

  rows.forEach((row, ri) => {
    const tr = document.createElement('tr');
    tr.dataset.row = ri;
    tr.innerHTML = `
      <td class="col-sn">${ri + 1}</td>
      <td><input class="w80" type="text" placeholder="e.g. 19" value="${esc(row.qno)}"
          oninput="updateRow('${escAttr(sub)}',${ri},'qno',this.value)"></td>
      <td><input class="w90" type="text" placeholder="e.g. 4 / 08-Jan" value="${esc(row.pgno)}"
          oninput="updateRow('${escAttr(sub)}',${ri},'pgno',this.value)"></td>
      <td><input class="w80" type="text" placeholder="1" value="${esc(row.awarded)}"
          oninput="updateRow('${escAttr(sub)}',${ri},'awarded',this.value)"></td>
      <td><input class="w80" type="text" placeholder="2" value="${esc(row.claimed)}"
          oninput="updateRow('${escAttr(sub)}',${ri},'claimed',this.value)"></td>
      <td><textarea placeholder="Reason for recheck..." rows="2"
          oninput="updateRow('${escAttr(sub)}',${ri},'reason',this.value)">${esc(row.reason)}</textarea></td>
      <td class="col-del">
        <button class="btn-icon" onclick="deleteRow('${escAttr(sub)}',${ri})" title="Delete row" style="color:var(--danger)">🗑</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escAttr(v) { return String(v ?? '').replace(/'/g, "\\'"); }

window.updateRow = function (sub, ri, field, val) {
  if (state.rows[sub] && state.rows[sub][ri] !== undefined) {
    state.rows[sub][ri][field] = val;
    updateSummary();
  }
};

window.deleteRow = function (sub, ri) {
  if (state.rows[sub].length <= 1) { showToast('Need at least 1 row', 'error'); return; }
  state.rows[sub].splice(ri, 1);
  renderTable();
  updateSummary();
};

addRowBtn.addEventListener('click', () => {
  const sub = currentSubject();
  state.rows[sub].push(blankRow());
  renderTable();
  // scroll to bottom
  tableBody.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

backBtn.addEventListener('click', () => showPage(0));

function updateSummary() {
  let totA = 0, totC = 0;
  state.subjects.forEach(sub => {
    state.rows[sub].forEach(r => {
      const a = parseFloat(r.awarded) || 0;
      const c = parseFloat(r.claimed) || 0;
      totA += a; totC += c;
    });
  });
  totalAwarded.textContent = totA % 1 === 0 ? totA : totA.toFixed(1);
  totalClaimed.textContent = totC % 1 === 0 ? totC : totC.toFixed(1);
  totalSubj.textContent = state.subjects.length;
}

// ── PDF EXPORT ───────────────────────────────────────────────
exportBtn.addEventListener('click', exportToPDF);

async function exportToPDF() {
  // Only need jsPDF — no html2canvas needed
  if (!window.jspdf) {
    showToast('PDF library still loading — please try again in a moment', 'error');
    return;
  }
  pdfOverlay.classList.add('show');
  await sleep(100);

  try {
    const { jsPDF } = window.jspdf;
    // Portrait A4 for clean letterhead style
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PW = 210, PH = 297;
    const ML = 18, MR = 18;          // margins
    const CW = PW - ML - MR;         // content width
    const ACCENT = [26, 26, 26];     // near-black
    const GRAY = [120, 120, 120];
    const LIGHT = [200, 200, 200];
    const BLACK = [0, 0, 0];
    const WHITE = [255, 255, 255];

    // Load watermark image
    let wmDataUrl = null;
    try {
      wmDataUrl = await loadImageAsDataUrl(WATERMARK_PATH);
    } catch (_) { /* watermark optional */ }

    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    for (let si = 0; si < state.subjects.length; si++) {
      if (si > 0) doc.addPage();
      const sub = state.subjects[si];
      const rows = state.rows[sub].filter(r => r.qno || r.pgno || r.awarded || r.claimed || r.reason);
      const allRows = rows.length > 0 ? rows : state.rows[sub];

      // ═══════════════════════════════════════════════════════
      //  BACKGROUND — center watermark (very faint)
      // ═══════════════════════════════════════════════════════
      const drawWatermark = (pageIndex) => {
        if (wmDataUrl) {
          const wmW = 100, wmH = 70;
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.045 }));
          doc.addImage(wmDataUrl, 'PNG',
            (PW - wmW) / 2, (PH - wmH) / 2,
            wmW, wmH, `wm_${si}_${pageIndex}`, 'NONE');
          doc.restoreGraphicsState();
        }
      };

      drawWatermark(0);

      // ═══════════════════════════════════════════════════════
      //  HEADER — Logo left, contact info right (like letterhead)
      // ═══════════════════════════════════════════════════════
      let headerY = 16;

      // Logo
      if (wmDataUrl) {
        doc.addImage(wmDataUrl, 'PNG', ML, 10, 22, 15, `logo_${si}`, 'NONE');
      }

      // Company name next to logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...BLACK);
      doc.text('VeritasCo', ML + (wmDataUrl ? 26 : 0), headerY);

      // Tagline
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text('Powered by Expertise', ML + (wmDataUrl ? 26 : 0), headerY + 5);

      // Right side — contact details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...ACCENT);
      const rightX = PW - MR;
      doc.text('recheck.veritasco.tech', rightX, 12, { align: 'right' });
      doc.setTextColor(...GRAY);
      doc.text('info@veritasco.tech', rightX, 17, { align: 'right' });
      doc.text('veritasco.tech', rightX, 22, { align: 'right' });

      // Date on right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...ACCENT);
      doc.text(`Date: ${dateStr}`, rightX, 28, { align: 'right' });

      // ── Separator line ──────────────────────────────────
      const sepY = 33;
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.6);
      doc.line(ML, sepY, PW - MR, sepY);
      // Thin accent line below
      doc.setDrawColor(...LIGHT);
      doc.setLineWidth(0.2);
      doc.line(ML, sepY + 1.2, PW - MR, sepY + 1.2);

      // ═══════════════════════════════════════════════════════
      //  STUDENT & SUBJECT INFO
      // ═══════════════════════════════════════════════════════
      let infoY = sepY + 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...BLACK);
      doc.text('RECHECK APPLICATION SHEET', ML, infoY);

      infoY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...ACCENT);
      doc.text(`Student Name:`, ML, infoY);
      doc.setFont('helvetica', 'bold');
      doc.text(state.studentName, ML + 32, infoY);

      doc.setFont('helvetica', 'normal');
      doc.text(`Subject:`, ML + 100, infoY);
      doc.setFont('helvetica', 'bold');
      doc.text(sub, ML + 118, infoY);

      // ═══════════════════════════════════════════════════════
      //  TABLE
      // ═══════════════════════════════════════════════════════
      const tableTop = infoY + 8;
      const COL_W = [12, 28, 26, 28, 28, CW - 12 - 28 - 26 - 28 - 28];
      const HEADERS = ['S.No', 'Question', 'Page No', 'Marks\nAwarded', 'Claimed\nMarks', 'Reason'];
      const HDR_H = 10;
      const ROW_H = 8;

      const drawTableHeader = (startY) => {
        doc.setFillColor(...BLACK);
        doc.rect(ML, startY, CW, HDR_H, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...WHITE);
        let hx = ML;
        HEADERS.forEach((h, i) => {
          const lines = h.split('\n');
          if (lines.length === 1) {
            doc.text(lines[0], hx + COL_W[i] / 2, startY + 6.5, { align: 'center' });
          } else {
            doc.text(lines[0], hx + COL_W[i] / 2, startY + 4.5, { align: 'center' });
            doc.text(lines[1], hx + COL_W[i] / 2, startY + 8, { align: 'center' });
          }
          hx += COL_W[i];
        });
      };

      const drawTableOuterBorder = (startY, height) => {
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.5);
        doc.rect(ML, startY, CW, HDR_H + height);
      };

      let currentTableTop = tableTop;
      let y = currentTableTop + HDR_H;
      let currentTableRowsH = 0;
      let pageIndexForSubject = 0;

      drawTableHeader(currentTableTop);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const LINE_H   = 4.2;   // mm per text line
      const CELL_PAD = 3;     // top/bottom padding per cell

      allRows.forEach((row, ri) => {
        const reasonLines = doc.splitTextToSize(row.reason || '', COL_W[5] - 4);
        const nLines      = Math.max(1, reasonLines.length);
        const dynH        = Math.max(ROW_H, nLines * LINE_H + CELL_PAD * 2);

        // Check if row exceeds page height (leave space for footer)
        if (y + dynH > PH - 35) {
          // Close current table
          drawTableOuterBorder(currentTableTop, currentTableRowsH);

          doc.addPage();
          pageIndexForSubject++;
          drawWatermark(pageIndexForSubject);

          currentTableTop = 20; // top margin for new page
          y = currentTableTop + HDR_H;
          currentTableRowsH = 0;
          drawTableHeader(currentTableTop);
        }

        // Alternating row background
        doc.setFillColor(ri % 2 === 0 ? 250 : 240, ri % 2 === 0 ? 250 : 240, ri % 2 === 0 ? 250 : 240);
        doc.rect(ML, y, CW, dynH, 'F');

        // Vertical cell dividers
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.15);
        let bx = ML;
        for (let ci = 0; ci < COL_W.length - 1; ci++) {
          bx += COL_W[ci];
          doc.line(bx, y, bx, y + dynH);
        }

        // Cell text
        doc.setTextColor(...BLACK);
        const cells = [
          String(ri + 1),
          row.qno     || '',
          row.pgno    || '',
          row.awarded || '',
          row.claimed || '',
          row.reason  || '',
        ];

        let dx = ML;
        cells.forEach((cell, ci) => {
          const vertCenter = y + dynH / 2;
          if (ci <= 4) {
            const txt = doc.splitTextToSize(cell, COL_W[ci] - 4);
            doc.text(txt[0] || '', dx + COL_W[ci] / 2, vertCenter + 2.5, { align: 'center' });
          } else {
            doc.text(reasonLines, dx + 2, y + CELL_PAD + LINE_H, { maxWidth: COL_W[ci] - 4, lineHeightFactor: 1.4 });
          }
          dx += COL_W[ci];
        });

        // Bottom row border
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.15);
        doc.line(ML, y + dynH, ML + CW, y + dynH);

        y += dynH;
        currentTableRowsH += dynH;
      });

      // Close the table border on the final page of this subject
      drawTableOuterBorder(currentTableTop, currentTableRowsH);

      // ═══════════════════════════════════════════════════════
      //  TOTALS SECTION
      // ═══════════════════════════════════════════════════════
      // Check if totals section fits on the current page, if not, new page
      if (y + 25 > PH - 35) {
        doc.addPage();
        pageIndexForSubject++;
        drawWatermark(pageIndexForSubject);
        y = 20;
      } else {
        y += 6;
      }

      const totA = allRows.reduce((s, r) => s + (parseFloat(r.awarded) || 0), 0);
      const totC = allRows.reduce((s, r) => s + (parseFloat(r.claimed) || 0), 0);

      // Totals box
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.3);
      doc.roundedRect(ML, y, 100, 16, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...BLACK);
      doc.text('Total Marks Awarded:', ML + 4, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(String(totA % 1 === 0 ? totA : totA.toFixed(1)), ML + 56, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...BLACK);
      doc.text('Total Claimed Marks:', ML + 4, y + 12.5);
      doc.setTextColor(40, 40, 40);
      doc.text(String(totC % 1 === 0 ? totC : totC.toFixed(1)), ML + 56, y + 12.5);

      // Difference
      const diff = totC - totA;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text('Difference:', ML + 68, y + 6);
      doc.setTextColor(diff > 0 ? 180 : 80, diff > 0 ? 40 : 80, diff > 0 ? 40 : 80);
      doc.text((diff > 0 ? '+' : '') + String(diff % 1 === 0 ? diff : diff.toFixed(1)), ML + 90, y + 6);
    }

    // ═══════════════════════════════════════════════════════
    //  FOOTER — Applied to all pages
    // ═══════════════════════════════════════════════════════
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      const footerTop = PH - 28;
      const rightX = PW - MR;

      // Separator line
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.4);
      doc.line(ML, footerTop, PW - MR, footerTop);

      // Footer left — logo & branding
      if (wmDataUrl) {
        doc.addImage(wmDataUrl, 'PNG', ML, footerTop + 3, 12, 8, 'flogo_footer', 'NONE');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
      doc.text('VeritasCo', ML + (wmDataUrl ? 15 : 0), footerTop + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text('Trusted Recheck Advisory Services', ML + (wmDataUrl ? 15 : 0), footerTop + 10);

      // Footer middle — contact info (clean labels, no emoji)
      const midX = PW / 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);

      // Label bold, value normal — inline on same line
      const drawContactLine = (label, value, yPos) => {
        const labelW = doc.getTextWidth(label);
        const totalW = doc.getTextWidth(label + value);
        const startX = midX - totalW / 2;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(label, startX, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY);
        doc.text(value, startX + labelW, yPos);
      };

      drawContactLine('Email: ',   'info@veritasco.tech',        footerTop + 5);
      drawContactLine('Web: ',     'veritasco.tech',             footerTop + 10);
      drawContactLine('Recheck: ', 'recheck.veritasco.tech',     footerTop + 15);

      // Footer right — page number & confidential
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(`Page ${i} of ${totalPages}`, rightX, footerTop + 5, { align: 'right' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5.5);
      doc.setTextColor(160, 160, 160);
      doc.text('This document is generated by VeritasCo Recheck Tool.', rightX, footerTop + 10, { align: 'right' });
      doc.text('Confidential — For authorized use only.', rightX, footerTop + 14, { align: 'right' });

      // Bottom thin accent bar
      doc.setFillColor(...BLACK);
      doc.rect(ML, PH - 8, CW, 0.8, 'F');

      // Very bottom — tiny URL
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(...GRAY);
      doc.text('https://recheck.veritasco.tech', PW / 2, PH - 4, { align: 'center' });
    }

    const safeName = state.studentName.replace(/[^a-z0-9]/gi, '_');
    doc.save(`VeritasCo_Recheck_${safeName}.pdf`);
    showToast('PDF exported successfully!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Export failed: ' + err.message, 'error');
  } finally {
    pdfOverlay.classList.remove('show');
  }
}

function loadImageAsDataUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      try { resolve(c.toDataURL('image/png')); }
      catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = src + '?t=' + Date.now();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── INIT ────────────────────────────────────────────────────
showPage(0);
