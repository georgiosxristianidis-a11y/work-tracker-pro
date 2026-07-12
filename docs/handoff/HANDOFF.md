# 🗂️ WORK TRACKER PRO — HANDOFF (карточный протокол)

> **Агент, читай так:** ① эта шапка → ② `AGENTS.md` (правила, обязательны) → ③ ТОЛЬКО твоя карточка. 
> **Запрещено:** читать файлы вне вайтлиста карточки, сканировать репо, «улучшать заодно». Одна сессия = одна карточка.

| | |
|---|---|
| **Проект** | Work Tracker Pro · PWA учёта рабочих часов |
| **Код** | `C:/Users/Zephyrus/Downloads/qBit/work-tracker-pro` · git: ветка `fixes/p0` (база `main`), дерево чистое |
| **Стек** | React 19 · Vite 6 · Tailwind v4 · Zustand · IndexedDB · Supabase (RLS+anon auth) · Gemini через `/api/insight` |
| **Аудит** | P0: 2026-07-05 · ядро/архитектура: 2026-07-10 (Fable 5, пре-деплой) |
| **Ворота после каждой карты** | `npm run lint && npm run build` (+ указанный в карте verify) → коммит |

**Прогресс:** 🟩 P0-0…P0-3 · 🟨 P0-4 (Supabase ✅ · Vercel env — при деплое) · 🟩 D1 · ⬜ D2 · 🟩 D3 · 🟩 P1-1 · 🚀 ДЕПЛОЙ · ⬜ P1-2 · ⬜ D4 · ⬜ P2-1 · ⬜ P2-2 · ⬜ P2-3

**🚀 Деплой-гейт:** деплоить можно только после D1 + D3 + P1-1 (код) и P0-4 (руками владельца). D2 — до публичного анонса «синхронизации».

**Делегирование по критичности (решение владельца):**
- 🔴 **Fable** — ядро синка и целостность данных (всё, что может потерять/слить данные) — первым.
- 🔴 **Opus (Lead)** — второй хирург; ревью дифов Fable; замена Fable при лимитах.
- 🔵 **Sonnet 5** — точечные многофайловые багфиксы строго по списку карты.
- 🟢 **Gemini 3.5** — механика по готовой спеке: словари, массовые замены, гигиена. 
- Автор кода ≠ ревьюер. Одна сессия = одна карта.

---

## 🧑 P0-4 — Внешняя инфраструктура · ТОЛЬКО пользователь (агенты не могут)
- **🎯 Цель:** активировать серверную часть P0-1/P0-2.
- **📋 Чек-лист:**
  1. Supabase Dashboard → SQL Editor → выполнить `supabase/schema.sql` (если старая таблица `work_entries` существует — сначала `drop`, см. комментарий в файле).
  2. Supabase → Authentication → Sign In/Up → включить **Anonymous sign-ins**.
  3. Vercel → Project Settings → Environment Variables → задать `GEMINI_API_KEY` (иначе `/api/insight` вернёт 500).
- **🔍 Verify:** запись с двух разных браузеров на одну дату — обе строки живы в таблице; AI-инсайт отвечает на проде.

## 🔴 D1 — Sync v2: тихий фон + удаление в облаке · 🔴 Fable (хирургия, деплой-блокер)
- **🎯 Цель:** фоновый синк никогда не спамит тостами; удаление данных доезжает до облака.
- **🐛 Факты аудита:**
  - `useSupabaseSync.ts:26-29` — при `!supabase` показывает error-тост; вызывается interval'ом каждые 5 мин (`App.tsx:150-161`) и **каждым сохранением записи** → у пользователя без .env красный тост на каждый чих. Interval также не проверяет `navigator.onLine` → офлайн = тост-спам.
  - Удаления только локальные: `deleteEntry`/`clearMonth`/`clearAllData` не трогают облако → «Delete All Data» оставляет полную копию в Supabase (конфликт с privacy-позиционированием).
  - Автосейв редактора (`EditorModal.tsx:50-58`, debounce 600ms) на каждое изменение часов запускает полный upsert всей таблицы + тост «Entry saved».
