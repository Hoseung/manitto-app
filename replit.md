# 마니또 (Manitto) Secret Santa App

## Overview
A web application for Secret Santa (마니또) matching. Admins register participants in groups, then the system creates circular unidirectional matches (A->B, B->C, C->A). Participants can log in with their name to privately see their assigned Manitto.

## Recent Changes
- 2026-02-21: Initial MVP built with admin page, login/reveal page, circular matching algorithm
- 2026-02-21: GitHub repo created at https://github.com/Hoseung/manitto-app
- 2026-02-21: Plan.md created with login logic design

## Project Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **Language**: Korean UI

### Key Files
- `shared/schema.ts` - Data models: groups, participants (with assignedTo for matching)
- `server/routes.ts` - API endpoints for groups, participants, matching, reveal
- `server/storage.ts` - DatabaseStorage with CRUD operations
- `server/github.ts` - GitHub API integration via Replit connector
- `client/src/pages/admin.tsx` - Admin page for group/participant management
- `client/src/pages/login.tsx` - Login page for participants to see their Manitto
- `Plan.md` - Login logic design document

### Matching Algorithm
Circular unidirectional: shuffle participants, assign each to the next in the shuffled order. Last person is assigned to the first.

## User Preferences
- Korean language UI
- Simple name-based authentication (no passwords for participants)
- GitHub integration for code repository management
