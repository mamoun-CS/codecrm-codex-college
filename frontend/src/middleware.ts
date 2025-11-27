import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from './i18n/config';

const PUBLIC_FILE = /\.(.*)$/;
const LOCALE_HEADER = 'X-NEXT-INTL-LOCALE';
const LOCALE_COOKIE = 'NEXT_LOCALE';

const resolveLocale = (request: NextRequest): Locale => {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0]?.trim())
      .filter(Boolean);

    for (const lang of preferred) {
      const normalized = lang?.split('-')[0] as Locale | undefined;
      if (normalized && locales.includes(normalized)) {
        return normalized;
      }
    }
  }

  return defaultLocale;
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  const locale = resolveLocale(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
