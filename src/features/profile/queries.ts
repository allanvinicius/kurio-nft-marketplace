import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ChangePasswordRequest, CurrentSessionResponse, Profile, UpdateProfileRequest } from '@/types/api'
import { profileApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/client'
import { useStoredSession } from '@/lib/auth/session-store'

export function useProfile() {
  const session = useStoredSession()
  return useQuery({
    queryKey: qk.profile(session?.userId ?? 'anon'),
    queryFn: ({ signal }) => profileApi.get({ signal }),
    enabled: Boolean(session),
    staleTime: 60_000,
  })
}

/** Mantém o cabeçalho (sessão) coerente após alterações do perfil. */
function useSyncProfile() {
  const qc = useQueryClient()
  const session = useStoredSession()
  return (profile: Profile) => {
    qc.setQueryData(qk.profile(profile.id), profile)
    if (session) {
      qc.setQueryData<CurrentSessionResponse>(qk.session(session.token), (old) =>
        old ? { ...old, user: { ...old.user, displayName: profile.displayName, username: profile.username, email: profile.email, avatarUrl: profile.avatarUrl } } : old,
      )
    }
  }
}

export function useUpdateProfile() {
  const sync = useSyncProfile()
  return useMutation({ mutationFn: (body: UpdateProfileRequest) => profileApi.update(body), onSuccess: sync })
}

export function useUpdateAvatar() {
  const sync = useSyncProfile()
  return useMutation({ mutationFn: (dataUrl: string | null) => (dataUrl ? profileApi.updateAvatar(dataUrl) : profileApi.removeAvatar()), onSuccess: sync })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (body: ChangePasswordRequest) => profileApi.changePassword(body) })
}
