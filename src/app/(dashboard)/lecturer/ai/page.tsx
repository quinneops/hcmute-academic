'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { cn } from '@/lib/utils'

function LecturerAIPage() {
  const { user } = useAuthUser()
  const [messages, setMessages] = React.useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: 'Xin chào Thầy/Cô! Tôi là Trợ lý AI dành riêng cho Giảng viên. Tôi có thể hỗ trợ Thầy/Cô tóm tắt báo cáo, gợi ý nhận xét chấm điểm, hoặc kiểm tra tính hợp lệ của tài liệu sinh viên nộp.' }
  ])
  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg = input
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Đây là phản hồi giả lập từ Trợ lý AI. Tôi có khả năng phân tích nội dung các file PDF (đã được trích xuất text) để đưa ra các nhận định sơ bộ, giúp Thầy/Cô tiết kiệm thời gian trong quá trình hướng dẫn và chấm điểm.' 
      }])
    }, 1000)
  }

  return (
    <Shell
      role="lecturer"
      user={{ name: user?.full_name || 'Giảng viên', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Trợ lý AI' }]}
    >
      <div className="mb-8">
        <h2 className="text-3xl font-headline font-bold text-on-surface mb-2">Trợ lý AI cho Giảng viên</h2>
        <p className="text-secondary">Công cụ hỗ trợ chấm điểm, tóm tắt và quản lý khóa luận thông minh.</p>
      </div>

      <div className="max-w-4xl mx-auto h-[600px] flex flex-col bg-surface-container-lowest rounded-2xl shadow-ambient-lg overflow-hidden border border-outline-variant/10">
        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        >
          {messages.map((msg, idx) => (
            <div 
              key={idx}
              className={cn(
                "flex items-start gap-4",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Avatar className={cn(
                "w-10 h-10 shrink-0",
                msg.role === 'ai' ? "bg-primary-fixed text-primary" : "bg-primary text-on-primary"
              )}>
                {msg.role === 'ai' ? (
                  <span className="material-symbols-outlined">auto_awesome</span>
                ) : (
                  <AvatarFallback>{user?.full_name?.charAt(0) || 'G'}</AvatarFallback>
                )}
              </Avatar>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-primary text-on-primary rounded-tr-none shadow-sm" 
                  : "bg-surface-container-high text-on-surface rounded-tl-none font-medium border border-outline-variant/5"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant/10">
          <div className="flex gap-3">
            <Input 
              placeholder="Thầy/Cô muốn hỗ trợ điều gì? (Ví dụ: Tóm tắt bài nộp của SV A...)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-surface-container-lowest border-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <Button onClick={handleSend} className="bg-primary hover:bg-primary/90 px-6 rounded-xl">
              <span className="material-symbols-outlined">send</span>
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default withLecturer(LecturerAIPage)