- **📂 Файлы:** `src/hooks/useSupabaseSync.ts`, `src/App.tsx` (вызовы sync + interval), `src/components/EditorModal.tsx` (не трогать UI — только цепочку сейва), при необходимости `src/store/useAppStore.ts`.
- **📏 Правила:** сигнатура `syncWithSupabaseAction(opts?: {silent?: boolean})`; ручной тап Sync в Settings — с тостами, все фоновые вызовы — silent; interval не создавать при `!supabase`; удаление: точечный `delete().eq('user_id',uid).eq('date',date)` в deleteEntry-потоке и `delete().eq('user_id',uid)` в clearAllData; тост «Entry saved» из автосейва убрать (в модалке уже есть индикатор Database/CircleCheck); синк после автосейва — debounce ≥10с от последнего изменения. UX-поведение ручного Sync не менять.
- **✅ Done:** без .env и офлайн — ноль тостов от фона; удалённая запись исчезает из таблицы Supabase; Clear All чистит строки user_id.
- **🔍 Verify:** ворота + сценарии: (1) пустой .env → сохранить запись → тостов об ошибке нет; (2) удалить запись при работающем Supabase → строки нет в таблице; (3) ручной Sync без .env → понятный тост есть.

## 🔴 D2 — Restore из облака (или честный «Backup») · 🔴 Fable, ревью Opus
- **🎯 Цель:** «Cloud Sync» перестаёт быть push-only бэкапом без восстановления.
- **🐛 Факт аудита:** пути pull не существует; переустановка PWA = новая анонимная сессия + пустая база, данные из облака недостижимы. Продавать как «синхронизацию» нельзя.
- **📂 Файлы:** `src/hooks/useSupabaseSync.ts` (pull+merge по `updated_at`), `src/components/SettingsScreen.tsx` (кнопка Restore / переименование), `src/hooks/useTranslation.ts`.
- **📏 Правила:** ЛИБО (a) restore: pull всех строк user_id при ручной команде + merge (новее побеждает по updated_at), ЛИБО (b) если restore откладываем — переименовать «Cloud Sync» → «Cloud Backup» во всех трёх языках. Вариант выбирает владелец перед сессией. Помнить: анонимный uid не переживает чистку браузера — для настоящего мультидевайса позже нужен sign-in (email OTP) — НЕ делать в этой карте, только заметка.
- **✅ Done:** (a) restore возвращает данные на чистой установке при живой сессии; или (b) в UI нигде нет слова Sync без Backup.
- **🔍 Verify:** ворота + ручной сценарий restore.

## 🔵 D3 — Пакет точечных багфиксов ядра · 🔵 Sonnet 5 (строго по списку)
- **🎯 Цель:** закрыть найденные аудитом баги. НИЧЕГО сверх списка.
- **📋 Список (файл → фикс):**
  1. `src/components/CalendarScreen.tsx:76` — `new Date().toISOString().split('T')[0]` даёт UTC-«сегодня» (ночью в GR/RU подсвечен вчерашний день) → собрать строку из локальных getFullYear/getMonth/getDate.
  2. `CalendarScreen.tsx:52` — `{hours && hours > 0 && (...)}` рендерит текст «0» при hours===0 → `{hours > 0 && (...)}`.
  3. `CalendarScreen.tsx:116,119,163,166` (+ аналог в HomeScreen, если есть) — `setViewDate(new Date(viewDate.setMonth(...)))` мутирует Date в сторе → `const d = new Date(viewDate); d.setMonth(d.getMonth()±1); setViewDate(d)`.
  4. `src/App.tsx` — удалить мёртвое: `syncQueue`/`setSyncQueue`, `isSyncing`/`setIsSyncing`, неиспользуемые `setEntries`/`setYearEntries` из деструктуризации, `handleEditorSave` + проп `saveEntry` у CalendarScreen (никогда не вызывается; убрать и из интерфейса CalendarScreenProps), неиспользуемые импорты (`supabase`, `Entry`, `ChevronLeft`, `Logo`, `useMemo`, `useRef`, `DOW_NAMES` — проверить каждый).
  5. `App.tsx:272-279` — `toggleTheme`: убрать ручные `document.documentElement.className` и `db.setSetting` (store `setSettings` уже делает оба).
  6. `App.tsx:106` — убрать искусственный `setTimeout(...,1200)` сплэша → `setIsLoading(false)` сразу после загрузки.
  7. `App.tsx:421` — `EditorModal` получает `haptic={haptic}` → `haptic={h}` (вибрация игнорирует настройку) — если ещё не закрыто P1-1.
- **📏 Правила:** только перечисленные строки; никакого рефакторинга вокруг.
- **✅ Done:** все 7 пунктов; `grep "syncQueue\|isSyncing\|handleEditorSave" src/` — пусто.
- **🔍 Verify:** ворота + `npx playwright test` + ручная проверка: переключение месяцев стрелками и свайпом работает, «сегодня» подсвечен верно.

