import { Routes, Route } from "react-router-dom";
import type { ReviewOutput } from "@skill-coach/shared";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";

// Verifikasi koneksi monorepo: tipe diambil dari @skill-coach/shared.
const sampleReview: ReviewOutput = {
  summary: "Contoh ringkasan review untuk memastikan tipe shared terhubung.",
  scores: { clarity: 8 },
  strengths: ["Struktur rapi", "Penjelasan jelas"],
  improvements: [],
  next_steps: ["Langkah 1", "Langkah 2", "Langkah 3"],
};

console.debug("Shared type OK:", sampleReview.summary);

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Layout>
  );
}
