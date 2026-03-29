'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';

type MermaidProps = {
  chart: string;
};

/**
 * Renders Mermaid diagrams from MDX (see remarkMdxMermaid + fumadocs markdown/mermaid).
 */
export function Mermaid({ chart }: MermaidProps) {
  const [mounted, setMounted] = useState(false);
  const [svg, setSvg] = useState('');
  const { resolvedTheme } = useTheme();
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const run = async () => {
      const m = await import('mermaid');
      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        fontFamily: 'inherit',
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      });
      const { svg: out } = await mermaid.render(
        `mermaid-${uid}`,
        chart.replaceAll('\\n', '\n'),
      );
      if (!cancelled) setSvg(out);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [chart, mounted, resolvedTheme, uid]);

  if (!mounted) {
    return <div className="my-6 h-40 animate-pulse rounded-lg bg-fd-muted/50" aria-hidden />;
  }

  return (
    <div
      className="my-6 flex justify-center overflow-x-auto [&_svg]:max-w-full"
      // eslint-disable-next-line react/no-danger -- Mermaid emits static SVG
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
