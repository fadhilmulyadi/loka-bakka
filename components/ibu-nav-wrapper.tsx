"use client"

import { usePathname, useParams } from "next/navigation"
import { IbuBottomNav } from "@/components/ibu-bottom-nav"
import { ChildBottomNav } from "@/components/child-bottom-nav"

export function IbuNavWrapper() {
  const pathname = usePathname()
  const params = useParams()

  if (pathname.includes("/ibu/child/")) {
    return <ChildBottomNav childId={params.id as string} />
  }

  return <IbuBottomNav />
}
