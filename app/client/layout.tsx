import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Client Portal - Ceva Logistics',
  description: 'Track your shipments and manage bookings',
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
