/**
 * Strongly-typed API interface definitions for OpenSourceMate.
 * Covers all endpoints exposed by the FastAPI backend server.
 */

export interface GitHubUserProfile {
  username: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  public_repositories: number;
  followers: number;
  following: number;
  profile_url: string;
  location?: string | null;
  company?: string | null;
  blog?: string | null;
  twitter_username?: string | null;
  created_at?: string;
  public_gists?: number;
}

export type ProficiencyLevel = "Learning" | "Comfortable" | "Strong";

export interface SkillItem {
  name: string;
  repository_count: number;
  percentage: number;
  type?: string | null;
  weight?: number | null;
  proficiency?: ProficiencyLevel;
  proficiency_score?: number;
  proficiency_reason?: string;
  group?: string | null;
}

export interface UserSkillsResponse {
  username: string;
  skills: SkillItem[];
  total_repositories_analyzed: number;
}

export interface IssueRecommendation {
  id: number;
  title: string;
  repository: string;
  url: string;
  state: string;
  labels: string[];
  comments: number;
  created_at: string;
  updated_at: string;
  language?: string;
  match_score?: number;
  score?: number;
  match_reasons?: string[];
  reasons?: string[];
  explanation?: string;
  is_ai_generated?: boolean;
}

export interface MatchedIssuesResponse {
  username: string;
  skills?: string[];
  recommendations: IssueRecommendation[];
  total?: number;
}

export interface RepositoryItem {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  is_fork: boolean;
  url: string;
  updated_at: string;
}

export interface UserRepositoriesResponse {
  username: string;
  repository_count: number;
  repositories: RepositoryItem[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp?: string;
}

export interface ApiErrorDetail {
  code?: string;
  message?: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error?: ApiErrorDetail;
  detail?: string;
  reset_at?: string | null;
  status_code?: number;
}

export interface CompleteAnalysisResult {
  profile: GitHubUserProfile;
  skills: UserSkillsResponse;
  issues?: MatchedIssuesResponse;
}
