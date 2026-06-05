"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Inter_Tight } from "next/font/google"

const interTight = Inter_Tight({ subsets: ["latin"] })

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const inputShellClassName =
    "group flex overflow-hidden rounded-[6px]"
  const inputAddonClassName =
    "flex items-center border-2 border-[#F3F4F8] bg-[#F3F4F8] py-[5px] text-[#101223] shadow-none transition-all duration-100 group-focus-within:border-[#52A9E3]"
  const inputFieldClassName =
    "min-h-[42px] flex-1 border-2 border-[#F3F4F8] bg-[#F3F4F8] px-[14px] py-[5px] text-[14px] font-normal leading-[130%] text-[#101223] shadow-none outline-none transition-all duration-100 placeholder:text-[#B3B5BD] focus:border-[#52A9E3] focus:shadow-none"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    let redirectTo = "/kader/dashboard"
    let result = await signIn("kader", { username, password, redirect: false })
    if (!result || result.error) {
      result = await signIn("ibu", { username, pin: password, redirect: false })
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
    <div className={`${interTight.className} relative flex min-h-screen flex-col bg-white`}>
      <nav className="bg-white px-0 py-4">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between">
            <Image
              src="/logo-kemenkes.webp"
              alt="Kementerian Kesehatan"
              width={200}
              height={56}
              className="h-6 w-auto object-contain md:h-[30px]"
            />
            <Image
              src="/logo-unhas.webp"
              alt="Universitas Hasanuddin"
              width={140}
              height={56}
              className="h-6 w-auto object-contain md:h-[42px]"
            />
            <Image
              src="/logo-bkkbn.webp"
              alt="BKKBN"
              width={140}
              height={56}
              className="h-6 w-auto object-contain md:h-[30px]"
            />
          </div>
        </div>
      </nav>

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 lg:py-16">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[7fr_5fr]">
            <div>
              <div className="px-15">
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
                className="mt-10 max-h-[498px] object-contain -ml-4 "
              />
            </div>

            <div className="relative flex flex-col overflow-hidden pb-[220px] pr-15">
              <div className="relative z-10 w-full rounded-[8px] bg-white p-8 shadow-[0px_10px_35px_rgba(5,30,75,0.06)]">
                <div className="mb-6">
                  <p className="mb-1 text-[24px] font-bold leading-[120%] tracking-[0.02em] text-[#101223]">
                    Login Aplikasi
                  </p>
                  <p className="text-[14px] font-normal leading-[130%] text-[#5B5D6B]">
                    Masukan username dan password kamu.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-[6px] block text-[14px] font-medium leading-[130%] text-[#101223]"
                    >
                      Username
                    </label>
                    <div className={inputShellClassName}>
                      <span
                        className={`${inputAddonClassName} rounded-l-[6px] rounded-r-none border-r-0 pl-[14px] pr-[2.5px]`}
                      >
                        <Image
                          src="/ic-person.svg"
                          alt=""
                          width={20}
                          height={20}
                        />
                      </span>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Masukan username"
                        required
                        className={`${inputFieldClassName} rounded-l-none rounded-r-[6px] border-l-0`}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-[6px] block text-[14px] font-medium leading-[130%] text-[#101223]"
                    >
                      Password
                    </label>
                    <div className={inputShellClassName}>
                      <span
                        className={`${inputAddonClassName} rounded-l-[6px] rounded-r-none border-r-0 pl-[14px] pr-[2.5px]`}
                      >
                        <Image
                          src="/ic-password.svg"
                          alt=""
                          width={20}
                          height={20}
                        />
                      </span>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukan password"
                        required
                        className={`${inputFieldClassName} rounded-none border-x-0`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className={`${inputAddonClassName} rounded-l-none rounded-r-[6px] border-l-0 pl-[2.5px] pr-[14px] text-[#B3B5BD] hover:text-[#5B5D6B]`}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                            />
                          </svg>
                        ) : (
                          <Image
                            src="/ic-eyes-close.svg"
                            alt=""
                            width={20}
                            height={20}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-lg bg-[#52A9E3] py-3 text-sm font-semibold text-white transition hover:bg-[#3a96d9] disabled:opacity-60"
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
        className="absolute bottom-0 right-0"
      />
    </div>
  )
}
