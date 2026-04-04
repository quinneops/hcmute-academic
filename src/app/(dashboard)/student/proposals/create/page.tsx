'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { getAuthClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function StudentCreateProposalPage() {
  const router = useRouter()
  const [userId, setUserId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [lecturers, setLecturers] = React.useState<any[]>([])
  
  // Form State
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [type, setType] = React.useState<'KLTN' | 'BCTT'>('BCTT')
  const [supervisorId, setSupervisorId] = React.useState('')
  const [motivationLetter, setMotivationLetter] = React.useState('')
  const [keywords, setKeywords] = React.useState('')

  const [aiSuggestions, setAiSuggestions] = React.useState<any[]>([])

  React.useEffect(() => {
    const init = async () => {
      const supabase = getAuthClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUserId(session.user.id)
      }
      
      try {
        // Fetch lecturers to select from
        // We can just use the tbm.lecturers.list or a general lecturers list
        // Alternatively we can use admin.users with role = lecturer, but typical student API should limit it.
        // Let's use custom fetch directly to get lecturers simply to avoid complicated auth roles, since student might not have access to admin users list.
        const res = await supabase.from('profiles').select('id, full_name, email').eq('role', 'lecturer')
        if (res.data) {
          setLecturers(res.data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const { profile } = useStudentProfile(userId || '')

  const user = profile
    ? {
        name: profile.full_name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.avatar_url || 'https://lh3.googleusercontent.com/aida-static/aida-image-placeholder',
      }
    : {
        name: 'Sinh viên',
        email: '',
        avatar: '',
      }

  const handleGenerateTopics = async () => {
    if (!keywords.trim()) {
      setError('Vui lòng nhập từ khóa hoặc lĩnh vực bạn quan tâm để AI gợi ý.')
      return
    }
    setIsGenerating(true)
    setError(null)
    try {
      const res = await api.ai.generateTopics(keywords, type)
      setAiSuggestions(res.recommendations || [])
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gọi AI')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectSuggestion = (suggestion: any) => {
    setTitle(suggestion.title || '')
    setDescription(suggestion.description || '')
    setCategory(suggestion.category || '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description || !supervisorId || !type) {
      setError('Vui lòng điền đầy đủ Tên đề tài, Mô tả, Loại và Giảng viên hướng dẫn.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await api.student.proposals.create({
        title,
        description,
        category,
        type,
        supervisor_id: supervisorId,
        motivation_letter: motivationLetter
      })
      
      // Success! Redirect to proposals list
      router.push('/student/proposals')
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo đề xuất')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      </div>
    )
  }

  return (
    <Shell
      role="student"
      user={user}
      breadcrumb={[{ label: 'Sinh viên', href: '/student' }, { label: 'Đề tài', href: '/student/proposals' }, { label: 'Đề xuất đề tài mới' }]}
      notifications={0}
    >
      <div className="mb-8">
        <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">Tự đề xuất đề tài</h2>
        <p className="text-body-md text-on-surface-variant mt-2">
          Sử dụng AI để lên ý tưởng hoặc tự điền ý tưởng của bạn, sau đó chọn Giảng viên mà bạn mong muốn hướng dẫn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100 shadow-sm p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-8xl text-purple-600">psychology</span>
            </div>
            <h3 className="text-lg font-bold font-headline text-purple-900 mb-2 flex items-center gap-2 relative z-10">
              <span className="material-symbols-outlined">auto_awesome</span>
              Ý tưởng từ AI
            </h3>
            <p className="text-sm text-purple-800/80 mb-4 relative z-10">
              Nhập từ khóa, công nghệ hoặc lĩnh vực bạn muốn làm, AI sẽ gợi ý cho bạn những đề tài hay nhất.
            </p>
            <div className="space-y-3 relative z-10">
              <textarea
                className="w-full p-3 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent min-h-[100px]"
                placeholder="VD: Trí tuệ nhân tạo nhận diện biển báo giao thông bằng Python..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                onClick={handleGenerateTopics}
                disabled={isGenerating || !keywords.trim()}
              >
                {isGenerating ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <span className="material-symbols-outlined text-sm mr-2">lightbulb</span>
                )}
                Gợi ý cho tôi
              </Button>
            </div>
          </Card>

          {aiSuggestions.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h4 className="font-bold text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">list_alt</span>
                Kết quả gợi ý ({aiSuggestions.length})
              </h4>
              <div className="space-y-3">
                {aiSuggestions.map((sug, i) => (
                  <div key={i} className="p-4 bg-white border border-outline-variant/30 rounded-xl hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer" onClick={() => handleSelectSuggestion(sug)}>
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-bold text-sm text-primary group-hover:text-primary-container leading-tight">{sug.title}</h5>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-surface-container-lowest mb-2 font-mono">
                      {sug.category}
                    </Badge>
                    <p className="text-xs text-secondary line-clamp-3">{sug.description}</p>
                    <div className="mt-3 flex justify-end">
                      <span className="text-[10px] font-bold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Dùng ý tưởng này <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6 bg-surface-container-lowest shadow-sm border-outline-variant/30">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-error-container text-error rounded-lg text-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  <p>{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-on-surface mb-2">Loại đề tài <span className="text-error">*</span></label>
                  <select
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    required
                  >
                    <option value="BCTT">Thực tập (BCTT)</option>
                    <option value="KLTN">Khóa luận (KLTN)</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-on-surface mb-2">Lĩnh vực / Category <span className="text-error">*</span></label>
                  <input
                    type="text"
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="VD: Trí tuệ nhân tạo, Frontend"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Tên đề tài <span className="text-error">*</span></label>
                <input
                  type="text"
                  className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary font-medium"
                  placeholder="Nhập tên đề tài cụ thể..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Mô tả chi tiết <span className="text-error">*</span></label>
                <textarea
                  className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary min-h-[120px]"
                  placeholder="Mô tả mục tiêu, phạm vi nghiên cứu, các công nghệ dự kiến sử dụng..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">person_search</span>
                  Giảng viên đề xuất hướng dẫn <span className="text-error">*</span>
                </label>
                <p className="text-xs text-secondary mb-3">Đề xuất này sẽ được gửi trực tiếp cho giảng viên chờ xử lý.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lecturers.map(lec => (
                    <div 
                      key={lec.id}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                        supervisorId === lec.id
                          ? "bg-primary-container/20 border-primary shadow-sm"
                          : "bg-surface border-outline-variant/30 hover:border-primary/50"
                      )}
                      onClick={() => setSupervisorId(lec.id)}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border",
                        supervisorId === lec.id ? "bg-primary border-primary text-white" : "border-outline"
                      )}>
                        {supervisorId === lec.id && <span className="material-symbols-outlined text-[14px]">check</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-on-surface truncate">{lec.full_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Thư động lực (Tùy chọn)</label>
                <p className="text-xs text-secondary mb-2">Tại sao bạn lại chọn đề tài này và tại sao bạn chọn giảng viên trên?</p>
                <textarea
                  className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary min-h-[80px]"
                  placeholder="Em xin phép được đề xuất..."
                  value={motivationLetter}
                  onChange={(e) => setMotivationLetter(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-outline-variant/15 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => router.push('/student/proposals')}>Hủy</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary text-white font-bold px-8">
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined mr-2">send</span>
                      Gửi đề xuất
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Shell>
  )
}
