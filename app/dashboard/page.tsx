import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role === "kader") {
    redirect("/kader/dashboard")
  }

  if (session.user.role === "ibu") {
    redirect("/ibu/dashboard")
  }

  return (
    <section>
      <h1 className="text-2xl font-bold text-[#101223]">Dashboard</h1>
      <p className="mt-2 text-sm text-[#5B5D6B]">
        Role tidak dikenali.
      </p>
    </section>
  )
}
