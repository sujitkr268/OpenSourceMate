import rawSkillsData from "../data/skills_to_learn.json";
import { SkillItem } from "../types/api";

export interface SkillSuggestion {
  /** The suggested skill name to learn next */
  name: string;
  /** The detected user skill that prompted this suggestion */
  recommendedFrom: string;
}

export type SkillsMapping = Record<string, string[]>;

/**
 * Normalizes a skill name for case-insensitive and whitespace-trimmed comparison.
 */
export function normalizeSkillName(name: string): string {
  if (!name || typeof name !== "string") return "";
  return name.trim().toLowerCase();
}

/**
 * Safely extracts the mapping dictionary from the imported JSON data.
 * Supports both root dictionary format `{ "Python": [...] }` and wrapped format `{ mappings: { "Python": [...] } }`.
 */
export function extractSkillsMapping(data: unknown): SkillsMapping {
  if (!data || typeof data !== "object") {
    return {};
  }

  const obj = data as Record<string, unknown>;
  if (obj.mappings && typeof obj.mappings === "object" && !Array.isArray(obj.mappings)) {
    return obj.mappings as SkillsMapping;
  }

  // Filter out schema/metadata keys if top-level dictionary
  const result: SkillsMapping = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$") || key === "title" || key === "description" || key === "version") {
      continue;
    }
    if (Array.isArray(value)) {
      result[key] = value as string[];
    }
  }
  return result;
}

export const defaultSkillsMapping: SkillsMapping = extractSkillsMapping(rawSkillsData);

/**
 * Computes up to `limit` (default 5) skill suggestions based on the user's detected skills,
 * using a static mapping. Excludes any skills the user already has.
 *
 * Acceptance criteria:
 * - Mapping is easy to extend through a pull request.
 * - Empty or unknown skills show nothing (returns empty array) instead of an error.
 * - Returns at most `limit` (default 5) suggestions.
 * - Excludes skills the user already has (case-insensitive).
 *
 * @param userSkills Array of detected skills (either `SkillItem` objects or strings)
 * @param customMapping Optional custom mapping to override default static mapping
 * @param limit Maximum number of suggestions to return (defaults to 5)
 * @returns Array of unique `SkillSuggestion` objects up to `limit`
 */
export function getSkillsToLearn(
  userSkills?: (SkillItem | string)[] | null,
  customMapping?: SkillsMapping,
  limit = 5
): SkillSuggestion[] {
  // If user skills are empty or not an array, return empty list without error
  if (!userSkills || !Array.isArray(userSkills) || userSkills.length === 0) {
    return [];
  }

  const mapping = customMapping !== undefined ? customMapping : defaultSkillsMapping;
  if (!mapping || typeof mapping !== "object") {
    return [];
  }

  // Build a set of normalized existing user skill names for quick exclusion
  const existingSkillsSet = new Set<string>();
  const userSkillNames: string[] = [];

  for (const item of userSkills) {
    if (!item) continue;
    const name = typeof item === "string" ? item : item.name;
    if (typeof name === "string" && name.trim()) {
      const trimmed = name.trim();
      userSkillNames.push(trimmed);
      existingSkillsSet.add(normalizeSkillName(trimmed));
    }
  }

  if (userSkillNames.length === 0) {
    return [];
  }

  // Build a normalized lookup table for the mapping keys:
  // normalized key -> { canonicalKey, relatedSkills }
  const normalizedMapping = new Map<string, { canonical: string; related: string[] }>();
  for (const [key, related] of Object.entries(mapping)) {
    if (Array.isArray(related)) {
      normalizedMapping.set(normalizeSkillName(key), {
        canonical: key,
        related,
      });
    }
  }

  const suggestions: SkillSuggestion[] = [];
  const suggestedNamesSet = new Set<string>();

  for (const skillName of userSkillNames) {
    const entry = normalizedMapping.get(normalizeSkillName(skillName));
    if (!entry) {
      // Unknown skill in mapping: skip silently without throwing an error
      continue;
    }

    for (const related of entry.related) {
      if (typeof related !== "string" || !related.trim()) continue;
      const trimmedRelated = related.trim();
      const normalizedRelated = normalizeSkillName(trimmedRelated);

      // Exclude skills the user already has
      if (existingSkillsSet.has(normalizedRelated)) {
        continue;
      }

      // Exclude skills already suggested in this run (deduplication)
      if (suggestedNamesSet.has(normalizedRelated)) {
        continue;
      }

      suggestedNamesSet.add(normalizedRelated);
      suggestions.push({
        name: trimmedRelated,
        recommendedFrom: entry.canonical,
      });

      if (suggestions.length >= limit) {
        return suggestions;
      }
    }
  }

  return suggestions;
}
