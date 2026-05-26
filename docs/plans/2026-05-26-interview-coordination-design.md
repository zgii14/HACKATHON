# Interview Coordination Design Document

This design document outlines the end-to-end integration of the **Interview Invitation & Candidate Confirmation Flow** in GitHire. It bridges the communication gap between candidates and recruiters during the interview phase of the application pipeline.

---

## User Experience (UX) Flow

### 1. Recruiter Portal (Invitation Modal)
When a recruiter changes an applicant's status to **Wawancara (Interview)** on the applicant detail panel:
* A modal dialog will appear asking the recruiter to fill in the interview invitation details:
  * **Metode Wawancara**: Dropdown option (`Online` or `Offline`).
  * **Jadwal (Tanggal & Waktu)**: Date-time picker.
  * **Link Wawancara / Alamat**: Text input (renders conditionally based on the method: Zoom/Meet link for Online, office address for Offline).
  * **Pesan HRD / Catatan**: Optional textarea for special preparation instructions.
  * **Nomor WhatsApp Kontak (Opsional)**: Optional text field to enable candidates to easily reach out for coordination.
* When submitted, this structured data is serialized as a JSON string and saved to the `note` field in the database `applications` table, and the status changes to `interview`.

### 2. Candidate Portal (Notification & Action Panel)
On the candidate's **Lamaranku (My Applications)** page (`/dashboard/applications`):
* Any application with the status `interview` (or `interview_confirmed`) will render with a **glowing border animation** (glowing violet) to highlight the incoming invitation.
* The application card will expand or display a beautifully styled ticket-like **"Undangan Wawancara"** panel showing:
  * Schedule, Method, Meet Link / Address, and the recruiter's message.
  * **Call to Actions**:
    1. **"✓ Konfirmasi Kehadiran"**: Updates the status immediately to `interview_confirmed`.
    2. **"💬 Hubungi Rekruter"**: Opens a dropdown/popover with options to:
       * **"WhatsApp Chat"** (visible only if a phone number was provided): Opens `https://wa.me/{num}?text={templated_message}` with a pre-filled, customized Indonesian message.
       * **"Kirim Email"**: Opens a `mailto:` link with pre-filled subject and body drafts.
* If the candidate confirms, the ticket displays a green checkmark indicating *"Kehadiran Telah Dikonfirmasi ✓"*.

### 3. Recruiter Feedback
On the recruiter's applicant panel:
* The status badge for that candidate is dynamically rendered as a green **"Dikonfirmasi Hadir (INTERVIEW CONFIRMED)"** badge when the status is `interview_confirmed`, giving immediate confirmation.

---

## Technical Specifications

### 1. Data Schema (JSON-in-Note)
We utilize the existing `note` string column in the `job_applications` table to hold the serialized invitation metadata when the application status is `interview` or `interview_confirmed`.

```json
{
  "type": "online" | "offline",
  "datetime": "YYYY-MM-DDTHH:MM",
  "location_or_link": "https://meet.google.com/..." | "Office Street Name",
  "hr_message": "...",
  "hr_phone": "0831...",
  "candidate_confirmed": true | false
}
```

### 2. API Endpoints
* **`PUT /recruiter/applications/{application_id}/status`**:
  Updated to accept the `note` payload (JSON string containing the interview details) when status is updated to `"interview"`.
* **`PATCH /applications/{job_id}/status`**:
  Updated to support setting status to `"interview_confirmed"`, allowing candidates to confirm attendance.

### 3. Messaging Templates
* **WhatsApp API Link**:
  `https://wa.me/{phone_number}?text=Halo%20Bapak%2FIbu%20[HRD]%2C%20saya%20[Candidate_Name]%20terkait%20undangan%20wawancara%20posisi%20[Job_Title]%20di%20[Company]...`
* **Email Mailto Link**:
  `mailto:[Recruiter_Email]?subject=Konfirmasi%20Wawancara%20-%20[Candidate_Name]&body=Halo%20Bapak%2FIbu...`
