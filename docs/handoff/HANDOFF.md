# 🗂️ WORK TRACKER PRO — HANDOFF (карточный протокол)

> **Агент, читай так:** ① эта шапка → ② `AGENTS.md` (правила, обязательны) → ③ ТОЛЬКО твоя карточка. 
> **Запрещено:** читать файлы вне вайтлиста карточки, сканировать репо, «улучшать заодно». Одна сессия = одна карточка.

| | |
|---|---|
| **Проект** | Work Tracker Pro · PWA учёта рабочих часов |
| **Код** | `C:/Users/Zephyrus/Downloads/qBit/work-tracker-pro` (⚠️ src/ ещё НЕ в git) |
| **Стек** | React 19 · Vite 6 · Tailwind v4 · Zustand · IndexedDB · Supabase · Gemini |
| **Аудит** | 2026-07-05 (Fable 5) · безопасность 3/10 · код 5/10 · дизайн 6/10 |
| **Ворота после каждой карты** | `npm run lint && npm run build` (+ указанный в карте verify) |

**Прогресс:** 🟩 P0-0 · 🟩 P0-1 · 🟩 P0-2 · 🟩 P0-3 · ⬜ P1-1 · ⬜ P1-2 · ⬜ P2-1 · ⬜ P2-2
*(меняй ⬜ → 🟩 при закрытии карты и ставь дату в Журнал внизу)*

**Делегирование:** 🟢 Gemini = механика по жёсткой спеке · 🔵 Sonnet = точные правки/удаления · 🔴 Fable/Opus = безопасность, архитектура, ревью чужих дифов. Автор кода ≠ ревьюер.

---

## 🔴 P0-0 — Git baseline · 🟢 Gemini (или руками, 5 мин)
- **🎯 Цель:** весь исходник под версионным контролем ДО любых правок.
- **📂 Файлы:** `.gitignore` (проверить), всё остальное — только `git add`.
- **📏 Правила:** не коммитить `.env*`, `node_modules`, `dist`, `playwright-report`, `test-results`. Ветка `fixes/p0`.
- **✅ Done:** `git status` чистый; `git ls-files | wc -l` > 40.
- **🔍 Verify:** `git log --oneline -1` показывает коммит "chore: baseline commit of full source".

## 🔴 P0-1 — Ключ Gemini из бандла → serverless-прокси · 🔴 Fable план + 🔵 Sonnet код
- **🎯 Цель:** `GEMINI_API_KEY` никогда не попадает в клиентский JS.
- **📂 Файлы:** `vite.config.ts` (удалить блок `define`), `src/hooks/useAiInsight.ts` (fetch на `/api/insight` вместо `new GoogleGenAI` в клиенте), **новый** `api/insight.ts` (Vercel function: принимает history+lang, зовёт Gemini, возвращает text), `.env.example`, `package.json` (перенести `@google/genai` из devDeps в deps).
- **📏 Правила:** промпт AI-инсайта скопировать из useAiInsight.ts:36-44 без изменений; кэш инсайтов в хуке сохранить; никаких новых зависимостей.
- **✅ Done:** ключ читается только в `api/insight.ts` через `process.env`.
- **🔍 Verify:** `npm run build && grep -r "AIza" dist/` — пусто; AI-инсайт работает через `vercel dev`.

## 🔴 P0-2 — Supabase: auth + RLS + конфликт-ключ · 🔴 Fable (хирургия)
- **🎯 Цель:** данные пользователей изолированы; устройства не перетирают друг друга.
- **📂 Файлы:** `src/lib/supabase.ts` (anonymous sign-in при старте), `src/hooks/useSupabaseSync.ts` (upsert с `user_id`, `onConflict: 'user_id,date'`; убрать delete-all при пустой локальной базе), **новый** `supabase/schema.sql` (таблица + RLS-политики `user_id = auth.uid()`).
- **📏 Правила:** UX не менять; офлайн-режим и strictOfflineMode должны работать как раньше; ошибки — в существующий toast-механизм.
- **✅ Done:** RLS включён; в коде нет upsert по одному `date`.
- **🔍 Verify:** два разных `device_id`/анонимных юзера сохраняют запись на одну дату — обе живы в таблице.

## 🔴 P0-3 — Вырезать chaos-код из прода · 🔵 Sonnet (только удаление!)
- **🎯 Цель:** ни одна chaos-функция не исполняется у пользователя.
- **📂 Файлы:** `src/App.tsx` (body click-listener «Amnesia Recovery» стр.~108-119, блок Fortress Mode стр.~147-189), `src/store/useAppStore.ts` (`__chaos_*` биндинги стр.~98-111), `src/components/SettingsScreen.tsx` (Chaos Lab states/handlers/UI).
- **📏 Правила:** ТОЛЬКО удаление; ничего не рефакторить; `strictOfflineMode` как настройку оставить (просто отключает sync), но убрать monkey-patching fetch/XHR и CSP-инъекцию.
- **✅ Done:** `grep -r "chaos\|Paranoid\|Amnesia\|Fortress" src/` — пусто.
- **🔍 Verify:** ворота + приложение запускается, сохранение/удаление записей работает.

