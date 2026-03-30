import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url, fileName } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'Missing file URL' }, { status: 400 })
    }

    // Fetch file from URL
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch file')
    }

    const arrayBuffer = await response.arrayBuffer()
    const fileSize = arrayBuffer.byteLength

    // Check file size limits
    const MAX_FILE_SIZE_FOR_AI = 5 * 1024 * 1024 // 5MB
    const MAX_FILE_SIZE_TO_VIEW = 50 * 1024 * 1024 // 50MB

    if (fileSize > MAX_FILE_SIZE_TO_VIEW) {
      return NextResponse.json(
        { error: 'File quá lớn (>50MB). Vui lòng tải xuống để xem.' },
        { status: 413 }
      )
    }

    const fileExtension = '.' + (fileName?.split('.').pop()?.toLowerCase() || '')
    let extractedText = ''

    // Handle different file types
    if (fileExtension === '.pdf') {
      // PDF - use pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        extractedText += pageText + '\n'
      }
    } else if (['.txt', '.md', '.json', '.xml', '.csv'].includes(fileExtension)) {
      // Text files - decode directly
      const decoder = new TextDecoder('utf-8')
      extractedText = decoder.decode(arrayBuffer)
    } else if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(fileExtension)) {
      // Office files - return basic info (full text extraction would need additional libraries)
      extractedText = `[File Office: ${fileName || 'Unknown'}]\nKích thước: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n\nLưu ý: Nội dung file Office không thể trích xuất đầy đủ. Vui lòng tải xuống để xem chi tiết.`
    } else {
      return NextResponse.json(
        { error: `Định dạng ${fileExtension} không được hỗ trợ trích xuất` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      text: extractedText.trim(),
      fileSize,
      isTooLargeForAI: fileSize > MAX_FILE_SIZE_FOR_AI,
      fileExtension,
    })
  } catch (error: any) {
    console.error('File text extraction error:', error)
    return NextResponse.json(
      { error: error.message || 'Không thể trích xuất nội dung file' },
      { status: 500 }
    )
  }
}
