"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Inter_Tight } from "next/font/google"
import { User, Lock, Eye, EyeOff } from "lucide-react"

const interTight = Inter_Tight({ subsets: ["latin"] })

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const inputShellClassName = "group flex rounded-[6px]"
  const inputAddonClassName =
    "flex items-center border-2 border-[#F3F4F8] bg-[#F3F4F8] py-[5px] text-[#101223] shadow-none transition-all duration-100 group-focus-within:border-[#52A9E3]"
  const inputFieldClassName =
    "min-h-[48px] flex-1 border-2 border-[#F3F4F8] bg-[#F3F4F8] px-[14px] py-[5px] text-base font-normal leading-[130%] text-[#101223] shadow-none outline-none transition-all duration-100 placeholder:text-[#B3B5BD] focus:border-[#52A9E3] focus:shadow-none"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    let redirectTo = "/kader/dashboard"
    let result = await signIn("kader", { username, password, redirect: false })
    if (!result || result.error) {
      result = await signIn("ibu", { username, password, redirect: false })
      redirectTo = "/dashboard"
    }

    setLoading(false)

    if (!result || result.error) {
      setError("Username atau password salah. Silakan coba lagi.")
    } else {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className={`${interTight.className} relative flex min-h-[100dvh] flex-col bg-white`}>
      <nav className="bg-white px-0 py-4 border-b border-gray-50">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <Image
                src="/logo-kemenkes.webp"
                alt="Kementerian Kesehatan"
                width={200}
                height={56}
                className="h-5 w-auto object-contain md:h-[30px]"
              />
              <Image
                src="/logo-unhas.webp"
                alt="Universitas Hasanuddin"
                width={140}
                height={56}
                className="h-7 w-auto object-contain md:h-[42px]"
              />
            </div>
            <Image
              src="/logo-bkkbn.webp"
              alt="BKKBN"
              width={140}
              height={56}
              className="h-5 w-auto object-contain md:h-[30px]"
            />
          </div>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-7xl py-6 md:py-12">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[7fr_5fr]">

            {/* Hero Column — hidden on mobile, form first on mobile */}
            <div className="hidden lg:block">
              <div className="px-[60px]">
                <h1 className="mb-5 text-4xl font-bold leading-tight text-gray-800 lg:text-5xl">
                  Selamat Datang di<br />
                  {" "}
                  <span className="text-[#52A9E3]">Loka Bakka</span>
                </h1>
                <p className="text-base leading-relaxed text-gray-500 lg:text-lg">
                  Sistem Pemantauan Tumbuh Kembang Anak dan Skrining Ibu Hamil
                  yang mengintegrasikan seluruh proses skrining stunting di
                  posyandu dan puskesmas dalam satu platform digital.
                </p>
              </div>
              <img
                src="/footer-auth-bg-1.webp"
                alt=""
                aria-hidden
                className="mt-10 max-h-[498px] object-contain -ml-4"
              />
            </div>

            {/* Form Column */}
            <div className="relative flex flex-col lg:pb-[220px] lg:pr-[60px]">
              <div className="relative z-10 w-full rounded-[8px] bg-white p-5 sm:p-8 shadow-[0px_10px_35px_rgba(5,30,75,0.06)]">
                <div className="mb-6">
                  <p className="mb-1 text-[24px] font-bold leading-[120%] tracking-[0.02em] text-[#101223]">
                    Login Aplikasi
                  </p>
                  <p className="text-sm font-normal leading-[130%] text-[#5B5D6B]">
                    Masukan username dan password kamu.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-[6px] block text-sm font-medium leading-[130%] text-[#101223]"
                    >
                      Username
                    </label>
                    <div className={inputShellClassName}>
                      <span
                        className={`${inputAddonClassName} rounded-l-[6px] rounded-r-none border-r-0 pl-[14px] pr-[2.5px]`}
                      >
                        <User size={20} />
                      </span>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Masukan username"
                        required
                        autoComplete="username"
                        className={`${inputFieldClassName} rounded-l-none rounded-r-[6px] border-l-0`}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-[6px] block text-sm font-medium leading-[130%] text-[#101223]"
                    >
                      Password
                    </label>
                    <div className={`${inputShellClassName} min-w-0`}>
                      <span
                        className={`${inputAddonClassName} rounded-l-[6px] rounded-r-none border-r-0 pl-[14px] pr-[2.5px]`}
                      >
                        <Lock size={20} />
                      </span>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukan password"
                        required
                        autoComplete="current-password"
                        className={`${inputFieldClassName} min-w-0 rounded-none border-x-0`}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                        className={`${inputAddonClassName} rounded-l-none rounded-r-[6px] border-l-0 shrink-0 px-[12px] text-[#B3B5BD] hover:text-[#5B5D6B]`}
                        tabIndex={-1}
                      >
                        {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="text-sm text-red-500">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-lg bg-[#52A9E3] py-3 text-base font-semibold text-white transition hover:bg-[#3a96d9] disabled:opacity-60"
                  >
                    {loading ? "Memuat..." : "Login"}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </main>

      <img
        src="/footer-auth-bg-2.webp"
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 hidden lg:block"
      />
    </div>
  )
}
