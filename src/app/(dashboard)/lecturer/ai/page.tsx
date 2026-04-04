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
import { api } from '@/lib/api/client'
import ReactMarkdown from 'react-markdown'

function LecturerAIPage() {
  const { user } = useAuthUser()
  const [messages, setMessages] = React.useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: 'Xin chào Thầy/Cô! Tôi là Trợ lý AI cấp cao của Academic Nexus. Hãy hỏi tôi bất cứ điều gì về lịch trình, sinh viên hoặc dữ liệu khóa luận.' }
  ])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input
    if (!textToSend.trim() || isLoading) return

    setMessages(prev => [...prev, { role: 'user', content: textToSend }])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content
      }))
      history.push({ role: 'user', content: textToSend })

      const response = await api.ai.assistant.chat(history)
      setMessages(prev => [...prev, { role: 'ai', content: response.content }])
    } catch (error: any) {
      console.error('AI Chat Error:', error)
      setMessages(prev => [...prev, { role: 'ai', content: 'Xin lỗi Thầy/Cô, hiện tại tôi không thể kết nối với máy chủ AI. Vui lòng thử lại sau ít phút.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedPrompts = [
    { icon: '📊', text: "Thống kê tổng quan sinh viên & đề tài" },
    { icon: '📅', text: "Lịch hẹn sắp tới của tôi?" },
    { icon: '👥', text: "Danh sách sinh viên tôi đang hướng dẫn" },
    { icon: '⚠️', text: "Sinh viên nào đang chậm tiến độ?" },
    { icon: '🔍', text: "Tìm các đề tài về mảng Web/Mobile" },
    { icon: '📝', text: "Kiểm tra các bài nộp gần đây" },
    { icon: '👤', text: "Chi tiết về sinh viên 20110300" },
    { icon: '💡', text: "Gợi ý hướng phát triển cho đề tài" }
  ]

  return (
    <Shell
      role="lecturer"
      user={{
        name: user?.full_name || 'Giảng viên',
        email: user?.email || '...',
        avatar: user?.avatar_url || '',
        is_tbm: user?.is_tbm,
        is_secretary: user?.is_secretary
      }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'AI Studio' }]}
    >
      <style>{`
        .prose-ai table { width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid #e2e8f0; font-size: 0.85rem; }
        .prose-ai th { background: #f8fafc; padding: 0.75rem; text-align: left; border: 1px solid #e2e8f0; font-weight: bold; color: #475569; }
        .prose-ai td { padding: 0.75rem; border: 1px solid #e2e8f0; color: #1e293b; }
        .prose-ai h3 { font-size: 1.1rem; font-weight: bold; margin: 1.5rem 0 0.75rem 0; color: #0f172a; border-bottom: 2px solid #3b82f633; padding-bottom: 4px; display: inline-block; }
        .prose-ai ul { list-style-type: disc; padding-left: 1.5rem; margin: 1rem 0; }
        .prose-ai li { margin-bottom: 0.5rem; }
        .prose-ai strong { color: #2563eb; font-weight: 600; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="flex h-[calc(100vh-140px)] w-full overflow-hidden bg-slate-50 rounded-3xl border border-slate-200 shadow-xl">
        {/* Sidebar - ChatGPT Style */}
        <div className={cn(
          "bg-slate-900 text-white flex flex-col transition-all duration-300 overflow-hidden",
          isSidebarOpen ? "w-80" : "w-0"
        )}>
          <div className="p-6 flex items-center justify-between">
            <span className="font-headline font-bold text-lg tracking-tight">Lệnh nhanh</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-hide">
             {suggestedPrompts.map((p, idx) => (
               <button 
                 key={idx}
                 onClick={() => handleSend(p.text)}
                 className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all group border border-transparent hover:border-white/5"
               >
                 <span className="text-lg group-hover:scale-125 transition-transform">{p.icon}</span>
                 <span className="truncate">{p.text}</span>
               </button>
             ))}
          </div>
          <div className="p-4 border-t border-white/5 bg-black/20">
             <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI Agent: Ready</span>
             </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative bg-white">
          {/* Header */}
          <div className="h-14 border-b border-slate-100 flex items-center px-4 justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 transition-all">
             <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500">
                <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
             </Button>
             <div className="flex items-center gap-2">
                <div className="bg-blue-600/10 p-1 rounded-lg">
                  <span className="material-symbols-outlined text-blue-600 text-sm">smart_toy</span>
                </div>
                <span className="font-bold text-sm text-slate-700">Academic AI Studio</span>
             </div>
             <div className="w-10"></div>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto pt-10 pb-32 scrollbar-hide"
          >
            <div className="max-w-4xl mx-auto px-6 space-y-10">
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "flex items-start gap-4 max-w-[90%]",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-md border",
                      msg.role === 'ai' ? "border-blue-200" : "border-slate-200"
                    )}>
                      {msg.role === 'ai' ? (
                        <img src="/images/ai-avatar.png" alt="AI" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                          {user?.full_name?.charAt(0) || 'G'}
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "p-5 rounded-3xl text-[14px] leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none"
                    )}>
                      {msg.role === 'ai' ? (
                          <div className="prose-ai">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                      ) : (
                          msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-200 shadow-md">
                    <img src="/images/ai-avatar.png" alt="AI" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl rounded-tl-none border border-slate-200 shadow-sm min-w-[80px] flex items-center justify-center">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area - ChatGPT Pill Style */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <div className="relative group bg-white border border-slate-200 shadow-xl rounded-[2rem] p-2 pr-4 transition-all focus-within:border-blue-400/50 focus-within:shadow-blue-500/10">
                 <div className="flex items-center gap-1 overflow-hidden">
                    <Input 
                        placeholder="Thầy/Cô hãy nhập yêu cầu tại đây..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isLoading}
                        className="flex-1 bg-transparent border-none text-slate-800 placeholder:text-slate-400 h-14 px-5 focus-visible:ring-0 text-md shadow-none"
                    />
                    <Button 
                        onClick={() => handleSend()} 
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-12 w-12 rounded-2xl flex items-center justify-center p-0 shadow-lg group transition-all"
                    >
                        <span className="material-symbols-outlined text-xl group-hover:rotate-45 transition-transform">send</span>
                    </Button>
                 </div>
              </div>
              <p className="text-[10px] text-center mt-3 text-slate-400 font-medium">Bản quyền thuộc về Academic Nexus AI v1.0. Chúc Thầy/Cô một ngày làm việc hiệu quả!</p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default withLecturer(LecturerAIPage)
