import type { NextRequest } from 'next/server';

export function localOrigin(request: NextRequest) {
  const host = request.headers.get('host') || '';
  if (!/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/.test(host)) return null;
  return request.nextUrl.protocol + '//' + host;
}
