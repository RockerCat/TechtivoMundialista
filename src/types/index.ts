export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  username: string;
  avatarUrl?: string;
  points: number;
  rank: number;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  kickoffAt: string;
  stage: MatchStage;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
}

export interface Team {
  id: string;
  name: string;
  code: string; // e.g. "BRA", "ARG"
  flagEmoji: string;
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  points?: number;
  submittedAt: string;
}

export type MatchStage =
  | "group"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type MatchStatus = "upcoming" | "live" | "finished";

export type PredictionResult =
  | "exact"
  | "correct_winner"
  | "correct_draw"
  | "wrong"
  | "pending";
