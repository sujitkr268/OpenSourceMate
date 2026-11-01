import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ExportMenu from "../components/ExportMenu";

describe("ExportMenu component", () => {
  const onExportMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders export button in closed state initially", () => {
    render(<ExportMenu onExport={onExportMock} />);

    const button = screen.getByRole("button", {
      name: /export analysis results as json, csv or markdown/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens menu when button is clicked", () => {
    render(<ExportMenu onExport={onExportMock} />);

    const button = screen.getByRole("button", {
      name: /export analysis results as json, csv or markdown/i,
    });
    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: /export formats/i });
    expect(menu).toBeInTheDocument();

    expect(screen.getByText("JSON Export")).toBeInTheDocument();
    expect(screen.getByText("CSV Spreadsheet")).toBeInTheDocument();
    expect(screen.getByText("Markdown Report")).toBeInTheDocument();
  });

  it("calls onExport with 'json' when JSON option is clicked and closes menu", () => {
    render(<ExportMenu onExport={onExportMock} />);

    const button = screen.getByRole("button", {
      name: /export analysis results as json, csv or markdown/i,
    });
    fireEvent.click(button);

    const jsonOption = screen.getByRole("menuitem", {
      name: /json export \.json/i,
    });
    fireEvent.click(jsonOption);

    expect(onExportMock).toHaveBeenCalledWith("json");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onExport with 'csv' when CSV option is clicked and closes menu", () => {
    render(<ExportMenu onExport={onExportMock} />);

    const button = screen.getByRole("button", {
      name: /export analysis results as json, csv or markdown/i,
    });
    fireEvent.click(button);

    const csvOption = screen.getByRole("menuitem", {
      name: /csv spreadsheet \.csv/i,
    });
    fireEvent.click(csvOption);

    expect(onExportMock).toHaveBeenCalledWith("csv");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onExport with 'markdown' when Markdown option is clicked and closes menu", () => {
    render(<ExportMenu onExport={onExportMock} />);

    const button = screen.getByRole("button", {
      name: /export analysis results as json, csv or markdown/i,
    });
    fireEvent.click(button);

    const mdOption = screen.getByRole("menuitem", {
      name: /markdown report \.md/i,
    });
    fireEvent.click(mdOption);

    expect(onExportMock).toHaveBeenCalledWith("markdown");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside", () => {
    render(
      <div>
        <div data-testid="outside-element">Outside</div>
        <ExportMenu onExport={onExportMock} />
      </div>
    );

    const button = screen.getByRole("button", {
      name: /export analysis results as json, csv or markdown/i,
    });
    fireEvent.click(button);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside-element"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes menu when Escape key is pressed", () => {
    render(<ExportMenu onExport={onExportMock} />);

    const button = screen.getByRole("button", {
      name: /export analysis results as json, csv or markdown/i,
    });
    fireEvent.click(button);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation with arrow keys and Enter", () => {
    render(<ExportMenu onExport={onExportMock} />);

    const button = screen.getByRole("button", {
      name: /export analysis results as json, csv or markdown/i,
    });

    // Open via ArrowDown
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Navigate to CSV (index 1)
    fireEvent.keyDown(button, { key: "ArrowDown" });

    // Select with Enter
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onExportMock).toHaveBeenCalledWith("csv");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("does not open menu when disabled is true", () => {
    render(<ExportMenu onExport={onExportMock} disabled={true} />);

    const button = screen.getByRole("button", {
      name: /export analysis results as json, csv or markdown/i,
    });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
