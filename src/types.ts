export type DismissalType = 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  playerIds: string[]; // exactly 2 player IDs
  matchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  runsScored: number;
  ballsFaced: number; // to calculate precise NRR
  runsConceded: number;
  ballsBowled: number; // to calculate precise NRR
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  matchesPlayed: number;
}

export interface BallEvent {
  id: string;
  type: 'legal' | 'wide' | 'noball' | 'bye' | 'legbye' | 'wicket';
  runs: number; // Runs scored from this delivery (by bat or extras)
  batsmanId: string;
  bowlerId: string;
  wicketDetail?: {
    type: DismissalType;
    dismissedBatsmanId: string;
    bowlerId?: string; // empty if run out and no bowler credit
    newBatsmanId: string;
  };
}

export interface Innings {
  battingAlliance: string[]; // [TeamId, TeamId]
  bowlingAlliance: string[]; // [TeamId, TeamId]
  runs: number;
  wicketsCount: number;
  ballsBowled: number; // number of legal balls bowled so far (wides/noballs don't increment this)
  maxBalls: number; // e.g., 48 for 8 overs, 60 for 10 overs
  batsmenStats: {
    [playerId: string]: {
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      out: boolean;
      dismissalType?: DismissalType;
      bowlerId?: string;
    };
  };
  bowlersStats: {
    [playerId: string]: {
      runsConceded: number;
      ballsBowled: number; // legal balls
      wickets: number;
    };
  };
  history: BallEvent[];
  currentBatsmanOnStrikeId: string;
  currentBatsmanOffStrikeId: string;
  currentBowlerId: string;
}

export type MatchFormat = 'League' | 'Qualifier 1' | 'Eliminator' | 'Qualifier 2' | 'Final';

export interface Match {
  id: string;
  type: MatchFormat;
  status: 'scheduled' | 'live' | 'completed';
  allianceA: string[]; // e.g. [teamDeltaId, teamAlphaId]
  allianceB: string[]; // e.g. [teamBravoId, teamCharlieId]
  oversMax: number; // 8 or 10
  date: string;
  firstInnings?: Innings;
  secondInnings?: Innings;
  currentInningsIndex: 1 | 2;
  winner?: 'Alliance A' | 'Alliance B';
  resultSummary?: string;
}

export interface AlliancePair {
  teams: string[]; // exactly 2 team IDs sorted alphabetically, e.g. ["team-1", "team-2"]
  count: number;
}

export interface LeagueState {
  teams: Team[];
  players: Player[];
  matches: Match[];
  alliancePairs: AlliancePair[];
}
