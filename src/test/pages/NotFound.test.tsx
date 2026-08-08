import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "@/pages/NotFound";

describe("NotFound page", () => {
  it("offers a route back to the landing page", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to InsightPM" })).toHaveAttribute("href", "/");
  });
});
