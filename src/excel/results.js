const ExcelJS = require("exceljs");

const GRADE_ORDER = ["A+", "A", "B+", "B", "C+", "C", "NC"];

function buildProgressBar(percent, length = 10) {
  const filled = Math.round((percent / 100) * length);

  return "█".repeat(filled) + "░".repeat(length - filled);
}

async function buildResultsExcel(result, testName = "Test") {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Telegram Quiz Bot";

  workbook.created = new Date();

  // =========================
  // 1. NATIJALAR
  // =========================

  const resultsSheet = workbook.addWorksheet("Natijalar");

  resultsSheet.columns = [
    {
      header: "№",
      key: "index",
      width: 7,
    },
    {
      header: "Ism Familiya",
      key: "name",
      width: 30,
    },
    {
      header: "Baho",
      key: "grade",
      width: 12,
    },
    {
      header: "Ball (%)",
      key: "score",
      width: 14,
    },
    {
      header: "To'g'ri",
      key: "correct",
      width: 12,
    },
    {
      header: "Noto'g'ri",
      key: "incorrect",
      width: 12,
    },
    {
      header: "User ID",
      key: "userId",
      width: 18,
    },
  ];

  const students = result?.students || result?.results || result?.data || [];

  students.forEach((student, index) => {
    resultsSheet.addRow({
      index: index + 1,

      name:
        student.name ||
        student.full_name ||
        student.fio ||
        student.username ||
        "Noma'lum",

      grade: student.grade || student.degree || "-",

      score: Number(
        student.total_ball ?? student.score ?? student.percent ?? 0,
      ),

      correct: Number(student.currect ?? student.correct ?? 0),

      incorrect: Number(student.incorect ?? student.incorrect ?? 0),

      userId: student.user_id || student.telegram_id || student.userId || "",
    });
  });

  const header = resultsSheet.getRow(1);

  header.font = {
    bold: true,
  };

  header.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  resultsSheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  // =========================
  // 2. STATISTIKA
  // =========================

  const statsSheet = workbook.addWorksheet("Statistika");

  statsSheet.columns = [
    {
      header: "Baho",
      key: "grade",
      width: 15,
    },
    {
      header: "Soni",
      key: "count",
      width: 12,
    },
    {
      header: "Foiz",
      key: "percent",
      width: 15,
    },
    {
      header: "Grafik",
      key: "bar",
      width: 25,
    },
  ];

  const total = students.length;

  GRADE_ORDER.forEach((grade) => {
    const count = students.filter(
      (student) => String(student.grade || student.degree) === grade,
    ).length;

    const percent = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;

    statsSheet.addRow({
      grade,
      count,
      percent: `${percent}%`,
      bar: buildProgressBar(percent),
    });
  });

  const statsHeader = statsSheet.getRow(1);

  statsHeader.font = {
    bold: true,
  };

  statsHeader.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // =========================
  // Metadata
  // =========================

  resultsSheet.insertRow(1, [`Test: ${testName}`]);

  resultsSheet.mergeCells("A1:G1");

  resultsSheet.getCell("A1").font = {
    bold: true,
    size: 16,
  };

  resultsSheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  buildResultsExcel,
  GRADE_ORDER,
  buildProgressBar,
};
