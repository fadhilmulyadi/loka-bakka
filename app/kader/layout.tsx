import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { KaderSidebar } from "@/components/kader-sidebar"

export default async function KaderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <KaderSidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </SidebarProvider>
  )
}
