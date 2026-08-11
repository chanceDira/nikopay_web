type PageHeaderProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-niko-muted">{description}</p>
      {children ? (
        <div className="mt-8 rounded-2xl border border-niko-border bg-niko-surface/50 p-6">
          {children}
        </div>
      ) : null}
    </div>
  );
}
