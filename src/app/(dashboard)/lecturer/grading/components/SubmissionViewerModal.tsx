'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileViewer } from '@/components/ui/FileViewer'

interface SubmissionViewerModalProps {
  url: string;
  fileName: string;
  fileSize: number | null;
  isOpen: boolean;
  onClose: () => void;
  onContentExtracted?: (content: string) => void;
}

export function SubmissionViewerModal({
  url,
  fileName,
  fileSize,
  isOpen,
  onClose,
  onContentExtracted
}: SubmissionViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <Card className="w-full max-w-6xl h-full max-h-[90vh] shadow-2xl rounded-3xl border-none overflow-hidden flex flex-col bg-slate-50 animate-in zoom-in-95 duration-300">
        <div className="bg-[#002068] p-4 md:px-6 flex items-center justify-between shrink-0">
          <h3 className="text-white font-bold tracking-widest text-sm uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-lg opacity-80">description</span>
            TÀI LIỆU SẢN PHẨM: <span className="opacity-70 normal-case tracking-normal truncate max-w-[200px] md:max-w-md inline-block">{fileName}</span>
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shadow-none border-none"
              onClick={() => window.open(url, '_blank')}
              title="Tải xuống tài liệu"
            >
              <span className="material-symbols-outlined text-sm">download</span>
            </Button>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shadow-none border-none"
              onClick={onClose}
              title="Đóng cửa sổ"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </Button>
          </div>
        </div>
        
        <CardContent className="p-0 flex-1 overflow-hidden bg-white/50 relative">
          <FileViewer
             url={url}
             fileName={fileName}
             fileSize={fileSize}
             onContentExtracted={onContentExtracted}
             className="h-full border-none rounded-none shadow-none"
          />
        </CardContent>
      </Card>
    </div>
  )
}
