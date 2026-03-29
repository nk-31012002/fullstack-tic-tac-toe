# Multiplayer Tic-Tac-Toe (Server-Authoritative)

A real-time, multiplayer Tic-Tac-Toe game built with **React** and **Nakama Server**.

## 🚀 Live Links
- **Play the Game:** [https://fullstack-tic-tac-toe.vercel.app](https://fullstack-tic-tac-toe.vercel.app)
- **Backend API:** `https://ttt-backend-xyxi.onrender.com`

## 🛠 Tech Stack
- **Frontend:** React, Vite, TypeScript.
- **Backend:** Nakama, JavaScript.
- **Database:** PostgreSQL (Managed via Render).
- **Deployment:** Vercel (Frontend) & Render (Backend via Docker).

## 🕹 Features
- **Server-Authoritative Logic:** All win conditions and moves are validated on the server to prevent cheating.
- **Real-time Matchmaking:** Uses Nakama's RPC and Matchmaking system to pair players.
- **Global Leaderboard:** Scores persist in a PostgreSQL database and are updated at the end of every match.
- **Timed Mode:** Optional 30-second turn timer enforced by the server.

## 🧪 How to Test (Multiplayer)
To verify the real-time functionality:
1. Open the [Live Game URL](https://fullstack-tic-tac-toe.vercel.app) in two separate browser windows (or one normal and one Incognito).
2. Enter a unique nickname in each window and click **Login**.
3. Click **Find Match** in the first window.
4. Click **Find Match** in the second window.
5. Play a move in one window; you will see it reflect instantly in the other via WebSockets.

## 📦 Local Setup
If you want to run this locally:
1. Clone the repo.
2. Ensure Docker engine(Docker Desktop) is running.
3. Navigate to `/backend` and run `docker-compose up`.
4. Navigate to `/frontend`, run `npm install`, then `npm run dev`.

**Note:** Project is hosted on Render's free tier. Please wait **30-60 seconds** for the server container to "wake up" from its sleep state.