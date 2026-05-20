export default function HaftalikAkisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Haftalık Akış</h1>
        <p className="mt-1 text-sm text-white/40">
          Termin haftasına göre yük dağılımı (ton)
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
        <p className="text-sm text-white/30">
          📅 Haftalık Akış ekranı — geliştirme sırası
        </p>
        <p className="mt-2 text-xs text-white/20">
          modules/sd/components/WeeklyFlowView.tsx
        </p>
      </div>
    </div>
  );
}
