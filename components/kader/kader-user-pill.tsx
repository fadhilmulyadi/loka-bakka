"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSession } from "next-auth/react"

export function KaderUserPill() {
  const { data: session } = useSession()

  return (
    <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px]">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
          {session?.user?.name?.slice(0, 2).toUpperCase() ?? "KD"}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-xs text-[#173753] font-medium leading-none">
          {session?.user?.name ?? "Kader"}
        </p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">
          Kader {session?.user?.posyanduName ?? "..."}
        </p>
      </div>
    </div>
  )
}
