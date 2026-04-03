# Plan: Lecturer AI Chat Assistant Feature

## Context
The lecturer needs an AI assistant to help with tasks like proposal review, grading assistance, student insights, and scheduling. The interface will be a dedicated page (`/lecturer/ai-assistant`) but it will also support page-context awareness. The user wants the AI to actually perform these tasks using Function Calling (Tools) so the AI can autonomously query the database to fetch student proposals, grading criteria, and schedules based on the conversation. We will use the Vercel AI SDK to build this, as it handles tool calling and streaming easily, and configure it to use the Groq API (via the OpenAI-compatible endpoint).

## Recommended Approach
We will build a dedicated AI Assistant page with robust server-side function calling:

1. **Setup & Dependencies**:
   - Install Vercel AI SDK: `npm install ai @ai-sdk/openai`
   - Use the OpenAI provider configured with the Groq base URL (`https://api.groq.com/openai/v1`) and the Groq API key to power the AI.

2. **AI Chat Interface (`/lecturer/ai-assistant`)**:
   - Create a new Next.js page for the chat interface.
   - Use the `useChat` hook from the `ai/react` package to manage the chat state and UI.
   - Use `localStorage` to persist the message history or let `useChat` handle the ephemeral state based on user choice (we will implement basic localStorage persistence).

3. **Server-Side AI API with Tools (`/api/ai/chat/route.ts`)**:
   - Implement the API route using `streamText` from the AI SDK.
   - Define **Tools** (function calling) that the AI can use. Examples of tools we will define:
     - `getStudentProposal(studentId)`: Fetches a proposal from Supabase.
     - `getGradingCriteria()`: Fetches grading rubrics.
     - `getLecturerSchedule()`: Fetches the lecturer's schedule.
     - `getStudentList()`: Fetches students assigned to the lecturer.
   - When the user asks "Can you review John's proposal?", the AI will call `getStudentList` to find John, then `getStudentProposal(johnsId)` to read it, and then respond with a review.

4. **Context Awareness via URL**:
   - We will accept URL search parameters (e.g., `?studentId=123`) when navigating to the AI page from other parts of the dashboard.
   - When a parameter is present, we will automatically insert an initial system message like "The user is currently looking at student ID 123. Focus your help on this context."

5. **Sidebar Navigation & Integration**:
   - Add a new "Trợ lý AI" (AI Assistant) link to `src/components/layout/SideNavBar.tsx`.
   - Add an "Ask AI" button on key pages like the Proposal detail view or Grading view.

## Critical Files to Modify / Create
- **Install packages**: `ai`, `@ai-sdk/openai`
- **Create** `src/app/api/ai/chat/route.ts`: API route with defined tools to interact with Supabase.
- **Create** `src/app/(dashboard)/lecturer/ai-assistant/page.tsx`: The chat UI.
- **Modify** `src/components/layout/SideNavBar.tsx`: Add the navigation link.
- **Modify** `src/lib/supabase/server.ts` (or similar utility): Use server client in API tools to fetch real data.

## Verification
1. Install dependencies.
2. Verify that the "Trợ lý AI" page loads.
3. Chat with the AI and ask it to "list my students" or "show me the proposal for [Student Name]".
4. Verify the AI successfully calls the tool, fetches the data from Supabase, and responds appropriately.