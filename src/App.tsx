import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, Calendar, Award, HardHat, FileDown, FileUp, 
  Trash2, RefreshCw, Star, Info, Moon, Sun, ShieldCheck, Zap 
} from 'lucide-react';

import { Team, Player, Match, AlliancePair, LeagueState, MatchFormat } from './types';
import { DEFAULT_LEAGUE_STATE } from './data/mockData';

// Subcomponents
import LeagueTable from './components/LeagueTable';
import MatchFixtures from './components/MatchFixtures';
import ManageTeams from './components/ManageTeams';
import ScorecardView from './components/ScorecardView';

export default function App() {
  // Navigation
  type Tab = 'Standings' | 'Matches' | 'Admin' | 'About';
  const [activeTab, setActiveTab] = useState<Tab>('Standings');

  // Core State
  const [state, setState] = useState<LeagueState>(() => {
    try {
      const saved = localStorage.getItem('summer_derby_2026_state_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.teams && parsed.players && parsed.matches) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading local state:', e);
    }
    return DEFAULT_LEAGUE_STATE;
  });

  // Selected Match for ball-by-ball scoring page
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);

  // Save changes to localStorage on any state change
  const saveState = (newState: LeagueState) => {
    setState(newState);
    localStorage.setItem('summer_derby_2026_state_v3', JSON.stringify(newState));
  };

  // 1. ADD NEW TEAM ADMIN
  const handleAddTeam = (name: string, shortName: string, player1Name: string, player2Name: string) => {
    const teamId = `team-${Date.now()}`;
    const p1Id = `player-p1-${Date.now()}`;
    const p2Id = `player-p2-${Date.now() + 1}`;

    const newP1: Player = {
      id: p1Id,
      name: player1Name,
      teamId: teamId,
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      wickets: 0,
      ballsBowled: 0,
      runsConceded: 0,
      matchesPlayed: 0
    };

    const newP2: Player = {
      id: p2Id,
      name: player2Name,
      teamId: teamId,
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      wickets: 0,
      ballsBowled: 0,
      runsConceded: 0,
      matchesPlayed: 0
    };

    const newTeam: Team = {
      id: teamId,
      name,
      shortName,
      playerIds: [p1Id, p2Id],
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      points: 0,
      runsScored: 0,
      ballsFaced: 0,
      runsConceded: 0,
      ballsBowled: 0
    };

    const newState = {
      ...state,
      teams: [...state.teams, newTeam],
      players: [...state.players, newP1, newP2]
    };
    saveState(newState);
    alert(`Successfully registered ${name} with players ${player1Name} & ${player2Name}!`);
  };

  // 2. EDIT TEAM ADMIN
  const handleEditTeam = (teamId: string, name: string, shortName: string, player1Name: string, player2Name: string) => {
    const teamPlayers = state.players.filter(p => p.teamId === teamId);
    
    // Fallbacks if existing ids are missing
    const p1Id = teamPlayers[0]?.id || `player-p1-${Date.now()}`;
    const p2Id = teamPlayers[1]?.id || `player-p2-${Date.now() + 1}`;

    const updatedPlayers = state.players.map(p => {
      if (p.id === p1Id) return { ...p, name: player1Name };
      if (p.id === p2Id) return { ...p, name: player2Name };
      return p;
    });

    // Handle adding placeholder players in case they didn't exist 
    const p1Exists = state.players.some(p => p.id === p1Id);
    if (!p1Exists) {
      updatedPlayers.push({
        id: p1Id, name: player1Name, teamId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, wickets: 0, ballsBowled: 0, runsConceded: 0, matchesPlayed: 0
      });
    }
    const p2Exists = state.players.some(p => p.id === p2Id);
    if (!p2Exists) {
      updatedPlayers.push({
        id: p2Id, name: player2Name, teamId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, wickets: 0, ballsBowled: 0, runsConceded: 0, matchesPlayed: 0
      });
    }

    const updatedTeams = state.teams.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          name,
          shortName,
          playerIds: [p1Id, p2Id]
        };
      }
      return t;
    });

    const newState = {
      ...state,
      teams: updatedTeams,
      players: updatedPlayers
    };
    saveState(newState);
    alert(`Information for ${name} has been updated in the database!`);
  };

  // 3. DELETE TEAM ADMIN
  const handleDeleteTeam = (teamId: string) => {
    const nextTeams = state.teams.filter(t => t.id !== teamId);
    const nextPlayers = state.players.filter(p => p.teamId !== teamId);
    // Delete any matches played by this team
    const nextMatches = state.matches.filter(m => !m.allianceA.includes(teamId) && !m.allianceB.includes(teamId));

    const newState = {
      ...state,
      teams: nextTeams,
      players: nextPlayers,
      matches: nextMatches
    };
    saveState(newState);
    alert('Team deleted completely along with associated matches.');
  };

  // 4. CREATE MATCH FIXTURE MANUALLY OR VIA SCRAMBLER
  const handleCreateMatch = (type: MatchFormat, allianceA: string[], allianceB: string[], oversMax: number) => {
    const matchId = `match-${Date.now()}`;
    const newMatch: Match = {
      id: matchId,
      type,
      status: 'scheduled',
      allianceA,
      allianceB,
      oversMax,
      date: new Date().toISOString().split('T')[0],
      currentInningsIndex: 1
    };

    saveState({
      ...state,
      matches: [...state.matches, newMatch]
    });
    alert(`Scheduled a new ${type} matchup: ${allianceA.join('+')} vs ${allianceB.join('+')}!`);
  };

  // 5. UPDATE SCORING STATE FROM SCORECARD LIVE
  const handleUpdateMatchState = (updatedMatch: Match) => {
    let nextMatches = state.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
    
    let nextTeams = [...state.teams];
    let nextPlayers = [...state.players];
    let nextAlliancePairs = [...state.alliancePairs];

    // If match is newly completed, aggregate its statistics!
    const previousMatch = state.matches.find(m => m.id === updatedMatch.id);
    if (previousMatch?.status !== 'completed' && updatedMatch.status === 'completed') {
      const firstInnings = updatedMatch.firstInnings;
      const secondInnings = updatedMatch.secondInnings;

      if (firstInnings && secondInnings) {
        const runsA = firstInnings.runs;
        const ballsA = firstInnings.ballsBowled;
        const runsB = secondInnings.runs;
        const ballsB = secondInnings.ballsBowled;

        // A. STANDINGS SCORE ACCUMULATION (League Matches ONLY)
        if (updatedMatch.type === 'League') {
          const winAlliance = updatedMatch.winner;

          // Alliance A Standings Update
          updatedMatch.allianceA.forEach(tId => {
            nextTeams = nextTeams.map(t => {
              if (t.id === tId) {
                const isWin = winAlliance === 'Alliance A';
                return {
                  ...t,
                  matchesPlayed: t.matchesPlayed + 1,
                  wins: t.wins + (isWin ? 1 : 0),
                  losses: t.losses + (isWin ? 0 : 1),
                  points: t.points + (isWin ? 2 : 0),
                  runsScored: t.runsScored + runsA,
                  ballsFaced: t.ballsFaced + ballsA,
                  runsConceded: t.runsConceded + runsB,
                  ballsBowled: t.ballsBowled + ballsB
                };
              }
              return t;
            });
          });

          // Alliance B Standings Update
          updatedMatch.allianceB.forEach(tId => {
            nextTeams = nextTeams.map(t => {
              if (t.id === tId) {
                const isWin = winAlliance === 'Alliance B';
                return {
                  ...t,
                  matchesPlayed: t.matchesPlayed + 1,
                  wins: t.wins + (isWin ? 1 : 0),
                  losses: t.losses + (isWin ? 0 : 1),
                  points: t.points + (isWin ? 2 : 0),
                  runsScored: t.runsScored + runsB,
                  ballsFaced: t.ballsFaced + ballsB,
                  runsConceded: t.runsConceded + runsA,
                  ballsBowled: t.ballsBowled + ballsA
                };
              }
              return t;
            });
          });

          // Track alliances to avoid duplicate partnerships
          if (updatedMatch.allianceA.length === 2) {
            const sortedA = [...updatedMatch.allianceA].sort();
            let foundA = false;
            nextAlliancePairs = nextAlliancePairs.map(ap => {
              if (ap.teams[0] === sortedA[0] && ap.teams[1] === sortedA[1]) {
                foundA = true;
                return { ...ap, count: ap.count + 1 };
              }
              return ap;
            });
            if (!foundA) {
              nextAlliancePairs.push({ teams: sortedA, count: 1 });
            }
          }

          if (updatedMatch.allianceB.length === 2) {
            const sortedB = [...updatedMatch.allianceB].sort();
            let foundB = false;
            nextAlliancePairs = nextAlliancePairs.map(ap => {
              if (ap.teams[0] === sortedB[0] && ap.teams[1] === sortedB[1]) {
                foundB = true;
                return { ...ap, count: ap.count + 1 };
              }
              return ap;
            });
            if (!foundB) {
              nextAlliancePairs.push({ teams: sortedB, count: 1 });
            }
          }
        }

        // B. INDIVIDUAL PLAYER CAPS STATS (All matches!)
        
        // 1st Innings Batting
        Object.keys(firstInnings.batsmenStats).forEach(pId => {
          const s = firstInnings.batsmenStats[pId];
          nextPlayers = nextPlayers.map(p => {
            if (p.id === pId) {
              return {
                ...p,
                matchesPlayed: p.matchesPlayed + 1,
                runs: p.runs + s.runs,
                ballsFaced: p.ballsFaced + s.balls,
                fours: p.fours + s.fours,
                sixes: p.sixes + s.sixes
              };
            }
            return p;
          });
        });

        // 1st Innings Bowling
        Object.keys(firstInnings.bowlersStats).forEach(pId => {
          const s = firstInnings.bowlersStats[pId];
          nextPlayers = nextPlayers.map(p => {
            if (p.id === pId) {
              const batted = firstInnings.batsmenStats[pId] !== undefined;
              return {
                ...p,
                matchesPlayed: p.matchesPlayed + (batted ? 0 : 1),
                wickets: p.wickets + s.wickets,
                runsConceded: p.runsConceded + s.runsConceded,
                ballsBowled: p.ballsBowled + s.ballsBowled
              };
            }
            return p;
          });
        });

        // 2nd Innings Batting
        Object.keys(secondInnings.batsmenStats).forEach(pId => {
          const s = secondInnings.batsmenStats[pId];
          nextPlayers = nextPlayers.map(p => {
            if (p.id === pId) {
              const playedInFirst = firstInnings.batsmenStats[pId] !== undefined || firstInnings.bowlersStats[pId] !== undefined;
              return {
                ...p,
                matchesPlayed: p.matchesPlayed + (playedInFirst ? 0 : 1),
                runs: p.runs + s.runs,
                ballsFaced: p.ballsFaced + s.balls,
                fours: p.fours + s.fours,
                sixes: p.sixes + s.sixes
              };
            }
            return p;
          });
        });

        // 2nd Innings Bowling
        Object.keys(secondInnings.bowlersStats).forEach(pId => {
          const s = secondInnings.bowlersStats[pId];
          nextPlayers = nextPlayers.map(p => {
            if (p.id === pId) {
              const playedInPrev = firstInnings.batsmenStats[pId] !== undefined || 
                                   firstInnings.bowlersStats[pId] !== undefined || 
                                   secondInnings.batsmenStats[pId] !== undefined;
              return {
                ...p,
                matchesPlayed: p.matchesPlayed + (playedInPrev ? 0 : 1),
                wickets: p.wickets + s.wickets,
                runsConceded: p.runsConceded + s.runsConceded,
                ballsBowled: p.ballsBowled + s.ballsBowled
              };
            }
            return p;
          });
        });

        // Increment matches Played for remaining passive bench players belonging to selected teams (who didn't bat or bowl)
        const matchActivePlayerIds = new Set<string>();
        Object.keys(firstInnings.batsmenStats).forEach(id => matchActivePlayerIds.add(id));
        Object.keys(firstInnings.bowlersStats).forEach(id => matchActivePlayerIds.add(id));
        Object.keys(secondInnings.batsmenStats).forEach(id => matchActivePlayerIds.add(id));
        Object.keys(secondInnings.bowlersStats).forEach(id => matchActivePlayerIds.add(id));

        const matchTeams = [...updatedMatch.allianceA, ...updatedMatch.allianceB];
        nextPlayers = nextPlayers.map(p => {
          if (matchTeams.includes(p.teamId) && !matchActivePlayerIds.has(p.id)) {
            return {
              ...p,
              matchesPlayed: p.matchesPlayed + 1
            };
          }
          return p;
        });

        // C. PLAYOFF AUTO PROPAGATION ON KNOCKOUT NODE COMPLETION
        if (updatedMatch.type === 'Qualifier 1') {
          const winnerAlliance = updatedMatch.winner;
          const winnerTeamIds = winnerAlliance === 'Alliance A' ? updatedMatch.allianceA : updatedMatch.allianceB;
          const loserTeamIds = winnerAlliance === 'Alliance A' ? updatedMatch.allianceB : updatedMatch.allianceA;

          nextMatches = nextMatches.map(m => {
            if (m.type === 'Qualifier 2') {
              return { ...m, allianceA: loserTeamIds };
            }
            if (m.type === 'Final') {
              return { ...m, allianceA: winnerTeamIds };
            }
            return m;
          });
        }
        else if (updatedMatch.type === 'Eliminator') {
          const winnerAlliance = updatedMatch.winner;
          const winnerTeamIds = winnerAlliance === 'Alliance A' ? updatedMatch.allianceA : updatedMatch.allianceB;

          nextMatches = nextMatches.map(m => {
            if (m.type === 'Qualifier 2') {
              return { ...m, allianceB: winnerTeamIds };
            }
            return m;
          });
        }
        else if (updatedMatch.type === 'Qualifier 2') {
          const winnerAlliance = updatedMatch.winner;
          const winnerTeamIds = winnerAlliance === 'Alliance A' ? updatedMatch.allianceA : updatedMatch.allianceB;

          nextMatches = nextMatches.map(m => {
            if (m.type === 'Final') {
              return { ...m, allianceB: winnerTeamIds };
            }
            return m;
          });
        }
      }
    }

    const nextState = {
      ...state,
      matches: nextMatches,
      teams: nextTeams,
      players: nextPlayers,
      alliancePairs: nextAlliancePairs
    };

    saveState(nextState);
  };

  // 6. GENERATE PLAYOFFS BRACKETS
  const handleGeneratePlayoffs = () => {
    if (state.teams.length < 4) {
      alert('Need at least 4 active teams in the league table standings to generate playoffs brackets.');
      return;
    }

    // Sort teams to find top 4 seeds
    const sortedSeeds = [...state.teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      
      // Compute NRR
      const nrrA = a.ballsFaced > 0 ? (a.runsScored / (a.ballsFaced / 6)) - (a.runsConceded / (a.ballsBowled / 6)) : 0;
      const nrrB = b.ballsFaced > 0 ? (b.runsScored / (b.ballsFaced / 6)) - (b.runsConceded / (b.ballsBowled / 6)) : 0;
      return nrrB - nrrA;
    });

    const [t1, t2, t3, t4] = sortedSeeds;

    const newPlayoffs: Match[] = [
      {
        id: 'playoff-q1',
        type: 'Qualifier 1',
        status: 'scheduled',
        allianceA: [t1.id], // Single Team 
        allianceB: [t2.id], // Single Team
        oversMax: 8,
        date: '2026-06-10',
        currentInningsIndex: 1
      },
      {
        id: 'playoff-elim',
        type: 'Eliminator',
        status: 'scheduled',
        allianceA: [t3.id],
        allianceB: [t4.id],
        oversMax: 8,
        date: '2026-06-11',
        currentInningsIndex: 1
      },
      {
        id: 'playoff-q2',
        type: 'Qualifier 2',
        status: 'scheduled',
        allianceA: ['PLACEHOLDER_Q1_LOSER'],
        allianceB: ['PLACEHOLDER_ELIM_WINNER'],
        oversMax: 8,
        date: '2026-06-13',
        currentInningsIndex: 1
      },
      {
        id: 'playoff-final',
        type: 'Final',
        status: 'scheduled',
        allianceA: ['PLACEHOLDER_Q1_WINNER'],
        allianceB: ['PLACEHOLDER_Q2_WINNER'],
        oversMax: 10,
        date: '2026-06-15',
        currentInningsIndex: 1
      }
    ];

    // Filter out previous playoff matches from active fixtures list
    const filteredMatches = state.matches.filter(m => m.type === 'League');

    saveState({
      ...state,
      matches: [...filteredMatches, ...newPlayoffs]
    });

    setActiveTab('Matches');
    alert(`Playoffs successfully seeded!\nQualifier 1: ${t1.name} vs ${t2.name}\nEliminator: ${t3.name} vs ${t4.name}`);
  };

  // 7. DELETE SINGLE MATCH FIXTURE
  const handleDeleteMatch = (matchId: string) => {
    saveState({
      ...state,
      matches: state.matches.filter(m => m.id !== matchId)
    });
  };

  // 8. DATA EXPORT (JSON DOWNLOAD)
  const handleExportLeague = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `summer_derby_2026_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 9. DATA IMPORT (JSON UPLOAD)
  const handleImportLeague = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.teams && parsed.players && parsed.matches) {
          saveState(parsed);
          alert('League configuration & score history imported successfully!');
        } else {
          alert('Invalid backing file schema. Missing teams, players, or matches properties.');
        }
      } catch (err) {
        alert('Failed to parse file. Ensure it is a valid JSON export.');
      }
    };
  };

  // 10. SYSTEM DATA RECOVERY / RESET
  const handleClearData = () => {
    if (confirm('Are you sure you want to completely clear the league state? This will reset all team points, player cap stats, and delete existing match records. This action cannot be undone.')) {
      localStorage.removeItem('summer_derby_2026_state_v3');
      setState(DEFAULT_LEAGUE_STATE);
      alert('Local league database reverted successfully to default configuration.');
    }
  };

  // Active Scorers Loadout
  const activeScoringMatch = state.matches.find(m => m.id === scoringMatchId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans" id="summer-derby-root-app">
      
      {/* Upper Navigation Header bar */}
      <header className="sticky top-0 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 z-40 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl text-slate-950 shadow-md transform rotate-2">
              <Zap className="w-5 h-5 fill-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white font-display uppercase leading-none">
                  SUMMER DERBY 2026
                </h1>
                <span className="p-0.5 px-1.5 text-[9px] font-black tracking-widest text-[#FFF] bg-indigo-650 bg-indigo-600 rounded-md font-mono uppercase">
                  TENNIS LEAGUE
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-500 font-semibold mt-0.5 tracking-wider">
                PARTNERSHIP ALLIANCE SCORER
              </p>
            </div>
          </div>

          {scoringMatchId ? (
            /* Scorer Active Status Display banner */
            <div className="flex items-center gap-2 bg-rose-600/10 border border-rose-500/20 p-2 px-3 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-rose-400 font-bold font-mono uppercase">Active Scoring Match Live</span>
            </div>
          ) : (
            /* Upper Tabs Control */
            <nav className="flex items-center gap-1 bg-zinc-900/60 p-1 border border-zinc-850 rounded-xl w-full sm:w-auto overflow-x-auto">
              {(['Standings', 'Matches', 'Admin', 'About'] as Tab[]).map((tab) => {
                const Icon = tab === 'Standings' ? Trophy : 
                             tab === 'Matches' ? Calendar : 
                             tab === 'Admin' ? Users : Info;
                const isSelected = activeTab === tab;
                return (
                  <button
                    key={tab}
                    id={`nav-tab-btn-${tab}`}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {tab}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Quick Data Storage Backups Actions */}
          <div className="flex items-center gap-2">
            <button
              id="export-league-btn"
              onClick={handleExportLeague}
              title="Download full backup database (JSON)"
              className="p-2 bg-zinc-900 hover:bg-zinc-805 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 font-bold uppercase font-mono py-1.5 px-2.5"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden md:inline text-[10px]">Export</span>
            </button>
            
            <label 
              title="Upload json database"
              className="p-2 bg-zinc-900 hover:bg-zinc-805 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 font-bold uppercase font-mono py-1.5 px-2.5"
            >
              <FileUp className="w-4 h-4" />
              <span className="hidden md:inline text-[10px]">Import</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportLeague} 
                className="hidden" 
              />
            </label>

            <button
              id="clear-data-btn"
              onClick={handleClearData}
              title="Reset all database settings"
              className="p-2 text-rose-500 bg-rose-950/10 border border-rose-950/25 hover:border-rose-500 hover:text-rose-400 rounded-xl text-xs transition-all flex items-center justify-center font-bold font-mono py-1.5 px-2.5"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline text-[10px]">Reset</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Body container */}
      <main className="max-w-7xl mx-auto px-4 py-6" id="summer-derby-main-layout">
        {activeScoringMatch ? (
          /* Live Score Input Card Screen */
          <ScorecardView
            match={activeScoringMatch}
            teams={state.teams}
            players={state.players}
            onUpdateMatchState={handleUpdateMatchState}
            onCloseScoring={() => setScoringMatchId(null)}
          />
        ) : (
          /* Normal Dashboard Layout */
          <div className="space-y-6 animate-fadeIn">
            
            {/* Quick banner notice about League Format */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex gap-3 text-zinc-400 text-xs font-mono leading-relaxed relative overflow-hidden">
              <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0 w-max h-max">💡</span>
              <div>
                <p className="text-zinc-200 font-extrabold uppercase text-[10px] tracking-wider font-sans mb-0.5">Welcome Scorer to the Local Hard Tennis Derby!</p>
                Register your teams and players under the <strong>Admin</strong> panel, then head to the <strong>Matches</strong> tab to schedule or randomly generate fair alliance matches. Use the Export features to back up your league data!
              </div>
            </div>

            {/* Render selected tabs */}
            {activeTab === 'Standings' && (
              <LeagueTable 
                teams={state.teams}
                players={state.players}
              />
            )}

            {activeTab === 'Matches' && (
              <MatchFixtures
                matches={state.matches}
                teams={state.teams}
                alliancePairs={state.alliancePairs}
                onCreateMatch={handleCreateMatch}
                onSelectMatchToScore={setScoringMatchId}
                onGeneratePlayoffs={handleGeneratePlayoffs}
                onDeleteMatch={handleDeleteMatch}
              />
            )}

            {activeTab === 'Admin' && (
              <ManageTeams
                teams={state.teams}
                players={state.players}
                onAddTeam={handleAddTeam}
                onEditTeam={handleEditTeam}
                onDeleteTeam={handleDeleteTeam}
              />
            )}

            {activeTab === 'About' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6 max-w-2xl mx-auto font-mono text-xs text-zinc-450 leading-relaxed" id="about-information-panel">
                <div className="flex gap-3 items-center border-b border-zinc-800 pb-3 mb-2">
                  <span className="p-2 bg-amber-500/10 text-amber-500 rounded border border-amber-500/25">💡</span>
                  <p className="text-sm font-black text-white uppercase tracking-tight font-sans">Summer Derby 2026 Rules & Formats</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-zinc-200 font-extrabold text-xxs font-sans uppercase tracking-wider block">1. 2-v-2 player custom team structure</span>
                    <p>Every registered team consists of exactly 2 players. For any league match, alliances are randomized fairly to pit Team X + Team Y against Team W + Team Z. Alliances change every match. At the crease, 4 players in the alliance batting line-up are permitted to bat (with 3 wickets before all-out).</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-zinc-200 font-extrabold text-xxs font-sans uppercase tracking-wider block">2. Points & Standing Calculations</span>
                    <p>Winning alliances get +2 Points & +1 Win for both partner teams in the league table standings! Losing alliances receive 0 Points & +1 Loss. Economy and Strike rate are computed from legal deliveries thrown. NRR weights runs scoring overs faced and runs conceded overs bowled precisely.</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-zinc-200 font-extrabold text-[#FFF] text-xxs font-sans uppercase tracking-wider block">3. Playoff structures (Championship knockout)</span>
                    <p>Top 4 teams qualify automatically for Champion playoffs. Qualifier 1 (#1 vs #2 Seed) winner advances to Final. Eliminator (#3 vs #4 Seed) winner advances to Qualifier 2. Qualifier 2 pits Q1 Loser against Eliminator Winner to finalize our Grand Final match!</p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2 mt-4 text-center font-sans tracking-wide">
                  <span className="text-base">🧢</span>
                  <p className="text-xxs text-zinc-400 font-semibold tracking-wide uppercase">Summer Derby tournament is powered by LocalStorage client memory.</p>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

    </div>
  );
}
