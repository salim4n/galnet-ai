import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css" 

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GALNET Intelligence - Elite Dangerous Chat",
  description: "Elite Dangerous themed chat interface with GALNET agent",
  icons: {
    icon: "/favicon.ico"
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="Fr-fr" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
