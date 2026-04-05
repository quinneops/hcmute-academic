'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'

function LecturerCreateProposalPage() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Form State
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [type, setType] = React.useState<'KLTN' | 'BCTT'>('KLTN')
  const [maxStudents, setMaxStudents] = React.useState('1')
  const [tags, setTags] = React.useState('')
  const [keywords, setKeywords] = React.useState('')

  const [aiSuggestions, setAiSuggestions] = React.useState<any[]>([])

  const handleGenerateTopics = async () => {
    if (!keywords.trim()) {
      setError('Vui lòng nhập từ khóa hoặc lĩnh vực Thầy/Cô quan tâm để AI gợi ý.')
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
    if (!title.trim()) {
      setError('Tiêu đề là bắt buộc')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await api.lecturer.proposals.create({
        title,
        description: description || undefined,
        category: category || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        max_students: parseInt(maxStudents) || 1,
        type,
      })
      
      router.push('/lecturer/proposals')
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo đề cương')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Shell 
        role="lecturer" 
        isTbm={user?.is_tbm} 
        user={{ 
          name: '...', 
          email: '...', 
          avatar: '',
          is_tbm: user?.is_tbm,
          is_secretary: user?.is_secretary
        }} 
        breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Đề cương', href: '/lecturer/proposals' }, { label: 'Tạo mới' }]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      role="lecturer"
      isTbm={user?.is_tbm}
      user={{
        name: user?.full_name || 'Giảng viên',
        email: user?.email || '...',
        avatar: user?.avatar_url || '',
        is_tbm: user?.is_tbm,
        is_secretary: user?.is_secretary
      }}
      breadcrumb={[
        { label: 'Bảng điều khiển', href: '/lecturer' },
        { label: 'Đề cương', href: '/lecturer/proposals' },
        { label: 'Tạo mới' },
      ]}
      notifications={0}
    >
      <div className="mb-8">
        <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">Tạo đề cương mới</h2>
        <p className="text-body-md text-on-surface-variant mt-2">
          Sử dụng AI để lên ý tưởng hoặc tự điền ý tưởng của Thầy/Cô cho sinh viên đăng ký.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - AI Integration */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100 shadow-sm p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-8xl text-purple-600">psychology</span>
            </div>
            <h3 className="text-lg font-bold font-headline text-purple-900 mb-2 flex items-center gap-2 relative z-10">
              <span className="material-symbols-outlined">auto_awesome</span>
              Trợ lý soạn thảo AI
            </h3>
            <p className="text-sm text-purple-800/80 mb-4 relative z-10">
              Nhập từ khóa hoặc hướng nghiên cứu đề tài, AI sẽ gợi ý cho Thầy/Cô các tiêu đề và mô tả chuyên nghiệp.
            </p>
            <div className="space-y-3 relative z-10">
              <textarea
                className="w-full p-3 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent min-h-[100px]"
                placeholder="VD: Nghiên cứu các giải pháp bảo mật blockchain cho dữ liệu y tế..."
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
                Gợi ý đề tài
              </Button>
            </div>
          </Card>

          {aiSuggestions.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h4 className="font-bold text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">list_alt</span>
                Đề tài gợi ý ({aiSuggestions.length})
              </h4>
              <div className="space-y-3">
                {aiSuggestions.map((sug, i) => (
                  <div 
                    key={i} 
                    className="p-4 bg-white border border-outline-variant/30 rounded-xl hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer" 
                    onClick={() => handleSelectSuggestion(sug)}
                  >
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

        {/* Right Column - Main Form */}
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
                    <option value="KLTN">Khóa luận Tốt nghiệp (KLTN)</option>
                    <option value="BCTT">Thực tập cuối khóa (BCTT)</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-on-surface mb-2">Lĩnh vực <span className="text-error">*</span></label>
                  <input
                    type="text"
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="VD: Machine Learning, Frontend"
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
                <label className="block text-sm font-bold text-on-surface mb-2">Mô tả chi tiết</label>
                <textarea
                  className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary min-h-[120px]"
                  placeholder="Mô tả mục tiêu, hướng thực hiện dự kiến..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-on-surface mb-2">Số lượng sinh viên tối đa</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-on-surface mb-2">Tags (phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Python, AI, Blockchain, ..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>

               <div className="p-4 bg-primary-container-low/20 rounded-xl border border-primary/10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                      <span className="material-symbols-outlined text-sm">person</span>
                   </div>
                   <div>
                      <p className="text-xs text-secondary font-bold uppercase tracking-widest">Giảng viên hướng dẫn</p>
                      <p className="font-bold text-on-surface-container">{user?.full_name || 'Đang tải...'}</p>
                   </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/15 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => router.push('/lecturer/proposals')}>Hủy</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary text-white font-bold px-8">
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined mr-2">save</span>
                      Tạo & Công bố đề tài
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

export default withLecturer(LecturerCreateProposalPage)
