import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-geist",
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
    ${geist.variable}
    font-sans
    antialiased
    selection:bg-cyan-400/30
  `}
>

        {/* Page content (NO NAV HERE ANYMORE) */}
        <div className="relative flex flex-col">
  {children}
</div>
      </body>
    </html>
  )
}