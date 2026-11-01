import {
  computeSkillProficiency,
  getProficiencyTheme,
} from "../utils/proficiency";

describe("Proficiency Calculation Utility (Issue #131)", () => {
  const refDate = new Date("2026-10-31T12:00:00Z");

  it("calculates Learning level for single repository and low code share", () => {
    const result = computeSkillProficiency(1, 8.5, null, refDate);
    expect(result.level).toBe("Learning");
    expect(result.score).toBeGreaterThanOrEqual(3.0);
    expect(result.score).toBeLessThanOrEqual(4.5);
    expect(result.reason).toContain("Estimated as Learning");
    expect(result.reason).toContain("1 repository");
    expect(result.reason).toContain("8.5% code share");
    expect(result.reason).toContain("automated estimate");
  });

  it("calculates Comfortable level for multi-project usage with moderate recency", () => {
    // 3 repos (2 pts) + 28% code (2 pts) + active 4 months ago (2 pts) = 6 pts -> Comfortable
    const result = computeSkillProficiency(
      3,
      28.0,
      "2026-06-15T00:00:00Z",
      refDate
    );
    expect(result.level).toBe("Comfortable");
    expect(result.score).toBeGreaterThanOrEqual(5.0);
    expect(result.score).toBeLessThanOrEqual(7.5);
    expect(result.reason).toContain("Estimated as Comfortable");
    expect(result.reason).toContain("3 repositories");
    expect(result.reason).toContain("active within the past year");
  });

  it("calculates Strong level for high repository breadth, high share, and recent activity", () => {
    // 6 repos (3 pts) + 55% code (3 pts) + active 10 days ago (3 pts) = 9 pts -> Strong
    const result = computeSkillProficiency(
      6,
      55.0,
      "2026-10-21T00:00:00Z",
      refDate
    );
    expect(result.level).toBe("Strong");
    expect(result.score).toBeGreaterThanOrEqual(8.5);
    expect(result.reason).toContain("Estimated as Strong");
    expect(result.reason).toContain("6 repositories");
    expect(result.reason).toContain("active recently");
  });

  it("handles zero or negative inputs with safe fallback to Learning", () => {
    const zero = computeSkillProficiency(0, 0);
    expect(zero.level).toBe("Learning");
    expect(zero.reason).toContain("early stage exploration");
  });

  it("penalizes recency when last update was over a year ago", () => {
    // 5 repos (3 pts) + 50% code (3 pts) + last update 2 years ago (1 pt) = 7 pts -> Strong
    const result = computeSkillProficiency(
      5,
      50.0,
      "2024-01-01T00:00:00Z",
      refDate
    );
    expect(result.level).toBe("Strong");
    expect(result.reason).toContain("last updated");
  });

  it("returns appropriate theme styles for dark and light modes", () => {
    const darkStrong = getProficiencyTheme("Strong", "dark");
    expect(darkStrong.badgeText).toContain("text-emerald-300");

    const lightStrong = getProficiencyTheme("Strong", "light");
    expect(lightStrong.badgeText).toContain("text-emerald-800");

    const darkLearning = getProficiencyTheme("Learning", "dark");
    expect(darkLearning.badgeText).toContain("text-amber-300");

    const darkComfortable = getProficiencyTheme("Comfortable", "dark");
    expect(darkComfortable.badgeText).toContain("text-blue-300");
  });
});

