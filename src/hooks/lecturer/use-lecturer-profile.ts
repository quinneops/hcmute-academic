/**
 * Lecturer Profile Hook
 * Handles profile data, updates, and avatar upload for lecturers
 */

import * as React from 'react'
import { api } from '@/lib/api/client'
import { createClient } from '@/lib/supabase/client'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  department: string | null
  faculty: string | null
  phone: string | null
  title: string | null // Academic title (Dr., Prof., etc.)
  bio: string | null
  office: string | null
  date_of_birth: string | null
}

export function useLecturerProfile(userId: string) {
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)

  const fetchProfile = React.useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.lecturer.profile.get()
      setProfile(data)
    } catch (err: any) {
      console.error('Profile fetch error:', err)
      setError(err.message || 'Không thể tải hồ sơ')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const updateProfile = async (
    updates: Partial<Profile>
  ): Promise<{ success?: boolean; error?: string }> => {
    if (!userId) return { error: 'Không tìm thấy user ID' }

    setIsUpdating(true)
    setError(null)

    try {
      const data = await api.lecturer.profile.update(updates)
      setProfile(data)
      return { success: true }
    } catch (err: any) {
      console.error('Profile update error:', err)
      setError(err.message || 'Không thể cập nhật hồ sơ')
      return { error: err.message }
    } finally {
      setIsUpdating(false)
    }
  }

  const uploadAvatar = async (
    file: File
  ): Promise<{ success?: boolean; error?: string }> => {
    if (!userId) return { error: 'Không tìm thấy user ID' }

    setIsUploadingAvatar(true)
    setError(null)

    try {
      const supabase = createClient()

      const fileName = `avatars/${userId}`

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName)

      if (!urlData?.publicUrl) {
        throw new Error('Không thể lấy link avatar')
      }

      await api.lecturer.profile.update({ avatar_url: urlData.publicUrl })

      await fetchProfile()
      return { success: true }
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      setError(err.message || 'Không thể tải avatar')
      return { error: err.message }
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const updatePassword = async (
    newPassword: string
  ): Promise<{ success?: boolean; error?: string }> => {
    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      return { success: true }
    } catch (err: any) {
      console.error('Password update error:', err)
      return { error: err.message }
    }
  }

  React.useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    isLoading,
    error,
    isUpdating,
    isUploadingAvatar,
    updateProfile,
    uploadAvatar,
    updatePassword,
    refresh: fetchProfile,
  }
}
