# AI Dental SaaS — Backend (Step 1: Core Setup)

Multi-tenant backend jahan har clinic ki apni alag MongoDB database hoti hai.

## Folder Structure
```
config/          -> Master DB aur Tenant DB connection setup
models/master/   -> Clinic, Admin, Subscription (control/billing data)
models/tenant/   -> Patient, Doctor, Appointment, Invoice, Reminder, Review
middleware/      -> resolveTenant.js (request se clinic identify karta hai)
services/        -> provisionClinic.js (naya clinic signup/create karta hai)
routes/          -> API endpoints
server.js        -> Entry point
```

## Setup (local test ke liye)

1. MongoDB install/run karein (local ya MongoDB Atlas free tier)
2. `.env.example` ko `.env` bana kar apni MongoDB URI daalein
3. Install:
   ```
   npm install
   ```
4. Run:
   ```
   npm run dev
   ```

## Test Karne Ka Tareeqa (Postman/Thunder Client)

**1. Naya clinic sign up karein:**
```
POST http://localhost:5000/api/signup
Body (JSON):
{
  "clinicName": "SmileCare Dental",
  "subdomain": "smilecare",
  "ownerEmail": "owner@smilecare.com",
  "ownerPassword": "test1234",
  "planType": "basic",
  "price": 49
}
```

**2. Appointment book karein (isi clinic ke liye):**
```
POST http://localhost:5000/api/appointments
Header: x-clinic-id: smilecare
Body (JSON):
{
  "patientId": "<pehle ek patient create karein Doctor jaisa>",
  "doctorId": "<signup se mila hua seed doctor ka id, DB se check karein>",
  "dateTime": "2026-09-20T10:00:00Z",
  "source": "chat"
}
```

> Note: Patient create karne ka route abhi add nahi hua — wo agle step mein aayega
> (Step 3: Patient Management APIs). Filhal ye sirf core multi-tenant foundation hai.

## Step 2: AI Receptionist (Chat + Voice)

Ab chat aur voice call dono ka backend add ho chuka hai (`services/aiReceptionist.js` + `routes/receptionist.js`).

**Chat widget test karna:**
```
POST http://localhost:5000/api/receptionist/chat
Header: x-clinic-id: smilecare
Body: { "sessionId": "test-1", "message": "Mujhe kal appointment chahiye" }
```
LLM khud availability check karega, patient ka naam/number poochega, aur book kar dega.

