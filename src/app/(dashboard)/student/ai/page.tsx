'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { StudentPageIntro } from '@/components/student/StudentPageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { withStudent } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { cn } from '@/lib/utils'

function StudentAIPage() {
  const { user } = useAuthUser()
  const [messages, setMessages] = React.useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: 'Xin chào! Tôi là Trợ lý AI của Academic Nexus. Tôi có thể giúp gì cho bạn trong việc nghiên cứu và thực hiện khóa luận?' }
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
        content: 'Đây là phản hồi giả lập từ Trợ lý AI. Trong phiên bản thực tế, tôi sẽ kết nối với mô hình ngôn ngữ lớn để hỗ trợ bạn giải đáp thắc mắc về quy trình, định dạng tài liệu, hoặc gợi ý hướng nghiên cứu.' 
      }])
    }, 1000)
  }

  return (
    <Shell
      role="student"
      user={{ name: user?.full_name || 'Sinh viên', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/student' }, { label: 'Trợ lý AI' }]}
    >
      <StudentPageIntro
        eyebrow="AI Assistant"
        title="Trợ lý AI thông minh"
        description="Hỏi đáp về quy trình thực hiện khóa luận, gợi ý tài liệu tham khảo và hỗ trợ viết lách với sức mạnh của trí tuệ nhân tạo."
      />

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
                msg.role === 'ai' ? "bg-primary-fixed text-primary" : "bg-secondary-fixed text-secondary"
              )}>
                {msg.role === 'ai' ? (
                  <span className="material-symbols-outlined">smart_toy</span>
                ) : (
                  <AvatarFallback>{user?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                )}
              </Avatar>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-primary text-on-primary rounded-tr-none" 
                  : "bg-surface-container-high text-on-surface rounded-tl-none font-medium"
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
              placeholder="Nhập câu hỏi của bạn tại đây..."
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

export default withStudent(StudentAIPage)
