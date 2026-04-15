# Smart Appointment System

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Flask](https://img.shields.io/badge/Flask-3.0-black?style=for-the-badge&logo=flask)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge&logo=firebase)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css)
![Groq](https://img.shields.io/badge/Groq-LLaMA_3.1-purple?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A production-grade, AI-powered healthcare appointment system — built to solve real hospital problems: long queues, missed appointments, and zero automation.

---

## Why This Project?

Most hospital appointment systems are just glorified Google Forms — no intelligence, no automation, no real-time feedback.

> Patients waste hours in queues without knowing their wait time.
> Doctors have no visibility into who's coming next or how long each case will take.
> Hospitals lose revenue from no-shows they never predicted.

This was built to fix all three. With AI triage, ML-based time prediction, a dynamic priority queue, and automated WhatsApp/SMS reminders — it's not a CRUD app. It's a system that actually thinks.

---

## Features

| Feature | What It Actually Does |
|---------|----------------------|
| AI Symptom Triage | Groq LLaMA 3.1 reads patient symptoms, assigns a severity score — critical cases jump the queue automatically |
| Consultation Time Prediction | RandomForest model predicts how long each appointment will take |
| No-Show Prediction | GradientBoosting model trained on 110K+ hospital records flags patients likely to miss their slot |
| Dynamic Priority Queue | Queue reorders in real-time based on severity, wait time, and emergency escalations |
| Firebase Queue Sync | On startup, all pending/confirmed appointments sync from Firestore into the live queue engine |
| WhatsApp + SMS Reminders | Twilio sends automated confirmations and emergency alerts to patients and doctors |
| OTP Password Reset | Time-limited email OTP flow via Gmail SMTP |
| Doctor Availability Management | Doctors set their own schedules; system blocks unavailable slots intelligently |
| Auto-generated PDF Reports | Medical consultation summaries generated with ReportLab, downloadable instantly |
| Payment Integration | Razorpay handles consultation fees with full order tracking |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Flask 3, Python 3.10+ |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| AI | Groq API (LLaMA 3.1) + Google Gemini |
| ML | scikit-learn — RandomForest, GradientBoosting |
| Notifications | Twilio (WhatsApp + SMS), Gmail SMTP |
| Payments | Razorpay |
| PDF | ReportLab |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| Patient | Book appointments, track live queue position, download PDF reports |
| Doctor | View today's queue, see predicted consultation times, manage schedule |
| Admin | Full analytics dashboard, manage doctors, track payments, monitor no-shows |

---

## Project Structure

```
smart-appointment-system/
├── backend/
│   ├── ml/
│   │   ├── model.py                    # RandomForest consultation time predictor
│   │   ├── noshow.py                   # GradientBoosting no-show predictor
│   │   ├── scheduler.py                # Dynamic queue engine (priority + emergency)
│   │   └── consultation_time_model.pkl # Trained model file
│   ├── routes/
│   │   ├── appointments.py             # Book, fetch, update appointments
│   │   ├── doctor_schedule.py          # Doctor availability management
│   │   ├── payments.py                 # Razorpay order creation + verification
│   │   ├── reports.py                  # PDF report generation
│   │   ├── analytics.py                # Admin analytics endpoints
│   │   ├── notifications.py            # Notification triggers
│   │   ├── otp.py                      # OTP send + verify
│   │   └── history.py                  # Appointment history
│   ├── services/
│   │   ├── whatsapp.py                 # Patient WhatsApp via Twilio
│   │   ├── doctor_whatsapp.py          # Doctor emergency WhatsApp alerts
│   │   ├── sms.py                      # SMS notifications
│   │   ├── email.py                    # Gmail SMTP OTP emails
│   │   ├── pdf_report.py               # ReportLab PDF generation
│   │   ├── scheduler.py                # Background notification scheduler
│   │   └── notification.py             # Push notification handler
│   ├── firebase/
│   │   ├── appointments.py             # Firestore appointment CRUD
│   │   ├── schedules.py                # Firestore schedule CRUD
│   │   ├── client.py                   # Firebase Admin SDK init
│   │   └── storage.py                  # Firebase Storage helpers
│   ├── app.py                          # Flask entry point + all route registration
│   └── logger.py                       # Centralized logging setup
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/                  # Admin-specific UI components
        │   ├── doctor/                 # Doctor dashboard components
        │   ├── patient/                # Patient booking + queue components
        │   └── common/                 # Shared UI (modals, cards, etc.)
        ├── pages/
        │   ├── Login.jsx
        │   ├── Signup.jsx
        │   ├── UserDashboard.jsx
        │   ├── DoctorDashboard.jsx
        │   └── AdminDashboard.jsx
        ├── firebase/config.js          # Firebase client init
        └── services/api.js             # Axios API wrappers
```

---

## ML Models

Consultation Time Predictor — `ml/model.py`
- Input: patient age, symptom severity score, doctor experience, visit type
- Model: RandomForest Regressor (pre-trained, loaded from `.pkl`)
- Output: predicted duration in minutes — shown as estimated wait time in queue

No-Show Predictor — `ml/noshow.py`
- Input: booking lead time, patient history, day of week, reminder status
- Model: GradientBoosting Classifier — trained on 110K+ real hospital records
- Output: probability score (0–1) — high-risk slots flagged for admin follow-up

Dynamic Queue Engine — `ml/scheduler.py`
- Sorts queue by: emergency flag → severity score → arrival time
- Handles real-time status updates: `Waiting → Checked-in → In-Progress → Completed`
- Emergency escalation instantly bumps patient to top of queue

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Firebase project (Firestore + Authentication enabled)
- Groq API key — [get one free](https://console.groq.com)

### 1. Clone

```bash
git clone https://github.com/mantrariziya/smart-appointment-system.git
cd smart-appointment-system
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your credentials (see below)
python app.py
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Add your Firebase config and backend URL
npm run dev
```

---

## Environment Variables

### `backend/.env`

```env
FIREBASE_SERVICE_ACCOUNT_PATH=your-firebase-adminsdk.json
FLASK_DEBUG=false
PORT=5000
FLASK_HOST=127.0.0.1
ALLOWED_ORIGINS=http://localhost:5173

GROQ_API_KEY=
GEMINI_API_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

SMTP_EMAIL=
SMTP_PASSWORD=
HOSPITAL_NAME=Smart Medical Center

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

---

## Security

- Firebase Admin SDK JSON never committed — path set via `.env` only
- CORS restricted to `ALLOWED_ORIGINS` env variable (not `*`)
- OTP tokens are time-limited and single-use
- All third-party keys isolated in `.env` — never hardcoded

---

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Video consultation integration
- [ ] Multi-hospital / multi-branch support
- [ ] ABDM (Ayushman Bharat Digital Mission) compliance

---

## Author

**Mantra Riziya**

[![GitHub](https://img.shields.io/badge/GitHub-mantrariziya-181717?style=flat&logo=github)](https://github.com/mantrariziya)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-mantra--riziya-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/mantra-riziya-7aa1752b6)
[![Email](https://img.shields.io/badge/Email-riziyamantra@gmail.com-D14836?style=flat&logo=gmail)](mailto:riziyamantra@gmail.com)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
