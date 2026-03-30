'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStudentDocuments } from '@/hooks/student/use-student-documents'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { getAuthClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const categories = [
  { id: 'all', label: 'Tất cả' },
  { id: 'academic', label: 'Học vụ' },
  { id: 'template', label: 'Biểu mẫu' },
  { id: 'admin', label: 'Hành chính' },
]

const documentIcons: Record<string, string> = {
  guide: 'menu_book',
  template: 'description',
  regulation: 'gavel',
  form: 'assignment',
  video: 'play_circle',
}

const typeLabels: Record<string, string> = {
  guide: 'Hướng dẫn',
  template: 'Biểu mẫu',
  regulation: 'Quy định',
  form: 'Mẫu đơn',
  video: 'Video',
}

const categoryLabels: Record<string, string> = {
  academic: 'Học vụ',
  template: 'Biểu mẫu',
  admin: 'Hành chính',
}

export default function StudentDocumentsPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [showRequestDialog, setShowRequestDialog] = React.useState(false)
  const [requestTitle, setRequestTitle] = React.useState('')
  const [requestDescription, setRequestDescription] = React.useState('')

  const router = useRouter()

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
    documents,
    category,
    setCategory,
    searchTerm,
    setSearchTerm,
    isLoading,
    error,
    isDownloading,
    downloadDocument,
    requestDocument,
    getTypeLabel,
    getCategoryLabel,
  } = useStudentDocuments()

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

  const handleDownload = async (doc: typeof documents[0]) => {
    const url = await downloadDocument(doc)
    if (url) {
      window.open(url, '_blank')
    }
  }

  const handleRequestDocument = async () => {
    if (!userId) return
    if (!requestTitle.trim()) return

    const result = await requestDocument(userId, requestTitle, requestDescription)
    if (result.success) {
      setShowRequestDialog(false)
      setRequestTitle('')
      setRequestDescription('')
    }
  }

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = category === 'all' || doc.category === category
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/student' }, { label: 'Tài liệu' }]}
      notifications={0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Tài Liệu Khóa Luận
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Biểu mẫu, hướng dẫn và tài liệu tham khảo
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary"
          onClick={() => setShowRequestDialog(true)}
        >
          <span className="material-symbols-outlined text-sm mr-2">add</span>
          Đề xuất tài liệu
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-surface-container-lowest border-l-4 border-primary shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary-fixed text-primary rounded-lg">
                <span className="material-symbols-outlined text-xl">description</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {documents.length}
            </div>
            <p className="text-label-md text-secondary mt-1">Tài liệu</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-blue-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">assignment</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {documents.filter(d => d.type === 'template').length}
            </div>
            <p className="text-label-md text-secondary mt-1">Biểu mẫu</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-emerald-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">menu_book</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {documents.filter(d => d.type === 'guide').length}
            </div>
            <p className="text-label-md text-secondary mt-1">Hướng dẫn</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-amber-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">download</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {documents.reduce((acc, doc) => acc + doc.download_count, 0)}
            </div>
            <p className="text-label-md text-secondary mt-1">Lượt tải</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined text-secondary absolute left-3 top-1/2 -translate-y-1/2">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm tài liệu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={category === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(cat.id)}
                  className={category === cat.id ? 'bg-primary text-white' : 'border-slate-200 text-secondary'}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => (
          <Card key={doc.id} className="bg-surface-container-lowest shadow-ambient-lg border-none hover:shadow-ambient-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">{documentIcons[doc.type]}</span>
                </div>
                <Badge className={cn(
                  doc.category === 'academic' ? 'bg-blue-100 text-blue-700' :
                  doc.category === 'template' ? 'bg-purple-100 text-purple-700' :
                  'bg-slate-100 text-slate-600'
                )}>
                  {categoryLabels[doc.category] || doc.category}
                </Badge>
              </div>

              <h3 className="text-base font-bold text-on-surface mb-2 line-clamp-2">
                {doc.title}
              </h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <span className="material-symbols-outlined text-xs">folder</span>
                  <span>{typeLabels[doc.type] || doc.type}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <span className="material-symbols-outlined text-xs">folder_zip</span>
                  <span>{(doc.file_size || 0 / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <span className="material-symbols-outlined text-xs">calendar_today</span>
                  <span>{new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                <span className="text-xs text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">download</span>
                  {doc.download_count} lượt tải
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary-fixed text-primary"
                    onClick={() => handleDownload(doc)}
                    disabled={isDownloading === doc.id}
                  >
                    {isDownloading === doc.id ? (
                      <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-sm">download</span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-secondary"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none mt-6">
          <CardContent className="py-16 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">folder_open</span>
            <p className="text-slate-400">Không tìm thấy tài liệu nào</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Access Section */}
      <Card className="bg-gradient-to-r from-primary to-primary-container text-white shadow-lg shadow-primary/20 border-none mt-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-2">Cần tìm tài liệu khác?</h3>
              <p className="text-sm text-white/80">Gửi yêu cầu cho bộ phận học vụ để được hỗ trợ</p>
            </div>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => setShowRequestDialog(true)}
            >
              <span className="material-symbols-outlined text-sm mr-2">help</span>
              Yêu cầu hỗ trợ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Request Dialog */}
      {showRequestDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Đề xuất tài liệu</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold mb-2 block">Tên tài liệu</label>
                <input
                  type="text"
                  className="w-full p-3 border border-outline-variant rounded-lg text-sm"
                  placeholder="Nhập tên tài liệu cần tìm..."
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-bold mb-2 block">Mô tả</label>
                <textarea
                  className="w-full p-3 border border-outline-variant rounded-lg text-sm"
                  rows={4}
                  placeholder="Mô tả thêm về tài liệu bạn cần..."
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRequestDialog(false)
                  setRequestTitle('')
                  setRequestDescription('')
                }}
              >
                Hủy
              </Button>
              <Button
                className="bg-primary text-white"
                onClick={handleRequestDocument}
                disabled={!requestTitle.trim()}
              >
                Gửi yêu cầu
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
