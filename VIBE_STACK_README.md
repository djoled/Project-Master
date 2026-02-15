
# Project Master: Vibe Stack Implementation

**Role:** Senior Principal Engineer / Architect  
**Stack:** Bun, ElysiaJS, Supabase, Flutter, Riverpod  
**Constraint:** Code Generation Only (No manual HTTP clients)

---

## 1. System Architecture

### The "Deep Fetch" Strategy
Instead of chaining REST calls, the Backend (Elysia) exposes a "View-Model" endpoint that leverages Supabase's PostgREST capability to join `Projects -> Subcategories -> Tasks` in a single query. This ensures the Mobile app (Flutter) renders the dashboard in 1 frame.

### The Code Gen Pipeline
1.  **Backend:** ElysiaJS serves `swagger.json` at `/swagger/json`.
2.  **Tooling:** `openapi-generator` reads the JSON.
3.  **Mobile:** Dart classes (`Project`, `Subcategory`) and API Clients (`ProjectsApi`) are generated in `apps/mobile/lib/src/core/api/generated`.
4.  **Result:** 100% Type Safety from DB to UI.

---

## 2. Setup Instructions

### A. Initialize Supabase
1.  Create a local Supabase instance or cloud project.
2.  Run the SQL found in `supabase/schema.sql`.
3.  Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `apps/api/.env`.

### B. Start Backend (Bun)
```bash
cd apps/api
bun install
bun run dev
# Swagger is now available at http://localhost:3000/swagger
```

### C. Generate Mobile Client
```bash
# Run from root
./tools/gen-client.sh
```

### D. Start Mobile (Flutter)
```bash
cd apps/mobile
flutter pub get
flutter run
```

---

## 3. "Kiosk Mode" Specification
To support the field requirement:
*   **Virtual Keyboard:** The Flutter app must use `SystemChannels.textInput.invokeMethod('TextInput.hide')` on field focus.
*   **Overlay:** A custom Widget slides up from the bottom, adjusting the `MediaQuery` bottom padding to push content up.
