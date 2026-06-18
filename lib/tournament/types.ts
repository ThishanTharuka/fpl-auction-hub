export type StageType = 'league' | 'round_robin' | 'swiss' | 'knockout'

export type ScoringMode = 'total_points' | 'head_to_head'

export type RoundLabel =
  | 'league'
  | 'swiss'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'third_place'
  | 'final'

export type StageConfig = {
  name: string
  type: StageType
  scoringMode: ScoringMode
  startGw: number
  endGw: number
  advanceQualifiers?: number
  config: {
    repetitions?: number
    rounds?: number
    teams?: number
    twoLegged?: boolean
    thirdPlace?: boolean
  }
}

export type GeneratedMatch = {
  gw: number
  roundNumber: number
  roundLabel: RoundLabel
  homeTeamId: string
  awayTeamId: string
  winnerTeamId: string | null
  homeFplPts: number | null
  awayFplPts: number | null
  status: 'scheduled'
}

export type StandingsEntry = {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  fplPtsFor: number
  fplPtsAgainst: number
  fplPtsDiff: number
  matchPoints: number
  position: number
}

export type MatchResult = {
  homeFplPts: number
  awayFplPts: number
  winnerTeamId: string | null
  homeMatchPoints: number
  awayMatchPoints: number
}

export type SuggestedTournament = {
  name: string
  stages: StageConfig[]
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string }
