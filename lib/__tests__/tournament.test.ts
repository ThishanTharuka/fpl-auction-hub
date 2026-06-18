import { describe, it, expect } from 'vitest'
import { validateStage, validateTournament } from '@/lib/tournament/validator'
import { generateRoundRobin, generateKnockoutBracket, generateSwissRound } from '@/lib/tournament/generator'
import { computeMatchResult, computeStandings } from '@/lib/tournament/scoring'
import { autoSuggest } from '@/lib/tournament/suggester'
import type { StageConfig, StandingsEntry, GeneratedMatch } from '@/lib/tournament/types'

// ─── VALIDATOR ───────────────────────────────────────────

describe('validateStage', () => {
  it('accepts a valid round-robin stage', () => {
    const stage: StageConfig = {
      name: 'League',
      type: 'round_robin',
      scoringMode: 'total_points',
      startGw: 1,
      endGw: 30,
      config: { repetitions: 2 },
    }
    expect(validateStage(stage, 6)).toEqual({ valid: true })
  })

  it('rejects round-robin with insufficient GWs', () => {
    const stage: StageConfig = {
      name: 'League',
      type: 'round_robin',
      scoringMode: 'total_points',
      startGw: 1,
      endGw: 2,
      config: { repetitions: 2 },
    }
    const result = validateStage(stage, 6)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toContain('need')
      expect(result.reason).toContain('GWs')
    }
  })

  it('accepts 8-team knockout with 3 GWs', () => {
    const stage: StageConfig = {
      name: 'Playoffs',
      type: 'knockout',
      scoringMode: 'head_to_head',
      startGw: 1,
      endGw: 3,
      config: { teams: 8, thirdPlace: true },
    }
    expect(validateStage(stage, 10)).toEqual({ valid: true })
  })

  it('rejects 8-team knockout with only 2 GWs', () => {
    const stage: StageConfig = {
      name: 'Playoffs',
      type: 'knockout',
      scoringMode: 'head_to_head',
      startGw: 1,
      endGw: 2,
      config: { teams: 8, thirdPlace: true },
    }
    const result = validateStage(stage, 10)
    expect(result.valid).toBe(false)
  })

  it('rejects 10-team knockout (not power of 2)', () => {
    const stage: StageConfig = {
      name: 'KO',
      type: 'knockout',
      scoringMode: 'head_to_head',
      startGw: 1,
      endGw: 5,
      config: { teams: 10 },
    }
    const result = validateStage(stage, 12)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toContain('power of 2')
    }
  })

  it('rejects knockout with teams > teamCount', () => {
    const stage: StageConfig = {
      name: 'KO',
      type: 'knockout',
      scoringMode: 'head_to_head',
      startGw: 1,
      endGw: 4,
      config: { teams: 8 },
    }
    const result = validateStage(stage, 4)
    expect(result.valid).toBe(false)
  })

  it('rejects swiss with fewer rounds than log2(teams)', () => {
    const stage: StageConfig = {
      name: 'Swiss',
      type: 'swiss',
      scoringMode: 'head_to_head',
      startGw: 1,
      endGw: 2,
      config: { rounds: 1 },
    }
    const result = validateStage(stage, 8)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toContain('at least')
    }
  })
})

describe('validateTournament', () => {
  it('rejects overlapping stages', () => {
    const stages: StageConfig[] = [
      {
        name: 'League',
        type: 'round_robin',
        scoringMode: 'total_points',
        startGw: 1,
        endGw: 35,
        config: { repetitions: 1 },
      },
      {
        name: 'Playoffs',
        type: 'knockout',
        scoringMode: 'head_to_head',
        startGw: 35,
        endGw: 38,
        config: { teams: 4, thirdPlace: true },
      },
    ]
    const result = validateTournament(stages, 10)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toContain('overlap')
    }
  })

  it('rejects stages exceeding 38 GWs', () => {
    const stages: StageConfig[] = [
      {
        name: 'Long League',
        type: 'round_robin',
        scoringMode: 'total_points',
        startGw: 1,
        endGw: 40,
        config: { repetitions: 1 },
      },
    ]
    const result = validateTournament(stages, 6)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toContain('GW')
    }
  })
})

// ─── GENERATOR ───────────────────────────────────────────