## 🟠 P1-1 — Честность фич + гигиена deps · 🔵 Sonnet 5
- **🎯 Цель:** UI не обещает того, чего нет; конфиг без фантомов.
- **📂 Файлы:**
  - `src/components/SettingsScreen.tsx:94` — подзаголовок `t('E2E Encryption & Blurring')`: шифрования НЕТ → заменить на честный (`Privacy & Offline`).
  - `src/hooks/useTranslation.ts:18,138` — обновить ключ словаря (RUS/GR).
  - `src/constants.ts:34-35,56-57` — `e2eeEnabled`/`e2eeKey` пометить `@deprecated (never implemented)`, НЕ удалять (миграция настроек).
  - `vite.config.ts:60` — убрать `'html2canvas'` из `vendor-pdf` manualChunks (не прямая зависимость).
  - `src/App.tsx:421` — `haptic={h}` для EditorModal (если не закрыто в D3).
- **✅ Done:** grep `-i "e2e"` по `src/` → только deprecated-поля constants.ts.
- **🔍 Verify:** ворота; выключить Haptic Feedback → редактор не вибрирует.

## 🚀 === ДЕПЛОЙ-ГЕЙТ: D1 + D3 + P1-1 + P0-4 === 

## 🟠 P1-2 — TypeScript strict · 🔵 Sonnet 5 (итеративно)
- **🎯 Цель:** `"strict": true` в `tsconfig.json`; ошибки починены типами.
- **📂 Файлы:** `tsconfig.json`, далее ТОЛЬКО файлы из вывода `npm run lint`. Горячие точки: `(import.meta as any)` в `src/lib/supabase.ts` (→ vite-env.d.ts), `settings: any` в CalendarScreen:15-16.
- **📏 Правила:** чинить типами, не `as any`; поведенческие изменения — СТОП, доложить.
- **✅ Done:** `npm run lint` — 0 ошибок при strict.
- **🔍 Verify:** ворота.

## 🟢 D4 — i18n дыры · 🟢 Gemini 3.5 (механика по спеке)
- **🎯 Цель:** график и новые строки говорят на языке пользователя.
- **📂 Файлы:** `src/hooks/useTrends.ts:38` — `MONTH_NAMES[...]` hardcode → принимать словарь месяцев параметром (выбор по settings.language, как в `App.tsx:174-179`); `src/hooks/useTranslation.ts` — добавить в RUS/GR: 'Strict Offline Mode', 'Disable cloud sync & AI requests' и все ключи, добавленные картами D1/D2/P1-1.
- **📏 Правила:** только словари и проброс месяцев; логику не трогать.
- **✅ Done:** на RUS график показывает «Янв…Дек» (первые 3 буквы), тумблер офлайна переведён.
- **🔍 Verify:** ворота + переключение трёх языков в Settings.

## 🟡 P2-1 — Токены → @theme + семантические имена · 🔴 план Fable → 🟢 замены Gemini 3.5
- **🎯 Цель:** цвета как нативные Tailwind-утилиты; конец `bg-[var(--bg)]`-многословию.
- **📂 Файлы:** `src/index.css` (палитру в `@theme`; `--a→--accent`, `--b→--border`, `--t1..t3→--text-1..3`, `--bg-1→--surface`), затем механическая замена классов по `src/components/*` и `src/App.tsx` по карте замен, утверждённой Fable.
- **📏 Правила:** пиксель-в-пиксель; 3 темы сохраняются; контраст `--t3` на светлой теме ≥4.5:1; `maximum-scale=1`/`user-scalable=0` убрать из `index.html`.
- **✅ Done:** grep `"var(--a)"` по `src/` → 0; три темы переключаются.
- **🔍 Verify:** ворота + `npx playwright test`.

## 🟡 P2-2 — Гигиена репо · 🟢 Gemini 3.5
- **🎯 Цель:** корень без разового мусора.
- **📂 Файлы:** удалить `temp_modals.txt`, `del.cjs`, `find_emoji.cjs`, `inspect.cjs`, `rebuild.cjs`, `wrap_modals.cjs`, `test.cjs`, `test-toasts.js`, `test-motion.ts`, `selector-test.spec.ts`, `manifest.json` (корневой — сирота, манифест генерит VitePWA; НЕ трогать `public/`).
- **📏 Правила:** `scripts/`, `tests/`, все `.md` — НЕ трогать.
- **✅ Done:** `ls *.cjs` в корне — пусто.
- **🔍 Verify:** ворота + `npx playwright test`.

