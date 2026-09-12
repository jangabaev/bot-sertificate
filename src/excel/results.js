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

  const students =
    result?.new_students ||
    result?.students ||
    result?.results ||
    result?.data ||
    [];

  const sortedStudents = [...students].sort(
    (a, b) =>
      Number(b.total_ball ?? b.score ?? 0) -
      Number(a.total_ball ?? a.score ?? 0),
  );

  const resultsSheet = workbook.addWorksheet("Natijalar");

  // Eng ko'p savollar sonini aniqlaymiz
  const questionCount = Math.max(
    0,
    ...students.map((student) =>
      Array.isArray(student.test) ? student.test.length : 0,
    ),
  );

  // Asosiy ustunlar
  const columns = [
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
      header: "algebra",
      key: "algebra",
      width: 18,
    },
    {
      header: "geometriya",
      key: "geometriya",
      width: 18,
    },
    {
      header: "Ball (%)",
      key: "score",
      width: 14,
    },
  ];

  // Savollar uchun dinamik ustunlar
  for (let i = 1; i <= questionCount; i++) {
    columns.push({
      header: String(i),
      key: `q${i}`,
      width: 7,
    });
  }

  // Oxirgi ustun
  columns.push({
    header: "algebra",
    key: "algebra",
    width: 18,
  });

  columns.push({
    header: "geometriya",
    key: "geometriya",
    width: 18,
  });

  columns.push({
    header: "User ID",
    key: "userId",
    width: 18,
  });

  resultsSheet.columns = columns;

  // Studentlarni yozamiz
  sortedStudents.forEach((student, index) => {
    const row = {
      index: index + 1,

      name:
        student.name ||
        student.full_name ||
        student.fio ||
        student.username ||
        "Noma'lum",

      grade: student.grade || student.degree || "-",

      algebra: student?.algebra ?? "--",
      geometriya: student?.geometriya ?? "--",
      score: Number(
        student.total_ball ?? student.score ?? student.percent ?? 0,
      ),

      userId: student.user_id || student.telegram_id || student.userId || "",
    };

    // Har savol javobini 1/0 qilib yozamiz
    for (let i = 0; i < questionCount; i++) {
      row[`q${i + 1}`] = Array.isArray(student.test)
        ? Number(student.test[i] ?? 0)
        : 0;
    }

    resultsSheet.addRow(row);
  });

  // Test nomi
  resultsSheet.insertRow(1, [`Test: ${testName}`]);

  const lastColumn = resultsSheet.columnCount;

  resultsSheet.mergeCells(1, 1, 1, lastColumn);

  resultsSheet.getCell("A1").font = {
    bold: true,
    size: 16,
  };

  resultsSheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // Header 2-qator
  const header = resultsSheet.getRow(2);

  header.font = {
    bold: true,
  };

  header.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  resultsSheet.views = [
    {
      state: "frozen",
      ySplit: 2,
    },
  ];

  // Savol javoblarini markazga qo'yamiz
  for (let i = 1; i <= questionCount; i++) {
    resultsSheet.getColumn(`q${i}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  }

  // =========================
  // STATISTIKA
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

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  buildResultsExcel,
  GRADE_ORDER,
  buildProgressBar,
};