## 🟠 P1-1 — Честность фич + гигиена deps · 🟢 Gemini по спеке
- **🎯 Цель:** UI не обещает того, чего нет; package.json без мусора.
- **📂 Файлы:** `src/components/SettingsScreen.tsx` (убрать блок E2EE-тумблера), `src/constants.ts` (пометить `e2eeEnabled/e2eeKey` как deprecated, не удалять — миграция настроек), `package.json` (удалить `express`, `dotenv`; `html2canvas` убрать из manualChunks в `vite.config.ts`).
- **📏 Правила:** ничего кроме перечисленного; `EditorModal` в `App.tsx` должен получать `h`, а не `haptic` (однострочный багфикс — вибрация игнорирует настройку).
- **✅ Done:** в UI нет E2EE; `npm ls express` — not found.
- **🔍 Verify:** ворота + сборка без предупреждений о manualChunks.

## 🟠 P1-2 — TypeScript strict · 🔵 Sonnet итеративно
- **🎯 Цель:** `"strict": true` в tsconfig; ошибки починены; в новом коде `any` запрещён.
- **📂 Файлы:** `tsconfig.json`, далее только файлы, на которые укажет `npm run lint`.
- **📏 Правила:** чинить типами, не `as any`; если фикс требует поведенческих изменений — СТОП, доложить.
- **✅ Done:** `npm run lint` — 0 ошибок при strict.
- **🔍 Verify:** ворота.

## 🟡 P2-1 — Токены → @theme + семантические имена · 🔵 Sonnet
- **🎯 Цель:** цвета как нативные Tailwind-утилиты; конец `bg-[var(--bg)]`-многословию.
- **📂 Файлы:** `src/index.css` (перенести палитру в `@theme`, переименовать `--a→--accent`, `--b→--border`, `--t1..t3→--text-1..3`, `--bg-1→--surface`), затем механическая замена классов по `src/components/*` (можно делегировать 🟢 Gemini после утверждения карты замен).
- **📏 Правила:** визуально пиксель-в-пиксель; 3 темы сохраняются; контраст `--t3` на светлой теме поднять до ≥4.5:1; `maximum-scale=1`/`user-scalable=0` убрать из `index.html`.
- **✅ Done:** `grep -c "var(--a)" src/` — 0; скриншоты трёх тем совпадают (кроме контраста t3).
- **🔍 Verify:** ворота + `npx playwright test`.

## 🟡 P2-2 — Гигиена репо · 🟢 Gemini
- **🎯 Цель:** корень репо без разового мусора.
- **📂 Файлы:** удалить `temp_modals.txt`, `del.cjs`, `find_emoji.cjs`, `inspect.cjs`, `rebuild.cjs`, `wrap_modals.cjs`, `test.cjs`, `test-toasts.js`, `test-motion.ts`, `selector-test.spec.ts`; `playwright-report/`, `test-results/` — в `.gitignore`.
- **📏 Правила:** `scripts/`, `tests/`, все `.md` — НЕ трогать.
- **✅ Done:** `ls *.cjs` — пусто.
- **🔍 Verify:** ворота + `npx playwright test`.

---

## 🔴 MISTAKE LEDGER (живой лог — пополнять по Auto-Ledger)
```
- [🔴 API-ключ через vite define] -> ключ в клиентском бандле -> [🟢 serverless /api/insight]
- [🔴 upsert onConflict:'date' без auth] -> юзеры перетирают друг друга -> [🟢 RLS + (user_id,date)]
- [🔴 Chaos/dev-код в проде] -> листенеры и подмена fetch у юзера -> [🟢 только import.meta.env.DEV]
- [🔴 UI-тумблер без логики (E2EE)] -> ложное чувство защиты -> [🟢 фича появляется только с кодом]
- [🔴 src/ вне git] -> нет отката, агенты видят пустой worktree -> [🟢 baseline-коммит до правок]
```

## 🤖 AUTO-LEDGER PROTOCOL
После закрытия карты агент обязан добавить строку в Ledger (формат выше) и отметить карту в «Прогресс».

## 📝 Журнал работ
| Дата | Карта | Модель | Итог |
|---|---|---|---|
| 2026-07-07 | P0-0 | Fable 5 | git init в папке проекта (репо в C:/Users/Zephyrus — ошибка, проект был вне git), baseline `acfc3e8`, 100 файлов, ветка fixes/p0 |
| 2026-07-07 | P0-1 | Fable 5 | define удалён, хук → fetch /api/insight, @google/genai удалён (сервер на REST), ключа в dist нет. Попутно: чужая правка сломала синтаксис vite.config.ts — починено. Коммит `f9acf45` |
| 2026-07-07 | P0-2 | Fable 5 | ensureAuth() (анонимная сессия), upsert по (user_id,date), delete-all при пустой базе удалён, supabase/schema.sql с RLS. ⚠️ Пользователь должен применить schema.sql в Supabase и включить Anonymous sign-ins. Коммит `2a75e86` |
| 2026-07-07 | P0-3 | Fable 5 | Amnesia-листенер и Fortress-патчи удалены из App.tsx, chaos-биндинги из store, Chaos Lab UI из Settings, public/chaos/ удалён (SW прекэшировал его юзерам: 36→32 файла). strictOfflineMode остался и честно отключает sync+AI. Лейблы переименованы (Paranoid/Fortress → Strict Offline/Offline Mode) |
