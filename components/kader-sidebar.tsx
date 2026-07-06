"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Activity,
  LayoutDashboard,
  MapPin,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const menusTop = [
  { label: "Dashboard", href: "/kader/dashboard", icon: LayoutDashboard },
  { label: "Daftar Pasien", href: "/kader/rekap", icon: Activity },
  { label: "Peta Sebaran", href: "/kader/peta-sebaran", icon: MapPin },
]


export function KaderSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#52A9E3]">
            <span className="text-sm font-bold text-white">L</span>
          </div>
          <span className="font-medium text-[#101223]">Loka Bakka</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menusTop.map((menu) => (
                <SidebarMenuItem key={menu.href}>
                  <SidebarMenuButton asChild isActive={pathname === menu.href}>
                    <Link href={menu.href}>
                      <menu.icon className="h-4 w-4" />
                      <span>{menu.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

    </Sidebar>
  )
}
