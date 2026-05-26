# Interview Coordination Flow Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement an end-to-end Interview Invitation and Candidate Confirmation flow with an elegant ticket UI, dynamic pop-up forms, and WhatsApp/Email contact integration.

**Architecture:** Extend the existing application status endpoints to handle detailed JSON strings inside the `note` column. Embed a dynamic form modal in the Recruiter Portal to compile these interview schedules, render them as an glowing invitation ticket in the Candidate Portal, and provide double-action buttons for candidate confirmation and direct recruiter WhatsApp/Email messaging.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js, Tailwind CSS, Lucide React, Radix UI (Popover/Dialog if already in project, otherwise pure CSS dropdowns/modals).

---

### Task 1: Backend Support (Schema & Routers)

**Files:**
- Modify: `backend/app/schemas.py:146-160` (Add new status value)
- Modify: `backend/app/routers/applications.py:163-188` (Enable candidate status confirmation)

**Step 1: Update ApplicationStatus Enum**
Modify `backend/app/schemas.py` to add `interview_confirmed` value:
```python
class ApplicationStatus(str, Enum):
    applied   = "applied"
    interview = "interview"
    interview_confirmed = "interview_confirmed"
    rejected  = "rejected"
    offer     = "offer"
```

**Step 2: Update Candidate Status PATCH Endpoint**
Modify `backend/app/routers/applications.py` to allow candidates to set their status to `"interview_confirmed"`.
Ensure `update_status` handles `interview_confirmed` in its inputs.

---

### Task 2: Recruiter Portal - Invitation Form Modal

**Files:**
- Modify: `linkify/src/app/(main)/dashboard/recruiter/jobs/[id]/page.tsx:647-689` (Integrate the Wawancara button with pop-up form modal)

**Step 1: Add Modal State and Form**
Add state variables at the top of the component:
```typescript
const [showInterviewModal, setShowInterviewModal] = useState(false);
const [interviewMethod, setInterviewMethod] = useState<"online" | "offline">("online");
const [interviewDateTime, setInterviewDateTime] = useState("");
const [interviewLocation, setInterviewLocation] = useState("");
const [hrMessage, setHrMessage] = useState("");
const [hrPhone, setHrPhone] = useState("");
```

**Step 2: Create Pop-up Dialog component**
Add a modal component that renders when `showInterviewModal` is true, providing dropdowns, date-time inputs, textareas, and WhatsApp phone inputs.

**Step 3: Modify Status Update handler**
Modify `handleStatusChange` to show the modal first when clicking "Wawancara". On submit inside the modal, serialize details into a JSON string and send to backend:
```typescript
const notePayload = JSON.stringify({
    type: interviewMethod,
    datetime: interviewDateTime,
    location_or_link: interviewLocation,
    hr_message: hrMessage,
    hr_phone: hrPhone,
});
statusMutation.mutate({ app_id, status: "interview", note: notePayload });
```

---

### Task 3: Candidate Portal - Ticket UI & Action Buttons

**Files:**
- Modify: `linkify/src/app/(main)/dashboard/applications/page.tsx:354-473` (Add glowing ticket UI and Action Buttons to ApplicationCard)

**Step 1: Check and Parse Invitation JSON**
Inside `ApplicationCard`, check if `app.status` is `interview` or `interview_confirmed`.
Parse `app.note` safely to extract invitation fields:
```typescript
let interviewDetails = null;
if ((app.status === "interview" || app.status === "interview_confirmed") && app.note) {
    try {
        interviewDetails = JSON.parse(app.note);
    } catch (e) {
        // Fallback for old text notes
        interviewDetails = { hr_message: app.note };
    }
}
```

**Step 2: Render Glowing Ticket UI**
If `interviewDetails` exists, render a beautifully styled, card-like ticket with a glowing border animation (`animate-pulse shadow-[0_0_15px_rgba(139,92,246,0.15)] border-violet-500/30`), detailing:
- Schedule (formatted Indonesian date/time).
- Type (Online Meet URL / Offline Office Location).
- recruiter message.

**Step 3: Render Confirmation & Contact Buttons**
Add a dedicated CTA row:
1. **"✓ Konfirmasi Kehadiran"**: Trigger `statusMutation.mutate("interview_confirmed")` when status is `interview`. Disable or replace with checkmark green button if already `interview_confirmed`.
2. **"💬 Hubungi Rekruter"**: A button with popover options:
   * **WhatsApp**: Opens `https://wa.me/{phone}?text={custom_msg}`.
   * **Email**: Opens `mailto:{email}`.

---

### Verification Plan

#### 1. Manual Verification Steps
- Run the frontend and backend.
- Log in as recruiter `rozagi2004@gmail.com` and go to candidate `Muhammad Rozagi` detail.
- Click **Wawancara (Interview)**, verify the Pop-up form appears. Select Online, enter a Google Meet link and your WhatsApp number, then submit.
- Switch to Candidate account in browser, open **Lamaranku** page.
- Verify the **glowing interview invitation ticket** is beautifully displayed.
- Click **Konfirmasi Kehadiran** and confirm it shifts immediately to a green "Kehadiran Dikonfirmasi ✓" state.
- Verify clicking **Hubungi Rekruter** opens WhatsApp/Email correctly.
- Return to Recruiter Portal, and verify candidate's status has updated to green **"Dikonfirmasi Hadir"**.
