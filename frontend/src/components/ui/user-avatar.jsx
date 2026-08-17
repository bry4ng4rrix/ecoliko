import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function initiales(nom) {
  const mots = (nom ?? '').trim().split(/\s+/).filter(Boolean)
  if (mots.length === 0) return '?'
  return mots.slice(0, 2).map((m) => m[0].toUpperCase()).join('')
}

/** Avatar générique : affiche la photo si disponible, sinon les initiales du nom. */
export function UserAvatar({ photo, name, className = '', ...props }) {
  return (
    <Avatar className={className} {...props}>
      {photo && <AvatarImage src={photo} alt={name ?? 'Avatar'} />}
      <AvatarFallback className="text-xs font-semibold">{initiales(name)}</AvatarFallback>
    </Avatar>
  )
}
