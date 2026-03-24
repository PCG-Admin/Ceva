"use client"

import { PortalLayout } from "@/components/portal-layout"
import { BarChart3, Users, Truck } from "lucide-react"

const navItems = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    label: "Overview",
    href: "/transporter",
  },
  {
    icon: <Users className="h-5 w-5" />,
    label: "Transporter Profiles",
    href: "/transporter/profiles",
  },
  {
    icon: <Truck className="h-5 w-5" />,
    label: "Trucks",
    href: "/transporter/trucks",
  },
]

export default function TransporterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalLayout portalName="Transporter" navItems={navItems}>
      {children}
    </PortalLayout>
  )
}
