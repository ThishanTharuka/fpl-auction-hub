import type { MatchResult, ScoringMode, StandingsEntry } from './types'

export function computeMatchResult(
  homeFplPts: number,
  awayFplPts: number,
  scoringMode: ScoringMode,
): MatchResult {
  if (scoringMode === 'total_points') {
    return {
      homeFplPts,
      awayFplPts,
      winnerTeamId: null,
      homeMatchPoints: homeFplPts,
      awayMatchPoints: awayFplPts,
    }
  }

  // head_to_head
  if (homeFplPts > awayFplPts) {
    return {
      homeFplPts,
      awayFplPts,
      winnerTeamId: null, // caller fills this
      homeMatchPoints: 3,
      awayMatchPoints: 0,
    }
  }
  if (awayFplPts > homeFplPts) {
    return {
      homeFplPts,
      awayFplPts,
      winnerTeamId: null,
      homeMatchPoints: 0,
      awayMatchPoints: 3,
    }
  }
  return {
    homeFplPts,
    awayFplPts,
    winnerTeamId: null,
    homeMatchPoints: 1,
    awayMatchPoints: 1,
  }
}

export function computeStandings(
  teamIds: string[],
  matches: { homeTeamId: string; awayTeamId: string; homeFplPts: number | null; awayFplPts: number | null }[],
  scoringMode: ScoringMode,
): StandingsEntry[] {
  const map = new Map<string, StandingsEntry>()

  for (const id of teamIds) {
    map.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      fplPtsFor: 0,
      fplPtsAgainst: 0,
      fplPtsDiff: 0,
      matchPoints: 0,
      position: 0,
    })
  }

  for (const m of matches) {
    if (m.homeFplPts === null || m.awayFplPts === null) continue

    const home = map.get(m.homeTeamId)
    const away = map.get(m.awayTeamId)
    if (!home || !away) continue

    home.played++
    away.played++
    home.fplPtsFor += m.homeFplPts
    home.fplPtsAgainst += m.awayFplPts
    away.fplPtsFor += m.awayFplPts
    away.fplPtsAgainst += m.homeFplPts

    if (scoringMode === 'total_points') {
      home.matchPoints += m.homeFplPts
      away.matchPoints += m.awayFplPts
    } else {
      if (m.homeFplPts > m.awayFplPts) {
        home.won++
        away.lost++
        home.matchPoints += 3
      } else if (m.awayFplPts > m.homeFplPts) {
        away.won++
        home.lost++
        away.matchPoints += 3
      } else {
        home.drawn++
        away.drawn++
        home.matchPoints += 1
        away.matchPoints += 1
      }
    }
  }

  for (const entry of map.values()) {
    entry.fplPtsDiff = entry.fplPtsFor - entry.fplPtsAgainst
  }

  const sorted = [...map.values()].sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints
    if (b.fplPtsDiff !== a.fplPtsDiff) return b.fplPtsDiff - a.fplPtsDiff
    return b.fplPtsFor - a.fplPtsFor
  })

  return sorted.map((entry, i) => ({
    ...entry,
    position: i + 1,
  }))
}
