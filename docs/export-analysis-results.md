# Export Analysis Results (JSON, CSV, Markdown)

## Overview
This feature provides developer profile analysis results export directly within the browser in three standard formats: **JSON**, **CSV**, and **Markdown**.

Users can download their complete technical profile, including detected skills, repository counts, followers, following, and metadata, without sending extra requests to the backend server.

---

## Supported Formats

### 1. JSON (`.json`)
- **MIME type**: `application/json;charset=utf-8`
- **Use case**: Programmatic processing, CLI scripts, integration with external developer tools.
- **Payload Schema**:
```json
{
  "app": "OpenSourceMate",
  "version": "0.1.0",
  "exportedAt": "2026-10-30T14:30:00.000Z",
  "username": "octocat",
  "name": "The Octocat",
  "bio": "GitHub mascot",
  "profileUrl": "https://github.com/octocat",
  "repositoriesCount": 8,
  "followers": 1500,
  "following": 9,
  "skills": [
    {
      "name": "TypeScript",
      "repository_count": 5,
      "percentage": 62.5
    }
  ],
  "totalRepositoriesAnalyzed": 8
}
```

---

### 2. CSV (`.csv`)
- **MIME type**: `text/csv;charset=utf-8`
- **Use case**: Spreadsheet tools (Microsoft Excel, Google Sheets, LibreOffice Calc, Pandas dataframes).
- **Compliance**: RFC 4180 compliant escaping. Fields with commas, quotes, or newlines are quoted, and quotes inside strings are escaped with double quotes (`""`).
- **Structure**:
  - Profile metadata section:
    ```csv
    Section,Field,Value
    Profile,Username,octocat
    Profile,Name,The Octocat
    Profile,Bio,"GitHub mascot"
    Profile,Profile URL,https://github.com/octocat
    Profile,Analysis Date,2026-10-30
    Activity,Public Repositories,8
    Activity,Followers,1500
    Activity,Following,9
    Activity,Repositories Analyzed,8
    ```
  - Skills breakdown table:
    ```csv
    Skill,Repository Count,Percentage
    TypeScript,5,62.5%
    ```

---

### 3. Markdown (`.md`)
- **MIME type**: `text/markdown;charset=utf-8`
- **Use case**: Embedding directly in GitHub profile `README.md`, documentation, or personal portfolio notes.
- **Includes**: Formatted headers, developer handle link, bulleted stats, and an aligned markdown table of technical competencies.

---

## Component Architecture

- **`frontend/utils/exportAnalysis.ts`**:
  - `escapeCsvField(value)`: RFC 4180 string escaping.
  - `generateCsvReport(data)`: Generates structured CSV string.
  - `generateJsonReport(data)`: Serializes formatted JSON string.
  - `generateMarkdownReport(data)`: Generates Markdown table and summary.
  - `getExportFilename(username, format)`: Standardizes filenames (`opensourcemate-{username}-{date}.{ext}`) with character sanitization.
  - `downloadFile(content, filename, mimeType)`: Triggers native browser download using `URL.createObjectURL(new Blob(...))` and programmatic anchor click.
- **`frontend/components/ExportMenu.tsx`**:
  - Accessible dropdown trigger button with download icon.
  - Keyboard navigation (`ArrowDown`, `ArrowUp`, `Home`, `End`, `Enter`, `Escape`).
  - Outside-click detection and focus restoration to the trigger button.
  - ARIA attributes: `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, `role="menuitem"`.

---

## Testing & Quality Assurance
- **Unit Tests**:
  - `frontend/__tests__/exportAnalysis.test.ts`: Exhaustive tests for RFC 4180 escaping, JSON parsing, Markdown output, date formatting, and DOM cleanup.
  - `frontend/__tests__/ExportMenu.test.tsx`: Interaction tests for menu opening, option selection, click outside, escape key handling, and accessibility roles.
