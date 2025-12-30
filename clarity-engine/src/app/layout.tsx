import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    default: "Claryon",
    template: "%s · Claryon",
  },
  description: "A quiet place to lay things down when your mind feels heavy.",
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