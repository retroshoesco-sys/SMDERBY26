import { Team, Player, Match, AlliancePair, LeagueState } from '../types';

export const INITIAL_TEAMS: Team[] = [];

export const INITIAL_PLAYERS: Player[] = [];

export const INITIAL_ALLIANCE_PAIRS: AlliancePair[] = [];

export const INITIAL_MATCHES: Match[] = [];

export const DEFAULT_LEAGUE_STATE: LeagueState = {
  teams: INITIAL_TEAMS,
  players: INITIAL_PLAYERS,
  alliancePairs: INITIAL_ALLIANCE_PAIRS,
  matches: INITIAL_MATCHES
};
