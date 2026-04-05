'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const suggestionsRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input
    if (!textToSend.trim() || isLoading) return

    const newMessages = [...messages, { role: 'user' as const, content: textToSend }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const history = newMessages.map(m => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content
      }))

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

  const scrollSuggestions = (direction: 'left' | 'right') => {
    if (suggestionsRef.current) {
      const scrollAmount = 300
      suggestionsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
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
        
        .gemini-gradient-text {
          background: linear-gradient(90deg, #4285f4, #9b72cb, #d96570);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @keyframes subtle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-float { animation: subtle-float 3s ease-in-out infinite; }

        .scroll-button-container:hover .scroll-button { opacity: 1; }
        .scroll-button { opacity: 0; transition: opacity 0.2s ease; }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-160px)] w-full max-w-4xl mx-auto relative">
        {/* Messages / Welcome Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-8 scrollbar-hide space-y-12"
        >
          {messages.length <= 1 && (
            <div className="flex flex-col items-center justify-center pt-20 pb-10 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center animate-float">
                <span className="material-symbols-outlined text-4xl gemini-gradient-text">auto_awesome</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-headline font-black text-slate-900 tracking-tight">
                  Xin chào {user?.full_name?.split(' ').pop() || 'Thầy/Cô'}!
                </h2>
                <p className="text-2xl font-headline font-medium text-slate-400">
                  Chúng ta nên bắt đầu từ đâu nhỉ?
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500",
                msg.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div className={cn(
                "flex items-start gap-4 max-w-[85%]",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border text-xs font-bold transition-all",
                  msg.role === 'ai' ? "bg-white border-slate-100" : "bg-slate-900 text-white border-transparent"
                )}>
                  {msg.role === 'ai' ? (
                    <span className="material-symbols-outlined text-sm gemini-gradient-text">auto_awesome</span>
                  ) : (
                    user?.full_name?.charAt(0) || 'U'
                  )}
                </div>
                <div className={cn(
                  "p-4 rounded-2xl text-[15px] leading-relaxed transition-all",
                  msg.role === 'user'
                    ? "bg-slate-100 text-slate-800 rounded-tr-none"
                    : "text-slate-800 font-medium"
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
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-sm gemini-gradient-text animate-pulse">auto_awesome</span>
              </div>
              <div className="flex gap-1.5 items-center p-4">
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Input Area (Gemini Style) */}
        <div className="sticky bottom-0 left-0 right-0 pt-10 pb-4 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="relative bg-slate-100/50 border border-slate-200 shadow-xl rounded-[2.5rem] p-3 transition-all focus-within:bg-white focus-within:shadow-blue-500/5 focus-within:border-slate-300">
              {/* Pre-input Icon Group */}
              <div className="absolute left-6 top-7 -translate-y-1/2 flex items-center text-slate-400 select-none">
                <span className="text-xl font-headline font-bold opacity-30">#</span>
              </div>

              <div className="flex flex-col">
                <Input
                  placeholder="Thầy/Cô hãy nhập yêu cầu tại đây..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none text-slate-800 placeholder:text-slate-400 h-10 pl-10 pr-12 focus-visible:ring-0 text-md shadow-none font-medium"
                />

                {/* Bottom Row - Just Send Button on Right */}
                <div className="flex items-center justify-end px-2 pt-2 border-t border-slate-200/30 mt-1">
                  <Button
                    onClick={() => handleSend()}
                    disabled={isLoading || !input.trim()}
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center p-0 transition-all",
                      input.trim() ? "bg-slate-900 text-white shadow-lg rotate-0" : "bg-slate-200 text-slate-400"
                    )}
                  >
                    <span className="material-symbols-outlined text-lg">send</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Persistent Suggestions Horizontal Scroll */}
            <div className="relative group scroll-button-container">
              {/* Scroll Buttons */}
              <button
                onClick={() => scrollSuggestions('left')}
                className="scroll-button absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-primary transition-all active:scale-90"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              <div
                ref={suggestionsRef}
                className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-2 px-1 relative"
              >
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.text)}
                    className="flex items-center gap-2.5 px-5 py-3 bg-white border border-slate-200 rounded-full whitespace-nowrap text-[11px] font-black uppercase tracking-tight text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 shrink-0 group"
                  >
                    <span className="text-base group-hover:scale-125 transition-transform">{p.icon}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => scrollSuggestions('right')}
                className="scroll-button absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-primary transition-all active:scale-90"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.2em] opacity-60">Academic AI Studio • Powered by groq.com</p>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default withLecturer(LecturerAIPage)
