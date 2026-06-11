import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { getIbuProfile } from "@/lib/actions/ibu"
import { calculateGestationalAge, calculateHPL, MONTHS_ID } from "@/lib/pregnancy-utils"
import { 
  User, 
  LogOut, 
  Calendar, 
  Phone, 
  MapPin, 
  Baby, 
  ChevronRight,
  Bell,
  HelpCircle,
  Pencil,
  Clock,
  Droplet
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import Link from "next/link"

export default async function IbuAkunPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") {
    redirect("/login")
  }

  const { child: childId } = await searchParams
  const profile = await getIbuProfile()
  if (!profile) return null

  // Get current date for age calculation once during render
  const now = new Date()

  const calculateAge = (birthday: Date) => {
    let age = now.getFullYear() - birthday.getFullYear()
    const m = now.getMonth() - birthday.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) {
      age--
    }
    return age
  }

  // Calculate pregnancy info
  let weeksPregnant = 0
  let trimester = 0
  let hplStr = "—"
  
  if (profile.pregnancyProfile?.hpht) {
    const hpht = new Date(profile.pregnancyProfile.hpht)
    weeksPregnant = calculateGestationalAge(hpht)
    const hpl = calculateHPL(hpht)
    hplStr = `${hpl.getDate()} ${MONTHS_ID[hpl.getMonth()]} ${hpl.getFullYear()}`
    
    if (weeksPregnant <= 13) trimester = 1
    else if (weeksPregnant <= 27) trimester = 2
    else trimester = 3
  }

  return (
    <div className="flex flex-col h-full bg-[#E7ECF1]">
      {/* Header */}
      <header className="relative px-6 pt-[6px] pb-8 text-white overflow-hidden bg-gradient-to-br from-[#2B93E6] via-[#1178D4] to-[#0A487F] rounded-b-[26px] shadow-[0_12px_26px_-16px_rgba(17,120,212,0.6)] z-10">
        <div className="absolute top-[-50px] right-[-40px] w-[170px] h-[170px] rounded-full bg-white/10 blur-2xl" />
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <span className="text-sm font-semibold">Profil Saya</span>
          <button className="w-9 h-9 flex items-center justify-center bg-white/20 border border-white/30 rounded-xl hover:bg-white/30 transition-colors">
            <Pencil size={17} />
          </button>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-[74px] h-[74px] bg-white/20 border border-white/40 rounded-[24px] flex items-end justify-center overflow-hidden">
            <User size={54} className="text-white/90" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{profile.nama}</h1>
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-white/20 border border-white/30 rounded-full text-[11px] font-semibold">
              {profile.isPregnant ? (
                <>
                  <Droplet size={13} fill="white" />
                  <span>Ibu Hamil {weeksPregnant > 0 ? `· ${weeksPregnant} Minggu` : ""}</span>
                </>
              ) : (
                <>
                  <Baby size={13} fill="white" />
                  <span>Ibu Balita</span>
                </>
              )}
            </div>
            <p className="text-[11.5px] mt-2 text-white/80 font-medium">
              {profile.posyandu.toLowerCase().includes("posyandu") ? profile.posyandu : `Posyandu ${profile.posyandu}`} · {profile.kelurahan}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-32 space-y-6 scrollbar-hide">
        {/* Data Diri */}
        <section>
          <h2 className="px-1 mb-2.5 text-[11px] font-bold text-[#989DA3] uppercase tracking-wider">Data Diri</h2>
          <div className="bg-white border border-[#E4EDE7] rounded-[18px] overflow-hidden shadow-sm">
            <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-[#E4EDE7]">
              <div className="w-[38px] h-[38px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center rounded-xl">
                <User size={19} />
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#697079]">Nama Lengkap</div>
                <div className="text-[13.5px] font-bold text-[#1F2937]">{profile.nama}</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-[#E4EDE7]">
              <div className="w-[38px] h-[38px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center rounded-xl">
                <Calendar size={19} />
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#697079]">Tanggal Lahir</div>
                <div className="text-[13.5px] font-bold text-[#1F2937]">
                  {profile.tanggalLahir 
                    ? `${format(new Date(profile.tanggalLahir), "d MMMM yyyy", { locale: id })} · ${calculateAge(new Date(profile.tanggalLahir))} tahun`
                    : "-"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-[#E4EDE7]">
              <div className="w-[38px] h-[38px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center rounded-xl">
                <Phone size={19} />
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#697079]">Nomor HP</div>
                <div className="text-[13.5px] font-bold text-[#1F2937]">{profile.noHp || "-"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="w-[38px] h-[38px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center rounded-xl">
                <MapPin size={19} />
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#697079]">Alamat</div>
                <div className="text-[13.5px] font-bold text-[#1F2937] leading-relaxed">
                  {profile.alamat || "-"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Kehamilan (Only if pregnant) */}
        {profile.isPregnant && (
          <section>
            <h2 className="px-1 mb-2.5 text-[11px] font-bold text-[#989DA3] uppercase tracking-wider">Data Kehamilan</h2>
            <div className="bg-white border border-[#E4EDE7] rounded-[18px] overflow-hidden shadow-sm">
              <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-[#E4EDE7]">
                <div className="w-[38px] h-[38px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center rounded-xl">
                  <Clock size={19} />
                </div>
                <div>
                  <div className="text-[10px] font-medium text-[#697079]">Usia Kehamilan</div>
                  <div className="text-[13.5px] font-bold text-[#1F2937]">
                    {weeksPregnant > 0 ? `${weeksPregnant} Minggu (Trimester ${trimester})` : "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-[#E4EDE7]">
                <div className="w-[38px] h-[38px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center rounded-xl">
                  <Droplet size={19} />
                </div>
                <div>
                  <div className="text-[10px] font-medium text-[#697079]">Perkiraan Lahir (HPL)</div>
                  <div className="text-[13.5px] font-bold text-[#1F2937]">{hplStr}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Pengaturan */}
        <section>
          <h2 className="px-1 mb-2.5 text-[11px] font-bold text-[#989DA3] uppercase tracking-wider">Pengaturan</h2>
          <div className="bg-white border border-[#E4EDE7] rounded-[18px] overflow-hidden shadow-sm">
            <button className="w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-[#E4EDE7] active:bg-[#F1F7FE] transition-colors">
              <div className="w-[38px] h-[38px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center rounded-xl">
                <Bell size={19} />
              </div>
              <div className="flex-1 text-left font-bold text-[13.5px] text-[#1F2937]">Pengingat & Notifikasi</div>
              <ChevronRight size={17} className="text-[#989DA3]" />
            </button>

            {childId && profile.isPregnant ? (
              <Link href="/ibu/dashboard" className="w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-[#E4EDE7] active:bg-[#F1F7FE] transition-colors text-decoration-none">
                <div className="w-[38px] h-[38px] bg-[#EAF6EF] text-[#1E9E62] flex items-center justify-center rounded-xl">
                  <Droplet size={19} />
                </div>
                <div className="flex-1 text-left font-bold text-[13.5px] text-[#1F2937]">Kembali ke Mode Kehamilan</div>
                <ChevronRight size={17} className="text-[#989DA3]" />
              </Link>
            ) : (
              <Link href="/ibu/anak" className="w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-[#E4EDE7] active:bg-[#F1F7FE] transition-colors text-decoration-none">
                <div className="w-[38px] h-[38px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center rounded-xl">
                  <Baby size={19} />
                </div>
                <div className="flex-1 text-left font-bold text-[13.5px] text-[#1F2937]">Lihat Data Anak</div>
                <ChevronRight size={17} className="text-[#989DA3]" />
              </Link>
            )}

            <button className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-[#F1F7FE] transition-colors">
              <div className="w-[38px] h-[38px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center rounded-xl">
                <HelpCircle size={19} />
              </div>
              <div className="flex-1 text-left font-bold text-[13.5px] text-[#1F2937]">Bantuan & Tentang Aplikasi</div>
              <ChevronRight size={17} className="text-[#989DA3]" />
            </button>
          </div>
        </section>

        <form action={async () => {
          "use server"
          await signOut({ redirectTo: "/login" })
        }}>
          <button type="submit" className="w-full py-4 bg-white border border-[#F6D2D2] rounded-2xl flex items-center justify-center gap-2 text-[13.5px] font-bold text-[#DC2626] active:bg-[#FEF1F1] transition-colors shadow-sm">
            <LogOut size={17} />
            <span>Keluar</span>
          </button>
        </form>

        <p className="text-center text-[10px] text-[#989DA3] font-medium pb-4">Monitoring Stunting · Versi 1.0</p>
      </main>
    </div>
  )
}

