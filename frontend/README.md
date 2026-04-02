# QuestBoard

QuestBoard is a gamified task management application that turns tasks into quests.
Users can organize projects, complete quests, gain XP, and level up over time.

---

## Features

* Project and task management
* Drag-and-drop task ordering
* XP and level progression system
* User authentication (login/register)
* Profile management with avatar upload
* Feedback system
* Admin functionality (view and delete feedback)

---

## Tech Stack

**Frontend**

* React (Vite)
* dnd-kit

**Backend**

* Spring Boot (Java)
* REST API

**Database**

* PostgreSQL

**Other**

* Docker
* LocalStorage

---

## Getting Started

### 1. Clone the repository

```
git clone https://github.com/Fabo-F/questboard.git
cd questboard
```

### 2. Start database (Docker)

```
docker compose up -d
```

### 3. Run backend

```
cd backend
./mvnw spring-boot:run
```

### 4. Run frontend

```
cd frontend
npm install
npm run dev
```

### 5. Open the app

```
http://localhost:5173
```

---

## Admin Access

To enable admin features, set a user as admin in the database:

```
UPDATE users SET is_admin = true WHERE username = 'your_username';
```

After that, log out and log in again.

---

## Feedback System

Users can submit feedback through the About page.
Admins can view all feedback entries, see timestamps, and delete entries.

---

## Author

Fabio
Junior Software Developer (Switzerland)
