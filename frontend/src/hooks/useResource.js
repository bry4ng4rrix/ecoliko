import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

/** Hooks TanStack Query génériques par-dessus les services CRUD (@/services) :

 * évite de réécrire list/create/update/remove pour chacune des ~12 ressources. */

export function useResourceList(key, service, { params, enabled = true } = {}) {
  return useQuery({
    queryKey: [key, "list", params ?? null],
    queryFn: () => service.list(params),
    enabled,
  })
}

export function useResourceItem(key, service, id) {
  return useQuery({
    queryKey: [key, "detail", id],
    queryFn: () => service.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateResource(key, service) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => service.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  })
}

export function useUpdateResource(key, service) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => service.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  })
}

export function useDeleteResource(key, service) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => service.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  })
}
