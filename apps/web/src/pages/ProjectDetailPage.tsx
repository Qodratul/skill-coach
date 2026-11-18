import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Copy,
  ChevronDown,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Maximize2,
  MessageSquare,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { Version, Review, Project } from "@skill-coach/shared";
import { useVersion, useProjects } from "../api";
import { card } from "../components/landing/shared";
import { kindMeta } from "./DashboardPage";

type CritiqueTone = "FRIENDLY" | "STANDARD" | "BLUNT";
type DemoState = "done" | "processing";

const toneLabels: Record<CritiqueTone, string> = {
  FRIENDLY: "Nada ramah",
  STANDARD: "Nada standar",
  BLUNT: "Nada tegas",
};

const levelLabels: Record<string, string> = {
  beginner: "Level pemula",
  intermediate: "Level menengah",
  advanced: "Level advanced",
};

interface DemoReview extends Review {
  _demo?: true;
}

// Demo data untuk testing ketiga kategori
const demoReviews: Record<string, DemoReview> = {
  UI: {
    _demo: true,
    id: "demo-ui",
    versionId: "demo-ui-v2",
    summary: "Lebih terarah, lebih mudah dipahami.",
    scores: {
      "Hierarki visual": 8,
      Konsistensi: 8,
      Aksesibilitas: 7,
      "Kejelasan CTA": 8,
    },
    strengths: [
      "Alur jarak deskripsi dan tomboli jelas, deskripsi itu sendiri semakin besar dari deskripsi tapi masih di bawah visual utama",
      "Kontras yang bagus: judul kuat juga menunjukkan informasi yang lebih jelas",
    ],
    improvements: [
      {
        title: "Alur perhatian di hero lebih jelas",
        problem:
          "Juduk mendeskripsi titu musah utama, diski disokiskoti dan tidak misu khususnya, plus jaras agar sutap bagian terasa lebih jelas",
        why_it_matters:
          "Janis deskripsi sisolet aja untuk masalah utama. Perkanal undan memudahkan bahwa identifikasi-kelurahan jika bukan deskripsi",
        example_fix:
          "Gunakan jarak 16 px di deskripsi se tomboli 24 di jarak label 'Lihat menu kopi' yang sudah specifik",
        location: "Hero section",
      },
      {
        title: "Kontras dan pola visual lebih konsisten",
        problem:
          "Teks geplak pada latar lintabg subtly tertarik teh sampit tebat jelas taat menentukan konten kladi pengaruh",
        why_it_matters:
          "Pembaca perlu membedakan teks utama dengan visual yang lebih jelas untuk menjamin bahwa isu teks itu dimulainya ke halaman yang lebih besar",
        example_fix:
          "Ubah jarak 16 px di deskripsi se tomboli 24 di jarak label 'Lihat menu kopi' yang sudah specifik",
      },
    ],
    nextSteps: [
      "Atur jarak attribut keunggulan dengan grid 8 px.",
      "Samakan jarak antarblok keunggulan dengan grid 8 px.",
      "Tutup dengan revisi masukan & periksa di mobile.",
    ],
    comparison: {
      score_delta: {
        "Hierarki visual": 2,
        Konsistensi: 1,
        Aksesibilitas: 1,
        "Kejelasan CTA": 2,
      },
      progress_commentary:
        "Progres yang terlihat, terutama di area CTA dan konsistensi spacing yang sudah lebih rapi dibanding v1.",
    },
    model: "claude-opus-4",
    promptVersion: "1.0",
    tokensIn: 1500,
    tokensOut: 750,
    costEstimate: "$0.045",
    createdAt: new Date().toISOString(),
  },
  CODE: {
    _demo: true,
    id: "demo-code",
    versionId: "demo-code-v1",
    summary: "Strukturnya jelas. Sekarang, lindingi masukan.",
    scores: {
      "Kebenaran logika": 6,
      Keterbacaan: 7,
      "Penanganan error": 5,
      "Struktur kode": 6,
    },
    strengths: [
      "Endpoint pumping tanggung jawab terpisah. POST klasik membuat data bersama ORM yang cukup.",
      "Penamaan mutasi jelas",
    ],
    improvements: [
      {
        title: "Tidak ahul kosing sebelum menunyuan",
        problem:
          "Validasi input tidak memastikan input data kosong sebelum kosong dan proses sistem yang keluar membuat D anya. Oleh karena itu, sistem terkena pengganggu ilegal memulai input database pada proses perilaku",
        why_it_matters:
          "Data yang tidak valid akan menghasilkan perilaku tidak terduga. Jika tidak ditangani, basis data anda bisa menyimpan data sampah yang menyebabkan masalah di kemudian hari",
        example_fix:
          "Gunakan jarak 16 px di deskripsi se tomboli 24 di jarak label 'Lihat menu kopi' yang sudah specifik",
      },
    ],
    nextSteps: [
      "Tambahkan validasi jebut: string, tak kosong, dan trim spasi.",
      "Gunakan try/catch dan kembalikan response 400 dan 201.",
      "Upload v2 lasan hasil perubahan response 400 dan 201.",
    ],
    comparison: null,
    model: "claude-opus-4",
    promptVersion: "1.0",
    tokensIn: 1200,
    tokensOut: 600,
    costEstimate: "$0.035",
    createdAt: new Date().toISOString(),
  },
  ESSAY: {
    _demo: true,
    id: "demo-text",
    versionId: "demo-text-v1",
    summary: "Suaramu sudah terasa. Beri argumenmu pijakan.",
    scores: {
      "Kekuatan argumen": 6,
      "Alur gagasan": 8,
      "Bukti pendukung": 7,
      "Gaya bahasa": 8,
    },
    strengths: [
      "Pembuka memberi suatu pendang yang empatik membuat arah tulisanmu jelas",
      "Pendekup kembali pada gagasan utama",
    ],
    improvements: [
      {
        title: "Batasi klaim, lalu beri alasan yang bisa dibuktikan",
        problem:
          "Masalah 1 . Paragraf 3 mengklaim bahwa orang lain mengatakan bukti pelayanan mereka lalu siapa yang mengerti membuat kesimpulanmu jadi terbuka pada kritik",
        why_it_matters:
          "Klaim 'semua orang lebih nyaman' mengagregasikan kumpulan pihak. Klaim-simpulan penyangkalan akan dianggap pelecehan yang masalah",
        example_fix:
          "Ubah menjadi: Tritik yang cukup lebih dari ruang Tanya jawab berhasil menunjukkan argumen kamu adalah kesejahteraan umum. Pertahankan fakta yang bisa dijelas selama argumen kamu terbukti",
      },
    ],
    nextSteps: [
      "Batasi klaim paragraf 2 dan camkan bukti yang tajam melalui data.",
      "Tanya-jawab karena gelar 3 dengan pengantar penegasan pendekatan.",
      "Upload v2 lasan hasil perubahan response 400 dan 201.",
    ],
    comparison: null,
    model: "claude-opus-4",
    promptVersion: "1.0",
    tokensIn: 1100,
    tokensOut: 550,
    costEstimate: "$0.032",
    createdAt: new Date().toISOString(),
  },
};

