"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, BookOpen, TrendingUp, ClipboardList, User } from 'lucide-react'

const NAV_ITEMS = [
  {
    label: 'Beranda',
    href: '/ibu/dashboard',
    icon: <Home size={21} strokeWidth={1.9} />,
  },
  {
    label: 'Edukasi',
    href: '/ibu/edukasi',
    icon: <BookOpen size={21} strokeWidth={1.9} />,
  },
  {
    label: 'Status',
    href: '/ibu/status',
    icon: <TrendingUp size={21} strokeWidth={1.9} />,
  },
  {
    label: 'Tugas',
    href: '/ibu/tugas',
    icon: <ClipboardList size={21} strokeWidth={1.9} />,
  },
  {
    label: 'Profil',
    href: '/ibu/akun',
    icon: <User size={21} strokeWidth={1.9} />,
  },
]

export function IbuBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="h-[64px] bg-white/80 backdrop-blur-md border border-white/20 rounded-[24px] shadow-[0_8px_32px_-10px_rgba(9,30,66,0.3)] flex items-center justify-between px-[12px] py-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-[3px] transition-colors",
              isActive ? "text-[#1178D4]" : "text-[#989DA3]"
            )}
          >
            {item.icon}
            <span className={cn(
              "text-[9.5px] tracking-[0.01em]",
              isActive ? "font-semibold" : "font-medium"
            )}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