## 🟡 P2-3 — Производительность записи · 🔵 Sonnet 5
- **🎯 Цель:** убрать лишние транзакции и O(N)-перечтения.
- **📂 Файлы:** `src/lib/db.ts` (добавить `saveMany(entries)`/`deleteMany(dates)` одной транзакцией), `src/hooks/useQuickFill.ts` (до 31 последовательного await → batch), `src/store/useAppStore.ts` (undo-буфер → стек из N последних операций; НЕ трогать сигнатуры экшенов), `src/components/SettingsScreen.tsx:169` (debounce персистенции rate/goal — писать в db не чаще раза в 500мс).
- **✅ Done:** QuickFill месяца — 2 транзакции вместо ~60; два удаления подряд — оба «Undo» работают.
- **🔍 Verify:** ворота + playwright.

---

## 🟩 Закрытые карты (сжато — детали в Журнале и git log)
- **P0-0** `acfc3e8` — проект взят под git (раньше был ВНЕ контроля версий), ветка `fixes/p0`.
- **P0-1** `f9acf45` — ключ Gemini только в `api/insight.ts` (Vercel, `process.env`); клиент → `fetch('/api/insight')`; `@google/genai` удалён.
- **P0-2** `2a75e86` — `ensureAuth()` (анонимная сессия), upsert `(user_id,date)`, delete-all удалён, `supabase/schema.sql` + RLS.
- **P0-3** `b659440` — chaos-код вырезан полностью (App/store/Settings/public/chaos); strictOfflineMode честно отключает sync+AI.

## 🔴 MISTAKE LEDGER (живой лог — пополнять по Auto-Ledger)
```
- [🔴 API-ключ через vite define] -> ключ в клиентском бандле -> [🟢 serverless /api/insight]
- [🔴 upsert onConflict:'date' без auth] -> юзеры перетирают друг друга -> [🟢 RLS + (user_id,date)]
- [🔴 Chaos/dev-код в проде] -> SW прекэшировал chaos-скрипты юзерам (36→32 файла) -> [🟢 удалён; dev-тулзы только за import.meta.env.DEV]
- [🔴 UI-лейбл без логики (E2EE)] -> ложное чувство защиты -> [🟢 фича появляется только с кодом] (закрыто P1-1: лейбл удалён)
- [🔴 git init в C:/Users/Zephyrus вместо папки проекта] -> git сканировал весь профиль Windows, команды висли; проект был вне контроля версий -> [🟢 репо в папке проекта; домашний .git снести вручную]
- [🔴 Gemini при удалении define снёс закрытие массива plugins] -> сломанный vite.config.ts -> [🟢 после каждой правки агента: npm run lint && npm run build; диф ревьюит другая модель]
- [🔴 P0-2 убрал delete-all, но не вписал замену] -> удаления перестали доезжать до облака (расхождение данных) -> [🟢 при вырезании поведения сразу проектировать замену; карта D1]
- [🔴 Фоновый sync без silent-режима] -> error-тосты каждые 5 мин у юзеров без .env и офлайн -> [🟢 фон молчит, говорит только ручное действие; карта D1]
- [🔴 Worktree агента создан от baseline-коммита, не от fixes/p0] -> агент видит код без P0-фиксов и чужой HANDOFF; P1-1 сессия так и чинила уже починенный vite.config -> [🟢 первый шаг новой сессии: git merge fixes/p0 --ff-only в ветку worktree]
- [🔴 Карта перечисляет deps (express/dotenv), которых уже нет] -> холостые шаги в спеке -> [🟢 перед картой сверять спеку с фактическим package.json]
- [🔴 npx playwright test всем набором с дефолтными воркерами] -> ложные newPage-таймауты всех 8 тестов на этой машине -> [🟢 гонять с --workers=2; при падении сверять с baseline через git stash]
- [🔴 rocket.spec / wand.spec] -> сломаны ещё ДО правок D1/D3 (wand ищет текст «Quick Fill Calendar», которого нет в UI) -> [🟢 тест-дрифт; чинить отдельной картой, не «заодно»]
```

## 🤖 AUTO-LEDGER PROTOCOL
После закрытия карты агент обязан: добавить строку в Ledger (формат выше), отметить карту в «Прогресс», добавить строку в Журнал, закоммитить.

