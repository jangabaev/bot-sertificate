module.exports = {
  myId: "🆔 Your Telegram ID: `{id}`",

  ceoOnly: "❌ This command is for the CEO only.",

  ceoAlreadyTop: "⚠️ CEO already has the highest permission level.",

  adminAdded: "✅ User `{id}` has been made an admin.",

  adminAddedNotify: "🎉 You have been made an admin!\n\nPress /start.",

  adminRemoved: "✅ `{id}` is no longer an admin.",

  noAdmins: "There are no admins yet.",

  adminsList: "👑 *Admin list:*\n\n{list}",

  chooseLanguage: "🌐 Choose a language:",

  languageSet: "✅ Language set to: *{lang}*",

  helpTitle: "ℹ️ *Help*\n\n",

  helpStart: "/start — Start the bot\n",

  helpMyId: "/myid — View your Telegram ID\n",

  helpTest: "/test — Create and manage tests\n",

  helpLanguage: "/language — Change language\n",

  helpCeoTitle: "\n*CEO commands:*\n",

  helpAdminAdd: "/admin <id> — Add admin\n",

  helpAdminRemove: "/removeadmin <id> — Remove admin\n",

  helpAdminsList: "/admins — Admin list\n",

  cmdStart: "Start the bot",

  cmdMyId: "View Telegram ID",

  cmdTest: "Create and manage tests",

  cmdLanguage: "Choose language",

  cmdHelp: "Help",

  chooseMenu: "Choose a menu option 👇",

  btnMakeTest: "✍️ Create test",

  btnActiveTests: "📋 Active tests",

  btnMyResults: "📜 My results",

  btnCertificatesAlt: "📜 Certificates",

  btnCertificates: "🏆 My certificates",

  btnSettings: "⚙️ Settings",

  btnCeoPanel: "👑 CEO Panel",

  btnAdminPanel: "👑 Admin Panel",

  btnPaidChannels: "📦 Paid channels",

  noActiveTests: "📭 There are no active tests right now.",

  activeTestsTitle: "📋 *Active tests:*\n\n",

  btnGoSubmit: "🌐 Go to the site and take the test",

  goToSiteResults: "📊 Go to the website to view your results:",

  btnGoSite: "🌐 Go to website",

  goToSiteCertificates: "🏆 Go to the website to view your certificates:",

  settingsText: "⚙️ *Settings*\n\nTo change language, press /language.",

  testSectionTitle: "🧪 Test section:",

  btnNewTest: "➕ New test",

  btnMyTests: "📚 My tests",

  btnBack: "⬅️ Back",

  invoiceTitle: "Create test",

  invoiceDesc: "Create a new test for 10 Telegram Stars",

  invoiceLabel: "Create new test",

  paymentAccepted: "✅ Payment accepted.",

  goToSiteCreateTest: "📝 Go to the website to create a test:",

  btnCreateTest: "🌐 Create test",

  noUserTests: "📭 You don't have any tests yet.",

  myTestsTitle: "📚 *Your tests:*",

  fetchUserTestsError: "❌ Error while loading tests.",

  fetchTestDetailsError: "❌ Error while loading test details.",

  btnStopTest: "⛔ Stop test",

  btnEditAnswer: "✏️ Edit answers",

  btnSendExcel: "📊 Submit answers via Excel",

  btnTestsList: "⬅️ Test list",

  testDetailsTitle: "🧪 *Test details*\n\n",

  labelId: "ID",
  labelName: "Name",
  labelStatus: "Status",
  labelAnswers: "Answers",
  labelSubmissions: "Submissions",

  answersNotEntered: "Not set",

  testFinished: "📊 *Test finished!*\n",

  testLabel: "📝 Test: *{name}*\n",

  totalParticipants: "👥 Total participants: *{count}*\n\n",

  gradeDistribution: "📈 *Grade distribution:*\n",

  deliveryFailed: " | ❌ Failed: *{count}*",

  top5Title: "\n🏆 *Top 5:*\n",

  excelSending: "\n📎 Sending the results Excel file...",

  excelBuildError: "⚠️ Error while creating the Excel file.",

  resultsCaption: "📊 *{name}* results",

  excelOnly: "❌ Please send an Excel file (.xlsx or .xls).",

  excelSuccess: "✅ Excel file uploaded successfully!",

  excelServerError: "❌ Server returned an error ({status}).",

  excelUploadError: "❌ Error while uploading the file.",

  subscribeText: "📢 To use the bot, please subscribe to the channel first:",

  btnGoChannel: "📢 Go to channel",

  btnCheckSub: "✅ I subscribed, check",

  checkSubSuccess: "✅ Subscription verified!",

  checkSubFail: "❌ You are not subscribed yet!",

  checkSubError: "❌ Subscription verification error.",

  ceoPanelText: "👑 *CEO Panel*\n\nNumber of admins: {count}",

  adminPanelText: "👑 *Admin Panel*\n\nYou can create tests as an admin.",

  // Task 1: Confirmation dialogs
  confirmStopTitle:
    "Are you sure you want to stop «{name}»?\n\nThe test will be stopped, results calculated, and Excel sent.\n\n⚠️ This action cannot be undone.",
  confirmPendingTitle:
    "Did the time expire for «{name}»?\n\nThe test will be moved to PENDING status.",
  btnConfirmStopYes: "✅ Yes, stop",
  btnConfirmYes: "✅ Yes",
  btnConfirmNo: "❌ No",
  actionCancelled: "❌ Cancelled.",
  pendingSuccess: "⏰ Time expired. Test status set to PENDING.",
  pendingError: "❌ Error setting test to PENDING.",
  stopTestError: "❌ Error stopping the test.",
  testNoPermission: "❌ You don't have permission for this test.",

  // Task 2: Excel validation messages
  excelOnly: "❌ Please send an Excel file in .xlsx format.",
  excelFileTooLarge: "❌ Excel file must not exceed 10 MB.",
  excelErrNotXlsx:
    "❌ Only .xlsx format is supported.\nIn Excel: «File» → «Save As» → «Excel Workbook (.xlsx)».",
  excelErrCorrupt: "❌ Could not open the file. It may be corrupted.",
  excelErrMultiSheet:
    "❌ There must be exactly 1 sheet (file has {value} sheets).",
  excelErrMerged: "❌ The file must not contain merged cells.",
  excelErrFormula: "❌ {cell}: formulas are not allowed.",
  excelErrTooLarge:
    "❌ File is too large (maximum 5000 rows and 300 question columns).",
  excelErrHeaderA1: "❌ Cell A1 must contain «F.I.O».",
  excelErrHeaderSeq:
    "❌ {cell}: header columns must be sequential integers (1, 2, 3...).",
  excelErrQuestionCount:
    "❌ Question count mismatch: file has {value}, test has {expected}.",
  excelErrExtraData: "❌ {cell}: extra data found outside header columns.",
  excelErrBadCell: "❌ {cell}: only 0 or 1 allowed (value: {value}).",
  excelErrEmptyCell: "❌ {cell}: empty cell is not allowed.",
  excelErrEmptyName: "❌ {cell}: F.I.O must not be empty.",
  excelErrDuplicateName:
    "❌ {cell}: duplicate name (also found in row {firstRow}).",
  excelErrNoStudents: "❌ At least 1 student row is required.",
  excelValidated: "✅ File validated: {questions} questions, {students} students.",
  excelErrMore: "...and {count} more errors.",
  excelErrFormatHint:
    "📋 Format: row 1: F.I.O, 1, 2, 3...; next rows: name and 0/1 values.",
};
