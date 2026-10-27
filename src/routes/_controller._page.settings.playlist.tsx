import { createFileRoute } from '@tanstack/react-router'
import { PlaylistScreen } from '@/components/playlists/PlaylistScreen'
import { useGoBack } from '@/hooks/useGoBack'

export const Route = createFileRoute('/_controller/_page/settings/playlist')({
  component: PlaylistRoute,
})

function PlaylistRoute() {
  return <PlaylistScreen onBack={useGoBack()} />
}
