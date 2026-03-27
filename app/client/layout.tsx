"use client"

import { useEffect, useState } from "react"
import { PortalLayout } from "@/components/portal-layout"
import { BarChart3, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const allNavItems = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    label: "Dashboard",
    href: "/client/dashboard",
    adminOnly: false,
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    label: "Analytics",
    href: "/client/analytics",
    adminOnly: false,
  },
]

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from("ceva_profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setRole(data?.role ?? "client"))
    })
  }, [])

  const navItems = allNavItems
    .filter((item) => !item.adminOnly || role === "admin")
    .map(({ icon, label, href }) => ({ icon, label, href }))

  return (
    <PortalLayout portalName="Client Portal" navItems={navItems}>
      {children}
    </PortalLayout>
  )
}
