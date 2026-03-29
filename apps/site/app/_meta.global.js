export default {
  index: { type: 'page', title: 'Home' },
  'why-multitenant': { type: 'page', title: 'Why Multitenant?' },
  'getting-started': { type: 'page', title: 'Getting started' },
  config: { type: 'page', title: 'Configuration' },
  packages: { type: 'page', title: 'Packages' },
  errors: { type: 'page', title: 'Errors' },
  examples: { type: 'page', title: 'Examples' },
  cli: {
    title: 'CLI',
    type: 'page',
    items: {
      init: 'multitenant init',
      'dev-check-print': 'dev, check, print',
    },
  },
  frameworks: {
    title: 'Frameworks',
    type: 'page',
    items: {
      overview: 'Overview',
      'next-app': 'Next.js (App Router)',
      'next-pages': 'Next.js (Pages)',
      express: 'Express',
      nest: 'NestJS',
      react: 'React (SSR / RSC)',
    },
  },
};
