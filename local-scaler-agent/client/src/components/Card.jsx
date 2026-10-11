export default function Card({ title, action, children }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
