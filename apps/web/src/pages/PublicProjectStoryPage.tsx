import { Link, useParams } from "react-router-dom";
import { usePublicProjectStory } from "../api";
import { PublicNavbar } from "./PublicPortfolioPage";

function average(scores?: Record<string, number>) {
  const values = Object.values(scores ?? {});
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

export default function PublicProjectStoryPage() {
  const { username = "", projectId = "" } = useParams();
  const storyQuery = usePublicProjectStory(username, projectId);

  if (storyQuery.isLoading) {
    return <main className="p-10 text-center text-sm text-slate-600">Memuat cerita proyek…</main>;
  }

  if (storyQuery.isError || !storyQuery.data) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-slate-900">
        <PublicNavbar />
        <main className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="text-2xl font-semibold">Cerita proyek tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-600">
            Proyek ini mungkin privat atau sudah tidak tersedia.
          </p>
          <Link
            to={`/p/${encodeURIComponent(username)}`}
            className="mt-6 inline-flex rounded-lg bg-[#5044B8] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Kembali ke portofolio
          </Link>
        </main>
      </div>
    );
  }

  const { displayName, project } = storyQuery.data;
  const versions = [...project.versions].sort(
    (left, right) => left.versionNumber - right.versionNumber,
  );
  const firstScore = average(versions[0]?.review?.scores);
  const latestScore = average(versions.at(-1)?.review?.scores);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900">
      <PublicNavbar />
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8 lg:px-12">
        <Link
          to={`/p/${encodeURIComponent(username)}`}
          className="text-sm font-medium text-[#5044B8] hover:underline"
        >
          ← Portofolio {displayName}
        </Link>

        <header className="rounded-3xl bg-[#FFF1E5] p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-wider text-[#5044B8]">
            {project.skillType} · CERITA PROYEK
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {project.title}
          </h1>
          {project.description && (
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-700">
              {project.description}
            </p>
          )}
          {project.goal && (
            <p className="mt-4 text-sm text-slate-600">
              <span className="font-semibold">Tujuan:</span> {project.goal}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/80 px-3 py-1.5">{versions.length} versi selesai</span>
            {firstScore !== null && latestScore !== null && (
              <span className="rounded-full bg-green-50 px-3 py-1.5 font-semibold text-green-800">
                Skor rata-rata {firstScore.toFixed(1)} → {latestScore.toFixed(1)}
              </span>
            )}
          </div>
        </header>

        {versions.length === 0 ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-slate-600">
            Belum ada versi dengan review selesai untuk ditampilkan.
          </section>
        ) : (
          <section className="space-y-5">
            <h2 className="text-xl font-semibold">Perjalanan revisi</h2>
            {versions.map((version) => {
              const review = version.review;
              const score = average(review?.scores);
              return (
                <article
                  key={version.id}
                  className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Versi {version.versionNumber}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <time dateTime={version.createdAt}>
                        {new Date(version.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                      {score !== null && (
                        <span className="rounded-full bg-[#EFECFA] px-3 py-1 font-semibold text-[#5044B8]">
                          {score.toFixed(1)} / 10
                        </span>
                      )}
                    </div>
                  </div>
                  {review && (
                    <>
                      <p className="mt-4 leading-relaxed text-slate-700">{review.summary}</p>
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-semibold">Kekuatan</h4>
                          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-600">
                            {review.strengths.map((strength, index) => (
                              <li key={`${version.id}-strength-${index}`}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">Skor per kriteria</h4>
                          <dl className="mt-2 space-y-1.5 text-sm text-slate-600">
                            {Object.entries(review.scores).map(([name, value]) => (
                              <div key={name} className="flex justify-between gap-3">
                                <dt>{name}</dt>
                                <dd className="font-semibold">{value} / 10</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
