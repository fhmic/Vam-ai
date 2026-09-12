/**
 * Minimal Next server adapter for Vitest's plain Node runtime.
 * Production code still imports the real `next/server`; this file is only
 * selected by vitest.config.ts and implements the API surface our route and
 * middleware unit tests exercise.
 */
class CookieJar {
  private readonly values = new Map<string, string>();

  set(name: string, value: string) {
    this.values.set(name, value);
  }

  get(name: string) {
    const value = this.values.get(name);
    return value === undefined ? undefined : { name, value };
  }
}

export class NextRequest {
  readonly url: string;
  readonly nextUrl: URL;
  readonly cookies = new CookieJar();

  constructor(input: URL | string) {
    this.url = String(input);
    this.nextUrl = new URL(input);
  }
}

export class NextResponse extends Response {
  static next() {
    return new NextResponse(null, { status: 200 });
  }

  static redirect(url: URL | string, init?: number | ResponseInit) {
    const responseInit = typeof init === "number" ? { status: init } : init;
    const headers = new Headers(responseInit?.headers);
    headers.set("location", String(url));
    return new NextResponse(null, { ...responseInit, status: responseInit?.status ?? 307, headers });
  }

  static json(body: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new NextResponse(JSON.stringify(body), { ...init, headers });
  }
}
