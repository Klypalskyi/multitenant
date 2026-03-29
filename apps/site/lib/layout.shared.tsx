import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: 'https://github.com/klypalskyi/multitenant',
    nav: {
      title: <span className="font-semibold tracking-tight">Multitenant</span>,
      url: '/docs',
    },
    links: [
      {
        text: 'Issues',
        url: 'https://github.com/klypalskyi/multitenant/issues',
        external: true,
      },
    ],
  };
}
