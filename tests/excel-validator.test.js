"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const { validateResultsExcel } = require("../src/utils/excel-validator");

// Sinov uchun dasturiy Excel buffer yasash yordamchisi
async function makeBuffer(options = {}) {
  const {
    sheetCount = 1,
    a1Value = "F.I.O",
    headerValues = [1, 2, 3],
    extraHeaderCols = [],
    rows = [
      ["Student 1", 1, 0, 1],
      ["Student 2", 0, 1, 1],
    ],
    formulaCell = null,
    merges = [],
  } = options;

  const wb = new ExcelJS.Workbook();
  for (let i = 0; i < sheetCount; i++) {
    wb.addWorksheet(`Sheet${i + 1}`);
  }
  const ws = wb.worksheets[0];

  ws.getCell(1, 1).value = a1Value;

  for (let i = 0; i < headerValues.length; i++) {
    if (headerValues[i] !== null) {
      ws.getCell(1, i + 2).value = headerValues[i];
    }
  }

  for (let i = 0; i < extraHeaderCols.length; i++) {
    ws.getCell(1, headerValues.length + 2 + i).value = extraHeaderCols[i];
  }

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] !== null) {
        ws.getCell(r + 2, c + 1).value = rows[r][c];
      }
    }
  }

  if (formulaCell) {
    ws.getCell(formulaCell.row, formulaCell.col).value = {
      formula: formulaCell.formula,
      result: formulaCell.result ?? 1,
    };
  }

  for (const m of merges) {
    ws.mergeCells(m);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

test("to'g'ri fayl tekshiruvdan o'tadi", async () => {
  const buf = await makeBuffer();
  const result = await validateResultsExcel(buf, {
    filename: "test.xlsx",
    expectedQuestionCount: 3,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.stats, { questions: 3, students: 2 });
});

test(".xls kengaytmasi excelErrNotXlsx qaytaradi", async () => {
  const buf = await makeBuffer();
  const result = await validateResultsExcel(buf, { filename: "test.xls" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrNotXlsx"));
});

test("noto'g'ri A1 excelErrHeaderA1 qaytaradi", async () => {
  const buf = await makeBuffer({ a1Value: "Nomi" });
  const result = await validateResultsExcel(buf, { filename: "test.xlsx" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrHeaderA1"));
});

test("sarlavhada raqam tushib qolsa excelErrHeaderSeq qaytaradi", async () => {
  // 1, 2, 4 — 3 tushib qolgan
  const buf = await makeBuffer({ headerValues: [1, 2, 4] });
  const result = await validateResultsExcel(buf, { filename: "test.xlsx" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrHeaderSeq"));
});

test("savol soni mos kelmasa excelErrQuestionCount qaytaradi", async () => {
  const buf = await makeBuffer({ headerValues: [1, 2, 3] });
  const result = await validateResultsExcel(buf, {
    filename: "test.xlsx",
    expectedQuestionCount: 5,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrQuestionCount"));
});

test("katakda 11 qiymat bo'lsa excelErrBadCell qaytaradi", async () => {
  const buf = await makeBuffer({
    rows: [["Student 1", 1, 11, 1]],
  });
  const result = await validateResultsExcel(buf, { filename: "test.xlsx" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrBadCell" && e.value === 11));
});

test("ma'lumot qatorida bo'sh katak excelErrEmptyCell qaytaradi", async () => {
  // rows[0][2] = null → C2 bo'sh qoladi
  const buf = await makeBuffer({
    rows: [["Student 1", 1, null, 1]],
  });
  const result = await validateResultsExcel(buf, { filename: "test.xlsx" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrEmptyCell"));
});

test("sarlavhada ortiqcha ustun excelErrExtraData qaytaradi", async () => {
  const buf = await makeBuffer({ extraHeaderCols: ["Jami"] });
  const result = await validateResultsExcel(buf, { filename: "test.xlsx" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrExtraData"));
});

test("takror ism excelErrDuplicateName qaytaradi", async () => {
  const buf = await makeBuffer({
    rows: [
      ["Ali Karimov", 1, 0, 1],
      ["ali karimov", 0, 1, 0], // bosh harf farqi — takror
    ],
  });
  const result = await validateResultsExcel(buf, { filename: "test.xlsx" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrDuplicateName"));
});

test("ikki varaq excelErrMultiSheet qaytaradi", async () => {
  const buf = await makeBuffer({ sheetCount: 2 });
  const result = await validateResultsExcel(buf, { filename: "test.xlsx" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrMultiSheet"));
});

test("katakda formula excelErrFormula qaytaradi", async () => {
  const buf = await makeBuffer({
    formulaCell: { row: 2, col: 2, formula: "=1+0", result: 1 },
  });
  const result = await validateResultsExcel(buf, { filename: "test.xlsx" });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.code === "excelErrFormula"),
    `Kutilgan excelErrFormula, lekin topilgan: ${JSON.stringify(result.errors)}`,
  );
});

test("buzilgan buffer excelErrCorrupt qaytaradi", async () => {
  const buf = Buffer.from("bu xlsx fayl emas");
  const result = await validateResultsExcel(buf, { filename: "test.xlsx" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "excelErrCorrupt"));
});
