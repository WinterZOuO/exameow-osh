import type { Ref } from 'vue'

export interface UseScreenRecord {
  start: () => Promise<void>
  stop: () => void
  录制状态?: Ref<unknown>
}

export function useScreenRecord(): UseScreenRecord {
  return {
    start: async () => {},
    stop: () => {},
  }
}
