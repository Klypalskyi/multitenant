'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';

const PM = ['npm', 'pnpm', 'yarn', 'bun'] as const;
type Pm = (typeof PM)[number];

function ShellLine({ text }: { text: string }) {
  const tokens = text.split(/(\s+)/);
  return (
    <code className="bg-transparent text-[13px] leading-relaxed">
      {tokens.map((part, i) => {
        if (/^(npm|pnpm|yarn|bun|npx|bunx)$/.test(part)) {
          return (
            <span key={i} className="italic text-sky-300">
              {part}
            </span>
          );
        }
        if (
          /^(run|install|add|dlx|exec|init|check|dev|print)$/.test(part) ||
          /^examples:/.test(part) ||
          /^release:/.test(part) ||
          part === '-w' ||
          part === '-D' ||
          part === '-d' ||
          part.startsWith('--')
        ) {
          return (
            <span key={i} className="font-medium text-green-400">
              {part}
            </span>
          );
        }
        if (part.startsWith('http://') || part.startsWith('https://')) {
          return (
            <span key={i} className="text-sky-200/90">
              {part}
            </span>
          );
        }
        return (
          <span key={i} className="text-fd-foreground">
            {part}
          </span>
        );
      })}
    </code>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      title={done ? 'Copied' : 'Copy'}
      className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
      aria-label="Copy command"
    >
      {done ? (
        <span className="text-xs font-medium text-fd-primary">Copied</span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function PackageManagerCodeBlock({
  lines,
  groupId = 'default',
}: {
  lines: Record<Pm, string>;
  groupId?: string;
}) {
  const storageKey = `pm-code-block:${groupId}`;
  const [pm, setPm] = useState<Pm>('npm');
  const id = useId();

  useEffect(() => {
    try {
      const s = localStorage.getItem(storageKey) as Pm | null;
      if (s && PM.includes(s)) setPm(s);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const select = useCallback(
    (next: Pm) => {
      setPm(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const active = lines[pm];

  return (
    <div className="pm-code-block my-4 overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
      <div
        className="flex flex-wrap border-b border-fd-border bg-fd-card px-2 pt-1.5"
        role="tablist"
        aria-label="Package manager"
      >
        {PM.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${id}-${key}`}
            aria-selected={pm === key}
            onClick={() => select(key)}
            className={
              pm === key
                ? 'border-b-2 border-fd-primary px-3 py-2 text-sm font-medium text-fd-primary'
                : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground'
            }
          >
            {key}
          </button>
        ))}
      </div>
      <div className="relative bg-fd-secondary px-4 py-3.5 pr-12 font-mono">
        <CopyButton text={active} />
        <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-all bg-transparent p-0 pr-2">
          <ShellLine text={active} />
        </pre>
      </div>
    </div>
  );
}

function installToPnpmYarnBun(npm: string): { pnpm: string; yarn: string; bun: string } {
  const n = npm.trim();
  if (n.startsWith('npm install -D ')) {
    const rest = n.slice('npm install -D '.length);
    return {
      pnpm: `pnpm add -D ${rest}`,
      yarn: `yarn add -D ${rest}`,
      bun: `bun add -d ${rest}`,
    };
  }
  if (n.startsWith('npm install ')) {
    const rest = n.slice('npm install '.length);
    return {
      pnpm: `pnpm add ${rest}`,
      yarn: `yarn add ${rest}`,
      bun: `bun add ${rest}`,
    };
  }
  return { pnpm: n, yarn: n, bun: n };
}

/** `npm install …` / `npm install -D …` → pnpm / yarn / bun */
export function InstallTabs({ npm }: { npm: string }) {
  const { pnpm, yarn, bun } = installToPnpmYarnBun(npm);
  const lines = useMemo(
    () =>
      ({
        npm: npm.trim(),
        pnpm,
        yarn,
        bun,
      }) as Record<Pm, string>,
    [npm, pnpm, yarn, bun],
  );
  return <PackageManagerCodeBlock lines={lines} groupId={`install-${hash(npm)}`} />;
}

/** `npx @multitenant/cli …` / `pnpm dlx` / `yarn dlx` / `bunx` */
export function CliDlxTabs({ args }: { args: string }) {
  const a = args.trim();
  const lines = useMemo(
    () =>
      ({
        npm: `npx @multitenant/cli ${a}`,
        pnpm: `pnpm dlx @multitenant/cli ${a}`,
        yarn: `yarn dlx @multitenant/cli ${a}`,
        bun: `bunx @multitenant/cli ${a}`,
      }) as Record<Pm, string>,
    [a],
  );
  return <PackageManagerCodeBlock lines={lines} groupId={`dlx-${hash(a)}`} />;
}

/** Root script: `npm run foo` */
export function RunScriptTabs({ script }: { script: string }) {
  const lines = useMemo(
    () =>
      ({
        npm: `npm run ${script}`,
        pnpm: `pnpm run ${script}`,
        yarn: `yarn run ${script}`,
        bun: `bun run ${script}`,
      }) as Record<Pm, string>,
    [script],
  );
  return <PackageManagerCodeBlock lines={lines} groupId={`run-${hash(script)}`} />;
}

/** `npm run <script> -w <ws>` and workspace equivalents */
export function WorkspaceRunTabs({ workspace, script }: { workspace: string; script: string }) {
  const lines = useMemo(
    () =>
      ({
        npm: `npm run ${script} -w ${workspace}`,
        pnpm: `pnpm --filter ${workspace} run ${script}`,
        yarn: `yarn workspace ${workspace} run ${script}`,
        bun: `bun run --filter ${workspace} ${script}`,
      }) as Record<Pm, string>,
    [workspace, script],
  );
  return <PackageManagerCodeBlock lines={lines} groupId={`ws-${workspace}-${script}`} />;
}

/** Stable short id for localStorage keys (avoid huge strings) */
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h);
}
