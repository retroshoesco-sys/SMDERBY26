import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Users, Calendar, Award, FileDown, FileUp, 
  Trash2, Info, Zap, Smartphone, Signal, Wifi, Battery, Volume2, VolumeX,
  Sliders, Settings, Bell, ChevronRight, Home, CheckCircle, ShieldAlert,
  Moon, Sun, RefreshCw, AlertCircle, X, ChevronDown, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Team, Player, Match, AlliancePair, LeagueState, MatchFormat } from './types';
import { DEFAULT_LEAGUE_STATE } from './data/mockData';

// Subcomponents
import LeagueTable from './components/LeagueTable';
import MatchFixtures from './components/MatchFixtures';
import ManageTeams from './components/ManageTeams';
import ScorecardView from './components/ScorecardView';

// Audio Context Web Synth
class IosAudioSynth {
  private isSilent: boolean = false;
  
  setSilent(val: boolean) {
    this.isSilent = val;
  }

  play(type: 'chime' | 'click' | 'lock' | 'unlock') {
    if (typeof window === 'undefined' || this.isSilent) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } 
      else if (type === 'chime') {
        const playTone = (freq: number, start: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
          osc.start(start);
          osc.stop(start + duration);
        };
        playTone(523.25, ctx.currentTime, 0.25); // C5
        playTone(659.25, ctx.currentTime + 0.08, 0.35); // E5
      }
      else if (type === 'lock') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
      else if (type === 'unlock') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {
      console.warn('Synth playback blocked or unsupported', e);
    }
  }
}

const synth = new IosAudioSynth();

