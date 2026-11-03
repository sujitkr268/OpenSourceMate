# Username Form Validation & Error Resolution Specification

**Issue Reference:** #29
**Components:**

- `frontend/utils/validation.ts`
- `frontend/__tests__/validation.test.ts`
- `frontend/app/page.tsx`

---

## 1. Overview & Objectives

Clear, immediate, and actionable feedback is critical to ensure developers understand why an input failed or why a profile could not be loaded.

This specification establishes:

1. Strict adherence to official GitHub username rules before initiating any network requests.
2. Sanitization logic that strips leading `@` symbols and removes surrounding whitespace.
3. Distinct, readable, and non-technical error messages for every failure category.
4. UI state handling ensuring the action button is disabled while an analysis request is pending.

---

## 2. GitHub Username Validation Rules

According to GitHub account creation guidelines, valid usernames must satisfy:

- **Alphanumeric Characters:** Only English letters (`a-z`, `A-Z`) and digits (`0-9`).
- **Hyphens:** Single internal hyphens allowed (`-`).
- **No Leading Hyphens:** Must not start with a hyphen (`-username` is invalid).
- **No Trailing Hyphens:** Must not end with a hyphen (`username-` is invalid).
- **No Consecutive Hyphens:** Multiple sequential hyphens are forbidden (`user--name` is invalid).
- **Length Constraint:** Minimum 1 character, maximum 39 characters.
- **No Special Symbols:** Underscores (`_`), periods (`.`), spaces, or symbols (`@`, `$`, `#`, `!`) are disallowed in username strings.

---

## 3. Sanitization Pipeline

```typescript
export function sanitizeUsername(rawInput: string): string {
  if (!rawInput) return "";
  return rawInput.trim().replace(/^@+/, "");
}
```

- Trailing and leading whitespace is stripped.
- Any leading `@` characters (common when users paste handles from social media or GitHub profiles) are automatically removed.

---

## 4. Error Categorization & Resolution Matrix

| Scenario / Code           | Trigger Condition            | Displayed Error Message                                                                                      |
| :------------------------ | :--------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **`EMPTY`**               | Blank input or spaces only   | `"Please enter a GitHub username."`                                                                          |
| **`TOO_LONG`**            | Length > 39 characters       | `"GitHub username is too long ({N} characters). Maximum allowed is 39 characters."`                          |
| **`STARTS_WITH_HYPHEN`**  | Starts with `-`              | `"GitHub username cannot begin with a hyphen ('-')."`                                                        |
| **`ENDS_WITH_HYPHEN`**    | Ends with `-`                | `"GitHub username cannot end with a hyphen ('-')."`                                                          |
| **`CONSECUTIVE_HYPHENS`** | Contains `--`                | `"GitHub username cannot contain multiple consecutive hyphens ('--')."`                                      |
| **`INVALID_CHARACTERS`**  | Contains `_`, `.`, symbols   | `"GitHub username can only contain alphanumeric characters (letters and numbers) and single hyphens."`       |
| **HTTP 404**              | User does not exist          | `"GitHub user '{username}' could not be found. Please check the spelling and try again."`                    |
| **HTTP 429**              | Rate limit reached           | `"GitHub API rate limit reached. Please try again at {time}."` (or `"in a few minutes."`)                    |
| **HTTP 502 / 503**        | Upstream unavailable         | `"GitHub API is temporarily unavailable. Please try again in a few moments."`                                |
| **HTTP 500**              | Server internal error        | `"An internal server error occurred while analyzing the profile. Please try again."`                         |
| **TypeError**             | Network disconnect / offline | `"Unable to connect to the server. Please check your network connection and ensure the backend is running."` |

---

## 5. UI Accessibility & State Handling

1. **Button Disabled State:**
   - While a request is in flight (`loading === true`), the Analyze button is disabled (`disabled={loading}`) with `aria-busy="true"`.
   - Cursor switches to `disabled:cursor-not-allowed` with reduced opacity (`disabled:opacity-50`).
2. **Error Live Region:**
   - Error messages are rendered within a container marked with `role="alert"` and `aria-live="assertive"` so screen reader software immediately announces failures.
3. **Retry Action:**
   - On network or transient server errors, a "Retry" button appears alongside the error alert, allowing the user to re-attempt the previous query without re-typing.
