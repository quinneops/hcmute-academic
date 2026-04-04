/**
 * Backend API Client
 * Calls Next.js API Routes which then call Supabase
 */

// Next.js API base URL (relative path)
const API_BASE_URL = '/api'

// Get auth token from localStorage (same key as Supabase uses)
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('sb-hhqwraokxkynkmushugf-auth-token')
  if (!token) return null

  try {
    const parsed = JSON.parse(token)
    return parsed?.access_token || null
  } catch {
    return null
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  params?: Record<string, any>
  isFormData?: boolean
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params = {}, isFormData = false } = options

  // Build URL with query params
  const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value))
    }
  })

  const headers: HeadersInit = {}

  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body && !isFormData ? JSON.stringify(body) : body,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
  }

  return data
}

// ============ API Methods ============

export const api = {
  // Registrations
  registrations: {
    list: (studentId: string) =>
      request<any[]>(`/registrations`, { params: { student_id: studentId } }),

    submit: (data: {
      student_id: string
      proposal_id: string
      motivation_letter?: string
      proposed_title?: string
      status?: string
    }) => request<any>(`/registrations`, { method: 'POST', body: data }),

    checkExisting: (studentId: string, proposalId: string) =>
      request<any>(`/registrations/check`, { params: { student_id: studentId, proposal_id: proposalId } }),
  },

  // Dashboard
  dashboard: {
    getAll: (studentId: string) =>
      request<any>(`/dashboard`, { params: { student_id: studentId } }),
  },

  // Documents
  documents: {
    list: (studentId: string, category?: string) =>
      request<any[]>(`/documents`, { params: { student_id: studentId, category } }),
  },

  // AI Assistant
  ai: {
    assistant: {
      chat: (messages: { role: 'user' | 'assistant' | 'system', content: string }[]) =>
        request<any>(`/ai/assistant`, { method: 'POST', body: { messages } }),
    },
  },

  // Submissions
  submissions: {
    list: (studentId: string) =>
      request<any[]>(`/submissions`, { params: { student_id: studentId } }),

    submit: (data: any) =>
      request<any>(`/submissions`, { method: 'POST', body: data }),

    upload: (formData: FormData) =>
      request<any>(`/submissions/upload`, { method: 'POST', body: formData, isFormData: true }),
  },

  // Proposals
  proposals: {
    list: () =>
      request<any[]>(`/proposals`),

    get: (id: string) =>
      request<any>(`/proposals`, { params: { id } }),
  },

  // Profile
  profile: {
    get: (userId: string) =>
      request<any>(`/profile/${userId}`),

    update: (userId: string, data: any) =>
      request<any>(`/profile/${userId}`, { method: 'PUT', body: data }),
  },

  // Notifications
  notifications: {
    list: (userId: string) =>
      request<any[]>(`/notifications`, { params: { user_id: userId } }),

    markAsRead: (id: string) =>
      request<any>(`/notifications`, { method: 'POST', params: { id } }),
  },

  // Lecturer Dashboard
  lecturer: {
    dashboard: () =>
      request<any>(`/lecturer/dashboard`),

    students: () =>
      request<any>(`/lecturer/students`),

    submissions: (studentId?: string) =>
      request<any>(`/lecturer/submissions`, { params: studentId ? { student_id: studentId } : {} }),

    profile: {
      get: () =>
        request<any>(`/lecturer/profile`),
      update: (data: any) =>
        request<any>(`/lecturer/profile`, { method: 'PUT', body: data }),
      changePassword: (newPassword: string) =>
        request<any>(`/lecturer/profile/change-password`, { method: 'POST', body: { password: newPassword } }),
    },

    grades: {
      submit: (data: any) =>
        request<any>(`/lecturer/grades`, { method: 'POST', body: data }),
      update: (data: any) =>
        request<any>(`/lecturer/grades`, { method: 'PATCH', body: data }),
      get: (id: string) =>
        request<any>(`/lecturer/grades/${id}`),
      delete: (id: string) =>
        request<any>(`/lecturer/grades/${id}`, { method: 'DELETE' }),
    },

    proposals: {
      list: () =>
        request<any>(`/lecturer/proposals`),
      get: (id: string) =>
        request<any>(`/lecturer/proposals/${id}`),
      create: (data: any) =>
        request<any>(`/lecturer/proposals`, { method: 'POST', body: data }),
      update: (id: string, data: any) =>
        request<any>(`/lecturer/proposals/${id}`, { method: 'PUT', body: data }),
      review: (proposalId: string, action: 'approve' | 'reject', reviewNotes?: string, registrationId?: string) =>
        request<any>(`/lecturer/proposals/${proposalId}`, {
          method: 'PATCH',
          body: { action, review_notes: reviewNotes, registration_id: registrationId },
        }),
      batchReview: (registrationIds: string[], action: 'approve' | 'reject', notes?: string) =>
        request<any>(`/lecturer/proposals/batch-review`, {
          method: 'POST',
          body: { registration_ids: registrationIds, action, notes },
        }),
      delete: (id: string) =>
        request<any>(`/lecturer/proposals/${id}`, { method: 'DELETE' }),
    },



    feedback: {
      list: () =>
        request<any>(`/lecturer/feedback`),
      create: (data: any) =>
        request<any>(`/lecturer/feedback`, { method: 'POST', body: data }),
    },

    review: {
      list: () => request<any[]>(`/lecturer/review`),
      updateGrade: (registrationId: string, data: { score: number; feedback: string }) =>
        request<any>(`/lecturer/review`, { method: 'PATCH', params: { id: registrationId }, body: data }),
    },

    council: {
      list: () => request<any[]>(`/lecturer/council`),
    },

    chair: {
      submissions: () => request<any[]>(`/lecturer/chair/submissions`),
      review: (registrationId: string, data: { action: 'approved' | 'rejected', notes?: string }) =>
        request<any>(`/lecturer/chair/review`, { method: 'POST', body: { registration_id: registrationId, ...data } }),
    },

    secretary: {
      meetings: () => request<any[]>(`/lecturer/secretary/meetings`),
      submitResults: (councilId: string, results: any[], minutesExcelUrl?: string, meetingDocsUrl?: string) =>
        request<any>(`/lecturer/secretary/submit-results`, { 
          method: 'POST', 
          body: { council_id: councilId, results, minutes_excel_url: minutesExcelUrl, meeting_docs_url: meetingDocsUrl } 
        }),
      upload: (formData: FormData) =>
        request<{ url: string }>(`/lecturer/secretary/upload`, { method: 'POST', body: formData, isFormData: true }),
    },

    schedule: () =>
      request<any>(`/lecturer/schedule`),

    appointments: {
      list: (params?: { start_date?: string; end_date?: string; status?: string }) =>
        request<any>(`/lecturer/appointments`, { params }),
      create: (data: any) =>
        request<any>(`/lecturer/appointments`, { method: 'POST', body: data }),
      update: (id: string, data: any) =>
        request<any>(`/lecturer/appointments/${id}`, { method: 'PATCH', body: data }),
      delete: (id: string) =>
        request<any>(`/lecturer/appointments/${id}`, { method: 'DELETE' }),
    },
 
    tbm: {
      lecturers: {
        list: () => request<any>(`/tbm/lecturers`),
        updateSlots: (lecturerId: string, data: { bctt_slots: number, kltn_slots: number, specialization?: string }) => 
          request<any>(`/tbm/lecturers/${lecturerId}/slots`, { method: 'PATCH', body: data }),
      },
      assignments: {
        reviewer: {
          list: () => request<any[]>(`/tbm/assignments/reviewer`),
          assign: (registrationId: string, reviewerId: string) => 
            request<any>(`/tbm/assignments/reviewer`, { method: 'POST', body: { registration_id: registrationId, reviewer_id: reviewerId } }),
          autoAssign: () => request<any>(`/ai/auto-assign-reviewers`, { method: 'POST' }),
        },
        council: (registrationIds: string[], councilId: string) => 
          request<any>(`/tbm/assignments/council`, { method: 'POST', body: { registration_ids: registrationIds, council_id: councilId } }),
      },
      councils: {
        list: () => request<any>(`/tbm/councils`),
        create: (data: any) => request<any>(`/tbm/councils`, { method: 'POST', body: data }),
        update: (id: string, data: any) => request<any>(`/tbm/councils`, { method: 'PATCH', body: { id, ...data } }),
        autoAssign: () => request<any>(`/ai/auto-assign-councils`, { method: 'POST' }),
      },
      reports: {
        department: () => request<any>(`/tbm/reports/department`),
      }
    }
  },

  // Student Appointments
  student: {
    appointments: {
      list: (params?: { status?: string }) =>
        request<any>(`/student/appointments`, { params }),
    },
    proposals: {
      create: (data: any) =>
        request<any>(`/student/proposals`, { method: 'POST', body: data }),
    },
  },

  // Admin
  admin: {
    dashboard: () =>
      request<any>(`/admin/dashboard`),

    users: {
      list: (page: number, limit: number, filters?: { role?: string; search?: string; is_active?: boolean }) =>
        request<any>(`/admin/users`, {
          params: { page, limit, ...filters },
        }),
      create: (data: any) =>
        request<any>(`/admin/users`, { method: 'POST', body: data }),
      update: (id: string, data: any) =>
        request<any>(`/admin/users/${id}`, { method: 'PUT', body: data }),
      delete: (id: string) =>
        request<any>(`/admin/users/${id}`, { method: 'DELETE' }),
    },

    councils: {
      list: (params?: { semester_id?: string }) =>
        request<any>(`/admin/councils`, { params }),
      create: (data: any) =>
        request<any>(`/admin/councils`, { method: 'POST', body: data }),
      update: (id: string, data: any) =>
        request<any>(`/admin/councils/${id}`, { method: 'PUT', body: data }),
      delete: (id: string) =>
        request<any>(`/admin/councils/${id}`, { method: 'DELETE' }),
    },

    theses: {
      list: (filters?: { status?: string; semester?: string }) =>
        request<any>(`/admin/theses`, { params: filters }),
      update: (id: string, data: any) =>
        request<any>(`/admin/theses/${id}`, { method: 'PUT', body: data }),
    },

    semesters: {
      list: (params?: { include_archived?: boolean }) =>
        request<any>(`/admin/semesters`, { params }),
      create: (data: any) =>
        request<any>(`/admin/semesters`, { method: 'POST', body: data }),
      update: (id: string, data: any) =>
        request<any>(`/admin/semesters/${id}`, { method: 'PUT', body: data }),
      delete: (id: string) =>
        request<any>(`/admin/semesters/${id}`, { method: 'DELETE' }),
    },

    reports: {
      overview: (params?: { semester_id?: string }) =>
        request<any>(`/admin/reports/overview`, { params }),
      theses: () =>
        request<any>(`/admin/reports/theses`),
      grades: () =>
        request<any>(`/admin/reports/grades`),
    },
  },

  ai: {
    generateTopics: (keywords: string, type?: string) =>
      request<any>(`/ai/topic-generate`, {
        method: 'POST',
        body: { keywords, type }
      }),
    improveMotivation: (proposalId: string, studentId: string, motivation: string) =>
      request<any>(`/ai/motivation-assist`, {
        method: 'POST',
        body: { proposal_id: proposalId, student_id: studentId, motivation }
      }),
    screenRegistration: (registrationId: string) =>
      request<any>(`/ai/registration-screen`, {
        method: 'POST',
        body: { registration_id: registrationId }
      }),
  },
}
