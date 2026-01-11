# 📚 The Reading Vault (TRV)

> **Engineering a personal system for intellectual growth and reading performance.**

## 🎯 Overview

**The Reading Vault** is a mobile-first ecosystem designed to track, measure, and optimize reading habits. It moves beyond simple list-keeping by implementing an engineering approach to reading: **Measure -> Iterate -> Improve**.

This project is part of my **2026 Strategic Roadmap** to consolidate technical excellence in software architecture and data-driven decision-making.

---

## 🚀 Key Features (MVP)

- **Offline-First Architecture:** Full functionality without internet using local SQLite storage.
- **ISBN Scanner:** Fast book ingestion using camera-based barcode scanning.
- **Nightly Log Form:** Optimized UI for quick entry of pages read during nightly sessions.
- **Reading KPIs:** Automated metrics for reading velocity, consistency, and estimated completion dates.
- **AI Reader Persona:** Integration with LLMs to analyze reading tastes and provide technical book recommendations.

---

## 🛠️ Tech Stack

- **Monorepo Management:** npm Workspaces.
- **Frontend:** React Native (Expo).
- **Backend:** Node.js + Express.
- **Database:** SQL Server (Production) / SQLite (Local Mobile).
- **AI:** OpenAI API for personalized insights.
- **Quality:** Jest for Unit/Integration Testing (Target: 70-80% coverage).

---

## 🏗️ Architecture & Design

Following **Clean Architecture** principles to ensure maintainability and scalability:

1.  **Domain (Entities):** Core business logic (Books, Authors, ReadingSessions).
2.  **Use Cases:** Specific application rules (Logging a session, generating recommendations).
3.  **Infrastructure:** External agents (Database drivers, ISBN API, UI).

---

## 📝 Personal Context

This project is built by **Fausto Oliva**, an Argentine Systems Engineering student focusing on technical excellence and organizational influence.

- **Current focus:** Clean code, English proficiency, and system scalability.

---

## 🛡️ License

ISC - 2026
