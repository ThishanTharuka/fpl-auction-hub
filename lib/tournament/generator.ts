import type {
  GeneratedMatch,
  RoundLabel,
  StageConfig,
  StandingsEntry,
} from './types'

export function generateRoundRobin(
  teamIds: string[],
  repetitions: number = 1,
  startGw: number = 1,
): GeneratedMatch[] {
  const matches: GeneratedMatch[] = []
  const teams = [...teamIds]
  const isOdd = teams.length % 2 !== 0

  if (isOdd) {
    teams.push('__BYE__')
  }

  const numRounds = teams.length - 1
  const half = teams.length / 2

  for (let rep = 0; rep < repetitions; rep++) {
    const rotated = [...teams]
    const isEvenRep = rep % 2 === 1

    for (let round = 0; round < numRounds; round++) {
      const gw = startGw + rep * numRounds + round

      for (let i = 0; i < half; i++) {
        const home = rotated[i]!
        const away = rotated[rotated.length - 1 - i]!

        if (home === '__BYE__' || away === '__BYE__') continue

        if (isEvenRep) {
          matches.push({
            gw,
            roundNumber: rep * numRounds + round + 1,
            roundLabel: 'league' as RoundLabel,
            homeTeamId: away,
            awayTeamId: home,
            winnerTeamId: null,
            homeFplPts: null,
            awayFplPts: null,
            status: 'scheduled',
          })
        } else {
          matches.push({
            gw,
            roundNumber: rep * numRounds + round + 1,
            roundLabel: 'league' as RoundLabel,
            homeTeamId: home,
            awayTeamId: away,
            winnerTeamId: null,
            homeFplPts: null,
            awayFplPts: null,
            status: 'scheduled',
          })
        }
      }

      const fixed = rotated[0]!
      rotated[0] = fixed
      const last = rotated.pop()!
      rotated.splice(1, 0, last)
    }
  }

  return matches
}

export function generateSwissRound(
  teamIds: string[],
  standings: StandingsEntry[],
  roundNumber: number,
  startGw: number,
  previousMatches: GeneratedMatch[],
): GeneratedMatch[] {
  if (teamIds.length < 2) return []

  const sorted = [...standings]
    .sort((a, b) => {
      if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints
      if (b.fplPtsDiff !== a.fplPtsDiff) return b.fplPtsDiff - a.fplPtsDiff
      return b.fplPtsFor - a.fplPtsFor
    })
    .map((s) => s.teamId)

  const remaining = new Set(sorted)
  const matches: GeneratedMatch[] = []
  const gw = startGw + roundNumber - 1

  const alreadyPlayed = new Set<string>()
  for (const m of previousMatches) {
    const key = [m.homeTeamId, m.awayTeamId].sort().join(':')
    alreadyPlayed.add(key)
  }

  const ordered = [...sorted]

  for (let i = 0; i < ordered.length; i++) {
    if (!remaining.has(ordered[i]!)) continue
    remaining.delete(ordered[i]!)

    let opponent: string | null = null

    for (let j = i + 1; j < ordered.length; j++) {
      if (!remaining.has(ordered[j]!)) continue
      const key = [ordered[i]!, ordered[j]!].sort().join(':')
      if (!alreadyPlayed.has(key)) {
        opponent = ordered[j]!
        break
      }
    }

    if (opponent === null) {
      for (const id of remaining) {
        const key = [ordered[i]!, id].sort().join(':')
        if (!alreadyPlayed.has(key)) {
          opponent = id
          break
        }
      }
    }

    if (opponent === null) {
      opponent = [...remaining][0] ?? null
    }

    if (opponent) {
      remaining.delete(opponent)
      matches.push({
        gw,
        roundNumber,
        roundLabel: 'swiss' as RoundLabel,
        homeTeamId: ordered[i]!,
        awayTeamId: opponent,
        winnerTeamId: null,
        homeFplPts: null,
        awayFplPts: null,
        status: 'scheduled',
      })
    }
  }

  return matches
}

function knockoutRoundLabel(round: number, total: number): RoundLabel {
  const fromEnd = total - round
  if (fromEnd === 5) return 'r32'
  if (fromEnd === 4) return 'r16'
  if (fromEnd === 3) return 'qf'
  if (fromEnd === 2) return 'sf'
  if (fromEnd === 1) return 'final'
  return 'league'
}

export function generateKnockoutBracket(
  teamIds: string[],
  config: { twoLegged?: boolean; thirdPlace?: boolean },
  startGw: number,
): GeneratedMatch[] {
  if (!isPowerOfTwo(teamIds.length)) {
    throw new Error(`Knockout requires a power of 2 team count, got ${teamIds.length}`)
  }

  const matches: GeneratedMatch[] = []
  const totalRounds = Math.log2(teamIds.length)
  let gw = startGw
  let roundTeams = [...teamIds]

  for (let round = 0; round < totalRounds; round++) {
    const nextRound: string[] = []
    const half = roundTeams.length / 2
    const label = knockoutRoundLabel(round, totalRounds)

    if (config.twoLegged) {
      for (let i = 0; i < half; i++) {
        const home = roundTeams[i]!
        const away = roundTeams[roundTeams.length - 1 - i]!
        matches.push({
          gw, roundNumber: round + 1, roundLabel: label,
          homeTeamId: home, awayTeamId: away,
          winnerTeamId: null, homeFplPts: null, awayFplPts: null,
          status: 'scheduled',
        })
        matches.push({
          gw: gw + 1, roundNumber: round + 1, roundLabel: label,
          homeTeamId: away, awayTeamId: home,
          winnerTeamId: null, homeFplPts: null, awayFplPts: null,
          status: 'scheduled',
        })
        nextRound.push(home)
      }
      gw += 2
    } else {
      for (let i = 0; i < half; i++) {
        const home = roundTeams[i]!
        const away = roundTeams[roundTeams.length - 1 - i]!
        matches.push({
          gw, roundNumber: round + 1, roundLabel: label,
          homeTeamId: home, awayTeamId: away,
          winnerTeamId: null, homeFplPts: null, awayFplPts: null,
          status: 'scheduled',
        })
        nextRound.push(home)
      }
      gw += 1
    }

    roundTeams = nextRound
  }

  if (config.thirdPlace && totalRounds >= 2) {
    matches.push({
      gw: gw - 1,
      roundNumber: totalRounds + 1,
      roundLabel: 'third_place' as RoundLabel,
      homeTeamId: teamIds[0]!,
      awayTeamId: teamIds[teamIds.length - 1]!,
      winnerTeamId: null,
      homeFplPts: null, awayFplPts: null,
      status: 'scheduled',
    })
  }

  return matches
}

export function generateLeagueStage(
  teamIds: string[],
  stage: StageConfig,
): GeneratedMatch[] {
  if (stage.type === 'round_robin') {
    return generateRoundRobin(teamIds, stage.config.repetitions ?? 1, stage.startGw)
  }
  if (stage.type === 'knockout') {
    const knockoutTeams = stage.config.teams ?? teamIds.length
    return generateKnockoutBracket(
      teamIds.slice(0, knockoutTeams),
      {
        twoLegged: stage.config.twoLegged ?? false,
        thirdPlace: stage.config.thirdPlace ?? true,
      },
      stage.startGw,
    )
  }
  return []
}

export function assignGws(
  matches: GeneratedMatch[],
  startGw: number = 1,
): GeneratedMatch[] {
  return matches.map((m, i) => ({
    ...m,
    gw: startGw + i,
  }))
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}
