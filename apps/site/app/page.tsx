import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Multitenant</h1>
      <p className="text-fd-muted-foreground">
        Config-driven tenant and market resolution for TypeScript — docs, guides, and examples.
      </p>
      <Link
        href="/docs"
        className="mt-2 inline-flex w-fit rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
      >
        Documentation →
      </Link>
    </main>
  );
}
