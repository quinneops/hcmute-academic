'use client'

import * as React from 'react'
import { FlowPageIntro } from '@/components/flow/FlowPageIntro'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAdminProfile } from '@/hooks/admin/use-admin-profile'
import { getAuthClient } from '@/lib/supabase/client'

export default function AdminProfilePage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [formData, setFormData] = React.useState({
    full_name: '',
    phone: '',
    position: '',
    date_of_birth: '',
  })
  const [showPasswordDialog, setShowPasswordDialog] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

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

  const {
    profile,
    isLoading,
    error,
    isUpdating,
    isUploadingAvatar,
    updateProfile,
    uploadAvatar,
    updatePassword,
  } = useAdminProfile(userId || '')

  const user = profile
    ? {
        name: profile.full_name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.avatar_url || '',
      }
    : {
        name: 'Quản trị viên',
        email: '',
        avatar: '',
      }

  React.useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        position: profile.position || '',
        date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : '',
      })
    }
  }, [profile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    const result = await updateProfile({
      full_name: formData.full_name,
      phone: formData.phone,
      position: formData.position,
      date_of_birth: formData.date_of_birth || null,
    })

    if (result.success) {
      setIsEditing(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      await uploadAvatar(e.target.files[0])
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp')
      return
    }
    if (newPassword.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    const result = await updatePassword(newPassword)
    if (result.success) {
      setShowPasswordDialog(false)
      setNewPassword('')
      setConfirmPassword('')
      alert('Đổi mật khẩu thành công')
    } else {
      alert('Đổi mật khẩu thất bại: ' + result.error)
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
      role="admin"
      user={user}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/admin' }, { label: 'Hồ sơ' }]}
      notifications={0}
    >
      <FlowPageIntro
        eyebrow="Admin / profile"
        title="Hồ sơ quản trị viên"
        description="Quản lý thông tin cá nhân và thiết lập tài khoản quản trị với cùng ngôn ngữ thiết kế của toàn bộ admin flow."
        actions={
          <Button onClick={() => setIsEditing(!isEditing)}>
            <span className="material-symbols-outlined text-sm mr-2">{isEditing ? 'close' : 'edit'}</span>
            {isEditing ? 'Hủy' : 'Chỉnh sửa'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Card */}
        <div>
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none sticky top-24">
            <CardContent className="pt-8">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Avatar'}
                      className="w-32 h-32 rounded-full object-cover mb-4"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-primary-fixed flex items-center justify-center text-4xl font-bold text-primary mb-4">
                      {(profile?.full_name || user.name).split(' ').pop()?.charAt(0)}
                    </div>
                  )}
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                      <span className="material-symbols-outlined text-white text-sm">camera_alt</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={isUploadingAvatar}
                      />
                    </label>
                  )}
                </div>
                <h3 className="text-headline-md font-headline font-bold text-on-surface text-center">
                  {profile?.full_name || user.name}
                </h3>
                <Badge className="mt-2 bg-primary-fixed text-primary text-[10px] font-bold uppercase">
                  Quản trị viên
                </Badge>
              </div>

              {/* Quick Info */}
              <div className="space-y-4 pt-6 border-t border-outline-variant/15">
                <div className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary text-lg">mail</span>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase">Email</p>
                    <p className="text-on-surface">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary text-lg">phone</span>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase">Điện thoại</p>
                    <p className="text-on-surface">{profile?.phone || 'Chưa cập nhật'}</p>
                  </div>
                </div>
                {profile?.position && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-secondary text-lg">badge</span>
                    <div>
                      <p className="text-[10px] font-bold text-secondary uppercase">Chức vụ</p>
                      <p className="text-on-surface">{profile.position}</p>
                    </div>
                  </div>
                )}
                {profile?.faculty && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-secondary text-lg">school</span>
                    <div>
                      <p className="text-[10px] font-bold text-secondary uppercase">Khoa</p>
                      <p className="text-on-surface">{profile.faculty}</p>
                    </div>
                  </div>
                )}
                {profile?.department && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-secondary text-lg">business</span>
                    <div>
                      <p className="text-[10px] font-bold text-secondary uppercase">Bộ môn</p>
                      <p className="text-on-surface">{profile.department}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Profile Details */}
        <div className="lg:col-span-2">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Thông tin cá nhân
              </CardTitle>
              <CardDescription className="text-secondary">
                Cập nhật thông tin cá nhân của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Info Section */}
              <div>
                <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">
                  Thông tin cá nhân
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-2">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface font-medium disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-2">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface font-medium disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info Section */}
              <div>
                <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">
                  Thông tin liên hệ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-2">
                      Điện thoại
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface font-medium disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-2">
                      Chức vụ
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface font-medium disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="VD: Trưởng phòng, Phó phòng, ..."
                    />
                  </div>
                </div>
              </div>

              {/* Read-only Info */}
              <div>
                <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">
                  Thông tin tài khoản
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full px-4 py-3 bg-surface-container-lowest rounded-lg border border-outline-variant/30 text-on-surface font-medium opacity-70 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-2">
                      Vai trò
                    </label>
                    <input
                      type="text"
                      value="Quản trị viên"
                      disabled
                      className="w-full px-4 py-3 bg-surface-container-lowest rounded-lg border border-outline-variant/30 text-on-surface font-medium opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-3 pt-6 border-t border-outline-variant/15">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary"
                    onClick={handleSave}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm mr-2">save</span>
                        Lưu thay đổi
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-200 text-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Hủy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
  

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold mb-2 block">Mật khẩu mới</label>
                <input
                  type="password"
                  className="w-full p-3 border border-outline-variant rounded-lg text-sm"
                  placeholder="Nhập mật khẩu mới..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-bold mb-2 block">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  className="w-full p-3 border border-outline-variant rounded-lg text-sm"
                  placeholder="Nhập lại mật khẩu..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
              >
                Hủy
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