export default function App() {
  // Navigation & iOS Shell States
  type Tab = 'Standings' | 'Matches' | 'Admin' | 'About';
  const [activeTab, setActiveTab] = useState<Tab>('Standings');
  
  // Custom states for iOS integration
  const [isLocked, setIsLocked] = useState(false);
  const [isSilent, setIsSilent] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);
  const [screenBrightness, setScreenBrightness] = useState(100); // 40 to 100
  const [isHomeScreen, setIsHomeScreen] = useState(false);
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Force lock/homescreen off on mobile devices
  useEffect(() => {
    if (isMobile) {
      setIsLocked(false);
      setIsHomeScreen(false);
    }
  }, [isMobile]);
  
  // Time sync for Status Bar
  const [statusBarTime, setStatusBarTime] = useState('09:41');
  const [currentDateString, setCurrentDateString] = useState('Thursday, June 25');
  
  // Custom Dialog States
  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    onDismiss?: () => void;
  } | null>(null);

  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Dynamic Island notification state
  const [islandAlert, setIslandAlert] = useState<string | null>(null);
  const [islandExpand, setIslandExpand] = useState(false);
  const alertTimeoutRef = useRef<any>(null);

  // Core Cricket Database State
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

  // Update mute state on audio synth when isSilent toggles
  useEffect(() => {
    synth.setSilent(isSilent);
  }, [isSilent]);

  // Sync real-world client clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timeStr = `${String(hours).padStart(2, '0')}:${minutes}`;
      setStatusBarTime(timeStr);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      setCurrentDateString(`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Override window.alert to show our gorgeous Elastic Dynamic Island notice!
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message: string) => {
      triggerIslandNotification(message);
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [isSilent]);

  // Save changes to localStorage on any state change
  const saveState = (newState: LeagueState) => {
    setState(newState);
    localStorage.setItem('summer_derby_2026_state_v3', JSON.stringify(newState));
  };

  // Helper to trigger Dynamic Island notifications
  const triggerIslandNotification = (message: string) => {
    synth.play('chime');
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
    setIslandAlert(message);
    setIslandExpand(true);

    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setIslandExpand(false);
      setTimeout(() => setIslandAlert(null), 300);
    }, 4500);
  };

  // Sound triggering tap helper
  const handleIosTap = () => {
    synth.play('click');
    if (navigator.vibrate) navigator.vibrate(10);
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
    triggerIslandNotification(`Registered: ${shortName} (2 Players)`);
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
    triggerIslandNotification(`Updated database: ${shortName}`);
  };

  // 3. DELETE TEAM ADMIN
  const handleDeleteTeam = (teamId: string) => {
    const targetTeam = state.teams.find(t => t.id === teamId);
    
    setCustomConfirm({
      title: 'Delete Team?',
      message: `Are you sure you want to delete ${targetTeam?.name || 'this team'}? This deletes all associated match logs and statistics.`,
      onConfirm: () => {
        const nextTeams = state.teams.filter(t => t.id !== teamId);
        const nextPlayers = state.players.filter(p => p.teamId !== teamId);
        const nextMatches = state.matches.filter(m => !m.allianceA.includes(teamId) && !m.allianceB.includes(teamId));

        const newState = {
          ...state,
          teams: nextTeams,
          players: nextPlayers,
          matches: nextMatches
        };
        saveState(newState);
        setCustomConfirm(null);
        triggerIslandNotification('Team deleted successfully');
      }
    });
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
    
    triggerIslandNotification(`Fixture created: ${type}`);
  };

  // 5. UPDATE SCORING STATE FROM SCORECARD LIVE
  const handleUpdateMatchState = (updatedMatch: Match) => {
    let nextMatches = state.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
    
    let nextTeams = [...state.teams];
    let nextPlayers = [...state.players];
    let nextAlliancePairs = [...state.alliancePairs];

    const previousMatch = state.matches.find(m => m.id === updatedMatch.id);
    if (previousMatch?.status !== 'completed' && updatedMatch.status === 'completed') {
      const firstInnings = updatedMatch.firstInnings;
      const secondInnings = updatedMatch.secondInnings;

      if (firstInnings && secondInnings) {
        const runsA = firstInnings.runs;
        const ballsA = firstInnings.ballsBowled;
        const runsB = secondInnings.runs;
        const ballsB = secondInnings.ballsBowled;

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

        // passive bench players
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

        // Playoffs auto seeding
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
      triggerIslandNotification('Playoffs require at least 4 active teams!');
      return;
    }

    const sortedSeeds = [...state.teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const runsPerOverFacedA = a.ballsFaced > 0 ? a.runsScored / (a.ballsFaced / 6) : 0;
      const runsPerOverConcededA = a.ballsBowled > 0 ? a.runsConceded / (a.ballsBowled / 6) : 0;
      const nrrA = runsPerOverFacedA - runsPerOverConcededA;

      const runsPerOverFacedB = b.ballsFaced > 0 ? b.runsScored / (b.ballsFaced / 6) : 0;
      const runsPerOverConcededB = b.ballsBowled > 0 ? b.runsConceded / (b.ballsBowled / 6) : 0;
      const nrrB = runsPerOverFacedB - runsPerOverConcededB;
      return nrrB - nrrA;
    });

    const [t1, t2, t3, t4] = sortedSeeds;

    const newPlayoffs: Match[] = [
      {
        id: 'playoff-q1',
        type: 'Qualifier 1',
        status: 'scheduled',
        allianceA: [t1.id],
        allianceB: [t2.id],
        oversMax: 8,
        date: new Date().toISOString().split('T')[0],
        currentInningsIndex: 1
      },
      {
        id: 'playoff-elim',
        type: 'Eliminator',
        status: 'scheduled',
        allianceA: [t3.id],
        allianceB: [t4.id],
        oversMax: 8,
        date: new Date().toISOString().split('T')[0],
        currentInningsIndex: 1
      },
      {
        id: 'playoff-q2',
        type: 'Qualifier 2',
        status: 'scheduled',
        allianceA: ['PLACEHOLDER_Q1_LOSER'],
        allianceB: ['PLACEHOLDER_ELIM_WINNER'],
        oversMax: 8,
        date: new Date().toISOString().split('T')[0],
        currentInningsIndex: 1
      },
      {
        id: 'playoff-final',
        type: 'Final',
        status: 'scheduled',
        allianceA: ['PLACEHOLDER_Q1_WINNER'],
        allianceB: ['PLACEHOLDER_Q2_WINNER'],
        oversMax: 10,
        date: new Date().toISOString().split('T')[0],
        currentInningsIndex: 1
      }
    ];

    const filteredMatches = state.matches.filter(m => m.type === 'League');

    saveState({
      ...state,
      matches: [...filteredMatches, ...newPlayoffs]
    });

    setActiveTab('Matches');
    triggerIslandNotification('Playoffs generated and seeded!');
  };

  // 7. DELETE SINGLE MATCH FIXTURE
  const handleDeleteMatch = (matchId: string) => {
    saveState({
      ...state,
      matches: state.matches.filter(m => m.id !== matchId)
    });
    triggerIslandNotification('Fixture deleted');
  };

  // 8. DATA EXPORT
  const handleExportLeague = () => {
    handleIosTap();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `summer_derby_2026_ios_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerIslandNotification('League backup exported');
  };

  // 9. DATA IMPORT
  const handleImportLeague = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleIosTap();
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.teams && parsed.players && parsed.matches) {
          saveState(parsed);
          triggerIslandNotification('Data imported successfully');
        } else {
          setCustomAlert({
            title: 'Import Failed',
            message: 'Invalid backup file format. Essential properties (teams, players, matches) are missing.'
          });
        }
      } catch (err) {
        setCustomAlert({
          title: 'Import Error',
          message: 'Failed to read data. Make sure it is a valid backup JSON file.'
        });
      }
    };
  };

  // 10. SYSTEM DATA RECOVERY / RESET
  const handleClearData = () => {
    handleIosTap();
    setCustomConfirm({
      title: 'Factory Reset?',
      message: 'This will completely erase the entire tournament database, team scores, individual stats, and settings from local device storage.',
      onConfirm: () => {
        localStorage.removeItem('summer_derby_2026_state_v3');
        setState(DEFAULT_LEAGUE_STATE);
        setCustomConfirm(null);
        triggerIslandNotification('App database cleared');
      }
    });
  };

  const activeScoringMatch = state.matches.find(m => m.id === scoringMatchId);

  // Helper to fetch live scores for Dynamic Island Live Activity
  const getDynamicIslandLiveStats = () => {
    if (!activeScoringMatch) return null;
    const isFirstInnings = activeScoringMatch.currentInningsIndex === 1;
    const innings = isFirstInnings ? activeScoringMatch.firstInnings : activeScoringMatch.secondInnings;
    if (!innings) return { label: 'Scoring Live', score: 'TAP TO SCORE' };

    const battingAllianceShorts = innings.battingAlliance.map(tId => {
      const team = state.teams.find(t => t.id === tId);
      return team ? team.shortName : tId;
    }).join('+');

    const scoreStr = `${innings.runs}/${innings.wicketsCount}`;
    const oversStr = `${Math.floor(innings.ballsBowled / 6)}.${innings.ballsBowled % 6} ov`;
    
    return {
      label: battingAllianceShorts,
      score: `${scoreStr} (${oversStr})`
    };
  };

  const liveIslandStats = getDynamicIslandLiveStats();

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center md:p-6 select-none overflow-hidden relative" id="summer-derby-root-container">
      
      {/* Background Ambience representing luxury iOS wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 via-[#0a0a0c] to-amber-950/20 opacity-90 z-0 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Responsive Wrapper: iPhone Simulator chassis on desktop, but raw edge-to-edge on mobile/tablets */}
      <div className="relative w-full h-[100dvh] md:h-[860px] md:max-w-[420px] bg-[#000000] md:rounded-[56px] md:shadow-[0_30px_80px_rgba(0,0,0,0.85)] md:border-[11px] md:border-[#1f1f23] md:ring-[1px] ring-zinc-800 flex flex-col overflow-hidden z-10 transition-all duration-300">
        
        {/* Dynamic Island Physical Component (Notch overlay inside screen) - Hidden completely on actual mobile viewport */}
        <div className={`absolute top-[11px] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none ${isMobile ? 'hidden' : ((!islandExpand && !liveIslandStats) ? 'hidden md:flex' : 'flex')}`}>
          <motion.div 
            layout
            animate={{
              width: islandExpand ? 340 : (liveIslandStats ? 180 : 110),
              height: islandExpand ? (islandAlert ? 'auto' : 130) : 32,
              borderRadius: islandExpand ? 24 : 16
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="bg-black text-white flex items-center justify-between px-3.5 shadow-2xl pointer-events-auto cursor-pointer border border-white/[0.04]"
            onClick={() => {
              handleIosTap();
              if (islandAlert) {
                // Clicking custom alert collapses it
                setIslandExpand(false);
              } else if (activeScoringMatch) {
                // Clicking live match status toggles rapid detailed stats modal or bounces it
                setIslandExpand(!islandExpand);
              }
            }}
          >
            <AnimatePresence mode="wait">
              {islandExpand ? (
                islandAlert ? (
                  /* Extended Notification View */
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full py-2.5 flex items-center gap-3"
                  >
                    <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
                      <Bell className="w-4 h-4 fill-slate-950 stroke-[2]" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest font-sans">SUMMER DERBY ALERT</p>
                      <p className="text-xs text-white font-medium font-sans mt-0.5 leading-tight">{islandAlert}</p>
                    </div>
                    <button className="p-1 bg-zinc-800/80 rounded-full text-zinc-400 hover:text-white" onClick={() => setIslandExpand(false)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ) : (
                  /* Live Activity Detailed Score Dropdown */
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="w-full py-3 flex flex-col text-left text-xs space-y-2"
                  >
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                      <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 font-sans flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        Live Ball-by-Ball Match
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide">
                        {activeScoringMatch?.type} Match
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-sans">
                      <p className="font-extrabold text-sm text-zinc-100">{liveIslandStats?.label}</p>
                      <p className="font-mono text-sm font-black text-white bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-850">
                        {liveIslandStats?.score}
                      </p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 pt-1">
                      <span>Max Overs: {activeScoringMatch?.oversMax}ov</span>
                      <span className="text-amber-500 font-bold hover:underline cursor-pointer" onClick={() => { setIslandExpand(false); setScoringMatchId(null); }}>
                        Collapse Scorecard
                      </span>
                    </div>
                  </motion.div>
                )
              ) : (
                /* Compact View */
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full flex items-center justify-between font-sans text-xs gap-1.5"
                >
                  {liveIslandStats ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="font-mono text-[9px] font-black tracking-tighter text-zinc-300 truncate max-w-[70px] uppercase">{liveIslandStats.label}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                      <span className="font-mono text-[10px] font-bold text-amber-400 shrink-0">{liveIslandStats.score.split(' ')[0]}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0" />
                      <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-400">iOS</span>
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shrink-0" />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Physical hardware side controls (Clickable buttons on bezel) */}
        <div className="hidden md:block absolute left-[-11px] top-[140px] w-[3px] h-[35px] bg-zinc-800 rounded-r z-40 cursor-pointer hover:bg-amber-500" title="Silent Switch" onClick={() => { setIsSilent(!isSilent); if (navigator.vibrate) navigator.vibrate([40, 20]); }} />
        <div className="hidden md:block absolute left-[-11px] top-[195px] w-[3px] h-[55px] bg-zinc-800 rounded-r z-40 cursor-pointer hover:bg-zinc-600" title="Volume Up" onClick={() => { synth.play('click'); triggerIslandNotification('iOS Volume: 100%'); }} />
        <div className="hidden md:block absolute left-[-11px] top-[260px] w-[3px] h-[55px] bg-zinc-800 rounded-r z-40 cursor-pointer hover:bg-zinc-600" title="Volume Down" onClick={() => { synth.play('click'); triggerIslandNotification('iOS Volume: 40%'); }} />
        <div className="hidden md:block absolute right-[-11px] top-[210px] w-[3px] h-[65px] bg-zinc-800 rounded-l z-40 cursor-pointer hover:bg-red-500" title="Power Button (Lock/Sleep)" onClick={() => { 
          if (isLocked) {
            synth.play('unlock');
            setIsLocked(false);
          } else {
            synth.play('lock');
            setIsLocked(true);
            setIsControlCenterOpen(false);
          }
        }} />

        {/* BRIGHTNESS / LOW POWER DEVICE FILTER ACCENTS */}
        <div 
          className="absolute inset-0 pointer-events-none z-50 transition-all duration-300"
          style={{ 
            backgroundColor: isMobile ? 'transparent' : `rgba(0, 0, 0, ${1 - (screenBrightness / 100) + (isLowPower ? 0.08 : 0)})` 
          }} 
        />

        {/* SLEEP / LOCK SCREEN ELEMENT */}
        <AnimatePresence>
          {(isLocked && !isMobile) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950 z-40 flex flex-col justify-between p-8 pt-16 font-sans text-center text-white"
              onClick={() => {
                synth.play('unlock');
                setIsLocked(false);
              }}
            >
              <div className="space-y-2 mt-8">
                <span className="text-[11px] tracking-[0.25em] font-bold text-indigo-400 font-mono uppercase">SUMMER DERBY 2026</span>
                <p className="text-6xl font-thin tracking-tighter mt-1">{statusBarTime}</p>
                <p className="text-sm font-medium text-zinc-400">{currentDateString}</p>
              </div>

              {/* iOS lock widget */}
              <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/40 p-4 rounded-3xl text-left flex items-center gap-3 max-w-[320px] mx-auto">
                <div className="p-2.5 bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 rounded-2xl">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-white font-sans">Cricket Scorer Widget</p>
                  <p className="text-[10px] font-mono text-zinc-400 leading-normal">
                    {state.teams.length} teams registered • {state.matches.length} matches logged. Tap screen to unlock.
                  </p>
                </div>
              </div>

              <div className="mb-4 flex flex-col items-center text-zinc-500 animate-pulse text-xs font-mono">
                <span>⚡ SWIPE OR TAP TO UNLOCK</span>
                <div className="w-32 h-1 bg-zinc-800 rounded-full mt-4" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SYSTEM CONTROL CENTER DRAWER OVERLAY */}
        <AnimatePresence>
          {isControlCenterOpen && (
            <motion.div 
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute inset-0 bg-zinc-950/95 backdrop-blur-2xl z-30 flex flex-col p-6 pt-16 text-white space-y-6"
            >
              <div className="flex justify-between items-center border-b border-zinc-850 pb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-500" />
                  <h3 className="font-sans font-black text-base uppercase tracking-tight">iOS Control Center</h3>
                </div>
                <button 
                  onClick={() => { handleIosTap(); setIsControlCenterOpen(false); }}
                  className="p-1.5 bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid Widgets of Control Center */}
              <div className="grid grid-cols-2 gap-4">
                {/* Connection Box */}
                <div className="bg-zinc-900 p-4 rounded-3xl space-y-3 border border-zinc-850 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">System Audio</span>
                  <button 
                    onClick={() => { handleIosTap(); setIsSilent(!isSilent); }}
                    className={`w-full py-2.5 px-3 rounded-2xl font-bold font-sans text-xs flex items-center justify-center gap-2 transition-all ${
                      isSilent ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isSilent ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {isSilent ? 'MUTE ON' : 'SOUND ON'}
                  </button>
                </div>

                {/* Battery Box */}
                <div className="bg-zinc-900 p-4 rounded-3xl space-y-3 border border-zinc-850 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Battery mode</span>
                  <button 
                    onClick={() => { handleIosTap(); setIsLowPower(!isLowPower); }}
                    className={`w-full py-2.5 px-3 rounded-2xl font-bold font-sans text-xs flex items-center justify-center gap-2 transition-all ${
                      isLowPower ? 'bg-yellow-500 text-slate-950' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <Battery className="w-4 h-4" />
                    {isLowPower ? 'Low Power' : 'Standard'}
                  </button>
                </div>

                {/* Brightness Controller */}
                <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-850 col-span-2 space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                    <span>SCREEN BRIGHTNESS</span>
                    <span>{screenBrightness}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="40" 
                    max="100" 
                    value={screenBrightness}
                    onChange={(e) => setScreenBrightness(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Tournament Backup Settings Packaged as iOS Core Actions */}
              <div className="bg-zinc-900 p-5 rounded-[28px] border border-zinc-850 space-y-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">League Database Settings</span>
                
                <div className="flex flex-col gap-3">
                  {/* Export */}
                  <button
                    onClick={() => { setIsControlCenterOpen(false); handleExportLeague(); }}
                    className="w-full bg-zinc-850 hover:bg-zinc-800 py-3 px-4 rounded-2xl text-xs font-bold text-zinc-200 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-indigo-400" />
                      Backup Tourney (Export JSON)
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>

                  {/* Import Label */}
                  <label className="w-full bg-zinc-850 hover:bg-zinc-800 py-3 px-4 rounded-2xl text-xs font-bold text-zinc-200 flex items-center justify-between transition-colors cursor-pointer">
                    <span className="flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-emerald-400" />
                      Import Database File
                    </span>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={(e) => { setIsControlCenterOpen(false); handleImportLeague(e); }} 
                      className="hidden" 
                    />
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </label>

                  {/* Clear Reset */}
                  <button
                    onClick={() => { setIsControlCenterOpen(false); handleClearData(); }}
                    className="w-full bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 py-3 px-4 rounded-2xl text-xs font-bold text-red-400 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      Factory Device Reset
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>

              <div className="text-center font-mono text-[10px] text-zinc-500 pt-4">
                Summer Derby Partnership Scorers • iOS v18.0.2
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CUSTOM ALERT POP-UPS (Beautiful iOS center alerts) */}
        <AnimatePresence>
          {customAlert && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 p-5 rounded-3xl w-full max-w-[290px] text-center shadow-2xl text-white font-sans"
              >
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <h4 className="font-extrabold text-sm uppercase tracking-tight">{customAlert.title}</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{customAlert.message}</p>
                <button 
                  onClick={() => { handleIosTap(); if (customAlert.onDismiss) customAlert.onDismiss(); setCustomAlert(null); }}
                  className="w-full mt-4 py-2.5 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider"
                >
                  OK
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CUSTOM CONFIRM POP-UPS (Beautiful iOS action sheets) */}
        <AnimatePresence>
          {customConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4"
            >
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 p-5 rounded-[28px] w-full max-w-[340px] text-center shadow-2xl text-white font-sans space-y-4"
              >
                <div className="space-y-1">
                  <h4 className="font-black text-sm uppercase text-zinc-100">{customConfirm.title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{customConfirm.message}</p>
                </div>
                
                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                  <button 
                    onClick={() => { handleIosTap(); customConfirm.onConfirm(); }}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider"
                  >
                    Confirm Action
                  </button>
                  <button 
                    onClick={() => { handleIosTap(); if (customConfirm.onCancel) customConfirm.onCancel(); setCustomConfirm(null); }}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold rounded-2xl text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* iOS HOME SCREEN GRID (Easter Egg! Swipe indicator home or exit app to see) */}
        <AnimatePresence>
          {(isHomeScreen && !isMobile) && (
            <motion.div 
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-gradient-to-tr from-[#1d1d26] via-[#101015] to-[#2c221c] z-30 flex flex-col justify-between p-6 pt-16 font-sans text-white text-center"
            >
              <div className="space-y-1">
                <p className="text-[10px] tracking-widest uppercase font-mono font-black text-amber-500">iOS HOME SCREEN</p>
                <p className="text-4xl font-thin mt-1">{statusBarTime}</p>
                <p className="text-xs font-semibold text-zinc-400">{currentDateString}</p>
              </div>

              {/* Launcher App Grid */}
              <div className="grid grid-cols-4 gap-x-3 gap-y-6 px-2 my-auto">
                {/* Custom Cricket scorer launcher */}
                <div className="flex flex-col items-center space-y-1 cursor-pointer group" onClick={() => { synth.play('unlock'); setIsHomeScreen(false); }}>
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[15px] shadow-lg flex items-center justify-center text-slate-950 transform group-hover:scale-105 active:scale-95 transition-all ring-2 ring-amber-500/30">
                    <Zap className="w-7 h-7 fill-slate-950 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight text-zinc-100 line-clamp-1">Derby '26</span>
                </div>

                {/* Mock Phone App */}
                <div className="flex flex-col items-center space-y-1 opacity-60 pointer-events-none">
                  <div className="w-14 h-14 bg-emerald-500 rounded-[15px] shadow-lg flex items-center justify-center">
                    <Smartphone className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">Phone</span>
                </div>

                {/* Mock Stats App */}
                <div className="flex flex-col items-center space-y-1 opacity-60 pointer-events-none">
                  <div className="w-14 h-14 bg-blue-500 rounded-[15px] shadow-lg flex items-center justify-center">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">Trophy</span>
                </div>

                {/* Mock Settings */}
                <div className="flex flex-col items-center space-y-1 cursor-pointer group" onClick={() => { handleIosTap(); setIsControlCenterOpen(true); }}>
                  <div className="w-14 h-14 bg-zinc-700 rounded-[15px] shadow-lg flex items-center justify-center text-white transform group-hover:scale-105 active:scale-95 transition-all">
                    <Settings className="w-7 h-7 text-zinc-300" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-200">Settings</span>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-[20px] max-w-[280px] mx-auto text-xxs font-mono text-zinc-400 leading-normal">
                💡 <span className="text-zinc-200 font-extrabold uppercase">PRO-TIP:</span> Tap the <strong className="text-amber-500">Derby '26</strong> icon to boot back into the scoring database.
              </div>

              <div className="w-32 h-1 bg-zinc-800 rounded-full mx-auto" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* SYSTEM STATUS BAR (Cell, Wifi, Battery, Clock) */}
        <div 
          className="hidden md:flex h-[44px] bg-black text-white px-6 items-center justify-between z-40 text-xs font-sans select-none border-b border-white/[0.02]"
          onClick={() => {
            // Clicking the top right of the status bar pulls down the control center!
            handleIosTap();
            setIsControlCenterOpen(!isControlCenterOpen);
          }}
        >
          {/* Status Bar Left: Clock */}
          <span className="font-extrabold tracking-tight cursor-pointer font-mono">{statusBarTime}</span>

          {/* Status Bar Right: Cellular, Wifi, Battery indicators */}
          <div className="flex items-center gap-1.5 cursor-pointer">
            <Signal className="w-3.5 h-3.5 text-zinc-100" />
            <span className="text-[9px] font-mono tracking-tight text-zinc-300">5G</span>
            <Wifi className="w-3.5 h-3.5 text-zinc-100" />
            
            {/* Battery percentage with Low Power State */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono font-bold text-zinc-300">84%</span>
              <div className="relative">
                <Battery className={`w-5 h-5 ${isLowPower ? 'text-yellow-400' : 'text-zinc-100'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* INTERNAL APPLICATION CANVAS CONTAINER */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0c] flex flex-col relative pb-[70px] pt-1">
          {activeScoringMatch ? (
            /* Live Score Input Card Screen */
            <div className="flex-1 overflow-y-auto px-4 py-2 animate-fadeIn" id="scorer-match-wrapper">
              <ScorecardView
                match={activeScoringMatch}
                teams={state.teams}
                players={state.players}
                onUpdateMatchState={handleUpdateMatchState}
                onCloseScoring={() => setScoringMatchId(null)}
              />
            </div>
          ) : (
            /* Normal Dashboard Layout */
            <div className="space-y-4 px-4 pt-3 pb-6 flex-1 overflow-y-auto scrollbar-thin">
              
              {/* Custom Elegant iOS App Header */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-lg text-slate-950">
                    <Zap className="w-4 h-4 fill-slate-950" />
                  </div>
                  <div>
                    <h1 className="text-sm font-black tracking-tight text-white font-sans uppercase">SUMMER DERBY</h1>
                    <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider leading-none mt-0.5">ALLIANCE CRICKET SCORER</p>
                  </div>
                </div>

                <button 
                  onClick={() => { handleIosTap(); setIsControlCenterOpen(true); }}
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-850 rounded-full text-zinc-400 hover:text-white border border-zinc-850/50"
                  title="Open Control Center Settings"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>

              {/* Quick banner notice styled like an elegant iOS system alert */}
              <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-2xl p-3 flex gap-2.5 text-zinc-400 text-[11px] font-mono leading-relaxed overflow-hidden shadow-inner">
                <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0 w-max h-max">💡</span>
                <div>
                  <p className="text-zinc-200 font-extrabold uppercase text-[9px] tracking-wider font-sans mb-0.5">Scoring Instructions</p>
                  Register cricket teams and players under <strong className="text-zinc-200">Admin</strong>, then schedule/scramble fair alliance pairings in the <strong className="text-zinc-200">Matches</strong> panel!
                </div>
              </div>

              {/* Render selected tabs */}
              {activeTab === 'Standings' && (
                <div className="animate-fadeIn">
                  <LeagueTable 
                    teams={state.teams}
                    players={state.players}
                  />
                </div>
              )}

              {activeTab === 'Matches' && (
                <div className="animate-fadeIn">
                  <MatchFixtures
                    matches={state.matches}
                    teams={state.teams}
                    alliancePairs={state.alliancePairs}
                    onCreateMatch={handleCreateMatch}
                    onSelectMatchToScore={setScoringMatchId}
                    onGeneratePlayoffs={handleGeneratePlayoffs}
                    onDeleteMatch={handleDeleteMatch}
                  />
                </div>
              )}

              {activeTab === 'Admin' && (
                <div className="animate-fadeIn">
                  <ManageTeams
                    teams={state.teams}
                    players={state.players}
                    onAddTeam={handleAddTeam}
                    onEditTeam={handleEditTeam}
                    onDeleteTeam={handleDeleteTeam}
                  />
                </div>
              )}

              {activeTab === 'About' && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-4 font-mono text-[11px] text-zinc-400 leading-relaxed animate-fadeIn" id="about-information-panel">
                  <div className="flex gap-2 items-center border-b border-zinc-800 pb-2 mb-1">
                    <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/25">💡</span>
                    <p className="text-xs font-black text-white uppercase tracking-tight font-sans">Derby Tournament Regulations</p>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <span className="text-zinc-200 font-extrabold font-sans uppercase tracking-wider block">1. Alliance Partnerships</span>
                      <p>Cricket matches feature 2-v-2 player custom combinations. For any league game, partner alliances are randomised fairly to pit Team A + Team B against Team C + Team D. Alliances rotate match-to-match.</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-200 font-extrabold font-sans uppercase tracking-wider block">2. Scoring Accumulation</span>
                      <p>Winning alliances score +2 Points & +1 Win for both partner teams in the league table standings! Losers receive 0 points. Individual bowler and batsman statistics compile into the MVP caps leaderboard automatically.</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-200 font-extrabold font-sans uppercase tracking-wider block">3. Championship Playoff Bracket</span>
                      <p>Upon league conclusion, generate playoffs from the top 4 seeds: Qualifier 1 (#1 vs #2), Eliminator (#3 vs #4), Qualifier 2 (Q1 loser vs Eliminator winner) and the Grand Final!</p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-850 space-y-1 mt-2 text-center font-sans tracking-wide">
                    <span className="text-sm">⭐️</span>
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase">Powered by LocalStorage sandbox state memory.</p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* SYSTEM BOTTOM TAB BAR (iOS Rounded Blurred Overlay) */}
        {!activeScoringMatch && (
          <div className="absolute bottom-0 left-0 right-0 h-[64px] bg-[#111115]/85 backdrop-blur-xl border-t border-white/[0.04] px-6 py-2.5 flex items-center justify-between z-20">
            {([
              { key: 'Standings', label: 'Standings', icon: Trophy },
              { key: 'Matches', label: 'Matches', icon: Calendar },
              { key: 'Admin', label: 'Admin', icon: Users },
              { key: 'About', label: 'Rules', icon: Info }
            ] as const).map((tab) => {
              const isSelected = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { handleIosTap(); setActiveTab(tab.key); }}
                  className="flex flex-col items-center justify-center space-y-0.5 flex-1 select-none focus:outline-none relative group"
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-active:scale-90 ${isSelected ? 'text-amber-500 fill-amber-500/10' : 'text-zinc-500'}`} />
                    {isSelected && (
                      <motion.div 
                        layoutId="activeTabIndicatorDot" 
                        className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-amber-500 rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider transition-colors ${isSelected ? 'text-amber-500' : 'text-zinc-500'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* SYSTEM HOME INDICATOR PILL */}
        <div 
          className="hidden md:block absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/45 rounded-full z-30 cursor-pointer hover:bg-white active:scale-95 transition-all"
          onClick={() => {
            synth.play('click');
            if (isHomeScreen) {
              setIsHomeScreen(false);
            } else {
              setIsHomeScreen(true);
            }
          }}
          title="Home Switch"
        />

      </div>

      {/* Decorative desktop-only prompt explaining physical interactions */}
      <div className="hidden md:flex flex-col items-center gap-2 mt-4 text-zinc-500 text-[10px] font-mono tracking-widest uppercase z-10 select-none">
        <span className="flex items-center gap-1.5 text-zinc-400">
          <Smartphone className="w-3.5 h-3.5 text-amber-500" />
          Interactive iPhone Simulator Active
        </span>
        <p className="text-zinc-500 text-center max-w-[340px] leading-relaxed">
          Click the <span className="text-zinc-300">Power Button</span> to sleep, the <span className="text-zinc-300">Home Bar</span> at the bottom to exit app, and slide down the <span className="text-zinc-300">Battery Status</span> to access settings!
        </p>
      </div>

    </div>
  );
}
