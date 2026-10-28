import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getWledApi, type WledApi } from '@/api/wled'
import { getQueryKeys } from './useQueryKeys'

export type QueryKeys = ReturnType<typeof getQueryKeys>

/**
 * Mutation that calls the controller's API and then invalidates the
 * queries `invalidate` returns (not awaited: a save that makes the device
 * reboot or drop WiFi must not wait for the refetch).
 */
export function useWledApiMutation<TVariables = void, TResult = unknown>(
  baseUrl: string,
  mutate: (api: WledApi, variables: TVariables) => Promise<TResult>,
  invalidate?: (keys: QueryKeys) => readonly (readonly unknown[])[],
) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useMutation({
    mutationFn: (variables: TVariables) => mutate(api, variables),
    onSuccess: () => {
      for (const queryKey of invalidate?.(keys) ?? []) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}
