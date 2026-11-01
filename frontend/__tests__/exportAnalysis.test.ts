import {
  escapeCsvField,
  generateCsvReport,
  generateJsonReport,
  generateMarkdownReport,
  getExportFilename,
  getExportMimeType,
  exportAnalysisData,
  downloadFile,
  type ExportPayload,
} from "../utils/exportAnalysis";

describe("exportAnalysis utils", () => {
  const samplePayload: ExportPayload = {
    username: "octocat",
    name: "The Octocat",
    bio: "GitHub mascot and developer advocate",
    profileUrl: "https://github.com/octocat",
    repositoriesCount: 12,
    followers: 4000,
    following: 15,
    totalRepositoriesAnalyzed: 10,
    exportedAt: "2026-10-30",
    skills: [
      { name: "TypeScript", repository_count: 6, percentage: 60 },
      { name: "Python", repository_count: 4, percentage: 40 },
    ],
  };

  describe("escapeCsvField", () => {
    it("returns empty string for null and undefined", () => {
      expect(escapeCsvField(null)).toBe("");
      expect(escapeCsvField(undefined)).toBe("");
    });

    it("returns plain string unchanged when no delimiter or quotes exist", () => {
      expect(escapeCsvField("simpleText")).toBe("simpleText");
      expect(escapeCsvField(123)).toBe("123");
    });

    it("escapes fields containing commas by wrapping in quotes", () => {
      expect(escapeCsvField("San Francisco, CA")).toBe('"San Francisco, CA"');
    });

    it("escapes fields containing double quotes according to RFC 4180", () => {
      expect(escapeCsvField('Said "Hello" to world')).toBe(
        '"Said ""Hello"" to world"'
      );
    });

    it("escapes fields containing newlines by wrapping in quotes", () => {
      expect(escapeCsvField("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvField("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    });
  });

  describe("generateCsvReport", () => {
    it("generates valid RFC 4180 CSV containing profile metadata and skills", () => {
      const csv = generateCsvReport(samplePayload);
      expect(csv).toContain("Section,Field,Value");
      expect(csv).toContain("Profile,Username,octocat");
      expect(csv).toContain("Profile,Name,The Octocat");
      expect(csv).toContain("Profile,Bio,GitHub mascot and developer advocate");
      expect(csv).toContain("Profile,Profile URL,https://github.com/octocat");
      expect(csv).toContain("Profile,Analysis Date,2026-10-30");
      expect(csv).toContain("Activity,Public Repositories,12");
      expect(csv).toContain("Activity,Followers,4000");
      expect(csv).toContain("Activity,Repositories Analyzed,10");
      expect(csv).toContain("Skill,Repository Count,Percentage");
      expect(csv).toContain("TypeScript,6,60%");
      expect(csv).toContain("Python,4,40%");
    });

    it("handles quotes and commas in bio correctly in CSV output", () => {
      const trickyPayload: ExportPayload = {
        ...samplePayload,
        bio: 'Developer, hacker, and "open-source" enthusiast',
      };
      const csv = generateCsvReport(trickyPayload);
      expect(csv).toContain(
        'Profile,Bio,"Developer, hacker, and ""open-source"" enthusiast"'
      );
    });

    it("renders fallback row when skills array is empty", () => {
      const emptyPayload: ExportPayload = {
        ...samplePayload,
        skills: [],
      };
      const csv = generateCsvReport(emptyPayload);
      expect(csv).toContain("No technical skills detected,0,0%");
    });

    it("falls back to default profile URL and empty strings for missing optional fields", () => {
      const sparsePayload: ExportPayload = {
        username: "minimalist",
        skills: [],
      };
      const csv = generateCsvReport(sparsePayload);
      expect(csv).toContain("Profile,Username,minimalist");
      expect(csv).toContain("Profile,Profile URL,https://github.com/minimalist");
      expect(csv).toContain("Activity,Public Repositories,0");
    });
  });

  describe("generateJsonReport", () => {
    it("generates valid indented JSON with expected properties", () => {
      const jsonStr = generateJsonReport(samplePayload);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.app).toBe("OpenSourceMate");
      expect(parsed.version).toBe("0.1.0");
      expect(parsed.username).toBe("octocat");
      expect(parsed.name).toBe("The Octocat");
      expect(parsed.repositoriesCount).toBe(12);
      expect(parsed.skills).toHaveLength(2);
      expect(parsed.skills[0].name).toBe("TypeScript");
    });

    it("uses existing exportedAt or generates timestamp", () => {
      const payloadWithoutDate: ExportPayload = {
        username: "user1",
        skills: [],
      };
      const jsonStr = generateJsonReport(payloadWithoutDate);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.exportedAt).toBeDefined();
    });
  });

  describe("generateMarkdownReport", () => {
    it("generates formatted Markdown with user link, activity and skills table", () => {
      const md = generateMarkdownReport(samplePayload);

      expect(md).toContain("# OpenSourceMate Developer Profile Analysis");
      expect(md).toContain("[The Octocat (@octocat)](https://github.com/octocat)");
      expect(md).toContain("**Export Date**: 2026-10-30");
      expect(md).toContain("**Bio**: GitHub mascot and developer advocate");
      expect(md).toContain("- **Public Repositories**: 12");
      expect(md).toContain("| TypeScript | 6 | 60% |");
      expect(md).toContain("| Python | 4 | 40% |");
    });

    it("displays username fallback when name is missing", () => {
      const noNamePayload: ExportPayload = {
        ...samplePayload,
        name: null,
      };
      const md = generateMarkdownReport(noNamePayload);
      expect(md).toContain("[@octocat](https://github.com/octocat)");
    });

    it("shows fallback row when no skills are detected", () => {
      const noSkillsPayload: ExportPayload = {
        ...samplePayload,
        skills: [],
      };
      const md = generateMarkdownReport(noSkillsPayload);
      expect(md).toContain("| No technical skills detected | - | - |");
    });
  });

  describe("getExportFilename", () => {
    it("generates formatted filenames with sanitized usernames", () => {
      const today = new Date().toISOString().split("T")[0];

      expect(getExportFilename("octocat", "json")).toBe(
        `opensourcemate-octocat-${today}.json`
      );
      expect(getExportFilename("octocat", "csv")).toBe(
        `opensourcemate-octocat-${today}.csv`
      );
      expect(getExportFilename("octocat", "markdown")).toBe(
        `opensourcemate-octocat-${today}.md`
      );
    });

    it("sanitizes special characters in usernames", () => {
      const today = new Date().toISOString().split("T")[0];
      expect(getExportFilename("Dangerous/User*Name!", "json")).toBe(
        `opensourcemate-dangeroususername-${today}.json`
      );
      expect(getExportFilename("   ", "csv")).toBe(
        `opensourcemate-profile-${today}.csv`
      );
    });
  });

  describe("getExportMimeType", () => {
    it("returns correct MIME types for supported formats", () => {
      expect(getExportMimeType("json")).toBe("application/json;charset=utf-8");
      expect(getExportMimeType("csv")).toBe("text/csv;charset=utf-8");
      expect(getExportMimeType("markdown")).toBe("text/markdown;charset=utf-8");
    });
  });

  describe("downloadFile and exportAnalysisData", () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = jest.fn(() => "mock-blob-url");
      URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      jest.restoreAllMocks();
    });

    it("creates a download link, clicks it, and cleans up DOM and object URL", () => {
      const appendChildSpy = jest.spyOn(document.body, "appendChild");
      const removeChildSpy = jest.spyOn(document.body, "removeChild");

      downloadFile("hello world", "test.txt", "text/plain");

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalledTimes(1);
      expect(removeChildSpy).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("mock-blob-url");
    });

    it("exportAnalysisData coordinates generation and download for all formats", () => {
      const appendChildSpy = jest.spyOn(document.body, "appendChild");
      const removeChildSpy = jest.spyOn(document.body, "removeChild");

      exportAnalysisData(samplePayload, "json");
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

      exportAnalysisData(samplePayload, "csv");
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);

      exportAnalysisData(samplePayload, "markdown");
      expect(URL.createObjectURL).toHaveBeenCalledTimes(3);

      expect(appendChildSpy).toHaveBeenCalledTimes(3);
      expect(removeChildSpy).toHaveBeenCalledTimes(3);
    });
  });
});
