import { describe, expect, it } from "vitest";
import {
  hostnameFromHostHeader,
  isLocalhostHostname,
  isLocalhostRequest,
} from "@/lib/http/localhost";

describe("localhost request detection", () => {
  it("reads the hostname from Host, including IPv6 brackets", () => {
    expect(hostnameFromHostHeader("localhost:3000")).toBe("localhost");
    expect(hostnameFromHostHeader("127.0.0.1:3000")).toBe("127.0.0.1");
    expect(hostnameFromHostHeader("[::1]:3000")).toBe("::1");
    expect(isLocalhostHostname("localhost")).toBe(true);
    expect(isLocalhostHostname("example.com")).toBe(false);
  });

  it("allows only the Host header, not x-forwarded-host", () => {
    expect(
      isLocalhostRequest(
        new Request("http://localhost:3000/api/catalog/update", {
          headers: { host: "localhost:3000" },
        }),
      ),
    ).toBe(true);
    expect(
      isLocalhostRequest(
        new Request("http://127.0.0.1:3000/api/catalog/update", {
          headers: { host: "127.0.0.1:3000" },
        }),
      ),
    ).toBe(true);
    expect(
      isLocalhostRequest(
        new Request("http://[::1]:3000/api/catalog/update", {
          headers: { host: "[::1]:3000" },
        }),
      ),
    ).toBe(true);
    expect(
      isLocalhostRequest(
        new Request("http://renderz.example/api/catalog/update", {
          headers: {
            host: "renderz.example",
            "x-forwarded-host": "localhost",
          },
        }),
      ),
    ).toBe(false);
  });
});
