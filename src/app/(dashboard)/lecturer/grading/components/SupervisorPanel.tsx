'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SupervisorPanelProps {
  submission: any
  feedback: string
  onFeedbackChange: (value: string) => void
  onSubmit: (approved: boolean) => void
  isPublishing: boolean
  isGeneratingSummary: boolean
  submissionSummary: any
  onGenerateSummary: () => void
  isCheckingPlagiarism: boolean
  plagiarismReport: any
  onCheckPlagiarism: () => void
}

export function SupervisorPanel({
  submission,
  feedback,
  onFeedbackChange,
  onSubmit,
  isPublishing,
  isGeneratingSummary,
  submissionSummary,
  onGenerateSummary,
  isCheckingPlagiarism,
  plagiarismReport,
  onCheckPlagiarism
}: SupervisorPanelProps) {
  
  if (submission.has_grade || submission.status === 'approved') {
    return (
      <Card className="bg-white/80 backdrop-blur-xl shadow-ambient-lg border-emerald-100 rounded-3xl overflow-hidden h-full flex flex-col">
        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 p-6 flex flex-row items-center justify-between">
          <CardTitle className="font-headline font-black text-emerald-900 text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">verified</span>
            ĐÃ PHÊ DUYỆT
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 flex-1 overflow-y-auto space-y-6">
           <div className="p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100 border-dashed">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4">NHẬN XÉT CỦA GIÁO VIÊN HD:</p>
              <p className="text-sm text-emerald-900 leading-relaxed font-medium italic opacity-90">"{submission.grade_feedback || 'Không có nhận xét'}"</p>
           </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/80 backdrop-blur-xl shadow-ambient-lg border-slate-200/50 rounded-[2rem] overflow-hidden h-full flex flex-col">
       <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/10">
                <span className="material-symbols-outlined text-xl">fact_check</span>
             </div>
             <div>
                <CardTitle className="font-headline font-black text-emerald-900 text-sm tracking-tight uppercase">DUYỆT TIẾN ĐỘ</CardTitle>
                <p className="text-[10px] font-bold text-slate-400 italic">Dành cho Giáo viên Hướng Dẫn</p>
             </div>
          </div>
       </CardHeader>

       <CardContent className="p-6 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
          {/* AI Helper Buttons */}
          <div className="space-y-4">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                CÔNG CỤ AI HỖ TRỢ
             </p>
             
             <div className="grid grid-cols-2 gap-2">
                <Button 
                   variant="secondary" 
                   className="h-10 text-[10px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 border-none rounded-xl"
                   onClick={onGenerateSummary}
                   disabled={isGeneratingSummary}
                >
                   {isGeneratingSummary ? 'ĐANG TÓM TẮT...' : 'AI TÓM TẮT'}
                </Button>
                <Button 
                   variant="secondary" 
                   className="h-10 text-[10px] font-black bg-orange-50 text-orange-600 hover:bg-orange-100 border-none rounded-xl"
                   onClick={onCheckPlagiarism}
                   disabled={isCheckingPlagiarism}
                >
                   {isCheckingPlagiarism ? 'ĐANG KIỂM TRA...' : 'KIỂM TRA ĐẠO VĂN'}
                </Button>
             </div>

             {/* AI Summary Display */}
             {submissionSummary && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl animate-in fade-in duration-300 mt-4">
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
                <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl animate-in fade-in duration-300 mt-4">
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

          {/* Feedback & Actions */}
          <div className="space-y-4">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">comment</span>
                NHẬN XÉT CÂN NHẮC
             </p>
             
             <textarea 
                value={feedback}
                onChange={(e) => onFeedbackChange(e.target.value)}
                placeholder="Nhập nhận xét tiến độ cho sinh viên, các điểm làm tốt và cần cải thiện..."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all placeholder:text-slate-300"
             />

             <div className="grid grid-cols-2 gap-3 pt-4">
                <Button 
                   variant="outline" 
                   className="h-12 font-black text-[11px] text-red-600 rounded-2xl border-red-200 hover:bg-red-50 transition-all uppercase tracking-widest"
                   onClick={() => onSubmit(false)}
                   disabled={isPublishing}
                >
                   {isPublishing ? 'ĐANG XỬ LÝ...' : 'Yêu cầu làm lại'}
                </Button>
                <Button 
                   className="h-12 font-black text-[11px] text-white rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all uppercase tracking-widest"
                   onClick={() => onSubmit(true)}
                   disabled={isPublishing}
                >
                   {isPublishing ? 'ĐANG XỬ LÝ...' : 'Đạt (Phê Duyệt)'}
                </Button>
             </div>
          </div>
       </CardContent>
    </Card>
  )
}
