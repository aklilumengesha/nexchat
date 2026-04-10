import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NexChat — Real-time Chat',
  description: 'A real-time chat application built with Next.js, NestJS, and WebSockets',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  )
}
