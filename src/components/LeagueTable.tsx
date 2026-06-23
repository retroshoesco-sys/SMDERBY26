import React, { useState } from 'react';
import { Team, Player } from '../types';
import { Trophy, Award, Search, ArrowUpDown, Flame, Star } from 'lucide-react';

interface LeagueTableProps {
  teams: Team[];
  players: Player[];
}

export function calculateNRR(team: Team): number {
  const runsPerOverFaced = team.ballsFaced > 0 ? team.runsScored / (team.ballsFaced / 6) : 0;
  const runsPerOverConceded = team.ballsBowled > 0 ? team.runsConceded / (team.ballsBowled / 6) : 0;
  return runsPerOverFaced - runsPerOverConceded;
}

export function formatNRR(nrr: number): string {
  if (isNaN(nrr) || !isFinite(nrr)) return '0.000';
  const prefix = nrr > 0 ? '+' : '';
  return prefix + nrr.toFixed(3);
}

export default function LeagueTable({ teams, players }: LeagueTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [playerSortField, setPlayerSortField] = useState<keyof Player>('runs');
  const [playerSortAsc, setPlayerSortAsc] = useState(false);

  // Sort teams by Points, then NRR
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return calculateNRR(b) - calculateNRR(a);
  });

  // Find Red Cap and Blue Cap players
  const redCapPlayer = [...players].sort((a, b) => {
    if (b.runs !== a.runs) return b.runs - a.runs;
    // Tie breaker runs then higher Strike Rate
    const srA = a.ballsFaced > 0 ? (a.runs / a.ballsFaced) * 100 : 0;
    const srB = b.ballsFaced > 0 ? (b.runs / b.ballsFaced) * 100 : 0;
    return srB - srA;
  })[0];

  const blueCapPlayer = [...players].sort((a, b) => {
    if (b.wickets !== a.wickets) return b.wickets - a.wickets;
    // Tie breaker wickets then lower economy
    const econA = a.ballsBowled > 0 ? (a.runsConceded / (a.ballsBowled / 6)) : 999;
    const econB = b.ballsBowled > 0 ? (b.runsConceded / (b.ballsBowled / 6)) : 999;
    return econA - econB;
  })[0];

  // Sort and filter players for player leaderboard
  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teams.find(t => t.id === p.teamId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let valA = a[playerSortField];
    let valB = b[playerSortField];

    // Compute synthetic metrics for sort fields if selected
    if (playerSortField as any === 'sr') {
      valA = a.ballsFaced > 0 ? (a.runs / a.ballsFaced) * 100 : 0;
      valB = b.ballsFaced > 0 ? (b.runs / b.ballsFaced) * 100 : 0;
    } else if (playerSortField as any === 'econ') {
      valA = a.ballsBowled > 0 ? (a.runsConceded / (a.ballsBowled / 6)) : 999;
      valB = b.ballsBowled > 0 ? (b.runsConceded / (b.ballsBowled / 6)) : 999;
      // For economy lower is usually better, but keep toggled default direction
      return playerSortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    }

    if (typeof valA === 'string') {
      const sA = valA as string;
      const sB = valB as string;
      return playerSortAsc ? sA.localeCompare(sB) : sB.localeCompare(sA);
    } else {
      const nA = valA as number;
      const nB = valB as number;
      return playerSortAsc ? nA - nB : nB - nA;
    }
  });

  const handlePlayerSort = (field: any) => {
    if (playerSortField === field) {
      setPlayerSortAsc(!playerSortAsc);
    } else {
      setPlayerSortField(field);
      setPlayerSortAsc(false); // Default to descending for numbers
    }
  };

  return (
    <div className="space-y-8" id="standings-and-stats">
      {/* Caps Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Red Cap Box */}
        {redCapPlayer && (
          <div 
            id="red-cap-card"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 via-rose-500/5 to-slate-900 border border-red-500/30 p-6 flex items-center justify-between shadow-lg shadow-red-500/5 hover:scale-[1.01] transition-transform"
          >
            {/* Visual background gradient glow */}
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-red-500/20 blur-3xl pointer-events-none" />
            <div className="space-y-3 z-10">
              <div className="flex items-center gap-2">
                <span className="p-1 px-3 text-xs font-bold font-mono tracking-wider text-white bg-red-600 rounded-full flex items-center gap-1.5 uppercase shadow-sm">
                  ⚠️ RED CAP LEADER
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black font-sans text-white tracking-tight leading-none">{redCapPlayer.name}</h3>
                <p className="text-xs font-bold text-red-400 font-mono mt-1 uppercase">
                  {teams.find(t => t.id === redCapPlayer.teamId)?.name || 'Independent Team'}
                </p>
              </div>
              <div className="flex items-baseline gap-4 pt-1">
                <div>
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase font-mono tracking-wider">Runs</span>
                  <span className="text-3xl font-extrabold text-red-500 font-sans">{redCapPlayer.runs}</span>
                </div>
                <div className="border-l border-zinc-750 pl-4">
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase font-mono tracking-wider">Balls</span>
                  <span className="text-xl font-bold text-zinc-200 font-sans">{redCapPlayer.ballsFaced}</span>
                </div>
                <div className="border-l border-zinc-750 pl-4">
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase font-mono tracking-wider">Strike Rate</span>
                  <span className="text-xl font-bold text-amber-500 font-sans">
                    {redCapPlayer.ballsFaced > 0 ? ((redCapPlayer.runs / redCapPlayer.ballsFaced) * 100).toFixed(1) : '0.0'}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-xs font-mono text-zinc-400 pt-1">
                <span>🏏 Fours: <strong>{redCapPlayer.fours}</strong></span>
                <span>🔥 Sixes: <strong>{redCapPlayer.sixes}</strong></span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-full bg-red-600/25 border-4 border-red-500/50 shadow-md transform rotate-12 z-10 w-20 h-20">
              <span className="text-3xl">🧢</span>
              <span className="text-[9px] font-black tracking-widest text-red-200 uppercase font-mono mt-0.5">RED CAP</span>
            </div>
          </div>
        )}

        {/* Blue Cap Box */}
        {blueCapPlayer && (
          <div 
            id="blue-cap-card"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-slate-900 border border-blue-500/30 p-6 flex items-center justify-between shadow-lg shadow-blue-500/5 hover:scale-[1.01] transition-transform"
          >
            {/* Visual background gradient glow */}
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
            <div className="space-y-3 z-10">
              <div className="flex items-center gap-2">
                <span className="p-1 px-3 text-xs font-bold font-mono tracking-wider text-white bg-blue-600 rounded-full flex items-center gap-1.5 uppercase shadow-sm">
                  ⚡ BLUE CAP LEADER
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black font-sans text-white tracking-tight leading-none">{blueCapPlayer.name}</h3>
                <p className="text-xs font-bold text-blue-400 font-mono mt-1 uppercase">
                  {teams.find(t => t.id === blueCapPlayer.teamId)?.name || 'Independent Team'}
                </p>
              </div>
              <div className="flex items-baseline gap-4 pt-1">
                <div>
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase font-mono tracking-wider">Wickets</span>
                  <span className="text-3xl font-extrabold text-blue-500 font-sans">{blueCapPlayer.wickets}</span>
                </div>
                <div className="border-l border-zinc-750 pl-4">
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase font-mono tracking-wider">Overs</span>
                  <span className="text-xl font-bold text-zinc-200 font-sans">
                    {Math.floor(blueCapPlayer.ballsBowled / 6)}.{blueCapPlayer.ballsBowled % 6}
                  </span>
                </div>
                <div className="border-l border-zinc-750 pl-4">
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase font-mono tracking-wider">Economy</span>
                  <span className="text-xl font-bold text-amber-500 font-sans">
                    {blueCapPlayer.ballsBowled > 0 ? (blueCapPlayer.runsConceded / (blueCapPlayer.ballsBowled / 6)).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-xs font-mono text-zinc-400 pt-1">
                <span>💥 Runs Conc: <strong>{blueCapPlayer.runsConceded}</strong></span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-full bg-blue-600/25 border-4 border-blue-500/50 shadow-md transform -rotate-12 z-10 w-20 h-20">
              <span className="text-3xl">🧢</span>
              <span className="text-[9px] font-black tracking-widest text-blue-200 uppercase font-mono mt-0.5">BLUE CAP</span>
            </div>
          </div>
        )}
      </div>

      {/* Standings League Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl" id="league-standings-section">
        <div className="p-5 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/25 text-amber-500">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase">League Standings</h2>
              <p className="text-xs text-zinc-400 md:block hidden">Real-time team positions based on points & net run rate</p>
            </div>
          </div>
          <div className="p-1 px-3 bg-zinc-800 rounded-full border border-zinc-700 text-xxs font-mono text-zinc-300 font-semibold uppercase">
            SUMMER LEAGUE 2026
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950 text-zinc-400 text-xxs font-bold uppercase font-mono tracking-wider border-b border-zinc-800">
                <th className="py-3.5 px-4 text-center w-12">Pos</th>
                <th className="py-3.5 px-4">Team</th>
                <th className="py-3.5 px-4 text-center">Matches</th>
                <th className="py-3.5 px-4 text-center">Wins</th>
                <th className="py-3.5 px-4 text-center">Losses</th>
                <th className="py-3.5 px-4 text-center font-bold text-amber-400">Points</th>
                <th className="py-3.5 px-4 text-right pr-6">NRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {sortedTeams.map((team, idx) => {
                const isPlayoffEligible = idx < 4;
                const calculatedNrrVal = calculateNRR(team);
                return (
                  <tr 
                    key={team.id}
                    id={`team-standing-row-${team.id}`}
                    className={`hover:bg-zinc-800/25 transition-colors ${isPlayoffEligible ? 'bg-emerald-500/[0.01]' : ''}`}
                  >
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold font-mono ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' :
                        idx === 1 ? 'bg-slate-300 text-slate-900' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        'bg-zinc-800 text-zinc-300'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-white tracking-tight">{team.name}</span>
                        <div className="flex gap-2 text-xxs-tight text-zinc-400 font-mono mt-0.5">
                          <span>👤 {players.find(p => p.id === team.playerIds[0])?.name || 'Player 1'}</span>
                          <span className="text-zinc-600">|</span>
                          <span>👤 {players.find(p => p.id === team.playerIds[1])?.name || 'Player 2'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm font-semibold font-mono text-zinc-300">
                      {team.matchesPlayed}
                    </td>
                    <td className="py-4 px-4 text-center text-sm font-semibold font-mono text-emerald-500">
                      {team.wins}
                    </td>
                    <td className="py-4 px-4 text-center text-sm font-semibold font-mono text-rose-500">
                      {team.losses}
                    </td>
                    <td className="py-4 px-4 text-center text-base font-black font-mono text-amber-400">
                      {team.points}
                    </td>
                    <td className="py-4 px-4 text-right pr-6 font-semibold font-mono text-sm">
                      <span className={calculatedNrrVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatNRR(calculatedNrrVal)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sortedTeams.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 text-sm font-medium">
                    No teams available. Go to local Admin panel to add teams!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-zinc-950 px-5 py-3 border-t border-zinc-800 text-xxs text-zinc-500 font-mono font-medium">
          💡 Top 4 teams qualify automatically for playoffs: Q1 (#1 vs #2) & Eliminator (#3 vs #4).
        </div>
      </div>

      {/* Players Stat Leaderboards Detail */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl" id="players-stats-section">
        <div className="p-5 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950 md:flex items-center justify-between space-y-3 md:space-y-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-red-500/10 rounded-xl border border-red-500/25 text-red-500">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase">Individual Player Statistics</h2>
              <p className="text-xs text-zinc-400">Filter, search, or sort the active derby caps leaderboard</p>
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search player or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs text-white bg-zinc-850 border border-zinc-750 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950 text-zinc-400 text-xxs font-bold uppercase font-mono tracking-wider border-b border-zinc-800 select-none">
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handlePlayerSort('name')}>
                  Player <ArrowUpDown className="w-3.5 h-3.5 inline ml-1" />
                </th>
                <th className="py-3.5 px-4">Team</th>
                <th className="py-3.5 px-4 text-center cursor-pointer hover:text-white" onClick={() => handlePlayerSort('matchesPlayed')}>
                  Matches <ArrowUpDown className="w-3.5 h-3.5 inline ml-1" />
                </th>
                <th className="py-3.5 px-4 text-center cursor-pointer hover:text-white font-bold text-red-400" onClick={() => handlePlayerSort('runs')}>
                  Runs <ArrowUpDown className="w-3.5 h-3.5 inline ml-1 text-red-400" />
                </th>
                <th className="py-3.5 px-4 text-center cursor-pointer hover:text-white" onClick={() => handlePlayerSort('ballsFaced')}>
                  Balls <ArrowUpDown className="w-3.5 h-3.5 inline ml-1" />
                </th>
                <th className="py-3.5 px-4 text-center cursor-pointer hover:text-white" onClick={() => handlePlayerSort('sr')}>
                  S/R <ArrowUpDown className="w-3.5 h-3.5 inline ml-1" />
                </th>
                <th className="py-3.5 px-4 text-center cursor-pointer hover:text-white" onClick={() => handlePlayerSort('fours')}>
                  4s <ArrowUpDown className="w-3.5 h-3.5 inline ml-1" />
                </th>
                <th className="py-3.5 px-4 text-center cursor-pointer hover:text-white" onClick={() => handlePlayerSort('sixes')}>
                  6s <ArrowUpDown className="w-3.5 h-3.5 inline ml-1" />
                </th>
                <th className="py-3.5 px-4 text-center cursor-pointer hover:text-white font-bold text-blue-400" onClick={() => handlePlayerSort('wickets')}>
                  Wickets <ArrowUpDown className="w-3.5 h-3.5 inline ml-1 text-blue-400" />
                </th>
                <th className="py-3.5 px-4 text-center cursor-pointer hover:text-white" onClick={() => handlePlayerSort('ballsBowled')}>
                  Overs <ArrowUpDown className="w-3.5 h-3.5 inline ml-1" />
                </th>
                <th className="py-3.5 px-4 text-right pr-6 cursor-pointer hover:text-white" onClick={() => handlePlayerSort('econ')}>
                  Econ <ArrowUpDown className="w-3.5 h-3.5 inline ml-0.5" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {sortedPlayers.map((p, idx) => {
                const teamRecord = teams.find(t => t.id === p.teamId);
                const strRate = p.ballsFaced > 0 ? ((p.runs / p.ballsFaced) * 100) : 0;
                const overs = `${Math.floor(p.ballsBowled / 6)}.${p.ballsBowled % 6}`;
                const econ = p.ballsBowled > 0 ? (p.runsConceded / (p.ballsBowled / 6)) : 0;
                const isRedCap = redCapPlayer?.id === p.id && p.runs > 0;
                const isBlueCap = blueCapPlayer?.id === p.id && p.wickets > 0;

                return (
                  <tr key={p.id} id={`player-detail-row-${p.id}`} className="hover:bg-zinc-800/25 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{p.name}</span>
                        {isRedCap && (
                          <span 
                            title="Tournament Red Cap (Most Runs)"
                            className="inline-flex items-center justify-center bg-red-600 text-white rounded-md text-[10px] p-0.5 px-1.5 font-bold uppercase shadow-sm animate-pulse"
                          >
                            🔴 RED
                          </span>
                        )}
                        {isBlueCap && (
                          <span 
                            title="Tournament Blue Cap (Most Wickets)"
                            className="inline-flex items-center justify-center bg-blue-600 text-white rounded-md text-[10px] p-0.5 px-1.5 font-bold uppercase shadow-sm animate-pulse"
                          >
                            🔵 BLUE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs text-zinc-300 font-mono tracking-wide uppercase">
                        {teamRecord ? teamRecord.name : 'Unknown'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-semibold font-mono text-zinc-450">
                      {p.matchesPlayed}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-sm text-red-400 font-mono">
                      {p.runs}
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-mono text-zinc-300">
                      {p.ballsFaced}
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-semibold font-mono text-amber-500">
                      {strRate.toFixed(1)}
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-mono text-zinc-400">
                      {p.fours}
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-mono text-zinc-400">
                      {p.sixes}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-sm text-blue-400 font-mono">
                      {p.wickets}
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-mono text-zinc-300">
                      {overs}
                    </td>
                    <td className="py-4 px-4 text-right pr-6 text-xs font-semibold font-mono text-amber-400">
                      {p.ballsBowled > 0 ? econ.toFixed(2) : '-'}
                    </td>
                  </tr>
                );
              })}
              {sortedPlayers.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-zinc-500 text-sm font-medium">
                    No players found matching current query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