**Voice call (Twilio) setup:**
1. Twilio account banayein (twilio.com), ek phone number lein
2. `.env` mein `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` bharein
3. Twilio dashboard mein us number ka "Voice Webhook" set karein:
   `https://<aapka-deployed-URL>/api/receptionist/voice/incoming`
   (Twilio ko `x-clinic-id` header bhejne ke liye webhook URL mein query param ya
   Twilio's "Custom Parameters" use karna hoga — ye deployment ke waqt finalize karenge)
4. Call karte hi AI receptionist Roman Urdu mein baat karega aur booking kar dega

**Zaroori:** `ANTHROPIC_API_KEY` `.env` mein daalna zaroori hai, warna chat/voice dono kaam nahi karenge.

## Step 3: Reminders + Invoices

**Reminders (automatic):**
- `services/reminderScheduler.js` har 30 minute mein khud check karta hai
- Agle 24 ghanton ke saare "booked" appointments ke liye SMS + WhatsApp + Email bhejta hai
- Duplicate reminder nahi bhejta (Reminder record se track hota hai)
- `.env` mein Twilio + SMTP (Gmail App Password ya koi provider) daalna zaroori hai

**Invoice generate karna:**
```
POST http://localhost:5000/api/invoices/generate
Header: x-clinic-id: smilecare
Body: { "appointmentId": "<id>", "amount": 3000 }
```
PDF `generated-invoices/` folder mein banta hai aur URL response mein milta hai
(e.g. `http://localhost:5000/generated-invoices/invoice_<id>.pdf`)

**Invoices list dekhna:**
```
GET http://localhost:5000/api/invoices
Header: x-clinic-id: smilecare
```

## Step 4: Reviews + Clinic Dashboard

**Reviews (automatic request):**
- Appointment `status: "completed"` hone par cron job khud SMS/Email se review link bhej deta hai
- Patient link khol kar submit karta hai:
  ```
  POST http://localhost:5000/api/reviews/submit
  Header: x-clinic-id: smilecare
  Body: { "appointmentId": "<id>", "rating": 5, "comment": "Bohat acha experience!" }
  ```

**Admin Login (dashboard ke liye zaroori):**
```
POST http://localhost:5000/api/auth/login
Body: { "email": "owner@smilecare.com", "password": "test1234" }
```
(Ye wahi email/password hai jo signup ke waqt diya tha)

**Clinic Dashboard:**
- `dashboard/index.html` ko browser mein seedha khol lein (double-click)
- File ke andar `API_BASE` variable ko apne deployed backend URL se update karein
- Login karein → Overview, Appointments, Invoices, Reviews sab ek jagah dikhte hain

> Note: Patient/Doctor create karne ke dedicated UI/routes abhi nahi hain — filhal signup ke
> waqt ek seed doctor ban jata hai, aur patient AI receptionist ke through booking par khud create ho jata hai.
> Manual patient/doctor management routes agla step ho sakta hai agar chahiye.

## Step 5: Payment Gateways (Stripe + JazzCash + EasyPaisa)

Pricing config `config/plans.js` mein hai — dono markets (local PKR aur international USD) ke plans wahan defined hain.

**Stripe (international clinics):**
```
POST http://localhost:5000/api/payments/stripe/checkout
Body: { "clinicId": "<id>", "planKey": "growth" }
```
Response mein `checkoutUrl` milega — usay open karte hi Stripe ka hosted payment page khulega.
Payment complete hone par Stripe webhook (`/api/payments/stripe/webhook`) khud subscription active kar dega.

Setup zaroori:
1. Stripe account banayein (stripe.com), Dashboard se `STRIPE_SECRET_KEY` `.env` mein daalein
2. Stripe CLI ya Dashboard se webhook endpoint add karein: `<your-url>/api/payments/stripe/webhook`
3. Webhook secret (`whsec_...`) ko `STRIPE_WEBHOOK_SECRET` mein daalein

**JazzCash (local Pakistan clinics):**
```
POST http://localhost:5000/api/payments/jazzcash/initiate
Body: { "clinicId": "<id>", "planKey": "growth" }
```
Response mein `checkoutUrl` + `fields` milenge — inhe ek auto-submit HTML form banake
JazzCash checkout par POST karna hai.

Setup zaroori: developer.jazzcash.com.pk se sandbox account lein →
`JAZZCASH_MERCHANT_ID`, `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT` `.env` mein daalein.

**EasyPaisa (local Pakistan clinics):**
Isi tarah `/api/payments/easypaisa/initiate` call karein — EasyPaisa merchant portal se
`EASYPAISA_STORE_ID` aur `EASYPAISA_HASH_KEY` milenge.

> **Important:** JazzCash/EasyPaisa dono "one-time payment" gateways hain, monthly
> subscription khud recurring nahi karte jaise Stripe karta hai. Har mahine renewal ke
> liye patient/clinic ko dobara payment link bhejna hoga (WhatsApp/email se).

## Agla Step
Har mahine JazzCash/EasyPaisa renewal reminders automate karna, ya clinic ki apni
public-facing marketing website design karna — dono mein se koi bhi ho sakta hai.

## Step 6: Public Clinic Website (with embedded AI Chat)

`website/index.html` — ye woh website hai jo actual patients dekhenge (single-file, koi build step nahi chahiye).

- Hero, Services, Doctors (dynamic — `/api/clinic-info` se load hota hai), Booking CTA
- Bottom-right floating chat widget — seedha `/api/receptionist/chat` se connected hai, patients isi se book kar sakte hain

**Setup:**
1. File ke top par script mein `API_BASE` ko apne deployed backend URL se replace karein
2. `CLINIC_SUBDOMAIN` ko us clinic ke subdomain se replace karein (jo signup ke waqt diya tha)
3. Har naye clinic client ke liye is file ki copy banayein, subdomain change karein, aur unki
   apni branding (colors/logo/copy) customize kar dein — yahi asal "per-clinic website" hai
4. Deploy: Vercel/Netlify par free mein host ho sakti hai, ya clinic ke apne domain par

> Production mein subdomain automatically hostname se detect ho jayega (resolveTenant
> middleware already ye support karta hai), is liye tab `CLINIC_SUBDOMAIN` hardcode karne
> ki zaroorat nahi rahegi.

## Step 7: Patient/Doctor Management (Full CRUD)

Dashboard mein ab **Patients** aur **Doctors** tabs hain — add, edit, delete sab wahin se.

API endpoints:
```
GET/POST    /api/patients
PUT/DELETE  /api/patients/:id

GET/POST    /api/doctors
PUT/DELETE  /api/doctors/:id
```
(Sab `x-clinic-id` header ke sath, jaise baaki tenant routes)

## Agla Step
JazzCash/EasyPaisa renewal reminders automate karna — takay local clinics ka monthly
payment link har mahine khud chala jaye.

## Step 8: Doctor Self-Login Portal

Ab clinic admin, dashboard ke Doctors tab se kisi doctor ka **login set** kar sakta hai
("Set Login" link → email + password). Us ke baad doctor khud `doctor-portal/index.html`
se login kar ke:
- Apni **specialty aur working hours** edit kar sakta hai (naam/email khud change nahi kar sakta)
- Sirf **apne** appointments dekh sakta hai (dusre doctors ka data nahi)

API endpoints:
```
POST /api/doctor-auth/set-password   -> Admin isay call karta hai (doctorId, email, password)
POST /api/doctor-auth/login          -> Doctor login (email, password)
GET  /api/doctor-portal/me           -> Apni profile
PUT  /api/doctor-portal/me           -> Specialty/hours update
GET  /api/doctor-portal/appointments -> Sirf apne appointments
```

> Security note: Doctor token mein role: "doctor" hota hai, aur alag JWT verify middleware
> use hota hai jo doctor ko sirf apna data access karne deta hai — clinic admin ka data ya
> dusre doctors ka data doctor login se access nahi ho sakta.

## Sab Steps Mukammal
Dentist Website + AI Receptionist (call+chat) + Booking + Patient Management (basic) +
Reminders + Invoices + Reviews + Clinic Dashboard — core AI Dental SaaS backend ban chuka hai.

**Baaki cheezein jo production ke liye chahiye:**
- Patient/Doctor management ka poora CRUD + UI
- Payment gateway integration (Stripe/JazzCash/EasyPaisa) subscriptions ke liye
- Clinic ki apni public-facing website (abhi sirf backend + admin dashboard hai)
- Deployment (backend: Render/Railway, DB: MongoDB Atlas, dashboard: Vercel/Netlify)
