# CRM Frontend — План реализации

## Стек
- **React 18 + TypeScript + Vite**
- **Ant Design Mobile** — UI-компоненты (кнопки, модалки, формы, табы, пикеры)
- **Schedule-X (@schedule-x/react)** — библиотека календаря (MIT, mobile-first, лёгкая, поддержка дневного вида с ресурсными колонками)
- **Axios** — HTTP-клиент
- **Zustand** — стейт-менеджмент (легче Redux, достаточно для CRM)
- **React Router v6** — роутинг
- **dayjs** — работа с датами

## Структура проекта

```
frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile
├── src/
│   ├── main.tsx                  # точка входа
│   ├── App.tsx                   # роутер + AuthProvider
│   ├── api/
│   │   ├── client.ts             # Axios-инстанс с JWT-интерсептором
│   │   ├── auth.ts               # login, bootstrap
│   │   ├── bookings.ts           # CRUD бронирований
│   │   ├── services.ts           # CRUD сервисов
│   │   ├── products.ts           # CRUD продуктов
│   │   ├── customers.ts          # CRUD клиентов
│   │   ├── commissions.ts        # комиссии
│   │   ├── blocked-time.ts       # блокировка времени
│   │   └── analytics.ts          # аналитика
│   ├── stores/
│   │   ├── auth.ts               # JWT-токен, текущий юзер, роль
│   │   ├── bookings.ts           # список бронирований, фильтры
│   │   └── services.ts           # список сервисов, выбранный сервис
│   ├── pages/
│   │   ├── LoginPage.tsx         # логин
│   │   ├── CalendarPage.tsx      # ГЛАВНАЯ: дневной календарь
│   │   ├── MonthViewPage.tsx     # месячный обзор (30 дней)
│   │   ├── BookingFormPage.tsx   # создание/редактирование бронирования
│   │   ├── BookingDetailPage.tsx # детали бронирования (просмотр, закрытие)
│   │   ├── ClientsPage.tsx       # база клиентов
│   │   ├── AnalyticsPage.tsx     # аналитика (менеджеры/сервисы)
│   │   └── SettingsPage.tsx      # admin: юзеры, сервисы, продукты, комиссии
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx      # обёртка: хедер + контент + нижнее меню
│   │   │   ├── Header.tsx        # поиск, дата, иконка календаря
│   │   │   └── BottomNav.tsx     # 5 иконок по ролям
│   │   ├── calendar/
│   │   │   ├── DayCalendar.tsx   # дневной календарь (Schedule-X или кастом)
│   │   │   ├── ServiceTabs.tsx   # горизонтальные табы сервисов с иконками
│   │   │   ├── BookingCell.tsx   # ячейка бронирования (цвет, имя, pax, bold)
│   │   │   ├── BlockedTimeCell.tsx # заблокированное время (штриховка)
│   │   │   └── MonthCalendar.tsx # месячная мини-карта
│   │   ├── booking/
│   │   │   ├── BookingForm.tsx   # форма бронирования (шаг 1: клиент, шаг 2: продукт)
│   │   │   ├── CloseBookingForm.tsx # форма закрытия (instructor, soldprice_type)
│   │   │   └── BookingMessage.tsx   # сгенерированное SMS-сообщение + кнопка копирования
│   │   ├── clients/
│   │   │   └── ClientSearch.tsx  # поиск клиента по тел/имени
│   │   └── settings/
│   │       ├── UserManager.tsx   # CRUD юзеров
│   │       ├── ServiceManager.tsx # CRUD сервисов
│   │       ├── ProductManager.tsx # CRUD продуктов
│   │       └── CommissionManager.tsx # настройка комиссий
│   ├── hooks/
│   │   ├── useAuth.ts            # авторизация, роль, guard
│   │   └── useBookings.ts       # загрузка бронирований по дате/сервису
│   ├── utils/
│   │   ├── roles.ts              # ROLE enum, проверки доступа
│   │   ├── constants.ts          # ALLOWED_DISCOUNTS, CANALS, REFS, STATUSES
│   │   └── format.ts            # форматирование дат, цен
│   └── types/
│       └── index.ts              # все TS-типы (User, Service, Product, Booking, Customer...)
```

## Этапы реализации

### Этап 1: Скелет проекта
1. Инициализировать Vite + React + TS
2. Установить зависимости (antd-mobile, axios, zustand, react-router-dom, dayjs, schedule-x)
3. Настроить Axios-клиент с JWT-интерсептором (токен в localStorage)
4. Настроить Zustand-сторы (auth, bookings, services)
5. Создать AppShell (хедер + нижнее меню + роутер)
6. Создать LoginPage
7. Настроить роутинг с защитой по ролям
8. Создать Dockerfile для фронтенда (nginx)
9. Обновить docker-compose.yml

