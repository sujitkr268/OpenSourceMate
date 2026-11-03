import React from "react";
import { render, screen } from "@testing-library/react";
import SkillsToLearn from "../components/SkillsToLearn";
import { SkillItem } from "../types/api";

describe("SkillsToLearn Component", () => {
  const mockCustomMapping = {
    Python: ["Django", "FastAPI", "Pandas", "PyTorch", "Celery", "Flask"],
    React: ["Next.js", "Tailwind CSS", "Redux"],
  };

  it("renders nothing (null) when skills array is empty", () => {
    const { container } = render(<SkillsToLearn skills={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing (null) when skills is null or undefined", () => {
    const { container: c1 } = render(<SkillsToLearn skills={null} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<SkillsToLearn skills={undefined} />);
    expect(c2.firstChild).toBeNull();
  });

  it("renders nothing (null) when skills are completely unknown", () => {
    const { container } = render(
      <SkillsToLearn
        skills={["UnknownLanguage123", "FictionalTech"]}
        customMapping={mockCustomMapping}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing (null) when user already has all suggested skills", () => {
    const { container } = render(
      <SkillsToLearn
        skills={["React", "Next.js", "Tailwind CSS", "Redux"]}
        customMapping={mockCustomMapping}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders section header and suggestion cards when skills are present", () => {
    render(
      <SkillsToLearn
        skills={["Python"]}
        customMapping={mockCustomMapping}
      />
    );

    expect(screen.getByRole("region", { name: /Skills to learn next/i })).toBeInTheDocument();
    expect(screen.getByText("Skills to learn next")).toBeInTheDocument();
    expect(screen.getByText(/LEARNING PATHS/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Recommended companion technologies to broaden your open-source opportunities/i)
    ).toBeInTheDocument();

    // Verify suggestions
    expect(screen.getByText("Django")).toBeInTheDocument();
    expect(screen.getByText("FastAPI")).toBeInTheDocument();
    expect(screen.getByText("Pandas")).toBeInTheDocument();
    expect(screen.getByText("PyTorch")).toBeInTheDocument();
    expect(screen.getByText("Celery")).toBeInTheDocument();
    // 6th suggestion "Flask" should not be rendered due to default limit of 5
    expect(screen.queryByText("Flask")).not.toBeInTheDocument();
  });

  it("shows the detected skill context 'Pairs with Python'", () => {
    render(
      <SkillsToLearn
        skills={["Python"]}
        customMapping={mockCustomMapping}
      />
    );

    const pairsWithTags = screen.getAllByText(/Pairs with/i);
    expect(pairsWithTags.length).toBe(5);
    expect(screen.getAllByText("Python").length).toBeGreaterThanOrEqual(1);
  });

  it("shows count badge matching number of suggestions", () => {
    render(
      <SkillsToLearn
        skills={["Python"]}
        customMapping={mockCustomMapping}
        maxSuggestions={3}
      />
    );

    expect(screen.getByText("3 suggestions")).toBeInTheDocument();
  });

  it("handles SkillItem objects passed from API response", () => {
    const userSkills: SkillItem[] = [
      {
        name: "React",
        repository_count: 4,
        percentage: 60,
        proficiency: "Strong",
      },
    ];

    render(
      <SkillsToLearn
        skills={userSkills}
        customMapping={mockCustomMapping}
      />
    );

    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("Tailwind CSS")).toBeInTheDocument();
    expect(screen.getByText("Redux")).toBeInTheDocument();
  });

  it("renders properly in light theme without errors", () => {
    const { container } = render(
      <SkillsToLearn
        skills={["React"]}
        theme="light"
        customMapping={mockCustomMapping}
      />
    );

    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
    expect(section?.className).toContain("bg-purple-50/40");
  });

  it("renders properly in dark theme without errors", () => {
    const { container } = render(
      <SkillsToLearn
        skills={["React"]}
        theme="dark"
        customMapping={mockCustomMapping}
      />
    );

    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
    expect(section?.className).toContain("bg-white/[0.025]");
  });
});
