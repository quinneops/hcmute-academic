import type { Metadata } from "next"
import { Inter, Be_Vietnam_Pro } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
})

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["100", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Academic Nexus - HCMCUTE",
  description: "Hệ thống Quản lý Khóa luận tốt nghiệp - Trường Đại học Công nghệ Kỹ thuật TP.HCM",
  keywords: ["HCMCUTE", "Thesis", "Khóa luận", "Academic", "University"],
  authors: [{ name: "HCMCUTE" }],
  creator: "HCMCUTE",
  openGraph: {
    title: "Academic Nexus - HCMCUTE",
    description: "Hệ thống Quản lý Khóa luận tốt nghiệp",
    siteName: "Academic Nexus",
    locale: "vi_VN",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Material Symbols */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className={`${inter.variable} ${beVietnamPro.variable} font-body bg-surface text-on-surface antialiased [text-rendering:optimizeLegibility]`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
