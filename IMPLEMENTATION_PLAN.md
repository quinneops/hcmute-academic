# Spreadsheet AI-Grading Workspace

This plan aims to allow lecturers to enter grades into a Google Spreadsheet and automatically sync them into the Academic Nexus system. The system will pre-fill student information into a generated template to minimize manual data entry.

## User Review Required

> [!IMPORTANT]
> **Grading Scale**: The new criteria sum to **10 points** plus an optional **2 points bonus**, for a total maximum of **12 points**. Please confirm if the system should normalize this back to a 10-point scale or keep it as-is.

> [!WARNING]
> **Google Cloud Credentials**: To "Generate an Online Sheet" automatically, we need a **Google Service Account JSON Key** added to `.env.local`. If not available, we will provide a **CSV Export** that can be easily imported into Google Sheets.

## Proposed Changes

### [Backend] API Layer

#### [NEW] [spreadsheet-sync/route.ts](file:///Users/thuong/Downloads/design/academic-nexus-app/src/app/api/lecturer/grades/spreadsheet-sync/route.ts)
- `POST /create`: Fetches the list of students for the lecturer and generates a pre-filled Google Sheet (or CSV).
- `POST /sync`: Reads the spreadsheet data and updates the `registrations` in Supabase.
- Implements the new 7+1 grading criteria logic.

### [Frontend] UI Components

#### [MODIFY] [grading/page.tsx](file:///Users/thuong/Downloads/design/academic-nexus-app/src/app/(dashboard)/lecturer/grading/page.tsx)
- Update `GRADING_CRITERIA` constant to match the user's specific weights.
- Add a new "AI Spreadsheet Workspace" section.
- Implementation of the "Generate Sheet" and "Sync Now" buttons.

### [Infrastructure] Dependencies

#### [MODIFY] [package.json](file:///Users/thuong/Downloads/design/academic-nexus-app/package.json)
- Add `googleapis` or a lightweight CSV parser for spreadsheet processing.

---

## Technical Mapping Strategy (New Criteria)

| Column | Internal Key | Max Score | Description |
|--------|--------------|-----------|-------------|
| A      | Student ID   | -         | Hidden/Reference |
| B      | Student Code | -         | Pre-filled |
| C      | Student Name | -         | Pre-filled |
| D      | Slide        | 1.0       | Slide trình chiếu |
| E      | Presentation | 1.5       | Phong thái thuyết trình |
| F      | Timing       | 0.5       | Thời gian |
| G      | Content      | 4.0       | Nội dung |
| H      | Q&A          | 2.0       | Trả lời câu hỏi |
| I      | Innovation   | 1.0       | Tính sáng tạo - tính mới |
| J      | Bonus        | 2.0       | Tiếng Anh (+1) / Bài báo (+1) |
| K      | Total        | 12.0      | Auto-calculated |
| L      | Feedback     | Text      | General comments |

## Open Questions

1. **Authentication**: Do you prefer the **Public URL** approach (faster to use) or a **Full Google Login** (more secure, private) for lecturers?
2. **Conflicts**: If a lecturer manually enters a grade in the UI then syncs from a spreadsheet, which one should win? (Proposed: Spreadsheet wins).

## Verification Plan

### Automated Tests
- Test parsing with valid/invalid CSV formats.
- Test permission checks (lecturer A trying to sync grades for lecturer B's students).

### Manual Verification
- Create a sample Google Sheet and sync it.
- Verify that grades are reflected on the student's dashboard and the lecturer's grading history.
