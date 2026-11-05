# TicketDesk

Help-desk ticketing tool (Zoho Desk style) for HRMS, AI BOT and any other product.

- **Frontend:** React 18 + TypeScript + Vite (`frontend/`)
- **Backend:** NestJS 10 + TypeORM (`backend/`)
- **Database:** MySQL (`ticket_tool`)

## Run it

You need Node.js 18 or later and MySQL running (XAMPP works).

```bash
# 1. Backend: http://localhost:4000/api
cd backend
cp .env.example .env      # skip if .env already exists; set DB_* to match your MySQL
npm install
npm run start:dev

# 2. Frontend: http://localhost:5173
cd frontend
npm install
npm run dev
```

On first start the backend:

1. creates the `ticket_tool` database if it does not exist,
2. upgrades a database from an older version (`backend/src/config/migrate-legacy.ts`): renames `categories` → `modules` and
   `tickets.category_id` → `module_id` keeping their data, widens `tickets.ticket_no`, adds the `super_admin` role and makes the
   first admin a super admin,
3. creates the tables from the entities (`DB_SYNCHRONIZE=true`),
4. fills any empty master table and adds the starting employees (`SEED_ON_START=true`, data in `backend/src/database/seed/seed.data.ts`).

| Employee | Sign in / password | Access | Client products · role priority |
|---|---|---|---|
| Cogitrex | cogitrex@gmail.com / cogitrex | Super admin | — (sees everything) |
| Jaswanth | jaswanthpappala3@gmail.com / jaswanthpappala3@gmail.com | Employee | AI BOT · Sakku P1 |
| Mohan | mohan123@gmail.com / mohan123@gmail.com | Employee | HRMS · Sakku P1, HRMS · Google P1 |

Change these passwords in **Masters › Employees** before going live. For production, set `DB_SYNCHRONIZE=false` and a long random `JWT_SECRET`.

`npm run db:reset` (in `backend/`) deletes every ticket and employee but keeps clients, products, client products & SLA, modules, ticket types, priorities and statuses. Start the backend afterwards to recreate the tables and the starting employees.

## Clients, products and SLA

- **Clients** (Masters › Clients) are the companies you support, e.g. Sakku and Google. Each has a short code (up to 10 letters
  or numbers) used in ticket numbers.
- **Products** (Masters › Products) are what you build, e.g. HRMS and AI BOT. Each has a short code too.
- **Client-Product Map** (Masters › Client-Product Map) maps a product to a client: HRMS for Sakku, HRMS for Google.
  Tickets can only be raised for a mapped pair. Each mapping can have its own SLA hours per ticket priority
  (e.g. Sakku · HRMS · Urgent = 1h response / 2h resolution). A priority without its own hours uses the hours from
  Masters › Priority & SLA. The hours that applied are saved on the ticket (`sla_response_hrs`, `sla_resolve_hrs`) and set its due date.
- **Modules** (Masters › Modules, formerly Categories) are parts of a product: HRMS → Attendance, Payroll, Payslip.
- **Ticket types** (Masters › Ticket types): Incident, Change Request, Blocker, Bug, User Request. One is the default.
- **Ticket numbers** look like `TKT-SAKKU-HRMS-11/26/00042`: client code, product code, month/year raised, then the ticket's id.
  Tickets raised before this version keep their old `TKT-2026-00001` numbers and have no client.

## Access: super admin, admin, employee

| | Super admin | Admin | Employee |
|---|---|---|---|
| Masters | Manages all | — | — |
| Tickets they can see | All | Their client products, plus their own | Their client products, plus their own |
| Dashboard | Everything; can narrow by client and product | Their client products; can narrow by client and product | Their own tickets (assigned to, raised or logged by them); can narrow by client and product |
| Reopen a closed ticket | Yes | Yes | No |

- An admin or employee is assigned to one or more **client products** (e.g. Mohan works on HRMS for Sakku and HRMS for Google)
  and sees all of them in one login. The Client and Product filters on the ticket list and dashboard narrow to one.
- In each client product they have a **role priority**: 1 is the most senior, then 2, 3, 4…
- Each ticket priority has an **Assign to role priority** (Masters › Priority & SLA). The defaults: Urgent and High → P1, Medium → P2, Low → P3.
  Create Ticket suggests the matching employee of the chosen client product.
- **Masters › Employees › By client product** shows each client product with its employees grouped by role priority.

## User contacts and informing users

- **Masters › User Contacts** lists the people who use each client product: name, username (their login in the product),
  email and WhatsApp number (with country code, e.g. 919876543210). Each needs an email or a number.
- A ticket raised from the HelpX widget is linked to the contact with the same username in that client product
  (or the same email). If nobody matches, pick the contact under **User contact** in the ticket's Properties.
