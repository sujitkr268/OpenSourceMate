import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../app/error";

describe("ErrorBoundary Segment Component", () => {
  const mockReset = jest.fn();
  const mockError = Object.assign(new Error("Failed to load chunk 123"), {
    digest: "ERR_CHUNK_LOAD_123",
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders error heading and user-friendly explanation", () => {
    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText(/APPLICATION ERROR/i)).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred while processing this page/i)
    ).toBeInTheDocument();
  });

  it("calls reset function when Try Again button is clicked", () => {
    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    const retryBtn = screen.getByRole("button", { name: /Try Again/i });
    fireEvent.click(retryBtn);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("provides links to return to home and analyzer", () => {
    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    expect(screen.getByRole("link", { name: /Return to Home/i })).toHaveAttribute("href", "/");

    expect(screen.getByRole("link", { name: /Go to Analyzer/i })).toHaveAttribute(
      "href",
      "/#analyzer"
    );
  });

  it("allows toggling technical error details accordion", () => {
    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    const toggleBtn = screen.getByRole("button", {
      name: /Technical details/i,
    });
    expect(screen.queryByText("Failed to load chunk 123")).not.toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByText("Failed to load chunk 123")).toBeInTheDocument();
    expect(screen.getByText("ERR_CHUNK_LOAD_123")).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.queryByText("Failed to load chunk 123")).not.toBeInTheDocument();
  });
});
