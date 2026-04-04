/**
 * Database Types
 *
 * Auto-generated types from Supabase schema
 * These should be regenerated when schema changes
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type UserRole = 'student' | 'lecturer' | 'admin'
export type ProposalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'
export type ProposalType = 'BCTT' | 'KLTN'
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'completed'
export type SubmissionStatus = 'submitted' | 'graded' | 'late' | 'resubmitted'
export type DefenseStatus = 'scheduled' | 'completed' | 'cancelled' | 'postponed'
export type PostDefenseStatus = 'none' | 'pending_supervisor' | 'pending_chair' | 'approved' | 'rejected'
export type NotificationType = 'system' | 'academic' | 'deadline' | 'feedback'
export type CouncilMemberRole = 'chair' | 'secretary' | 'member' | 'opponent1' | 'opponent2'

// Tables
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  is_tbm: boolean
  specialization: string | null
  student_code: string | null
  lecturer_code: string | null
  department: string | null
  faculty: string | null
  phone: string | null
  is_active: boolean
  is_secretary: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface Semester {
  id: string
  name: string
  academic_year: string
  semester_number: number
  start_date: string
  end_date: string
  registration_start: string | null
  registration_end: string | null
  is_active: boolean
  is_current: boolean
  metadata: Json
  created_at: string
  updated_at: string
}

export interface Proposal {
  id: string
  title: string
  slug: string | null
  description: string | null
  category: string | null
  tags: string[]
  supervisor_id: string | null
  co_supervisor_id: string | null
  semester_id: string | null
  status: ProposalStatus
  type: ProposalType
  is_open_for_registration: boolean
  max_students: number
  requirements: string | null
  estimated_duration: number | null
  is_industrial: boolean
  company_name: string | null
  company_mentor: string | null
  views_count: number
  registrations_count: number
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface Registration {
  id: string
  student_id: string
  proposal_id: string
  status: RegistrationStatus
  post_defense_edit_status: PostDefenseStatus
  editing_file_url: string | null
  registration_number: string | null
  motivation_letter: string | null
  proposed_title: string | null
  revised_description: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  approved_at: string | null
  completed_at: string | null
  final_score: number | null
  final_grade: string | null
  created_at: string
  updated_at: string
}

export interface SubmissionRound {
  id: string
  semester_id: string
  round_number: number
  name: string
  description: string | null
  start_date: string
  end_date: string
  grace_period_hours: number
  max_file_size_mb: number
  allowed_file_types: string[]
  is_active: boolean
  weight_percentage: number
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  registration_id: string
  round_id: string | null
  round_number: number
  file_url: string
  file_name: string
  file_size: number | null
  file_mime_type: string | null
  storage_path: string | null
  checksum: string | null
  status: SubmissionStatus
  turnitin_report_url: string | null
  internship_confirmation_url: string | null
  submitted_at: string
  late_penalty: number
  graded_at: string | null
  graded_by: string | null
  version: number
  previous_submission_id: string | null
  comments: string | null
  created_at: string
  updated_at: string
}

export interface Grade {
  id: string
  submission_id: string
  grader_id: string | null
  grader_role: string | null
  criteria_scores: Json
  criteria_1_score: number | null
  criteria_2_score: number | null
  criteria_3_score: number | null
  criteria_4_score: number | null
  total_score: number | null
  weight_percentage: number
  feedback: string | null
  private_notes: string | null
  is_published: boolean
  graded_at: string
  created_at: string
  updated_at: string
}

export interface Council {
  id: string
  name: string
  code: string | null
  semester_id: string | null
  chair_id: string | null
  secretary_id: string | null
  room: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CouncilMember {
  id: string
  council_id: string
  member_id: string
  role: CouncilMemberRole
  assigned_at: string
}

export interface DefenseSession {
  id: string
  council_id: string
  registration_id: string
  sequence_number: number | null
  scheduled_at: string | null
  duration_minutes: number
  room: string | null
  status: DefenseStatus
  actual_start_time: string | null
  actual_end_time: string | null
  notes: string | null
  result_score: number | null
  result_grade: string | null
  created_at: string
  updated_at: string
}

export interface Feedback {
  id: string
  registration_id: string
  lecturer_id: string | null
  round_number: number | null
  content: string
  attachment_url: string | null
  attachment_name: string | null
  is_read: boolean
  read_at: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  content: string | null
  type: NotificationType
  priority: string
  is_read: boolean
  read_at: string | null
  action_url: string | null
  action_label: string | null
  metadata: Json
  expires_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  old_values: Json | null
  new_values: Json | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface Setting {
  key: string
  value: Json
  description: string | null
  is_public: boolean
  updated_at: string
  updated_by: string | null
}

export interface Document {
  id: string
  title: string
  type: string
  category: string
  file_url: string
  file_size: number | null
  uploaded_by: string | null
  download_count: number
  created_at: string
}

export interface FeedbackMessage {
  id: string
  student_id: string
  lecturer_id: string | null
  subject: string
  content: string
  is_read: boolean
  is_from_student: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface DocumentRequest {
  id: string
  student_id: string
  title: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  lecturer_id: string
  student_id: string | null
  student_ids: string[] | null
  is_group_appointment: boolean | null
  type: string
  scheduled_at: string
  end_at: string | null
  duration_minutes: number | null
  location: string | null
  room: string | null
  title: string
  description: string | null
  thesis_title: string | null
  status: string
  notes: string | null
  cancellation_reason: string | null
  council_name: string | null
  meeting_link: string | null
  created_at: string
  updated_at: string
}

// Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      semesters: {
        Row: Semester
        Insert: Omit<Semester, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Semester, 'id' | 'created_at'>>
      }
      proposals: {
        Row: Proposal
        Insert: Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'registrations_count'>
        Update: Partial<Omit<Proposal, 'id' | 'created_at'>>
      }
      registrations: {
        Row: Registration
        Insert: Omit<Registration, 'id' | 'created_at' | 'updated_at' | 'submitted_at'>
        Update: Partial<Omit<Registration, 'id' | 'created_at'>>
      }
      submission_rounds: {
        Row: SubmissionRound
        Insert: Omit<SubmissionRound, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SubmissionRound, 'id' | 'created_at'>>
      }
      submissions: {
        Row: Submission
        Insert: Omit<Submission, 'id' | 'created_at' | 'updated_at' | 'submitted_at'>
        Update: Partial<Omit<Submission, 'id' | 'created_at'>>
      }
      grades: {
        Row: Grade
        Insert: Omit<Grade, 'id' | 'created_at' | 'updated_at' | 'graded_at'>
        Update: Partial<Omit<Grade, 'id' | 'created_at'>>
      }
      councils: {
        Row: Council
        Insert: Omit<Council, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Council, 'id' | 'created_at'>>
      }
      council_members: {
        Row: CouncilMember
        Insert: Omit<CouncilMember, 'id' | 'assigned_at'>
        Update: Partial<Omit<CouncilMember, 'id'>>
      }
      defense_sessions: {
        Row: DefenseSession
        Insert: Omit<DefenseSession, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DefenseSession, 'id' | 'created_at'>>
      }
      feedback: {
        Row: FeedbackMessage
        Insert: Omit<FeedbackMessage, 'id' | 'created_at' | 'updated_at' | 'is_read' | 'read_at'>
        Update: Partial<Omit<FeedbackMessage, 'id' | 'created_at' | 'updated_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'read_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: Partial<Omit<AuditLog, 'id'>>
      }
      settings: {
        Row: Setting
        Insert: Setting
        Update: Partial<Omit<Setting, 'key'>>
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'created_at'>
        Update: Partial<Omit<Document, 'id' | 'created_at'>>
      }
      document_requests: {
        Row: DocumentRequest
        Insert: Omit<DocumentRequest, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DocumentRequest, 'id' | 'created_at'>>
      }
      appointments: {
        Row: Appointment
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Appointment, 'id' | 'created_at'>>
      }
    }
    Functions: {
      increment_document_downloads: {
        Args: { doc_id: string }
        Returns: void
      }
    }
    Views: {
      student_thesis_progress: {
        Row: {
          registration_id: string
          student_id: string
          registration_status: string
          thesis_title: string
          supervisor_id: string
          semester_name: string
          total_submissions: number
          last_submission_at: string
          average_score: number
          defense_date: string
          defense_status: string
        }
      }
      lecturer_workload: {
        Row: {
          lecturer_id: string
          lecturer_name: string
          total_proposals: number
          approved_proposals: number
          total_students: number
          completed_students: number
          pending_gradings: number
        }
      }
      admin_dashboard_stats: {
        Row: {
          active_students: number
          active_lecturers: number
          approved_theses: number
          pending_registrations: number
          pending_submissions: number
          scheduled_defenses: number
          current_semester_id: number
        }
      }
    }
  }
}
