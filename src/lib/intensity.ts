import type { AppSettings } from '../types'

export interface IntensityProfile {
  minutes: AppSettings['dailyMinutes']
  label: '轻量' | '标准' | '深入'
  newItems: AppSettings['newItemsPerRound']
  targetAttempts: number
}

export const intensityProfiles: IntensityProfile[] = [
  { minutes: 5, label: '轻量', newItems: 5, targetAttempts: 12 },
  { minutes: 10, label: '标准', newItems: 8, targetAttempts: 24 },
  { minutes: 20, label: '深入', newItems: 12, targetAttempts: 48 },
]

export function getIntensityProfile(minutes: AppSettings['dailyMinutes']): IntensityProfile {
  return intensityProfiles.find((profile) => profile.minutes === minutes) ?? intensityProfiles[1]
}

export function settingsForIntensity(minutes: AppSettings['dailyMinutes']): Pick<AppSettings, 'dailyMinutes' | 'newItemsPerRound'> {
  const profile = getIntensityProfile(minutes)
  return { dailyMinutes: profile.minutes, newItemsPerRound: profile.newItems }
}
