'use client'

import * as React from 'react'
import { FlowPageIntro } from '@/components/flow/FlowPageIntro'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'

function LecturerProposalCreatePage() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    requirements: '',
    max_students: '1',
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Tiêu đề là bắt buộc')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      await api.lecturer.proposals.create({
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category || undefined,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        requirements: formData.requirements || undefined,
        max_students: parseInt(formData.max_students) || 1,
      })

      setSuccess(true)

      setTimeout(() => {
        router.push('/lecturer/proposals')
      }, 2000)
    } catch (err: any) {
      console.error('Create proposal error:', err)
      setError(err.message || 'Không thể tạo đề cương')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Shell
      role="lecturer"
      isTbm={user?.is_tbm}
      user={{ name: user?.full_name || 'Giảng viên', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[
        { label: 'Bảng điều khiển', href: '/lecturer' },
        { label: 'Đề cương', href: '/lecturer/proposals' },
        { label: 'Tạo mới' },
      ]}
      notifications={0}
    >
      <FlowPageIntro
        eyebrow="Lecturer flow / create proposal"
        title="Tạo đề cương mới"
        description="Tạo đề tài khóa luận tốt nghiệp với một lớp mở đầu đồng nhất hơn cùng phần còn lại của lecturer flow."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/lecturer/proposals')}
          >
            <span className="material-symbols-outlined text-sm mr-2">arrow_back</span>
            Quay lại
          </Button>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          <p className="font-bold">Lỗi: {error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
          <p className="font-bold">✓ Đã tạo đề cương thành công! Đang chuyển hướng...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Thông tin đề cương
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-bold text-secondary uppercase block mb-2">
                  Tiêu đề <span className="text-error">*</span>
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Ứng dụng AI chẩn đoán bệnh từ ảnh X-quang"
                  className="text-base"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-secondary uppercase block mb-2">
                  Mô tả
                </label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả ngắn gọn về đề tài..."
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-secondary uppercase block mb-2">
                  Danh mục
                </label>
                <Input
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Machine Learning, Web Development, ..."
                />
              </div>

              <div>
                <label className="text-sm font-bold text-secondary uppercase block mb-2">
                  Tags (phân cách bằng dấu phẩy)
                </label>
                <Input
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="AI, Python, React, ..."
                />
              </div>

              <div>
                <label className="text-sm font-bold text-secondary uppercase block mb-2">
                  Yêu cầu
                </label>
                <Textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  placeholder="Các yêu cầu về kiến thức, kỹ năng cần thiết..."
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-secondary uppercase block mb-2">
                  Số lượng sinh viên tối đa
                </label>
                <Input
                  name="max_students"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.max_students}
                  onChange={handleInputChange}
                  className="w-32"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-outline-variant/15">
                <Button
                  className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.title.trim()}
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm mr-2">save</span>
                      Tạo đề cương
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/lecturer/proposals')}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-primary text-white shadow-xl shadow-primary/10 sticky top-24">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4">Hướng dẫn</h3>
              <div className="space-y-4 text-sm text-white/90">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg">info</span>
                  <div>
                    <p className="font-bold text-white">Tiêu đề</p>
                    <p>Nên ngắn gọn, rõ ràng và mô tả đúng nội dung đề tài</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg">description</span>
                  <div>
                    <p className="font-bold text-white">Mô tả</p>
                    <p>Giới thiệu về mục tiêu, ý nghĩa và phạm vi của đề tài</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg">category</span>
                  <div>
                    <p className="font-bold text-white">Danh mục</p>
                    <p>Phân loại đề tài theo lĩnh vực nghiên cứu</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg">assignment</span>
                  <div>
                    <p className="font-bold text-white">Yêu cầu</p>
                    <p>Các kiến thức và kỹ năng cần thiết để thực hiện đề tài</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  )
}

export default withLecturer(LecturerProposalCreatePage)