## 📝 Журнал работ
| Дата | Карта | Модель | Итог |
|---|---|---|---|
| 2026-07-07 | P0-0 | Fable 5 | git init в папке проекта (репо в C:/Users/Zephyrus — ошибка, проект был вне git), baseline `acfc3e8`, 100 файлов, ветка fixes/p0 |
| 2026-07-07 | P0-1 | Fable 5 | define удалён, хук → fetch /api/insight, @google/genai удалён (сервер на REST), ключа в dist нет. Попутно: чужая правка сломала синтаксис vite.config.ts — починено. Коммит `f9acf45` |
| 2026-07-07 | P0-2 | Fable 5 | ensureAuth() (анонимная сессия), upsert по (user_id,date), delete-all при пустой базе удалён, supabase/schema.sql с RLS. ⚠️ Пользователь должен применить schema.sql в Supabase и включить Anonymous sign-ins. Коммит `2a75e86` |
| 2026-07-07 | P0-3 | Fable 5 | Amnesia-листенер и Fortress-патчи удалены из App.tsx, chaos-биндинги из store, Chaos Lab UI из Settings, public/chaos/ удалён (SW прекэшировал его юзерам: 36→32 файла). strictOfflineMode остался и честно отключает sync+AI. Лейблы переименованы. Коммит `b659440` |
| 2026-07-10 | Аудит ядра | Fable 5 | Пре-деплой аудит: 5 критикалов (тост-спам фонового синка, удаления не доезжают до облака, sync без restore, UTC-«сегодня», upsert всей таблицы на каждый автосейв) + 12 рефакторов. Созданы карты D1-D4, P2-3; выставлен деплой-гейт D1+D3+P1-1+P0-4 |
| 2026-07-11 | D1 | Fable 5 | Sync v2: `syncWithSupabaseAction({silent})` — фон (interval, после сейвов) молчит и не пытается синкать офлайн; interval не создаётся при `!supabase`; тост «Entry saved» убран (индикатор в модалке остался); синк после сейва — debounce 10с; новые `deleteEntryFromCloud(date)`/`clearCloudData()` зовутся из deleteEntry/clearAllData; Undo — тихий ресинк. Ворота ✅; вживую: без .env сейв/автосейв/удаление — 0 error-тостов, ручной Sync — понятный тост. Сценарий с живым Supabase (строка исчезает из таблицы) проверить после P0-4. EditorModal не тронут |
| 2026-07-11 | D3 | Fable 5 (по решению владельца вместо Sonnet) | Все 7 пунктов: локальное «сегодня» в CalendarScreen; `{hours > 0 &&}` вместо `hours &&`; setMonth без мутации store-даты (4 места CalendarScreen + 2 HomeScreen); мёртвый код из App вычищен (syncQueue, isSyncing, setEntries/setYearEntries, handleEditorSave + проп saveEntry из CalendarScreenProps, импорты Entry/ChevronLeft/Logo/useMemo/DOW_NAMES; useRef и supabase теперь живые после D1 — оставлены); toggleTheme без ручного className/db.setSetting; сплэш без setTimeout(1200); haptic={h} у EditorModal. Ворота ✅; вживую: стрелки Home и Calendar в обе стороны, «сегодня»=11 подсвечен, «0» в клетках нет. Playwright: app/save/animations проходят; rocket+wand падали и на baseline (тест-дрифт, вне карты) |
| 2026-07-12 | P0-4 (частично) | Пользователь + Fable 5 (гид) | Supabase: старая `work_entries` дропнута, schema.sql применён (таблица `(user_id,date)` + 4 RLS-политики), Anonymous sign-ins включён. Vercel: env var НЕ задана — новый проект ещё не деплоился; старый деплой от 2026-04-08 собран до P0-1 → ключ Gemini в публичном бандле, владельцу нужно ОТОЗВАТЬ старый ключ в AI Studio и создать новый. `GEMINI_API_KEY` задать при деплое (после P1-1), затем финальный Verify (2 браузера + AI-инсайт на проде) |
| 2026-07-12 | P1-1 | Fable 5 (worktree от baseline, по старой версии карты) | E2EE-лейбл удалён из SettingsScreen целиком (новая карта предлагала замену на «Privacy & Offline» — по факту убран, честно в обоих вариантах); e2eeEnabled/e2eeKey → @deprecated; html2canvas убран из manualChunks; haptic={h} у EditorModal (совпало с D3); express/dotenv в deps уже отсутствовали. Подзаголовок возвращён как «Privacy & Offline» (все блоки Settings имеют подзаголовок — UX-консистентность), ключ словаря переименован в RUS/GR. Смержено в main вместе с fixes/p0. lint+build ✅ |