- **Inform user** on the ticket page: tick the contacts, choose Email and / or WhatsApp, start from the Assigned or Resolved
  text (`{name}` becomes each contact's name), Submit. Every message is listed under the panel and in History.
- Mail and WhatsApp settings are in `backend/.env` (`MAIL_*`, `WATI_*`, see `.env.example`). Until they are filled in,
  messages are saved as "Not sent — not set up" and nothing goes out.

## HelpX widget (raise tickets from inside an application)

1. **Masters › Client-Product Map › Script** shows the embed line for that client product, e.g.
   `<script src="http://localhost:4000/static/helpx-bot/helpx-bot.js?appClientId=7f5b…&productName=HRMS"></script>`.
   `appClientId` is a random key per client product (created automatically); it decides which client and product the ticket
   belongs to. Keys from older versions were per product and no longer work: copy the new script into each application.
2. Paste it into the application's `index.html`. A round button appears bottom-right.
3. Clicking it takes a screenshot of the visible page and opens **Raising Ticket**: Retake / Add screenshot, Subject, Description,
   Upload, Include screenshot, Type (the active ticket types from Masters › Ticket types), Submit Ticket.
4. The ticket is saved with source `widget` and the response is
   `{ organization, ticketId, createUser, createdAt, application, subject, description, type }`.
   The page also receives it as a `helpx:ticket-created` window event.

Optional: after the application's own login, call `window.HelpXBot.identify({ username, email })` so the form does not ask for them.

The script lives in `backend/public/helpx-bot/helpx-bot.js`; the public API is `GET /api/widget/config` and `POST /api/widget/tickets`.
Screenshots use html2canvas, loaded from cdn.jsdelivr.net when the button is first clicked.

## Folder layout

```
backend/src
├── main.ts, app.module.ts
├── config/                 database.config.ts, ensure-database.ts
├── common/                 base entity & repo, guards, decorators, filters, utils
├── database/seed/          seed.data.ts, seed.service.ts
└── modules/
    ├── auth/               auth.controller/service/module, jwt.strategy
    ├── dashboard/          dashboard.controller/service/module
    ├── tickets/            ticket.entity/repo/service/controller/module + reply, history, attachment entities
    └── masters/
        ├── client/         client.entity.ts, client.repo.ts, client.service.ts,
        │                   client.controller.ts, client.module.ts, dto/
        ├── product/        (same pattern)
        ├── client-product/ client-product.entity.ts, client-product-sla.entity.ts, … (mapping + SLA + widget key)
        ├── module/         module.entity.ts (class ModuleMaster, table modules), …
        ├── ticket-type/
        ├── priority/
        ├── status/
        └── employee/       employee.entity.ts, employee-assignment.entity.ts, employee.repo.ts,
                            employee.service.ts, employee.controller.ts, employee.module.ts, dto/

frontend/src
├── app/                    app-routes.tsx, protected-route.tsx
├── layout/                 app-layout.tsx, sidebar.tsx, topbar.tsx
├── styles/                 tokens.css, base.css, components.css, layout.css
├── shared/
│   ├── services/           api.service.ts (the only place that calls axios), crud.service.ts
│   ├── components/         button, data-table, drawer, chip, form/…
│   ├── context/            theme, toast
│   └── hooks/, utils/, types/
└── modules/
    ├── auth/               login.tsx, auth.service.ts, auth-context.tsx
    ├── dashboard/          dashboard-view.tsx, dashboard.service.ts, components/
    ├── tickets/            ticket-list.tsx, ticket-form.tsx, ticket-detail.tsx, ticket.service.ts, components/
    └── masters/
        ├── client/         client-view.tsx, client-form.tsx, client.service.ts, client.types.ts
        ├── product/        (same pattern)
        ├── client-product/ (same pattern) + integration-script-dialog.tsx
        ├── module/
        ├── ticket-type/
        ├── priority/
        ├── status/
        └── employee/       employee-view.tsx, employee-form.tsx, organization-employees-view.tsx,
                            employee.service.ts, employee.types.ts, components/
```

Module services never call axios directly. They call the shared `apiService`:

```ts
// modules/tickets/ticket.service.ts
create: (payload: CreateTicketPayload) => apiService.post<TicketDetail>('/tickets', payload),
```

`apiService` adds the login token, turns server errors into one readable message, and signs the user out on 401.

## API

All routes start with `/api` and need `Authorization: Bearer <token>`, except login.

| Method | Route | Purpose |
|---|---|---|
| POST | /auth/login | Sign in, returns token |
| GET | /auth/me | Current user |
| GET | /dashboard/summary?days=14&clientId=&productId= | Dashboard figures for the user's scope |
| GET | /tickets | List (search, clientIds, productIds, ticketTypeIds, statusIds, priorityIds, assignee, view, overdue, from, to, page, sortBy) |
| GET | /tickets/counts | Counts for the quick-view tabs |
| GET | /tickets/:ticketNo | Ticket with replies, files, history (URL-encode the `/` in the number) |
| POST | /tickets | Create |
| PATCH | /tickets/:id | Update (writes history) |
| PATCH | /tickets/bulk | Update many |
| POST | /tickets/:id/replies | Reply or internal note |
| POST | /tickets/:id/notify | Inform user contacts (`contactIds`, `channels`: email / whatsapp, `message`) |
| POST | /tickets/:id/attachments | Upload files (multipart `files`) |
| GET | /tickets/attachments/:id/download | Download a file |
| GET/POST/PATCH | /masters/{clients,products,client-products,contacts,modules,ticket-types,priorities,statuses,employees} | Masters; writes are super-admin-only |
| GET | /masters/employees/by-organization | Each client product with its employees by role priority |
| PATCH | /masters/…/:id/active | Activate / deactivate |
