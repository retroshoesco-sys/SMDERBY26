import React, { useState } from 'react';
import { Match, Team, Player, Innings, BallEvent, DismissalType } from '../types';
import { ArrowLeft, RefreshCw, Undo, Wrench, ShieldAlert, CheckSquare, Award } from 'lucide-react';

interface ScorecardViewProps {
  match: Match;
  teams: Team[];
  players: Player[];
  onUpdateMatchState: (updatedMatch: Match) => void;
  onCloseScoring: () => void;
}

export default function ScorecardView({
  match,
  teams,
  players,
  onUpdateMatchState,
  onCloseScoring
}: ScorecardViewProps) {
  // Wicket Modal State
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<DismissalType>('Bowled');
  const [wicketBowlerId, setWicketBowlerId] = useState(match.firstInnings?.currentBowlerId || '');
  const [dismissedBatsmanId, setDismissedBatsmanId] = useState('');
  const [newBatsmanId, setNewBatsmanId] = useState('');

  // Selector states before innings start
  const [showStartSelectors, setShowStartSelectors] = useState(() => {
    // Show start screen if we don't have active innings elements set up yet
    const currentInnings = match.currentInningsIndex === 1 ? match.firstInnings : match.secondInnings;
    return !currentInnings || !currentInnings.currentBatsmanOnStrikeId || !currentInnings.currentBowlerId;
  });

  const [initialStriker, setInitialStriker] = useState('');
  const [initialNonStriker, setInitialNonStriker] = useState('');
  const [initialBowler, setInitialBowler] = useState('');

  const currentInningsIndex = match.currentInningsIndex;
  const isSecondInnings = currentInningsIndex === 2;

  // Active Innings helper
  const getActiveInnings = (): Innings => {
    if (currentInningsIndex === 1) {
      return match.firstInnings!;
    } else {
      return match.secondInnings!;
    }
  };

  const battingTeams = currentInningsIndex === 1 ? match.allianceA : match.allianceB;
  const bowlingTeams = currentInningsIndex === 1 ? match.allianceB : match.allianceA;

  // All players of batting alliance
  const battingPlayers = players.filter(p => battingTeams.includes(p.teamId));
  // All players of bowling alliance
  const bowlingPlayers = players.filter(p => bowlingTeams.includes(p.teamId));

  // Initialize Innings record the first time we start
  const handleStartInningsConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialStriker || !initialNonStriker || !initialBowler) {
      alert('Must select Striker, Non-Striker, and Bowler to commence!');
      return;
    }
    if (initialStriker === initialNonStriker) {
      alert('Striker and Non-Striker must be different players.');
      return;
    }

    const maxBalls = match.oversMax * 6;

    // Create empty stats mapping
    const bStats: any = {};
    battingPlayers.forEach(p => {
      bStats[p.id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    });

    const bowlStats: any = {};
    bowlingPlayers.forEach(p => {
      bowlStats[p.id] = { runsConceded: 0, ballsBowled: 0, wickets: 0 };
    });

    const newInnings: Innings = {
      battingAlliance: battingTeams,
      bowlingAlliance: bowlingTeams,
      runs: 0,
      wicketsCount: 0,
      ballsBowled: 0,
      maxBalls: maxBalls,
      batsmenStats: bStats,
      bowlersStats: bowlStats,
      history: [],
      currentBatsmanOnStrikeId: initialStriker,
      currentBatsmanOffStrikeId: initialNonStriker,
      currentBowlerId: initialBowler
    };

    const updatedMatch = { ...match };
    if (currentInningsIndex === 1) {
      updatedMatch.firstInnings = newInnings;
    } else {
      updatedMatch.secondInnings = newInnings;
    }
    updatedMatch.status = 'live';

    onUpdateMatchState(updatedMatch);
    setShowStartSelectors(false);
  };

  // Skip or reset bowler setup at the top of an over
  const [showBowlerSelectModal, setShowBowlerSelectModal] = useState(false);
  const [nextBowlerId, setNextBowlerId] = useState('');

  const initiateBowlerSwap = () => {
    setShowBowlerSelectModal(true);
  };

  const confirmBowlerSwap = () => {
    if (!nextBowlerId) return;
    const updatedMatch = { ...match };
    const innings = getActiveInnings();
    innings.currentBowlerId = nextBowlerId;
    
    // Ensure bowler stats exists
    if (!innings.bowlersStats[nextBowlerId]) {
      innings.bowlersStats[nextBowlerId] = { runsConceded: 0, ballsBowled: 0, wickets: 0 };
    }

    onUpdateMatchState(updatedMatch);
    setShowBowlerSelectModal(false);
    setNextBowlerId('');
  };

  // Score ball trigger
  const scoreBall = (type: BallEvent['type'], runs: number = 0) => {
    const updatedMatch = { ...match };
    const innings = currentInningsIndex === 1 ? updatedMatch.firstInnings! : updatedMatch.secondInnings!;
    
    // Backup state for Undo layer (shallow clone history)
    const backupHistory = JSON.stringify(innings);

    const strikerId = innings.currentBatsmanOnStrikeId;
    const bowlerId = innings.currentBowlerId;

    if (!innings.batsmenStats[strikerId]) {
      innings.batsmenStats[strikerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    }
    if (!innings.bowlersStats[bowlerId]) {
      innings.bowlersStats[bowlerId] = { runsConceded: 0, ballsBowled: 0, wickets: 0 };
    }

    const bStat = innings.batsmenStats[strikerId];
    const bowlStat = innings.bowlersStats[bowlerId];

    const ballId = `ball-${Date.now()}-${Math.random()}`;
    const newBall: BallEvent = {
      id: ballId,
      type,
      runs,
      batsmanId: strikerId,
      bowlerId: bowlerId
    };

    if (type === 'legal') {
      // Runs go to batsman
      bStat.runs += runs;
      bStat.balls += 1;
      if (runs === 4) bStat.fours += 1;
      if (runs === 6) bStat.sixes += 1;

      // Runs go to bowler & balls
      bowlStat.runsConceded += runs;
      bowlStat.ballsBowled += 1;

      innings.runs += runs;
      innings.ballsBowled += 1;

      // Strike rotation for 1 or 3 runs
      if (runs === 1 || runs === 3) {
        const temp = innings.currentBatsmanOnStrikeId;
        innings.currentBatsmanOnStrikeId = innings.currentBatsmanOffStrikeId;
        innings.currentBatsmanOffStrikeId = temp;
      }
    } else if (type === 'wide') {
      // Extras! Bowler runs conceded, but no legal ball
      innings.runs += (1 + runs); // Default wide is 1 run, plus any additional runs run
      bowlStat.runsConceded += (1 + runs);
    } else if (type === 'noball') {
      // Extras! Batsman faces delivery but not legal ball
      bStat.balls += 1;
      bStat.runs += runs; // Runs off bat go to batsman
      if (runs === 4) bStat.fours += 1;
      if (runs === 6) bStat.sixes += 1;

      innings.runs += (1 + runs); // 1 extra run + runs scored
      bowlStat.runsConceded += (1 + runs);
    } else if (type === 'bye' || type === 'legbye') {
      // Extras to alliance, legal delivery to bowler and strike swap
      innings.runs += runs;
      innings.ballsBowled += 1;
      
      bStat.balls += 1;
      bowlStat.ballsBowled += 1;

      if (runs === 1 || runs === 3) {
        const temp = innings.currentBatsmanOnStrikeId;
        innings.currentBatsmanOnStrikeId = innings.currentBatsmanOffStrikeId;
        innings.currentBatsmanOffStrikeId = temp;
      }
    }

    // Capture state backup in event history
    (newBall as any).backupState = backupHistory;
    innings.history.push(newBall);

    // Swap strike automatically at the end of a completed over (6 legal balls)
    if (type === 'legal' || type === 'bye' || type === 'legbye') {
      if (innings.ballsBowled % 6 === 0 && innings.ballsBowled > 0) {
        // End of over strike rotation!
        const temp = innings.currentBatsmanOnStrikeId;
        innings.currentBatsmanOnStrikeId = innings.currentBatsmanOffStrikeId;
        innings.currentBatsmanOffStrikeId = temp;

        alert(`Over Completed! Select next bowler.`);
        initiateBowlerSwap();
      }
    }

    // Check innings completed
    checkInningsOverAndTarget(updatedMatch);
  };

  // Trigger Wicket scoring window
  const startWicketScoring = () => {
    const innings = getActiveInnings();
    setDismissedBatsmanId(innings.currentBatsmanOnStrikeId);
    setWicketBowlerId(innings.currentBowlerId);

    // Work out remaining batsman list who have not batted and are not current
    const activeIds = [innings.currentBatsmanOnStrikeId, innings.currentBatsmanOffStrikeId];
    const battedIds = Object.keys(innings.batsmenStats).filter(id => innings.batsmenStats[id].out);
    const availablePlayers = battingPlayers.filter(p => !activeIds.includes(p.id) && !battedIds.includes(p.id));
    
    if (availablePlayers.length > 0) {
      setNewBatsmanId(availablePlayers[0].id);
    } else {
      setNewBatsmanId('ALL_OUT');
    }

    setShowWicketModal(true);
  };

  const submitWicket = () => {
    if (!dismissedBatsmanId) return;

    const updatedMatch = { ...match };
    const innings = currentInningsIndex === 1 ? updatedMatch.firstInnings! : updatedMatch.secondInnings!;
    
    // Save state for undo
    const backupHistory = JSON.stringify(innings);

    const strikerId = innings.currentBatsmanOnStrikeId;
    const nonStrikerId = innings.currentBatsmanOffStrikeId;
    const bowlerId = innings.currentBowlerId;

    // Apply wicket count
    innings.wicketsCount += 1;
    innings.ballsBowled += 1;

    // Record ball event in history
    const ballId = `ball-${Date.now()}-${Math.random()}`;
    const newBall: BallEvent = {
      id: ballId,
      type: 'wicket',
      runs: 0,
      batsmanId: dismissedBatsmanId,
      bowlerId: bowlerId,
      wicketDetail: {
        type: wicketType,
        dismissedBatsmanId: dismissedBatsmanId,
        bowlerId: wicketType !== 'Run Out' ? wicketBowlerId : undefined,
        newBatsmanId: newBatsmanId
      }
    };

    // Batsman faced increments
    if (!innings.batsmenStats[dismissedBatsmanId]) {
      innings.batsmenStats[dismissedBatsmanId] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    }
    innings.batsmenStats[dismissedBatsmanId].out = true;
    innings.batsmenStats[dismissedBatsmanId].balls += 1;
    innings.batsmenStats[dismissedBatsmanId].dismissalType = wicketType;
    if (wicketType !== 'Run Out') {
      innings.batsmenStats[dismissedBatsmanId].bowlerId = wicketBowlerId;
    }

    // Bowler gets wicket credit if bowler-credited dismissal
    if (wicketType !== 'Run Out') {
      const bWicketId = wicketBowlerId || bowlerId;
      if (!innings.bowlersStats[bWicketId]) {
        innings.bowlersStats[bWicketId] = { runsConceded: 0, ballsBowled: 0, wickets: 0 };
      }
      innings.bowlersStats[bWicketId].wickets += 1;
    }

    // Bowler stats balls update
    if (!innings.bowlersStats[bowlerId]) {
      innings.bowlersStats[bowlerId] = { runsConceded: 0, ballsBowled: 0, wickets: 0 };
    }
    innings.bowlersStats[bowlerId].ballsBowled += 1;

    // Assign new batsman relative to who got out
    if (newBatsmanId && newBatsmanId !== 'ALL_OUT') {
      if (dismissedBatsmanId === strikerId) {
        innings.currentBatsmanOnStrikeId = newBatsmanId;
      } else {
        innings.currentBatsmanOffStrikeId = newBatsmanId;
      }
      innings.batsmenStats[newBatsmanId] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    }

    // Capture backup & save
    (newBall as any).backupState = backupHistory;
    innings.history.push(newBall);

    // Over completion check inside wicket falls
    if (innings.ballsBowled % 6 === 0 && innings.ballsBowled > 0) {
      const temp = innings.currentBatsmanOnStrikeId;
      innings.currentBatsmanOnStrikeId = innings.currentBatsmanOffStrikeId;
      innings.currentBatsmanOffStrikeId = temp;
      alert(`Over Completed on Wicket! Select next bowler.`);
      initiateBowlerSwap();
    }

    setShowWicketModal(false);
    checkInningsOverAndTarget(updatedMatch);
  };

  // Check state to transition or complete match
  const checkInningsOverAndTarget = (updatedMatch: Match) => {
    const innings = currentInningsIndex === 1 ? updatedMatch.firstInnings! : updatedMatch.secondInnings!;
    const maxBalls = innings.maxBalls;
    
    // Alliance All Out wickets limit:
    // League matches comprise of Alliances (2 teams, 4 players total) inside the lineup, meaning 3 wickets fall is All Out.
    // Playoff matches consist of Team vs Team (1 team, 2 players total), meaning 1 wicket is All Out!
    const allianceTeamCount = innings.battingAlliance.length;
    const wicketsLimit = allianceTeamCount === 2 ? 3 : 1; 

    const isAllOut = innings.wicketsCount >= wicketsLimit || Object.keys(innings.batsmenStats).filter(id => !innings.batsmenStats[id].out).length <= 1;
    const isOversCompleted = innings.ballsBowled >= maxBalls;

    if (currentInningsIndex === 1) {
      if (isAllOut || isOversCompleted) {
        // End of First Innings! Create Second Innings state
        alert(`First Innings Completed! Alliance A scored ${innings.runs}/${innings.wicketsCount}. Starting Target: ${innings.runs + 1}`);
        
        updatedMatch.currentInningsIndex = 2;
        // Seed seconde innings selectors
        setInitialStriker('');
        setInitialNonStriker('');
        setInitialBowler('');
        setShowStartSelectors(true);
      }
    } else {
      // Second Innings. Check if target achieved
      const firstInnings = updatedMatch.firstInnings!;
      const target = firstInnings.runs + 1;
      const targetAchieved = innings.runs >= target;

      if (targetAchieved || isAllOut || isOversCompleted) {
        // Match Finished!
        updatedMatch.status = 'completed';
        
        if (innings.runs >= target) {
          updatedMatch.winner = 'Alliance B';
          updatedMatch.resultSummary = `${getAllianceShort(match.allianceB)} won by ${wicketsLimit - innings.wicketsCount} wickets`;
        } else if (innings.runs < firstInnings.runs) {
          updatedMatch.winner = 'Alliance A';
          updatedMatch.resultSummary = `${getAllianceShort(match.allianceA)} won by ${firstInnings.runs - innings.runs} runs`;
        } else {
          updatedMatch.resultSummary = `Match tied!`;
        }
        
        alert(`Match Concluded! Winner: ${updatedMatch.winner}. Result: ${updatedMatch.resultSummary}`);
        onCloseScoring();
      }
    }

    onUpdateMatchState(updatedMatch);
  };

  // Undo Function
  const handleUndo = () => {
    const updatedMatch = { ...match };
    const innings = currentInningsIndex === 1 ? updatedMatch.firstInnings! : updatedMatch.secondInnings!;
    
    if (innings.history.length === 0) {
      alert('No balls available to undo in this innings.');
      return;
    }

    const lastBallArr = innings.history.slice(-1);
    if (lastBallArr.length > 0) {
      const backupStateStr = (lastBallArr[0] as any).backupState;
      if (backupStateStr) {
        const restoredInnings = JSON.parse(backupStateStr);
        if (currentInningsIndex === 1) {
          updatedMatch.firstInnings = restoredInnings;
        } else {
          updatedMatch.secondInnings = restoredInnings;
        }
        onUpdateMatchState(updatedMatch);
        alert('Last ball undone successfully.');
      }
    }
  };

  // Format Helper short names
  const getAllianceShort = (teamIds: string[]): string => {
    return teamIds.map(id => teams.find(t => t.id === id)?.shortName || 'TBD').join('+');
  };

  // Quick stats formatting
  const innings = getActiveInnings();

  return (
    <div className="space-y-6" id="ball-by-ball-scorer">
      {/* Upper header */}
      <div className="flex items-center justify-between bg-zinc-950 p-4 border border-zinc-850 rounded-2xl">
        <button
          id="back-to-fixtures-btn"
          onClick={onCloseScoring}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase font-mono"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Fixtures
        </button>

        <div className="text-center">
          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 p-0.5 px-2 rounded-full font-bold font-mono tracking-wider uppercase">
            {match.type} · {match.oversMax} Overs
          </span>
          <p className="text-xs font-mono font-bold text-zinc-500 mt-1 uppercase">
            {getAllianceShort(match.allianceA)} vs {getAllianceShort(match.allianceB)}
          </p>
        </div>

        <button
          id="undo-btn-header"
          onClick={handleUndo}
          disabled={showStartSelectors || !innings || innings.history.length === 0}
          className="flex items-center gap-1 text-xs font-bold font-mono text-amber-500 hover:text-amber-400 disabled:opacity-30 disabled:pointer-events-none uppercase"
        >
          <Undo className="w-3.5 h-3.5" /> Undo
        </button>
      </div>

      {showStartSelectors ? (
        /* Selector screen before loading the game */
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-1 pb-4 border-b border-zinc-805 border-zinc-800">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">COMMENCE INNINGS {currentInningsIndex}</h3>
            <p className="text-xs text-zinc-400">
              Batting alliance: <span className="font-bold text-indigo-400">{getAllianceShort(battingTeams)}</span> | Bowling alliance: <span className="font-bold text-rose-450 text-rose-400">{getAllianceShort(bowlingTeams)}</span>
            </p>
          </div>

          <form onSubmit={handleStartInningsConfirm} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xxs font-black text-zinc-400 font-mono uppercase tracking-wider mb-1">
                  Select Opening Batsman 1 (Striker)
                </label>
                <select
                  required
                  id="select-striker"
                  value={initialStriker}
                  onChange={(e) => setInitialStriker(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Striker --</option>
                  {battingPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({teams.find(t => t.id === p.teamId)?.shortName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xxs font-black text-zinc-400 font-mono uppercase tracking-wider mb-1">
                  Select Opening Batsman 2 (Non-Striker)
                </label>
                <select
                  required
                  id="select-nonstriker"
                  value={initialNonStriker}
                  onChange={(e) => setInitialNonStriker(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Non-Striker --</option>
                  {battingPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({teams.find(t => t.id === p.teamId)?.shortName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xxs font-black text-zinc-400 font-mono uppercase tracking-wider mb-1">
                  Select Opening Bowler
                </label>
                <select
                  required
                  id="select-opening-bowler"
                  value={initialBowler}
                  onChange={(e) => setInitialBowler(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose opening Bowler --</option>
                  {bowlingPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({teams.find(t => t.id === p.teamId)?.shortName})</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              id="confirm-commence-innings-btn"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl active:scale-[0.99] transition-all shadow-md mt-2"
            >
              Let's Bowl! Start Innings {currentInningsIndex}
            </button>
          </form>
        </div>
      ) : (
        /* Scorer Interactive Control Dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Scoring Widget */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Score Block */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-right">
                <span className="text-xxs font-black text-zinc-500 font-mono tracking-widest uppercase block">CRR</span>
                <span className="text-base font-black font-mono text-zinc-200">
                  {innings.ballsBowled > 0 ? ((innings.runs / innings.ballsBowled) * 6).toFixed(2) : '0.00'}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-[10px] font-black text-indigo-400 font-mono tracking-widest uppercase">
                  {currentInningsIndex === 1 ? '1ST INNINGS (ALLIANCE A)' : '2ND INNINGS (ALLIANCE B)'} ACTIVE
                </h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black font-mono text-zinc-100 tracking-tighter" id="innings-runs-wickets">
                    {innings.runs}/{innings.wicketsCount}
                  </span>
                  <span className="text-sm font-semibold font-mono text-zinc-400">
                    {Math.floor(innings.ballsBowled / 6)}.{innings.ballsBowled % 6} / {match.oversMax}.0 Overs
                  </span>
                </div>
              </div>

              {/* Second Innings Target Indicator */}
              {isSecondInnings && match.firstInnings && (
                <div className="mt-4 pt-4 border-t border-zinc-900 grid grid-cols-3 gap-2 text-center" id="second-innings-targets">
                  <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-850">
                    <span className="text-[9px] font-bold text-zinc-500 font-mono block uppercase">Target</span>
                    <span className="text-sm font-extrabold text-white font-mono">{match.firstInnings.runs + 1}</span>
                  </div>
                  <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-850">
                    <span className="text-[9px] font-bold text-zinc-500 font-mono block uppercase">To Win</span>
                    <span className="text-sm font-extrabold text-amber-500 font-mono">
                      {Math.max(0, (match.firstInnings.runs + 1) - innings.runs)}
                    </span>
                  </div>
                  <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-850">
                    <span className="text-[9px] font-bold text-zinc-500 font-mono block uppercase">Req R/R</span>
                    <span className="text-sm font-extrabold text-indigo-400 font-mono">
                      {((match.oversMax * 6) - innings.ballsBowled) > 0 
                        ? (((Math.max(0, (match.firstInnings.runs + 1) - innings.runs)) / ((match.oversMax * 6) - innings.ballsBowled)) * 6).toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Batsmen On Crease */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className={`p-4 rounded-xl border ${
                  innings.currentBatsmanOnStrikeId ? 'bg-zinc-950 border-amber-500/30 shadow-md shadow-amber-500/5' : 'bg-zinc-900/40 border-zinc-850'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-amber-500 font-bold uppercase flex items-center gap-1">
                      🏏 ON STRIKE
                    </span>
                    <h3 className="text-base font-black text-white mt-1">
                      {players.find(p => p.id === innings.currentBatsmanOnStrikeId)?.name || 'Striker'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-zinc-100">
                      {innings.batsmenStats[innings.currentBatsmanOnStrikeId]?.runs || 0}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 block">
                      ({innings.batsmenStats[innings.currentBatsmanOnStrikeId]?.balls || 0} balls)
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 text-xxs font-mono text-zinc-500 mt-2">
                  <span>4s: <strong>{innings.batsmenStats[innings.currentBatsmanOnStrikeId]?.fours || 0}</strong></span>
                  <span>6s: <strong>{innings.batsmenStats[innings.currentBatsmanOnStrikeId]?.sixes || 0}</strong></span>
                  <span>S/R: <strong>
                    {innings.batsmenStats[innings.currentBatsmanOnStrikeId]?.balls > 0 
                      ? ((innings.batsmenStats[innings.currentBatsmanOnStrikeId]?.runs / innings.batsmenStats[innings.currentBatsmanOnStrikeId]?.balls) * 100).toFixed(1)
                      : '0.0'}
                  </strong></span>
                </div>
              </div>

              <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-zinc-500 font-bold uppercase">
                      ⚓ NON-STRIKER
                    </span>
                    <h3 className="text-base font-black text-zinc-300 mt-1">
                      {players.find(p => p.id === innings.currentBatsmanOffStrikeId)?.name || 'Non-Striker'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-zinc-300">
                      {innings.batsmenStats[innings.currentBatsmanOffStrikeId]?.runs || 0}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 block">
                      ({innings.batsmenStats[innings.currentBatsmanOffStrikeId]?.balls || 0} balls)
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 text-xxs font-mono text-zinc-500 mt-2">
                  <span>4s: <strong>{innings.batsmenStats[innings.currentBatsmanOffStrikeId]?.fours || 0}</strong></span>
                  <span>6s: <strong>{innings.batsmenStats[innings.currentBatsmanOffStrikeId]?.sixes || 0}</strong></span>
                  <span>S/R: <strong>
                    {innings.batsmenStats[innings.currentBatsmanOffStrikeId]?.balls > 0 
                      ? ((innings.batsmenStats[innings.currentBatsmanOffStrikeId]?.runs / innings.batsmenStats[innings.currentBatsmanOffStrikeId]?.balls) * 100).toFixed(1)
                      : '0.0'}
                  </strong></span>
                </div>
              </div>
            </div>

            {/* Scorecard Control Keypads */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
              <span className="text-xxs font-black text-zinc-400 font-mono tracking-widest uppercase block">
                🔴 BALL-BY-BALL SCORER KEYPAD
              </span>

              {/* Legal runs input keypad */}
              <div>
                <label className="text-[9px] font-semibold font-mono text-zinc-500 uppercase tracking-widest block mb-1">Standard Batsman Runs</label>
                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 6].map(run => (
                    <button
                      key={run}
                      id={`score-runs-${run}`}
                      onClick={() => scoreBall('legal', run)}
                      className={`py-3 font-black text-xs font-mono border rounded-xl active:scale-[0.98] transition-all ${
                        run === 4 ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30' :
                        run === 6 ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 hover:bg-amber-500/30' :
                        'bg-zinc-950 border-zinc-850 text-zinc-200 hover:bg-zinc-850'
                      }`}
                    >
                      {run}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra runs keypad row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  id="score-wide-btn"
                  onClick={() => scoreBall('wide', 0)}
                  className="py-2.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-350 rounded-xl text-xxs font-black uppercase font-mono"
                  title="Adds 1 extra, no ball bowled"
                >
                  Wide (+1)
                </button>
                <button
                  id="score-noball-btn"
                  onClick={() => scoreBall('noball', 0)}
                  className="py-2.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-350 rounded-xl text-xxs font-black uppercase font-mono"
                  title="Adds 1 extra, ball faced by batsman"
                >
                  No Ball (+1)
                </button>
                <button
                  id="score-byes-btn"
                  onClick={() => {
                    const extraRuns = parseInt(prompt('Specify runs scored off byes (e.g. 1, 2, 3):') || '1') || 1;
                    scoreBall('bye', extraRuns);
                  }}
                  className="py-2.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-350 rounded-xl text-xxs font-black uppercase font-mono"
                >
                  Bye Runs
                </button>
                <button
                  id="score-legbyes-btn"
                  onClick={() => {
                    const extraRuns = parseInt(prompt('Specify runs scored off leg byes (e.g. 1, 2, 3):') || '1') || 1;
                    scoreBall('legbye', extraRuns);
                  }}
                  className="py-2.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-350 rounded-xl text-xxs font-black uppercase font-mono"
                >
                  Leg Bye
                </button>
              </div>

              {/* Special Events Keypad */}
              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-zinc-800/60">
                <button
                  id="score-wicket-btn"
                  onClick={startWicketScoring}
                  className="py-3 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  💥 OUT / WICKET!
                </button>
                <button
                  id="end-over-btn-manual"
                  onClick={initiateBowlerSwap}
                  className="py-3 border border-zinc-750 hover:border-zinc-600 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 font-bold uppercase text-xxs tracking-wider rounded-xl transition-all"
                >
                  🔄 Skip Bowler / End Over
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Bowler card & Ball History Stream */}
          <div className="space-y-6">
            
            {/* Active Bowler Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
              <span className="text-xxs font-black text-rose-400 font-mono tracking-widest uppercase block">
                ⚾ ACTIVE BOWLER
              </span>
              <div className="flex justify-between items-center bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl">
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    {players.find(p => p.id === innings.currentBowlerId)?.name || 'Bowler'}
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    Overs: {Math.floor((innings.bowlersStats[innings.currentBowlerId]?.ballsBowled || 0) / 6)}.{ (innings.bowlersStats[innings.currentBowlerId]?.ballsBowled || 0) % 6 }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400 font-semibold font-mono">
                    Wickets: <strong className="text-blue-400">{innings.bowlersStats[innings.currentBowlerId]?.wickets || 0}</strong>
                  </p>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    Runs conc: <strong className="text-zinc-300">{innings.bowlersStats[innings.currentBowlerId]?.runsConceded || 0}</strong>
                  </p>
                </div>
              </div>
              <button
                id="change-bowler-btn"
                onClick={initiateBowlerSwap}
                className="w-full py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-755 text-zinc-400 hover:text-white rounded-xl text-xxs font-bold uppercase tracking-wider transition-all"
              >
                Swap / Change Bowler
              </button>
            </div>

            {/* Ball History Live stream (over-by-over representation) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-3">
              <span className="text-xxs font-black text-zinc-400 font-mono tracking-widest uppercase block">
                🎞️ LIVE OVER DELIVERY STREAM
              </span>

              <div className="flex flex-wrap gap-2.5 max-h-36 overflow-y-auto p-1 bg-zinc-950 border border-zinc-850 rounded-xl text-center">
                {innings.history.length === 0 ? (
                  <span className="text-[10px] text-zinc-650 font-mono p-4 block mx-auto">First over commencing. No deliveries recorded yet...</span>
                ) : (
                  [...innings.history].reverse().slice(0, 15).map((b, idx) => {
                    let text = b.runs.toString();
                    let color = 'bg-zinc-900 text-zinc-400 border border-zinc-800';

                    if (b.type === 'wicket') {
                      text = 'W';
                      color = 'bg-rose-600 text-white font-extrabold shadow-md shadow-rose-500/10 border-0';
                    } else if (b.type === 'wide') {
                      text = 'Wd';
                      color = 'bg-indigo-950 text-indigo-400 border border-indigo-900';
                    } else if (b.type === 'noball') {
                      text = 'Nb';
                      color = 'bg-indigo-950 text-indigo-400 border border-indigo-900';
                    } else if (b.type === 'bye') {
                      text = `${b.runs}B`;
                      color = 'bg-zinc-900 text-zinc-300 border border-zinc-820';
                    } else if (b.type === 'legbye') {
                      text = `${b.runs}Lb`;
                      color = 'bg-zinc-900 text-zinc-300 border border-zinc-820';
                    } else if (b.runs === 4) {
                      color = 'bg-indigo-600 text-white font-extrabold shadow-sm';
                    } else if (b.runs === 6) {
                      color = 'bg-amber-500 text-slate-950 font-black shadow-md';
                    }

                    return (
                      <div
                        key={b.id}
                        title={`Batsman: ${players.find(p => p.id === b.batsmanId)?.name || 'Striker'} | Bowler: ${players.find(p => p.id === b.bowlerId)?.name || 'Bowler'}`}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black font-mono transition-transform hover:scale-105 shrink-0 ${color}`}
                      >
                        {text}
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-[9px] text-zinc-500 font-mono block">Shows 15 latest balls (newest first). Hover on a delivery bubble to view striker & bowler names.</p>
            </div>

          </div>
        </div>
      )}

      {/* Bowler Selection Modal overlay */}
      {showBowlerSelectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <div className="flex gap-2 items-center text-zinc-100 mb-2">
              <span className="p-1 bg-amber-505/10 text-amber-500 border border-amber-500/25 rounded">🔄</span>
              <h3 className="font-black text-sm uppercase tracking-tight">Select Next Bowler</h3>
            </div>
            
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {bowlingPlayers.map(p => {
                const isCurrent = p.id === innings.currentBowlerId;
                const bStats = innings.bowlersStats[p.id];
                const overs = bStats ? `${Math.floor((bStats.ballsBowled || 0) / 6)}.${(bStats.ballsBowled || 0) % 6}` : '0.0';
                
                return (
                  <button
                    key={p.id}
                    id={`bowler-swap-option-${p.id}`}
                    onClick={() => setNextBowlerId(p.id)}
                    className={`w-full p-2.5 rounded-lg border text-left flex justify-between items-center text-xs font-bold transition-all ${
                      nextBowlerId === p.id 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : isCurrent
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:border-zinc-700'
                    }`}
                    disabled={isCurrent}
                  >
                    <span>{p.name} {isCurrent && '(Finished Over)'}</span>
                    <span className="text-[10px] text-zinc-500 font-mono font-semibold">Overs: {overs}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2.5">
              <button
                type="button"
                onClick={() => setShowBowlerSelectModal(false)}
                className="flex-1 py-2 border border-zinc-800 text-zinc-400 rounded-lg text-xxs font-bold uppercase tracking-wider"
              >
                Dismiss
              </button>
              <button
                type="button"
                id="next-bowler-confirm-btn"
                onClick={confirmBowlerSwap}
                disabled={!nextBowlerId}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 font-black text-zinc-950 rounded-lg text-xxs uppercase tracking-wider disabled:opacity-30 disabled:pointer-events-none"
              >
                Confirm Bowler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wicket Input Modal Entry form */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex gap-2 items-center text-zinc-100 border-b border-zinc-800 pb-2 mb-2">
              <span className="p-1 bg-rose-600/10 text-rose-500 border border-rose-500/25 rounded">💥</span>
              <h3 className="font-black text-sm uppercase tracking-tight">Record Wicket Dismissal</h3>
            </div>

            <div className="space-y-4">
              {/* Dismissal Category dropdown */}
              <div>
                <label className="block text-xxs font-black text-zinc-450 font-mono uppercase tracking-wider mb-1.5">
                  Dismissal Type
                </label>
                <select
                  required
                  id="wicket-type-select"
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value as DismissalType)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Bowled">Bowled</option>
                  <option value="Caught">Caught</option>
                  <option value="LBW">LBW</option>
                  <option value="Run Out">Run Out</option>
                  <option value="Stumped">Stumped</option>
                </select>
              </div>

              {/* Who Got Out Selector */}
              <div>
                <label className="block text-xxs font-black text-zinc-450 font-mono uppercase tracking-wider mb-1.5">
                  Who was Dismissed?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="wicket-striker-out"
                    onClick={() => setDismissedBatsmanId(innings.currentBatsmanOnStrikeId)}
                    className={`p-3 rounded-lg border text-left text-xs font-bold ${
                      dismissedBatsmanId === innings.currentBatsmanOnStrikeId
                        ? 'bg-rose-550/10 border-rose-500 text-rose-400'
                        : 'bg-zinc-950 border-zinc-850 text-zinc-400'
                    }`}
                  >
                    Striker: {players.find(p => p.id === innings.currentBatsmanOnStrikeId)?.name}
                  </button>
                  <button
                    type="button"
                    id="wicket-nonstriker-out"
                    onClick={() => setDismissedBatsmanId(innings.currentBatsmanOffStrikeId)}
                    className={`p-3 rounded-lg border text-left text-xs font-bold ${
                      dismissedBatsmanId === innings.currentBatsmanOffStrikeId
                        ? 'bg-rose-550/10 border-rose-500 text-rose-400'
                        : 'bg-zinc-950 border-zinc-850 text-zinc-400'
                    }`}
                  >
                    Non-Striker: {players.find(p => p.id === innings.currentBatsmanOffStrikeId)?.name}
                  </button>
                </div>
              </div>

              {/* Wicket Credited Bowler (except Run Out) */}
              {wicketType !== 'Run Out' && (
                <div>
                  <label className="block text-xxs font-black text-zinc-450 font-mono uppercase tracking-wider mb-1.5">
                    Wicket Credit Bowler
                  </label>
                  <select
                    id="wicket-bowler-select"
                    value={wicketBowlerId}
                    onChange={(e) => setWicketBowlerId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {bowlingPlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Incoming Batsman selection */}
              <div>
                <label className="block text-xxs font-black text-zinc-450 font-mono uppercase tracking-wider mb-1.5">
                  Select Next Batsman
                </label>
                {newBatsmanId === 'ALL_OUT' ? (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl font-mono">
                    ⚠️ No further batsmen left in this alliance roster. Alliance will be ALL OUT upon recording this wicket.
                  </div>
                ) : (
                  <select
                    id="wicket-incoming-batsman-select"
                    value={newBatsmanId}
                    onChange={(e) => setNewBatsmanId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {battingPlayers
                      .filter(p => p.id !== innings.currentBatsmanOnStrikeId && p.id !== innings.currentBatsmanOffStrikeId && !innings.batsmenStats[p.id]?.out)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))
                    }
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="flex-1 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase font-mono"
              >
                Dismiss
              </button>
              <button
                type="button"
                id="submit-wicket-confirm-btn"
                onClick={submitWicket}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg text-xs uppercase tracking-wider transition-all"
              >
                Record Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
