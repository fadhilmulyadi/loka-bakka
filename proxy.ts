import { auth } from "@/auth"
import { NextResponse } from "next/server"

const protectedRoutes = ["/dashboard", "/kader", "/pengukuran", "/skrining", "/posyandu"]
const kaderOnlyRoutes = ["/pengukuran", "/skrining"]
const ibuOnlyRoutes = ["/riwayat", "/profil"]

export default auth(function proxy(req) {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (protectedRoutes.some((r) => pathname.startsWith(r)) && !session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (pathname === "/login" && session) {
    const dashboardUrl =
      session.user.role === "kader" ? "/kader/dashboard" : "/dashboard"

    return NextResponse.redirect(new URL(dashboardUrl, req.url))
  }

  if (kaderOnlyRoutes.some((r) => pathname.startsWith(r)) && session?.user?.role !== "kader") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (ibuOnlyRoutes.some((r) => pathname.startsWith(r)) && session?.user?.role !== "ibu") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
}
