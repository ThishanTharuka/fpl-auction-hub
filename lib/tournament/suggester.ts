import type { SuggestedTournament, StageConfig, StageType } from './types'

export type SuggesterPreference = 'league_playoffs' | 'pure_league' | 'knockout_heavy'

function largestPowerOfTwo(n: number): number {
  if (n <= 0) return 0
  let result = 1
  while (result <= n) result *= 2
  return result / 2
}

function generateTournamentName(preference: SuggesterPreference, teams: number, gws: number): string {
  const names: Record<SuggesterPreference, string> = {
    league_playoffs: `${teams}-Team League + Playoffs`,
    pure_league: `${teams}-Team League (${gws} GWs)`,
    knockout_heavy: `${teams}-Team Knockout`,
  }
  return names[preference]
}

export function autoSuggest(
  teamCount: number,
  totalGws: number = 38,
  preference: SuggesterPreference = 'league_playoffs',
): SuggestedTournament {
  if (preference === 'pure_league') {
    const rrRounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount
    const repetitions = Math.max(1, Math.floor(totalGws / rrRounds))
    const usedGws = repetitions * rrRounds

    const stages: StageConfig[] = [
      {
        name: 'League',
        type: 'round_robin' as StageType,
        scoringMode: 'total_points',
        startGw: 1,
        endGw: usedGws,
        config: { repetitions },
      },
    ]

    return { name: generateTournamentName(preference, teamCount, totalGws), stages }
  }

  if (preference === 'knockout_heavy') {
    const koTeams = largestPowerOfTwo(teamCount)
    const totalRounds = Math.log2(koTeams)
    const koGws = totalRounds

    const stages: StageConfig[] = [
      {
        name: 'Knockout',
        type: 'knockout' as StageType,
        scoringMode: 'head_to_head',
        startGw: 1,
        endGw: koGws,
        config: {
          teams: koTeams,
          thirdPlace: true,
          twoLegged: false,
        },
      },
    ]

    return { name: generateTournamentName(preference, teamCount, totalGws), stages }
  }

  // league_playoffs (default)
  const rrRounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount
  const koTeams = largestPowerOfTwo(Math.max(2, Math.floor(teamCount / 2)))
  const totalKoRounds = Math.log2(koTeams)
  const koGws = totalKoRounds
  const leagueGws = totalGws - koGws
  const repetitions = Math.max(1, Math.floor(leagueGws / rrRounds))
  const usedLeagueGws = repetitions * rrRounds
  const leagueEndGw = usedLeagueGws
  const koStartGw = leagueEndGw + 1
  const koEndGw = totalGws

  const stages: StageConfig[] = [
    {
      name: 'Regular Season',
      type: 'round_robin' as StageType,
      scoringMode: 'total_points',
      startGw: 1,
      endGw: leagueEndGw,
      advanceQualifiers: koTeams,
      config: { repetitions },
    },
    {
      name: 'Playoffs',
      type: 'knockout' as StageType,
      scoringMode: 'head_to_head',
      startGw: koStartGw,
      endGw: koEndGw,
      config: {
        teams: koTeams,
        thirdPlace: true,
        twoLegged: false,
      },
    },
  ]

  return { name: generateTournamentName(preference, teamCount, totalGws), stages }
}
