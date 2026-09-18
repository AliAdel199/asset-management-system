import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiFetch,
  clearStoredToken,
  getStoredToken,
  resolveApiFileUrl,
  setStoredToken,
} from "./api-client";

describe("token storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when no token is stored", () => {
    expect(getStoredToken()).toBeNull();
  });

  it("round-trips a stored token", () => {
    setStoredToken("token-123");
    expect(getStoredToken()).toBe("token-123");
  });

  it("clears a stored token", () => {
    setStoredToken("token-123");
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
  });
});

describe("resolveApiFileUrl", () => {
  it("prefixes the API origin for uploaded attachment paths", () => {
    expect(resolveApiFileUrl("/uploads/attachments/file.pdf")).toBe(
      "http://localhost:3001/uploads/attachments/file.pdf",
    );
  });

  it("leaves already-absolute URLs untouched", () => {
    expect(resolveApiFileUrl("https://example.com/file.pdf")).toBe(
      "https://example.com/file.pdf",
    );
  });
});

describe("apiFetch", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, pathname: "/assets", href: "" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.unstubAllGlobals();
  });

  it("attaches the bearer token when one is stored", async () => {
    setStoredToken("token-123");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/assets");

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("sends no Authorization header when there is no stored token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/assets");

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("clears the token and redirects to /login on a 401, unless already there", async () => {
    setStoredToken("token-123");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/assets");

    expect(getStoredToken()).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it("does not force a redirect loop when already on the login page", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, pathname: "/login", href: "" },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/auth/login");

    expect(window.location.href).toBe("");
  });
});
