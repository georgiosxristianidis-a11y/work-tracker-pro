# 🗂️ WORK TRACKER PRO — TASK ROUTER (Карточный протокол)

> **Правило агента:** 
> 1. Читай `AGENTS.md` (обязательные ограничения).
> 2. Бери **СТРОГО ОДНУ** карточку за сессию.
> 3. Запрещено модифицировать файлы вне списка `📂 Файлы`.
> 4. Definition of Done: `npm run gate` → exit code 0.

---

## 📋 Очередь задач: Particle Celebration VFX & Polish

### 🟩 PWA-1 — Easter Egg: 5-Tap обновление Service Worker · 🟩 ГОТОВО (2026-09-21)
- **🎯 Цель:** Добавить скрытый механизм принудительного обновления PWA при 5 быстрых тапах по лейблу версии `v{__APP_VERSION__}` в Настройках.
- **📂 Файлы:** `src/components/SettingsScreen.tsx`, `src/hooks/useTranslation.ts`
- **✅ Done:** Окно 1.5с, тактильный отклик, вызов `registration.update()` и `postMessage({ type: 'SKIP_WAITING' })`, тосты обновления/актуальности.
- **🔍 Verify:** `npm run gate` (exit 0) + Playwright верификация.

---

### 🟩 FX-2 — GLSL Curl Noise & Вихревая турбулентность · 🟩 ГОТОВО (2026-09-21)
- **🎯 Цель:** Устранить механическое прямолинейное движение частиц. Добавить органический вихревой закрут (curl/simplex noise) в вершинный шейдер перед фиксацией в глиф.
- **📂 Файлы:** `src/lib/particle-celebration.ts`
- **📏 Правила:** 
  - Никаких внешних библиотек шума. Использовать компактную GLSL-функцию 2D/3D шума (~10-15 строк в строковом литерале `VERT`).
  - Вектор шума масштабируется от максимума на старте (`uProgress < 0.5`) до 0 при сборке (`uProgress > 0.8`), чтобы символ оставался идеально чётким и читаемым.
  - Zero-overhead: не добавлять новых uniform, если можно вычислить из `pos` и `uProgress`.
- **✅ Done:** Частицы закручиваются в мягкий спиралевидный вихрь перед сборкой; в точке `uProgress = 0.8` форма символа на 100% стабильна и различима.
- **🔍 Verify:** `npm run gate` + визуальная проверка в превью/браузере.

---

### 🟩 DS-1 — Ремонт токенов палитры и Daylight-контрастности · 🟩 ГОТОВО (2026-10-11)
- **🎯 Цель:** Привести интерфейс к стандартам GIO: восстановить читаемость вторичного текста и нормализовать семантические токены.
- **📂 Файлы:** `src/index.css`, `src/components/HomeScreen.tsx`, `src/components/SettingsScreen.tsx`, `src/components/CalendarScreen.tsx`
- **📏 Правила:**
  - Токены светлой темы: `--t2: #544e43; --t3: #5e584c` для гарантированной контрастности WCAG AA (>5.6:1 на солнце).
  - Устранить вымывание цвета `opacity-40` на текстовых элементах в SettingsScreen и CalendarScreen.
  - Положительные тренды (`earningsTrend > 0` и `hoursTrend > 0`) привязаны к семантическому зеленому `var(--green)`.
- **✅ Done:** Прохождение контрастности WCAG AA, четкая читаемость при ярком дневном свете; `npm run gate` (exit 0).
- **🔍 Verify:** `npm run gate` + Playwright E2E.

---

### 🟩 UI-ROLL-1 — Универсальный одометр чисел <RollingNumber /> · 🟩 ГОТОВО (2026-09-21)
- **🎯 Цель:** Оживить отображение баланса и часов: вертикальные барабаны цифр с физикой пружины (Motion spring), цилиндрическим градиентом краев и микро-размытием при быстрой смене чисел.
- **📂 Файлы:** `src/components/RollingNumber.tsx`, `src/components/HomeScreen.tsx`
- **📏 Правила:**
  - Нулевая зависимость от внешних библиотек одометров. Использовать существующий `motion/react`.
  - Цифры разбиваются на разряды (`0..9`), каждый разряд — вертикальный столбец с `translateY` анимацией по формуле `-digit * 10%`.
  - Градиентная маска по краям (`mask-image: linear-gradient(...)`), создающая объемный эффект вращающегося барабана.
  - Не ломать доступность (`aria-label` с полным значением числа для скринридеров).
