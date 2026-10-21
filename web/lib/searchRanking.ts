/**
 * Generic Search Ranking Library
 * Configurable text search with multi-field ranking
 */

/**
 * Escape special regex characters in a string
 */
export function escapeForRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Core matchers for text comparison
 */
export const matchers = {
  exact: (field: string | undefined, search: string): boolean =>
    field?.toLowerCase() === search.toLowerCase(),

  startsWith: (field: string | undefined, search: string): boolean =>
    field?.toLowerCase().startsWith(search.toLowerCase()) ?? false,

  containsWord: (field: string | undefined, search: string): boolean =>
    new RegExp(`\\b${escapeForRegex(search)}\\b`, "i").test(field ?? ""),

  containsSubstring: (field: string | undefined, search: string): boolean =>
    field?.toLowerCase().includes(search.toLowerCase()) ?? false,
};

export type MatcherType = keyof typeof matchers;

/**
 * Field configuration for search ranking
 */
export interface SearchFieldConfig<T> {
  name: string;
  getter: (entity: T) => string | string[] | undefined;
  priority: 1 | 2 | 3; // 1 = highest priority
  matcherTypes: MatcherType[];
}

/**
 * Score points for different match types and priorities
 * Priority 1: 50, 40, 30, 20
 * Priority 2: 30, 24, 18, 12
 * Priority 3: 15, 12, 9, 6
 */
const SCORE_MATRIX: Record<1 | 2 | 3, Record<MatcherType, number>> = {
  1: { exact: 50, startsWith: 40, containsWord: 30, containsSubstring: 20 },
  2: { exact: 30, startsWith: 24, containsWord: 18, containsSubstring: 12 },
  3: { exact: 15, startsWith: 12, containsWord: 9, containsSubstring: 6 },
};

/**
 * Build scoring rules from field configurations
 */
interface ScoringRule<T> {
  fieldName: string;
  getter: (entity: T) => string | string[] | undefined;
  matcherType: MatcherType;
  score: number;
}

export function buildRules<T>(
  fieldConfigs: SearchFieldConfig<T>[]
): ScoringRule<T>[] {
  const rules: ScoringRule<T>[] = [];

  for (const config of fieldConfigs) {
    for (const matcherType of config.matcherTypes) {
      rules.push({
        fieldName: config.name,
        getter: config.getter,
        matcherType,
        score: SCORE_MATRIX[config.priority][matcherType],
      });
    }
  }

  // Sort by score descending so highest scores are checked first
  return rules.sort((a, b) => b.score - a.score);
}

/**
 * Score breakdown for debugging/transparency
 */
export interface ScoreBreakdown {
  fieldName: string;
  matcherType: MatcherType;
  score: number;
  matchedValue?: string;
}

/**
 * Rank a single entity against a search query
 * Returns the highest score found across all fields
 */
export function rankEntity<T>(
  entity: T,
  searchQuery: string,
  rules: ScoringRule<T>[]
): { score: number; breakdown: ScoreBreakdown[] } {
  if (!searchQuery.trim()) {
    return { score: 0, breakdown: [] };
  }

  const breakdown: ScoreBreakdown[] = [];
  const matchedFields = new Set<string>();

  for (const rule of rules) {
    // Skip if we already matched this field (we only want highest match per field)
    if (matchedFields.has(rule.fieldName)) {
      continue;
    }

    const value = rule.getter(entity);
    if (!value) continue;

    const matcher = matchers[rule.matcherType];

    // Handle arrays
    if (Array.isArray(value)) {
      for (const item of value) {
        if (matcher(item, searchQuery)) {
          breakdown.push({
            fieldName: rule.fieldName,
            matcherType: rule.matcherType,
            score: rule.score,
            matchedValue: item,
          });
          matchedFields.add(rule.fieldName);
          break;
        }
      }
    } else {
      if (matcher(value, searchQuery)) {
        breakdown.push({
          fieldName: rule.fieldName,
          matcherType: rule.matcherType,
          score: rule.score,
          matchedValue: value,
        });
        matchedFields.add(rule.fieldName);
      }
    }
  }

  // Total score is sum of all matched field scores
  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0);
  return { score: totalScore, breakdown };
}

/**
 * Search and rank an array of entities
 * Returns entities sorted by score (highest first), with optional minimum score filter
 */
export function searchAndRank<T>(
  entities: T[],
  searchQuery: string,
  rules: ScoringRule<T>[],
  minScore: number = 1
): Array<T & { _searchScore: number; _scoreBreakdown?: ScoreBreakdown[] }> {
  const results: Array<
    T & { _searchScore: number; _scoreBreakdown?: ScoreBreakdown[] }
  > = [];

  for (const entity of entities) {
    const { score, breakdown } = rankEntity(entity, searchQuery, rules);
    if (score >= minScore) {
      results.push({
        ...entity,
        _searchScore: score,
        _scoreBreakdown: breakdown,
      });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b._searchScore - a._searchScore);
}

/**
 * Check if an entity matches a search query (boolean check, no scoring)
 */
export function entityMatches<T>(
  entity: T,
  searchQuery: string,
  rules: ScoringRule<T>[]
): boolean {
  const { score } = rankEntity(entity, searchQuery, rules);
  return score > 0;
}
