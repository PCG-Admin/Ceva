import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Driver Portal - Ceva Logistics',
  description: 'Manage your deliveries and update load status',
}

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
