'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { StudentPageIntro } from '@/components/student/StudentPageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStudentFeedback } from '@/hooks/student/use-student-feedback'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { getAuthClient } from '@/lib/supabase/client'

export default function FeedbackPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [showReplyDialog, setShowReplyDialog] = React.useState(false)
  const [replySubject, setReplySubject] = React.useState('')
  const [replyContent, setReplyContent] = React.useState('')

  React.useEffect(() => {
    const getUser = async () => {
      const supabase = getAuthClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUserId(session.user.id)
      }
    }
    getUser()
  }, [])

  const { profile } = useStudentProfile(userId || '')
  const {
    messages,
    selectedMessage,
    setSelectedMessage,
    isLoading,
    error,
    isSending,
    sendMessage,
    markAsRead,
  } = useStudentFeedback(userId || '')

  const user = profile
    ? {
        name: profile.full_name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.avatar_url || '',
      }
    : {
        name: 'Sinh viên',
        email: '',
        avatar: '',
      }

  const unreadCount = messages.filter(m => !m.is_read && !m.is_from_student).length

  const handleSelectMessage = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (message && !message.is_read && !message.is_from_student) {
      await markAsRead(messageId)
    }
    setSelectedMessage(message || null)
  }

  const handleSendReply = async () => {
    if (!replySubject.trim() || !replyContent.trim()) return

    // For demo, reply to the selected message's lecturer
    const lecturerId = selectedMessage?.lecturer_name ? 'unknown' : ''
    const result = await sendMessage(lecturerId, replySubject, replyContent)

    if (result.success) {
      setShowReplyDialog(false)
      setReplySubject('')
      setReplyContent('')
    }
  }

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <Shell
      role="student"
      user={user}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/student' }, { label: 'Phản hồi' }]}
      notifications={unreadCount}
    >
      <StudentPageIntro
        eyebrow="Feedback"
        title="Phản hồi từ giảng viên"
        description="Đọc góp ý, quản lý hội thoại và gửi phản hồi lại cho giảng viên trong một không gian rõ ràng hơn."
        meta={<Badge className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">{unreadCount} chưa đọc</Badge>}
        actions={
          <Button onClick={() => setShowReplyDialog(true)}>
            <span className="material-symbols-outlined text-sm mr-2">edit</span>
            Viết phản hồi
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - Feedback List */}
        <div className="lg:col-span-1">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Danh sách phản hồi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-secondary text-sm text-center py-8">
                  Chưa có phản hồi nào
                </p>
              ) : (
                messages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleSelectMessage(message.id)}
                    className={cn(
                      "w-full p-4 rounded-lg text-left transition-all border",
                      selectedMessage?.id === message.id
                        ? 'bg-primary-fixed/20 border-primary-fixed'
                        : 'bg-surface-container-low hover:bg-surface-container-low/80 border-transparent',
                      !message.is_read && !message.is_from_student && 'border-l-4 border-l-amber-500'
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-xs font-bold">
                          {(message.lecturer_name || 'GV').split(' ').pop()?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-on-surface">
                            {message.lecturer_name || 'Giảng viên'}
                          </p>
                          <p className="text-[10px] text-secondary">
                            {message.is_from_student ? 'Bạn' : 'Giảng viên'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-secondary">
                        {new Date(message.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2">{message.subject}: {message.content}</p>
                    {!message.is_read && !message.is_from_student && (
                      <Badge className="mt-2 bg-amber-100 text-amber-700 text-[10px]">Mới</Badge>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Feedback Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-lg font-bold">
                      {(selectedMessage.lecturer_name || 'GV').split(' ').pop()?.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="font-headline font-bold text-primary text-lg">
                        {selectedMessage.lecturer_name || 'Giảng viên'}
                      </CardTitle>
                      <p className="text-sm text-secondary">
                        {selectedMessage.is_from_student ? 'Sinh viên' : 'Giảng viên hướng dẫn'}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn(
                    selectedMessage.is_read
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-100 text-amber-700'
                  )}>
                    {selectedMessage.is_read ? 'Đã đọc' : 'Chưa đọc'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Feedback Content */}
                <div>
                  <h4 className="text-sm font-bold text-on-surface mb-2">{selectedMessage.subject}</h4>
                  <div className="p-6 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-900 leading-relaxed">{selectedMessage.content}</p>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>{new Date(selectedMessage.created_at).toLocaleString('vi-VN')}</span>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-outline-variant/15">
                  <Button
                    className="w-full sm:flex-1 bg-primary text-white"
                    onClick={() => setShowReplyDialog(true)}
                  >
                    <span className="material-symbols-outlined text-sm mr-2">reply</span>
                    Phản hồi
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-surface-container-lowest shadow-ambient-lg border-none h-64 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">mail</span>
                <p className="text-slate-400">Chọn một phản hồi để xem chi tiết</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Reply Dialog */}
      {showReplyDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Viết phản hồi</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold mb-2 block">Tiêu đề</label>
                <input
                  type="text"
                  className="w-full p-3 border border-outline-variant rounded-lg text-sm"
                  placeholder="Nhập tiêu đề..."
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-bold mb-2 block">Nội dung</label>
                <textarea
                  className="w-full p-3 border border-outline-variant rounded-lg text-sm"
                  rows={5}
                  placeholder="Nhập nội dung phản hồi..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowReplyDialog(false)
                  setReplySubject('')
                  setReplyContent('')
                }}
              >
                Hủy
              </Button>
              <Button
                className="w-full sm:w-auto bg-primary text-white"
                onClick={handleSendReply}
                disabled={!replySubject.trim() || !replyContent.trim() || isSending}
              >
                {isSending ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm mr-1">send</span>
                    Gửi phản hồi
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 shadow-lg">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </Shell>
  )
}
