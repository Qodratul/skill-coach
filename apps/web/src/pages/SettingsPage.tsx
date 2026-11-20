import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, LogOut } from "lucide-react";
import {
  useLogout,
  useProfile,
  useUpdateProfile,
} from "../api";
import { card } from "../components/landing/shared";

type FieldKey = "UI_UX" | "SOFTWARE_ENGINEERING" | "WRITING";
type LevelKey = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type ToneKey = "FRIENDLY" | "STANDARD" | "BLUNT";

const toneLabels: Record<ToneKey, string> = {
  FRIENDLY: "Ramah",
  STANDARD: "Standar",
  BLUNT: "Tegas",
};

const toneExamples: Record<ToneKey, string> = {
  FRIENDLY: "Hangat, mendukung, dan mengajak.",
  STANDARD: "Jelas, objektif, dan langsung.",
  BLUNT: "Lugas dan berorientasi tindakan.",
};

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#5044B8]";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading, isError } = useProfile();
  const updateProfile = useUpdateProfile();
  const { logout } = useLogout();
  const [displayName, setDisplayName] = useState("");
  const [skillField, setSkillField] = useState<FieldKey>("UI_UX");
  const [level, setLevel] = useState<LevelKey>("BEGINNER");
  const [tone, setTone] = useState<ToneKey>("STANDARD");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    if (profile.skillField) setSkillField(profile.skillField);
    if (profile.level === "INTERMEDIATE" || profile.level === "ADVANCED") {
      setLevel(profile.level);
    } else {
      setLevel("BEGINNER");
    }
    setTone(profile.critiqueTone);
  }, [profile]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    setSaveError("");
    try {
      await updateProfile.mutateAsync({
        displayName: displayName.trim(),
        skillField,
        level,
        critiqueTone: tone,
      });
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Perubahan profil gagal disimpan.",
      );
    }
  }

  function signOut() {
    logout();
    navigate("/");
  }

  if (isLoading) {
    return <div className={`${card} p-8 text-sm text-slate-600`}>Memuat pengaturan…</div>;
  }

  if (isError || !profile) {
    return (
      <div className={`${card} p-8 text-sm text-slate-600`}>
        Pengaturan profil tidak dapat dimuat. Muat ulang halaman atau masuk kembali.
      </div>
    );
  }

  const initials = profile.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#5044B8]">
          PROFIL DAN PREFERENSI
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
          Pengaturan akun
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Atur informasi profil dan cara mentor memberi masukan.
        </p>
      </header>

      <form onSubmit={saveProfile} className="space-y-6">
        <section className={`${card} p-6 sm:p-8`}>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-[#EFECFA] text-sm font-bold text-[#5044B8]">
              {initials || "SC"}
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Profil kamu</h2>
              <p className="text-xs text-slate-500">Username: @{profile.username}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-900">
              Nama tampilan
              <input
                required
                maxLength={100}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-900">
              Email
              <input
                value={profile.email}
                readOnly
                className={`${inputClass} mt-2 bg-stone-50 text-slate-500`}
              />
            </label>
          </div>
        </section>

        <section className={`${card} space-y-6 p-6 sm:p-8`}>
          <div>
            <h2 className="font-semibold text-slate-900">Preferensi belajar</h2>
            <p className="mt-1 text-xs text-slate-500">
              Preferensi ini dipakai saat menyiapkan review karya.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-900">
              Bidang utama
              <span className="relative mt-2 block">
                <select
                  value={skillField}
                  onChange={(event) => setSkillField(event.target.value as FieldKey)}
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="UI_UX">Desain UI</option>
                  <option value="SOFTWARE_ENGINEERING">Kode</option>
                  <option value="WRITING">Teks dan esai</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              </span>
            </label>

            <label className="block text-xs font-semibold text-slate-900">
              Level
              <span className="relative mt-2 block">
                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value as LevelKey)}
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="BEGINNER">Pemula</option>
                  <option value="INTERMEDIATE">Menengah</option>
                  <option value="ADVANCED">Lanjutan</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              </span>
            </label>
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-slate-900">Nada mentor</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(toneLabels) as ToneKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tone === key}
                  onClick={() => setTone(key)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    tone === key
                      ? "bg-[#EFECFA] text-[#5044B8]"
                      : "bg-stone-100 text-slate-600 hover:bg-stone-200"
                  }`}
                >
                  {toneLabels[key]}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-600">{toneExamples[tone]}</p>
          </fieldset>
        </section>

        <section className={`${card} flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between`}>
          <div>
            <h2 className="font-semibold text-slate-900">Visibilitas portofolio</h2>
            <p className="mt-1 text-xs text-slate-600">
              Pilih proyek publik atau privat dari halaman kelola portofolio.
            </p>
          </div>
          <a
            href="/portfolio"
            className="text-sm font-semibold text-[#5044B8] hover:underline"
          >
            Kelola portofolio →
          </a>
        </section>

        {saved && (
          <p role="status" className="flex items-center gap-2 text-sm text-green-800">
            <Check className="size-4" /> Perubahan berhasil disimpan.
          </p>
        )}
        {saveError && (
          <p role="alert" className="text-sm text-red-700">
            {saveError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="rounded-lg bg-[#5044B8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#403598] disabled:opacity-60"
          >
            {updateProfile.isPending ? "Menyimpan…" : "Simpan perubahan"}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-stone-50"
          >
            <LogOut className="size-4" /> Keluar
          </button>
        </div>
      </form>
    </div>
  );
}