// Demo projects so reviewers can open every design state without a backend.
// IDs: demo-ui, demo-ui-processing, demo-code, demo-essay
const demoProjects: Record<string, { project: Project; state: DemoState; versionNo: number }> = {
  "demo-ui": {
    state: "done",
    versionNo: 2,
    project: {
      id: "demo-ui",
      userId: "demo",
      title: "Landing page toko kopi",
      description: null,
      goal: "Membantu pengunjung menemukan menu dan suasana kedai kopi lokal melalui landing page yang mudah dipahami.",
      skillType: "UI",
      visibility: "PRIVATE",
      createdAt: new Date().toISOString(),
    },
  },
  "demo-ui-processing": {
    state: "processing",
    versionNo: 1,
    project: {
      id: "demo-ui-processing",
      userId: "demo",
      title: "Landing page toko kopi",
      description: null,
      goal: "Membantu pengunjung menemukan menu dan suasana kedai kopi lokal melalui landing page yang mudah dipahami.",
      skillType: "UI",
      visibility: "PRIVATE",
      createdAt: new Date().toISOString(),
    },
  },
  "demo-code": {
    state: "done",
    versionNo: 1,
    project: {
      id: "demo-code",
      userId: "demo",
      title: "API daftar tugas",
      description: null,
      goal: "Membuat API sederhana untuk menyimpan dan membaca daftar tugas sebagai latihan dasar backend.",
      skillType: "CODE",
      visibility: "PRIVATE",
      createdAt: new Date().toISOString(),
    },
  },
  "demo-essay": {
    state: "done",
    versionNo: 1,
    project: {
      id: "demo-essay",
      userId: "demo",
      title: "Esai: Kota yang lebih ramah",
      description: null,
      goal: "Mengajak pembaca memahami pentingnya kota yang inklusif melalui esai opini untuk majalah kampus.",
      skillType: "ESSAY",
      visibility: "PRIVATE",
      createdAt: new Date().toISOString(),
    },
  },
};

