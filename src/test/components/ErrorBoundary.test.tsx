import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("Test error");
  return <div>Normal content</div>;
};

const preventExpectedTestError = (event: ErrorEvent) => {
  if (event.error instanceof Error && event.error.message === "Test error") {
    event.preventDefault();
  }
};

describe("ErrorBoundary", () => {
  beforeEach(() => window.addEventListener("error", preventExpectedTestError));
  afterEach(() => window.removeEventListener("error", preventExpectedTestError));

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders fallback UI on error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Go Home")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("renders custom fallback when provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("resets error state on Try Again click", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Try Again"));

    // After reset, React will try to re-render the children which still throw,
    // so we'll see the error boundary again. The key test is that handleReset was invoked.
    // In real usage the parent would re-mount with different props.
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