- **✅ Done:** При загрузке, смене месяца или добавлении часов цифры заработка и часов плавно и дорого прокручиваются к новым значениям.
- **🔍 Verify:** `npm run gate` + переключение месяцев на HomeScreen. PR #3 merged into main.

---

### 🟩 UI-TAPE-1 — Тактильный барабан ввода времени (Time Tape Ruler) · 🟩 ГОТОВО (2026-10-11)
- **🎯 Цель:** Заменить монотонное кликанье кнопок `[-]` и `[+]` в EditorModal на горизонтальную тактильную ленту-рулетку с инерцией и магнитным snap на каждом часе.
- **📂 Файлы:** `src/components/TimeTapeRuler.tsx`, `src/components/EditorModal.tsx`
- **📏 Правила:**
  - Горизонтальный свайп/drag с шагом 0.5h и крупными засечками на целых часах.
  - Синхронизация с `<RollingNumber />`: при скролле рулетки итоговая сумма заработка крутится в реальном времени.
  - Тактильный щелчок `haptic(8)` при переходе каждой часовой засечки.
  - Сохранение кнопок точной подстройки для доступности.
- **✅ Done:** Ввод смены в 8-12 часов выполняется за 1 свайп с приятной физической отдачей; `npm run gate` (exit 0).
- **🔍 Verify:** `npm run gate` + открытие модалки смены и свайп по ленте времени.

---

### 🟩 FX-3 — Аддитивное свечение (Additive Blending / Glow) · 🟩 ГОТОВО (2026-10-11)
- **🎯 Цель:** Сделать кульминацию Goal Reached и Personal Best неоново-яркой без тяжелых шейдеров размытия/Bloom с защитой Light темы.
- **📂 Файлы:** `src/lib/particle-celebration.ts`, `src/components/SuccessSparkles.tsx`
- **✅ Done:** В Dark/Indigo темах включен `gl.blendFunc(SRC_ALPHA, ONE)`, в Light теме сохраняется стандартная альфа против вымывания.

---

### 🟩 FX-4 — Кинетическая дисперсия с физикой разлёта (Dispersion Burst) · 🟩 ГОТОВО (2026-10-11)
- **🎯 Цель:** Заменить статичное угасание по прозрачности на динамичный импульсный разлёт искр с защитой от деления на ноль.
- **📂 Файлы:** `src/lib/particle-celebration.ts`
- **✅ Done:** Символ держится собранным 0.55с, затем плавно взрывается искрами с легкой гравитацией (`uProgress > 0.80`), без деления на ноль в GLSL.

---

### 🟩 FX-5 — Тактильная синхронизация (Haptic Feedback Pulse) · 🟩 ГОТОВО (2026-10-11)
- **🎯 Цель:** Добавить физический тактильный отклик в момент схлопывания частиц в целевой символ на смартфонах.
- **📂 Файлы:** `src/hooks/useCelebration.ts`
- **✅ Done:** Безопасный вызов `triggerHaptic` с проверкой `'vibrate' in navigator` и настроек `settings.hapticEnabled`. Zero audio noise.

---

### 🚫 FX-6 — Синтезированный аудио-клифф (Web Audio Micro-Chime) · 🚫 ОТКЛОНЕНО (2026-10-12)
- **🎯 Решение по аудиту #devil:** Отклонено в пользу строго тактильной отдачи (Haptics Only). Нулевой звуковой шум в рабочей обстановке, отсутствие проблем с Web Audio Autoplay Policy и лишних обработчиков.
- **✅ Статус:** Утверждён безопасный вибро-отклик без аудио-клиффов (`settings.hapticEnabled`).

---

## 📋 Очередь задач: Post-Calendar Polish & Core Alignment

### 🟩 ANA-1 — Analytics & Charts Elite Redesign · 🟩 ГОТОВО (2026-10-10)
- **🎯 Цель:** Модернизировать Recharts и графики до стандартов Apple Health / Fitness: плавные сплайны, градиентный акцент `var(--a)`, стабильные тултипы без сдвига верстки на тачах, карточки проекций и `tabular-nums`.
- **📂 Файлы:** `src/components/AnalyticsScreen.tsx`, `src/components/AnalyticsChart.tsx`
- **✅ DoD:** `npm run gate` (exit 0) + Lighthouse Performance >= 95 + мобильный вьюпорт (390x844). Zero-lag scrub via `isAnimationActive={false}`.

