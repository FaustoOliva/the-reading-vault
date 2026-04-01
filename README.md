# 📚 The Reading Vault (TRV)

> **Engineering a personal system for intellectual growth and reading performance.**

## 🎯 Overview

**The Reading Vault** is a mobile-first ecosystem designed to track, measure, and optimize reading habits. It moves beyond simple list-keeping by implementing an engineering approach to reading: **Measure -> Iterate -> Improve**.

This project is part of my **2026 Strategic Roadmap** to consolidate technical excellence in software architecture and data-driven decision-making.

---

## 🚀 Key Features (MVP)

- **Offline-First Architecture:** Full functionality without internet using local SQLite storage.
- **Structured Book Metadata:** Books can store profile-relevant metadata such as `bookType`, `genres`, and `synopsis`.
- **AI-Assisted Metadata Autofill:** AI can suggest book metadata during creation to improve profile quality.
- **Reading Workflow:** Fast session logging, review-driven completion, and multi-cycle reading support.
- **Reading KPIs:** Automated metrics for reading velocity, consistency, and estimated completion dates.
- **AI Reader Persona:** Integration with LLMs to analyze reading tastes, recommend books, and evaluate synergy with books or authors.

---

## 🛠️ Tech Stack

- **Monorepo Management:** npm Workspaces.
- **Frontend:** React Native (Expo).
- **Backend:** Node.js + Express.
- **Database:** SQL Server (Production) / SQLite (Local Mobile).
- **AI:** OpenAI API for personalized insights.
- **Quality:** Vitest for Unit/Integration Testing (Target: 70-80% coverage).

---

## 🏗️ Architecture & Design

Following **Clean Architecture** principles to ensure maintainability and scalability:

1.  **Domain (Entities):** Core business logic (Books, Authors, ReadingSessions).
2.  **Use Cases:** Specific application rules (Logging a session, generating recommendations).
3.  **Infrastructure:** External agents (Database drivers, AI providers, UI).

## 📌 Current MVP Scope

The current MVP is focused on:

- book creation, editing, review, and status transitions
- reading session logging with the current API contract
- KPI dashboards and book-level statistics
- reader profile generation and AI-powered recommendations
- enriched book metadata (`bookType`, `genres`, `synopsis`)
- AI-assisted metadata suggestion and book/author synergy analysis

Explicitly out of MVP scope:

- ISBN scanner
- notifications
- general-purpose AI chat

---

## 📝 Personal Context

This project is built by **Fausto Oliva**, an Argentine Systems Engineering student focusing on technical excellence and organizational influence.

- **Current focus:** Clean code, English proficiency, and system scalability.

---

## 🛡️ License

ISC - 2026
