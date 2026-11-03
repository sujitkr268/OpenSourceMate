import {
  getSkillsToLearn,
  normalizeSkillName,
  extractSkillsMapping,
  defaultSkillsMapping,
  SkillsMapping,
} from "../utils/skillsToLearn";
import { SkillItem } from "../types/api";

describe("skillsToLearn utility", () => {
  describe("normalizeSkillName", () => {
    it("lowercases and trims string values", () => {
      expect(normalizeSkillName("  TypeScript  ")).toBe("typescript");
      expect(normalizeSkillName("React.js")).toBe("react.js");
      expect(normalizeSkillName("C++")).toBe("c++");
    });

    it("handles null, undefined, and non-string values safely", () => {
      expect(normalizeSkillName("")).toBe("");
      expect(normalizeSkillName(null as unknown as string)).toBe("");
      expect(normalizeSkillName(undefined as unknown as string)).toBe("");
      expect(normalizeSkillName(123 as unknown as string)).toBe("");
    });
  });

  describe("extractSkillsMapping", () => {
    it("extracts direct dictionary mapping and strips metadata keys", () => {
      const raw = {
        $schema: "./schema.json",
        title: "Test Mapping",
        description: "Test description",
        Python: ["Django", "FastAPI"],
        React: ["Next.js", "Redux"],
      };

      const extracted = extractSkillsMapping(raw);
      expect(extracted).toEqual({
        Python: ["Django", "FastAPI"],
        React: ["Next.js", "Redux"],
      });
      expect(extracted.$schema).toBeUndefined();
      expect(extracted.title).toBeUndefined();
      expect(extracted.description).toBeUndefined();
    });

    it("extracts nested mappings when structured with mappings key", () => {
      const raw = {
        mappings: {
          Go: ["Kubernetes", "Docker", "gRPC"],
        },
      };

      const extracted = extractSkillsMapping(raw);
      expect(extracted).toEqual({
        Go: ["Kubernetes", "Docker", "gRPC"],
      });
    });

    it("safely handles null, undefined, and primitive values", () => {
      expect(extractSkillsMapping(null)).toEqual({});
      expect(extractSkillsMapping(undefined)).toEqual({});
      expect(extractSkillsMapping("invalid")).toEqual({});
      expect(extractSkillsMapping(42)).toEqual({});
    });
  });

  describe("defaultSkillsMapping", () => {
    it("loads common technologies including Python, React, JavaScript, Go, etc.", () => {
      expect(defaultSkillsMapping.Python).toBeDefined();
      expect(defaultSkillsMapping.Python).toContain("Django");
      expect(defaultSkillsMapping.Python).toContain("FastAPI");

      expect(defaultSkillsMapping.React).toBeDefined();
      expect(defaultSkillsMapping.React).toContain("Next.js");

      expect(defaultSkillsMapping.TypeScript).toBeDefined();
      expect(defaultSkillsMapping.Go).toBeDefined();
      expect(defaultSkillsMapping.Rust).toBeDefined();
    });
  });

  describe("getSkillsToLearn", () => {
    const mockMapping: SkillsMapping = {
      Python: ["Django", "FastAPI", "Pandas", "PyTorch", "Celery", "Flask"],
      React: ["Next.js", "TypeScript", "Tailwind CSS", "Redux", "GraphQL"],
      TypeScript: ["Next.js", "Node.js", "NestJS", "Prisma"],
    };

    it("returns empty array for empty, null, or undefined skills without error", () => {
      expect(getSkillsToLearn(null, mockMapping)).toEqual([]);
      expect(getSkillsToLearn(undefined, mockMapping)).toEqual([]);
      expect(getSkillsToLearn([], mockMapping)).toEqual([]);
      expect(getSkillsToLearn([""], mockMapping)).toEqual([]);
      expect(getSkillsToLearn(["   "], mockMapping)).toEqual([]);
    });

    it("returns empty array for unknown skills without error", () => {
      expect(getSkillsToLearn(["Brainfuck", "COBOL_UNKNOWN"], mockMapping)).toEqual([]);
      expect(getSkillsToLearn([{ name: "NonExistentLanguage", repository_count: 1 } as SkillItem], mockMapping)).toEqual([]);
    });

    it("shows up to 5 suggestions by default from detected skills", () => {
      const suggestions = getSkillsToLearn(["Python"], mockMapping);

      expect(suggestions.length).toBe(5);
      expect(suggestions).toEqual([
        { name: "Django", recommendedFrom: "Python" },
        { name: "FastAPI", recommendedFrom: "Python" },
        { name: "Pandas", recommendedFrom: "Python" },
        { name: "PyTorch", recommendedFrom: "Python" },
        { name: "Celery", recommendedFrom: "Python" },
      ]);
    });

    it("respects a custom limit argument", () => {
      const suggestions = getSkillsToLearn(["Python"], mockMapping, 3);
      expect(suggestions.length).toBe(3);
      expect(suggestions.map((s) => s.name)).toEqual(["Django", "FastAPI", "Pandas"]);
    });

    it("excludes skills that the user already has (case-insensitive)", () => {
      // User already has Python, FastAPI, and pandas (lowercase)
      const suggestions = getSkillsToLearn(["Python", "fastapi", "PANDAS"], mockMapping);

      expect(suggestions.map((s) => s.name)).toEqual([
        "Django",
        "PyTorch",
        "Celery",
        "Flask",
      ]);
      expect(suggestions.some((s) => s.name.toLowerCase() === "fastapi")).toBe(false);
      expect(suggestions.some((s) => s.name.toLowerCase() === "pandas")).toBe(false);
    });

    it("works seamlessly with SkillItem objects", () => {
      const userSkills: SkillItem[] = [
        {
          name: "React",
          repository_count: 5,
          percentage: 45,
          proficiency: "Strong",
        },
      ];

      const suggestions = getSkillsToLearn(userSkills, mockMapping);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toEqual({
        name: "Next.js",
        recommendedFrom: "React",
      });
    });

    it("deduplicates suggestions across multiple detected skills", () => {
      // Both React and TypeScript suggest Next.js
      const suggestions = getSkillsToLearn(["React", "TypeScript"], mockMapping, 5);

      const nextJsOccurrences = suggestions.filter((s) => s.name === "Next.js");
      expect(nextJsOccurrences.length).toBe(1);
    });

    it("matches skill names case-insensitively against the mapping keys", () => {
      const suggestions = getSkillsToLearn(["python", "react"], mockMapping, 3);

      expect(suggestions.length).toBe(3);
      expect(suggestions[0]).toEqual({
        name: "Django",
        recommendedFrom: "Python",
      });
    });

    it("safely handles malformed mapping without crashing", () => {
      expect(getSkillsToLearn(["Python"], null as unknown as SkillsMapping)).toEqual([]);
      expect(getSkillsToLearn(["Python"], {} as SkillsMapping)).toEqual([]);
    });

    it("works with real static mapping data for common pairs (Python -> Django/FastAPI, React -> Next.js)", () => {
      const pythonSuggestions = getSkillsToLearn(["Python"]);
      expect(pythonSuggestions.length).toBeGreaterThan(0);
      expect(pythonSuggestions.length).toBeLessThanOrEqual(5);
      const names = pythonSuggestions.map((s) => s.name);
      expect(names.includes("Django") || names.includes("FastAPI")).toBe(true);

      const reactSuggestions = getSkillsToLearn(["React"]);
      expect(reactSuggestions.map((s) => s.name)).toContain("Next.js");
    });
  });
});
