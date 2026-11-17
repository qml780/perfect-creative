const config = {
  distDir: process.env.PC_TEST_BUILD === '1' ? '.next-test' : '.next',
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key:'X-Content-Type-Options', value:'nosniff' },
        { key:'Referrer-Policy', value:'strict-origin-when-cross-origin' },
        { key:'X-Frame-Options', value:'DENY' }
      ]
    }];
  }
};

export default config;
