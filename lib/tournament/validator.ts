import type { StageConfig, ValidationResult } from './types'

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

export function validateStage(
  stage: StageConfig,
  teamCount: number,
): ValidationResult {
  const gwCount = stage.endGw - stage.startGw + 1

  if (gwCount < 1) {
    return { valid: false, reason: 'End GW must be after or equal to start GW' }
  }

  if (stage.type === 'round_robin') {
    const repetitions = stage.config.repetitions ?? 1
    const rounds = (teamCount % 2 === 0 ? teamCount - 1 : teamCount) * repetitions
    if (rounds > gwCount) {
      return {
        valid: false,
        reason: `${teamCount} teams need ${rounds} GWs for ${repetitions}x round-robin but only ${gwCount} available`,
      }
    }
  }

  if (stage.type === 'swiss') {
    const rounds = stage.config.rounds ?? 0
    const minRounds = Math.ceil(Math.log2(teamCount))
    if (rounds < minRounds) {
      return {
        valid: false,
        reason: `Swiss with ${teamCount} teams needs at least ${minRounds} rounds (got ${rounds})`,
      }
    }
    if (rounds > gwCount) {
      return {
        valid: false,
        reason: `${rounds} Swiss rounds need ${rounds} GWs but only ${gwCount} available`,
      }
    }
  }

  if (stage.type === 'knockout') {
    const teams = stage.config.teams ?? 0
    if (teams > teamCount) {
      return {
        valid: false,
        reason: `Cannot have ${teams} teams in knockout stage when only ${teamCount} teams exist`,
      }
    }
    if (teams < 2) {
      return {
        valid: false,
        reason: 'Knockout stage needs at least 2 teams',
      }
    }
    if (!isPowerOfTwo(teams)) {
      return {
        valid: false,
        reason: `Knockout bracket size must be a power of 2 (2, 4, 8, 16…), got ${teams}`,
      }
    }
    const roundsNeeded = Math.log2(teams)
    if (roundsNeeded > gwCount) {
      return {
        valid: false,
        reason: `${teams}-team knockout needs ${roundsNeeded} GWs but only ${gwCount} available`,
      }
    }
  }

  return { valid: true }
}

export function validateTournament(
  stages: StageConfig[],
  teamCount: number,
  totalGws: number = 38,
): ValidationResult {
  if (stages.length === 0) {
    return { valid: false, reason: 'Tournament must have at least one stage' }
  }

  for (let i = 0; i < stages.length - 1; i++) {
    const current = stages[i]!
    const next = stages[i + 1]!
    if (current.endGw >= next.startGw) {
      return {
        valid: false,
        reason: `Stage "${current.name}" (GW ${current.startGw}-${current.endGw}) overlaps with "${next.name}" (GW ${next.startGw}-${next.endGw})`,
      }
    }
  }

  const last = stages[stages.length - 1]!
  if (last.endGw > totalGws) {
    return {
      valid: false,
      reason: `Stage "${last.name}" ends at GW ${last.endGw} but the season has only ${totalGws} GWs`,
    }
  }

  for (const stage of stages) {
    const result = validateStage(stage, teamCount)
    if (!result.valid) return result
  }

  return { valid: true }
}
