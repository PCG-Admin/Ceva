"use client"

import { PortalLayout } from "@/components/portal-layout"
import { BarChart3, CheckCircle, CreditCard, TrendingUp, ScrollText, Users } from "lucide-react"

const navItems = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    label: "Overview",
    href: "/admin",
  },
  {
    icon: <CheckCircle className="h-5 w-5" />,
    label: "Completed Orders",
    href: "/admin/completed",
  },
  // {
  //   icon: <CreditCard className="h-5 w-5" />,
  //   label: "Invoicing",
  //   href: "/admin/invoicing",
  // },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    label: "Analytics",
    href: "/admin/analytics",
  },
  {
    icon: <ScrollText className="h-5 w-5" />,
    label: "Audit Log",
    href: "/admin/audit-log",
  },
  {
    icon: <Users className="h-5 w-5" />,
    label: "Users",
    href: "/admin/users",
  },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalLayout portalName="Finance / Admin" navItems={navItems}>
      {children}
    </PortalLayout>
  )
}