### Этап 2: Календарь (главная страница)
1. Реализовать ServiceTabs — горизонтальные табы сервисов с иконками и цветными плашками (color)
2. Реализовать DayCalendar — дневной вид:
   - Вертикаль: время от start_time до end_time сервиса, шаг 30 мин
   - Горизонталь: колонки по maxpax (инвентарь)
   - Ячейки бронирований: цвет = booking_color продукта, текст = имя + pax
   - Bold для непрочитанных (booking_reads), полупрозрачность для прошедших
   - Штриховка для blocked_time
3. Навигация по дням (< дата >) в хедере
4. Автоскролл к текущему часу
5. Клик по пустой ячейке → создание бронирования с предзаполненным временем

### Этап 3: Бронирования
1. BookingFormPage — двухшаговая форма:
   - Шаг 1: ввод тел → поиск клиента → заполнение данных клиента если нового
   - Шаг 2: выбор продукта, дата, время, pax, аванс, скидка (5/10/20/50/100), канал, комментарии
2. BookingDetailPage — просмотр бронирования:
   - Все поля (instructor не видит финансы)
   - Кнопка «Закрити» → CloseBookingForm (instructor, soldprice_type)
   - Кнопка «Скасувати» → смена статуса на 2
   - BookingMessage — сгенерированный текст + кнопка «Скопіювати»
3. POST /bookings/:id/read при открытии деталей

### Этап 4: Месячный календарь
1. MonthViewPage — сетка 30 дней
2. Зелёный = есть бронирования и ещё есть места, красный = всё занято
3. Клик по дню → переход в дневной календарь на эту дату

### Этап 5: Клиенты
1. ClientsPage — список/поиск клиентов по тел или имени
2. Карточка клиента с историей бронирований
3. Доступ: admin + manager (только клиенты своих сервисов)

### Этап 6: Аналитика
1. AnalyticsPage с двумя вкладками:
   - По менеджерам: к-сть бронирований, сумма в грн, комиссионные
   - По сервисам: к-сть турів/оренд, pax, сумма в грн
2. Фильтры: период (дата від-до), продукт, статус
3. Сравнение год-к-году (compare=1)

### Этап 7: Настройки (admin only)
1. UserManager — CRUD юзеров, привязка к сервисам
2. ServiceManager — CRUD сервисов (name, maxpax, часы работы, icon, color, HTML-шаблон)
3. ProductManager — CRUD продуктов (name, service, hours, price, type, booking_color)
4. CommissionManager — настройка % для менеджер+продукт

### Этап 8: Поиск
1. Поиск в хедере по номеру телефона
2. Результат: список бронирований клиента или карточка клиента

## API-интеграция (Backend endpoints)

```
POST   /api/auth/login          → LoginPage
POST   /api/auth/bootstrap      → начальная настройка

GET    /api/services             → ServiceTabs, SettingsPage
POST   /api/services             → ServiceManager
PUT    /api/services/:id         → ServiceManager
PATCH  /api/services/:id/active  → ServiceManager

GET    /api/products             → BookingForm, SettingsPage
POST   /api/products             → ProductManager
PUT    /api/products/:id         → ProductManager

GET    /api/bookings             → DayCalendar, MonthView (фильтры: from, to, service_id, status)
GET    /api/bookings/:id         → BookingDetailPage
POST   /api/bookings             → BookingFormPage
PUT    /api/bookings/:id         → BookingDetailPage (редактирование)
PATCH  /api/bookings/:id/status  → отмена (status=2)
PATCH  /api/bookings/:id/close   → закрытие (status=3)
POST   /api/bookings/:id/read    → BookingDetailPage (отметка прочтения)
GET    /api/bookings/:id/message → BookingMessage

GET    /api/customers            → ClientsPage, ClientSearch
POST   /api/customers            → (создаётся автоматически при бронировании)
PUT    /api/customers/:id        → ClientsPage

GET    /api/blocked-time         → DayCalendar
POST   /api/blocked-time         → DayCalendar (admin/manager)
DELETE /api/blocked-time/:id     → DayCalendar

GET    /api/commissions          → CommissionManager
POST   /api/commissions          → CommissionManager

GET    /api/analytics/managers   → AnalyticsPage
GET    /api/analytics/services   → AnalyticsPage
```

## Ключевые решения

1. **Календарь**: Попробуем Schedule-X для дневного вида. Если не подойдёт (кастомизация ячеек, maxpax-колонки) — делаем кастом на CSS Grid. Это простая матрица, не рокет сайенс.

2. **Роли в UI**: BottomNav показывает иконки по роли. Instructor видит только календарь. Manager — календарь + клиенты + аналитика + создание. Admin — всё + настройки.

3. **Финансы instructor**: API уже не возвращает финансовые поля для instructor, на фронте просто не рендерим эти поля.

4. **Оффлайн**: Не предусмотрен в ТЗ, не делаем.
