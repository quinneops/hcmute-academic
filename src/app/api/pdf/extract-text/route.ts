import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'Missing PDF URL' }, { status: 400 })
    }

    // Fetch PDF from URL
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch PDF')
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

    // Load pdfjs-dist dynamically on server side
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

    // Parse PDF
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    // Extract text from all pages
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }

    return NextResponse.json({
      text: fullText.trim(),
      totalPages: pdf.numPages,
      fileSize,
      isTooLargeForAI: fileSize > MAX_FILE_SIZE_FOR_AI,
    })
  } catch (error: any) {
    console.error('PDF text extraction error:', error)
    return NextResponse.json(
      { error: error.message || 'Không thể trích xuất nội dung PDF' },
      { status: 500 }
    )
  }
}
