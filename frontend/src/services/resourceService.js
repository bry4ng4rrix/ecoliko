import { apiClient } from "@/lib/apiClient"

/** Fabrique un client CRUD générique pour une ressource REST (évite de dupliquer

 * list/get/create/update/remove pour chacune des ~12 ressources de l'API). */
export function createResourceService(basePath) {
  return {
    list: (params) => apiClient.get(`${basePath}/`, { params }).then((r) => r.data),
    get: (id) => apiClient.get(`${basePath}/${id}/`).then((r) => r.data),
    create: (payload) => apiClient.post(`${basePath}/`, payload).then((r) => r.data),
    update: (id, payload) => apiClient.patch(`${basePath}/${id}/`, payload).then((r) => r.data),
    remove: (id) => apiClient.delete(`${basePath}/${id}/`).then((r) => r.data),
    action: (id, actionName, payload, method = "post") =>
      apiClient[method](`${basePath}/${id}/${actionName}/`, payload).then((r) => r.data),
  }
}
