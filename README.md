# Fair Split (Splitwise Clone)

**🟢 Live Demo:** [https://split-wise-clone-seyp.onrender.com](https://split-wise-clone-seyp.onrender.com)
*(Note: Since it's on a free Render tier, it may take 30-50 seconds to wake up if it hasn't been used recently!)*

A modern, responsive web application designed to simplify shared expenses among roommates and groups. Built with React, Node.js, and MySQL.

## Features
- **Group Management**: Create groups and add members.
- **Advanced Expense Tracking**: Support for multi-currency (INR, USD, EUR, GBP), exact date tracking, and custom notes.
- **Flexible Splitting Options**: Split bills equally, by exact percentages, or manually entering unequal amounts.
- **Immutable Activity History**: A secure audit log that tracks who added expenses and when.
- **Real-time Chat**: WebSocket-powered discussion threads for individual expenses.

## Tech Stack
- **Frontend**: React (Vite), native CSS Glassmorphism design.
- **Backend**: Node.js, Express.js.
- **Database**: MySQL.
- **Real-time Engine**: Socket.io.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MySQL (XAMPP or standalone)

### 1. Database Setup
1. Open your MySQL interface (e.g., phpMyAdmin or CLI).
2. Create the database: `CREATE DATABASE splitwise_clone;`
3. Import the schema: run `mysql -u root splitwise_clone < backend/schema.sql`

### 2. Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file in the backend folder and add `DATABASE_URL` or `DB_HOST`, `DB_USER`, `DB_PASSWORD`.
4. *(Optional)* Run the seed script to ingest sample data: `node seed.js`
5. Start the server: `node server.js` (Runs on port 5000)

### 3. Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev`
4. Visit `http://localhost:5173` in your browser.
