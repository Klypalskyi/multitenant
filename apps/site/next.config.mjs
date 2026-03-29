import nextra from 'nextra';

const withNextra = nextra({
  search: {
    codeblocks: false,
  },
});

export default withNextra({
  reactStrictMode: true,
  async redirects() {
    return [{ source: '/packages', destination: '/packages/overview', permanent: true }];
  },
});
