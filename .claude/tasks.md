# TASKS.md

Qo'shimcha topshiriqlar. Boshlashdan oldin `CLAUDE.md` ni o'qi. Topshiriqlarni **ketma-ket** bajar (avval 1, keyin 2), har biridan keyin `node --check` va botni ishga tushirib tekshir. Har bir topshiriq oxirida nima o'zgargani haqida qisqa hisobot ber.

---

## 1-topshiriq: "Vaqt tugadi" va "Testni to'xtatish" uchun tasdiqlash

### Muammo

Test tafsilotlari oynasida (`bot/actions/tests.js` → `sendTestDetails`) ikkita tugma bor:

- `⏰ Vaqt tugadi` → `test:pending:<id>` → darrov `setTestPending()` chaqiradi
- `btnStopTest` → `test:stop:<id>` → darrov `handleStopTest()` chaqiradi (test to'xtaydi, natijalar hisoblanadi, Excel yuboriladi)

Ikkalasi ham bitta bosishda ishlaydi. Tasodifiy bosilsa testni qaytarib bo'lmaydi.

### Kerak bo'lgan xatti-harakat

Bu ikki tugma bosilganda **darrov hech narsa qilinmasin**. Avval tasdiqlash so'ralsin:

1. Yangi xabar: test nomi bilan birga savol va ikkita tugma.
   - To'xtatish uchun: "«{name}» testini aniq to'xtatasizmi? Test to'xtatiladi, natijalar hisoblanadi va Excel yuboriladi. Bu amalni qaytarib bo'lmaydi." → `✅ Ha, to'xtatish` / `❌ Yo'q`
   - Vaqt tugadi uchun: "«{name}» testi uchun vaqt tugadimi? Test PENDING holatiga o'tkaziladi." → `✅ Ha` / `❌ Yo'q`
2. `Ha` bosilsa: eski amal bajariladi (`handleStopTest` yoki `setTestPending`).
3. `Yo'q` bosilsa: hech narsa o'zgarmaydi, tasdiqlash xabari "Bekor qilindi" ga almashadi.
4. Tasdiqlash xabaridagi tugmalar bosilgandan keyin **olib tashlansin** (`editMessageReplyMarkup` bo'sh klaviatura bilan), shunda ikkinchi marta bosib bo'lmaydi.

### Texnik talablar

- Yangi `callback_data` lar (hammasi `test:` bilan boshlansin, `test.callback.js` ichida qayta ishlansin):
  - `test:stop:<id>` → endi faqat tasdiqlash so'raydi (eski amalni bajarmaydi)
  - `test:stop-yes:<id>`, `test:pending-yes:<id>` → haqiqiy amal
  - `test:cancel:<id>` → bekor qilish
  - `test:pending:<id>` → endi faqat tasdiqlash so'raydi
- `callback_data` **64 bayt**dan oshmasin. Eng uzun variant `test:pending-yes:<id>` — ID uzunligini tekshir, kerak bo'lsa qisqartir.
- Router tekshiruvi: `data.startsWith("test:stop:")` bilan `test:stop-yes:` aralashib ketmasin (ikkinchisida `stop-yes` — `stop:` emas, lekin shartlar tartibini ehtiyotkorlik bilan tekshir).
- **Egalikni tekshir:** tasdiqlash so'ralganda ham, `yes` bosilganda ham `getTestById(testId, userId)` chaqirilsin. Hozir `test:pending` da egalik tekshirilmaydi — shu bilan to'g'rilanadi.
- **Ikki marta bosishdan himoya:** `yes` bosilganda amal tugaguncha o'sha `testId + amal` uchun xotirada (`Set`) belgi turadi; takroriy bosish e'tiborsiz qoldirilsin (to'xtatish ikki marta chaqirilmasin va Excel ikki marta ketmasin). Amal tugagach (xato bo'lsa ham) belgi olib tashlansin.
- Barcha yangi matnlar `i18n/uz.js`, `ru.js`, `en.js` ga **bir xil kalitlar** bilan qo'shilsin (masalan `confirmStopTitle`, `confirmPendingTitle`, `btnConfirmYes`, `btnConfirmNo`, `actionCancelled`). Eski hardcode qilingan `"⏰ Vaqt tugadi..."` va `"❌ Testni to'xtatishda..."` matnlarini ham i18n ga ko'chir.
- Test nomi Markdown ichida chiqsa `escapeMarkdown()` dan o'tsin.
- Mavjud `handleStopTest` va `setTestPending` ichki mantiqini o'zgartirma, faqat ularni chaqirish joyini tasdiqlash ortiga ko'chir.

### Qabul mezonlari

- [ ] `⏰ Vaqt tugadi` bosilganda backendga so'rov **ketmaydi**, tasdiqlash chiqadi.
- [ ] `Testni to'xtatish` bosilganda backendga so'rov **ketmaydi**, tasdiqlash chiqadi.
- [ ] `Yo'q` bosilsa hech narsa o'zgarmaydi.
- [ ] `Ha` ni tez-tez bir necha marta bosganda amal faqat bir marta bajariladi.
- [ ] Boshqa foydalanuvchining testi uchun callback yuborilsa rad etiladi.
- [ ] Matnlar uch tilda ham bor.

> Eslatma: `test:certificate:<id>` (sertifikat yuborish) ham qaytarib bo'lmaydigan amal, lekin bu topshiriqda so'ralmagan — unga tegma. Faqat hisobotda "xohlasangiz buni ham qo'shamiz" deb eslat.

---

## 2-topshiriq: Excel fayl formatini qattiq tekshirish

### Muammo

`bot/handlers/messages.js` da (`awaiting_excel` holati) fayl hozir faqat kengaytma (`.xlsx`/`.xls`) va hajm (10 MB) bo'yicha tekshiriladi, keyin to'g'ridan-to'g'ri backendga ketadi (`uploadExcel`). Ichidagi tarkib tekshirilmaydi, shuning uchun noto'g'ri yoki ortiqcha ma'lumotli fayl backendga yetib boradi.

### Kerakli format (foydalanuvchi bergan namuna asosida)

Namuna fayl: `Gayratdin (2).xlsx`. Uning tuzilishi:

```
        A        B   C   D  ...  (N-ustun)
1   | F.I.O  |  1 | 2 | 3 | ... | N        ← sarlavha: savol raqamlari 1..N
2   | Ism 1  |  1 | 0 | 1 | ... | 1        ← har bir o'quvchi: F.I.O + har savolga 1 yoki 0
3   | Ism 2  |  0 | 1 | 1 | ... | 1
...
```

Namunada: bitta varaq (`Лист1`), 55 ta savol, 499 ta o'quvchi qatori, formulalar yo'q, birlashtirilgan (merged) kataklar yo'q, yashirin qator/ustun yo'q.

### Tekshiruvlar (hammasi bajarilmaguncha backendga **yuborilmasin**)

**Fayl darajasi**
1. Kengaytma faqat `.xlsx`. (`exceljs` `.xls` ni o'qiy olmaydi, shuning uchun `.xls` rad etilsin va "Excel'da «Saqlash» → `.xlsx`" deb tushuntirilsin.)
2. Fayl haqiqatan xlsx: boshi `PK` (ZIP) imzosi bilan boshlansin va `exceljs` ochib o'qiy olsin (ochilmasa — "fayl buzilgan").
3. Hajm ≤ 10 MB (mavjud tekshiruv qolsin).
4. Varaqlar soni aynan **1** (bir nechta varaq bo'lsa rad etilsin, qaysi varaqni o'qishni taxmin qilma). Varaq nomi ahamiyatsiz.
5. Birlashtirilgan (merged) kataklar yo'q, formulalar yo'q (katakda formula bo'lsa rad et).
6. Himoya chegaralari: ko'pi bilan 5000 qator va 300 savol ustuni.

**Sarlavha (1-qator)**
7. `A1` — `F.I.O` (bo'shliq va katta-kichik harfga e'tiborsiz: `f.i.o ` ham o'tadi).
8. `B1`, `C1`, ... — **ketma-ket** butun sonlar `1, 2, 3, ... N`, tartib buzilmagan, tushib qolgan yoki takrorlangan raqam yo'q, orada bo'sh katak yo'q.
9. Savollar soni `N` testdagi javoblar soniga **teng bo'lishi shart**: `getTestAnswers(test).length` (testni `getTestById` bilan ol). Agar testda javoblar kiritilmagan bo'lsa (`0`), bu tekshiruv o'tkazib yuboriladi.
10. Sarlavha ustunlaridan **tashqarida** (o'ngda) hech qanday ma'lumot bo'lmasin (ortiqcha ustun, izoh, "Jami" va h.k.).

**Ma'lumot qatorlari (2-qatordan boshlab)**
11. Butunlay bo'sh qatorlar e'tiborsiz qoldiriladi (namunada Excel 500-qatorgacha format qilingan bo'lishi mumkin). Lekin kamida **1** ta o'quvchi qatori bo'lsin.
12. `A` katak — bo'sh bo'lmagan matn. Boshidagi/oxiridagi/ketma-ket bo'shliqlar **xato emas** (namunada ko'p: `"Berdiyev Ne'mat "`, `"Abdullayev Jo'shqin  (Orifjon) "`), ular faqat tekshiruv uchun `trim` qilinadi. **Faylni o'zgartirma**, backendga original buffer ketsin.
13. F.I.O lar takrorlanmasin (trim va katta-kichik harfsiz solishtirilganda). Takror bo'lsa xato, ikkala qator raqami ko'rsatilsin.
14. `B`...`N` kataklarning har biri **aynan** son `0` yoki `1` bo'lsin. Quyidagilar xato: bo'sh katak, `11`, `2`, `-1`, `0.5`, `"x"`, `"ha"`, `true/false`, sana. (Matn ko'rinishidagi `"1"` ham xato — namunada hammasi son.)
15. Qatorda ma'lumot bor, lekin `A` bo'sh bo'lsa — xato.

### Natija va xabarlar

- Yangi modul: `src/utils/excel-validator.js` (yoki `src/services/excel-validator.service.js`). Imzo:
  `validateResultsExcel(buffer, { filename, expectedQuestionCount }) → { ok, errors, stats }`
  - `errors`: `[{ code, cell, row, col, value, ... }]` — matnsiz, faqat kod va joylashuv; matnga o'girish i18n da.
  - `stats`: `{ questions, students }`
- Foydalanuvchiga **aniq katak manzili** bilan xabar ber (`AV69`, `L286` kabi Excel manzili). Ko'pi bilan **10 ta** xatoni sanab o't, qolganini "va yana N ta xato" deb yoz. Xato turlari bo'yicha qisqa tushuntirish ber ("faqat 0 yoki 1 bo'lishi kerak").
- Xato bo'lsa: `awaiting_excel` holati **saqlansin** (foydalanuvchi tuzatib qayta yubora olsin), backendga hech narsa yuborilmasin, `clearState` chaqirilmasin.
- Xato xabari oxirida to'g'ri format qisqa eslatilsin: "1-qator: F.I.O, 1, 2, 3...; keyingi qatorlar: ism va 0/1 lar".
- Muvaffaqiyatli bo'lsa: backendga yuborishdan oldin qisqa xabar (masalan "✅ Fayl tekshirildi: 55 savol, 499 o'quvchi") va keyin mavjud `uploadExcel` oqimi.
- Barcha xabarlar `i18n` da uch tilda. Kodlar bo'yicha kalitlar (masalan `excelErrNotXlsx`, `excelErrCorrupt`, `excelErrHeaderA1`, `excelErrHeaderSeq`, `excelErrQuestionCount`, `excelErrExtraData`, `excelErrBadCell`, `excelErrEmptyName`, `excelErrDuplicateName`, `excelErrNoStudents`, `excelErrMultiSheet`, `excelErrMerged`, `excelErrFormula`, `excelErrTooLarge`).
- `messages.js` dagi kengaytma tekshiruvi `.xlsx` bilan cheklansin va validator chaqiruvi `uploadExcel` dan **oldin** qo'yilsin.

### Test

Loyihada test yo'q. Node'ning o'rnatilgan `node --test` yordamida validator uchun kichik test yoz: `tests/excel-validator.test.js`. Kirish fayllarini testning o'zida `exceljs` bilan dasturiy yasa (katta fixture saqlama). Quyidagilar tekshirilsin: to'g'ri fayl o'tadi; `A1` noto'g'ri; sarlavhada raqam tushib qolgan; savollar soni mos emas; katakda `11`; bo'sh katak; ortiqcha ustun; takror F.I.O; ikki varaq; formula; buzilgan buffer.

### Haqiqiy namuna bilan tekshirish

Foydalanuvchi bergan `Gayratdin (2).xlsx` ni (aslida o'zida xatolar bor) validator **to'g'ri aniqlashi** kerak. Namunadagi kutilgan natija:

- Sarlavha to'g'ri (A1 = `F.I.O`, 1..55), 499 ta o'quvchi qatori, takror ism yo'q.
- **5 ta xato katak:** `L286` (qiymat `11`), `I412`, `U393`, `Q423`, `AV69` (bo'sh kataklar).
- Ismlardagi ortiqcha bo'shliqlar (25 qatorda qo'sh bo'shliq, bir nechtasida chetida bo'shliq) xato hisoblanmasin.

Buni tekshirish uchun foydalanuvchidan fayl yo'lini so'ra, faylni validatorga ber va chiqishni hisobotga qo'sh. Fayl repoga commit qilinmasin (ichida o'quvchilar ismlari bor).

### Qabul mezonlari

- [ ] Noto'g'ri fayl backendga **yuborilmaydi**.
- [ ] Xato xabarida aniq katak manzillari ko'rinadi.
- [ ] Xatodan keyin foydalanuvchi to'g'rilangan faylni qayta yubora oladi.
- [ ] To'g'ri fayl avvalgidek yuklanadi va original (o'zgartirilmagan) buffer ketadi.
- [ ] Namuna fayl uchun yuqoridagi 5 ta xato topiladi, boshqa xato chiqmaydi.
- [ ] `node --test` o'tadi.
