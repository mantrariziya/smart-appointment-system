# 🏥 Smart Appointment System

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Flask](https://img.shields.io/badge/Flask-3.0-black?style=for-the-badge&logo=flask)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge&logo=firebase)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

**An AI-powered healthcare appointment scheduling system with real-time queue management, ML-based consultation time prediction, and automated notifications.**

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Triage** | Groq LLaMA 3.1 analyzes symptoms & assigns severity scores |
| 🧠 **ML Prediction** | RandomForest predicts consultation duration |
| 🚨 **Dynamic Queue** | Priority-based queue with emergency escalation |
| 📊 **No-Show Prediction** | Trained on 110K+ real hospital records |
| 📱 **WhatsApp & SMS** | Twilio-powered appointment reminders |
| 🔐 **OTP Password Reset** | Secure email-based reset flow |
| 📅 **Doctor Scheduling** | Manage availability and time slots |
| 📄 **PDF Reports** | Auto-generated medical reports |
| 💳 **Payments** | Razorpay gateway integration |
| 🔥 **Firebase Backend** | Firestore real-time database |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Flask, Python 3.10+ |
| Database | Firebase Firestore |
| ML | scikit-learn, RandomForest, GradientBoosting |
| AI | Groq (LLaMA 3.1) |
| Auth | Firebase Authentication |
| Notifications | Twilio (WhatsApp + SMS) |
| Payments | Razorpay |

---

## 📁 Project Structure

```
smart-appointment-system/
├── backend/
│   ├── ml/              # ML models (prediction + no-show)
│   ├── routes/          # Flask API blueprints
│   ├── services/        # WhatsApp, SMS, email, PDF
│   ├── firebase/        # Firestore helpers
│   └── app.py           # Main Flask app
└── frontend/
    └── src/
        ├── components/  # Reusable UI components
        ├── pages/       # Login, Dashboard, etc.
        └── services/    # API calls
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Firebase project
- Groq API key

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your credentials in .env
python app.py
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Fill in your Firebase config in .env
npm run dev
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for AI triage |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Firebase admin SDK JSON path |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `SMTP_EMAIL` | Gmail address for OTP emails |
| `SMTP_PASSWORD` | Gmail app-specific password |
| `RAZORPAY_KEY_ID` | Razorpay key ID |

### Frontend (`frontend/.env`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (default: http://localhost:5000) |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |

---

## 👥 User Roles

- **Patient** — Book appointments, view queue, download reports
- **Doctor** — Manage schedule, view patients, generate PDF reports
- **Admin** — Full dashboard, analytics, payment management

---

## 📄 License

MIT License © 2025
# smart-appointment-system
