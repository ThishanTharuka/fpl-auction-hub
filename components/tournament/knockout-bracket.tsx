"use client";

import { CheckCircle2 } from "lucide-react";

type BracketMatch = {
  id: string;
  gw: number;
  roundLabel: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeFplPts: number | null;
  awayFplPts: number | null;
  status: string;
  winnerTeamId: string | null;
};

type Participant = { id: string; name: string; color: string | null };

const ROUND_ORDER = ["r32", "r16", "qf", "sf", "third_place", "final"];

const ROUND_LABELS: Record<string, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-Finals",
  sf: "Semi-Finals",
  third_place: "3rd Place",
  final: "Final",
};

function TeamCell({
  teamId,
  participantMap,
  isWinner,
  score,
  isHome,
}: {
  teamId: string | null;
  participantMap: Map<string, Participant>;
  isWinner: boolean;
  score: number | null;
  isHome: boolean;
}) {
  const pt = teamId ? participantMap.get(teamId) : null;
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded ${
        isWinner ? "bg-[#00e478]/10" : ""
      } ${isHome ? "border-b border-[#3b4b3d]/50 rounded-b-none" : "rounded-t-none"}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: pt?.color ?? "#3b4b3d" }}
      />
      <span className={`flex-1 truncate min-w-0 ${isWinner ? "text-[#d6e4f9] font-semibold" : "text-[#849585]"}`}>
        {pt?.name ?? "—"}
      </span>
      {score !== null && (
        <span className={`font-mono shrink-0 ${isWinner ? "text-[#00e478]" : "text-[#849585]"}`}>
          {score}
        </span>
      )}
    </div>
  );
}

function BracketMatchCard({
  match,
  participantMap,
}: {
  match: BracketMatch;
  participantMap: Map<string, Participant>;
}) {
  const homeWon = match.winnerTeamId === match.homeTeamId;
  const awayWon = match.winnerTeamId === match.awayTeamId;
  const completed = match.status === "completed";
  const isBye = match.status === "bye";

  if (isBye) {
    return (
      <div className="border border-[#3b4b3d] rounded bg-[#061423] px-3 py-2 text-xs text-[#3b4b3d] text-center">
        Bye
      </div>
    );
  }

  return (
    <div className="border border-[#3b4b3d] rounded bg-[#0f1c2c] min-w-[160px]">
      <TeamCell
        teamId={match.homeTeamId}
        participantMap={participantMap}
        isWinner={completed && homeWon}
        score={match.homeFplPts}
        isHome={true}
      />
      <TeamCell
        teamId={match.awayTeamId}
        participantMap={participantMap}
        isWinner={completed && awayWon}
        score={match.awayFplPts}
        isHome={false}
      />
      {!completed && match.status !== "bye" && (
        <div className="text-[10px] text-center text-[#3b4b3d] py-0.5">
          GW{match.gw}
        </div>
      )}
      {completed && (
        <div className="flex justify-center py-0.5">
          <CheckCircle2 size={10} className="text-green-500" />
        </div>
      )}
    </div>
  );
}

export function KnockoutBracket({
  matches,
  participantMap,
}: {
  matches: BracketMatch[];
  participantMap: Map<string, Participant>;
}) {
  const rounds = new Map<string, BracketMatch[]>();
  for (const m of matches) {
    const list = rounds.get(m.roundLabel) ?? [];
    list.push(m);
    rounds.set(m.roundLabel, list);
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {ROUND_ORDER.filter((label) => rounds.has(label)).map((label) => {
          const roundMatches = rounds.get(label) ?? [];
          return (
            <div key={label} className="flex flex-col gap-3 min-w-[180px]">
              <div className="text-[10px] font-semibold text-[#849585] uppercase tracking-wider mb-1">
                {ROUND_LABELS[label] ?? label}
              </div>
              {roundMatches.map((m) => (
                <BracketMatchCard
                  key={m.id}
                  match={m}
                  participantMap={participantMap}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
