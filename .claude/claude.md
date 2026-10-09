# CLAUDE.md

Bu fayl Claude Code (terminal) uchun yo'riqnoma. Ish boshlashdan oldin to'liq o'qib chiq.

> Bajarilishi kerak bo'lgan ishlar `TASKS.md` da. Foydalanuvchi "topshiriqlarni bajar" desa, shu fayldan boshla.

## Loyiha haqida

Telegram **test (quiz) bot**i. Adminlar/CEO bot orqali test yaratadi (web-app orqali), o'quvchilar javob topshiradi, bot natijalarni Excel qilib yuboradi, sertifikat tarqatadi. Bot o'zi faqat "oyna": barcha ma'lumot **tashqi backend REST API**da saqlanadi (`BACKEND_URL`), test yaratish/topshirish esa alohida **sayt**da (`SITE_URL`, Telegram `web_app` tugmasi orqali ochiladi).

- Til: JavaScript (CommonJS, `require`), Node.js 18+ (global `fetch`, `FormData`, `Blob` ishlatiladi)
- Kutubxonalar: `node-telegram-bot-api` (polling), `exceljs`, `dotenv`
- Interfeys tillari: `uz` (default), `ru`, `en`
- Kod izohlari va foydalanuvchiga ko'rinadigan xabarlar asosan **o'zbekcha**. Yangi izoh/xabarlarni ham o'zbekcha yoz.

> Eslatma: arxivda `package.json` yo'q edi (faqat `src/`). Agar repoda yo'q bo'lsa, `npm init -y && npm i node-telegram-bot-api exceljs dotenv` bilan yarat va `"start": "node src/index.js"` skriptini qo'sh.

## Buyruqlar

```bash
npm install            # bog'liqliklarni o'rnatish
node src/index.js      # botni ishga tushirish (yoki: npm start)
node --watch src/index.js   # development: fayl o'zgarsa qayta ishga tushadi
node --check src/<fayl>.js  # tez sintaksis tekshiruvi
```

Test/lint hozircha yo'q. O'zgartirishdan keyin kamida `node --check` va botni ishga tushirib `✅ Telegram bot ishga tushdi` chiqishini tekshir.

## Muhit o'zgaruvchilari (`.env`)

| Nom | Majburiy | Izoh |
|---|---|---|
| `BOT_TOKEN` | ha | BotFather tokeni |
| `CEO_ID` | ha | CEO Telegram ID (raqam) |
| `BACKEND_URL` | ha | Backend manzili (to'g'ri URL) |
| `SITE_URL` | ha | Web-app sayti manzili |
| `CHANNEL_ID` | yo'q | Majburiy obuna kanali (bo'sh bo'lsa tekshiruv o'chiq) |
| `CHANNEL_URL` | yo'q | Kanal havolasi |
| `DEFAULT_ADMINS` | yo'q | Vergul bilan ajratilgan admin ID lar |
| `NODE_ENV` | yo'q | `development` bo'lsa qo'shimcha warn loglar |

`config/env.js` ishga tushishda tekshiradi (`validateEnv`). **`.env` ni hech qachon commit qilma va ichidagi qiymatlarni chiqarib yozma.** Yangi o'zgaruvchi qo'shsang `requiredEnvVariables` va `env` obyektini yangila.

## Tuzilma (`src/`)

```
index.js                 kirish nuqtasi: env tekshiruv → commands/callbacks/messages ro'yxatdan o'tkazish → graceful shutdown
config/env.js            env o'qish va validatsiya
bot/bot.js               TelegramBot instance (polling: true)
bot/commands/            /start /myid /test /language /admin /removeadmin /admins /help
bot/callbacks/           inline tugmalar (callback_query) — prefiks bo'yicha routing
bot/handlers/messages.js reply-keyboard matnlari + Excel fayl qabul qilish (state asosida)
bot/handlers/payments.js Telegram Stars to'lov handlerlari (pre_checkout, successful_payment)
bot/actions/             biznes-oqim funksiyalari (testlar ro'yxati, to'xtatish, invoice, obuna...)
bot/menus/               klaviaturalar (asosiy menyu, test paneli)
bot/helpers/             xabar matnini formatlash
services/                backend API chaqiruvlari (api.service.js — umumiy fetch wrapper)
store/                   xotiradagi (in-memory) saqlagichlar: admin, til, state
utils/                   roles, test normalizatsiya, URL builder, markdown escape
excel/results.js         natijalar Excel faylini yasash (exceljs)
i18n/                    uz.js, ru.js, en.js + t() funksiyasi
```

## Rollar

- **CEO**: `CEO_ID` ga teng foydalanuvchi. Admin qo'sha/o'chira oladi.
- **Admin**: `admin.store` (xotirada) yoki `DEFAULT_ADMINS`. Test yarata/boshqara oladi.
- **Oddiy foydalanuvchi**: aktiv testlarni ko'radi, natija/sertifikat uchun saytga o'tadi.
- Tekshiruv: `utils/roles.js` → `isCEO`, `isAdmin`, `isAdminOrCEO`.

## callback_data sxemasi

`test:new`, `test:list`, `test:back`, `test:show:<id>`, `test:stop:<id>`, `test:excel:<id>`, `test:pending:<id>`, `test:certificate:<id>`, `test:certificate-status:<id>`, `lang_<uz|ru|en>`, `check_sub`.

- Telegram `callback_data` limiti **64 bayt** — uzun ID/payload qo'shma.
- Yangi tugma qo'shsang: tegishli `bot/callbacks/*.callback.js` ichida shartni qo'sh va `bot/callbacks/index.js` router prefiksiga mos kel.
- Har doim `safeAnswer(bot, query.id, ...)` bilan javob ber (spinner qotib qolmasligi uchun).

