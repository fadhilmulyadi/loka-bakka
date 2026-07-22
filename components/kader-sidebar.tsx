"use client"

import Image from "next/image"
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
  { label: "Daftar Pasien", href: "/kader/rekap", icon: Activity, activePrefixes: ["/kader/rekap", "/kader/anak", "/kader/ibu", "/kader/kehamilan"] },
  { label: "Peta Sebaran", href: "/kader/peta-sebaran", icon: MapPin },
]


export function KaderSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Image src="/icon-192.png" alt="" width={32} height={32} className="rounded-[8px]" />
          <span className="font-medium text-[#101223]">Loka Bakka</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menusTop.map((menu) => {
                const isActive = menu.activePrefixes 
                  ? menu.activePrefixes.some(prefix => pathname.startsWith(prefix))
                  : pathname === menu.href

                return (
                  <SidebarMenuItem key={menu.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={menu.href}>
                        <menu.icon className="h-4 w-4" />
                        <span>{menu.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

    </Sidebar>
  )
}
