import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function getCliVersion(): string | null {
  try {
    const pkg = require('@multitenant/cli/package.json') as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

/**
 * Shown on CLI docs when `@multitenant/cli` is linked (site devDependency) — resolves published version at build time.
 */
export function CliLocalNote() {
  const version = getCliVersion();
  if (!version) return null;

  return (
    <div className="my-4 rounded-lg border border-fd-border bg-fd-card p-4 text-sm text-fd-muted-foreground [&_code]:rounded-md [&_code]:bg-fd-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]">
      <p className="font-medium text-fd-foreground">
        <code>@multitenant/cli</code> <span className="text-fd-muted-foreground">({version})</span> as a devDependency
      </p>
      <p className="mt-2">
        With the package installed, the <code>multitenant</code> binary is on your PATH via{' '}
        <code>node_modules/.bin</code>. You can run <code>multitenant dev --run-dev --port 3100</code> instead of{' '}
        <code>npx @multitenant/cli dev --run-dev --port 3100</code> — same for <code>check</code>,{' '}
        <code>print</code>, and <code>init</code>.
      </p>
    </div>
  );
}
