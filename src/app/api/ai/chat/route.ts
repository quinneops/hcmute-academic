import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Configure the OpenAI provider to use Groq API
const groqProvider = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

// Clients for authentication and database
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60; // Allow longer execution times

export async function POST(req: Request) {
  try {
    const { messages, contextData } = await req.json();

    // Check authentication using Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized - Missing Authorization header', { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response('Unauthorized - Invalid session', { status: 401 });
    }

    // Get user profile with role using Admin client to bypass RLS for auth check
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, student_code, department, faculty')
      .eq('id', user.id)
      .single();

    const profileData = profile as any;

    if (profileError || !profileData || profileData.role !== 'lecturer') {
      return new Response('Unauthorized - Lecturer role required', { status: 401 });
    }

    // Setup system prompt based on context
    const systemPrompt = `
      You are a helpful, professional AI Assistant designed for university lecturers.
      You help lecturers manage student proposals, grading, and scheduling.

      The current lecturer is: ${profileData.full_name} (${profileData.email}).

      ${contextData ? `
      CURRENT PAGE CONTEXT:
      The lecturer is currently looking at the following context in the application:
      Type: ${contextData.type}
      ID: ${contextData.id}
      Title/Name: ${contextData.title || 'N/A'}

      Please focus your assistance on this context if appropriate.
      ` : ''}
    `;

    // Start streaming text
    const result = await streamText({
      model: groqProvider('llama-3.3-70b-versatile'), // High capability model on Groq
      system: systemPrompt,
      messages,
      tools: {
        getLecturerProposals: tool({
          description: 'Get all proposals managed by the current lecturer',
          parameters: z.object({
            limit: z.number().optional().default(10).describe('Maximum number of proposals to return')
          }),
          execute: async ({ limit }) => {
            const { data, error } = await supabaseAdmin
              .from('proposals')
              .select('id, title, status, max_students, registrations_count, created_at')
              .eq('supervisor_id', user.id)
              .limit(limit);

            if (error) return { error: error.message };
            return { proposals: data };
          },
        }),

        getProposalDetails: tool({
          description: 'Get detailed information about a specific proposal, including its requirements and description',
          parameters: z.object({
            proposalId: z.string().describe('The ID of the proposal')
          }),
          execute: async ({ proposalId }) => {
            const { data, error } = await supabaseAdmin
              .from('proposals')
              .select('*')
              .eq('id', proposalId)
              .single();

            if (error) return { error: error.message };
            return { proposal: data };
          },
        }),

        getStudentsForProposal: tool({
          description: 'Get a list of students registered for a specific proposal',
          parameters: z.object({
            proposalId: z.string().describe('The ID of the proposal')
          }),
          execute: async ({ proposalId }) => {
            const { data, error } = await supabaseAdmin
              .from('registrations')
              .select('id, status, submitted_at, student_id')
              .eq('proposal_id', proposalId);

            if (error) return { error: error.message };

            if (data && data.length > 0) {
              const registrations = data as any[];
              const studentIds = registrations.map(r => r.student_id);
              const { data: studentsData } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email, student_code')
                .in('id', studentIds);

              const students = (studentsData || []) as any[];

              return {
                registrations: registrations.map(reg => ({
                  ...reg,
                  student: students.find(s => s.id === reg.student_id) || null
                }))
              };
            }

            return { registrations: data };
          },
        }),

        searchStudents: tool({
          description: 'Search for students by name or student code',
          parameters: z.object({
            query: z.string().describe('Name or student code to search for')
          }),
          execute: async ({ query }) => {
            const { data, error } = await supabaseAdmin
              .from('profiles')
              .select('id, full_name, email, student_code, department')
              .eq('role', 'student')
              .or(`full_name.ilike.%${query}%,student_code.ilike.%${query}%`)
              .limit(5);

            if (error) return { error: error.message };
            return { students: data };
          },
        })
      }
    });

    return result.toAIStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
