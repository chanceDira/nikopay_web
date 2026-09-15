type PageHeaderProps = {
  title: string;
  description: string;
  framed?: boolean;
  children?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  framed = true,
  children,
}: PageHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-niko-muted">{description}</p>
      {children ? (
        framed ? (
          <div className="niko-panel mt-8 p-6">{children}</div>
        ) : (
          <div className="mt-8">{children}</div>
        )
      ) : null}
    </div>
  );
}
