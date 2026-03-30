"use client"

import { PortalLayout } from "@/components/portal-layout"
import { Package, MapPin, FileText, Users } from "lucide-react"

const navItems = [
  {
    icon: <Package className="h-5 w-5" />,
    label: "Load Booking",
    href: "/customer",
  },
  {
    icon: <Users className="h-5 w-5" />,
    label: "Clients",
    href: "/customer/clients",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    label: "Contracts",
    href: "/customer/contracts",
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    label: "Vehicle Tracking",
    href: "/customer/tracking",
  },
]

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalLayout portalName="Customer" navItems={navItems}>
      {children}
    </PortalLayout>
  )
}
