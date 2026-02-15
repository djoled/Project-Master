# Business Requirements Document (BRD): Project Master

**Version:** 2.0  
**Status:** Baseline  
**Author:** Senior Lead Engineer  

---

## 1. Executive Summary
Project Master is a specialized, high-performance internal corporate project management application designed to bridge the gap between high-level project oversight and granular task-level documentation. The platform prioritizes visual proof of work through photo documentation, AI-driven status intelligence, and seamless mobile-first communication for Owners and Project Managers.

---

## 2. Project Vision & Objectives
The primary goal is to provide a single source of truth for physical or long-term corporate projects where "seeing is believing."
*   **Accountability:** Ensure every task is backed by time-stamped visual evidence.
*   **Efficiency:** Reduce status meeting frequency by using Gemini AI to summarize progress.
*   **Accessibility:** Provide a "kiosk-ready" experience with a custom virtual keyboard for field environments.

---

## 3. Stakeholder Profiles
| Role | Permissions & Responsibilities |
| :--- | :--- |
| **Project Owner** | Global visibility. Full CRUD permissions for Projects, Subcategories, and Tasks. Can invite and assign Project Managers. |
| **Project Manager** | Assigned visibility. Can create/delete Subcategories and Tasks within assigned projects. Responsible for progress documentation. |

---

## 4. Functional Requirements

### 4.1 User Authentication & Onboarding
*   **Dual-Mode Auth:** Support for traditional login and registration.
*   **Manager Invitations:** Owners can "invite" PMs directly from the login screen by email, automatically registering them in the system directory.
*   **Demo Access:** Quick-switch accounts for stakeholders to verify different role perspectives.
*   **Role-Based Access Control (RBAC):** Strict enforcement of view/edit permissions based on project assignment.

### 4.2 Project Hierarchy & Management
The system follows a three-tier hierarchy: **Project > Subcategory (Category) > Task (Work Item).**
*   **Projects:** Contain descriptions, lead PM assignments, and project-wide due dates.
*   **Subcategories:** Used to group tasks by phase (e.g., "Electrical Phase 1", "Plumbing").
*   **Tasks:** The atomic unit of work with statuses: `Pending`, `In Progress`, and `Completed`.
*   **Date Tracking:** Every entity tracks `Created Date` and an optional `Due Date` with visual cues for upcoming deadlines.

### 4.3 Cleanup & Data Integrity
*   **Cascading Deletions:** 
    *   Deleting a Project removes all associated Subcategories, Tasks, and Photos.
    *   Deleting a Subcategory removes all associated Tasks and Photos.
*   **Role-Restricted Deletion:**
    *   Owners can delete any entity.
    *   PMs can only delete Subcategories and Tasks (not Projects).

### 4.4 Documentation & Evidence
*   **Photo-First Workflow:** Users can snap or upload photos at the Subcategory (general progress) or Task (specific milestone) level.
*   **Time-Stamping:** Every photo is immutable and marked with the uploader's name and precise timestamp.
*   **Lightbox Viewing:** High-resolution modal for detailed inspection of documentation photos.

### 4.5 Intelligence & AI Features (Gemini API)
*   **Task Analysis:** Integrated Gemini-3-Flash model analyzes task descriptions, status, and current documentation to generate high-impact bullet points for stakeholder reports.
*   **Contextual Insight:** The AI understands whether documentation is sufficient based on the task complexity.

### 4.6 Communication & Awareness
*   **Global Team Chat:** A persistent communication channel for all stakeholders with support for text and image sharing.
*   **Notification Engine:** Real-time (state-based) alerts for:
    *   New photo uploads on assigned projects.
    *   New project assignments.
    *   Status updates on critical milestones.

---

## 5. User Interface & Experience (UI/UX)

### 5.1 Design Language
*   **Aesthetics:** Modern, clean "SaaS-Plus" look using Tailwind CSS and the Inter font family.
*   **Responsiveness:** Fluid grid layouts that adapt from mobile portrait to ultra-wide desktop monitors.

### 5.2 Field-Ready Input (Virtual Keyboard)
*   **Integrated Kiosk Support:** A custom-built virtual keyboard that automatically triggers on input focus.
*   **Layout Awareness:** The application dynamically resizes using CSS variables (`--keyboard-offset`) to ensure inputs are never obscured and the chat automatically scrolls to the latest message when the keyboard expands.

---

## 6. Technical Architecture

*   **Frontend:** React (ES6+ Modules)
*   **State Management:** Context API with `useReducer` for predictable cascading logic.
*   **Persistence:** LocalStorage-based caching for offline-first reliability in field environments.
*   **AI Integration:** @google/genai (Gemini 3 Pro/Flash).
*   **Icons:** Lucide-React for consistent visual language.

---

## 7. Non-Functional Requirements
*   **Performance:** All state transitions and AI requests are handled asynchronously with clear loading states.
*   **Reliability:** State is saved on every mutation to prevent data loss on browser refresh.
*   **Security:** Role-based filtering at the UI and State level to prevent unauthorized data exposure.

---

## 8. Future Roadmap
*   **Cloud Synchronization:** Transition from LocalStorage to a centralized PostgreSQL backend.
*   **Offline Photo Sync:** Queue photo uploads when field connectivity is low.
*   **Advanced AI Auditing:** Automatic verification of photos against task descriptions using Gemini Vision.
