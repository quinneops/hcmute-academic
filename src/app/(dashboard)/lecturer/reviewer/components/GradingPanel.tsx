'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Criteria {
  name: string
  sub: string
  key: string
  maxScore: number
  levels: Record<string, { score: string; text: string }>
}

interface GradingPanelProps {
  submission: any
  criteria: Criteria[]
  scores: Record<string, string>
  feedback: string
  onScoreChange: (key: string, value: string) => void
  onFeedbackChange: (value: string) => void
  onSubmit: (publish: boolean) => void
  isPublishing: boolean
  calculateTotal: string
  // AI Props
  isGeneratingAi: boolean
  aiSuggestions: any
  onGenerateAiSuggestion: () => void
  isGeneratingSummary: boolean
  submissionSummary: any
  onGenerateSummary: () => void
  isCheckingPlagiarism: boolean
  plagiarismReport: any
  onCheckPlagiarism: () => void
  onShowTurnitin: () => void
}

export function GradingPanel({
  submission,
  criteria,
  scores,
  feedback,
  onScoreChange,
  onFeedbackChange,
  onSubmit,
  isPublishing,
  calculateTotal,
  isGeneratingAi,
  aiSuggestions,
  onGenerateAiSuggestion,
  isGeneratingSummary,
  submissionSummary,
  onGenerateSummary,
  isCheckingPlagiarism,
  plagiarismReport,
  onCheckPlagiarism,
  onShowTurnitin
}: GradingPanelProps) {
  if (submission.has_grade) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl shadow-ambient-lg border-emerald-100 rounded-3xl overflow-hidden h-full flex flex-col">
        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 p-6 flex flex-row items-center justify-between">
          <CardTitle className="font-headline font-black text-emerald-900 text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">verified</span>
            KẾT QUẢ CHẤM CHUẨN
          </CardTitle>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-3xl font-black text-emerald-600 tracking-tighter tabular-nums leading-none">{submission.grade_score?.toFixed(1)}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">ĐIỂM TỔNG CỘNG</p>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 flex-1 overflow-y-auto space-y-8">
           <div className="p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100 border-dashed">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4">NHẬN XÉT:</p>
              <p className="text-sm text-emerald-900 leading-relaxed font-medium italic opacity-90">"{submission.grade_feedback}"</p>
           </div>
           
           <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CHI TIẾT BÀI NỘP</p>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50/50 rounded-2xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Trạng thái</p>
                    <Badge className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-lg border-none uppercase">{submission.status}</Badge>
                 </div>
                 <div className="p-4 bg-slate-50/50 rounded-2xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Vòng</p>
                    <p className="text-xs font-black text-slate-700">VÒNG {submission.round_number}</p>
                 </div>
              </div>
           </div>
           
           <Button variant="outline" className="w-full h-12 rounded-2xl border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest">
              Xem lịch sử cập nhật
           </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/80 backdrop-blur-xl shadow-ambient-lg border-slate-200/50 rounded-3xl overflow-hidden h-full flex flex-col">
       <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-[#002068] text-white flex items-center justify-center shadow-lg shadow-blue-900/10">
                <span className="material-symbols-outlined text-xl">analytics</span>
             </div>
             <div>
                <CardTitle className="font-headline font-black text-[#002068] text-sm tracking-tight uppercase">BẢNG ĐIỂM</CardTitle>
                <p className="text-[10px] font-bold text-slate-400 italic">Tiêu chí bởi Hội đồng Học thuật 03/TV</p>
             </div>
          </div>
          <div className="text-right">
             <span className="text-3xl font-black text-[#002068] tracking-tighter tabular-nums leading-none">{calculateTotal}</span>
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">TỔNG / 10</p>
          </div>
       </CardHeader>

       <CardContent className="p-6 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
           {/* AI Helper Buttons */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <span className="material-symbols-outlined text-sm">auto_awesome</span>
                   PHÂN TÍCH TINH TẾ (AI)
                </p>
                <Button 
                   variant="outline" 
                   size="sm" 
                   className="text-[9px] font-black h-7 rounded-lg border-purple-200 text-purple-600 hover:bg-purple-50"
                   onClick={onGenerateAiSuggestion}
                   disabled={isGeneratingAi}
                >
                   {isGeneratingAi ? 'ĐANG PHÂN TÍCH...' : 'GỢI Ý CHẤM ĐIỂM AI'}
                </Button>
             </div>
             
             <div className="grid grid-cols-2 gap-2">
                <Button 
                   variant="secondary" 
                   className="h-10 text-[10px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 border-none rounded-xl"
                   onClick={onGenerateSummary}
                   disabled={isGeneratingSummary}
                >
                   {isGeneratingSummary ? 'ĐANG TÓM TẮT...' : 'TÓM TẮT'}
                </Button>
                <Button 
                   variant="secondary" 
                   className="h-10 text-[10px] font-black bg-orange-50 text-orange-600 hover:bg-orange-100 border-none rounded-xl"
                   onClick={onCheckPlagiarism}
                   disabled={isCheckingPlagiarism}
                >
                   {isCheckingPlagiarism ? 'ĐANG ĐỌC...' : 'KIỂM TRA ĐẠO VĂN'}
                </Button>
             </div>

             {/* AI Feedback Display */}
             {aiSuggestions && (
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl animate-in fade-in duration-300">
                   <p className="text-[10px] font-black text-purple-900 uppercase mb-2">GỢI Ý NHẬN XÉT (AI):</p>
                   <p className="text-xs text-purple-800 leading-relaxed font-medium italic mb-3">"{aiSuggestions.overall_feedback}"</p>
                   <div className="grid grid-cols-1 gap-2">
                      {aiSuggestions.strengths?.slice(0, 2).map((s: string, i: number) => (
                        <div key={i} className="flex gap-2 text-[10px] text-emerald-800 bg-white/50 p-2 rounded-lg border border-emerald-100/30">
                           <span className="font-black">✓</span> {s}
                        </div>
                      ))}
                      {aiSuggestions.areas_for_improvement?.slice(0, 2).map((a: string, i: number) => (
                        <div key={i} className="flex gap-2 text-[10px] text-orange-800 bg-white/50 p-2 rounded-lg border border-orange-100/30">
                           <span className="font-black">!</span> {a}
                        </div>
                      ))}
                   </div>
                </div>
             )}

             {/* AI Summary Display */}
             {submissionSummary && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl animate-in fade-in duration-300">
                   <p className="text-[10px] font-black text-blue-900 uppercase mb-2">TÓM TẮT NỘI DUNG (AI):</p>
                   <p className="text-xs text-blue-800 leading-relaxed font-medium italic mb-3">"{submissionSummary.executive_summary || submissionSummary.summary || 'Đã tạo tóm tắt'}"</p>
                   <div className="grid grid-cols-1 gap-2">
                      {submissionSummary.key_contributions?.map((k: string, i: number) => (
                        <div key={i} className="flex gap-2 text-[10px] text-blue-800 bg-white/50 p-2 rounded-lg border border-blue-100/30">
                           <span className="font-black">📌</span> {k}
                        </div>
                      ))}
                   </div>
                </div>
             )}

             {/* Plagiarism Report Display */}
             {plagiarismReport && (
                <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl animate-in fade-in duration-300">
                   <p className="text-[10px] font-black text-orange-900 uppercase mb-2">KIỂM TRA ĐẠO VĂN (AI):</p>
                   <p className="text-[20px] font-black text-orange-600 mb-2">{plagiarismReport.originality_score}% Độ nguyên bản</p>
                   {plagiarismReport.overall_assessment && (
                     <p className="text-xs text-orange-800 leading-relaxed font-medium mb-3 italic">"{plagiarismReport.overall_assessment}"</p>
                   )}
                   <div className="grid grid-cols-1 gap-2">
                      {plagiarismReport.flagged_sections?.slice(0, 3).map((match: any, i: number) => (
                        <div key={i} className="flex gap-2 text-[10px] text-orange-800 bg-white/50 p-2 rounded-lg border border-orange-100/30">
                           <span className="font-black">⚠</span> {match.reason}
                        </div>
                      ))}
                   </div>
                </div>
             )}
          </div>

          <div className="h-[1px] bg-slate-100" />

          {/* Criteria Sliders */}
          <div className="space-y-8">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">tune</span>
                CHI TIẾT ĐIỂM
             </p>
             
             {criteria.map((item) => (
                <div key={item.key} className="space-y-3 p-1 group">
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-xs font-black text-[#002068] uppercase tracking-tight">{item.name}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.sub}</p>
                      </div>
                      <div className="flex items-baseline gap-1">
                         <input 
                            type="number"
                            step="0.1"
                            min="0"
                            max={item.maxScore}
                            value={scores[item.key] || ''}
                            onChange={(e) => onScoreChange(item.key, e.target.value)}
                            className="w-12 text-right font-black text-lg text-[#002068] bg-transparent focus:outline-none placeholder:text-slate-200"
                            placeholder="0.0"
                         />
                         <span className="text-[9px] font-black text-slate-300">/ {item.maxScore}</span>
                      </div>
                   </div>
                   
                   <input 
                      type="range"
                      min="0"
                      max={item.maxScore}
                      step="0.1"
                      value={scores[item.key] || '0'}
                      onChange={(e) => onScoreChange(item.key, e.target.value)}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#002068] hover:bg-slate-200 transition-colors"
                   />
                   
                   <div className="grid grid-cols-4 gap-1">
                      {Object.entries(item.levels).map(([level, data], idx) => (
                         <div key={level} className="text-center">
                            <p className="text-[8px] font-black text-slate-300 group-hover:text-slate-400 transition-colors uppercase tracking-tight">{level.replace('_', ' ')}</p>
                         </div>
                      ))}
                   </div>
                </div>
             ))}
          </div>

          <div className="h-[1px] bg-slate-100" />           {/* Feedback & Actions */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <span className="material-symbols-outlined text-sm">comment</span>
                   NHẬN XÉT CHÍNH THỨC
                </p>
                <Button 
                   variant="outline" 
                   size="sm" 
                   className="text-[9px] font-black h-7 rounded-lg border-blue-100 text-[#002068] hover:bg-blue-50"
                   onClick={onShowTurnitin}
                >
                   <span className="material-symbols-outlined text-sm mr-1">security</span>
                   ĐÍNH KÈM TURNITIN
                </Button>
             </div>
             
             <div className="space-y-4">
               <div>
                  <p className="text-[10px] font-black text-[#002068] uppercase mb-2">Nhận xét chuyên môn</p>
                  <textarea 
                     value={scores['reviewer_feedback'] !== undefined ? scores['reviewer_feedback'] : feedback}
                     onChange={(e) => {
                       onFeedbackChange(e.target.value)
                       onScoreChange('reviewer_feedback', e.target.value)
                     }}
                     placeholder="Nhập nhận xét chuyên môn, ưu khuyết điểm..."
                     className="w-full h-24 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#002068]/10 focus:bg-white transition-all placeholder:text-slate-300"
                  />
               </div>
               <div>
                  <p className="text-[10px] font-black text-[#002068] uppercase mb-2">Câu hỏi phản biện</p>
                  <textarea 
                     value={scores['reviewer_questions'] || ''}
                     onChange={(e) => onScoreChange('reviewer_questions', e.target.value)}
                     placeholder="Nhập 2-3 câu hỏi phản biện sinh viên cần trả lời..."
                     className="w-full h-24 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#002068]/10 focus:bg-white transition-all placeholder:text-slate-300"
                  />
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3 pt-4">
                <Button 
                   variant="outline" 
                   className="h-12 font-black text-xs text-slate-500 rounded-2xl border-slate-200 hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-widest"
                   onClick={() => onSubmit(false)}
                   disabled={isPublishing}
                >
                   {isPublishing ? 'ĐANG LƯU...' : 'Lưu Nháp'}
                </Button>
                <Button 
                   className="h-12 font-black text-xs text-white rounded-2xl bg-[#002068] hover:bg-[#001a4d] shadow-lg shadow-blue-900/20 transition-all active:scale-95 uppercase tracking-widest bg-gradient-to-br from-[#002068] to-[#013DA5]"
                   onClick={() => onSubmit(true)}
                   disabled={isPublishing}
                >
                   {isPublishing ? 'ĐANG NỘP...' : 'Nộp Điểm'}
                </Button>
             </div>
          </div>
       </CardContent>
    </Card>
  )
}