describe('generateRoundRobin', () => {
  it('generates correct number of rounds and matches for even teams', () => {
    const teamIds = ['a', 'b', 'c', 'd', 'e', 'f']
    const matches = generateRoundRobin(teamIds, 1, 1)

    // 6 teams → 5 rounds, 3 matches per round = 15 total
    expect(matches.length).toBe(15)

    // Each team plays 5 matches
    const counts = new Map<string, number>()
    for (const m of matches) {
      counts.set(m.homeTeamId, (counts.get(m.homeTeamId) ?? 0) + 1)
      counts.set(m.awayTeamId, (counts.get(m.awayTeamId) ?? 0) + 1)
    }
    for (const id of teamIds) {
      expect(counts.get(id)).toBe(5)
    }

    // No team plays twice in the same round
    for (const gw of [1, 2, 3, 4, 5]) {
      const roundTeams = matches.filter((m) => m.gw === gw).flatMap((m) => [m.homeTeamId, m.awayTeamId])
      expect(new Set(roundTeams).size).toBe(roundTeams.length)
    }
  })

  it('handles odd number of teams (adds bye)', () => {
    const teamIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const matches = generateRoundRobin(teamIds, 1, 1)

    // 7 teams → 7 rounds, 3 matches per round = 21 total (no bye matches)
    expect(matches.length).toBe(21)
  })

  it('flips home/away on even repetitions', () => {
    const teamIds = ['a', 'b', 'c', 'd']
    const matches = generateRoundRobin(teamIds, 2, 1)

    // 4 teams → 3 rounds × 2 reps = 6 rounds, 2 matches per round = 12 total
    expect(matches.length).toBe(12)

    const gw1home = matches.filter((m) => m.gw === 1).map((m) => m.homeTeamId).sort()
    const gw4home = matches.filter((m) => m.gw === 4).map((m) => m.homeTeamId).sort()

    // Home/away should differ between first and second half
    expect(gw1home).not.toEqual(gw4home)
  })

  it('uses correct gameweeks', () => {
    const teamIds = ['a', 'b', 'c', 'd']
    const matches = generateRoundRobin(teamIds, 1, 10)
    expect(matches.every((m) => m.gw >= 10 && m.gw <= 12)).toBe(true)
  })
})

describe('generateKnockoutBracket', () => {
  it('generates correct structure for 8 teams', () => {
    const teamIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const matches = generateKnockoutBracket(teamIds, { thirdPlace: true }, 1)

    // 8 teams: QF(4) + SF(2) + F(1) + 3rd(1) = 8 matches
    expect(matches.length).toBe(8)

    const roundLabels = matches.map((m) => m.roundLabel)
    expect(roundLabels.filter((l) => l === 'qf').length).toBe(4)
    expect(roundLabels.filter((l) => l === 'sf').length).toBe(2)
    expect(roundLabels.filter((l) => l === 'final').length).toBe(1)
    expect(roundLabels.filter((l) => l === 'third_place').length).toBe(1)
  })

  it('throws for non-power-of-2 team count', () => {
    expect(() => generateKnockoutBracket(['a', 'b', 'c'], {}, 1)).toThrow('power of 2')
  })

  it('generates two-legged ties correctly', () => {
    const teamIds = ['a', 'b', 'c', 'd']
    const matches = generateKnockoutBracket(teamIds, { twoLegged: true, thirdPlace: true }, 1)

    // SF(2 ties × 2 legs = 4) + F(1 tie × 2 legs = 2) + 3rd(1) = 7 matches
    expect(matches.length).toBe(7)
  })
})

describe('generateSwissRound', () => {
  it('pairs teams by rank avoiding rematches', () => {
    const teamIds = ['a', 'b', 'c', 'd']
    const standings: StandingsEntry[] = [
      { teamId: 'a', played: 1, won: 1, drawn: 0, lost: 0, fplPtsFor: 80, fplPtsAgainst: 60, fplPtsDiff: 20, matchPoints: 3, position: 1 },
      { teamId: 'b', played: 1, won: 0, drawn: 1, lost: 0, fplPtsFor: 70, fplPtsAgainst: 70, fplPtsDiff: 0, matchPoints: 1, position: 2 },
      { teamId: 'c', played: 1, won: 0, drawn: 1, lost: 0, fplPtsFor: 65, fplPtsAgainst: 65, fplPtsDiff: 0, matchPoints: 1, position: 3 },
      { teamId: 'd', played: 1, won: 0, drawn: 0, lost: 1, fplPtsFor: 50, fplPtsAgainst: 70, fplPtsDiff: -20, matchPoints: 0, position: 4 },
    ]

    const previous: GeneratedMatch[] = [
      { gw: 1, roundNumber: 1, roundLabel: 'swiss', homeTeamId: 'a', awayTeamId: 'b', winnerTeamId: null, homeFplPts: null, awayFplPts: null, status: 'scheduled' },
      { gw: 1, roundNumber: 1, roundLabel: 'swiss', homeTeamId: 'c', awayTeamId: 'd', winnerTeamId: null, homeFplPts: null, awayFplPts: null, status: 'scheduled' },
    ]

    const matches = generateSwissRound(teamIds, standings, 2, 1, previous)
    expect(matches.length).toBe(2)

    // No rematches
    for (const m of matches) {
      const key = [m.homeTeamId, m.awayTeamId].sort().join(':')
      const prevKey = ['a', 'b'].sort().join(':')
      const prevKey2 = ['c', 'd'].sort().join(':')
      expect(key).not.toBe(prevKey)
      expect(key).not.toBe(prevKey2)
    }
  })
})

