import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SkillProficiencyBadge from "../components/SkillProficiencyBadge";

describe("SkillProficiencyBadge Component (Issue #131)", () => {
  it("renders the badge label for a pre-computed level", () => {
    render(
      <SkillProficiencyBadge
        level="Strong"
        score={9.2}
        reason="Estimated as Strong: featured in 6 repositories."
      />
    );

    const button = screen.getByRole("button", { name: /Proficiency estimate: Strong/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("shows tooltip on mouse enter and hides on mouse leave", () => {
    render(
      <SkillProficiencyBadge
        level="Comfortable"
        score={6.5}
        reason="Estimated as Comfortable: 3 repositories with steady activity."
      />
    );

    const button = screen.getByRole("button");

    // Initially tooltip is not visible
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Hover reveals tooltip
    fireEvent.mouseEnter(button);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(screen.getByText(/Score: 6.5\/10/i)).toBeInTheDocument();
    expect(screen.getByText(/3 repositories with steady activity/i)).toBeInTheDocument();
    expect(screen.getByText(/Calculated from repository breadth/i)).toBeInTheDocument();

    // Mouse leave dismisses tooltip
    fireEvent.mouseLeave(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows tooltip on focus and hides on blur for keyboard accessibility", () => {
    render(
      <SkillProficiencyBadge
        level="Learning"
        score={3.8}
        reason="Estimated as Learning: early stage project."
      />
    );

    const button = screen.getByRole("button");
    fireEvent.focus(button);

    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("computes fallback estimate if level is omitted", () => {
    render(
      <SkillProficiencyBadge
        repositoryCount={5}
        percentage={50}
        latestUpdatedAt="2026-10-15T00:00:00Z"
      />
    );

    // 5 repos + 50% + recent update yields Strong
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("applies theme styles correctly", () => {
    const { container: darkContainer } = render(
      <SkillProficiencyBadge level="Strong" theme="dark" />
    );
    expect(darkContainer.querySelector("button")?.className).toContain("text-emerald-300");

    const { container: lightContainer } = render(
      <SkillProficiencyBadge level="Strong" theme="light" />
    );
    expect(lightContainer.querySelector("button")?.className).toContain("text-emerald-800");
  });
});

