import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const unsubscribeMock = vi.fn();
let authChangeCallback: (event: string, session: any) => void;

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn((cb: any) => {
          authChangeCallback = cb;
          return { data: { subscription: { unsubscribe: unsubscribeMock } } };
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  };
});

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("updates user on auth state change", () => {
    const { result } = renderHook(() => useAuth());

    const mockSession = {
      user: { id: "user-123", email: "test@example.com" },
      access_token: "token",
    };

    act(() => {
      authChangeCallback("SIGNED_IN", mockSession);
    });

    expect(result.current.user?.id).toBe("user-123");
    expect(result.current.session).toBe(mockSession);
    expect(result.current.loading).toBe(false);
  });

  it("clears user on sign out event", () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      authChangeCallback("SIGNED_IN", {
        user: { id: "user-123" },
        access_token: "token",
      });
    });
    expect(result.current.user).not.toBeNull();

    act(() => {
      authChangeCallback("SIGNED_OUT", null);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("signOut calls supabase.auth.signOut", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signOut();
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
