"use client"

import { cloneElement } from "react"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#101223]">
      {children}
    </div>
  )
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside
      className={cn(
        "shrink-0 overflow-hidden border-r border-[#E5E7EB] bg-white transition-[width] duration-200 w-50"
      )}
    >
      <div className={cn("flex min-h-screen flex-col")}>
        {children}
      </div>
    </aside>
  )
}

export function SidebarHeader({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={className}>{children}</div>
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto py-3">{children}</div>
}

export function SidebarFooter({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={className}>{children}</div>
}

export function SidebarGroup({ children }: { children: React.ReactNode }) {
  return <div className="px-3">{children}</div>
}

export function SidebarGroupContent({
  children,
}: {
  children: React.ReactNode
}) {
  return <div>{children}</div>
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-1">{children}</ul>
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>
}

export function SidebarMenuButton({
  asChild,
  isActive,
  children,
}: {
  asChild?: boolean
  isActive?: boolean
  children: React.ReactElement<{ className?: string }>
}) {
  const className = cn(
    "flex w-full items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[14px] font-medium transition",
    isActive
      ? "bg-[#52A9E3] text-[#F5F7FA]"
      : "bg-white text-[#173753] hover:bg-[#52A9E3] hover:text-[#F5F7FA]"
  )

  if (asChild) {
    return cloneElement(children, {
      className: cn(children.props.className, className),
    })
  }

  return <button className={className}>{children}</button>
}