// ─── SCORING ─────────────────────────────────────────────

describe('computeMatchResult', () => {
  it('head_to_head: home win gives home 3 pts', () => {
    const result = computeMatchResult(80, 60, 'head_to_head')
    expect(result.homeMatchPoints).toBe(3)
    expect(result.awayMatchPoints).toBe(0)
  })

  it('head_to_head: away win gives away 3 pts', () => {
    const result = computeMatchResult(55, 72, 'head_to_head')
    expect(result.homeMatchPoints).toBe(0)
    expect(result.awayMatchPoints).toBe(3)
  })

  it('head_to_head: draw gives 1 pt each', () => {
    const result = computeMatchResult(65, 65, 'head_to_head')
    expect(result.homeMatchPoints).toBe(1)
    expect(result.awayMatchPoints).toBe(1)
  })

  it('total_points: match points equal raw FPL pts', () => {
    const result = computeMatchResult(82, 70, 'total_points')
    expect(result.homeMatchPoints).toBe(82)
    expect(result.awayMatchPoints).toBe(70)
  })
})

describe('computeStandings', () => {
  it('sorts by match_points, then fpl_pts_diff, then fpl_pts_for', () => {
    const teamIds = ['a', 'b', 'c']
    const matches = [
      { homeTeamId: 'a', awayTeamId: 'b', homeFplPts: 80, awayFplPts: 60 },
      { homeTeamId: 'b', awayTeamId: 'c', homeFplPts: 70, awayFplPts: 70 },
      { homeTeamId: 'c', awayTeamId: 'a', homeFplPts: 50, awayFplPts: 90 },
    ]

    const standings = computeStandings(teamIds, matches, 'head_to_head')

    expect(standings[0]!.teamId).toBe('a') // 3 pts, +30 diff
    expect(standings[1]!.teamId).toBe('b') // 1 pt, -10 diff
    expect(standings[2]!.teamId).toBe('c') // 1 pt, -20 diff
  })

  it('handles total_points mode', () => {
    const teamIds = ['a', 'b']
    const matches = [
      { homeTeamId: 'a', awayTeamId: 'b', homeFplPts: 80, awayFplPts: 60 },
    ]

    const standings = computeStandings(teamIds, matches, 'total_points')
    expect(standings[0]!.matchPoints).toBe(80)
    expect(standings[1]!.matchPoints).toBe(60)
  })

  it('computes played, won, drawn, lost correctly', () => {
    const teamIds = ['a', 'b', 'c']
    const matches = [
      { homeTeamId: 'a', awayTeamId: 'b', homeFplPts: 80, awayFplPts: 60 },
      { homeTeamId: 'b', awayTeamId: 'c', homeFplPts: 70, awayFplPts: 70 },
      { homeTeamId: 'c', awayTeamId: 'a', homeFplPts: 50, awayFplPts: 90 },
    ]

    const standings = computeStandings(teamIds, matches, 'head_to_head')
    const a = standings.find((s) => s.teamId === 'a')!
    expect(a.played).toBe(2)
    expect(a.won).toBe(2)
    expect(a.lost).toBe(0)
    expect(a.drawn).toBe(0)
  })

  it('computes fpl_pts_diff correctly', () => {
    const teamIds = ['a', 'b']
    const matches = [
      { homeTeamId: 'a', awayTeamId: 'b', homeFplPts: 100, awayFplPts: 40 },
    ]

    const standings = computeStandings(teamIds, matches, 'head_to_head')
    const a = standings.find((s) => s.teamId === 'a')!
    expect(a.fplPtsDiff).toBe(60)
  })
})

// ─── SUGGESTER ───────────────────────────────────────────

describe('autoSuggest', () => {
  it('league_playoffs: 8 teams, 38 GWs', () => {
    const suggestion = autoSuggest(8, 38, 'league_playoffs')
    expect(suggestion.stages.length).toBe(2)
    expect(suggestion.stages[0]!.type).toBe('round_robin')
    expect(suggestion.stages[1]!.type).toBe('knockout')

    // Validate the result
    expect(validateTournament(suggestion.stages, 8)).toEqual({ valid: true })
  })

  it('pure_league: 6 teams, 38 GWs', () => {
    const suggestion = autoSuggest(6, 38, 'pure_league')
    expect(suggestion.stages.length).toBe(1)
    expect(suggestion.stages[0]!.type).toBe('round_robin')
  })

  it('knockout_heavy: 8 teams', () => {
    const suggestion = autoSuggest(8, 38, 'knockout_heavy')
    expect(suggestion.stages.length).toBe(1)
    expect(suggestion.stages[0]!.type).toBe('knockout')
  })
})
