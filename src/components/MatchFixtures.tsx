import React, { useState } from 'react';
import { Match, Team, MatchFormat } from '../types';
import { PlayCircle, Plus, Calendar, Trophy, GitMerge, ChevronRight, CheckCircle2, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import AllianceGenerator from './AllianceGenerator';

interface MatchFixturesProps {
  matches: Match[];
  teams: Team[];
  alliancePairs: any; // AlliancePair[]
  onCreateMatch: (type: MatchFormat, allianceA: string[], allianceB: string[], oversMax: number) => void;
  onSelectMatchToScore: (matchId: string) => void;
  onGeneratePlayoffs: () => void;
  onDeleteMatch: (matchId: string) => void;
}

export default function MatchFixtures({
  matches,
  teams,
  alliancePairs,
  onCreateMatch,
  onSelectMatchToScore,
  onGeneratePlayoffs,
  onDeleteMatch
}: MatchFixturesProps) {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'create' | 'playoffs'>('fixtures');

  // Manual Match Form States
  const [matchType, setMatchType] = useState<MatchFormat>('League');
  const [allianceATeam1, setAllianceATeam1] = useState('');
  const [allianceATeam2, setAllianceATeam2] = useState('');
  const [allianceBTeam1, setAllianceBTeam1] = useState('');
  const [allianceBTeam2, setAllianceBTeam2] = useState('');
  const [customOvers, setCustomOvers] = useState(8);

  const handleManualCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allianceATeam1 || !allianceBTeam1) {
      alert('Please fill out Alliance teams.');
      return;
    }

    const allianceA = [allianceATeam1];
    if (allianceATeam2) allianceA.push(allianceATeam2);

    const allianceB = [allianceBTeam1];
    if (allianceBTeam2) allianceB.push(allianceBTeam2);

    // Ensure no team is in both alliances
    const allSelected = [...allianceA, ...allianceB];
    const duplicates = allSelected.filter((item, index) => allSelected.indexOf(item) !== index);
    if (duplicates.length > 0) {
      alert('A team cannot play in both alliances or be repeated.');
      return;
    }

    onCreateMatch(matchType, allianceA, allianceB, customOvers);
    setActiveTab('fixtures');

    // Reset Form
    setAllianceATeam1('');
    setAllianceATeam2('');
    setAllianceBTeam1('');
    setAllianceBTeam2('');
  };

  const handleAllianceGeneratorApply = (allianceA: string[], allianceB: string[]) => {
    setAllianceATeam1(allianceA[0] || '');
    setAllianceATeam2(allianceA[1] || '');
    setAllianceBTeam1(allianceB[0] || '');
    setAllianceBTeam2(allianceB[1] || '');
    alert('Alliances generated and pre-populated below!');
  };

  // Helper to format alliance names nicely
  const getAllianceName = (teamIds: string[]): string => {
    if (teamIds.includes('PLACEHOLDER_Q1_LOSER')) return 'Q1 Loser';
    if (teamIds.includes('PLACEHOLDER_ELIM_WINNER')) return 'Eliminator Winner';
    if (teamIds.includes('PLACEHOLDER_Q1_WINNER')) return 'Q1 Winner';
    if (teamIds.includes('PLACEHOLDER_Q2_WINNER')) return 'Q2 Winner';

    return teamIds
      .map(id => teams.find(t => t.id === id)?.shortName || 'TBD')
      .join(' + ');
  };

  // Safe names helper for hovering/expanded view
  const getAllianceFullNames = (teamIds: string[]): string => {
    if (teamIds.includes('PLACEHOLDER_Q1_LOSER')) return 'Loser of Qualifier 1';
    if (teamIds.includes('PLACEHOLDER_ELIM_WINNER')) return 'Winner of Eliminator';
    if (teamIds.includes('PLACEHOLDER_Q1_WINNER')) return 'Winner of Qualifier 1';
    if (teamIds.includes('PLACEHOLDER_Q2_WINNER')) return 'Winner of Qualifier 2';

    return teamIds
      .map(id => teams.find(t => t.id === id)?.name || 'TBD')
      .join(' and ');
  };

  // Filter matches
  const leagueMatches = matches.filter(m => m.type === 'League');
  const playoffMatches = matches.filter(m => m.type !== 'League');

  return (
    <div className="space-y-6" id="match-fixtures-section">
      {/* Tab Navigation header */}
      <div className="flex border-b border-zinc-800 bg-zinc-950 p-1.5 rounded-xl gap-1">
        <button
          id="fixtures-tab-btn"
          onClick={() => setActiveTab('fixtures')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'fixtures'
              ? 'bg-zinc-850 text-white border border-zinc-750 font-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📅 Tournament Fixtures ({matches.length})
        </button>
        <button
          id="create-tab-btn"
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'create'
              ? 'bg-zinc-850 text-white border border-zinc-750 font-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          🏏 Create Match / Generator
        </button>
        <button
          id="playoffs-tab-btn"
          onClick={() => setActiveTab('playoffs')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'playoffs'
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25 font-black animate-pulse'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          🏆 Playoffs Ladder
        </button>
      </div>

      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          {/* Playoffs Category */}
          {playoffMatches.length > 0 && (
            <div className="space-y-3">
              <span className="text-xxs font-black text-amber-500 font-mono uppercase tracking-widest block bg-amber-500/5 p-1 px-3 border border-amber-500/20 rounded-md w-max">
                🏆 CHAMPIONSHIP PLAYOFFS
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playoffMatches.map((match) => (
                  <div
                    key={match.id}
                    id={`match-fixture-playoff-${match.id}`}
                    className={`bg-zinc-900 border ${
                      match.status === 'live' ? 'border-amber-500/80 ring-2 ring-amber-500/10' :
                      match.status === 'completed' ? 'border-zinc-800' : 'border-zinc-850'
                    } rounded-2xl p-5 shadow-lg flex flex-col justify-between`}
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-850 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="p-1 px-2.5 bg-amber-500 text-slate-950 font-mono text-xxs font-black rounded uppercase">
                          {match.type}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">{match.date}</span>
                      </div>

                      {match.status === 'completed' ? (
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" /> FINISHED
                        </span>
                      ) : match.status === 'live' ? (
                        <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded animate-pulse font-mono flex items-center gap-1">
                          ● SCORING LIVE
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-mono">SCHEDULED</span>
                      )}
                    </div>

                    <div className="grid grid-cols-7 items-center justify-center gap-2 text-center pb-4">
                      <div className="col-span-3">
                        <p className="text-lg font-black text-zinc-100 font-sans tracking-tight">
                          {getAllianceName(match.allianceA)}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {getAllianceFullNames(match.allianceA)}
                        </p>
                        {match.status === 'completed' && match.firstInnings && (
                          <p className="text-base font-black text-amber-500 font-mono mt-2">
                            {match.firstInnings.runs}/{match.firstInnings.wicketsCount} <span className="text-xs text-zinc-400 font-normal">({Math.floor(match.firstInnings.ballsBowled / 6)}.{match.firstInnings.ballsBowled % 6})</span>
                          </p>
                        )}
                      </div>

                      <div className="col-span-1 text-xxs font-mono text-zinc-500 lowercase">vs</div>

                      <div className="col-span-3">
                        <p className="text-lg font-black text-zinc-100 font-sans tracking-tight">
                          {getAllianceName(match.allianceB)}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {getAllianceFullNames(match.allianceB)}
                        </p>
                        {match.status === 'completed' && match.secondInnings && (
                          <p className="text-base font-black text-amber-500 font-mono mt-2">
                            {match.secondInnings.runs}/{match.secondInnings.wicketsCount} <span className="text-xs text-zinc-400 font-normal">({Math.floor(match.secondInnings.ballsBowled / 6)}.{match.secondInnings.ballsBowled % 6})</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-850 mt-auto">
                      <span className="text-xxs font-mono text-zinc-500 uppercase tracking-widest">
                        Overs: {match.oversMax}O
                      </span>

                      {match.status === 'completed' ? (
                        <p className="text-xs font-extrabold text-emerald-400 font-sans italic">
                          🏆 {match.resultSummary}
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            id={`delete-match-btn-${match.id}`}
                            onClick={() => {
                              if (confirm('Delete this match fixture?')) {
                                onDeleteMatch(match.id);
                              }
                            }}
                            className="p-1 px-2.5 rounded-lg border border-zinc-800 text-rose-500 hover:bg-rose-950/20 text-xxs font-bold transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`score-match-btn-${match.id}`}
                            onClick={() => onSelectMatchToScore(match.id)}
                            className="p-1 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xxs font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            {match.status === 'live' ? 'Resume Scoring' : 'Start Scoring'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* League Section */}
          <div className="space-y-3">
            <span className="text-xxs font-black text-indigo-400 font-mono uppercase tracking-widest block bg-indigo-500/5 p-1 px-3 border border-indigo-500/20 rounded-md w-max">
              🏏 Scheduled League Matches
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leagueMatches.map((match) => (
                <div
                  key={match.id}
                  id={`match-fixture-league-${match.id}`}
                  className={`bg-zinc-900 border ${
                    match.status === 'live' ? 'border-amber-500/80 ring-2 ring-amber-500/10' :
                    match.status === 'completed' ? 'border-zinc-800' : 'border-zinc-850'
                  } rounded-2xl p-5 shadow-md flex flex-col justify-between`}
                >
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-850 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-2.5 bg-zinc-800 font-mono text-xxs text-zinc-400 font-bold rounded uppercase">
                        LEAGUE
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{match.date}</span>
                    </div>

                    {match.status === 'completed' ? (
                      <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                      </span>
                    ) : match.status === 'live' ? (
                      <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded animate-pulse font-mono flex items-center gap-1">
                        ● SCORING LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-mono">SCHEDULED</span>
                    )}
                  </div>

                  <div className="grid grid-cols-7 items-center justify-center gap-2 text-center pb-4">
                    <div className="col-span-3">
                      <p className="text-lg font-black text-zinc-100 font-sans tracking-tight">
                        {getAllianceName(match.allianceA)}
                      </p>
                      <p className="text-[10px] text-zinc-450 mt-0.5 uppercase tracking-wide">
                        {getAllianceFullNames(match.allianceA)}
                      </p>
                      {match.status === 'completed' && match.firstInnings && (
                        <p className="text-sm font-black text-zinc-300 font-mono mt-1.5">
                          {match.firstInnings.runs}/{match.firstInnings.wicketsCount} <span className="text-xs text-zinc-500 font-normal">({Math.floor(match.firstInnings.ballsBowled / 6)}.{match.firstInnings.ballsBowled % 6})</span>
                        </p>
                      )}
                    </div>

                    <div className="col-span-1 text-xxs font-mono text-zinc-650 font-bold uppercase">VS</div>

                    <div className="col-span-3">
                      <p className="text-lg font-black text-zinc-100 font-sans tracking-tight">
                        {getAllianceName(match.allianceB)}
                      </p>
                      <p className="text-[10px] text-zinc-450 mt-0.5 uppercase tracking-wide">
                        {getAllianceFullNames(match.allianceB)}
                      </p>
                      {match.status === 'completed' && match.secondInnings && (
                        <p className="text-sm font-black text-zinc-300 font-mono mt-1.5">
                          {match.secondInnings.runs}/{match.secondInnings.wicketsCount} <span className="text-xs text-zinc-500 font-normal">({Math.floor(match.secondInnings.ballsBowled / 6)}.{match.secondInnings.ballsBowled % 6})</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-850 mt-auto">
                    <span className="text-xxs font-mono text-zinc-500 uppercase tracking-widest">
                      OversMax: {match.oversMax} Overs
                    </span>

                    {match.status === 'completed' ? (
                      <p className="text-xs font-bold text-emerald-400 font-mono italic">
                        🏏 {match.resultSummary}
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          id={`delete-match-btn-${match.id}`}
                          onClick={() => {
                            if (confirm('Delete this match fixture?')) {
                              onDeleteMatch(match.id);
                            }
                          }}
                          className="p-1 px-2.5 rounded-lg border border-zinc-805 text-rose-500 hover:bg-rose-950/20 text-xxs font-bold transition-all border-zinc-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`score-match-btn-${match.id}`}
                          onClick={() => onSelectMatchToScore(match.id)}
                          className="p-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xxs font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          {match.status === 'live' ? 'Resume Scoring' : 'Score Ball-by-Ball'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {leagueMatches.length === 0 && (
                <div className="col-span-2 border border-zinc-800 p-8 rounded-2xl text-center text-zinc-500 text-xs font-medium">
                  No scheduled league games. Create a match manually or run the scramble generator!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Partnership Scramble Component embedded directly */}
          <AllianceGenerator
            teams={teams}
            alliancePairs={alliancePairs}
            onAllianceGenerated={handleAllianceGeneratorApply}
          />

          {/* Form to Manual Schedule Match */}
          <form 
            onSubmit={handleManualCreate}
            id="manual-create-match-form"
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800">
              <span className="p-1 bg-amber-500/10 rounded border border-amber-500/25 text-amber-500">
                <Plus className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-tight">Manual Match scheduler</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xxs font-bold text-zinc-400 font-mono uppercase tracking-wider mb-1.5">
                  Match Mode & Format
                </label>
                <select
                  id="form-match-type"
                  value={matchType}
                  onChange={(e) => {
                    const val = e.target.value as MatchFormat;
                    setMatchType(val);
                    if (val === 'Final') setCustomOvers(10);
                    else setCustomOvers(8);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="League">League Match (8 Overs)</option>
                  <option value="Qualifier 1">Qualifier 1 (8 Overs)</option>
                  <option value="Eliminator">Eliminator (8 Overs)</option>
                  <option value="Qualifier 2">Qualifier 2 (8 Overs)</option>
                  <option value="Final">Grand Final (10 Overs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xxs font-bold text-zinc-400 font-mono uppercase tracking-wider mb-1.5">
                  Innings Overs Limit
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  id="form-match-overs"
                  value={customOvers}
                  onChange={(e) => setCustomOvers(parseInt(e.target.value) || 8)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Alliance Selection selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
              {/* Alliance A */}
              <div className="space-y-3">
                <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase font-mono block">
                  🛡️ ALLIANCE A (Batting/Bowling)
                </span>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-zinc-500 font-mono uppercase tracking-wider mb-1">
                      Team 1 (Required)
                    </label>
                    <select
                      id="form-alliance-a-t1"
                      required
                      value={allianceATeam1}
                      onChange={(e) => setAllianceATeam1(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Choose Team A1 --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>
                      ))}
                    </select>
                  </div>

                  {matchType === 'League' && (
                    <div>
                      <label className="block text-[9px] font-semibold text-zinc-500 font-mono uppercase tracking-wider mb-1">
                        Team 2 (Optional - Alliance Partner)
                      </label>
                      <select
                        id="form-alliance-a-t2"
                        value={allianceATeam2}
                        onChange={(e) => setAllianceATeam2(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- No Alliance Partner (Single Team Only) --</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Alliance B */}
              <div className="space-y-3 sm:border-l sm:border-zinc-800 sm:pl-6">
                <span className="text-[10px] font-black tracking-widest text-rose-400 uppercase font-mono block">
                  🛡️ ALLIANCE B (Batting/Bowling)
                </span>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-zinc-500 font-mono uppercase tracking-wider mb-1">
                      Team 1 (Required)
                    </label>
                    <select
                      id="form-alliance-b-t1"
                      required
                      value={allianceBTeam1}
                      onChange={(e) => setAllianceBTeam1(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Choose Team B1 --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>
                      ))}
                    </select>
                  </div>

                  {matchType === 'League' && (
                    <div>
                      <label className="block text-[9px] font-semibold text-zinc-500 font-mono uppercase tracking-wider mb-1">
                        Team 2 (Optional - Alliance Partner)
                      </label>
                      <select
                        id="form-alliance-b-t2"
                        value={allianceBTeam2}
                        onChange={(e) => setAllianceBTeam2(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- No Alliance Partner (Single Team Only) --</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              id="schedule-match-confirm-btn"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl active:scale-[0.99] transition-all shadow-md mt-2"
            >
              Confirm and Schedule Match Fixture
            </button>
          </form>
        </div>
      )}

      {activeTab === 'playoffs' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/25 text-amber-500">
                  <Trophy className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Playoffs Ladder Management</h3>
                  <p className="text-xs text-zinc-400">Generate, view, and score the Championship Finals</p>
                </div>
              </div>

              <button
                id="generate-playoffs-btn"
                onClick={() => {
                  if (confirm('Generate standard Playoffs Q1 & Eliminator matches based on current standings? Existing scheduled playoff brackets will be overwritten.')) {
                    onGeneratePlayoffs();
                  }
                }}
                className="p-2 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow-lg shadow-amber-500/10"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate Playoffs Bracket
              </button>
            </div>

            {/* Playoffs Tournament Bracket Visual Board */}
            <div className="space-y-8 py-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                
                {/* Round 1: Q1 and Eliminator */}
                <div className="space-y-6 col-span-1">
                  <h4 className="text-xxs font-black text-zinc-400 tracking-widest uppercase font-mono pb-2 border-b border-zinc-800">
                    Round 1 (Semi-Finals)
                  </h4>

                  {/* Qualifier 1 card */}
                  <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3 relative">
                    <span className="text-[9px] font-mono font-bold text-amber-500 bg-amber-500/10 p-0.5 px-1.5 rounded uppercase">QUALIFIER 1</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded border border-zinc-850">
                        <span className="text-xs font-bold text-white">#1 Seed Team</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Standings #1</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded border border-zinc-850">
                        <span className="text-xs font-bold text-white">#2 Seed Team</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Standings #2</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-mono">Winner ➜ Straight to grand Final<br />Loser ➜ Qualifier 2</p>
                  </div>

                  {/* Eliminator card */}
                  <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-800 p-0.5 px-1.5 rounded uppercase">ELIMINATOR</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded border border-zinc-850">
                        <span className="text-xs font-bold text-white">#3 Seed Team</span>
                        <span className="text-[10px] text-zinc-500 font-mono font-bold">Standings #3</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded border border-zinc-850">
                        <span className="text-xs font-bold text-white">#4 Seed Team</span>
                        <span className="text-[10px] text-zinc-500 font-mono font-bold">Standings #4</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-mono">Winner ➜ Qualifier 2<br />Loser ➜ Eliminated</p>
                  </div>
                </div>

                {/* Round 2: Q2 */}
                <div className="space-y-6 col-span-1 flex flex-col justify-center">
                  <div className="hidden md:block absolute left-[30%] right-[65%] top-[50%] h-0.5 bg-zinc-800 z-0"></div>
                  <h4 className="text-xxs font-black text-zinc-400 tracking-widest uppercase font-mono pb-2 border-b border-zinc-800">
                    Round 2 (Rebound Final)
                  </h4>

                  <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3 z-10">
                    <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 p-0.5 px-1.5 rounded uppercase">QUALIFIER 2</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded border border-zinc-850">
                        <span className="text-xs font-semibold text-zinc-400">Loser Q1</span>
                        <span className="text-[9px] font-mono text-zinc-500">From Q1</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded border border-zinc-850">
                        <span className="text-xs font-semibold text-zinc-400">Winner Eliminator</span>
                        <span className="text-[9px] font-mono text-zinc-500">From Elim</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-mono font-bold">Winner ➜ Grand Final<br />Loser ➜ Finishes 3rd</p>
                  </div>
                </div>

                {/* Round 3: Grand final */}
                <div className="space-y-6 col-span-1 flex flex-col justify-center text-center">
                  <h4 className="text-xxs font-black text-zinc-400 tracking-widest uppercase font-mono pb-2 border-b border-zinc-800">
                    🏆 SUMMER LEAGUE CHAMPIONSHIP
                  </h4>

                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-700/5 to-slate-900 rounded-xl p-5 border border-amber-500/20 space-y-4">
                    <div className="flex justify-center">
                      <span className="text-2xl">👑</span>
                    </div>
                    <span className="text-[10px] font-mono font-black text-amber-500 tracking-widest uppercase block">GRAND FINAL</span>
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded border border-zinc-850">
                        <span className="text-xs font-semibold text-amber-400">Winner Q1</span>
                        <span className="text-[9px] text-zinc-500 font-mono">Finalist 1</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded border border-zinc-850">
                        <span className="text-xs font-semibold text-amber-500">Winner Q2</span>
                        <span className="text-[9px] text-zinc-500 font-mono">Finalist 2</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-400/80 font-mono leading-relaxed">
                      10 Overs Championship! The ultimate championship showdown to crown the summer champions of 2026.
                    </p>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-850">
              <span className="text-[10px] font-black text-zinc-400 font-mono uppercase block mb-1">
                📅 How Playoff Bracket works
              </span>
              <p className="text-xxs text-zinc-500 leading-relaxed font-mono">
                Click "Generate Playoffs Bracket" once you have enough completed league standings. This matches Standings #1 vs Standings #2 for Q1 and #3 vs #4 for the Eliminator. Scoring these matches automatically advances teams into Q2 and then the Grand Final!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
