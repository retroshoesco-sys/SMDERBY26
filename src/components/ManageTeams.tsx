import React, { useState } from 'react';
import { Team, Player } from '../types';
import { Shield, Plus, Edit2, Trash2, Users, User, RefreshCw, XCircle } from 'lucide-react';

interface ManageTeamsProps {
  teams: Team[];
  players: Player[];
  onAddTeam: (name: string, shortName: string, player1Name: string, player2Name: string) => void;
  onEditTeam: (teamId: string, name: string, shortName: string, player1Name: string, player2Name: string) => void;
  onDeleteTeam: (teamId: string) => void;
}

export default function ManageTeams({ teams, players, onAddTeam, onEditTeam, onDeleteTeam }: ManageTeamsProps) {
  // Form Mode
  const [isAdding, setIsAdding] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // Form Fields
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');

  // Save click
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !shortName.trim() || !p1Name.trim() || !p2Name.trim()) {
      alert('Please fill out all fields. Every team must have exactly 2 players.');
      return;
    }

    if (editingTeamId) {
      onEditTeam(editingTeamId, teamName.trim(), shortName.trim().toUpperCase(), p1Name.trim(), p2Name.trim());
      setEditingTeamId(null);
    } else {
      onAddTeam(teamName.trim(), shortName.trim().toUpperCase(), p1Name.trim(), p2Name.trim());
      setIsAdding(false);
    }

    // Reset fields
    setTeamName('');
    setShortName('');
    setP1Name('');
    setP2Name('');
  };

  const handleStartEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setIsAdding(false);
    setTeamName(team.name);
    setShortName(team.shortName);
    
    // Find players of this team
    const teamPlayers = players.filter(p => p.teamId === team.id);
    setP1Name(teamPlayers[0]?.name || '');
    setP2Name(teamPlayers[1]?.name || '');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingTeamId(null);
    setTeamName('');
    setShortName('');
    setP1Name('');
    setP2Name('');
  };

  return (
    <div className="space-y-6" id="manage-teams-section">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase">Admin Control Panel</h2>
          <p className="text-xs text-zinc-400">Manage local teams, custom players, and match configurations</p>
        </div>

        {!isAdding && !editingTeamId && (
          <button
            id="start-add-team-btn"
            onClick={() => setIsAdding(true)}
            className="p-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            Add Team
          </button>
        )}
      </div>

      {/* Editor/Creator Card */}
      {(isAdding || editingTeamId) && (
        <form 
          onSubmit={handleSave} 
          id="team-form"
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5 animate-slideDown"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5 text-zinc-200">
              <span className="p-1.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-500">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm tracking-tight uppercase">
                {editingTeamId ? 'Edit Team Details' : 'Create New Team'}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xxs font-bold text-zinc-400 font-mono uppercase tracking-wider mb-1.5">
                Team Name
              </label>
              <input
                type="text"
                required
                id="form-team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Thunder Gladiators"
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xxs font-bold text-zinc-400 font-mono uppercase tracking-wider mb-1.5">
                Abbreviation (3 Letters)
              </label>
              <input
                type="text"
                required
                maxLength={3}
                id="form-team-short"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. THN"
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-4 py-2.5 text-xs font-black uppercase text-center text-white focus:outline-none focus:border-amber-500 transition-colors tracking-widest"
              />
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-4">
            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase font-mono block">
              👥 Mandatory Team Roster (Exactly 2 Players)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xxs font-bold text-zinc-400 font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-indigo-400" /> Player 1 Full Name
                </label>
                <input
                  type="text"
                  required
                  id="form-player-1"
                  value={p1Name}
                  onChange={(e) => setP1Name(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xxs font-bold text-zinc-400 font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-indigo-400" /> Player 2 Full Name
                </label>
                <input
                  type="text"
                  required
                  id="form-player-2"
                  value={p2Name}
                  onChange={(e) => setP2Name(e.target.value)}
                  placeholder="e.g. Sameer Patel"
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 border border-zinc-750 text-zinc-400 hover:text-white hover:border-zinc-650 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-team-btn"
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10"
            >
              {editingTeamId ? 'Save Renovations' : 'Add Team To Tournament'}
            </button>
          </div>
        </form>
      )}

      {/* Teams Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team) => {
          const teamPlayers = players.filter(p => p.teamId === team.id);
          return (
            <div 
              key={team.id}
              id={`admin-team-card-${team.id}`}
              className="bg-zinc-900 border border-zinc-c rounded-2xl p-5 shadow-md flex flex-col justify-between hover:border-zinc-700 transition-all border-zinc-800"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xxs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-bold block uppercase">
                      {team.shortName}
                    </span>
                    <h4 className="text-base font-black text-white tracking-tight">{team.name}</h4>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 mt-2">
                    <span>Pts: <strong className="text-amber-500">{team.points}</strong></span>
                    <span>W-L: <strong className="text-zinc-300">{team.wins}-{team.losses}</strong></span>
                    <span>Matches: <strong className="text-zinc-300">{team.matchesPlayed}</strong></span>
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    id={`team-edit-btn-${team.id}`}
                    onClick={() => handleStartEdit(team)}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Edit Team"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    id={`team-delete-btn-${team.id}`}
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${team.name} and clear its 2 player statistics? Data will be deleted permanently.`)) {
                        onDeleteTeam(team.id);
                      }
                    }}
                    className="p-1.5 hover:bg-rose-950/30 rounded-lg text-rose-500 hover:text-rose-400 transition-colors"
                    title="Delete Team"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Roster Display */}
              <div className="mt-4 pt-3.5 border-t border-zinc-800/80 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase font-mono block">Player 1</span>
                  <span className="text-sm font-extrabold text-white truncate block mt-0.5">{teamPlayers[0]?.name || 'Loading...'}</span>
                  <span className="text-[10px] text-zinc-400 font-mono block">🏏 {teamPlayers[0]?.runs} runs | ⚾ {teamPlayers[0]?.wickets} wkts</span>
                </div>
                <div className="border-l border-zinc-800/80 pl-4">
                  <span className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase font-mono block">Player 2</span>
                  <span className="text-sm font-extrabold text-white truncate block mt-0.5">{teamPlayers[1]?.name || 'Loading...'}</span>
                  <span className="text-[10px] text-zinc-400 font-mono block">🏏 {teamPlayers[1]?.runs} runs | ⚾ {teamPlayers[1]?.wickets} wkts</span>
                </div>
              </div>
            </div>
          );
        })}
        
        {teams.length === 0 && !isAdding && (
          <div className="col-span-2 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
            No local teams added yet. Hit "Add Team" above to declare your first Summer Derby roster!
          </div>
        )}
      </div>
    </div>
  );
}
