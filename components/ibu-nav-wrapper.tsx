"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { IbuBottomNav } from "@/components/ibu-bottom-nav"
import { ChildBottomNav } from "@/components/child-bottom-nav"

function NavContent() {
  const searchParams = useSearchParams()
  const childId = searchParams.get("child")

  if (childId) {
    return <ChildBottomNav childId={childId} />
  }

  return <IbuBottomNav />
}

export function IbuNavWrapper() {
  return (
    <Suspense fallback={<IbuBottomNav />}>
      <NavContent />
    </Suspense>
  )
}
