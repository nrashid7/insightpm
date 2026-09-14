import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
const config = vi.hoisted(() => ({ billing: true, google: true, github: true }));
vi.mock("@/lib/product-config", () => ({ get BILLING_ENABLED() { return config.billing; } }));
vi.mock("@/hooks/useCapabilities", () => ({ useCapabilities: () => ({ capabilities: { auth: { google: config.google, github: config.github } } }) }));
let mockSearchParams = new URLSearchParams();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

vi.mock("@/lib/api/billing", () => ({
  createCheckoutSession: vi.fn(),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isActive: false,
    loading: false,
    plan: null,
    refresh: vi.fn(),
  }),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const unsubscribeMock = vi.fn();
let authChangeCallback: (event: string, session: unknown) => void;

function createChainProxy(): Record<string, unknown> {
  const result = { data: null, error: null, count: 0 };
  const chainable: Record<string, unknown> = {};
  const method = () => vi.fn().mockReturnValue(chainable);
  chainable.select = method();
  chainable.eq = method();
  chainable.order = method();
  chainable.limit = vi.fn().mockResolvedValue(result);
  chainable.single = vi.fn().mockResolvedValue(result);
  chainable.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chainable;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback: typeof authChangeCallback) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: unsubscribeMock } } };
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
    from: () => createChainProxy(),
  },
}));

import Auth from "@/pages/Auth";
import { supabase } from "@/integrations/supabase/client";
import { createCheckoutSession } from "@/lib/api/billing";

function renderAuth() {
  return render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  );
}

describe("Auth page", () => {
  it("hides disabled OAuth providers", () => {
    config.google = false; config.github = false;
    renderAuth();
    expect(screen.queryByText('Google')).not.toBeInTheDocument();
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
  });

  it("ignores checkout parameters during the non-billing beta", async () => {
    config.billing = false;
    mockSearchParams = new URLSearchParams('plan=growth');
    renderAuth();
    await act(async () => { authChangeCallback('SIGNED_IN', { user: { id: 'beta-user' } }); });
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/analyze');
  });
  beforeEach(() => {
    config.billing = true; config.google = true; config.github = true;
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
  });

  it("renders login form by default", () => {
    renderAuth();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText("Log In")).toBeInTheDocument();
  });

  it("switches to signup view", () => {
    renderAuth();
    fireEvent.click(screen.getByText("Sign up"));
    expect(screen.getByText("Get started")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("switches to forgot-password view", () => {
    renderAuth();
    fireEvent.click(screen.getByText("Forgot password?"));
    expect(screen.getByText("Reset password")).toBeInTheDocument();
    expect(screen.getByText("Send Reset Link")).toBeInTheDocument();
  });

  it("calls signInWithPassword on login submit", async () => {
    renderAuth();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Log In"));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("calls signUp on signup submit", async () => {
    renderAuth();
    fireEvent.click(screen.getByText("Sign up"));

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Create Account"));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "jane@example.com",
          password: "password123",
        })
      );
    });
  });

  it("shows error toast on login failure", async () => {
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: { message: "Invalid credentials" },
    });

    renderAuth();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByText("Log In"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Login failed", variant: "destructive" })
      );
    });
  });

  it("subscribes to auth state changes on mount", () => {
    renderAuth();
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });

  it("does not redirect a password recovery session", async () => {
    renderAuth();
    const recoverySession = { user: { id: "user-1" }, access_token: "recovery-token" };
    await act(async () => {
      authChangeCallback("PASSWORD_RECOVERY", recoverySession);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText("Set new password")).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("completes recovery without requiring an email and leaves recovery mode", async () => {
    renderAuth();
    await act(async () => authChangeCallback("PASSWORD_RECOVERY", { user: { id: "user-1" } }));
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "NewPassword123" } });
    fireEvent.submit(screen.getByLabelText(/new password/i).closest("form")!);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/analyze"));
  });

  it("waits for the recovery event when an initial recovery session arrives first", async () => {
    renderAuth();
    const recoverySession = { user: { id: "user-1" }, access_token: "recovery-token" };

    await act(async () => {
      authChangeCallback("INITIAL_SESSION", recoverySession);
      authChangeCallback("PASSWORD_RECOVERY", recoverySession);
    });

    expect(screen.getByText("Set new password")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("starts plan checkout only once when session sources race", async () => {
    mockSearchParams = new URLSearchParams("plan=growth");
    (createCheckoutSession as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("test"));
    const session = { user: { id: "user-1" }, access_token: "token" };

    renderAuth();
    authChangeCallback("SIGNED_IN", session);
    authChangeCallback("SIGNED_IN", session);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it("renders OAuth buttons for Google and GitHub", () => {
    renderAuth();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("calls signInWithOAuth for Google", async () => {
    renderAuth();
    fireEvent.click(screen.getByText("Google"));
    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" })
      );
    });
  });
});
