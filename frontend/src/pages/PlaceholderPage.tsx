import './PageShell.css'

type PlaceholderPageProps = {
  title: string
  subtitle: string
}

export function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      <div className="panel empty-panel">
        <p>模块已预留路由与页面壳，后续按批次接入业务能力。</p>
      </div>
    </section>
  )
}
