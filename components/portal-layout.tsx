"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Home, ChevronLeft, ChevronRight } from "lucide-react"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { useState } from "react"

export interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
}

interface PortalLayoutProps {
  children: React.ReactNode
  portalName: string
  navItems: NavItem[]
}

export function PortalLayout({ children, portalName, navItems }: PortalLayoutProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-20 h-screen border-r border-border bg-card flex flex-col transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-20 items-center border-b border-border shrink-0 px-4">
          {!collapsed && (
            <Link href="/" className="flex-1">
              <Image
                src="/Ceva_Logo.png"
                alt="Ceva Logistics"
                width={180}
                height={56}
                className="h-14 w-auto"
              />
            </Link>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0 ${collapsed ? "mx-auto" : ""}`}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Portal name */}
        {!collapsed && (
          <div className="p-4 border-b border-border shrink-0">
            <p className="text-sm font-medium text-muted-foreground">Portal</p>
            <p className="text-lg font-semibold text-foreground">{portalName}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: back to home */}
        <div className="p-2 border-t border-border shrink-0">
          <Link
            href="/"
            title={collapsed ? "Back to Home" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Home className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Back to Home</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-200 ${collapsed ? "ml-16" : "ml-64"}`}>
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{portalName}</h2>
              <p className="text-sm text-muted-foreground">Ceva Logistics Management</p>
            </div>
            <UserProfileMenu />
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