function ProgressStep({
  num,
  label,
  done,
  active,
}: {
  num: number;
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full font-semibold ${
          done
            ? "bg-green-100 text-green-700"
            : active
              ? "bg-[#EFECFA] text-[#5044B8]"
              : "bg-stone-100 text-slate-500"
        }`}
      >
        {done ? <CheckCircle2 className="size-5" /> : num}
      </div>
      <span
        className={`text-sm font-medium ${
          active ? "text-slate-900" : "text-slate-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-500">{score}/10</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm ${
              i < Math.round(score) ? "bg-[#5044B8]" : "bg-stone-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ImprovementCard({
  num,
  item,
  expanded,
  onToggle,
  skillType,
}: {
  num: number;
  item: Review["improvements"][number];
  expanded: boolean;
  onToggle: () => void;
  skillType: string;
}) {
  const codeExample = `const task = req.body.title?.trim()
if (!task || task.length === 0) {
  return res.status(400).json({
    error: 'Title wajib diisi'
  })
}
// Lanjut ke DB insertion
const result = await db.task.create({
  title: task
})
res.status(201).json(result)`;

  const textExample = `CONTOH PENULISAN ULANG

"Semua orang lebih senang menu yang terbatas karena membuat keputusan jadi lebih mudah."

Ubah menjadi:

"Penelitian Nielsen (2012) menemukan bahwa menu dengan kurang dari 7 pilihan meningkatkan kepuasan pelanggan 34%. Terbukti dari studi kami di 50 kedai kopi lokal, menu yang terbatas justru membuat pengunjung kembali lagi."`;

  return (
    <div className={card}>
      <button
        onClick={onToggle}
        className="block w-full p-4 text-left hover:bg-stone-50"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">
            {num} · {item.title}
          </span>
          <ChevronDown
            className={`size-5 text-slate-400 transition ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-stone-200 px-4 py-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.09em] text-[#6256aa] mb-2">
              Masalah
            </h4>
            <p className="text-sm text-slate-700">{item.problem}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.09em] text-[#6256aa] mb-2">
              Mengapa penting
            </h4>
            <p className="text-sm text-slate-700">{item.why_it_matters}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.09em] text-[#6256aa] mb-2">
              Contoh perbaikan
            </h4>
            <p className="text-sm text-slate-700 mb-3">{item.example_fix}</p>

            {skillType === "CODE" && (
              <div className="relative rounded-lg bg-[#1E1D2B] p-3">
                <pre className="overflow-x-auto text-xs text-slate-300 font-mono leading-relaxed">
                  {codeExample}
                </pre>
                <button className="absolute top-2 right-2 inline-flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600">
                  <Copy className="size-3" /> Salin
                </button>
              </div>
            )}

            {skillType === "ESSAY" && (
              <div className="rounded-lg bg-[#EFECFA] p-3">
                <pre className="overflow-x-auto text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                  {textExample}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UIWorkPreview() {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="bg-stone-100 p-4">
        <button className="mb-2 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <Maximize2 className="size-3" /> Perbesar
        </button>
      </div>
      <div className="relative aspect-video bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="relative">
          <img
            src="/images/coffee.jpg"
            alt="Karya UI desain"
            className="h-48 w-64 object-cover rounded"
          />
          <div className="absolute top-12 left-16 flex h-6 w-6 items-center justify-center rounded-full bg-[#5044B8] text-xs font-bold text-white">
            1
          </div>
        </div>
      </div>
      <div className="border-t border-stone-200 p-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.09em] text-[#6256aa] mb-3">
          Temukan area masukan
        </h3>
        <p className="text-xs text-slate-600">
          Klik nomor area pada gambar di atas untuk membaca masukan.
        </p>
      </div>
    </div>
  );
}

function CodeBlockPreview() {
  return (
    <div className={card}>
      <div className="bg-[#1E1D2B] p-4 rounded-t-2xl">
        <div className="text-xs text-slate-400 font-mono leading-relaxed">
          {`  1 const tasks = () => {
  2   const tasks = tasks || []
  3   tasks.push(newTasks)
  4   return tasks
  5 }
  6
  7 app.get('/tasks', (req, res) => {
  8   res.json(tasks())
  9 })`}
        </div>
      </div>
      <div className="border-t border-stone-200 p-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.09em] text-[#6256aa] mb-3">
          Referensi masukan
        </h3>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Baris 3–9: Proses</p>
          <p className="text-xs text-slate-600">
            Endpoint memproses data dari body request.
          </p>
        </div>
      </div>
    </div>
  );
}

function TextExcerptPreview() {
  return (
    <div className={card}>
      <div className="p-4 bg-stone-50 border-b border-stone-200">
        <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#6256aa] mb-2">
          Cuplikan naskah · v1
        </p>
      </div>
      <div className="p-4 space-y-3 text-sm leading-relaxed">
        <p>
          Kota rumah bukah nyata soal jalan yang lalu lain untuk bergeri, serisatian, dan bertemu tanpa merasa terasing.
        </p>
        <p>
          <span className="inline-block px-2 py-1 bg-yellow-100 rounded text-xs font-medium text-slate-800">
            Paragraf 2 · Masukan 1
          </span>
          <span className="ml-2">Sorot mencari teks dari kata yang menekankan arti untuk majutnya kumpulan makna.</span>
        </p>
        <p>Tujuan kami membuat kota lebih berfungsi dalam menghubungkan orang lain dalam ruang publik.</p>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expandedImprovement, setExpandedImprovement] = useState(0);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  // Load projects to find the one with this ID
  const projectsQuery = useProjects();
  const realProject = useMemo(() => {
    if (!id) return null;
    const all = projectsQuery.data?.pages.flatMap((p) => p.items) ?? [];
    return all.find((p) => p.id === id);
  }, [projectsQuery.data, id]);
  const demo = id ? demoProjects[id] : undefined;
  const project = realProject ?? demo?.project;

  // Get latest version ID from project (real projects only; demos carry no version id)
  const latestVersionId = realProject?.versions?.[0]?.id;
  const versionQuery = useVersion(latestVersionId ?? "");
  const version = versionQuery.data as Version | undefined;

  if (!id) return <p className="text-slate-600">ID proyek tidak ditemukan.</p>;
  if (!demo && projectsQuery.isLoading) return <p className="text-slate-600">Memuat...</p>;
  if (!project) return <p className="text-slate-600">Proyek tidak ditemukan.</p>;

  // Real project drives status from its version; demo project drives it from fixed demo state.
  const isProcessing = realProject
    ? Boolean(version && ["queued", "processing"].includes(version.status))
    : demo?.state === "processing";
  const isDone = realProject ? version?.status === "done" : demo?.state === "done";
  const review = isDone && version?.review ? version.review : null;
  const demoReview = demoReviews[project.skillType];

  const effectiveReview = review || (isProcessing ? null : demoReview);
  const versionNum = version?.versionNumber ?? demo?.versionNo ?? 1;
  const skillMeta = kindMeta[project.skillType];

  const profileTone: CritiqueTone = "FRIENDLY";
  const profileLevel = "beginner";

  return (
    <div className="space-y-8 pb-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <Link to="/projects" className="hover:text-slate-900">
            Proyek
          </Link>
          <ChevronRight className="size-4" />
          <span className="text-slate-900">{project.title}</span>
          <ChevronRight className="size-4" />
          <span className="text-[#5044B8]">v{versionNum}</span>
        </nav>

        {/* Header Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.09em] text-[#5044B8]">
              {skillMeta.label.toUpperCase()} · V{versionNum} ·{" "}
              {new Date(version?.createdAt || project.createdAt).toLocaleDateString(
                "id-ID",
                { day: "numeric", month: "long", year: "numeric" },
              )}
            </p>
            <h1 className="mb-4 text-4xl font-bold text-slate-900">
              {project.title}
            </h1>
            <p className="text-base text-slate-600 max-w-2xl">
              {project.goal}
            </p>
          </div>
          <button className="rounded-lg bg-[#5044B8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#403598]">
            Unggah revisi
          </button>
        </div>

        {/* Status Badges */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {isDone && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-2 text-xs font-semibold text-green-700">
              <CheckCircle2 className="size-4" /> Review selesai
            </span>
          )}
          {isProcessing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-2 text-xs font-semibold text-yellow-700">
              <AlertCircle className="size-4" /> Sedang diproses
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-2 text-xs text-slate-700">
            {toneLabels[profileTone]} · {levelLabels[profileLevel]}
          </span>

          {review?.comparison?.score_delta && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-2 text-xs text-slate-700">
              Dibandingkan v{Math.max(1, versionNum - 1)} ·{" "}
              {new Date(
                version?.createdAt || project.createdAt,
              ).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Processing State */}
        {isProcessing && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Work Preview */}
            <div className="lg:col-span-1">
              {project.skillType === "UI" && <UIWorkPreview />}
              {project.skillType === "CODE" && <CodeBlockPreview />}
              {project.skillType === "ESSAY" && <TextExcerptPreview />}

              <div className={`${card} mt-4`}>
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#6256aa] mb-2">
                    Tujuan karya
                  </p>
                  <p className="text-sm text-slate-700">{project.goal}</p>
                </div>
              </div>
            </div>

            {/* Right: Progress */}
            <div className="lg:col-span-2 space-y-4">
              <div className={`${card} p-4 space-y-4`}>
                <ProgressStep num={1} label="Unggahan diterima" done active={false} />
                <ProgressStep num={2} label="Membaca karyamu..." done={false} active={true} />
                <ProgressStep num={3} label="Menyusun masukan..." done={false} active={false} />
              </div>

              <div className="rounded-2xl bg-[#EFECFA] p-6">
                <div className="mb-3 flex items-start gap-2">
                  <AlertCircle className="size-5 text-[#5044B8] mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">
                      Masih diproses, kamu bisa kembali nanti
                    </h3>
                    <p className="text-sm text-slate-600">
                      Mentor AI sedang meninju tujuan dan detail karya kamu
                      sebelum menyusun masukan.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/projects")}
                  className="mt-4 rounded-lg border border-[#5044B8] px-4 py-2 text-sm font-semibold text-[#5044B8] hover:bg-indigo-50"
                >
                  Kembali ke proyek
                </button>
              </div>

              <div className={`${card} p-4`}>
                <h4 className="text-xs font-bold uppercase tracking-[0.09em] text-[#6256aa] mb-3">
                  SAAT MASIH MENGANTRE
                </h4>
                <p className="text-sm text-slate-700 mb-2">
                  <strong>Menunggu giliran review</strong>
                </p>
                <p className="text-xs text-slate-600">
                  Karyamu sudah masuk antrian. Proses akan dimulai saat giliranu
                  tiba. Tidak perlu mengirim ulang.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Done State */}
        {isDone && effectiveReview && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Sidebar: Work Preview */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-4">
                {project.skillType === "UI" && <UIWorkPreview />}
                {project.skillType === "CODE" && <CodeBlockPreview />}
                {project.skillType === "ESSAY" && <TextExcerptPreview />}

                <div className={`${card} p-4 rounded-2xl bg-[#EFECFA]`}>
                  <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#6256aa] mb-2">
                    Tujuan karya
                  </p>
                  <p className="text-sm text-slate-700">{project.goal}</p>
                </div>
              </div>
            </div>

            {/* Main Content: Review */}
            <div className="lg:col-span-8 space-y-6">
              {/* Mentor's Note */}
              <div className="rounded-2xl bg-[#EFECFA] p-6">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare className="size-5 text-[#5044B8]" />
                  <span className="text-xs font-bold uppercase tracking-[0.09em] text-[#5044B8]">
                    Catatan mentor kamu
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900">
                  {effectiveReview.summary}
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Pertanyaan yang reflektif dan penuturan yang empatik membuat arah
                  tulisanmu jelas.disiplin. Namun, buah paragrof kedua masih belum
                  membaca bukti bukti lengkap yang harus dilibatkan dengan jelas dalam
                  perkataan satu dasarán dibaca, jelas penggunanya benda dari kalimat.
                </p>
              </div>

              {/* Score & Progress */}
              <div className={card}>
                <div className="border-b border-stone-200 px-6 py-4">
                  <div className="mb-4 flex items-baseline gap-3">
                    <span className="text-5xl font-bold text-slate-900">
                      {(
                        Object.values(effectiveReview.scores).reduce((a, b) => a + b) /
                        Object.keys(effectiveReview.scores).length
                      ).toFixed(1)}
                    </span>
                    <span className="text-lg text-slate-500">/10</span>
                    {effectiveReview.comparison?.score_delta && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                        ▲ Naik +
                        {(
                          Object.values(
                            effectiveReview.comparison.score_delta,
                          ).reduce((a, b) => a + b) /
                          Object.keys(effectiveReview.comparison.score_delta)
                            .length
                        ).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Rata-rata kriteria
                  </p>
                </div>

                <div className="space-y-4 px-6 py-4">
                  {Object.entries(effectiveReview.scores).map(([label, score]) => (
                    <ScoreBar
                      key={label}
                      label={label}
                      score={score}
                    />
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Yang sudah kamu lakukan dengan baik
                </h3>
                <div className="space-y-3">
                  {effectiveReview.strengths.slice(0, 2).map((strength, i) => (
                    <div key={i} className={card + " p-4"}>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                          ✓
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 mb-1">
                            Kekuatan {i + 1}
                          </p>
                          <p className="text-sm text-slate-700">{strength}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Ruang untuk versi berikutnya
                </h3>
                <div className="space-y-3">
                  {effectiveReview.improvements.map((item, i) => (
                    <ImprovementCard
                      key={i}
                      num={i + 1}
                      item={item}
                      expanded={expandedImprovement === i}
                      onToggle={() =>
                        setExpandedImprovement(
                          expandedImprovement === i ? -1 : i,
                        )
                      }
                      skillType={project.skillType}
                    />
                  ))}
                  {effectiveReview.improvements.length < 2 && (
                    <button className={`${card} w-full p-4 text-center text-slate-500 hover:bg-stone-50`}>
                      <Plus className="mx-auto mb-2 size-5" />
                      <span className="text-sm">Tambah masukan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Next Steps */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Tiga langkah berikutnya
                </h3>
                <div className="space-y-3">
                  {effectiveReview.nextSteps.map((step, i) => (
                    <div
                      key={i}
                      className={`${card} p-4 ${
                        i === 0 ? "border-l-4 border-[#5044B8]" : ""
                      }`}
                    >
                      <p className="font-semibold text-slate-900 mb-2">
                        {i + 1} · {step.split("·")[0]}
                      </p>
                      <p className="text-sm text-slate-600">
                        {step.includes("·") ? step.split("·")[1] : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              <div className={card}>
                <div className="border-b border-stone-200 px-6 py-4">
                  <p className="font-semibold text-slate-900">
                    Review ini berguna?
                  </p>
                </div>
                <div className="flex gap-3 px-6 py-4">
                  <button
                    onClick={() => setFeedbackGiven(true)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      feedbackGiven === true
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-stone-200 text-slate-700 hover:bg-stone-50"
                    }`}
                  >
                    <ThumbsUp className="size-4" /> Ya, membantu
                  </button>
                  <button
                    onClick={() => setFeedbackGiven(false)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      feedbackGiven === false
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-stone-200 text-slate-700 hover:bg-stone-50"
                    }`}
                  >
                    <ThumbsDown className="size-4" /> Belum membantu
                  </button>
                </div>
              </div>

              {/* CTA */}
              <div className="rounded-2xl bg-[#EFECFA] p-6">
                <h3 className="mb-2 font-semibold text-slate-900">
                  Siap merevisi? Unggah versi berikutnya.
                </h3>
                <p className="mb-4 text-sm text-slate-700">
                  Teruskan satu perbuahan dulu. Progres lumbuh dari langkah kecil
                  yang kamu bikin.
                </p>
                <button className="rounded-lg bg-[#5044B8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#403598]">
                  Unggah revisi
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
