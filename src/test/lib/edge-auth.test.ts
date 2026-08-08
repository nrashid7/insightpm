import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  UnauthorizedError,
  isInternalMonitoringRequest,
  isServiceRoleRequest,
  verifyInternalSecret,
  verifyServiceRole,
} from "../../../supabase/functions/_shared/auth";

const INTERNAL_SECRET = "internal-secret-value";
const SERVICE_ROLE_KEY = "service-role-key-value";

let denoEnv: Record<string, string>;

beforeEach(() => {
  denoEnv = {
    INTERNAL_FUNCTION_SECRET: INTERNAL_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  };
  (globalThis as any).Deno = { env: { get: (key: string) => denoEnv[key] } };
});

afterEach(() => {
  delete (globalThis as any).Deno;
});

function request(headers: Record<string, string>): Request {
  return new Request("https://example.test/fn", { method: "POST", headers });
}

describe("verifyInternalSecret", () => {
  it("accepts a matching secret", () => {
    expect(() => verifyInternalSecret(request({ "x-internal-secret": INTERNAL_SECRET }))).not.toThrow();
  });

  it("rejects a missing header with UnauthorizedError", () => {
    expect(() => verifyInternalSecret(request({}))).toThrow(UnauthorizedError);
  });

  it("rejects a mismatched secret", () => {
    expect(() => verifyInternalSecret(request({ "x-internal-secret": "wrong" }))).toThrow(UnauthorizedError);
  });

  it("rejects a correct prefix that is shorter than the expected secret", () => {
    const prefix = INTERNAL_SECRET.slice(0, 5);
    expect(() => verifyInternalSecret(request({ "x-internal-secret": prefix }))).toThrow(UnauthorizedError);
  });

  it("rejects the expected secret repeated, which must not wrap into a match", () => {
    const repeated = INTERNAL_SECRET + INTERNAL_SECRET;
    expect(() => verifyInternalSecret(request({ "x-internal-secret": repeated }))).toThrow(UnauthorizedError);
  });

  it("rejects every request when the secret is not configured", () => {
    delete denoEnv.INTERNAL_FUNCTION_SECRET;
    expect(() => verifyInternalSecret(request({ "x-internal-secret": INTERNAL_SECRET }))).toThrow(UnauthorizedError);
    expect(() => verifyInternalSecret(request({ "x-internal-secret": "" }))).toThrow(UnauthorizedError);
  });
});

describe("verifyServiceRole", () => {
  it("accepts a bearer token matching the service role key", () => {
    expect(() => verifyServiceRole(request({ authorization: `Bearer ${SERVICE_ROLE_KEY}` }))).not.toThrow();
  });

  it("accepts the raw key without a Bearer prefix", () => {
    expect(() => verifyServiceRole(request({ authorization: SERVICE_ROLE_KEY }))).not.toThrow();
  });

  it("rejects an anon or user token with UnauthorizedError", () => {
    expect(() => verifyServiceRole(request({ authorization: "Bearer anon-token" }))).toThrow(UnauthorizedError);
  });

  it("rejects every request when the service role key is not configured", () => {
    delete denoEnv.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => verifyServiceRole(request({ authorization: `Bearer ${SERVICE_ROLE_KEY}` }))).toThrow(UnauthorizedError);
  });
});

describe("isInternalMonitoringRequest", () => {
  it("requires both the service role key and the internal secret", () => {
    expect(
      isInternalMonitoringRequest(
        request({ authorization: `Bearer ${SERVICE_ROLE_KEY}`, "x-internal-secret": INTERNAL_SECRET }),
      ),
    ).toBe(true);

    expect(isInternalMonitoringRequest(request({ authorization: `Bearer ${SERVICE_ROLE_KEY}` }))).toBe(false);
    expect(isInternalMonitoringRequest(request({ "x-internal-secret": INTERNAL_SECRET }))).toBe(false);
  });
});

describe("isServiceRoleRequest", () => {
  it("does not throw and reports a boolean", () => {
    expect(isServiceRoleRequest(request({ authorization: `Bearer ${SERVICE_ROLE_KEY}` }))).toBe(true);
    expect(isServiceRoleRequest(request({}))).toBe(false);
  });
});

describe("UnauthorizedError", () => {
  it("is distinguishable from a generic error so handlers can answer 401 instead of 500", () => {
    const error = new UnauthorizedError("nope");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("UnauthorizedError");
    expect(new Error("nope")).not.toBeInstanceOf(UnauthorizedError);
  });
});
