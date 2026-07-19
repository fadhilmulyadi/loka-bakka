// Shared key for topbar alert stats (getDashboardStats), reused by any kader
// page that renders the Topbar so it doesn't refetch on every navigation.
export const KADER_STATS_KEY = "kader-stats"

const store = new Map<string, unknown>()

export function getCached<T>(key: string): T | undefined {
  return store.get(key) as T | undefined
}

export function setCached<T>(key: string, data: T) {
  store.set(key, data)
}
