"use strict";

const ExcelJS = require("exceljs");

function columnToLetter(col) {
  let letter = "";
  while (col > 0) {
    const r = (col - 1) % 26;
    letter = String.fromCharCode(65 + r) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function cellAddr(row, col) {
  return columnToLetter(col) + row;
}

// ExcelJS cell dan xom qiymat olish (RichText va formula obyektlarini hisobga olgan holda)
function getCellValue(cell) {
  if (!cell) return null;
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (v && typeof v === "object" && "richText" in v) {
    return v.richText.map((r) => r.text || "").join("");
  }
  return v;
}

/**
 * natijalar Excel faylini tekshiradi.
 * @param {Buffer} buffer
 * @param {{ filename: string, expectedQuestionCount: number }} options
 * @returns {{ ok: boolean, errors: Array, stats: { questions: number, students: number } }}
 */
async function validateResultsExcel(
  buffer,
  { filename = "", expectedQuestionCount = 0 } = {},
) {
  const errors = [];
  const stats = { questions: 0, students: 0 };

  // 1. Kengaytma: faqat .xlsx
  if (!filename.toLowerCase().endsWith(".xlsx")) {
    errors.push({ code: "excelErrNotXlsx" });
    return { ok: false, errors, stats };
  }

  // 2. Sehrli baytlar: PK (ZIP imzosi)
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 4 ||
    buffer[0] !== 0x50 ||
    buffer[1] !== 0x4b
  ) {
    errors.push({ code: "excelErrCorrupt" });
    return { ok: false, errors, stats };
  }

  // 3. ExcelJS bilan ochib o'qish
  let workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
  } catch {
    errors.push({ code: "excelErrCorrupt" });
    return { ok: false, errors, stats };
  }

  // 4. Varaqlar soni aynan 1
  if (workbook.worksheets.length !== 1) {
    errors.push({ code: "excelErrMultiSheet", value: workbook.worksheets.length });
    return { ok: false, errors, stats };
  }

  const sheet = workbook.worksheets[0];

  // 5. Birlashtirilgan (merged) kataklar
  if (sheet.hasMerges) {
    errors.push({ code: "excelErrMerged" });
    return { ok: false, errors, stats };
  }

  // 6. Hajm chegarasi: 5001 qator (1 sarlavha + 5000 o'quvchi), 301 ustun (1 ism + 300 savol)
  if (sheet.actualRowCount > 5001 || sheet.actualColumnCount > 301) {
    errors.push({ code: "excelErrTooLarge" });
    return { ok: false, errors, stats };
  }

  // --- SARLAVHA (1-qator) ---
  const headerRow = sheet.getRow(1);

  // Sarlavha qatoridagi oxirgi ustunni topish
  let maxHeaderCol = 1;
  headerRow.eachCell({ includeEmpty: false }, (_, colNum) => {
    if (colNum > maxHeaderCol) maxHeaderCol = colNum;
  });

  // 7. A1 = "F.I.O" (bo'shliq va katta-kichik harfga e'tiborsiz)
  const a1Val = getCellValue(headerRow.getCell(1));
  if (typeof a1Val !== "string" || a1Val.trim().toLowerCase() !== "f.i.o") {
    errors.push({ code: "excelErrHeaderA1", cell: "A1", row: 1, col: 1, value: a1Val });
  }

  // 8. B1, C1, ... ketma-ket butun sonlar 1, 2, 3...
  let N = 0;
  let seqBroken = false;

  for (let c = 2; c <= maxHeaderCol; c++) {
    const cell = headerRow.getCell(c);

    // Formula tekshiruvi
    if (cell.formula) {
      errors.push({ code: "excelErrFormula", cell: cellAddr(1, c), row: 1, col: c });
      seqBroken = true;
      break;
    }

    const val = getCellValue(cell);

    if (val === null || val === "") {
      // Bo'sh katak — ketma-ketlik to'xtadi, qolganini extra data uchun tekshir
      for (let c2 = c + 1; c2 <= maxHeaderCol; c2++) {
        const v2 = getCellValue(headerRow.getCell(c2));
        if (v2 !== null && v2 !== "") {
          errors.push({ code: "excelErrExtraData", cell: cellAddr(1, c2), row: 1, col: c2 });
          break;
        }
      }
      break;
    }

    const expected = c - 1; // B(2)→1, C(3)→2, ...
    if (typeof val !== "number" || !Number.isInteger(val) || val !== expected) {
      if (!seqBroken) {
        // N > 0 bo'lsa va qiymat son emas → ketma-ketlik tugagan, bu extra ma'lumot
        // Aks holda (son, lekin noto'g'ri) → ketma-ketlik buzilgan
        const code =
          N > 0 && typeof val !== "number"
            ? "excelErrExtraData"
            : "excelErrHeaderSeq";
        errors.push({ code, cell: cellAddr(1, c), row: 1, col: c, value: val });
        seqBroken = true;
      }
      break;
    }

    N++;
  }

  // Ketma-ketlik to'g'ri tugagandan keyin extra data borligini tekshir
  if (!seqBroken && maxHeaderCol > N + 1) {
    for (let c = N + 2; c <= maxHeaderCol; c++) {
      const v = getCellValue(headerRow.getCell(c));
      if (v !== null && v !== "") {
        errors.push({ code: "excelErrExtraData", cell: cellAddr(1, c), row: 1, col: c });
        break;
      }
    }
  }

  stats.questions = N;

  // 9. Savol soni testdagi javoblar soni bilan mos kelishini tekshir
  if (expectedQuestionCount > 0 && N !== expectedQuestionCount) {
    errors.push({ code: "excelErrQuestionCount", value: N, expected: expectedQuestionCount });
  }

  // --- MA'LUMOT QATORLARI ---
  const seenNames = new Map(); // trim+lowercase key → qator raqami
  let studentCount = 0;
  const MAX_ERRORS = 100;

  const totalRows = sheet.actualRowCount;

  for (let r = 2; r <= totalRows; r++) {
    const row = sheet.getRow(r);

    // To'liq bo'sh qatorni o'tkazib yuborish
    let rowHasData = false;
    row.eachCell({ includeEmpty: false }, () => { rowHasData = true; });
    if (!rowHasData) continue;

    studentCount++;

    // A ustuni — ism
    const aCell = row.getCell(1);
    const nameVal = getCellValue(aCell);
    const nameStr =
      typeof nameVal === "string"
        ? nameVal
        : nameVal !== null
          ? String(nameVal)
          : null;

    if (nameStr === null || nameStr.trim() === "") {
      if (errors.length < MAX_ERRORS) {
        errors.push({ code: "excelErrEmptyName", cell: cellAddr(r, 1), row: r, col: 1 });
      }
    } else {
      const nameKey = nameStr.trim().toLowerCase();
      if (seenNames.has(nameKey)) {
        if (errors.length < MAX_ERRORS) {
          errors.push({
            code: "excelErrDuplicateName",
            cell: cellAddr(r, 1),
            row: r,
            col: 1,
            value: nameStr,
            firstRow: seenNames.get(nameKey),
          });
        }
      } else {
        seenNames.set(nameKey, r);
      }
    }

    // B...N+1 ustunlari: aynan 0 yoki 1 (son) bo'lishi kerak
    for (let c = 2; c <= N + 1; c++) {
      const cell = row.getCell(c);

      if (cell.formula) {
        if (errors.length < MAX_ERRORS) {
          errors.push({ code: "excelErrFormula", cell: cellAddr(r, c), row: r, col: c });
        }
        continue;
      }

      const val = getCellValue(cell);

      if (val === null || val === undefined || val === "") {
        if (errors.length < MAX_ERRORS) {
          errors.push({ code: "excelErrEmptyCell", cell: cellAddr(r, c), row: r, col: c, value: null });
        }
        continue;
      }

      if (typeof val !== "number" || (val !== 0 && val !== 1)) {
        if (errors.length < MAX_ERRORS) {
          errors.push({ code: "excelErrBadCell", cell: cellAddr(r, c), row: r, col: c, value: val });
        }
      }
    }
  }

  stats.students = studentCount;

  // Kamida 1 ta o'quvchi
  if (studentCount === 0) {
    errors.push({ code: "excelErrNoStudents" });
  }

  return { ok: errors.length === 0, errors, stats };
}

module.exports = { validateResultsExcel };