---

### 🟩 HOME-1 — Home Dashboard Elite Rhythm & Metrics Sync · 🟩 ГОТОВО (2026-10-10)
- **🎯 Цель:** Синхронизировать радиусы карточек и вертикальный ритм (`space-y-6`) с новым экраном Календаря; вывести метрику «Отработано дней» в триумвират Monthly Summary (Заработок • Часы • Дни); строгий `tabular-nums` на одометрах и счетчиках.
- **📂 Файлы:** `src/components/HomeScreen.tsx`, `src/components/DashboardWidgets.tsx`
- **✅ DoD:** `npm run gate` (exit 0) + сбалансированная 3-колоночная сводка месяца без сдвигов верстки.

---

### 🟩 THEME-1 — Dark & Indigo Palette Deep Polish (WCAG AA) · 🟩 ГОТОВО (2026-10-10)
- **🎯 Цель:** Полный аудит контрастности WCAG AA в темах Dark (`.dark`) и Indigo (`.indigo`): калибровка вторичного/третичного текста, пастельно-красного `--danger`, кнопок пресетов шторки и дней сб/вс (`opacity-75`).
- **📂 Файлы:** `src/index.css`, `src/components/CalendarScreen.tsx`
- **✅ DoD:** WCAG AA во всех темах + `npm run gate` (exit 0) + Lighthouse Accessibility >= 98.

---

### 🟩 FILL-1 — Smart Fill to Today Preset (1–Сегодня) · 🟩 ГОТОВО (2026-10-11)
- **🎯 Цель:** Добавить в Smart Fill пресет «Заполнить до сегодня (1–N)»: пропуск выходных, отсутствие записей в будущих днях месяца, моментальный расчет и 1-тап отмена через Undo-тост.
- **📂 Файлы:** `src/hooks/useQuickFill.ts`, `src/components/QuickFillModal.tsx`, `src/components/CalendarScreen.tsx`
- **✅ DoD:** `npm run gate` (exit 0) + корректное заполнение только прошедших рабочих дней месяца. PR #8 merged into main.

---

### 🟩 CAL-FLIP-1 — 3D-анимация перелистывания бейджа дней (Desk / Tear-off Flip) · 🟩 ГОТОВО (2026-10-11)
- **🎯 Цель:** Добавить кинематический эффект перелистывания настольного / отрывного календаря для счетчика отработанных дней («8 days») в шапке CalendarScreen и HomeScreen.
- **📂 Файлы:** `src/components/CalendarDaysBadge.tsx`, `src/components/CalendarScreen.tsx`, `src/components/HomeScreen.tsx`
- **✅ DoD:** 3D-перспектива 600px, поворот по оси X с физикой spring, направленность анимации (вперед при увеличении и тапе, назад при уменьшении), тактильный отклик `haptic([12, 18])` и микро-задержка 220 мс перед открытием истории. Успешный `npm run gate` (exit 0), PR #8 merged в main, релиз `v0.1.14` в проде.

---

### 🟩 BUILD-1 — Синхронизация версии приложения при bump и Vercel autobump · 🟩 ГОТОВО (2026-10-11)
- **🎯 Цель:** Обеспечить автоматическое обновление отображаемой версии при `npm run bump` в локальном dev-сервере без рестарта вручную и устранить подавление авто-деплоя релизов на Vercel.
- **📂 Файлы:** `vite.config.ts`, `.github/workflows/ci.yml`
- **✅ DoD:** `fs.readFileSync` для чтения версии без Node CJS кэша; плагин `watchPackageJson` с `server.restart()`; замена `[skip ci]` на `[skip actions]` в CI для разрешения сборки на Vercel. `npm run gate` (exit 0).

---

### 🟩 PAIR-1 — QR Cross-Device Pairing & Offline P2P Transfer · 🟩 ГОТОВО (2026-10-11)
- **🎯 Цель:** Обеспечить бесшовное сопряжение устройств и перенос данных через сканирование QR-кода без обязательного логина в облако (100% offline-first P2P).
- **📂 Файлы:** `src/lib/device-pairing.ts`, `src/components/DevicePairModal.tsx`, `src/components/QRScannerModal.tsx`, `src/hooks/useDevicePairing.ts`
- **✅ DoD:** Генерация самодостаточного payload с локальными записями при отсутствии сессии Supabase; поддержка режимов merge/overwrite; тактильный отклик; валидация структуры данных. `npm run gate` (exit 0).
