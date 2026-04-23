export function StatCard({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <article className="card stat-card">
      <span className="eyebrow">{title}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}
