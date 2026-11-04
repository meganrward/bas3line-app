interface Props {
  title: string;
}

// Placeholder for ambassador sections that are not built yet.
export function ComingSoon({ title }: Readonly<Props>) {
  return (
    <div className="space-y-2">
      <h1 className="heading-page">{title}</h1>
      <p className="text-muted">This section is coming soon.</p>
    </div>
  );
}
