import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { IbuBottomNav } from "@/components/ibu-bottom-nav"

export default async function IbuLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session || session.user.role !== "ibu") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-[#E7ECF1] flex items-center justify-center p-0 md:p-6 font-inter-tight">
      <div className="w-full max-w-[412px] h-[100dvh] md:h-[892px] bg-white md:rounded-[36px] md:shadow-[0_30px_70px_-20px_rgba(8,54,95,0.35),0_8px_24px_rgba(9,30,66,0.12)] overflow-hidden flex flex-col relative isolation-isolate">
        <div className="flex-1 flex flex-col relative min-h-0 overflow-y-auto pb-0">
          {children}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
          <div className="pointer-events-auto">
            <IbuBottomNav />
          </div>
        </div>
      </div>
    </div>
  )
}
