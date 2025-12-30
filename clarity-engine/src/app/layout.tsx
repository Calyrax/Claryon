import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Clarity Engine — Turn Mental Noise Into Calm Clarity",
  description: "A quiet space to untangle your mind and return to grounded focus.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`
          ${inter.variable}
          font-sans
          antialiased
          selection:bg-cyan-400/30
        `}
      >
        <div className="relative flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}