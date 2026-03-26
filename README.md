# 🏢 Smart Community Service Hub

A comprehensive, full-stack community management platform designed for gated communities, apartments, and residential societies. This platform streamlines interactions between residents, security personnel, staff, and administrators.

![Status](https://img.shields.io/badge/Status-Development-orange)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Tech](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20MongoDB%20%7C%20Supabase-green)

---

## 🌟 Key Features

### 🔐 Multi-Role Support
- **Admin Dashboard**: Oversee society statistics, manage residents, assign staff shifts, and handle billing.
- **Resident Portal**: Manage profile, pay monthly fees, raise service requests, and generate visitor passes.
- **Security Dashboard**: Log visitors and deliveries, trigger emergency alerts, and scan visitor passes.
- **Staff Interface**: View assigned shifts and tasks (Housekeeping, Security).

### 📦 Delivery & Visitor Management
- **Single & Bulk Logs**: Security can log individual or multiple deliveries (bulk entry for large rounds).
- **QR Visitor Passes**: Residents can generate passes for guests, which are emailed with a QR code for easy entry.
- **Photo Capture**: Capture visitor faces and ID documents during entry.

### 💰 Billing & Finance
- **Automated Bills**: Generation and tracking of maintenance, electricity, and water bills.
- **Online Payments**: Integration for recording monthly fee payments.

### 🚨 Emergency & Notifications
- **Real-time Alerts**: Security can trigger emergency alerts (Fire, Medical, Security Breach) with immediate notification to admins.
- **In-app Notifications**: Role-based notifications for deliveries, visitors, and society announcements.

---

## 🛠️ Technology Stack

**Frontend:**
- **React 19** with **Vite** for a fast development experience.
- **Tailwind CSS** for modern, responsive styling.
- **Framer Motion** for smooth UI animations and transitions.
- **Lucide React** for consistent, high-quality iconography.
- **Recharts** for data visualization and analytics.

**Backend:**
- **Node.js** & **Express** for the API gateway and business logic.
- **MongoDB** (via Mongoose) for visitor logs, resident records, and billing data.
- **Supabase** for Authentication and Object Storage (ID proofs, visitor photos).
- **Nodemailer** for automated email notifications and QR pass delivery.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Supabase Account
- Gmail App Password (for email services)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd community-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add the following:
   ```env
   # Database
   MONGODB_URI=your_mongodb_connection_string

   # Supabase
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Email (Nodemailer)
   GMAIL_USER=your_email@gmail.com
   GMAIL_APP_PASSWORD=your_app_password

   # Server
   PORT=3002
   ```

4. **Run the application:**
   
   To start the frontend and the services:
   ```bash
   # In terminal 1: Start the frontend
   npm run dev
   
   # In terminal 2: Start the backend services (Email & MongoDB)
   npm run services
   
   # Alternatively, start the combined server:
   npm run api
   ```

---

## 📂 Project Structure

```text
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Main dashboard views (Admin, Resident, Security)
│   ├── services/       # API and Supabase integration logic
│   ├── contexts/       # React Contexts for global state
│   └── lib/            # Shared utilities and configurations
├── server.js           # Main combined backend server
├── mongo-server.js     # Dedicated MongoDB API server
├── email-server.js     # Dedicated Email notification server
└── public/             # Static assets
```

---

## 🛰️ API Endpoints (Highlights)

- `GET /api/visitors`: List all visitor logs.
- `POST /api/deliveries/bulk`: Record multiple deliveries at once.
- `POST /api/emergency-alerts`: Trigger security alerts.
- `POST /api/send-email`: Send automated notifications.
- `GET /api/buildings/stats`: Retrieve society-wide statistics.

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
