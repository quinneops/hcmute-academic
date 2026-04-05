'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { withLecturer } from '@/hocs/with-role-check'
import { useChat } from 'ai/react'
import { useAuthUser } from '@/hooks/use-auth-user'
import { Loader2, Send, Bot, User, Trash2, Link as LinkIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function AIAssistantPage() {
  const { user } = useAuthUser()
  const searchParams = useSearchParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Context params from URL
  const contextType = searchParams.get('contextType')
  const contextId = searchParams.get('contextId')
  const contextTitle = searchParams.get('contextTitle')

  const [initialContextSet, setInitialContextSet] = useState(false)

  // Get token from localStorage
  const getToken = () => {
    if (typeof window === 'undefined') return null
    try {
      const tokenStr = localStorage.getItem('sb-hhqwraokxkynkmushugf-auth-token')
      if (tokenStr) {
        return JSON.parse(tokenStr)?.access_token || null
      }
    } catch (e) {
      return null
    }
    return null
  }

  // Initialize chat with ai/react
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/ai/chat',
    headers: {
      Authorization: `Bearer ${getToken()}`
    },
    body: {
      contextData: contextType ? {
        type: contextType,
        id: contextId,
        title: contextTitle
      } : null
    },
    onFinish: () => {
      // Save messages to local storage when chat updates
      try {
        localStorage.setItem('lecturer-ai-chat-history', JSON.stringify(messages))
      } catch (e) {
        console.error('Failed to save chat history', e)
      }
    }
  })

  // Load chat history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lecturer-ai-chat-history')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) {
          setMessages(parsed)
        }
      }
    } catch (e) {
      console.error('Failed to load chat history', e)
    }
    setInitialContextSet(true)
  }, [setMessages])

  // Save on messages change too just to be safe
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      localStorage.setItem('lecturer-ai-chat-history', JSON.stringify(messages))
    }
  }, [messages, isLoading])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const clearHistory = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?')) {
      setMessages([])
      localStorage.removeItem('lecturer-ai-chat-history')
    }
  }

  return (
    <Shell
      role="lecturer"
      isTbm={user?.is_tbm}
      user={{ name: user?.full_name || 'Giảng viên', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Trợ lý AI' }]}
    >
      <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Trợ lý AI</h1>
          <p className="text-secondary text-sm">Trò chuyện với AI để được hỗ trợ quản lý đề tài, sinh viên và chấm điểm.</p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-outline-variant/30 shadow-ambient-sm">
          <CardHeader className="py-3 px-4 bg-surface-container-lowest border-b border-outline-variant/20 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <Bot className="w-5 h-5" />
                Hệ thống Trợ lý
              </CardTitle>
              {contextType && (
                <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                  <LinkIcon className="w-3 h-3" />
                  Đang xem: {contextType} {contextTitle && `(${contextTitle})`}
                </CardDescription>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={clearHistory} className="h-8 text-xs text-error border-error/20 hover:bg-error/10 hover:text-error">
              <Trash2 className="w-3 h-3 mr-1" /> Xóa lịch sử
            </Button>
          </CardHeader>

          {/* Chat Messages */}
          <CardContent className="flex-1 p-0 overflow-y-auto bg-surface-container-lowest">
            <div className="flex flex-col gap-4 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-secondary">
                  <div className="w-16 h-16 bg-primary-container/30 rounded-full flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-on-surface mb-2">Xin chào! Tôi có thể giúp gì cho bạn?</h3>
                  <p className="text-sm max-w-md mx-auto">
                    Tôi có thể xem danh sách đề tài của bạn, kiểm tra sinh viên, và hỗ trợ bạn trong việc đánh giá khóa luận. Hãy hỏi tôi!
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 max-w-[85%] ${
                      message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      message.role === 'user' ? 'bg-primary text-white' : 'bg-secondary-container text-on-secondary-container'
                    }`}>
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className={`rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-surface-container-low text-on-surface border border-outline-variant/20 rounded-tl-sm'
                    }`}>
                      <div className="prose prose-sm max-w-none dark:prose-invert break-words">
                        {message.content}

                        {/* Render function calls if any */}
                        {message.function_call && (
                          <div className="mt-2 flex flex-col gap-1">
                            <div className="text-xs bg-surface-container-high px-2 py-1 rounded text-secondary flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {typeof message.function_call === 'string'
                                ? JSON.parse(message.function_call).name
                                : message.function_call.name}
                              ...
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3 max-w-[80%] mr-auto">
                  <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-secondary">Đang suy nghĩ...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          {/* Input Area */}
          <div className="p-3 bg-surface-container-low border-t border-outline-variant/20">
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Nhập tin nhắn của bạn..."
                className="flex-1 px-4 py-2 bg-surface-container-lowest border border-outline-variant/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-full text-sm outline-none transition-all"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-full p-0 flex items-center justify-center shrink-0 bg-primary hover:bg-primary/90 text-white shadow-ambient-sm"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </Shell>
  )
}

export default withLecturer(AIAssistantPage)