## Backend endpointlari (bot ishlatadi)

- `GET /test?admin_id=<id>` — foydalanuvchi testlari; `GET /test?sort_by=ACTIVE` — aktivlar; `GET /test/:id`
- `GET /test/pennding/:id` — statusni PENDING qiladi (**"pennding" imlosi backendda shunday — o'zgartirma**)
- `POST /rash/stop/:id` (header `user-id`) — testni to'xtatib natija qaytaradi
- `GET /rash/test/:id` — topshirishlar soni
- `POST /rash/sendmessage/:examId`, `POST /rash/sendmessage/retry/:examId`, `GET /rash/exam/:examId/certificate-status`
- `POST /test/import-excel` (multipart: `file`, `test_id`, `user_id`)
- `POST /users`, `POST /payments/telegram-stars`

Backend javob shakli turlicha bo'lishi mumkin (`data`, `tests`, `result`, massiv). `utils/test.js` dagi `normalizeTests`, `getTestId`, `getTestOwnerId` ni ishlat, to'g'ridan-to'g'ri maydonga tayanma.

## Kod yozish qoidalari

- CommonJS (`require`/`module.exports`), ES module'ga o'tkazma.
- Backendga so'rov faqat `services/` orqali, `api.service.js` wrapper bilan (`get/post/patch/remove`). Handler ichida to'g'ridan-to'g'ri `fetch` yozma (`user.service.js` va `excel.service.js` bundan mustasno — ular alohida sabab bilan shunday).
- Foydalanuvchiga ko'rinadigan matnni `i18n/uz.js`, `ru.js`, `en.js` **uchala**ga bir xil kalit bilan qo'sh va `t(chatId, "kalit", {o'zgaruvchi})` orqali ishlat. Hozir ba'zi matnlar hardcode qilingan — yangi kodda shunday qilma.
- `parse_mode: "Markdown"` bilan foydalanuvchi matni (test nomi va h.k.) yuborilsa `escapeMarkdown()` dan o'tkaz.
- Test egaligi: test ustida amal (to'xtatish, tahrirlash, Excel) oldidan `getTestById(testId, userId)` (ichida `assertTestOwner`) chaqir.
- Xatolarni `try/catch` bilan ushla, `console.error` qil va foydalanuvchiga tushunarli xabar yubor. Bot jarayoni yiqilmasligi kerak.
- Mavjud uslubga (bo'sh qatorlar, ikkilik qo'shtirnoq, nuqtali vergul) moslash. Keraksiz refaktor qilma.

## Ma'lum muammolar (kod o'qilganda topildi)

Bularni so'ralmaguncha o'zboshimchalik bilan o'zgartirma, lekin tegishli joyga tegsang eslat:

1. **To'lov handleri ulanmagan.** `bot/handlers/payments.js` (`registerPaymentHandlers`) `src/index.js` da chaqirilmaydi, `sendCreateTestInvoice` ham hech qayerdan ishlatilmaydi. To'lov oqimi hozir faol emas.
2. `successful_payment` ichida validatsiyalar (tur, foydalanuvchi, valyuta `XTR`, summa) **izohga olingan**, va `savePayment()` chaqirilmaydi. Invoice summasi `1`, izohdagi tekshiruvda `10` — nomuvofiq.
3. `test:pending:<id>` va `test:certificate:<id>` callbacklarida egalik (`getTestById`) tekshirilmaydi. Boshqalarda tekshiriladi.
4. `bot/helpers/result-message.js`: `result?.new_students.length` — `new_students` bo'lmasa xato beradi (`?.` yetishmaydi).
5. `excel/results.js` ichida `algebra` va `geometriya` ustunlari qattiq yozilgan (hardcode).
6. `store/` — admin, til, state **xotirada**. Bot qayta ishga tushsa qo'shilgan adminlar (`/admin` orqali) va tanlangan tillar yo'qoladi; doimiy adminlar uchun `DEFAULT_ADMINS` ishlat. Til `chatId` bo'yicha saqlanadi.
7. `test.callback.js` va `test.service.js` da debug loglar bor (`console.log(1)`, `STOP TEST:` ...). `bot/callbacks/index.js` ham har callbackni logga yozadi.
8. Callback router `lang:` / `sub:` prefikslarini kutadi, lekin haqiqiy tugmalar `lang_uz` / `check_sub` ishlatadi — ular faqat oxirgi "umumiy zanjir" orqali ishlaydi.
9. `checkSubscription` (majburiy obuna) yozilgan, lekin hech qayerda chaqirilmaydi. `commands/index.js` da ishlatilmaydigan importlar bor.
10. Bo'sh papkalar: `bot/payments/`, `constants/`.

## Ish tartibi (Claude uchun)

1. O'zgartirishdan oldin tegishli fayllarni o'qi, taxmin qilma.
2. Kichik, maqsadli o'zgarishlar qil; bitta vazifa — bitta mantiqiy o'zgarish.
3. Tokenlar, `.env`, foydalanuvchi ID larini kodga yozma va javobda ko'rsatma.
4. Backendga ta'sir qiladigan (to'xtatish, sertifikat yuborish, to'lov) kodni haqiqiy backendga qarshi ishga tushirib sinama — avval foydalanuvchidan so'ra.
5. Ish tugagach: nima o'zgargani, qaysi fayllar, qanday tekshirilgani haqida qisqa hisobot ber.
