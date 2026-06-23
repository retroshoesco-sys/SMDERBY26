import React, { useState } from 'react';
import { Team, AlliancePair } from '../types';
import { Users, RefreshCw, CheckCircle, ShieldAlert, GitMerge } from 'lucide-react';

interface AllianceGeneratorProps {
  teams: Team[];
  alliancePairs: AlliancePair[];
  onAllianceGenerated: (allianceA: string[], allianceB: string[]) => void;
}

export default function AllianceGenerator({ teams, alliancePairs, onAllianceGenerated }: AllianceGeneratorProps) {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => {
    // Select first four teams by default
    return teams.slice(0, 4).map(t => t.id);
  });
  
  const [generated, setGenerated] = useState<{
    allianceA: string[];
    allianceB: string[];
    repetitionScore: number;
    optionDetails: string;
  } | null>(null);

  const toggleTeamSelection = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter(id => id !== teamId));
    } else {
      if (selectedTeamIds.length < 4) {
        setSelectedTeamIds([...selectedTeamIds, teamId]);
      } else {
        // Replace first
        setSelectedTeamIds([...selectedTeamIds.slice(1), teamId]);
      }
    }
  };

  const getPairCount = (t1Id: string, t2Id: string): number => {
    const sorted = [t1Id, t2Id].sort();
    const pair = alliancePairs.find(p => p.teams[0] === sorted[0] && p.teams[1] === sorted[1]);
    return pair ? pair.count : 0;
  };

  const handleGenerate = () => {
    if (selectedTeamIds.length !== 4) return;
    const [t1, t2, t3, t4] = selectedTeamIds;

    // The 3 possible combinations to partition [t1, t2, t3, t4] into 2 alliances of 2 teams
    const combinations = [
      {
        allianceA: [t1, t2],
        allianceB: [t3, t4],
        score: getPairCount(t1, t2) + getPairCount(t3, t4),
        desc: `${teams.find(t => t.id === t1)?.shortName}+${teams.find(t => t.id === t2)?.shortName} vs ${teams.find(t => t.id === t3)?.shortName}+${teams.find(t => t.id === t4)?.shortName}`
      },
      {
        allianceA: [t1, t3],
        allianceB: [t2, t4],
        score: getPairCount(t1, t3) + getPairCount(t2, t4),
        desc: `${teams.find(t => t.id === t1)?.shortName}+${teams.find(t => t.id === t3)?.shortName} vs ${teams.find(t => t.id === t2)?.shortName}+${teams.find(t => t.id === t4)?.shortName}`
      },
      {
        allianceA: [t1, t4],
        allianceB: [t2, t3],
        score: getPairCount(t1, t4) + getPairCount(t2, t3),
        desc: `${teams.find(t => t.id === t1)?.shortName}+${teams.find(t => t.id === t4)?.shortName} vs ${teams.find(t => t.id === t2)?.shortName}+${teams.find(t => t.id === t3)?.shortName}`
      }
    ];

    // Find the combination that has the minimum repetition score
    // If there is a tie, we pick randomly between the tied ones to preserve variety!
    const minScore = Math.min(...combinations.map(c => c.score));
    const bestCombinations = combinations.filter(c => c.score === minScore);
    const selectedCombo = bestCombinations[Math.floor(Math.random() * bestCombinations.length)];

    setGenerated({
      allianceA: selectedCombo.allianceA,
      allianceB: selectedCombo.allianceB,
      repetitionScore: selectedCombo.score,
      optionDetails: selectedCombo.desc
    });
  };

  const handleApply = () => {
    if (generated) {
      onAllianceGenerated(generated.allianceA, generated.allianceB);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl" id="alliance-generator-component">
      <div className="flex items-center gap-3 mb-6">
        <span className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/25 text-indigo-400">
          <GitMerge className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Fair Alliance Generator</h2>
          <p className="text-xs text-zinc-400">Select exactly 4 local teams to scramble into fair partnerships</p>
        </div>
      </div>

      {teams.length < 4 ? (
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 flex gap-3 text-amber-500 text-xs font-medium">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            Need at least 4 teams in the league to generate alliances. Go to the Admin tab to add more teams!
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Step 1: Team selector */}
          <div>
            <label className="block text-xxs font-black text-zinc-400 uppercase tracking-widest font-mono mb-2.5">
              1. Select 4 Teams ({selectedTeamIds.length}/4 Selected)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {teams.map((team) => {
                const isSelected = selectedTeamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    id={`team-select-btn-${team.id}`}
                    onClick={() => toggleTeamSelection(team.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-md shadow-indigo-500/5'
                        : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xxs bg-zinc-800 p-0.5 px-1.5 rounded text-zinc-300 uppercase">
                        {team.shortName}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-indigo-500 text-white font-extrabold px-1 rounded-full">✓</span>
                      )}
                    </div>
                    <p className="text-xs font-black truncate mt-2">{team.name}</p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Played: {team.matchesPlayed}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex gap-3">
            <button
              id="generate-alliances-btn"
              onClick={handleGenerate}
              disabled={selectedTeamIds.length !== 4}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black uppercase text-xs tracking-wider rounded-xl hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              Generate Random Alliance
            </button>
          </div>

          {/* Active Generation Display Output */}
          {generated && (
            <div 
              id="generated-alliances-preview"
              className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-400 font-mono tracking-widest uppercase">
                  ⚡ Generated Matchup Option
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Repetition index score: <strong className={generated.repetitionScore > 0 ? "text-amber-500" : "text-emerald-400"}>{generated.repetitionScore}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4 text-center">
                {/* Alliance A */}
                <div className="md:col-span-3 bg-indigo-950/20 border border-indigo-900/30 p-4 rounded-xl space-y-1">
                  <span className="text-[9px] font-bold tracking-widest text-indigo-400 uppercase font-mono block">ALLIANCE A</span>
                  <p className="text-sm font-black text-white">
                    {teams.find(t => t.id === generated.allianceA[0])?.name}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono font-bold">+</p>
                  <p className="text-sm font-black text-white">
                    {teams.find(t => t.id === generated.allianceA[1])?.name}
                  </p>
                  <p className="text-xxs font-mono text-indigo-300 pt-1.5">
                    History pair weight: {getPairCount(generated.allianceA[0], generated.allianceA[1])} matches together
                  </p>
                </div>

                {/* VS Separator */}
                <div className="md:col-span-1 py-1 font-black text-base text-zinc-500 font-mono italic">
                  VS
                </div>

                {/* Alliance B */}
                <div className="md:col-span-3 bg-rose-950/10 border border-rose-950/20 p-4 rounded-xl space-y-1">
                  <span className="text-[9px] font-bold tracking-widest text-rose-400 uppercase font-mono block">ALLIANCE B</span>
                  <p className="text-sm font-black text-white">
                    {teams.find(t => t.id === generated.allianceB[0])?.name}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono font-bold">+</p>
                  <p className="text-sm font-black text-white">
                    {teams.find(t => t.id === generated.allianceB[1])?.name}
                  </p>
                  <p className="text-xxs font-mono text-rose-300 pt-1.5">
                    History pair weight: {getPairCount(generated.allianceB[0], generated.allianceB[1])} matches together
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/50 p-3 rounded-lg text-xxs text-zinc-400 font-mono">
                ℹ️ <strong>Partnership avoidance logic:</strong> Evaluated all 3 possible combinations of these 4 teams and recommended this layout because it has the absolute minimum historical repetition score of <strong>{generated.repetitionScore}</strong>.
              </div>

              <button
                id="apply-generated-alliances-btn"
                onClick={handleApply}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs rounded-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10"
              >
                <CheckCircle className="w-4 h-4" />
                Select Matchup for Scoring
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
