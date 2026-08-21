import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { movies as initialMovies, type Movie } from './data/movies'
import MovieCard from './components/MovieCard'
import { buscarPeliculas } from './tmdb'
import Auth from './components/Auth'
import { supabase } from './lib/supabase'
const bronzeAchievementFiles = import.meta.glob('./assets/achievements/badge_bronze_*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>
const silverAchievementFiles = import.meta.glob('./assets/achievements/badge_silver_*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>
const goldAchievementFiles = import.meta.glob('./assets/achievements/badge_gold_*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>
const platinumAchievementFiles = import.meta.glob('./assets/achievements/badge_platinum_*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>
const diamondAchievementFiles = import.meta.glob('./assets/achievements/badge_diamond_*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>

type Friend = {
  id: string
  name: string
  status: 'Online' | 'Ausente'
  watching: string
  movies: number
  series: number
  favorites: number
  avatar: string
  lastSeenAt?: string | null
}

type TmdbMovie = {
  id: number
  title: string
  release_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average: number
  vote_count?: number
  overview?: string
  runtime?: number | null
  genres?: { id: number; name: string }[]
}

type TmdbSeries = {
  id: number
  name: string
  first_air_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average: number
  vote_count?: number
  overview?: string
  tiempoTotal?: number
  genres?: { id: number; name: string }[]
}
type TmdbEpisode = {
  id: number
  name: string
  episode_number: number
  season_number: number
  air_date?: string
  overview?: string
  still_path?: string | null
  runtime?: number | null
}

type EpisodiosVistosPorSerie = Record<string, TmdbEpisode[]>

type TmdbSeriesDetails = TmdbSeries & {
  number_of_seasons?: number
  number_of_episodes?: number
  episode_run_time?: number[]
  seasons?: { season_number: number; episode_count?: number }[]
  genres?: { id: number; name: string }[]
  credits?: {
    cast?: { id: number; name: string; character?: string; profile_path?: string | null }[]
    crew?: { id: number; name: string; job?: string; department?: string }[]
  }
}


type TmdbMovieDetails = TmdbMovie & {
  runtime?: number | null
  genres?: { id: number; name: string }[]
  credits?: {
    cast?: { id: number; name: string; character?: string; profile_path?: string | null }[]
    crew?: { id: number; name: string; job?: string; department?: string }[]
  }
}

const emptyFriends: Friend[] = []


const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500'

const tmdbGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
  gap: '24px',
  width: '100%',
}

const tmdbCardStyle = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '18px',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
}

const tmdbPosterStyle = {
  width: '100%',
  aspectRatio: '2 / 3',
  background: 'rgba(0,0,0,0.20)',
  overflow: 'hidden',
}

type AchievementProgress = {
  id: number
  name: string
  icon: string
  description: string
  value: number
  thresholds: number[]
  tierIndex: number
  nextThreshold: number | null
  percent: number
  completed: boolean
}

const ACHIEVEMENT_TIER_NAMES = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante']
const ACHIEVEMENT_TIER_COLORS = ['#c47a3a', '#d9e1ea', '#ffd21c', '#36e5ee', '#9d86ff']
const ACHIEVEMENT_TIER_GLOWS = [
  'rgba(196,122,58,.38)',
  'rgba(217,225,234,.30)',
  'rgba(255,210,28,.42)',
  'rgba(54,229,238,.46)',
  'rgba(157,134,255,.58)',
]

// Esta lista sigue la numeración de la tabla original de WeGeekTV.
// Los logros de géneros se calculan con los IDs oficiales de TMDB.
const ACHIEVEMENTS: Array<{
  id: number
  name: string
  icon: string
  description: string
  thresholds: number[]
  movieGenre?: number[]
  seriesGenre?: number[]
  meta?: number[]
  year?: 'classic' | 'modern' | 'current'
  months?: boolean
}> = [
  { id: 1, name: 'Películas vistas', icon: '🎬', description: 'Películas vistas.', thresholds: [250, 500, 1000, 1500, 2000] },
  { id: 2, name: 'Series terminadas', icon: '📺', description: 'Series terminadas.', thresholds: [25, 50, 100, 150, 200] },
  { id: 3, name: 'Capítulos vistos', icon: '▶️', description: 'Capítulos vistos.', thresholds: [1000, 2500, 5000, 7500, 10000] },
  { id: 4, name: 'Películas de drama vistas', icon: '🎭', description: 'Películas de drama vistas.', thresholds: [50, 100, 200, 350, 500], movieGenre: [18] },
  { id: 5, name: 'Series de drama terminadas', icon: '📺🎭', description: 'Series de drama terminadas.', thresholds: [10, 20, 40, 65, 100], seriesGenre: [18] },
  { id: 6, name: 'Películas de acción vistas', icon: '🎯', description: 'Películas de acción vistas.', thresholds: [50, 100, 200, 350, 500], movieGenre: [28] },
  { id: 7, name: 'Series de acción terminadas', icon: '📺💥', description: 'Series de acción terminadas.', thresholds: [10, 20, 40, 65, 100], seriesGenre: [10759] },
  { id: 8, name: 'Películas de comedia vistas', icon: '😄', description: 'Películas de comedia vistas.', thresholds: [50, 100, 200, 350, 500], movieGenre: [35] },
  { id: 9, name: 'Series de comedia terminadas', icon: '📺😄', description: 'Series de comedia terminadas.', thresholds: [10, 20, 40, 65, 100], seriesGenre: [35] },
  { id: 10, name: 'Películas de romance vistas', icon: '❤️', description: 'Películas de romance vistas.', thresholds: [50, 100, 200, 350, 500], movieGenre: [10749] },
  { id: 11, name: 'Series de romance terminadas', icon: '📺❤️', description: 'Series de romance terminadas.', thresholds: [10, 20, 40, 65, 100], seriesGenre: [10749] },
  { id: 12, name: 'Películas de ciencia ficción vistas', icon: '🚀', description: 'Películas de ciencia ficción vistas.', thresholds: [50, 100, 200, 350, 500], movieGenre: [878] },
  { id: 13, name: 'Series de ciencia ficción terminadas', icon: '📺🚀', description: 'Series de ciencia ficción terminadas.', thresholds: [10, 20, 40, 65, 100], seriesGenre: [10765] },
  { id: 14, name: 'Películas de thriller vistas', icon: '🔎', description: 'Películas de thriller vistas.', thresholds: [50, 100, 200, 350, 500], movieGenre: [53] },
  { id: 15, name: 'Series de thriller terminadas', icon: '📺🔎', description: 'Series de thriller terminadas.', thresholds: [10, 20, 40, 65, 100], seriesGenre: [9648] },
  { id: 16, name: 'Películas de terror vistas', icon: '👻', description: 'Películas de terror vistas.', thresholds: [50, 100, 200, 350, 500], movieGenre: [27] },
  { id: 17, name: 'Series de terror terminadas', icon: '📺👻', description: 'Series de terror terminadas.', thresholds: [10, 20, 40, 65, 100], seriesGenre: [27] },
  { id: 18, name: 'Películas de fantasía y animación vistas', icon: '🧙', description: 'Películas de fantasía y animación vistas.', thresholds: [50, 100, 200, 350, 500], movieGenre: [14, 16] },
  { id: 19, name: 'Series de fantasía y animación terminadas', icon: '📺🧙', description: 'Series de fantasía y animación terminadas.', thresholds: [10, 20, 40, 65, 100], seriesGenre: [10765, 16, 14] },
  { id: 20, name: 'Todoterreno de películas', icon: '🌐', description: 'Bronce en todos los logros de géneros de películas, después Plata, Oro, Platino y Diamante.', thresholds: [1, 2, 3, 4, 5], meta: [4, 6, 8, 10, 12, 14, 16, 18] },
  { id: 21, name: 'Todoterreno de series', icon: '📺🌐', description: 'Bronce en todos los logros de géneros de series, después Plata, Oro, Platino y Diamante.', thresholds: [1, 2, 3, 4, 5], meta: [5, 7, 9, 11, 13, 15, 17, 19] },
  { id: 22, name: 'Películas clásicas (<1970)', icon: '🎥', description: 'Películas estrenadas antes de 1970.', thresholds: [50, 100, 150, 200, 250], year: 'classic' },
  { id: 23, name: 'Películas modernas (1970-1999)', icon: '🎞️', description: 'Películas estrenadas entre 1970 y 1999.', thresholds: [100, 200, 300, 400, 500], year: 'modern' },
  { id: 24, name: 'Películas actuales (2000+)', icon: '🎬', description: 'Películas estrenadas desde el año 2000.', thresholds: [150, 300, 500, 1000, 1500], year: 'current' },
  { id: 25, name: 'Meses invertidos viendo películas y series', icon: '⌛', description: 'Meses equivalentes de tiempo acumulado viendo películas y series.', thresholds: [2, 4, 6, 9, 12], months: true },
]

function achievementTier(value: number, thresholds: number[]) {
  let tier = -1
  thresholds.forEach((threshold, index) => { if (value >= threshold) tier = index })
  return tier
}

function achievementNumber(value: number) {
  if (value >= 1000 && value % 1000 === 0) return `${value / 1000}K`
  if (!Number.isInteger(value)) return value.toLocaleString('es-ES', { maximumFractionDigits: 1 })
  return value.toLocaleString('es-ES')
}

function AchievementArtwork({ id, tier, effects = false, locked = false }: { id: number; tier: number; effects?: boolean; locked?: boolean }) {
  const imageMaps = [
    bronzeAchievementFiles,
    silverAchievementFiles,
    goldAchievementFiles,
    platinumAchievementFiles,
    diamondAchievementFiles,
  ]

  const safeTier = Math.max(0, Math.min(4, tier))
  const prefixes = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  const prefix = prefixes[safeTier]
  const map = imageMaps[safeTier]
  const safeId = Math.max(1, Math.min(25, id))
  const paddedId = String(safeId).padStart(2, '0')
  const wantedNames = new Set([
    `badge_${prefix}_${paddedId}.png`,
    `badge_${prefix}_${safeId}.png`,
    `badge_${prefix}-${paddedId}.png`,
    `badge_${prefix}-${safeId}.png`,
  ])

  // No dependemos de que Vite conserve exactamente la misma clave de ruta.
  // Buscamos el archivo por su nombre real dentro del glob.
  const imageEntry = Object.entries(map).find(([key]) => {
    const cleanKey = key.split('?')[0].replace(/\\/g, '/')
    const basename = cleanKey.substring(cleanKey.lastIndexOf('/') + 1).toLowerCase()
    return wantedNames.has(basename)
  })
  const imageUrl = imageEntry?.[1]

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`Medalla ${prefix}`}
        draggable={false}
        onError={(event) => {
          // Si el navegador no puede resolver el asset, ocultamos solo la imagen;
          // el fallback visual permanece detrás.
          event.currentTarget.style.display = 'none'
          const fallback = event.currentTarget.nextElementSibling as HTMLElement | null
          if (fallback) fallback.style.display = 'flex'
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
          display: 'block',
          overflow: 'visible',
          transform: 'none',
          transformOrigin: 'center',
          zIndex: 3,
          filter: safeTier >= 3
            ? `drop-shadow(0 0 ${safeTier === 4 ? 10 : 6}px ${ACHIEVEMENT_TIER_COLORS[safeTier]})`
            : 'drop-shadow(0 3px 5px rgba(0,0,0,.25))',
          animation: effects && !locked ? 'wgMedalCorePulse 2.8s ease-in-out infinite' : 'none',
          pointerEvents: 'none',
        }}
      />
    )
  }

  // Fallback visual real (no emoji): incluso si falta el PNG, siempre habrá
  // una medalla visible en pantalla.
  const fallbackSymbols = ['★', '✦', '★', '✦', '◆']
  return (
    <div
      aria-label={`Medalla ${prefix}`}
      style={{
        position: 'absolute',
        inset: '8%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    >
      <div style={{
        position: 'absolute',
        width: '42%',
        height: '42%',
        top: '27%',
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,.9), ${ACHIEVEMENT_TIER_COLORS[safeTier]} 38%, rgba(0,0,0,.28) 100%)`,
        border: `2px solid rgba(255,255,255,.72)`,
        boxShadow: `0 0 0 4px rgba(255,255,255,.10), 0 0 24px ${ACHIEVEMENT_TIER_GLOWS[safeTier]}, inset 0 -7px 12px rgba(0,0,0,.28)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '34%',
        fontWeight: 1000,
        textShadow: '0 2px 5px rgba(0,0,0,.5)',
      }}>{fallbackSymbols[safeTier]}</div>
      <div style={{
        position: 'absolute',
        width: '22%',
        height: '30%',
        top: '7%',
        left: '27%',
        background: `linear-gradient(135deg, ${ACHIEVEMENT_TIER_COLORS[safeTier]}, rgba(255,255,255,.25))`,
        clipPath: 'polygon(0 0,100% 0,78% 100%,50% 78%,22% 100%)',
        filter: `drop-shadow(0 0 6px ${ACHIEVEMENT_TIER_GLOWS[safeTier]})`,
      }} />
      <div style={{
        position: 'absolute',
        width: '22%',
        height: '30%',
        top: '7%',
        right: '27%',
        background: `linear-gradient(225deg, ${ACHIEVEMENT_TIER_COLORS[safeTier]}, rgba(255,255,255,.25))`,
        clipPath: 'polygon(0 0,100% 0,78% 100%,50% 78%,22% 100%)',
        filter: `drop-shadow(0 0 6px ${ACHIEVEMENT_TIER_GLOWS[safeTier]})`,
      }} />
    </div>
  )
}

function AchievementBadge({ achievement, tierIndex, locked = false, size = 150, effects = false }: { achievement: AchievementProgress; tierIndex: number; locked?: boolean; size?: number; effects?: boolean }) {
  const tier = Math.max(0, Math.min(4, tierIndex))
  const color = ACHIEVEMENT_TIER_COLORS[tier]
  const glow = ACHIEVEMENT_TIER_GLOWS[tier]

  return (
    <div
      style={{
        width: size,
        minWidth: size,
        overflow: 'visible',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        filter: locked ? 'grayscale(1) opacity(.32)' : 'none',
      }}
    >
      {effects && (
        <style>{`
          @keyframes wgMedalAuraPulse {0%,100%{transform:scale(.92);opacity:.22}50%{transform:scale(1.08);opacity:.52}}
          @keyframes wgMedalOrbit {to{transform:rotate(360deg)}}
          @keyframes wgMedalOrbitReverse {to{transform:rotate(-360deg)}}
          @keyframes wgMedalShimmer {0%{transform:translateX(-140%) rotate(18deg);opacity:0}18%{opacity:.8}48%,100%{transform:translateX(150%) rotate(18deg);opacity:0}}
          @keyframes wgMedalSparkFloat {0%,100%{transform:translate(0,4px) scale(.65);opacity:.25}50%{transform:translate(0,-6px) scale(1.15);opacity:1}}
          @keyframes wgMedalCorePulse {0%,100%{filter:drop-shadow(0 0 7px var(--medal-glow))}50%{filter:drop-shadow(0 0 18px var(--medal-glow))}}
          @keyframes wgMedalRingPulse {0%,100%{transform:scale(.92);opacity:.35}50%{transform:scale(1.1);opacity:.9}}
          @keyframes wgMedalRaySpin {to{transform:rotate(360deg)}}
          @keyframes wgMedalDiamondBurst {0%,100%{transform:scale(.75) rotate(0deg);opacity:.25}50%{transform:scale(1.18) rotate(45deg);opacity:1}}
        `}</style>
      )}
      {/* Efectos exclusivos de la medalla: el resto de la ventana permanece intacto. */}
      <div
  style={{
    position: 'relative',
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    ['--medal-glow' as any]: glow,
  }}
>
        {effects && (
          <>
            <span aria-hidden="true" style={{ position:'absolute', inset:'-9%', borderRadius:'50%', background:`radial-gradient(circle, ${glow} 0%, transparent 67%)`, filter:'blur(12px)', animation:'wgMedalAuraPulse 2.6s ease-in-out infinite', opacity: locked ? .12 : .38, pointerEvents:'none', zIndex:0 }} />
            <span aria-hidden="true" style={{ position:'absolute', inset:'-5%', borderRadius:'50%', border:`1px solid ${color}88`, background:`conic-gradient(from 0deg, transparent 0deg, ${color}aa 55deg, transparent 105deg, transparent 220deg, ${color}77 285deg, transparent 330deg)`, WebkitMask:'radial-gradient(circle, transparent 63%, #000 65%, #000 69%, transparent 71%)', mask:'radial-gradient(circle, transparent 63%, #000 65%, #000 69%, transparent 71%)', animation:'wgMedalOrbit 7s linear infinite', opacity: locked ? .25 : .8, pointerEvents:'none', zIndex:1 }} />
            <span aria-hidden="true" style={{ position:'absolute', inset:'-2%', borderRadius:'50%', border:`1px dashed ${color}55`, animation:'wgMedalOrbitReverse 11s linear infinite', opacity: locked ? .18 : .48, pointerEvents:'none', zIndex:1 }} />
            <span aria-hidden="true" style={{ position:'absolute', top:'7%', left:'-18%', width:'34%', height:'14%', borderRadius:999, background:`linear-gradient(90deg, transparent, rgba(255,255,255,.92), ${color}, transparent)`, filter:'blur(2px)', transform:'translateX(-140%) rotate(18deg)', animation:'wgMedalShimmer 3.8s ease-in-out infinite', pointerEvents:'none', zIndex:4 }} />
            {!locked && [0,1,2,3].map((i) => (
              <span key={`medal-spark-${i}`} aria-hidden="true" style={{ position:'absolute', width:Math.max(3,size*.028), height:Math.max(3,size*.028), borderRadius:'50%', background:'#fff', boxShadow:`0 0 ${Math.max(6,size*.07)}px ${glow}`, top:`${18 + i*19}%`, left:i%2 ? '87%' : '3%', animation:`wgMedalSparkFloat ${1.7 + i*.35}s ease-in-out ${i*.22}s infinite`, opacity:.85, pointerEvents:'none', zIndex:4 }} />
            ))}
            {!locked && tier >= 1 && (
              <span aria-hidden="true" style={{ position:'absolute', inset:'-13%', borderRadius:'50%', border:`2px solid ${color}55`, boxShadow:`0 0 28px ${glow}`, animation:'wgMedalRingPulse 3.2s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />
            )}
            {!locked && tier >= 2 && (
              <span aria-hidden="true" style={{ position:'absolute', inset:'-20%', borderRadius:'50%', background:`repeating-conic-gradient(from 0deg, ${color}00 0deg, ${color}55 4deg, ${color}00 9deg, ${color}00 18deg)`, mask:'radial-gradient(circle, transparent 61%, #000 63%, #000 68%, transparent 70%)', WebkitMask:'radial-gradient(circle, transparent 61%, #000 63%, #000 68%, transparent 70%)', animation:'wgMedalRaySpin 12s linear infinite', opacity:.72, pointerEvents:'none', zIndex:0 }} />
            )}
            {!locked && tier >= 3 && (
              <span aria-hidden="true" style={{ position:'absolute', inset:'-27%', borderRadius:'50%', border:`1px dotted ${color}70`, animation:'wgMedalOrbitReverse 8s linear infinite', boxShadow:`0 0 34px ${glow}`, pointerEvents:'none', zIndex:0 }} />
            )}
            {!locked && tier === 4 && (
              <span aria-hidden="true" style={{ position:'absolute', inset:'-32%', borderRadius:'22%', border:`2px solid ${color}65`, boxShadow:`0 0 42px ${glow}`, animation:'wgMedalDiamondBurst 3.8s ease-in-out infinite', transform:'rotate(45deg)', pointerEvents:'none', zIndex:0 }} />
            )}
          </>
        )}

        {tier >= 2 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '-4%',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glow} 0%, transparent 68%)`,
              filter: 'blur(10px)',
              opacity: tier === 4 ? .32 : .18,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        <AchievementArtwork id={achievement.id} tier={tier} effects={effects} locked={locked} />

        {tier >= 3 && (
          <>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: size * .045,
                height: size * .045,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 12px 3px ${glow}`,
                top: '12%',
                left: '7%',
                opacity: .8,
              }}
            />
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: size * .035,
                height: size * .035,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 10px 2px ${glow}`,
                bottom: '14%',
                right: '8%',
                opacity: .75,
              }}
            />
          </>
        )}

        {tier === 4 && (
          <>
            <span aria-hidden="true" style={{ position: 'absolute', top: '4%', right: '15%', color, fontSize: size * .09, textShadow: `0 0 10px ${glow}`, animation: 'achievementSpark 1.8s ease-in-out infinite' }}>✦</span>
            <span aria-hidden="true" style={{ position: 'absolute', bottom: '8%', left: '12%', color, fontSize: size * .07, textShadow: `0 0 9px ${glow}`, animation: 'achievementSpark 2.1s ease-in-out infinite' }}>✦</span>
          </>
        )}
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<any>(null)
  useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session)
  })

  return () => subscription.unsubscribe()
}, [])
  useEffect(() => {
    if (!session) return

    

    cargarSeriesDesdeSupabase()
  }, [session])
  const [pagina, setPagina] = useState('inicio')
  const [amigoSeleccionado, setAmigoSeleccionado] = useState<Friend | null>(null)
  const [nombreUsuario, setNombreUsuario] = useState('Usuario')
  const [avatarUsuario, setAvatarUsuario] = useState('👤')
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [busquedaAmigos, setBusquedaAmigos] = useState('')
  const [friends, setFriends] = useState<Friend[]>(emptyFriends)
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState<string[]>([])
  const [amigosActuales, setAmigosActuales] = useState<string[]>([])
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'vistas' | 'pendientes' | 'favoritas'>('todas')
  const [tipoColeccion, setTipoColeccion] = useState<'peliculas' | 'series'>('peliculas')
  const [peliculas, setPeliculas] = useState<Movie[]>(initialMovies)
  const [resultadosTMDB, setResultadosTMDB] = useState<TmdbMovie[]>([])
  const [buscandoTMDB, setBuscandoTMDB] = useState(false)
  const [errorTMDB, setErrorTMDB] = useState('')
  const [peliculasPopularesTMDB, setPeliculasPopularesTMDB] = useState<TmdbMovie[]>([])
  const [peliculasMejorValoradasTMDB, setPeliculasMejorValoradasTMDB] = useState<TmdbMovie[]>([])
  const [peliculasEstrenosTMDB, setPeliculasEstrenosTMDB] = useState<TmdbMovie[]>([])
  const [cargandoCatalogoPeliculas, setCargandoCatalogoPeliculas] = useState(false)
  const [peliculaSeleccionada, setPeliculaSeleccionada] = useState<TmdbMovieDetails | null>(null)
  const [cargandoDetalles, setCargandoDetalles] = useState(false)
  const [errorDetalles, setErrorDetalles] = useState('')
  const [busquedaSeries, setBusquedaSeries] = useState('')
  const [resultadosSeriesTMDB, setResultadosSeriesTMDB] = useState<TmdbSeries[]>([])
  const [buscandoSeriesTMDB, setBuscandoSeriesTMDB] = useState(false)
  const [errorSeriesTMDB, setErrorSeriesTMDB] = useState('')
  const [serieSeleccionada, setSerieSeleccionada] = useState<TmdbSeriesDetails | null>(null)
  const [cargandoSerieDetalles, setCargandoSerieDetalles] = useState(false)
  const [errorSerieDetalles, setErrorSerieDetalles] = useState('')



  const [favoritasTMDB, setFavoritasTMDB] = useState<TmdbMovie[]>([])
  const [vistasTMDB, setVistasTMDB] = useState<TmdbMovie[]>([])

useEffect(() => {
  if (!session?.user) {
    setVistasTMDB([])
    return
  }

  const cargarVistasSupabase = async () => {
    
    const { data, error } = await supabase
      .from('user_movies')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('watched', true)
      .eq('media_type', 'movie')

    if (error) {
      console.error('Error al cargar películas vistas:', error)
      return
    }

    const peliculasVistas: TmdbMovie[] = await Promise.all(
  (data ?? []).map(async (pelicula) => {
    try {
      const respuesta = await fetch(
        `https://api.themoviedb.org/3/movie/${pelicula.tmdb_id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=es-ES`
      )

      const peliculaTMDB = await respuesta.json()

      return {
        id: pelicula.tmdb_id,
        title: peliculaTMDB.title ?? pelicula.title,
        poster_path: peliculaTMDB.poster_path ?? pelicula.poster_path,
        vote_average: peliculaTMDB.vote_average ?? 0,
        release_date: peliculaTMDB.release_date ?? '',
        genres: peliculaTMDB.genres ?? [],
      }
    } catch (error) {
      console.error('Error al cargar película desde TMDB:', error)

      return {
        id: pelicula.tmdb_id,
        title: pelicula.title,
        poster_path: pelicula.poster_path,
        vote_average: 0,
        release_date: '',
      }
    }
  })
)

setVistasTMDB(peliculasVistas)

    setVistasTMDB(peliculasVistas)
  }

  cargarVistasSupabase()
}, [session])
useEffect(() => {
  if (!session?.user) {
    setFavoritasTMDB([])
    return
  }

  const cargarFavoritosSupabase = async () => {
    const { data, error } = await supabase
      .from('user_movies')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('favorite', true)
      .eq('media_type', 'movie')
      console.log('FAVORITOS SUPABASE - data:', data)
console.log('FAVORITOS SUPABASE - error:', error)
console.log('PRIMER FAVORITO:', data?.[0])

    if (error) {
      console.error('Error al cargar películas favoritas:', error)
      return
    }

    const peliculasFavoritas: TmdbMovie[] = (data ?? []).map((pelicula) => ({
    id: pelicula.tmdb_id,
    title: pelicula.title,
    poster_path: pelicula.poster_path,
    vote_average: pelicula.vote_average ?? 0,
    release_date: pelicula.release_date ?? "",
}))
console.log(
  "PELÍCULAS FAVORITAS CONVERTIDAS:",
  JSON.stringify(peliculasFavoritas, null, 2)
)

    setFavoritasTMDB(peliculasFavoritas)
  }

  cargarFavoritosSupabase()
}, [session])

  const cargarSeriesDesdeSupabase = async () => {
  if (!session) return

  const { data, error } = await supabase
    .from('user_series')
    .select('*')
    .eq('user_id', session.user.id)

  if (error) {
    console.error('Error al cargar las series:', error)
    return
  }

  const series: TmdbSeries[] = (data ?? []).map((serie) => ({
    id: serie.serie_id,
    name: serie.name,
    poster_path: serie.poster_path,
    first_air_date: serie.first_air_date,
    vote_average: serie.vote_average ?? 0,
    tiempoTotal: serie.duracion ?? 0,
  }))

  setFavoritasSeriesTMDB(
    series.filter((serie) =>
      data?.some(
        (guardada) =>
          guardada.serie_id === serie.id && guardada.favorita === true,
      ),
    ),
  )

  setVistasSeriesTMDB(
    series.filter((serie) =>
      data?.some(
        (guardada) =>
          guardada.serie_id === serie.id && guardada.vista === true,
      ),
    ),
  )
}
  const [favoritasSeriesTMDB, setFavoritasSeriesTMDB] = useState<TmdbSeries[]>([])
  

  const [vistasSeriesTMDB, setVistasSeriesTMDB] = useState<TmdbSeries[]>([])

  // Episodios vistos agrupados por serie. Se persisten para que las estadísticas
  // sigan siendo correctas después de cerrar o refrescar la web.
  const [episodiosVistos, setEpisodiosVistos] = useState<EpisodiosVistosPorSerie>(() => {
    try {
      const guardados = localStorage.getItem('wegeektv_episodios_vistos')
      if (!guardados) return {}
      const datos = JSON.parse(guardados)
      return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {}
    } catch {
      return {}
    }
  })
  const [episodiosTemporada, setEpisodiosTemporada] = useState<TmdbEpisode[]>([])
  const [temporadaSeleccionada, setTemporadaSeleccionada] = useState<number | null>(null)
  const [logrosNotificacion, setLogrosNotificacion] = useState<AchievementProgress[]>([])
  const [cargandoGenerosLogros, setCargandoGenerosLogros] = useState(false)
const cargarEpisodiosTemporada = async (temporada: number) => {
  if (!serieSeleccionada) return

  try {
    const respuesta = await fetch(
      `https://api.themoviedb.org/3/tv/${serieSeleccionada.id}/season/${temporada}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=es-ES`,
    )

    if (!respuesta.ok) {
      throw new Error('No se pudieron cargar los episodios')
    }

    const datos = await respuesta.json()
    setEpisodiosTemporada(datos.episodes || [])
    setTemporadaSeleccionada(temporada)
  } catch (error) {
    console.error('Error cargando episodios:', error)
    setEpisodiosTemporada([])
  }
}

const sincronizarSerieVistaConEpisodios = async (serie: TmdbSeriesDetails, episodios: TmdbEpisode[]) => {
  if (!session) return

  const totalEpisodios = serie.number_of_episodes || 0
  const serieCompleta = totalEpisodios > 0 && episodios.length >= totalEpisodios
  const yaEstaVista = vistasSeriesTMDB.some((vista) => vista.id === serie.id)

  if (serieCompleta === yaEstaVista) return

  if (serieCompleta) {
    const tiempoTotal = episodios.reduce(
      (total, episodio) => total + (typeof episodio.runtime === 'number' ? episodio.runtime : 0),
      0,
    )

    const serieParaGuardar: TmdbSeries = {
      ...serie,
      tiempoTotal: tiempoTotal > 0 ? tiempoTotal : undefined,
    }

    setVistasSeriesTMDB((actuales) =>
      actuales.some((vista) => vista.id === serie.id) ? actuales : [...actuales, serieParaGuardar],
    )

    const { data: serieGuardada, error: errorBusqueda } = await supabase
      .from('user_series')
      .select('id, favorita')
      .eq('user_id', session.user.id)
      .eq('serie_id', serie.id)
      .maybeSingle()

    if (errorBusqueda) {
      console.error('Error al buscar la serie:', errorBusqueda)
      return
    }

    if (serieGuardada) {
      const { error } = await supabase
        .from('user_series')
        .update({ vista: true, duracion: tiempoTotal })
        .eq('id', serieGuardada.id)
      if (error) console.error('Error al marcar la serie como vista:', error)
    } else {
      const { error } = await supabase.from('user_series').insert({
        user_id: session.user.id,
        serie_id: serie.id,
        name: serie.name,
        poster_path: serie.poster_path,
        first_air_date: serie.first_air_date,
        vote_average: serie.vote_average,
        favorita: false,
        vista: true,
        duracion: tiempoTotal,
      })
      if (error) console.error('Error al guardar la serie vista:', error)
    }

    return
  }

  // Si se desmarca un episodio de una serie que estaba completa, deja de ser
  // una serie vista, pero conservamos los episodios que siguen marcados.
  setVistasSeriesTMDB((actuales) => actuales.filter((vista) => vista.id !== serie.id))

  const { data: serieGuardada, error: errorBusqueda } = await supabase
    .from('user_series')
    .select('id, favorita')
    .eq('user_id', session.user.id)
    .eq('serie_id', serie.id)
    .maybeSingle()

  if (errorBusqueda) {
    console.error('Error al buscar la serie:', errorBusqueda)
    return
  }

  if (serieGuardada) {
    if (serieGuardada.favorita) {
      const { error } = await supabase
        .from('user_series')
        .update({ vista: false })
        .eq('id', serieGuardada.id)
      if (error) console.error('Error al quitar la serie como vista:', error)
    } else {
      const { error } = await supabase
        .from('user_series')
        .delete()
        .eq('id', serieGuardada.id)
      if (error) console.error('Error al eliminar la serie:', error)
    }
  }
}

  const obtenerTodosLosEpisodiosSerie = async (serieId: number): Promise<TmdbEpisode[]> => {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY

    try {
      const respuestaSerie = await fetch(
        `https://api.themoviedb.org/3/tv/${serieId}?api_key=${apiKey}&language=es-ES`,
      )
      if (!respuestaSerie.ok) throw new Error('No se pudo obtener la serie')

      const datos: TmdbSeriesDetails = await respuestaSerie.json()
      const temporadas = (datos.seasons || [])
        .map((temporada) => temporada.season_number)
        .filter((numero) => numero >= 0)

      const resultados = await Promise.all(
        temporadas.map(async (numeroTemporada) => {
          try {
            const respuesta = await fetch(
              `https://api.themoviedb.org/3/tv/${serieId}/season/${numeroTemporada}?api_key=${apiKey}&language=es-ES`,
            )
            if (!respuesta.ok) return [] as TmdbEpisode[]
            const datosTemporada = await respuesta.json()
            return Array.isArray(datosTemporada.episodes)
              ? (datosTemporada.episodes as TmdbEpisode[])
              : []
          } catch (error) {
            console.error(`No se pudo cargar la temporada ${numeroTemporada}:`, error)
            return [] as TmdbEpisode[]
          }
        }),
      )

      return resultados.flat()
    } catch (error) {
      console.error(`No se pudieron obtener todos los episodios de la serie ${serieId}:`, error)
      return []
    }
  }

  const cargarRedDeAmigos = async () => {
    if (!session?.user?.id) return

    // Siempre partimos de una red vacía para que ningún dato antiguo o
    // ficticio pueda permanecer en pantalla mientras se actualiza Supabase.
    setFriends([])
    setAmigosActuales([])
    setSolicitudesRecibidas([])
    setSolicitudesEnviadas([])

    const [{ data: perfiles, error: perfilesError }, { data: relaciones, error: relacionesError }] = await Promise.all([
      supabase.from('profiles').select('id, username, display_name, avatar_url, created_at').order('username', { ascending: true }),
      supabase.from('friend_requests').select('id, sender_id, receiver_id, status, created_at').or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`).order('created_at', { ascending: false }),
    ])

    if (perfilesError) console.error('Error cargando usuarios:', perfilesError)
    if (relacionesError) console.error('Error cargando relaciones de amistad:', relacionesError)

    const perfilMap = new Map<string, any>((perfiles ?? []).map((perfil: any) => [perfil.id, perfil]))
    const amigos: string[] = []
    const recibidas: string[] = []
    const enviadas: string[] = []

    ;(relaciones ?? []).forEach((relacion: any) => {
      const soySolicitante = relacion.sender_id === session.user.id
      const otroId = soySolicitante ? relacion.receiver_id : relacion.sender_id
      if (relacion.status === 'accepted') amigos.push(otroId)
      if (relacion.status === 'pending' && !soySolicitante) recibidas.push(otroId)
      if (relacion.status === 'pending' && soySolicitante) enviadas.push(otroId)
    })

    const convertirPerfil = async (id: string): Promise<Friend> => {
      const perfil = perfilMap.get(id) ?? {}
      const [{ data: peliculas }, { data: series }] = await Promise.all([
        supabase.from('user_movies').select('*').eq('user_id', id),
        supabase.from('user_series').select('*').eq('user_id', id),
      ])
      const peliculasVistas = (peliculas ?? []).filter((p: any) => p.vista === true || p.watched === true).length
      const seriesVistas = (series ?? []).filter((s: any) => s.vista === true || s.watched === true).length
      const favoritos = (peliculas ?? []).filter((p: any) => p.favorita === true || p.favorite === true).length + (series ?? []).filter((s: any) => s.favorita === true || s.favorite === true).length
      return {
        id,
        name: perfil.display_name || perfil.username || 'Usuario',
        status: 'Ausente',
        watching: 'Nada indicado',
        movies: peliculasVistas,
        series: seriesVistas,
        favorites: favoritos,
        avatar: perfil.avatar_url || '👤',
      }
    }

    // Solo los perfiles que aparecen en una relación real de Supabase se
    // convierten en usuarios visibles. No existe ninguna lista de amigos
    // hardcodeada ni datos de ejemplo.
    const idsVisibles = Array.from(new Set([...amigos, ...recibidas, ...enviadas]))
    const perfilesConvertidos = await Promise.all(idsVisibles.map(convertirPerfil))
    setFriends(perfilesConvertidos)
    setAmigosActuales(amigos)
    setSolicitudesRecibidas(recibidas)
    setSolicitudesEnviadas(enviadas)
  }

  useEffect(() => {
    if (!session?.user?.id) return
    const cargarPerfilYAmigos = async () => {
      const { data: perfil, error } = await supabase.from('profiles').select('username, display_name, avatar_url').eq('id', session.user.id).maybeSingle()
      if (error) console.error('Error cargando perfil:', error)
      if (perfil) {
        setNombreUsuario(perfil.display_name || perfil.username || 'Usuario')
        setAvatarUsuario(perfil.avatar_url || '👤')
      }
      await cargarRedDeAmigos()
    }
    cargarPerfilYAmigos()
  }, [session])

  const abrirPerfil = async (amigo: Friend) => {
    setAmigoSeleccionado(amigo)
    setPagina('perfil')
    const actualizado = await (async () => {
      const perfil = await supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', amigo.id).maybeSingle()
      const [{ data: peliculas }, { data: series }] = await Promise.all([
        supabase.from('user_movies').select('*').eq('user_id', amigo.id),
        supabase.from('user_series').select('*').eq('user_id', amigo.id),
      ])
      const pv = (peliculas ?? []).filter((p: any) => p.vista === true || p.watched === true).length
      const sv = (series ?? []).filter((s: any) => s.vista === true || s.watched === true).length
      const fav = (peliculas ?? []).filter((p: any) => p.favorita === true || p.favorite === true).length + (series ?? []).filter((s: any) => s.favorita === true || s.favorite === true).length
      const pr: any = perfil.data ?? {}
      return { ...amigo, name: pr.display_name || pr.username || amigo.name, avatar: pr.avatar_url || amigo.avatar, movies: pv, series: sv, favorites: fav }
    })()
    setAmigoSeleccionado(actualizado)
  }

  const enviarSolicitudAmistad = async (usuario: Friend) => {
    if (!session?.user?.id || !usuario.id || usuario.id === session.user.id) return
    if (amigosActuales.includes(usuario.id) || solicitudesEnviadas.includes(usuario.id)) return
    const { error } = await supabase.from('friend_requests').insert({ sender_id: session.user.id, receiver_id: usuario.id, status: 'pending' })
    if (error) { console.error('Error enviando solicitud:', error); return }
    await cargarRedDeAmigos()
  }

  const aceptarSolicitud = async (usuarioId: string) => {
    if (!session?.user?.id) return
    const { error } = await supabase.from('friend_requests').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('sender_id', usuarioId).eq('receiver_id', session.user.id).eq('status', 'pending')
    if (error) { console.error('Error aceptando solicitud:', error); return }
    await cargarRedDeAmigos()
  }

  const rechazarSolicitud = async (usuarioId: string) => {
    if (!session?.user?.id) return
    const { error } = await supabase.from('friend_requests').delete().eq('sender_id', usuarioId).eq('receiver_id', session.user.id).eq('status', 'pending')
    if (error) { console.error('Error rechazando solicitud:', error); return }
    await cargarRedDeAmigos()
  }

  const eliminarAmigo = async (usuarioId: string) => {
    if (!session?.user?.id) return
    const { error } = await supabase.from('friend_requests').delete().or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${usuarioId}),and(sender_id.eq.${usuarioId},receiver_id.eq.${session.user.id})`)
    if (error) { console.error('Error eliminando amigo:', error); return }
    await cargarRedDeAmigos()
    if (amigoSeleccionado?.id === usuarioId) volverAmigos()
  }

  const abrirMiPerfil = () => {
    setAmigoSeleccionado(null)
    setPagina('mi-perfil')
  }

  const guardarPerfilUsuario = async () => {
    if (!session?.user?.id) return
    const nuevoNombre = nombreUsuario.trim() || 'Usuario'
    const nuevoAvatar = avatarUsuario || '👤'
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, username: nuevoNombre, display_name: nuevoNombre, avatar_url: nuevoAvatar }, { onConflict: 'id' })
    if (error) { console.error('Error guardando perfil:', error); return }
    setNombreUsuario(nuevoNombre)
    setAvatarUsuario(nuevoAvatar)
    setEditandoPerfil(false)
    await cargarRedDeAmigos()
  }

  const volverAmigos = () => {
    setAmigoSeleccionado(null)
    setPagina('amigos')
  }

  const cambiarVista = (id: number) => {
    setPeliculas(
      peliculas.map((pelicula) =>
        pelicula.id === id ? { ...pelicula, watched: !pelicula.watched } : pelicula,
      ),
    )
  }

  const cambiarFavorito = (id: number) => {
    setPeliculas(
      peliculas.map((pelicula) =>
        pelicula.id === id ? { ...pelicula, favorite: !pelicula.favorite } : pelicula,
      ),
    )
  }

  const cambiarFavoritoTMDB = async (pelicula: TmdbMovie) => {
  if (!session) return

  const existe = favoritasTMDB.some(
    (favorita) => favorita.id === pelicula.id
  )

  // Si ya es favorita → eliminar de Supabase
  if (existe) {
    const { error } = await supabase
      .from('user_movies')
      .delete()
      .eq('user_id', session.user.id)
      .eq('tmdb_id', pelicula.id)
      .eq('favorite', true)

    if (error) {
      console.error('Error al eliminar favorita:', error)
      return
    }

    setFavoritasTMDB((actuales) =>
      actuales.filter((favorita) => favorita.id !== pelicula.id)
    )

    return
  }

  // Guardar favorita en Supabase
  const { data, error } = await supabase
    .from('user_movies')
    .insert({
    user_id: session.user.id,
    tmdb_id: pelicula.id,
    title: pelicula.title,
    poster_path: pelicula.poster_path ?? null,
    release_date: pelicula.release_date ?? null,
    vote_average: pelicula.vote_average ?? 0,
    media_type: 'movie',
    watched: false,
    favorite: true,
})
    .select()
    console.log('INSERT FAVORITO - data:', data)
console.log('INSERT FAVORITO - error:', error)

  if (error) {
    console.error('Error al guardar favorita:', error)
    return
  }

  setFavoritasTMDB((actuales) => [...actuales, pelicula])
}
const cambiarVistaTMDB = async (pelicula: TmdbMovie) => {
  if (!session?.user) {
    console.error('No hay un usuario autenticado')
    return
  }

  const existe = vistasTMDB.some((vista) => vista.id === pelicula.id)

  // Si ya está vista → la eliminamos de Supabase
  if (existe) {
    const { error } = await supabase
      .from('user_movies')
      .delete()
      .eq('user_id', session.user.id)
      .eq('tmdb_id', pelicula.id)
      .eq('watched', true)

    if (error) {
      console.error('Error al eliminar la película vista:', error)
      return
    }

    setVistasTMDB((actuales) =>
      actuales.filter((vista) => vista.id !== pelicula.id)
    )

    return
  }

  let peliculaCompleta = pelicula

  // Obtener duración desde TMDB
  try {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY

    const respuesta = await fetch(
      `https://api.themoviedb.org/3/movie/${pelicula.id}?api_key=${apiKey}&language=es-ES`,
    )

    if (respuesta.ok) {
      const datos: TmdbMovieDetails = await respuesta.json()

      peliculaCompleta = {
        ...pelicula,
        runtime: datos.runtime ?? null,
        genres: datos.genres ?? [],
      }
    }
  } catch (error) {
    console.error(
      'No se pudo obtener la duración de la película:',
      error
    )
  }

  // Guardar en Supabase
  const { error } = await supabase
    .from('user_movies')
    .insert({
      user_id: session.user.id,
      tmdb_id: peliculaCompleta.id,
      title: peliculaCompleta.title,
      poster_path: peliculaCompleta.poster_path ?? null,
      media_type: 'movie',
      watched: true,
      favorite: false,
    })

  if (error) {
    console.error('Error al guardar la película vista:', error)
    return
  }

  setVistasTMDB((actuales) => [...actuales, peliculaCompleta])
}
  useEffect(() => {
    const actualizarDuracionesPeliculas = async () => {
      const pendientes = vistasTMDB.filter(
        (pelicula) => typeof pelicula.runtime !== 'number' || pelicula.runtime <= 0,
      )

      if (pendientes.length === 0) return

      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      const actualizadas = await Promise.all(
        vistasTMDB.map(async (pelicula) => {
          if (typeof pelicula.runtime === 'number' && pelicula.runtime > 0) return pelicula

          try {
            const respuesta = await fetch(
              `https://api.themoviedb.org/3/movie/${pelicula.id}?api_key=${apiKey}&language=es-ES`,
            )
            if (!respuesta.ok) return pelicula
            const datos: TmdbMovieDetails = await respuesta.json()
            return { ...pelicula, runtime: datos.runtime ?? null }
          } catch (error) {
            console.error(`No se pudo actualizar la duración de ${pelicula.title}:`, error)
            return pelicula
          }
        }),
      )

      setVistasTMDB(actualizadas)
      localStorage.setItem('wegeektv_vistas', JSON.stringify(actualizadas))
    }

    actualizarDuracionesPeliculas()
  }, [vistasTMDB])

  const cambiarFavoritaSerieTMDB = async (serie: TmdbSeries) => {
  if (!session) return

  const existe = favoritasSeriesTMDB.some(
    (favorita) => favorita.id === serie.id,
  )

  const nuevaFavorita = !existe

  // Actualizamos la pantalla
  setFavoritasSeriesTMDB((actuales) =>
    nuevaFavorita
      ? [...actuales, serie]
      : actuales.filter((favorita) => favorita.id !== serie.id),
  )

  // Comprobamos si esta serie ya existe en la base de datos
  const { data: serieGuardada, error: errorBusqueda } = await supabase
    .from('user_series')
    .select('id, vista')
    .eq('user_id', session.user.id)
    .eq('serie_id', serie.id)
    .maybeSingle()

  if (errorBusqueda) {
    console.error('Error al buscar la serie:', errorBusqueda)
    return
  }

  // Si la serie ya existe, actualizamos favorita
  if (serieGuardada) {
    if (!nuevaFavorita && !serieGuardada.vista) {
      // Si ya no es favorita y tampoco está marcada como vista,
      // eliminamos la fila porque ya no necesitamos guardarla.
      const { error } = await supabase
        .from('user_series')
        .delete()
        .eq('id', serieGuardada.id)

      if (error) {
        console.error('Error al eliminar la serie:', error)
      }

      return
    }

    const { error } = await supabase
      .from('user_series')
      .update({
        favorita: nuevaFavorita,
      })
      .eq('id', serieGuardada.id)

    if (error) {
      console.error('Error al actualizar la favorita:', error)
    }

    return
  }

  // Si no existía, creamos una nueva fila
  if (nuevaFavorita) {
    const { error } = await supabase.from('user_series').insert({
      user_id: session.user.id,
      serie_id: serie.id,
      name: serie.name,
      poster_path: serie.poster_path,
      vote_average: serie.vote_average,
      favorita: true,
      vista: false,
      duracion: serie.tiempoTotal ?? 0,
    })

    if (error) {
      console.error('Error al guardar la favorita:', error)
    }
  }
}

  // Calcula la duración real de una serie sumando la duración de sus episodios.
  // TMDB no siempre rellena `episode_run_time` en los detalles de la serie,
  // por eso consultamos cada temporada y sumamos los runtimes de los episodios.
  const obtenerTiempoTotalSerie = async (serieId: number): Promise<number> => {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY

    try {
      const respuestaSerie = await fetch(
        `https://api.themoviedb.org/3/tv/${serieId}?api_key=${apiKey}&language=es-ES`,
      )

      if (!respuestaSerie.ok) {
        throw new Error(`TMDB respondió ${respuestaSerie.status}`)
      }

      const datos: TmdbSeriesDetails = await respuestaSerie.json()
      const numeroTemporadas = datos.number_of_seasons || 0

      // Primero intentamos obtener la duración episodio por episodio.
      const temporadas = await Promise.all(
        Array.from({ length: numeroTemporadas }, (_, indice) => indice + 1).map(
          async (numeroTemporada) => {
            try {
              const respuestaTemporada = await fetch(
                `https://api.themoviedb.org/3/tv/${serieId}/season/${numeroTemporada}?api_key=${apiKey}&language=es-ES`,
              )

              if (!respuestaTemporada.ok) return 0

              const temporada = await respuestaTemporada.json()
              const episodios = Array.isArray(temporada.episodes)
                ? temporada.episodes
                : []

              return episodios.reduce(
                (total: number, episodio: { runtime?: number | null }) =>
                  total + (typeof episodio.runtime === 'number' && episodio.runtime > 0 ? episodio.runtime : 0),
                0,
              )
            } catch (error) {
              console.error(
                `No se pudo obtener la temporada ${numeroTemporada} de la serie ${serieId}:`,
                error,
              )
              return 0
            }
          },
        ),
      )

      const tiempoPorEpisodios = temporadas.reduce((total, minutos) => total + minutos, 0)

      if (tiempoPorEpisodios > 0) {
        return tiempoPorEpisodios
      }

      // Fallback: algunas series antiguas/raras no tienen runtime en los episodios.
      // En ese caso usamos la duración media que TMDB sí proporciona en el detalle.
      const numeroEpisodios = datos.number_of_episodes || 0
      const duraciones = datos.episode_run_time || []
      const duracionMedia =
        duraciones.length > 0
          ? duraciones.reduce((total, minutos) => total + minutos, 0) / duraciones.length
          : 0

      return Math.round(numeroEpisodios * duracionMedia)
    } catch (error) {
      console.error(`No se pudo calcular la duración de la serie ${serieId}:`, error)
      return 0
    }
  }

  const cambiarVistaSerieTMDB = async (serie: TmdbSeries) => {
    if (!session) return

    const existe = vistasSeriesTMDB.some((vista) => vista.id === serie.id)

    if (existe) {
      setVistasSeriesTMDB((actuales) => actuales.filter((vista) => vista.id !== serie.id))

      setEpisodiosVistos((actuales) => {
        const nuevas = { ...actuales }
        delete nuevas[String(serie.id)]
        localStorage.setItem('wegeektv_episodios_vistos', JSON.stringify(nuevas))
        return nuevas
      })

      const { data: serieGuardada, error: errorBusqueda } = await supabase
        .from('user_series')
        .select('id, favorita')
        .eq('user_id', session.user.id)
        .eq('serie_id', serie.id)
        .maybeSingle()

      if (errorBusqueda) {
        console.error('Error al buscar la serie:', errorBusqueda)
        return
      }

      if (serieGuardada) {
        if (!serieGuardada.favorita) {
          const { error } = await supabase.from('user_series').delete().eq('id', serieGuardada.id)
          if (error) console.error('Error al eliminar la serie:', error)
        } else {
          const { error } = await supabase
            .from('user_series')
            .update({ vista: false })
            .eq('id', serieGuardada.id)
          if (error) console.error('Error al quitar la vista:', error)
        }
      }
      return
    }

    // Marcar una serie completa como vista marca también todos sus episodios.
    // Así las estadísticas siempre pueden calcularse a nivel de episodio.
    const [tiempoTotal, todosLosEpisodios] = await Promise.all([
      obtenerTiempoTotalSerie(serie.id),
      obtenerTodosLosEpisodiosSerie(serie.id),
    ])

    const serieCompleta: TmdbSeries = { ...serie, tiempoTotal }

    setVistasSeriesTMDB((actuales) =>
      actuales.some((vista) => vista.id === serie.id) ? actuales : [...actuales, serieCompleta],
    )

    setEpisodiosVistos((actuales) => {
      const nuevas = { ...actuales, [String(serie.id)]: todosLosEpisodios }
      localStorage.setItem('wegeektv_episodios_vistos', JSON.stringify(nuevas))
      return nuevas
    })

    const { data: serieGuardada, error: errorBusqueda } = await supabase
      .from('user_series')
      .select('id, favorita')
      .eq('user_id', session.user.id)
      .eq('serie_id', serie.id)
      .maybeSingle()

    if (errorBusqueda) {
      console.error('Error al buscar la serie:', errorBusqueda)
      return
    }

    if (serieGuardada) {
      const { error } = await supabase
        .from('user_series')
        .update({ vista: true, duracion: tiempoTotal })
        .eq('id', serieGuardada.id)
      if (error) console.error('Error al marcar la serie como vista:', error)
      return
    }

    const { error } = await supabase.from('user_series').insert({
      user_id: session.user.id,
      serie_id: serie.id,
      name: serie.name,
      poster_path: serie.poster_path,
      vote_average: serie.vote_average,
      favorita: false,
      vista: true,
      duracion: tiempoTotal,
    })

    if (error) console.error('Error al guardar la serie vista:', error)
  }

  useEffect(() => {
    const actualizarDuracionesSeries = async () => {
      const pendientes = vistasSeriesTMDB.filter(
        (serie) => typeof serie.tiempoTotal !== 'number' || serie.tiempoTotal <= 0,
      )

      if (pendientes.length === 0) return

      const actualizadas = await Promise.all(
        vistasSeriesTMDB.map(async (serie) => {
          if (typeof serie.tiempoTotal === 'number' && serie.tiempoTotal > 0) {
            return serie
          }

          const tiempoTotal = await obtenerTiempoTotalSerie(serie.id)

          return {
            ...serie,
            tiempoTotal,
          }
        }),
      )

      // Solo actualizamos el estado si realmente ha cambiado alguna duración.
      const haCambiado = actualizadas.some(
        (serie, indice) => serie.tiempoTotal !== vistasSeriesTMDB[indice].tiempoTotal,
      )

      if (!haCambiado) return

      setVistasSeriesTMDB(actualizadas)
      localStorage.setItem('wegeektv_series_vistas', JSON.stringify(actualizadas))
    }

    actualizarDuracionesSeries()
  }, [vistasSeriesTMDB])

  const cargarCatalogoSeries = async () => {
    setBuscandoSeriesTMDB(true)
    setErrorSeriesTMDB('')

    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      const respuesta = await fetch(
        `https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&language=es-ES&page=1`,
      )

      if (!respuesta.ok) {
        throw new Error('No se pudo cargar el catálogo de series')
      }

      const datos = await respuesta.json()
      setResultadosSeriesTMDB(datos.results || [])
    } catch (error) {
      console.error(error)
      setResultadosSeriesTMDB([])
      setErrorSeriesTMDB('No hemos podido cargar las series de TMDB.')
    } finally {
      setBuscandoSeriesTMDB(false)
    }
  }

  const buscarSeriesEnTMDB = async () => {
    const texto = busquedaSeries.trim()

    if (!texto) {
      await cargarCatalogoSeries()
      return
    }

    setBuscandoSeriesTMDB(true)
    setErrorSeriesTMDB('')

    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      const respuesta = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&language=es-ES&query=${encodeURIComponent(texto)}`,
      )

      if (!respuesta.ok) {
        throw new Error('No se pudieron obtener las series')
      }

      const datos = await respuesta.json()
      setResultadosSeriesTMDB(datos.results || [])
    } catch (error) {
      console.error(error)
      setResultadosSeriesTMDB([])
      setErrorSeriesTMDB('No hemos podido conectar con TMDB.')
    } finally {
      setBuscandoSeriesTMDB(false)
    }
  }

  // Entrada a Series: cargamos el catálogo de forma explícita para no depender
  // únicamente de un efecto. Así las series aparecen siempre al entrar.
  const irASeries = () => {
    setBusquedaSeries('')
    setErrorSeriesTMDB('')
    setPagina('series')
    cargarCatalogoSeries()
  }

  // Búsqueda en directo: mientras escribes se actualizan los resultados sin Enter.
  // El catálogo inicial lo carga irASeries(), evitando estados vacíos al navegar.
  useEffect(() => {
    if (pagina !== 'series') return
    const texto = busquedaSeries.trim()
    if (!texto) return

    const temporizador = window.setTimeout(() => {
      buscarSeriesEnTMDB()
    }, 350)

    return () => window.clearTimeout(temporizador)
  }, [busquedaSeries, pagina])

  const abrirDetallesSerie = async (serie: TmdbSeries) => {
    setSerieSeleccionada(null)
    setErrorSerieDetalles('')
    setCargandoSerieDetalles(true)
    setPagina('detalleSerie')

    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      const respuesta = await fetch(
        `https://api.themoviedb.org/3/tv/${serie.id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`,
      )

      if (!respuesta.ok) {
        throw new Error('No se pudieron obtener los detalles')
      }

      const datos: TmdbSeriesDetails = await respuesta.json()
      setSerieSeleccionada(datos)
    } catch (error) {
      console.error(error)
      setErrorSerieDetalles('No hemos podido cargar los detalles de esta serie.')
    } finally {
      setCargandoSerieDetalles(false)
    }
  }
  

  const cerrarDetallesSerie = () => {
    setSerieSeleccionada(null)
    setErrorSerieDetalles('')
    irASeries()
  }

  const buscarEnTMDB = async () => {
    const texto = busqueda.trim()

    if (!texto) {
      setResultadosTMDB([])
      setErrorTMDB('')
      return
    }

    setBuscandoTMDB(true)
    setErrorTMDB('')

    try {
      const resultados = await buscarPeliculas(texto)
      setResultadosTMDB(resultados)
    } catch (error) {
      console.error(error)
      setResultadosTMDB([])
      setErrorTMDB('No hemos podido conectar con TMDB.')
    } finally {
      setBuscandoTMDB(false)
    }
  }

  // Carga el catálogo real de TMDB cuando entramos en Películas.
  // Las tres filas se mantienen independientes para que la página se sienta
  // como una plataforma de streaming y no como una lista estática.
  useEffect(() => {
    if (pagina !== 'peliculas' || cargandoCatalogoPeliculas) return
    if (peliculasPopularesTMDB.length || peliculasMejorValoradasTMDB.length || peliculasEstrenosTMDB.length) return

    const cargarCatalogo = async () => {
      setCargandoCatalogoPeliculas(true)
      setErrorTMDB('')
      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      const base = 'https://api.themoviedb.org/3/movie'

      try {
        const endpoints = [
          `${base}/popular?api_key=${apiKey}&language=es-ES&region=ES&page=1`,
          `${base}/top_rated?api_key=${apiKey}&language=es-ES&region=ES&page=1`,
          `${base}/now_playing?api_key=${apiKey}&language=es-ES&region=ES&page=1`,
        ]

        const respuestas = await Promise.all(endpoints.map((url) => fetch(url)))
        if (respuestas.some((respuesta) => !respuesta.ok)) {
          throw new Error('No se pudo cargar el catálogo')
        }

        const datos = await Promise.all(respuestas.map((respuesta) => respuesta.json()))
        setPeliculasPopularesTMDB(datos[0].results || [])
        setPeliculasMejorValoradasTMDB(datos[1].results || [])
        setPeliculasEstrenosTMDB(datos[2].results || [])
      } catch (error) {
        console.error(error)
        setErrorTMDB('No hemos podido cargar el catálogo de películas.')
      } finally {
        setCargandoCatalogoPeliculas(false)
      }
    }

    cargarCatalogo()
  }, [pagina, cargandoCatalogoPeliculas, peliculasPopularesTMDB.length, peliculasMejorValoradasTMDB.length, peliculasEstrenosTMDB.length])

  // Búsqueda instantánea con una pequeña pausa para no hacer una petición
  // a TMDB por cada tecla que se pulsa.
  useEffect(() => {
    if (pagina !== 'peliculas') return

    const texto = busqueda.trim()
    if (!texto) {
      setResultadosTMDB([])
      setErrorTMDB('')
      return
    }

    const temporizador = window.setTimeout(() => {
      buscarEnTMDB()
    }, 350)

    return () => window.clearTimeout(temporizador)
  }, [busqueda, pagina])

  const abrirDetalles = async (pelicula: TmdbMovie) => {
    setPeliculaSeleccionada(null)
    setErrorDetalles('')
    setCargandoDetalles(true)
    setPagina('detalle')

    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      const respuesta = await fetch(
        `https://api.themoviedb.org/3/movie/${pelicula.id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`,
      )

      if (!respuesta.ok) {
        throw new Error('No se pudieron obtener los detalles')
      }

      const datos: TmdbMovieDetails = await respuesta.json()
      setPeliculaSeleccionada(datos)
    } catch (error) {
      console.error(error)
      setErrorDetalles('No hemos podido cargar los detalles de esta película.')
    } finally {
      setCargandoDetalles(false)
    }
  }

  const cerrarDetalles = () => {
    setPeliculaSeleccionada(null)
    setErrorDetalles('')
    setPagina('peliculas')
  }

  const peliculasFiltradas = peliculas.filter((pelicula) => {
    const coincideBusqueda = pelicula.title.toLowerCase().includes(busqueda.toLowerCase())

    if (!coincideBusqueda) return false
    if (filtro === 'vistas') return pelicula.watched
    if (filtro === 'pendientes') return !pelicula.watched
    if (filtro === 'favoritas') return pelicula.favorite
    return true
  })

  

  const tmdbFavoritas = favoritasTMDB
  const tmdbVistas = vistasTMDB

  useEffect(() => {
    if (cargandoGenerosLogros) return
    const hayGenerosPendientes = vistasTMDB.some((pelicula) => !pelicula.genres?.length) || vistasSeriesTMDB.some((serie) => !serie.genres?.length)
    if (!hayGenerosPendientes) return

    const cargarGeneros = async () => {
      setCargandoGenerosLogros(true)
      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      try {
        const movieCache: Record<string, { id: number; name: string }[]> = JSON.parse(localStorage.getItem('wegeektv_generos_peliculas_cache') || '{}')
        const seriesCache: Record<string, { id: number; name: string }[]> = JSON.parse(localStorage.getItem('wegeektv_generos_series_cache') || '{}')

        const peliculasActualizadas = await Promise.all(vistasTMDB.map(async (pelicula) => {
          if (pelicula.genres?.length) return pelicula
          if (movieCache[String(pelicula.id)]) return { ...pelicula, genres: movieCache[String(pelicula.id)] }
          try {
            const respuesta = await fetch(`https://api.themoviedb.org/3/movie/${pelicula.id}?api_key=${apiKey}&language=es-ES`)
            if (!respuesta.ok) return pelicula
            const datos = await respuesta.json()
            const genres = Array.isArray(datos.genres) ? datos.genres : []
            movieCache[String(pelicula.id)] = genres
            return { ...pelicula, genres }
          } catch { return pelicula }
        }))

        const seriesActualizadas = await Promise.all(vistasSeriesTMDB.map(async (serie) => {
          if (serie.genres?.length) return serie
          if (seriesCache[String(serie.id)]) return { ...serie, genres: seriesCache[String(serie.id)] }
          try {
            const respuesta = await fetch(`https://api.themoviedb.org/3/tv/${serie.id}?api_key=${apiKey}&language=es-ES`)
            if (!respuesta.ok) return serie
            const datos = await respuesta.json()
            const genres = Array.isArray(datos.genres) ? datos.genres : []
            seriesCache[String(serie.id)] = genres
            return { ...serie, genres }
          } catch { return serie }
        }))

        localStorage.setItem('wegeektv_generos_peliculas_cache', JSON.stringify(movieCache))
        localStorage.setItem('wegeektv_generos_series_cache', JSON.stringify(seriesCache))
        const moviesChanged = peliculasActualizadas.some((movie, index) => movie.genres !== vistasTMDB[index]?.genres)
        const seriesChanged = seriesActualizadas.some((serie, index) => serie.genres !== vistasSeriesTMDB[index]?.genres)
        if (moviesChanged) setVistasTMDB(peliculasActualizadas)
        if (seriesChanged) setVistasSeriesTMDB(seriesActualizadas)
      } finally {
        setCargandoGenerosLogros(false)
      }
    }

    cargarGeneros()
  }, [vistasTMDB, vistasSeriesTMDB, cargandoGenerosLogros])

  const logrosCalculados = useMemo<AchievementProgress[]>(() => {
    const episodiosTotalesVistos = (Object.values(episodiosVistos) as TmdbEpisode[][]).reduce(
      (total, episodios) => total + (Array.isArray(episodios) ? episodios.length : 0),
      0,
    )
    const minutosPeliculas = vistasTMDB.reduce((total, pelicula) => total + (pelicula.runtime || 0), 0)
    const minutosSeries = (Object.values(episodiosVistos) as TmdbEpisode[][]).reduce(
      (total, episodios) => total + (Array.isArray(episodios) ? episodios.reduce((subtotal, episodio) => subtotal + (episodio.runtime || 0), 0) : 0),
      0,
    )
    const horasTotales = (minutosPeliculas + minutosSeries) / 60
    const mesesInvertidos = horasTotales / (24 * 30)

    const movieGenreCount = (ids: number[]) => vistasTMDB.filter((movie) => (movie.genres ?? []).some((genre) => ids.includes(genre.id))).length
    const seriesGenreCount = (ids: number[]) => vistasSeriesTMDB.filter((serie) => (serie.genres ?? []).some((genre) => ids.includes(genre.id))).length
    const yearCount = (type: 'classic' | 'modern' | 'current') => vistasTMDB.filter((movie) => {
      const year = Number(movie.release_date?.slice(0, 4))
      if (!year) return false
      if (type === 'classic') return year < 1970
      if (type === 'modern') return year >= 1970 && year <= 1999
      return year >= 2000
    }).length

    const values: Record<number, number> = {
      1: vistasTMDB.length,
      2: vistasSeriesTMDB.length,
      3: episodiosTotalesVistos,
      22: yearCount('classic'),
      23: yearCount('modern'),
      24: yearCount('current'),
      25: mesesInvertidos,
    }

    ACHIEVEMENTS.forEach((achievement) => {
      if (achievement.movieGenre) values[achievement.id] = movieGenreCount(achievement.movieGenre)
      if (achievement.seriesGenre) values[achievement.id] = seriesGenreCount(achievement.seriesGenre)
    })

    // Todoterreno: el nivel depende del nivel mínimo alcanzado en todos los géneros de ese bloque.
    for (const achievement of ACHIEVEMENTS.filter((item) => item.meta)) {
      const niveles = (achievement.meta ?? []).map((id) => {
        const origen = ACHIEVEMENTS.find((item) => item.id === id)
        return achievementTier(values[id] ?? 0, origen?.thresholds ?? [])
      })
      values[achievement.id] = niveles.length ? Math.max(0, Math.min(...niveles) + 1) : 0
    }

    // El logro 25 mide tiempo real de visionado acumulado.

    return ACHIEVEMENTS.map((achievement) => {
      const value = values[achievement.id] ?? 0
      const tierIndex = achievementTier(value, achievement.thresholds)
      const nextThreshold = achievement.thresholds.find((threshold) => value < threshold) ?? null
      const previousThreshold = tierIndex >= 0 ? achievement.thresholds[tierIndex] : 0
      const target = nextThreshold ?? achievement.thresholds[achievement.thresholds.length - 1]
      const percent = tierIndex === achievement.thresholds.length - 1
        ? 100
        : Math.max(0, Math.min(100, ((value - previousThreshold) / Math.max(1, target - previousThreshold)) * 100))
      return {
        id: achievement.id,
        name: achievement.name,
        icon: achievement.icon,
        description: achievement.description,
        value,
        thresholds: achievement.thresholds,
        tierIndex,
        nextThreshold,
        percent,
        completed: tierIndex === achievement.thresholds.length - 1,
      }
    })
  }, [episodiosVistos, vistasTMDB, vistasSeriesTMDB])

  useEffect(() => {
    if (!session) return

    try {
      const unlockedKey = 'wegeektv_logros_desbloqueados'
      const notifiedKey = 'wegeektv_logros_notificados'

      const previous: Record<string, number> = JSON.parse(localStorage.getItem(unlockedKey) || '{}')
      const notified: Record<string, number> = JSON.parse(localStorage.getItem(notifiedKey) || '{}')

      const next = { ...previous }
      const nextNotified = { ...notified }
      const nuevos: AchievementProgress[] = []

      for (const achievement of logrosCalculados) {
        const currentLevel = achievement.tierIndex + 1
        const oldLevel = previous[String(achievement.id)] ?? 0
        const oldNotifiedLevel = notified[String(achievement.id)] ?? 0

        if (currentLevel > oldLevel) {
          next[String(achievement.id)] = currentLevel
        }

        // Solo mostramos la categoría que se acaba de alcanzar.
        // Así no se genera una cola interminable si ya había varios logros pendientes.
        if (currentLevel > 0 && currentLevel > oldNotifiedLevel) {
          nuevos.push({ ...achievement, tierIndex: currentLevel - 1 })
          nextNotified[String(achievement.id)] = currentLevel
        }
      }

      localStorage.setItem(unlockedKey, JSON.stringify(next))
      localStorage.setItem(notifiedKey, JSON.stringify(nextNotified))

      if (nuevos.length) {
        setLogrosNotificacion((actuales) => [...actuales, ...nuevos])
      }
    } catch (error) {
      console.error('No se pudieron actualizar los logros:', error)
    }
  }, [logrosCalculados, session])

  // El temporizador vive separado del cálculo de logros.
  // Así una actualización de estadísticas o de géneros nunca reinicia el contador.
  useEffect(() => {
    const actual = logrosNotificacion[0]
    if (!actual) return

    // Cada ventana tiene su propio contador. Si aparece otro logro, el contador
    // empieza de nuevo para que la ventana nunca quede colgada en pantalla.
    const timeout = window.setTimeout(() => {
      setLogrosNotificacion((actuales) => actuales.slice(1))
    }, 4200)

    return () => window.clearTimeout(timeout)
  }, [logrosNotificacion])

  const cerrarNotificacionLogro = () => {
    // El botón X y el fondo cierran inmediatamente la ventana actual.
    setLogrosNotificacion((actuales) => actuales.slice(1))
  }

  const renderSeriesCard = (serie: TmdbSeries) => {
    const esFavorita = favoritasSeriesTMDB.some((favorita) => favorita.id === serie.id)
    const estaVista = vistasSeriesTMDB.some((vista) => vista.id === serie.id)

    return (
      <div
        key={serie.id}
        className="series-card"
        style={tmdbCardStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-6px)'
          e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.28)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.18)'
        }}
      >
        <div className="series-card-poster" style={tmdbPosterStyle}>
          {serie.poster_path ? (
            <img
              src={`${TMDB_IMAGE_URL}${serie.poster_path}`}
              alt={serie.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
              }}
            >
              📺
            </div>
          )}
        </div>

        <div style={{ padding: '15px 16px 17px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '17px', lineHeight: 1.25, minHeight: '42px' }}>
            {serie.name}
          </h3>

          <p style={{ margin: 0, opacity: 0.78, fontSize: '14px' }}>
            {serie.first_air_date ? serie.first_air_date.substring(0, 4) : 'Sin año'}
            {' · '}
            ⭐ {serie.vote_average.toFixed(1)}
          </p>

          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              onClick={() => cambiarFavoritaSerieTMDB(serie)}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '10px',
                padding: '10px 8px',
                cursor: 'pointer',
                fontSize: '14px',
                background: esFavorita ? 'rgba(255, 70, 140, 0.25)' : 'rgba(255,255,255,0.08)',
                color: esFavorita ? '#ff4f9a' : 'inherit',
              }}
            >
              {esFavorita ? '❤️ Favorita' : '🤍 Favorito'}
            </button>

            <button
              onClick={() => cambiarVistaSerieTMDB(serie)}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '10px',
                padding: '10px 8px',
                cursor: 'pointer',
                fontSize: '14px',
                background: estaVista ? 'rgba(80, 220, 150, 0.20)' : 'rgba(255,255,255,0.08)',
                color: estaVista ? '#55e69b' : 'inherit',
              }}
            >
              {estaVista ? '👁️ Vista' : '👁️ Marcar vista'}
            </button>
          </div>

          <button
            className="secondary"
            style={{ width: '100%', marginTop: '9px' }}
            onClick={() => abrirDetallesSerie(serie)}
          >
            Ver detalles
          </button>
        </div>
      </div>
    )
  }

  const renderCatalogoCard = (pelicula: TmdbMovie) => {
    const esFavorita = favoritasTMDB.some((favorita) => favorita.id === pelicula.id)
    const estaVista = vistasTMDB.some((vista) => vista.id === pelicula.id)

    return (
      <article className="netflix-movie-card" key={pelicula.id}>
        <button
          type="button"
          className="netflix-movie-poster-button"
          onClick={() => abrirDetalles(pelicula)}
          aria-label={`Ver detalles de ${pelicula.title}`}
        >
          {pelicula.poster_path ? (
            <img
              src={`${TMDB_IMAGE_URL}${pelicula.poster_path}`}
              alt={pelicula.title}
              className="netflix-movie-poster"
              loading="lazy"
            />
          ) : (
            <div className="netflix-movie-poster netflix-movie-poster-empty">🎬</div>
          )}
          <span className="netflix-movie-overlay">
            <span className="netflix-play">▶</span>
          </span>
        </button>

        <div className="netflix-movie-info">
          <button type="button" className="netflix-movie-title" onClick={() => abrirDetalles(pelicula)}>
            {pelicula.title}
          </button>
          <div className="netflix-movie-meta">
            <span>{pelicula.release_date?.substring(0, 4) || '—'}</span>
            <span>⭐ {typeof pelicula.vote_average === 'number' ? pelicula.vote_average.toFixed(1) : '—'}</span>
          </div>
          <div className="netflix-movie-actions">
            <button
              type="button"
              className={esFavorita ? 'netflix-action active-pink' : 'netflix-action'}
              onClick={() => cambiarFavoritoTMDB(pelicula)}
              aria-label={esFavorita ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            >
              {esFavorita ? '♥' : '♡'}
            </button>
            <button
              type="button"
              className={estaVista ? 'netflix-action active-blue' : 'netflix-action'}
              onClick={() => cambiarVistaTMDB(pelicula)}
              aria-label={estaVista ? 'Quitar como vista' : 'Marcar como vista'}
            >
              {estaVista ? '✓' : '○'}
            </button>
          </div>
        </div>
      </article>
    )
  }

  const renderTmdbCard = (pelicula: TmdbMovie) => {
    const esFavorita = favoritasTMDB.some((favorita) => favorita.id === pelicula.id)
    const estaVista = vistasTMDB.some((vista) => vista.id === pelicula.id)

    return (
      <div
        key={pelicula.id}
        style={tmdbCardStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-6px)'
          e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.28)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.18)'
        }}
      >
        <div style={tmdbPosterStyle}>
          {pelicula.poster_path ? (
            <img
              src={`${TMDB_IMAGE_URL}${pelicula.poster_path}`}
              alt={pelicula.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
              }}
            >
              🎬
            </div>
          )}
        </div>

        <div style={{ padding: '15px 16px 17px' }}>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '17px',
              lineHeight: 1.25,
              minHeight: '42px',
            }}
          >
            {pelicula.title}
          </h3>

          <p style={{ margin: 0, opacity: 0.78, fontSize: '14px' }}>
            {pelicula.release_date
              ? pelicula.release_date.substring(0, 4)
              : 'Sin año'}
            {' · '}
            ⭐ {typeof pelicula.vote_average === 'number' ? pelicula.vote_average.toFixed(1) : '—'}
          </p>

          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              onClick={() => cambiarFavoritoTMDB(pelicula)}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '10px',
                padding: '10px 8px',
                cursor: 'pointer',
                fontSize: '14px',
                background: esFavorita
                  ? 'rgba(255, 70, 140, 0.25)'
                  : 'rgba(255,255,255,0.08)',
                color: esFavorita ? '#ff4f9a' : 'inherit',
              }}
            >
              {esFavorita ? '❤️ Favorita' : '🤍 Favorito'}
            </button>

            <button
              onClick={() => cambiarVistaTMDB(pelicula)}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '10px',
                padding: '10px 8px',
                cursor: 'pointer',
                fontSize: '14px',
                background: estaVista
                  ? 'rgba(80, 220, 150, 0.20)'
                  : 'rgba(255,255,255,0.08)',
                color: estaVista ? '#55e69b' : 'inherit',
              }}
            >
              {estaVista ? '👁️ Vista' : '👁️ Marcar vista'}
            </button>
          </div>

          <button
            className="secondary"
            style={{ width: '100%', marginTop: '9px' }}
            onClick={() => abrirDetalles(pelicula)}
          >
            Ver detalles
          </button>
        </div>
      </div>
    )
  }
  if (!session) {
  return <Auth />
}

  return (
    <div className="app">
      <div className="cinema-doodles" aria-hidden="true">
        <span className="doodle-film">▰▰▰</span>
        <span className="doodle-reel">◉</span>
        <span className="doodle-clapper">▱</span>
        <span className="doodle-star">✦</span>
        <span className="doodle-ticket">✧</span>
        <span className="doodle-film-two">▰▰▰</span>
      </div>
      <style>{`
        /* Navegación premium WeGeekTV: misma posición y mismas secciones, solo acabado visual. */
        .header {
          background: linear-gradient(180deg, rgba(8,10,22,.96), rgba(8,10,22,.82)) !important;
          border-bottom: 1px solid rgba(255,255,255,.10) !important;
          box-shadow: 0 14px 42px rgba(0,0,0,.28), 0 1px 0 rgba(255,79,163,.06) !important;
          backdrop-filter: blur(18px) saturate(130%) !important;
          -webkit-backdrop-filter: blur(18px) saturate(130%) !important;
        }
        .header nav {
          gap: 4px !important;
          padding: 5px !important;
          border: 1px solid rgba(255,255,255,.075) !important;
          border-radius: 17px !important;
          background: linear-gradient(135deg, rgba(255,255,255,.045), rgba(104,126,255,.025)) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 8px 28px rgba(0,0,0,.18) !important;
          backdrop-filter: blur(14px) !important;
          -webkit-backdrop-filter: blur(14px) !important;
        }
        .header nav .wg-nav-link {
          position: relative !important;
          border: 1px solid transparent !important;
          border-radius: 12px !important;
          background: transparent !important;
          color: #b9bdd0 !important;
          padding: 9px 13px !important;
          font-weight: 650 !important;
          letter-spacing: -.1px !important;
          transition: color .22s ease, background .22s ease, border-color .22s ease, transform .22s ease, box-shadow .22s ease !important;
          white-space: nowrap !important;
        }
        .header nav .wg-nav-link:nth-child(1) { color: #ffd36a !important; }
        .header nav .wg-nav-link:nth-child(2) { color: #ff82b9 !important; }
        .header nav .wg-nav-link:nth-child(3) { color: #d69cff !important; }
        .header nav .wg-nav-link:nth-child(4) { color: #ff8fca !important; }
        .header nav .wg-nav-link:nth-child(5) { color: #73d9ff !important; }
        .header nav .wg-nav-link:nth-child(6) { color: #ffc86b !important; }
        .header nav .wg-nav-link:nth-child(7) { color: #bda0ff !important; }
        .header nav .wg-nav-link:nth-child(8) { color: #ff9bc9 !important; }
        .header nav .wg-nav-link::after {
          content: '';
          position: absolute;
          left: 20%;
          right: 20%;
          bottom: 4px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, #ff4f9f, #ffd34f);
          opacity: 0;
          transform: scaleX(.35);
          transition: opacity .22s ease, transform .22s ease;
        }
        .header nav .wg-nav-link:hover {
          color: #fff !important;
          background: linear-gradient(135deg, rgba(255,79,163,.13), rgba(104,126,255,.09)) !important;
          border-color: rgba(255,105,179,.20) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 7px 20px rgba(255,79,163,.08) !important;
        }
        .header nav .wg-nav-link:hover::after,
        .header nav .wg-nav-active::after {
          opacity: 1;
          transform: scaleX(1);
        }
        .header nav .wg-nav-active {
          color: #ffffff !important;
          background: linear-gradient(135deg, rgba(255,79,163,.20), rgba(104,126,255,.15)) !important;
          border-color: rgba(255,105,179,.24) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 7px 22px rgba(255,79,163,.09) !important;
        }
        .header nav .wg-nav-active::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(circle at 50% 0%, rgba(255,255,255,.09), transparent 58%);
          pointer-events: none;
        }
        @media (max-width: 1050px) {
          .header nav { padding: 4px !important; gap: 2px !important; }
          .header nav .wg-nav-link { padding: 8px 10px !important; font-size: 13px !important; }
        }
        @media (max-width: 800px) {
          .header nav { padding: 3px !important; border-radius: 14px !important; }
          .header nav .wg-nav-link { padding: 8px 10px !important; font-size: 12px !important; }
        }
      `}</style>

      <header className="header">
        <div
          className="logo"
          onClick={() => setPagina('inicio')}
          style={{ cursor: 'pointer' }}
        >
          <span className="logo-we">We</span><span className="logo-geek">Geek</span><span className="logo-tv">TV</span>
        </div>

        <nav>
          <button className={`wg-nav-link ${pagina === 'inicio' ? 'wg-nav-active' : ''}`} onClick={() => setPagina('inicio')}>Inicio</button>
          <button className={`wg-nav-link ${pagina === 'peliculas' || pagina === 'detalle' ? 'wg-nav-active' : ''}`} onClick={() => setPagina('peliculas')}>Películas</button>
          <button className={`wg-nav-link ${pagina === 'series' || pagina === 'detalleSerie' ? 'wg-nav-active' : ''}`} onClick={() => irASeries()}>Series</button>
          <button
            className={`wg-nav-link ${pagina === 'coleccion' ? 'wg-nav-active' : ''}`}
            onClick={() => {
              setFiltro('favoritas')
              setTipoColeccion('peliculas')
              setPagina('coleccion')
            }}
          >
            Mi colección
          </button>
          <button className={`wg-nav-link ${pagina === 'estadisticas' ? 'wg-nav-active' : ''}`} onClick={() => setPagina('estadisticas')}>Estadísticas</button>
          <button className={`wg-nav-link ${pagina === 'logros' ? 'wg-nav-active' : ''}`} onClick={() => setPagina('logros')}>Logros</button>
          <button className={`wg-nav-link ${pagina === 'vitrina' ? 'wg-nav-active' : ''}`} onClick={() => setPagina('vitrina')}>Vitrina</button>
          <button className={`wg-nav-link ${pagina === 'amigos' || pagina === 'perfil' ? 'wg-nav-active' : ''}`} onClick={() => setPagina('amigos')}>Amigos</button>
        </nav>

        <div className="profile" onClick={abrirMiPerfil} style={{ cursor: 'pointer' }} title="Mi perfil">{avatarUsuario}</div>
      </header>

      <main>
        {logrosNotificacion.length > 0 && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 5000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,.34)',
                backdropFilter: 'blur(3px)',
                pointerEvents: 'auto',
              }}
              onClick={cerrarNotificacionLogro}
            />

            <div
              style={{
                position: 'relative',
                width: 'min(560px, calc(100vw - 32px))',
                padding: '30px 28px 26px',
                borderRadius: '30px',
                background: 'linear-gradient(145deg, rgba(16,18,29,.98), rgba(30,24,48,.98))',
                border: `1px solid ${ACHIEVEMENT_TIER_COLORS[logrosNotificacion[0].tierIndex]}`,
                boxShadow: `0 30px 100px ${ACHIEVEMENT_TIER_GLOWS[logrosNotificacion[0].tierIndex]}, 0 0 0 1px rgba(255,255,255,.05)`,
                textAlign: 'center',
                animation: 'achievementPop .55s ease-out both',
              }}
            >
              <button
                type="button"
                onClick={cerrarNotificacionLogro}
                aria-label="Cerrar logro"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '14px',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,.12)',
                  background: 'rgba(255,255,255,.07)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>

              <div style={{ fontSize: '11px', letterSpacing: '2.5px', fontWeight: 900, opacity: .62 }}>
                ¡LOGRO DESBLOQUEADO!
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 2px' }}>
                <AchievementBadge
                  achievement={logrosNotificacion[0]}
                  tierIndex={logrosNotificacion[0].tierIndex}
                  size={170}
                />
              </div>

              <h2 style={{ margin: '5px 0 7px', fontSize: '25px' }}>
                {logrosNotificacion[0].name}
              </h2>

              <strong
                style={{
                  color: ACHIEVEMENT_TIER_COLORS[logrosNotificacion[0].tierIndex],
                  fontSize: '14px',
                  letterSpacing: '1.2px',
                }}
              >
                {ACHIEVEMENT_TIER_NAMES[logrosNotificacion[0].tierIndex].toUpperCase()}
              </strong>

              {logrosNotificacion.length > 1 && (
                <p style={{ margin: '13px 0 0', fontSize: '12px', opacity: .55 }}>
                  + {logrosNotificacion.length - 1} logro{logrosNotificacion.length - 1 === 1 ? '' : 's'} más en cola
                </p>
              )}
            </div>
          </div>
        )}
        <style>{`@keyframes achievementPop{0%{transform:translateY(30px) scale(.82);opacity:0}60%{transform:translateY(-5px) scale(1.03);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}@keyframes achievementGlow{0%,100%{box-shadow:0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 36px rgba(255,255,255,.10)}}@keyframes achievementSpark{0%,100%{opacity:.35;transform:scale(.8) rotate(0deg)}50%{opacity:1;transform:scale(1.15) rotate(20deg)}}`}</style>
        {pagina === 'inicio' && (
          <section
            className="home-v2-page"
            style={{
              width: '100%',
              maxWidth: '1240px',
              margin: '0 auto',
              padding: '18px 0 60px',
            }}
          >
            {(() => {
              const totalFavoritos = favoritasTMDB.length + favoritasSeriesTMDB.length
              const minutosPeliculas = vistasTMDB.reduce(
                (total, pelicula) => total + (pelicula.runtime || 0),
                0,
              )
              const minutosSeriesPorEpisodios = (Object.values(episodiosVistos) as TmdbEpisode[][]).reduce(
                (total, episodios) =>
                  total +
                  (Array.isArray(episodios)
                    ? episodios.reduce((subtotal, episodio) => subtotal + (episodio.runtime || 0), 0)
                    : 0),
                0,
              )
              const minutosSeriesAntiguas = vistasSeriesTMDB.reduce((total, serie) => {
                const episodiosDeSerie = episodiosVistos[String(serie.id)] || []
                return episodiosDeSerie.length === 0 ? total + (serie.tiempoTotal || 0) : total
              }, 0)
              const minutosSeries = minutosSeriesPorEpisodios + minutosSeriesAntiguas
              const minutosTotales = minutosPeliculas + minutosSeries
              const horasTotales = Math.floor(minutosTotales / 60)
              const minutosRestantes = minutosTotales % 60
              const tiempoTexto =
                horasTotales > 0
                  ? `${horasTotales}h ${minutosRestantes}min`
                  : `${minutosRestantes}min`

              const vistosRecientes = [
                ...vistasSeriesTMDB.slice(-4).reverse().map((serie) => ({
                  id: `serie-${serie.id}`,
                  titulo: serie.name,
                  año: serie.first_air_date?.substring(0, 4) || '—',
                  poster: serie.poster_path,
                  tipo: 'Serie',
                  rating: serie.vote_average,
                })),
                ...vistasTMDB.slice(-4).reverse().map((pelicula) => ({
                  id: `movie-${pelicula.id}`,
                  titulo: pelicula.title,
                  año: pelicula.release_date?.substring(0, 4) || '—',
                  poster: pelicula.poster_path,
                  tipo: 'Película',
                  rating: pelicula.vote_average,
                })),
              ].slice(0, 4)

              const favoritosRecientes = [
                ...favoritasSeriesTMDB.slice(-3).reverse().map((serie) => ({
                  id: `serie-${serie.id}`,
                  titulo: serie.name,
                  año: serie.first_air_date?.substring(0, 4) || '—',
                  poster: serie.poster_path,
                  tipo: 'Serie',
                })),
                ...favoritasTMDB.slice(-3).reverse().map((pelicula) => ({
                  id: `movie-${pelicula.id}`,
                  titulo: pelicula.title,
                  año: pelicula.release_date?.substring(0, 4) || '—',
                  poster: pelicula.poster_path,
                  tipo: 'Película',
                })),
              ].slice(0, 6)

              return (
                <>
                  {/* ================= HERO INICIO V2 ================= */}
                  <section className="home-hero">
                    <div
                      className="home-hero-backdrop"
                      style={
                        (() => {
                          const reciente = vistosRecientes[0]
                          const origenSerie = reciente?.id?.startsWith('serie-')
                          const origen = origenSerie
                            ? vistasSeriesTMDB.find((serie) => String(serie.id) === reciente?.id?.replace('serie-', ''))
                            : vistasTMDB.find((pelicula) => String(pelicula.id) === reciente?.id?.replace('movie-', ''))
                          return origen?.backdrop_path
                            ? {
                                backgroundImage: `url(${`https://image.tmdb.org/t/p/original${origen.backdrop_path}`})`,
                              }
                            : undefined
                        })()
                      }
                    />
                    <div className="home-hero-overlay" />

                    <div className="home-hero-content">
                      <div className="home-hero-copy">
                        <p className="home-eyebrow">BIENVENIDO A WEGEEKTV</p>
                        <h1>
                          Tu mundo.
                          <br />
                          <span>Tu colección.</span>
                        </h1>
                        <p className="home-hero-description">
                          Descubre, guarda y comparte todo lo que ves. Películas, series,
                          favoritos, estadísticas y logros, todo en un solo sitio.
                        </p>

                        <div className="home-hero-actions">
                          <button className="primary" onClick={() => setPagina('peliculas')}>
                            ▶ Explorar contenido
                          </button>
                          <button
                            className="secondary"
                            onClick={() => {
                              setFiltro('favoritas')
                              setTipoColeccion('peliculas')
                              setPagina('coleccion')
                            }}
                          >
                            ♡ Mi colección
                          </button>
                        </div>
                      </div>

                      <div className="home-featured-card">
                        {vistosRecientes[0] && (
                          (() => {
                            const reciente = vistosRecientes[0]
                            const origenSerie = reciente.id.startsWith('serie-')
                            const origen = origenSerie
                              ? vistasSeriesTMDB.find((serie) => String(serie.id) === reciente.id.replace('serie-', ''))
                              : vistasTMDB.find((pelicula) => String(pelicula.id) === reciente.id.replace('movie-', ''))
                            const poster = origen?.poster_path || reciente.poster

                            return poster ? (
                              <div className="home-featured-poster">
                                <img
                                  src={`${TMDB_IMAGE_URL}${poster}`}
                                  alt={reciente.titulo}
                                  className="home-featured-poster-image"
                                />
                              </div>
                            ) : null
                          })()
                        )}
                        <div className="home-featured-content">
                          <p className="home-featured-label">DESTACADO</p>
                        {vistosRecientes[0] ? (
                          <>
                            <h2>{vistosRecientes[0].titulo}</h2>
                            <div className="home-featured-meta">
                              <span>⭐ {vistosRecientes[0].rating.toFixed(1)}</span>
                              <span>{vistosRecientes[0].año}</span>
                              <span>{vistosRecientes[0].tipo.toUpperCase()}</span>
                            </div>
                            <p>
                              {(() => {
                                const reciente = vistosRecientes[0]
                                const origenSerie = reciente.id.startsWith('serie-')
                                const origen = origenSerie
                                  ? vistasSeriesTMDB.find((serie) => String(serie.id) === reciente.id.replace('serie-', ''))
                                  : vistasTMDB.find((pelicula) => String(pelicula.id) === reciente.id.replace('movie-', ''))
                                return origen?.overview
                                  ? origen.overview.length > 170
                                    ? `${origen.overview.slice(0, 167)}...`
                                    : origen.overview
                                  : 'Tu contenido visto recientemente aparecerá aquí.'
                              })()}
                            </p>
                            <button
                              className="secondary home-featured-button"
                              onClick={() => {
                                if (vistosRecientes[0].id.startsWith('serie-')) {
                                  irASeries()
                                } else {
                                  setPagina('peliculas')
                                }
                              }}
                            >
                              ▶ Ver contenido
                            </button>
                          </>
                        ) : (
                          <>
                            <h2>Empieza tu colección</h2>
                            <p>
                              Añade tu primera película o serie para que WeGeekTV pueda
                              empezar a personalizar tu inicio.
                            </p>
                            <button className="secondary home-featured-button" onClick={() => setPagina('peliculas')}>
                              Explorar películas
                            </button>
                          </>
                        )}
                        </div>
                      </div>
                    </div>

                    <div className="home-hero-dots" aria-hidden="true">
                      <span className="active" />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </section>

                  {/* ================= RESUMEN ================= */}
                  <section className="home-summary">
                    <div className="home-section-heading">
                      <div>
                        <p className="small-title">TU ACTIVIDAD</p>
                        <h2 className="home-premium-section-title">Tu resumen</h2>
                      </div>
                      <button className="secondary" onClick={() => setPagina('estadisticas')}>
                        Ver estadísticas →
                      </button>
                    </div>

                    <div className="home-stats-grid">
                      {[
                        { icon: '▣', value: vistasTMDB.length, label: 'Películas vistas', tone: 'pink' },
                        { icon: '◫', value: vistasSeriesTMDB.length, label: 'Series vistas', tone: 'yellow' },
                        { icon: '♡', value: totalFavoritos, label: 'Favoritos', tone: 'purple' },
                        { icon: '◷', value: tiempoTexto, label: 'Tiempo invertido', tone: 'blue' },
                        { icon: '♧', value: friends.length, label: 'Amigos', tone: 'green' },
                      ].map((dato) => (
                        <div key={dato.label} className={`home-stat-card ${dato.tone}`}>
                          <div className="home-stat-icon">{dato.icon}</div>
                          <div>
                            <strong>{dato.value}</strong>
                            <span>{dato.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* ================= CONTINUAR VIENDO ================= */}
                  <section style={{ marginBottom: '38px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <div>
                        <p className="small-title" style={{ marginBottom: '5px' }}>
                          TU HISTORIAL
                        </p>
                        <h2 className="home-premium-section-title" style={{ margin: 0 }}>Visto recientemente</h2>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => {
                          setTipoColeccion('peliculas')
                          setFiltro('vistas')
                          setPagina('coleccion')
                        }}
                      >
                        Ver colección →
                      </button>
                    </div>

                    {vistosRecientes.length > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                          gap: '18px',
                        }}
                      >
                        {vistosRecientes.map((item) => (
                          <div
                            key={item.id}
                            className="home-recent-card"
                            style={{
                              borderRadius: '18px',
                              overflow: 'hidden',
                              background: 'rgba(255,255,255,0.055)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            <div
                              className="home-recent-poster"
                              style={{
                                aspectRatio: '2 / 3',
                                background: 'rgba(0,0,0,0.25)',
                              }}
                            >
                              {item.poster ? (
                                <img
                                  src={`${TMDB_IMAGE_URL}${item.poster}`}
                                  alt={item.titulo}
                                  className="home-poster-image"
                                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '34px',
                                    color: '#ffd34f',
                                  }}
                                >
                                  {item.tipo === 'Serie' ? '◫' : '▣'}
                                </div>
                              )}
                            </div>
                            <div style={{ padding: '14px' }}>
                              <strong
                                style={{
                                  display: 'block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {item.titulo}
                              </strong>
                              <span style={{ opacity: 0.6, fontSize: '13px' }}>
                                {item.tipo} · {item.año} · ⭐ {item.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '42px 24px',
                          textAlign: 'center',
                          borderRadius: '20px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px dashed rgba(255,255,255,0.12)',
                        }}
                      >
                        <div className="home-empty-icon">◉</div>
                        <h3 style={{ margin: '0 0 8px' }}>Todavía no has visto nada</h3>
                        <p style={{ margin: 0, opacity: 0.65 }}>
                          Marca películas o series como vistas y aparecerán aquí.
                        </p>
                      </div>
                    )}
                  </section>

                  {/* ================= FAVORITOS ================= */}
                  <section style={{ marginBottom: '38px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <div>
                        <p className="small-title" style={{ marginBottom: '5px' }}>
                          TU SELECCIÓN
                        </p>
                        <h2 className="home-premium-section-title" style={{ margin: 0 }}>Favoritos recientes</h2>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => {
                          setFiltro('favoritas')
                          setTipoColeccion('peliculas')
                          setPagina('coleccion')
                        }}
                      >
                        Ver favoritos →
                      </button>
                    </div>

                    {favoritosRecientes.length > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                          gap: '14px',
                        }}
                      >
                        {favoritosRecientes.map((item) => (
                          <div key={item.id} className="home-favorite-card" style={{ minWidth: 0 }}>
                            <div
                              className="home-favorite-poster"
                              style={{
                                aspectRatio: '2 / 3',
                                borderRadius: '15px',
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }}
                            >
                              {item.poster ? (
                                <img
                                  src={`${TMDB_IMAGE_URL}${item.poster}`}
                                  alt={item.titulo}
                                  className="home-poster-image"
                                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '30px',
                                    color: '#ff72b5',
                                  }}
                                >
                                  {item.tipo === 'Serie' ? '◫' : '▣'}
                                </div>
                              )}
                            </div>
                            <strong
                              style={{
                                display: 'block',
                                marginTop: '9px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.titulo}
                            </strong>
                            <span style={{ opacity: 0.55, fontSize: '12px' }}>{item.tipo}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '35px 24px',
                          textAlign: 'center',
                          borderRadius: '20px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px dashed rgba(255,255,255,0.12)',
                        }}
                      >
                        <div className="home-empty-icon pink">♡</div>
                        <h3 style={{ margin: '0 0 7px' }}>Tu lista está vacía</h3>
                        <p style={{ margin: 0, opacity: 0.65 }}>
                          Añade tus películas y series favoritas para verlas aquí.
                        </p>
                      </div>
                    )}
                  </section>

                  {/* ================= AMIGOS ================= */}
                  <section>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <div>
                        <p className="small-title" style={{ marginBottom: '5px' }}>
                          TU GRUPO
                        </p>
                        <h2 className="home-premium-section-title" style={{ margin: 0 }}>Lo que están viendo tus amigos</h2>
                      </div>
                      <button className="secondary" onClick={() => setPagina('amigos')}>
                        Ver amigos →
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gap: '16px',
                      }}
                    >
                      {friends.map((amigo) => (
                        <div
                          key={amigo.name}
                          onClick={() => abrirPerfil(amigo)}
                          style={{
                            cursor: 'pointer',
                            padding: '20px',
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.055)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            transition: 'transform 0.2s ease, border-color 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)'
                            e.currentTarget.style.borderColor = 'rgba(255,79,154,0.45)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.08)',
                                fontSize: '25px',
                              }}
                            >
                              {amigo.avatar}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: 'block' }}>{amigo.name}</strong>
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: amigo.status === 'Online' ? '#4ade80' : '#aaa',
                                }}
                              >
                                ● {amigo.status}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: '18px',
                              padding: '13px',
                              borderRadius: '13px',
                              background: 'rgba(0,0,0,0.15)',
                            }}
                          >
                            <span style={{ display: 'block', opacity: 0.55, fontSize: '12px' }}>
                              ESTÁ VIENDO
                            </span>
                            <strong
                              style={{
                                display: 'block',
                                marginTop: '5px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {amigo.watching}
                            </strong>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginTop: '15px',
                              fontSize: '12px',
                              opacity: 0.6,
                            }}
                          >
                            <span>▣ {amigo.movies} películas</span>
                            <span>◫ {amigo.series} series</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )
            })()}
          </section>
        )}

        {pagina === 'peliculas' && (
          <section className="movies-catalog-page">
            <div className="movies-catalog-header">
              <div>
                <p className="small-title">DESCUBRE TU PRÓXIMA PELÍCULA</p>
                <h1>Películas</h1>
                <p className="description">
                  Explora películas populares, descubre grandes clásicos y encuentra exactamente lo que quieres ver.
                </p>
              </div>

              <div className="movie-search netflix-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="text"
                  placeholder="Buscar películas..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  aria-label="Buscar películas"
                />
                {buscandoTMDB && <span className="search-loading">Buscando…</span>}
              </div>
            </div>

            {errorTMDB && (
              <div className="catalog-error">
                <strong>Algo ha salido mal</strong>
                <span>{errorTMDB}</span>
              </div>
            )}

            {busqueda.trim() ? (
              <section className="netflix-catalog-section search-results-section">
                <div className="netflix-section-heading">
                  <div>
                    <span className="section-kicker">TMDB</span>
                    <h2>Resultados para «{busqueda.trim()}»</h2>
                  </div>
                  {!buscandoTMDB && resultadosTMDB.length > 0 && (
                    <span className="movie-count">{resultadosTMDB.length} resultados</span>
                  )}
                </div>

                {buscandoTMDB && resultadosTMDB.length === 0 ? (
                  <div className="catalog-loading">
                    <span className="loading-orb">✦</span>
                    <span>Buscando películas…</span>
                  </div>
                ) : resultadosTMDB.length > 0 ? (
                  <div className="netflix-movie-grid">
                    {resultadosTMDB.map(renderCatalogoCard)}
                  </div>
                ) : !buscandoTMDB ? (
                  <div className="catalog-empty">No hemos encontrado películas con ese nombre.</div>
                ) : null}
              </section>
            ) : (
              <>
                {cargandoCatalogoPeliculas && !peliculasPopularesTMDB.length && (
                  <div className="catalog-loading catalog-loading-large">
                    <span className="loading-orb">✦</span>
                    <span>Preparando tu catálogo…</span>
                  </div>
                )}

                <section className="netflix-catalog-section">
                  <div className="netflix-section-heading">
                    <div>
                      <span className="section-kicker pink">PARA TI</span>
                      <h2>Populares ahora</h2>
                    </div>
                    <span className="netflix-scroll-hint">Desliza para explorar →</span>
                  </div>
                  <div className="netflix-movie-row">
                    {peliculasPopularesTMDB.map(renderCatalogoCard)}
                  </div>
                </section>

                <section className="netflix-catalog-section">
                  <div className="netflix-section-heading">
                    <div>
                      <span className="section-kicker yellow">LOS MEJOR VALORADOS</span>
                      <h2>Favoritas de la comunidad</h2>
                    </div>
                    <span className="netflix-scroll-hint">Desliza para explorar →</span>
                  </div>
                  <div className="netflix-movie-row">
                    {peliculasMejorValoradasTMDB.map(renderCatalogoCard)}
                  </div>
                </section>

                <section className="netflix-catalog-section">
                  <div className="netflix-section-heading">
                    <div>
                      <span className="section-kicker orange">AHORA EN CINES</span>
                      <h2>Estrenos</h2>
                    </div>
                    <span className="netflix-scroll-hint">Desliza para explorar →</span>
                  </div>
                  <div className="netflix-movie-row">
                    {peliculasEstrenosTMDB.map(renderCatalogoCard)}
                  </div>
                </section>
              </>
            )}

            <div className="movie-filters netflix-filters">
              <button className={filtro === 'todas' ? 'filter-active' : ''} onClick={() => setFiltro('todas')}>Todas</button>
              <button className={filtro === 'vistas' ? 'filter-active' : ''} onClick={() => setFiltro('vistas')}>Vistas</button>
              <button className={filtro === 'pendientes' ? 'filter-active' : ''} onClick={() => setFiltro('pendientes')}>Pendientes</button>
              <button className={filtro === 'favoritas' ? 'filter-active' : ''} onClick={() => setFiltro('favoritas')}>Favoritas</button>
            </div>

            {filtro !== 'todas' && !busqueda.trim() && (
              <section className="netflix-catalog-section filtered-library-section">
                <div className="netflix-section-heading">
                  <div>
                    <span className="section-kicker">MI COLECCIÓN</span>
                    <h2>{filtro === 'vistas' ? 'Películas vistas' : filtro === 'pendientes' ? 'Películas pendientes' : 'Mis favoritas'}</h2>
                  </div>
                  <span className="movie-count">{peliculasFiltradas.length} películas</span>
                </div>
                <div className="movie-grid">
                  {peliculasFiltradas.map((pelicula) => (
                    <MovieCard key={pelicula.id} pelicula={pelicula} cambiarVista={cambiarVista} cambiarFavorito={cambiarFavorito} />
                  ))}
                </div>
                {peliculasFiltradas.length === 0 && (
                  <div className="catalog-empty">Todavía no hay películas en este apartado.</div>
                )}
              </section>
            )}

            <p className="tmdb-disclaimer">
              Este producto utiliza la API de TMDB pero no está respaldado ni certificado por TMDB.
            </p>
          </section>
        )}

        {pagina === 'coleccion' && (
          <section className="welcome movies-page">
            <p className="small-title">TU COLECCIÓN PERSONAL</p>

            <h1 style={{ background: 'linear-gradient(100deg, #ffe08a 0%, #ff83bd 46%, #e59bff 76%, #8c9cff 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 10px 40px rgba(255,79,159,.16)' }}>❤️ Mi colección</h1>

            <p className="description collection-description">
              Todo lo que has guardado, visto y quieres volver a disfrutar, reunido en un solo lugar.
            </p>

            <div className="collection-stats" aria-label="Resumen de tu colección">
              <div className="collection-stat-card collection-stat-pink">
                <div className="collection-stat-icon">♡</div>
                <div className="collection-stat-copy">
                  <strong>{tmdbFavoritas.length}</strong>
                  <span>Películas favoritas</span>
                </div>
              </div>
              <div className="collection-stat-card collection-stat-blue">
                <div className="collection-stat-icon">✓</div>
                <div className="collection-stat-copy">
                  <strong>{tmdbVistas.length}</strong>
                  <span>Películas vistas</span>
                </div>
              </div>
              <div className="collection-stat-card collection-stat-purple">
                <div className="collection-stat-icon">♡</div>
                <div className="collection-stat-copy">
                  <strong>{favoritasSeriesTMDB.length}</strong>
                  <span>Series favoritas</span>
                </div>
              </div>
              <div className="collection-stat-card collection-stat-cyan">
                <div className="collection-stat-icon">✓</div>
                <div className="collection-stat-copy">
                  <strong>{vistasSeriesTMDB.length}</strong>
                  <span>Series vistas</span>
                </div>
              </div>
            </div>

            <div className="collection-controls">
              <div className="collection-control-group">
                <span className="collection-control-label">CONTENIDO</span>
                <div className="movie-filters collection-type-filters">
              <button
                className={tipoColeccion === 'peliculas' ? 'filter-active' : ''}
                onClick={() => {
                  setTipoColeccion('peliculas')
                  setFiltro('favoritas')
                }}
              >
                🎬 Películas
              </button>

              <button
                className={tipoColeccion === 'series' ? 'filter-active' : ''}
                onClick={() => {
                  setTipoColeccion('series')
                  setFiltro('favoritas')
                }}
              >
                📺 Series
              </button>
                </div>
              </div>

              <div className="collection-control-group">
                <span className="collection-control-label">MOSTRAR</span>
                <div className="movie-filters collection-view-filters">
              <button
                className={filtro === 'favoritas' ? 'filter-active' : ''}
                onClick={() => setFiltro('favoritas')}
              >
                ❤️ Favoritas
              </button>

              <button
                className={filtro === 'vistas' ? 'filter-active' : ''}
                onClick={() => setFiltro('vistas')}
              >
                👁️ Vistas
              </button>
                </div>
              </div>
            </div>

            {tipoColeccion === 'peliculas' && filtro === 'favoritas' && (
              <section className="movie-section">
                <div className="section-title">
                  <h2>❤️ Mis películas favoritas</h2>
                  <span className="movie-count">{tmdbFavoritas.length} películas</span>
                </div>

                {tmdbFavoritas.length > 0 ? (
                  <div style={tmdbGridStyle}>
                    {tmdbFavoritas.map(renderTmdbCard)}
                  </div>
                ) : (
                  <div className="empty">
                    <div>❤️</div>
                    <h2>Aún no tienes películas favoritas</h2>
                    <p>Busca una película en Películas y pulsa ❤️ Favorito para añadirla aquí.</p>
                    <button className="primary" onClick={() => setPagina('peliculas')}>
                      🎬 Buscar películas
                    </button>
                  </div>
                )}
              </section>
            )}

            {tipoColeccion === 'peliculas' && filtro === 'vistas' && (
              <section className="movie-section">
                <div className="section-title">
                  <h2>👁️ Películas vistas</h2>
                  <span className="movie-count">{tmdbVistas.length} películas</span>
                </div>

                {tmdbVistas.length > 0 ? (
                  <div style={tmdbGridStyle}>
                    {tmdbVistas.map(renderTmdbCard)}
                  </div>
                ) : (
                  <div className="empty">
                    <div>👁️</div>
                    <h2>Aún no tienes películas vistas</h2>
                    <p>Busca una película en Películas y pulsa 👁️ Marcar vista para añadirla aquí.</p>
                    <button className="primary" onClick={() => setPagina('peliculas')}>
                      🎬 Buscar películas
                    </button>
                  </div>
                )}
              </section>
            )}

            {tipoColeccion === 'series' && filtro === 'favoritas' && (
              <section className="movie-section">
                <div className="section-title">
                  <h2>❤️ Mis series favoritas</h2>
                  <span className="movie-count">{favoritasSeriesTMDB.length} series</span>
                </div>

                {favoritasSeriesTMDB.length > 0 ? (
                  <div style={tmdbGridStyle}>
                    {favoritasSeriesTMDB.map(renderSeriesCard)}
                  </div>
                ) : (
                  <div className="empty">
                    <div>❤️</div>
                    <h2>Aún no tienes series favoritas</h2>
                    <p>Busca una serie en Series y pulsa ❤️ Favorito para añadirla aquí.</p>
                    <button className="primary" onClick={() => irASeries()}>
                      📺 Buscar series
                    </button>
                  </div>
                )}
              </section>
            )}

            {tipoColeccion === 'series' && filtro === 'vistas' && (
              <section className="movie-section">
                <div className="section-title">
                  <h2>👁️ Series vistas</h2>
                  <span className="movie-count">{vistasSeriesTMDB.length} series</span>
                </div>

                {vistasSeriesTMDB.length > 0 ? (
                  <div style={tmdbGridStyle}>
                    {vistasSeriesTMDB.map(renderSeriesCard)}
                  </div>
                ) : (
                  <div className="empty">
                    <div>👁️</div>
                    <h2>Aún no tienes series vistas</h2>
                    <p>Busca una serie en Series y pulsa 👁️ Marcar vista para añadirla aquí.</p>
                    <button className="primary" onClick={() => irASeries()}>
                      📺 Buscar series
                    </button>
                  </div>
                )}
              </section>
            )}
          </section>
        )}

        {pagina === 'detalle' && (
          <section className="welcome movies-page">
            <button className="secondary" onClick={cerrarDetalles}>
              ← Volver a películas
            </button>

            {cargandoDetalles && (
              <div className="empty">
                <div>🎬</div>
                <h2>Cargando detalles...</h2>
                <p>Estamos buscando toda la información en TMDB.</p>
              </div>
            )}

            {!cargandoDetalles && errorDetalles && (
              <div className="empty">
                <div>⚠️</div>
                <h2>No hemos podido cargar la película</h2>
                <p>{errorDetalles}</p>
                <button className="primary" onClick={cerrarDetalles}>
                  Volver
                </button>
              </div>
            )}

            {!cargandoDetalles && peliculaSeleccionada && (
              <div
                style={{
                  marginTop: '28px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {peliculaSeleccionada.backdrop_path && (
                  <div
                    style={{
                      height: '300px',
                      backgroundImage: `linear-gradient(to bottom, rgba(10,10,15,0.10), rgba(10,10,15,0.98)), url(${TMDB_IMAGE_URL}${peliculaSeleccionada.backdrop_path})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '260px 1fr',
                    gap: '32px',
                    padding: '30px',
                  }}
                >
                  <div>
                    {peliculaSeleccionada.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_URL}${peliculaSeleccionada.poster_path}`}
                        alt={peliculaSeleccionada.title}
                        style={{
                          width: '100%',
                          borderRadius: '18px',
                          display: 'block',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          aspectRatio: '2 / 3',
                          borderRadius: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0,0,0,0.25)',
                          fontSize: '60px',
                        }}
                      >
                        🎬
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="small-title">PELÍCULA</p>
                    <h1 style={{ marginBottom: '12px' }}>{peliculaSeleccionada.title}</h1>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        marginBottom: '22px',
                      }}
                    >
                      <span>⭐ {peliculaSeleccionada.vote_average.toFixed(1)}</span>
                      {peliculaSeleccionada.release_date && (
                        <span>📅 {peliculaSeleccionada.release_date.substring(0, 4)}</span>
                      )}
                      {peliculaSeleccionada.runtime ? (
                        <span>
                          ⏱️ {Math.floor(peliculaSeleccionada.runtime / 60)}h{' '}
                          {peliculaSeleccionada.runtime % 60}min
                        </span>
                      ) : null}
                    </div>

                    {peliculaSeleccionada.genres && peliculaSeleccionada.genres.length > 0 && (
                      <p style={{ opacity: 0.85 }}>
                        🎭 {peliculaSeleccionada.genres.map((genero) => genero.name).join(' · ')}
                      </p>
                    )}

                    <p
                      style={{
                        lineHeight: 1.7,
                        opacity: 0.9,
                        maxWidth: '850px',
                        marginTop: '22px',
                      }}
                    >
                      {peliculaSeleccionada.overview || 'No hay sinopsis disponible en TMDB.'}
                    </p>

                    {(() => {
                      const director = peliculaSeleccionada.credits?.crew?.find(
                        (persona) => persona.job === 'Director',
                      )
                      const reparto = peliculaSeleccionada.credits?.cast?.slice(0, 6) || []

                      return (
                        <>
                          {director && (
                            <p style={{ marginTop: '24px' }}>
                              <strong>🎬 Director:</strong> {director.name}
                            </p>
                          )}

                          {reparto.length > 0 && (
                            <div style={{ marginTop: '24px' }}>
                              <strong>👥 Reparto principal</strong>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                  gap: '14px',
                                  marginTop: '14px',
                                }}
                              >
                                {reparto.map((actor) => (
                                  <div
                                    key={actor.id}
                                    style={{
                                      padding: '12px',
                                      borderRadius: '14px',
                                      background: 'rgba(255,255,255,0.06)',
                                    }}
                                  >
                                    {actor.profile_path ? (
                                      <img
                                        src={`${TMDB_IMAGE_URL}${actor.profile_path}`}
                                        alt={actor.name}
                                        style={{
                                          width: '100%',
                                          aspectRatio: '2 / 3',
                                          objectFit: 'cover',
                                          borderRadius: '10px',
                                          display: 'block',
                                          marginBottom: '9px',
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: '100%',
                                          aspectRatio: '2 / 3',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '10px',
                                          background: 'rgba(0,0,0,0.20)',
                                          marginBottom: '9px',
                                          fontSize: '30px',
                                        }}
                                      >
                                        👤
                                      </div>
                                    )}
                                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                      {actor.name}
                                    </div>
                                    {actor.character && (
                                      <div style={{ fontSize: '12px', opacity: 0.65, marginTop: '3px' }}>
                                        {actor.character}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
                      <button
                        className={favoritasTMDB.some((fav) => fav.id === peliculaSeleccionada.id) ? 'primary' : 'secondary'}
                        onClick={() => cambiarFavoritoTMDB(peliculaSeleccionada)}
                      >
                        {favoritasTMDB.some((fav) => fav.id === peliculaSeleccionada.id)
                          ? '❤️ Favorita'
                          : '🤍 Añadir a favoritos'}
                      </button>

                      <button
                        className={vistasTMDB.some((vista) => vista.id === peliculaSeleccionada.id) ? 'primary' : 'secondary'}
                        onClick={() => cambiarVistaTMDB(peliculaSeleccionada)}
                      >
                        {vistasTMDB.some((vista) => vista.id === peliculaSeleccionada.id)
                          ? '👁️ Vista'
                          : '👁️ Marcar como vista'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {pagina === 'series' && (
          <section className="welcome movies-page series-page">
            <div className="series-visual-orbit" aria-hidden="true"><span></span><i></i><b></b></div>
            <div className="series-hero-badge">✦ CATÁLOGO DE SERIES</div>
            <p className="small-title">TU UNIVERSO DE SERIES</p>
            <h1><span className="series-title-icon">📺</span> Series<span className="series-title-dot">.</span></h1>
            <p className="description">
              Busca series, guarda tus favoritas y lleva un registro de lo que ya has visto.
            </p>

            <div className="series-search" style={{ display: 'flex', gap: '10px', margin: '26px 0', maxWidth: '800px' }}>
              <div className="series-search-icon" aria-hidden="true">⌕</div>
              <input
                value={busquedaSeries}
                onChange={(e) => setBusquedaSeries(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') buscarSeriesEnTMDB()
                }}
                placeholder="Busca una serie..."
                style={{
                  flex: 1,
                  padding: '15px 18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.07)',
                  color: 'inherit',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
              <button className="primary" onClick={buscarSeriesEnTMDB} disabled={buscandoSeriesTMDB}>
                {buscandoSeriesTMDB ? 'Buscando...' : '🔎 Buscar'}
              </button>
            </div>

            {errorSeriesTMDB && <p style={{ color: '#ff6b8a' }}>{errorSeriesTMDB}</p>}

            {resultadosSeriesTMDB.length > 0 && (
              <section className="movie-section">
                <div className="section-title">
                  <h2>Resultados</h2>
                  <span className="movie-count">{resultadosSeriesTMDB.length} series</span>
                </div>
                <div style={tmdbGridStyle}>
                  {resultadosSeriesTMDB.map(renderSeriesCard)}
                </div>
              </section>
            )}

            {resultadosSeriesTMDB.length === 0 && !buscandoSeriesTMDB && (
              <div className="empty">
                <div>📺</div>
                <h2>No hemos encontrado series</h2>
                <p>Prueba con otro título o vuelve a intentarlo.</p>
              </div>
            )}

            {favoritasSeriesTMDB.length > 0 && (
              <section className="movie-section">
                <div className="section-title">
                  <h2>❤️ Mis series favoritas</h2>
                  <span className="movie-count">{favoritasSeriesTMDB.length} series</span>
                </div>
                <div style={tmdbGridStyle}>
                  {favoritasSeriesTMDB.map(renderSeriesCard)}
                </div>
              </section>
            )}
          </section>
        )}

        {pagina === 'detalleSerie' && (
          <section className="welcome movies-page">
            <button className="secondary" onClick={cerrarDetallesSerie}>
              ← Volver a series
            </button>

            {cargandoSerieDetalles && (
              <div className="empty">
                <div>📺</div>
                <h2>Cargando detalles...</h2>
                <p>Estamos buscando toda la información en TMDB.</p>
              </div>
            )}

            {!cargandoSerieDetalles && errorSerieDetalles && (
              <div className="empty">
                <div>⚠️</div>
                <h2>No hemos podido cargar la serie</h2>
                <p>{errorSerieDetalles}</p>
                <button className="primary" onClick={cerrarDetallesSerie}>Volver</button>
              </div>
            )}

            {!cargandoSerieDetalles && serieSeleccionada && (
              <div
                style={{
                  marginTop: '28px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {serieSeleccionada.backdrop_path && (
                  <div
                    style={{
                      height: '300px',
                      backgroundImage: `linear-gradient(to bottom, rgba(10,10,15,0.10), rgba(10,10,15,0.98)), url(${TMDB_IMAGE_URL}${serieSeleccionada.backdrop_path})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', padding: '30px' }}>
                  <div>
                    {serieSeleccionada.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_URL}${serieSeleccionada.poster_path}`}
                        alt={serieSeleccionada.name}
                        style={{
                          width: '100%',
                          borderRadius: '18px',
                          display: 'block',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          aspectRatio: '2 / 3',
                          borderRadius: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0,0,0,0.25)',
                          fontSize: '60px',
                        }}
                      >
                        📺
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="small-title">SERIE</p>
                    <h1 style={{ marginBottom: '12px' }}>{serieSeleccionada.name}</h1>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '22px' }}>
                      <span>⭐ {serieSeleccionada.vote_average.toFixed(1)}</span>
                      {serieSeleccionada.first_air_date && (
                        <span>📅 {serieSeleccionada.first_air_date.substring(0, 4)}</span>
                      )}
                      {typeof serieSeleccionada.number_of_seasons === 'number' && (
                        <span>📺 {serieSeleccionada.number_of_seasons} temporadas</span>
                      )}
                      {typeof serieSeleccionada.number_of_episodes === 'number' && (
                        <span>🎬 {serieSeleccionada.number_of_episodes} episodios</span>
                      )}
                    </div>

                    {serieSeleccionada.genres && serieSeleccionada.genres.length > 0 && (
                      <p style={{ opacity: 0.85 }}>
                        🎭 {serieSeleccionada.genres.map((genero) => genero.name).join(' · ')}
                      </p>
                    )}

                    <p style={{ lineHeight: 1.7, opacity: 0.9, maxWidth: '850px', marginTop: '22px' }}>
                      {serieSeleccionada.overview || 'No hay sinopsis disponible en TMDB.'}
                    </p>
                    <div style={{ marginTop: '28px' }}>
  <h3 style={{ marginBottom: '12px' }}>Temporadas y episodios</h3>

  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
    <select
      value={temporadaSeleccionada ?? 1}
      onChange={(e) => cargarEpisodiosTemporada(Number(e.target.value))}
      style={{
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.08)',
        color: 'white',
        fontSize: '15px',
        cursor: 'pointer'
      }}
    >
      {Array.from(
        { length: serieSeleccionada.number_of_seasons || 0 },
        (_, i) => i + 1
      ).map((temporada) => (
        <option key={temporada} value={temporada} style={{ color: 'black' }}>
          Temporada {temporada}
        </option>
      ))}
    </select>
  </div>

  {episodiosTemporada.length > 0 && (
    <>
      {(() => {
        const episodiosVistosDeTemporada = serieSeleccionada
          ? episodiosVistos[String(serieSeleccionada.id)] || []
          : []
        const temporadaCompleta = episodiosTemporada.every((episodio) =>
          episodiosVistosDeTemporada.some((visto) => visto.id === episodio.id),
        )

        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button
              className={temporadaCompleta ? 'secondary' : 'primary'}
              onClick={async () => {
                if (!serieSeleccionada) return

                const clave = String(serieSeleccionada.id)
                const actuales = episodiosVistos[clave] || []
                const idsTemporada = new Set(episodiosTemporada.map((episodio) => episodio.id))
                const nuevosVistos = temporadaCompleta
                  ? actuales.filter((episodio) => !idsTemporada.has(episodio.id))
                  : [
                      ...actuales.filter((episodio) => !idsTemporada.has(episodio.id)),
                      ...episodiosTemporada,
                    ]

                const nuevas = { ...episodiosVistos }
                if (nuevosVistos.length > 0) nuevas[clave] = nuevosVistos
                else delete nuevas[clave]

                setEpisodiosVistos(nuevas)
                localStorage.setItem('wegeektv_episodios_vistos', JSON.stringify(nuevas))
                await sincronizarSerieVistaConEpisodios(
                  serieSeleccionada,
                  nuevosVistos,
                )
              }}
            >
              {temporadaCompleta ? '↩️ Desmarcar temporada' : '✅ Marcar temporada como vista'}
            </button>
          </div>
        )
      })()}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {episodiosTemporada.map((episodio) => (
          <div
            key={episodio.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)'
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(serieSeleccionada && (episodiosVistos[String(serieSeleccionada.id)] || []).some((visto) => visto.id === episodio.id))}
              onChange={async () => {
                if (!serieSeleccionada) return

                const clave = String(serieSeleccionada.id)
                const vistosActuales = episodiosVistos[clave] || []
                const yaVisto = vistosActuales.some((visto) => visto.id === episodio.id)
                const nuevosVistos = yaVisto
                  ? vistosActuales.filter((visto) => visto.id !== episodio.id)
                  : [...vistosActuales, episodio]

                const nuevas = { ...episodiosVistos }
                if (nuevosVistos.length > 0) nuevas[clave] = nuevosVistos
                else delete nuevas[clave]

                setEpisodiosVistos(nuevas)
                localStorage.setItem('wegeektv_episodios_vistos', JSON.stringify(nuevas))
                await sincronizarSerieVistaConEpisodios(serieSeleccionada, nuevosVistos)
              }}
            />

            <div>
              <div style={{ fontWeight: 'bold' }}>
                {episodio.episode_number}. {episodio.name}
              </div>

              {episodio.overview && (
                <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '4px' }}>
                  {episodio.overview}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )}
</div>

                    {(() => {
                      const reparto = serieSeleccionada.credits?.cast?.slice(0, 6) || []

                      return reparto.length > 0 ? (
                        <div style={{ marginTop: '24px' }}>
                          <strong>👥 Reparto principal</strong>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                              gap: '14px',
                              marginTop: '14px',
                            }}
                          >
                            {reparto.map((actor) => (
                              <div
                                key={actor.id}
                                style={{
                                  padding: '12px',
                                  borderRadius: '14px',
                                  background: 'rgba(255,255,255,0.06)',
                                }}
                              >
                                {actor.profile_path ? (
                                  <img
                                    src={`${TMDB_IMAGE_URL}${actor.profile_path}`}
                                    alt={actor.name}
                                    style={{
                                      width: '100%',
                                      aspectRatio: '2 / 3',
                                      objectFit: 'cover',
                                      borderRadius: '10px',
                                      display: 'block',
                                      marginBottom: '9px',
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '100%',
                                      aspectRatio: '2 / 3',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '10px',
                                      background: 'rgba(0,0,0,0.20)',
                                      marginBottom: '9px',
                                      fontSize: '30px',
                                    }}
                                  >
                                    👤
                                  </div>
                                )}
                                <div style={{ fontSize: '14px', fontWeight: 600 }}>{actor.name}</div>
                                {actor.character && (
                                  <div style={{ fontSize: '12px', opacity: 0.65, marginTop: '3px' }}>
                                    {actor.character}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null
                    })()}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
                      <button
                        className={favoritasSeriesTMDB.some((fav) => fav.id === serieSeleccionada.id) ? 'primary' : 'secondary'}
                        onClick={() => cambiarFavoritaSerieTMDB(serieSeleccionada)}
                      >
                        {favoritasSeriesTMDB.some((fav) => fav.id === serieSeleccionada.id)
                          ? '❤️ Favorita'
                          : '🤍 Añadir a favoritas'}
                      </button>

                      <button
                        className={vistasSeriesTMDB.some((vista) => vista.id === serieSeleccionada.id) ? 'primary' : 'secondary'}
                        onClick={() => cambiarVistaSerieTMDB(serieSeleccionada)}
                      >
                        {vistasSeriesTMDB.some((vista) => vista.id === serieSeleccionada.id)
                          ? '👁️ Vista'
                          : '👁️ Marcar como vista'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {pagina === 'estadisticas' && (
          <section className="welcome movies-page">
            <p className="small-title">TU ACTIVIDAD EN WEGEEKTV</p>
            <h1 style={{ background: 'linear-gradient(100deg, #ffe08a 0%, #ff83bd 46%, #e59bff 76%, #8c9cff 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 10px 40px rgba(255,79,159,.16)' }}>📊 Mis estadísticas</h1>
            <p className="description">
              Un resumen de todo lo que has guardado y visto en WeGeekTV.
            </p>

            {(() => {
              const peliculasVistas = vistasTMDB.length
              // Una serie solo cuenta como vista cuando se han visto todos sus episodios.
              // Los episodios parciales se contabilizan por separado más abajo.
              const seriesVistas = vistasSeriesTMDB.length
              const episodiosTotalesVistos = (Object.values(episodiosVistos) as TmdbEpisode[][]).reduce(
                (total, episodios) => total + (Array.isArray(episodios) ? episodios.length : 0),
                0,
              )
              const peliculasFavoritas = favoritasTMDB.length
              const seriesFavoritas = favoritasSeriesTMDB.length
              const totalVistos = peliculasVistas + seriesVistas
              const totalFavoritos = peliculasFavoritas + seriesFavoritas

              const minutosPeliculas = vistasTMDB.reduce(
                (total, pelicula) => total + (pelicula.runtime || 0),
                0,
              )
              
          
              
              const minutosSeriesPorEpisodios = (Object.values(episodiosVistos) as TmdbEpisode[][]).reduce(
                (total, episodios) =>
                  total +
                  (Array.isArray(episodios)
                    ? episodios.reduce((subtotal, episodio) => subtotal + (episodio.runtime || 0), 0)
                    : 0),
                0,
              )
              const minutosSeriesAntiguas = vistasSeriesTMDB.reduce((total, serie) => {
                const episodiosDeSerie = episodiosVistos[String(serie.id)] || []
                return episodiosDeSerie.length === 0 ? total + (serie.tiempoTotal || 0) : total
              }, 0)
              const minutosSeries = minutosSeriesPorEpisodios + minutosSeriesAntiguas
              
              

              const minutosTotales = minutosPeliculas + minutosSeries
              
              

              // Desglose de tiempo en meses, días, horas y minutos.
              // Para mantenerlo coherente con el logro de meses vistos, 1 mes equivale a 30 días.
              const desglosarTiempo = (minutos: number) => {
                const minutosSeguros = Math.max(0, Math.floor(minutos || 0))
                const minutosPorMes = 30 * 24 * 60
                const meses = Math.floor(minutosSeguros / minutosPorMes)
                const trasMeses = minutosSeguros % minutosPorMes
                const dias = Math.floor(trasMeses / (24 * 60))
                const trasDias = trasMeses % (24 * 60)
                const horas = Math.floor(trasDias / 60)
                const minutosRestantes = trasDias % 60
                return { meses, dias, horas, minutos: minutosRestantes }
              }

              const tiempoPeliculas = desglosarTiempo(minutosPeliculas)
              const tiempoSeries = desglosarTiempo(minutosSeries)
              const tiempoTotal = desglosarTiempo(minutosTotales)

              const crearUnidadesTiempo = (tiempo: ReturnType<typeof desglosarTiempo>) => [
                { value: tiempo.meses, label: tiempo.meses === 1 ? 'MES' : 'MESES', icon: '🗓️' },
                { value: tiempo.dias, label: tiempo.dias === 1 ? 'DÍA' : 'DÍAS', icon: '📅' },
                { value: tiempo.horas, label: tiempo.horas === 1 ? 'HORA' : 'HORAS', icon: '⏱️' },
                { value: tiempo.minutos, label: tiempo.minutos === 1 ? 'MINUTO' : 'MINUTOS', icon: '⌛' },
              ]

              const tiempoDetallado = crearUnidadesTiempo(tiempoTotal)
              const tiempoPeliculasDetallado = crearUnidadesTiempo(tiempoPeliculas)
              const tiempoSeriesDetallado = crearUnidadesTiempo(tiempoSeries)

              const mediaPeliculas = peliculasVistas > 0
                ? vistasTMDB.reduce((total, pelicula) => total + pelicula.vote_average, 0) / peliculasVistas
                : 0

              const mediaSeries = seriesVistas > 0
                ? vistasSeriesTMDB.reduce((total, serie) => total + serie.vote_average, 0) / seriesVistas
                : 0

              const coleccionOrdenada = [
                ...favoritasTMDB.map((pelicula) => ({
                  id: `movie-${pelicula.id}`,
                  title: pelicula.title,
                  year: pelicula.release_date?.substring(0, 4) || '—',
                  rating: pelicula.vote_average,
                  poster: pelicula.poster_path,
                  tipo: 'Película',
                })),
                ...favoritasSeriesTMDB.map((serie) => ({
                  id: `series-${serie.id}`,
                  title: serie.name,
                  year: serie.first_air_date?.substring(0, 4) || '—',
                  rating: serie.vote_average,
                  poster: serie.poster_path,
                  tipo: 'Serie',
                })),
              ]
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 5)

              return (
                <>
                  <style>{`
                    @keyframes wgStatsGlow { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.12)} }
                    @keyframes wgStatsFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
                    @keyframes wgStatsShine { 0%{transform:translateX(-160%) rotate(18deg)} 55%,100%{transform:translateX(210%) rotate(18deg)} }
                    @keyframes wgStatsBorder { 0%,100%{opacity:.25} 50%{opacity:.7} }
                    .wg-stats-shell{position:relative}
                    .wg-stats-card{position:relative;overflow:hidden;transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease}
                    .wg-stats-card:before{content:'';position:absolute;inset:-70%;background:radial-gradient(circle,rgba(255,255,255,.11),transparent 38%);animation:wgStatsGlow 5s ease-in-out infinite;pointer-events:none}
                    .wg-stats-card:after{content:'';position:absolute;top:-45%;bottom:-45%;left:-35%;width:20%;background:rgba(255,255,255,.12);filter:blur(14px);transform:rotate(18deg);animation:wgStatsShine 6.5s ease-in-out infinite;pointer-events:none}
                    .wg-stats-card:hover{transform:translateY(-8px) scale(1.025);border-color:rgba(255,255,255,.3)!important;box-shadow:0 28px 75px rgba(0,0,0,.32),0 0 35px rgba(255,79,154,.13)!important}
                    .wg-stats-number{position:relative;z-index:2;font-size:clamp(34px,4vw,52px);font-weight:1000;line-height:.95;letter-spacing:-.055em}
                    .wg-stats-label{position:relative;z-index:2;margin-top:10px;font-size:12px;line-height:1.2;letter-spacing:.12em;font-weight:950;opacity:.72}
                    .wg-stats-icon{position:relative;z-index:2;font-size:30px;line-height:1;filter:drop-shadow(0 0 10px rgba(255,255,255,.12))}
                    .wg-stats-time-card{position:relative;overflow:hidden;transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease}
                    .wg-stats-time-card:before{content:'';position:absolute;inset:-55%;background:radial-gradient(circle,rgba(255,255,255,.12),transparent 40%);animation:wgStatsGlow 4.2s ease-in-out infinite;pointer-events:none}
                    .wg-stats-time-card:after{content:'';position:absolute;top:-35%;bottom:-35%;left:-40%;width:22%;background:rgba(255,255,255,.14);filter:blur(12px);transform:rotate(16deg);animation:wgStatsShine 5.8s ease-in-out infinite;pointer-events:none}
                    .wg-stats-time-card:hover{transform:translateY(-9px) scale(1.025);border-color:rgba(255,255,255,.34)!important;box-shadow:0 26px 75px rgba(0,0,0,.34),0 0 38px rgba(103,234,255,.12)!important}
                    .wg-stats-time-number{position:relative;z-index:2;font-size:clamp(42px,5vw,70px);font-weight:1000;line-height:.9;letter-spacing:-.065em}
                    .wg-stats-time-label{position:relative;z-index:2;display:block;margin-top:14px;font-size:clamp(12px,1.15vw,15px);line-height:1.15;letter-spacing:.18em;font-weight:950;opacity:.78}
                    .wg-stats-category{position:relative;overflow:hidden;transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease}
                    .wg-stats-category:hover{transform:translateY(-7px);border-color:rgba(255,255,255,.25)!important;box-shadow:0 25px 70px rgba(0,0,0,.28)!important}
                    .wg-stats-category-unit{transition:transform .22s ease,background .22s ease}
                    .wg-stats-category-unit:hover{transform:translateY(-4px);background:rgba(255,255,255,.08)!important}
                    .wg-stats-category-number{font-size:clamp(25px,2.5vw,34px);font-weight:1000;line-height:.95}
                    .wg-stats-category-label{font-size:clamp(10px,1vw,12px);letter-spacing:.12em;font-weight:950;opacity:.7;margin-top:8px}
                    @media(max-width:760px){
                      .wg-stats-top-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
                      .wg-stats-total-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
                      .wg-stats-category-grid{grid-template-columns:1fr!important}
                    }
                    @media(max-width:470px){
                      .wg-stats-top-grid{grid-template-columns:1fr 1fr!important}
                      .wg-stats-total-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
                      .wg-stats-category-time-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
                    }
                  `}</style>

                  <div className="wg-stats-shell" style={{ marginTop:'38px' }}>
                    <div
                      className="wg-stats-top-grid"
                      style={{
                        display:'grid',
                        gridTemplateColumns:'repeat(4,minmax(0,1fr))',
                        gap:'16px',
                      }}
                    >
                      {[
                        { icon:'🎬', value:peliculasVistas, label:'PELÍCULAS VISTAS', glow:'rgba(255,79,154,.16)' },
                        { icon:'📺', value:seriesVistas, label:'SERIES VISTAS', glow:'rgba(103,234,255,.14)' },
                        { icon:'🎞️', value:episodiosTotalesVistos, label:'EPISODIOS VISTOS', glow:'rgba(164,112,255,.14)' },
                        { icon:'❤️', value:totalFavoritos, label:'FAVORITOS', glow:'rgba(255,105,180,.15)' },
                      ].map((estadistica,index) => (
                        <div
                          className="wg-stats-card"
                          key={estadistica.label}
                          style={{
                            minHeight:'145px',
                            padding:'24px 20px',
                            borderRadius:'26px',
                            background:`radial-gradient(circle at 15% 0%,${estadistica.glow},transparent 55%),linear-gradient(145deg,rgba(255,255,255,.085),rgba(255,255,255,.025))`,
                            border:'1px solid rgba(255,255,255,.11)',
                            boxShadow:'0 18px 48px rgba(0,0,0,.18)',
                          }}
                        >
                          <div className="wg-stats-icon" style={{ animation:`wgStatsFloat ${3.1 + index*.35}s ease-in-out infinite` }}>{estadistica.icon}</div>
                          <strong className="wg-stats-number" style={{ display:'block',marginTop:14 }}>{estadistica.value}</strong>
                          <div className="wg-stats-label">{estadistica.label}</div>
                        </div>
                      ))}
                    </div>

                    <section
                      style={{
                        marginTop:'22px',
                        padding:'clamp(26px,4vw,48px)',
                        borderRadius:'38px',
                        position:'relative',
                        overflow:'hidden',
                        background:'radial-gradient(circle at 8% 4%,rgba(255,79,154,.22),transparent 28%),radial-gradient(circle at 92% 8%,rgba(103,234,255,.19),transparent 30%),radial-gradient(circle at 52% 105%,rgba(150,90,255,.16),transparent 38%),linear-gradient(145deg,rgba(255,255,255,.105),rgba(255,255,255,.025))',
                        border:'1px solid rgba(255,255,255,.16)',
                        boxShadow:'0 34px 110px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.10)',
                      }}
                    >
                      <div style={{position:'absolute',width:420,height:420,borderRadius:'50%',background:'rgba(255,79,154,.10)',filter:'blur(100px)',top:-250,left:-180,pointerEvents:'none'}} />
                      <div style={{position:'absolute',width:390,height:390,borderRadius:'50%',background:'rgba(103,234,255,.09)',filter:'blur(100px)',bottom:-270,right:-180,pointerEvents:'none'}} />

                      <div style={{textAlign:'center',position:'relative',zIndex:2}}>
                        <p className="small-title" style={{marginBottom:9}}>⏳ TU TIEMPO VISTO</p>
                        <h2 style={{margin:0,fontSize:'clamp(32px,4.6vw,56px)',letterSpacing:'-.055em',color:'#fff',textShadow:'0 0 30px rgba(255,255,255,.10)'}}>Tu tiempo en pantalla</h2>
                        <p style={{margin:'12px auto 0',maxWidth:680,opacity:.72,fontSize:14,lineHeight:1.65,color:'rgba(255,255,255,.82)'}}>
                          Todo tu tiempo de entretenimiento, dividido de forma exacta en meses, días, horas y minutos.
                        </p>
                      </div>

                      <div
                        style={{
                          position:'relative',
                          zIndex:2,
                          marginTop:'30px',
                          padding:'10px',
                          borderRadius:'32px',
                          background:'rgba(0,0,0,.12)',
                          border:'1px solid rgba(255,255,255,.08)',
                        }}
                      >
                        <div style={{textAlign:'center',padding:'7px 0 10px',fontSize:13,letterSpacing:'.20em',fontWeight:950,opacity:.88,color:'rgba(255,255,255,.90)'}}>
                          ⌛ TIEMPO TOTAL
                        </div>

                        <div
                          className="wg-stats-total-grid"
                          style={{
                            display:'grid',
                            gridTemplateColumns:'repeat(4,minmax(0,1fr))',
                            gap:'12px',
                          }}
                        >
                          {tiempoDetallado.map((unidad,index) => (
                            <div
                              className="wg-stats-time-card"
                              key={`total-${unidad.label}`}
                              style={{
                                minHeight:'175px',
                                padding:'25px 10px 21px',
                                borderRadius:'27px',
                                textAlign:'center',
                                background:index===0
                                  ? 'linear-gradient(145deg,rgba(255,79,154,.20),rgba(255,255,255,.035))'
                                  : index===1
                                    ? 'linear-gradient(145deg,rgba(103,234,255,.16),rgba(255,255,255,.035))'
                                    : index===2
                                      ? 'linear-gradient(145deg,rgba(164,112,255,.14),rgba(255,255,255,.035))'
                                      : 'linear-gradient(145deg,rgba(255,196,92,.12),rgba(255,255,255,.035))',
                                border:'1px solid rgba(255,255,255,.11)',
                                boxShadow:'0 18px 55px rgba(0,0,0,.22)',
                              }}
                            >
                              <div style={{fontSize:28,marginBottom:18,animation:`wgStatsFloat ${3.2 + index*.35}s ease-in-out infinite`}}>
                                {unidad.icon}
                              </div>
                              <div className="wg-stats-time-number">{unidad.value}</div>
                              <span className="wg-stats-time-label">{unidad.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        className="wg-stats-category-grid"
                        style={{
                          display:'grid',
                          gridTemplateColumns:'repeat(2,minmax(0,1fr))',
                          gap:'18px',
                          marginTop:'18px',
                          position:'relative',
                          zIndex:2,
                        }}
                      >
                        {[
                          {
                            key:'peliculas',
                            title:'PELÍCULAS',
                            icon:'🎬',
                            tiempo:tiempoPeliculasDetallado,
                            accent:'rgba(255,79,154,.16)',
                            subtitle:`${peliculasVistas} películas vistas`,
                          },
                          {
                            key:'series',
                            title:'SERIES',
                            icon:'📺',
                            tiempo:tiempoSeriesDetallado,
                            accent:'rgba(103,234,255,.14)',
                            subtitle:`${seriesVistas} series · ${episodiosTotalesVistos} episodios vistos`,
                          },
                        ].map((categoria) => (
                          <div
                            className="wg-stats-category"
                            key={categoria.key}
                            style={{
                              padding:'24px',
                              borderRadius:'30px',
                              background:`radial-gradient(circle at 12% 0%,${categoria.accent},transparent 46%),rgba(255,255,255,.045)`,
                              border:'1px solid rgba(255,255,255,.10)',
                              boxShadow:'0 20px 62px rgba(0,0,0,.20)',
                            }}
                          >
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14}}>
                              <div>
                                <div style={{fontSize:14,letterSpacing:'.16em',fontWeight:950,opacity:.92,color:'rgba(255,255,255,.94)',textShadow:'0 0 14px rgba(255,255,255,.08)'}}>
                                  {categoria.icon} {categoria.title}
                                </div>
                                <div style={{marginTop:8,fontSize:13,opacity:.78,color:'rgba(255,255,255,.80)'}}>
                                  {categoria.subtitle}
                                </div>
                              </div>
                              <div style={{fontSize:34,filter:'drop-shadow(0 0 14px rgba(255,255,255,.12))'}}>
                                {categoria.icon}
                              </div>
                            </div>

                            <div
                              className="wg-stats-category-time-grid"
                              style={{
                                display:'grid',
                                gridTemplateColumns:'repeat(4,minmax(0,1fr))',
                                gap:'8px',
                                marginTop:'20px',
                              }}
                            >
                              {categoria.tiempo.map((unidad) => (
                                <div
                                  className="wg-stats-category-unit"
                                  key={`${categoria.key}-${unidad.label}`}
                                  style={{
                                    padding:'15px 5px 14px',
                                    borderRadius:'18px',
                                    textAlign:'center',
                                    background:'rgba(0,0,0,.15)',
                                    border:'1px solid rgba(255,255,255,.07)',
                                  }}
                                >
                                  <div style={{fontSize:18}}>{unidad.icon}</div>
                                  <strong className="wg-stats-category-number" style={{display:'block',marginTop:8}}>
                                    {unidad.value}
                                  </strong>
                                  <span className="wg-stats-category-label" style={{display:'block'}}>
                                    {unidad.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{textAlign:'center',marginTop:22,position:'relative',zIndex:2}}>
                        <span
                          style={{
                            display:'inline-flex',
                            alignItems:'center',
                            gap:9,
                            padding:'10px 17px',
                            borderRadius:999,
                            background:'rgba(255,255,255,.06)',
                            border:'1px solid rgba(255,255,255,.09)',
                            fontSize:12,
                            letterSpacing:'.09em',
                            fontWeight:850,
                            opacity:.78,
                          }}
                        >
                          🍿 {totalVistos} TÍTULOS · {totalFavoritos} FAVORITOS
                        </span>
                      </div>
                    </section>
                  </div>

                  <section className="movie-section" style={{ marginTop: '42px' }}>
                    <div className="section-title">
                      <h2 style={{ color: '#fff', textShadow: '0 0 22px rgba(255,255,255,.08)' }}>⭐ Tus valoraciones medias</h2>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '18px',
                      }}
                    >
                      <div
                        style={{
                          padding: '22px',
                          borderRadius: '18px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.10)',
                        }}
                      >
                        <span style={{ opacity: 0.7 }}>Películas vistas</span>
                        <strong style={{ display: 'block', fontSize: '32px', marginTop: '8px' }}>
                          {mediaPeliculas ? `⭐ ${mediaPeliculas.toFixed(1)}` : '—'}
                        </strong>
                        <small style={{ opacity: 0.6 }}>Valoración media de TMDB</small>
                      </div>

                      <div
                        style={{
                          padding: '22px',
                          borderRadius: '18px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.10)',
                        }}
                      >
                        <span style={{ opacity: 0.7 }}>Series vistas</span>
                        <strong style={{ display: 'block', fontSize: '32px', marginTop: '8px' }}>
                          {mediaSeries ? `⭐ ${mediaSeries.toFixed(1)}` : '—'}
                        </strong>
                        <small style={{ opacity: 0.6 }}>Valoración media de TMDB</small>
                      </div>
                    </div>
                  </section>

                  <section className="movie-section" style={{ marginTop: '42px' }}>
                    <div className="section-title">
                      <h2>🏆 Tus favoritos mejor valorados</h2>
                      <span className="movie-count">{totalFavoritos} favoritos</span>
                    </div>

                    {coleccionOrdenada.length > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                          gap: '20px',
                        }}
                      >
                        {coleccionOrdenada.map((item, index) => (
                          <div
                            key={item.id}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.10)',
                              borderRadius: '18px',
                              overflow: 'hidden',
                            }}
                          >
                            <div style={{ position: 'relative', aspectRatio: '2 / 3', background: 'rgba(0,0,0,0.20)' }}>
                              {item.poster ? (
                                <img
                                  src={`${TMDB_IMAGE_URL}${item.poster}`}
                                  alt={item.title}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '45px' }}>
                                  {item.tipo === 'Serie' ? '📺' : '🎬'}
                                </div>
                              )}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '10px',
                                  left: '10px',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(0,0,0,0.72)',
                                  fontWeight: 800,
                                }}
                              >
                                {index + 1}
                              </div>
                            </div>

                            <div style={{ padding: '14px' }}>
                              <h3 style={{ margin: '0 0 6px', fontSize: '16px', minHeight: '40px' }}>
                                {item.title}
                              </h3>
                              <p style={{ margin: 0, opacity: 0.68, fontSize: '13px' }}>
                                {item.tipo} · {item.year}
                              </p>
                              <p style={{ margin: '8px 0 0', fontWeight: 700 }}>
                                ⭐ {item.rating.toFixed(1)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty">
                        <div>📊</div>
                        <h2>Aún no hay estadísticas</h2>
                        <p>Marca películas o series como vistas o favoritas y aparecerán aquí.</p>
                        <button className="primary" onClick={() => setPagina('peliculas')}>
                          🎬 Explorar películas
                        </button>
                      </div>
                    )}
                  </section>

                  <section
                    style={{
                      marginTop: '42px',
                      padding: '24px',
                      borderRadius: '20px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <p className="small-title" style={{ marginBottom: '8px' }}>TU RESUMEN</p>
                    <p style={{ margin: 0, lineHeight: 1.7, opacity: 0.8 }}>
                      Has visto <strong>{totalVistos}</strong> títulos y tienes <strong>{totalFavoritos}</strong> favoritos guardados.
                      {peliculasVistas > seriesVistas
                        ? ' De momento ves más películas que series.'
                        : seriesVistas > peliculasVistas
                          ? ' De momento ves más series que películas.'
                          : totalVistos > 0
                            ? ' Tienes el mismo número de películas y series vistas.'
                            : ''}
                    </p>
                  </section>
                </>
              )
            })()}
          </section>
        )}

        {pagina === 'logros' && (
          <section className="welcome movies-page" style={{ position: 'relative', overflow: 'hidden' }}>
            <style>{`
              @keyframes wgAchievementFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
              @keyframes wgAchievementPulse { 0%,100%{box-shadow:0 0 0 rgba(255,79,154,0)} 50%{box-shadow:0 0 42px rgba(255,79,154,.24)} }
              @keyframes wgAchievementShine { 0%{transform:translateX(-120%) rotate(12deg)} 55%,100%{transform:translateX(160%) rotate(12deg)} }
              @media (max-width: 720px) { .wg-time-detail-grid { grid-template-columns: repeat(2,minmax(0,1fr)) !important; } }
              .wg-achievement-card:hover{transform:translateY(-7px) scale(1.012)!important;border-color:rgba(255,255,255,.34)!important}
              .wg-achievement-card:hover .wg-achievement-medal{transform:scale(1.07) rotate(-2deg)!important}
              @media(max-width:800px){.wg-achievement-hero-grid{grid-template-columns:1fr!important}.wg-achievement-levels{grid-template-columns:repeat(5,1fr)!important}.wg-achievement-item{grid-template-columns:1fr!important;text-align:center}.wg-achievement-progress{text-align:left}.wg-achievement-tier-dots{display:flex!important;justify-content:center!important;flex-direction:row!important}}
            `}</style>

            <div style={{ position:'absolute', inset:'-180px -20% auto', height:'520px', background:'radial-gradient(circle at 20% 35%,rgba(255,79,154,.22),transparent 30%),radial-gradient(circle at 70% 25%,rgba(91,107,255,.25),transparent 32%),radial-gradient(circle at 50% 75%,rgba(167,94,255,.18),transparent 35%)', filter:'blur(12px)', pointerEvents:'none' }} />

            <div style={{ position:'relative', padding:'12px 0 6px' }}>
              <p className="small-title" style={{ letterSpacing:'.32em', fontWeight:900 }}>HALL OF FAME · WEGEEKTV</p>
              <h1 style={{ fontSize:'clamp(52px,9vw,108px)', lineHeight:.88, margin:'12px 0 18px', letterSpacing:'-.055em', background:'linear-gradient(100deg,#fff 0%,#ff4f9a 38%,#a66cff 68%,#61d9ff 100%)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', textShadow:'0 0 45px rgba(255,79,154,.18)' }}>LOGROS</h1>
              <p className="description" style={{ maxWidth:760, fontSize:17, lineHeight:1.65 }}>Tu sala de trofeos cinematográficos. Completa retos, sube de Bronce a Diamante y convierte cada película y cada serie en una nueva medalla.</p>
            </div>

            {cargandoGenerosLogros && <p style={{ opacity:.6, fontSize:13, marginTop:10 }}>🔄 Actualizando géneros de tu colección…</p>}

            {(() => {
              const iniciados = logrosCalculados.filter((a) => a.tierIndex >= 0).length
              const diamantes = logrosCalculados.filter((a) => a.tierIndex === 4).length
              const progresoTotal = Math.round(logrosCalculados.reduce((total, a) => total + Math.max(0, a.tierIndex + 1), 0) / (logrosCalculados.length * 5) * 100)
              const maxTier = logrosCalculados.reduce((best, a) => Math.max(best, a.tierIndex), -1)
              const heroAchievement = logrosCalculados.find((a) => a.tierIndex >= 0) || logrosCalculados[0]
              return (
                <>
                  <section className="wg-achievement-hero-grid" style={{ display:'grid', gridTemplateColumns:'1.35fr .65fr', gap:18, marginTop:30 }}>
                    <div style={{ position:'relative', overflow:'hidden', minHeight:390, borderRadius:34, padding:'34px', background:'linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,79,154,.10) 42%,rgba(91,107,255,.10) 100%)', border:'1px solid rgba(255,255,255,.14)', boxShadow:'0 25px 80px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.08)', animation:'wgAchievementPulse 4s ease-in-out infinite' }}>
                      <div style={{ position:'absolute', width:360, height:360, borderRadius:'50%', right:-100, top:-120, background:'radial-gradient(circle,rgba(255,79,154,.30),transparent 68%)', filter:'blur(5px)' }} />
                      <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', left:-160, bottom:-180, background:'radial-gradient(circle,rgba(97,217,255,.22),transparent 68%)' }} />
                      <div style={{ position:'relative', display:'flex', alignItems:'center', gap:30, flexWrap:'wrap' }}>
                        <div className="wg-achievement-medal" style={{ width:220, height:220, flex:'0 0 220px', position:'relative', animation:'wgAchievementFloat 4s ease-in-out infinite', transition:'transform .25s ease', filter:'drop-shadow(0 20px 35px rgba(0,0,0,.35))' }}>
                          <div style={{ position:'absolute', inset:-35, borderRadius:'50%', background:`radial-gradient(circle,${maxTier >= 0 ? ACHIEVEMENT_TIER_GLOWS[Math.max(0,maxTier)] : 'rgba(255,79,154,.18)'} 0%,transparent 67%)`, filter:'blur(10px)' }} />
                          <AchievementBadge achievement={heroAchievement} tierIndex={Math.max(0,maxTier)} size={220} effects />
                        </div>
                        <div style={{ flex:1, minWidth:240 }}>
                          <span style={{ display:'inline-flex', padding:'7px 12px', borderRadius:999, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.13)', fontSize:11, fontWeight:900, letterSpacing:'.15em' }}>TU PROGRESO</span>
                          <h2 style={{ fontSize:'clamp(30px,4vw,48px)', margin:'16px 0 8px' }}>{iniciados === 0 ? 'Empieza tu leyenda' : `${iniciados} logros desbloqueados`}</h2>
                          <p style={{ margin:0, opacity:.68, lineHeight:1.6 }}>Tu nivel actual: <strong style={{ color:maxTier >= 0 ? ACHIEVEMENT_TIER_COLORS[maxTier] : '#fff' }}>{maxTier >= 0 ? ACHIEVEMENT_TIER_NAMES[maxTier] : 'Sin rango'}</strong></p>
                          <div style={{ marginTop:24, height:12, borderRadius:999, padding:2, background:'rgba(0,0,0,.25)', border:'1px solid rgba(255,255,255,.10)' }}><div style={{ height:'100%', width:`${progresoTotal}%`, borderRadius:999, background:'linear-gradient(90deg,#ff4f9a,#a66cff,#61d9ff)', boxShadow:'0 0 18px rgba(166,108,255,.45)', transition:'width .5s ease' }} /></div>
                          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:12, opacity:.62 }}><span>0%</span><span>{progresoTotal}% completado</span><span>100%</span></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateRows:'repeat(3,1fr)', gap:14 }}>
                      {[['🏆',`${iniciados}/25`,'LOGROS INICIADOS','#ff4f9a'],['💎',String(diamantes),'DIAMANTES','#61d9ff'],['⚡',`${progresoTotal}%`,'PROGRESO TOTAL','#a66cff']].map(([icon,value,label,color]) => (
                        <div key={String(label)} style={{ position:'relative', overflow:'hidden', borderRadius:26, padding:'22px 24px', background:`linear-gradient(135deg,${color}18,rgba(255,255,255,.045))`, border:`1px solid ${color}44`, boxShadow:`0 12px 35px ${color}12` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:16 }}><div style={{ width:58, height:58, borderRadius:18, display:'grid', placeItems:'center', fontSize:28, background:`${color}18`, border:`1px solid ${color}38`, boxShadow:`0 0 25px ${color}18` }}>{icon}</div><div><strong style={{ display:'block', fontSize:34, lineHeight:1 }}>{value}</strong><span style={{ display:'block', marginTop:7, fontSize:11, fontWeight:900, letterSpacing:'.12em', color }}>{label}</span></div></div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section style={{ marginTop:22, padding:'26px 24px 22px', borderRadius:30, background:'linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.025))', border:'1px solid rgba(255,255,255,.10)', boxShadow:'0 20px 60px rgba(0,0,0,.18)' }}>
                    <div style={{ textAlign:'center' }}><p className="small-title" style={{ marginBottom:5 }}>LA ESCALERA</p><h2 style={{ margin:0, fontSize:28 }}>De novato a leyenda</h2><p style={{ margin:'7px auto 0', opacity:.58, maxWidth:650 }}>Cada rango desbloquea una versión más espectacular de tus medallas.</p></div>
                    <div className="wg-achievement-levels" style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:10, marginTop:24 }}>
                      {ACHIEVEMENT_TIER_NAMES.map((tier,index) => <div key={tier} style={{ position:'relative', textAlign:'center', padding:'12px 5px 8px', borderRadius:22, background:`linear-gradient(180deg,${ACHIEVEMENT_TIER_GLOWS[index]},rgba(255,255,255,.025))`, border:`1px solid ${ACHIEVEMENT_TIER_COLORS[index]}55`, boxShadow:index <= maxTier ? `0 0 28px ${ACHIEVEMENT_TIER_GLOWS[index]}` : 'none' }}><div style={{ height:120, display:'grid', placeItems:'center' }}><AchievementBadge achievement={heroAchievement} tierIndex={index} size={105} effects /></div><strong style={{ display:'block', fontSize:11, color:ACHIEVEMENT_TIER_COLORS[index], letterSpacing:'.12em', textTransform:'uppercase' }}>{tier}</strong><span style={{ display:'block', fontSize:10, opacity:.45, marginTop:4 }}>{index <= maxTier ? 'DESBLOQUEADO' : 'POR CONSEGUIR'}</span></div>)}
                    </div>
                  </section>

                  <section className="movie-section" style={{ marginTop:30 }}>
                    <div className="section-title"><h2 style={{ fontSize:28 }}>🎖️ Tus 25 desafíos</h2><span className="movie-count">BRONCE · PLATA · ORO · PLATINO · DIAMANTE</span></div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(430px,1fr))', gap:16 }}>
                      {logrosCalculados.map((logro) => {
                        const tier = logro.tierIndex
                        const activeTier = tier >= 0 ? tier : 0
                        const color = tier >= 0 ? ACHIEVEMENT_TIER_COLORS[tier] : 'rgba(255,255,255,.30)'
                        const faltan = logro.nextThreshold === null ? 0 : Math.max(0, logro.nextThreshold - logro.value)
                        return (
                          <div key={logro.id} className="wg-achievement-card" style={{ position:'relative', overflow:'hidden', padding:'20px', borderRadius:26, background:tier >= 0 ? `linear-gradient(135deg,${ACHIEVEMENT_TIER_GLOWS[tier]},rgba(255,255,255,.035) 62%)` : 'linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.02))', border:`1px solid ${tier >= 0 ? color : 'rgba(255,255,255,.08)'}`, boxShadow:tier === 4 ? `0 0 38px ${ACHIEVEMENT_TIER_GLOWS[4]}` : '0 12px 35px rgba(0,0,0,.16)', transition:'transform .25s ease,border-color .25s ease,box-shadow .25s ease' }}>
                            <div style={{ position:'absolute', top:-80, right:-70, width:180, height:180, borderRadius:'50%', background:`radial-gradient(circle,${color}22,transparent 70%)`, pointerEvents:'none' }} />
                            <div className="wg-achievement-item" style={{ display:'grid', gridTemplateColumns:'120px minmax(0,1fr) 24px', gap:17, alignItems:'center', position:'relative' }}>
                              <div className="wg-achievement-medal" style={{ width:120, height:120, position:'relative', transition:'transform .25s ease' }}><AchievementBadge achievement={logro} tierIndex={activeTier} locked={tier < 0} size={120} effects /></div>
                              <div className="wg-achievement-progress" style={{ minWidth:0 }}>
                                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}><span style={{ opacity:.38, fontSize:10, fontWeight:900 }}>#{String(logro.id).padStart(2,'0')}</span><h3 style={{ margin:0, fontSize:17 }}>{logro.name}</h3>{tier >= 0 && <span style={{ color, fontSize:9, fontWeight:900, padding:'4px 7px', borderRadius:999, background:`${color}18`, border:`1px solid ${color}35`, textTransform:'uppercase' }}>{ACHIEVEMENT_TIER_NAMES[tier]}</span>}</div>
                                <p style={{ margin:'7px 0 12px', opacity:.60, fontSize:12.5, lineHeight:1.45 }}>{logro.description}</p>
                                <div style={{ height:9, borderRadius:999, background:'rgba(255,255,255,.08)', overflow:'hidden', border:'1px solid rgba(255,255,255,.06)' }}><div style={{ height:'100%', width:`${tier === 4 ? 100 : logro.percent}%`, background:`linear-gradient(90deg,${color},#fff)`, boxShadow:`0 0 14px ${color}`, borderRadius:'inherit', transition:'width .4s ease' }} /></div>
                                <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginTop:7, fontSize:11, opacity:.58 }}><span>{achievementNumber(logro.value)}{logro.nextThreshold !== null ? ` / ${achievementNumber(logro.nextThreshold)}` : ' · COMPLETADO'}</span><span>{faltan > 0 ? `Faltan ${achievementNumber(faltan)}` : '🏁 LISTO'}</span></div>
                              </div>
                              <div className="wg-achievement-tier-dots" style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'center' }}>{ACHIEVEMENT_TIER_NAMES.map((name,index) => <span key={name} title={name} style={{ width:10, height:10, borderRadius:'50%', background:index <= tier ? ACHIEVEMENT_TIER_COLORS[index] : 'rgba(255,255,255,.09)', boxShadow:index <= tier ? `0 0 9px ${ACHIEVEMENT_TIER_GLOWS[index]}` : 'none', border:'1px solid rgba(255,255,255,.12)' }} />)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  <div style={{ display:'flex', justifyContent:'center', marginTop:30 }}><button className="primary" onClick={() => setPagina('vitrina')} style={{ padding:'14px 24px', fontSize:15 }}>🎖️ Entrar en mi vitrina →</button></div>
                </>
              )
            })()}
          </section>
        )}

        {pagina === 'vitrina' && (
          <section className="welcome movies-page" style={{ position:'relative', overflow:'hidden', paddingBottom:'80px', isolation:'isolate' }}>
            <style>{`
              @keyframes wgShowroomFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-13px) rotate(.5deg)}}
              @keyframes wgShowroomPulse{0%,100%{opacity:.42;transform:scale(.94)}50%{opacity:1;transform:scale(1.08)}}
              @keyframes wgShowroomSpin{to{transform:rotate(360deg)}}
              @keyframes wgShowroomSpinR{to{transform:rotate(-360deg)}}
              @keyframes wgShowroomShine{0%{transform:translateX(-160%) skewX(-18deg);opacity:0}20%{opacity:.8}55%,100%{transform:translateX(180%) skewX(-18deg);opacity:0}}
              @keyframes wgShowroomSpark{0%,100%{opacity:.12;transform:translateY(8px) scale(.35)}50%{opacity:1;transform:translateY(-28px) scale(1.25)}}
              @keyframes wgShowroomReveal{from{opacity:0;transform:translateY(30px) scale(.94)}to{opacity:1;transform:none}}
              @keyframes wgShowroomBeam{0%,100%{opacity:.08;transform:rotate(-8deg) scaleY(.75)}50%{opacity:.28;transform:rotate(-3deg) scaleY(1)}}
              .wg-showcase-card{transition:transform .4s cubic-bezier(.2,.8,.2,1),filter .4s ease,box-shadow .4s ease,border-color .4s ease}
              .wg-showcase-card:hover{transform:translateY(-16px) scale(1.045);filter:brightness(1.16);z-index:10}
              .wg-showcase-card:hover .wg-showcase-medal{transform:scale(1.09) rotate(-1deg)!important}
              .wg-showcase-medal{transition:transform .45s cubic-bezier(.2,.8,.2,1);}
              .wg-showcase-mini{transition:transform .25s ease,opacity .25s ease}
              .wg-showcase-mini:hover{transform:translateY(-4px);opacity:1!important}
              @media(max-width:850px){.wg-showcase-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.wg-showcase-stage{min-height:520px!important}}
              @media(max-width:560px){.wg-showcase-grid{grid-template-columns:1fr!important}.wg-showcase-stage{min-height:470px!important}.wg-showcase-stage-medal{width:250px!important;height:250px!important}.wg-showcase-card{min-height:330px!important}}
            `}</style>

            {(() => {
              const conseguidos = logrosCalculados.filter((logro) => logro.tierIndex >= 0)
              const ordenados = [...conseguidos].sort((a,b) => b.tierIndex-a.tierIndex || b.percent-a.percent)
              const protagonista = ordenados[0] || null
              const maxTier = protagonista ? protagonista.tierIndex : -1
              const categoriaActual = maxTier >= 0 ? ACHIEVEMENT_TIER_NAMES[maxTier] : 'Bronce'
              const colorActual = maxTier >= 0 ? ACHIEVEMENT_TIER_COLORS[maxTier] : ACHIEVEMENT_TIER_COLORS[0]
              const glowActual = maxTier >= 0 ? ACHIEVEMENT_TIER_GLOWS[maxTier] : ACHIEVEMENT_TIER_GLOWS[0]
              const bronces = conseguidos.filter((logro) => logro.tierIndex === 0).length
              const platas = conseguidos.filter((logro) => logro.tierIndex === 1).length
              const oros = conseguidos.filter((logro) => logro.tierIndex === 2).length
              const platinums = conseguidos.filter((logro) => logro.tierIndex === 3).length
              const diamantes = conseguidos.filter((logro) => logro.tierIndex === 4).length
              const progresoColeccion = Math.round((conseguidos.length / 25) * 100)

              return (
                <>
                  {/* CABECERA MUY SIMPLE: el protagonismo es de las medallas */}
                  <div style={{ position:'relative', zIndex:3, textAlign:'center', padding:'28px 10px 16px', animation:'wgShowroomReveal .7s ease both' }}>
                    <p className="small-title" style={{ marginBottom:8, letterSpacing:'.42em', color:'#ff9ce2', fontWeight:1000, textShadow:'0 0 22px rgba(255,70,210,.55)' }}>✦ TU SALA DE TROFEOS ✦</p>
                    <h1 style={{ margin:0, fontSize:'clamp(52px,8vw,104px)', lineHeight:.9, fontWeight:1000, letterSpacing:'-.075em', background:'linear-gradient(100deg,#fff 0%,#ff8fdc 30%,#bd8cff 57%,#67eaff 84%,#fff 100%)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', textShadow:'0 0 60px rgba(255,70,210,.26)' }}>VITRINA</h1>
                    <p style={{ margin:'14px auto 0', maxWidth:620, fontSize:15, opacity:.62 }}>Tus medallas. <strong style={{ color:'#fff' }}>A la vista.</strong></p>
                  </div>

                  {protagonista ? (
                    <>
                      {/* ESCAPARATE PRINCIPAL: la medalla protagonista aparece antes que cualquier estadística */}
                      <section className="wg-showcase-stage" style={{ position:'relative', zIndex:2, minHeight:'610px', marginTop:'18px', borderRadius:'46px', overflow:'hidden', border:`1px solid ${colorActual}75`, background:`radial-gradient(circle at 50% 48%,${glowActual},transparent 30%),radial-gradient(circle at 50% 0%,rgba(255,255,255,.09),transparent 34%),linear-gradient(145deg,rgba(255,255,255,.07),rgba(0,0,0,.22))`, boxShadow:`0 50px 150px rgba(0,0,0,.42),0 0 130px ${glowActual}`, display:'flex', alignItems:'center', justifyContent:'center', animation:'wgShowroomReveal .7s ease .08s both' }}>
                        <div aria-hidden="true" style={{ position:'absolute', inset:0, background:'linear-gradient(110deg,transparent 28%,rgba(255,255,255,.07) 48%,transparent 58%)', animation:'wgShowroomShine 7s ease-in-out infinite' }} />
                        <div aria-hidden="true" style={{ position:'absolute', width:'700px', height:'700px', borderRadius:'50%', border:`1px solid ${colorActual}3c`, animation:'wgShowroomSpin 22s linear infinite' }} />
                        <div aria-hidden="true" style={{ position:'absolute', width:'560px', height:'560px', borderRadius:'50%', border:`1px dashed ${colorActual}50`, animation:'wgShowroomSpinR 14s linear infinite' }} />
                        <div aria-hidden="true" style={{ position:'absolute', width:'430px', height:'430px', borderRadius:'50%', border:`2px solid ${colorActual}22`, boxShadow:`0 0 130px ${glowActual}`, animation:'wgShowroomPulse 4.5s ease-in-out infinite' }} />
                        {[['10%','17%','✦','2.8s'],['18%','78%','✧','3.6s'],['39%','7%','✦','4.2s'],['45%','91%','✦','3.1s'],['68%','13%','✧','4.7s'],['73%','84%','✦','3.4s'],['86%','28%','✧','3.9s'],['84%','70%','✦','4.5s']].map(([top,left,char,duration],i)=><span key={i} aria-hidden="true" style={{ position:'absolute', top, left, color:colorActual, fontSize:i%2?14:21, filter:`drop-shadow(0 0 11px ${colorActual})`, animation:`wgShowroomSpark ${duration} ease-in-out infinite ${i*.25}s` }}>{char}</span>)}
                        <div aria-hidden="true" style={{ position:'absolute', left:'-8%', top:'18%', width:'48%', height:'60%', background:`linear-gradient(90deg,transparent,${glowActual},transparent)`, filter:'blur(35px)', animation:'wgShowroomBeam 5s ease-in-out infinite', transformOrigin:'100% 50%' }} />
                        <div aria-hidden="true" style={{ position:'absolute', right:'-8%', top:'18%', width:'48%', height:'60%', background:`linear-gradient(90deg,transparent,${glowActual},transparent)`, filter:'blur(35px)', animation:'wgShowroomBeam 5s ease-in-out infinite 1.2s', transformOrigin:'0 50%' }} />

                        <div style={{ position:'relative', zIndex:5, textAlign:'center', padding:'30px 15px', animation:'wgShowroomFloat 5s ease-in-out infinite' }}>
                          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 15px', borderRadius:999, color:colorActual, background:`${colorActual}18`, border:`1px solid ${colorActual}55`, boxShadow:`0 0 35px ${glowActual}`, fontSize:10, fontWeight:1000, letterSpacing:'.25em', textTransform:'uppercase' }}>✦ MEDALLA DESTACADA · {categoriaActual} ✦</div>
                          <div className="wg-showcase-stage-medal" style={{ position:'relative', width:380, height:380, margin:'12px auto -4px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div aria-hidden="true" style={{ position:'absolute', inset:'8%', borderRadius:'50%', background:glowActual, filter:'blur(45px)', opacity:.72 }} />
                            <div aria-hidden="true" style={{ position:'absolute', inset:'16%', borderRadius:'50%', border:`1px solid ${colorActual}50`, boxShadow:`0 0 65px ${glowActual}`, animation:'wgShowroomPulse 3.5s ease-in-out infinite' }} />
                            <div style={{ position:'relative', zIndex:2 }}><AchievementBadge achievement={protagonista} tierIndex={protagonista.tierIndex} size={315} effects /></div>
                          </div>
                          <h2 style={{ margin:'0 0 5px', fontSize:'clamp(25px,4vw,44px)', fontWeight:1000, textShadow:`0 0 30px ${glowActual}` }}>{protagonista.name}</h2>
                          <p style={{ margin:0, fontSize:12, opacity:.5 }}>{protagonista.description}</p>
                        </div>
                      </section>

                      {/* GALERÍA: ahora es lo segundo y ocupa casi toda la atención */}
                      <section style={{ position:'relative', zIndex:2, marginTop:'24px', padding:'30px 18px 34px', borderRadius:'42px', background:'radial-gradient(circle at 50% 0%,rgba(255,80,210,.09),transparent 38%),linear-gradient(180deg,rgba(255,255,255,.065),rgba(0,0,0,.17))', border:'1px solid rgba(255,255,255,.11)', boxShadow:'0 35px 110px rgba(0,0,0,.3)', overflow:'hidden' }}>
                        <div style={{ textAlign:'center', marginBottom:'26px' }}>
                          <p className="small-title" style={{ marginBottom:6, color:'#ff9ddd', letterSpacing:'.28em' }}>✦ LO QUE HAS CONQUISTADO ✦</p>
                          <h2 style={{ margin:0, fontSize:'clamp(30px,5vw,54px)', fontWeight:1000, letterSpacing:'-.04em' }}>TUS MEDALLAS</h2>
                          <p style={{ margin:'8px 0 0', opacity:.42, fontSize:11 }}>{conseguidos.length} conquistadas</p>
                        </div>
                        <div className="wg-showcase-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'20px', alignItems:'stretch' }}>
                          {ordenados.map((logro,index) => {
                            const tierColor = ACHIEVEMENT_TIER_COLORS[logro.tierIndex]
                            const tierGlow = ACHIEVEMENT_TIER_GLOWS[logro.tierIndex]
                            return (
                              <div className="wg-showcase-card" key={logro.id} style={{ position:'relative', minHeight:'360px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'34px', overflow:'hidden', background:`radial-gradient(circle at 50% 43%,${tierGlow},transparent 34%),linear-gradient(145deg,rgba(255,255,255,.075),rgba(0,0,0,.25))`, border:`1px solid ${tierColor}55`, boxShadow:`0 25px 70px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.07),0 0 45px ${tierGlow}`, animation:`wgShowroomReveal .55s ease ${Math.min(index*.07,.55)}s both` }}>
                                <div aria-hidden="true" style={{ position:'absolute', inset:'-35%', borderRadius:'50%', border:`1px solid ${tierColor}18`, animation:`wgShowroomSpin ${24 + index*2}s linear infinite` }} />
                                <div aria-hidden="true" style={{ position:'absolute', width:'170px', height:'170px', borderRadius:'50%', background:tierGlow, filter:'blur(45px)', opacity:.6 }} />
                                <span style={{ position:'absolute', top:14, left:16, fontSize:9, opacity:.3, fontWeight:1000, letterSpacing:'.15em' }}>#{String(logro.id).padStart(2,'0')}</span>
                                <span style={{ position:'absolute', top:14, right:16, color:tierColor, fontSize:9, fontWeight:1000, letterSpacing:'.14em', textTransform:'uppercase', textShadow:`0 0 12px ${tierGlow}` }}>{ACHIEVEMENT_TIER_NAMES[logro.tierIndex]}</span>
                                <div className="wg-showcase-medal" style={{ position:'relative', zIndex:2, animation:`wgShowroomFloat ${4 + (index%3)}s ease-in-out infinite ${index*.12}s`, filter:`drop-shadow(0 0 24px ${tierGlow})` }}><AchievementBadge achievement={logro} tierIndex={logro.tierIndex} size={230} effects /></div>
                                <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'42px 15px 18px', textAlign:'center', background:'linear-gradient(transparent,rgba(0,0,0,.65))' }}>
                                  <strong style={{ display:'block', fontSize:13, fontWeight:1000, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{logro.name}</strong>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </section>

                      {/* INFORMACIÓN MÍNIMA: solo una línea visual debajo de la vitrina */}
                      <section style={{ position:'relative', zIndex:2, marginTop:'20px', padding:'13px', display:'flex', justifyContent:'center', gap:'8px', flexWrap:'wrap' }}>
                        {[[0,'🥉',bronces],[1,'🥈',platas],[2,'🥇',oros],[3,'💠',platinums],[4,'💎',diamantes]].map(([tier,icon,count]) => (
                          <div className="wg-showcase-mini" key={String(tier)} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 12px', borderRadius:999, background:'rgba(255,255,255,.045)', border:`1px solid ${ACHIEVEMENT_TIER_COLORS[Number(tier)]}28`, opacity:Number(count)>0?1:.38 }}>
                            <span>{icon}</span><strong style={{ color:ACHIEVEMENT_TIER_COLORS[Number(tier)] }}>{count}</strong>
                          </div>
                        ))}
                        <div className="wg-showcase-mini" style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 12px', borderRadius:999, background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.09)', opacity:.65 }}><span>✦</span><strong>{progresoColeccion}%</strong></div>
                      </section>
                    </>
                  ) : (
                    <section style={{ position:'relative', zIndex:2, marginTop:'28px', minHeight:'470px', display:'grid', placeItems:'center', textAlign:'center', borderRadius:'44px', background:'radial-gradient(circle at 50% 45%,rgba(255,80,210,.14),transparent 35%),rgba(255,255,255,.035)', border:'1px dashed rgba(255,255,255,.14)' }}>
                      <div><div style={{ fontSize:90, filter:'drop-shadow(0 0 32px rgba(255,100,220,.55))' }}>🏆</div><h2 style={{ fontSize:34, margin:'15px 0 8px' }}>Tu vitrina está vacía.</h2><p style={{ opacity:.5, margin:0 }}>Tu primera medalla será Bronce.</p></div>
                    </section>
                  )}

                  <div style={{ position:'relative', zIndex:2, marginTop:'24px', textAlign:'center', opacity:.25, fontSize:9, letterSpacing:'.25em', textTransform:'uppercase' }}>WEGEEKTV · CADA MEDALLA CUENTA UNA HISTORIA</div>
                </>
              )
            })()}
          </section>
        )}






















































        {pagina === 'amigos' && (
          <section className="welcome" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position:'absolute', inset:'-120px -80px auto -80px', height:'420px', background:'radial-gradient(circle at 18% 30%, rgba(255,64,196,.28), transparent 32%), radial-gradient(circle at 78% 18%, rgba(94,92,255,.24), transparent 30%), radial-gradient(circle at 52% 70%, rgba(0,229,255,.12), transparent 28%)', filter:'blur(12px)', pointerEvents:'none' }} />

            <div style={{ position:'relative', zIndex:1, padding:'34px 0 22px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'10px' }}>
                <div style={{ width:58, height:58, borderRadius:20, display:'grid', placeItems:'center', fontSize:30, background:'linear-gradient(135deg, rgba(255,72,202,.22), rgba(93,91,255,.22))', border:'1px solid rgba(255,255,255,.14)', boxShadow:'0 0 34px rgba(255,72,202,.18)' }}>👥</div>
                <div>
                  <p className="small-title" style={{ margin:'0 0 5px' }}>TU GRUPO</p>
                  <h1 style={{ margin:0, fontSize:'clamp(38px, 5vw, 62px)', lineHeight:.95, background:'linear-gradient(90deg,#fff 0%,#ff72d2 42%,#8d8bff 78%,#62e9ff 100%)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', textShadow:'0 0 32px rgba(255,91,214,.14)' }}>Mis amigos</h1>
                </div>
              </div>
              <p style={{ margin:'16px 0 0', maxWidth:720, fontSize:17, lineHeight:1.65, color:'rgba(255,255,255,.62)' }}>Tu pequeña comunidad dentro de WeGeekTV. <strong style={{ color:'rgba(255,255,255,.9)' }}>Añade amigos, descubre sus perfiles y compara vuestra colección.</strong></p>
            </div>

            <div style={{ position:'relative', zIndex:1, margin:'22px 0 30px', padding:'18px', borderRadius:28, background:'linear-gradient(135deg, rgba(255,255,255,.075), rgba(255,255,255,.025))', border:'1px solid rgba(255,255,255,.11)', boxShadow:'0 18px 55px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.07)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:44, height:44, flex:'0 0 44px', borderRadius:15, display:'grid', placeItems:'center', fontSize:20, background:'linear-gradient(135deg, #ff4fca, #716cff)', boxShadow:'0 0 25px rgba(255,79,202,.28)' }}>⌕</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:6 }}>Encontrar gente</div>
                  <input
                    value={busquedaAmigos}
                    onChange={(e) => setBusquedaAmigos(e.target.value)}
                    placeholder="Busca por nombre de usuario..."
                    style={{ width:'100%', boxSizing:'border-box', padding:'4px 0', border:0, outline:0, background:'transparent', color:'white', fontSize:19, fontWeight:700 }}
                  />
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', minWidth:76 }}>
                  <strong style={{ fontSize:28, lineHeight:1, background:'linear-gradient(90deg,#ff72d2,#8d8bff)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>{amigosActuales.length}</strong>
                  <span style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.38)', marginTop:5 }}>amigos</span>
                </div>
              </div>
            </div>

            {busquedaAmigos.trim() && (
              <section className="section" style={{ position:'relative', zIndex:1 }}>
                <div className="section-title"><h2 style={{ fontSize:26 }}>🔎 Resultados de búsqueda</h2><span className="movie-count">{friends.filter((f) => f.name.toLowerCase().includes(busquedaAmigos.toLowerCase()) && f.id !== session?.user?.id).length}</span></div>
                <div className="cards">
                  {friends
                    .filter((f) => f.name.toLowerCase().includes(busquedaAmigos.toLowerCase()) && f.id !== session?.user?.id)
                    .map((usuario) => {
                      const esAmigo = amigosActuales.includes(usuario.id)
                      const enviada = solicitudesEnviadas.includes(usuario.id)
                      return (
                        <div className="card" key={usuario.name} style={{ position:'relative', overflow:'hidden', borderRadius:24, background:'linear-gradient(145deg, rgba(255,78,202,.11), rgba(95,91,255,.08) 55%, rgba(255,255,255,.035))', border:'1px solid rgba(255,255,255,.11)', boxShadow:'0 18px 45px rgba(0,0,0,.2)' }}>
                          <div style={{ position:'absolute', top:-35, right:-35, width:110, height:110, borderRadius:'50%', background:'rgba(255,86,208,.16)', filter:'blur(18px)' }} />
                          <div className="poster" style={{ position:'relative', zIndex:1, width:86, height:86, borderRadius:26, fontSize:40, display:'grid', placeItems:'center', margin:'0 auto 16px', background:'linear-gradient(135deg, rgba(255,255,255,.1), rgba(255,255,255,.035))', border:'1px solid rgba(255,255,255,.13)', boxShadow:'0 0 35px rgba(255,87,208,.14)' }}>{usuario.avatar}</div>
                          <h3 style={{ position:'relative', zIndex:1, fontSize:21 }}>{usuario.name}</h3>
                          <p style={{ position:'relative', zIndex:1 }}>{esAmigo ? '🤝 Ya sois amigos' : enviada ? '⏳ Solicitud enviada' : 'Usuario de WeGeekTV'}</p>
                          {!esAmigo && !enviada && (
                            <button className="primary" onClick={() => enviarSolicitudAmistad(usuario)} style={{ position:'relative', zIndex:1, width:'100%' }}>✨ Añadir amigo</button>
                          )}
                        </div>
                      )
                    })}
                </div>
              </section>
            )}

            {solicitudesRecibidas.length > 0 && (
              <section className="section" style={{ position:'relative', zIndex:1 }}>
                <div className="section-title"><h2 style={{ fontSize:26 }}>📨 Solicitudes pendientes</h2><span className="movie-count">{solicitudesRecibidas.length}</span></div>
                <div className="cards">
                  {solicitudesRecibidas.map((usuarioId) => {
                    const usuario = friends.find((f) => f.id === usuarioId)
                    if (!usuario) return null
                    return (
                      <div className="card" key={usuarioId} style={{ borderRadius:24, background:'linear-gradient(145deg, rgba(255,196,72,.11), rgba(255,92,192,.07), rgba(255,255,255,.035))', border:'1px solid rgba(255,255,255,.12)' }}>
                        <div className="poster" style={{ width:78, height:78, borderRadius:24, fontSize:36, display:'grid', placeItems:'center', margin:'0 auto 14px' }}>{usuario.avatar}</div>
                        <h3 style={{ fontSize:21 }}>{usuario.name}</h3>
                        <p>Quiere formar parte de tu círculo.</p>
                        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                          <button className="primary" onClick={() => aceptarSolicitud(usuarioId)} style={{ flex:1 }}>✅ Aceptar</button>
                          <button className="secondary" onClick={() => rechazarSolicitud(usuarioId)} style={{ flex:1 }}>Rechazar</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="section" style={{ position:'relative', zIndex:1, marginTop:32 }}>
              <div className="section-title"><h2 style={{ fontSize:28 }}>🤝 Tu círculo</h2><span className="movie-count">{amigosActuales.length}</span></div>
              {amigosActuales.length > 0 ? (
                <div className="cards">
                  {friends.filter((amigo) => amigosActuales.includes(amigo.id)).map((amigo) => (
                    <div className="card" key={amigo.name} style={{ position:'relative', overflow:'hidden', borderRadius:28, padding:'22px', background:'linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.025))', border:'1px solid rgba(255,255,255,.1)', boxShadow:'0 20px 55px rgba(0,0,0,.23)', transition:'transform .2s ease, box-shadow .2s ease' }}>
                      <div style={{ position:'absolute', inset:'auto -30px -55px auto', width:160, height:160, borderRadius:'50%', background: amigo.status === 'Online' ? 'rgba(74,222,128,.12)' : 'rgba(142,142,255,.08)', filter:'blur(28px)' }} />
                      <div onClick={() => abrirPerfil(amigo)} style={{ cursor:'pointer', position:'relative', zIndex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:16, textAlign:'left' }}>
                          <div className="poster" style={{ flex:'0 0 76px', width:76, height:76, borderRadius:24, fontSize:36, display:'grid', placeItems:'center', background:'linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.035))', border:'1px solid rgba(255,255,255,.12)' }}>{amigo.avatar}</div>
                          <div style={{ minWidth:0, flex:1 }}>
                            <h3 style={{ margin:'0 0 6px', fontSize:22, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{amigo.name}</h3>
                            <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color: amigo.status === 'Online' ? '#70f3a1' : 'rgba(255,255,255,.42)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}><span style={{ width:8, height:8, borderRadius:'50%', background: amigo.status === 'Online' ? '#4ade80' : '#777', boxShadow: amigo.status === 'Online' ? '0 0 12px #4ade80' : 'none' }} />{amigo.status}</div>
                          </div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:20 }}>
                          <div style={{ padding:'13px 12px', borderRadius:17, background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.06)' }}><strong style={{ display:'block', fontSize:21 }}>{amigo.movies}</strong><span style={{ fontSize:10, color:'rgba(255,255,255,.42)', textTransform:'uppercase', letterSpacing:'.1em' }}>Películas</span></div>
                          <div style={{ padding:'13px 12px', borderRadius:17, background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.06)' }}><strong style={{ display:'block', fontSize:21 }}>{amigo.series}</strong><span style={{ fontSize:10, color:'rgba(255,255,255,.42)', textTransform:'uppercase', letterSpacing:'.1em' }}>Series</span></div>
                        </div>
                        <div style={{ marginTop:10, padding:'12px 14px', borderRadius:16, background:'linear-gradient(90deg, rgba(255,82,204,.08), rgba(111,103,255,.06))', color:'rgba(255,255,255,.62)', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>🎬 {amigo.watching || 'Explorando qué ver...'}</div>
                      </div>
                      <button className="secondary" onClick={() => eliminarAmigo(amigo.id)} style={{ position:'relative', zIndex:1, width:'100%', marginTop:14, opacity:.72 }}>Quitar amigo</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ position:'relative', overflow:'hidden', minHeight:330, display:'grid', placeItems:'center', textAlign:'center', borderRadius:32, padding:30, background:'radial-gradient(circle at 50% 40%, rgba(255,77,205,.12), transparent 34%), radial-gradient(circle at 70% 70%, rgba(91,89,255,.1), transparent 32%), rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.08)', boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)' }}>
                  <div>
                    <div style={{ fontSize:76, marginBottom:12, filter:'drop-shadow(0 0 25px rgba(255,84,207,.35))' }}>👥</div>
                    <h2 style={{ margin:'0 0 8px', fontSize:30, background:'linear-gradient(90deg,#fff,#ff79d5,#9692ff)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>Tu círculo está esperando</h2>
                    <p style={{ margin:'0 auto', maxWidth:480, color:'rgba(255,255,255,.48)', lineHeight:1.6 }}>Busca a otros usuarios de WeGeekTV arriba. Cuando aceptéis la solicitud, podréis descubrir vuestras estadísticas y vitrinas.</p>
                  </div>
                </div>
              )}
            </section>
          </section>
        )}

        {pagina === 'mi-perfil' && (
          <section className="welcome">
            <p className="small-title">MI PERFIL</p>

            <div className="profile-header">
              <div className="big-avatar">{avatarUsuario}</div>
              <div style={{ flex: 1 }}>
                {editandoPerfil ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px' }}>
                    <input
                      value={nombreUsuario}
                      onChange={(e) => setNombreUsuario(e.target.value)}
                      placeholder="Tu nombre"
                      style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: 'white' }}
                    />
                    <input
                      value={avatarUsuario}
                      onChange={(e) => setAvatarUsuario(e.target.value)}
                      placeholder="Avatar (emoji)"
                      maxLength={4}
                      style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: 'white' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="primary" onClick={guardarPerfilUsuario}>Guardar cambios</button>
                      <button className="secondary" onClick={() => setEditandoPerfil(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1>{nombreUsuario}</h1>
                    <p>Tu colección personal en WeGeekTV</p>
                    <button className="secondary" onClick={() => setEditandoPerfil(true)}>✏️ Editar perfil</button>
                  </>
                )}
              </div>
            </div>

            {(() => {
              const minutosPeliculas = vistasTMDB.reduce((t, p) => t + (p.runtime || 0), 0)
              const minutosSeriesPorEpisodios = (Object.values(episodiosVistos) as TmdbEpisode[][]).reduce(
                (total, episodios) =>
                  total +
                  (Array.isArray(episodios)
                    ? episodios.reduce((subtotal, episodio) => subtotal + (episodio.runtime || 0), 0)
                    : 0),
                0,
              )
              const minutosSeriesAntiguas = vistasSeriesTMDB.reduce((total, serie) => {
                const episodiosDeSerie = episodiosVistos[String(serie.id)] || []
                return episodiosDeSerie.length === 0 ? total + (serie.tiempoTotal || 0) : total
              }, 0)
              const minutosSeries = minutosSeriesPorEpisodios + minutosSeriesAntiguas
              const minutosTotales = minutosPeliculas + minutosSeries
              const horas = Math.floor(minutosTotales / 60)
              const minutos = minutosTotales % 60
              const formatearTiempo = horas > 0 ? `${horas}h ${minutos}min` : `${minutos} min`

              return (
                <>
                  <div className="stats">
                    <div className="stat"><strong>{vistasTMDB.length}</strong><span>Películas vistas</span></div>
                    <div className="stat"><strong>{vistasSeriesTMDB.length}</strong><span>Series vistas</span></div>
                    <div className="stat"><strong>{(Object.values(episodiosVistos) as TmdbEpisode[][]).reduce((total, episodios) => total + (Array.isArray(episodios) ? episodios.length : 0), 0)}</strong><span>Episodios vistos</span></div>
                    <div className="stat"><strong>{favoritasTMDB.length + favoritasSeriesTMDB.length}</strong><span>Favoritos ❤️</span></div>
                    <div className="stat"><strong>{formatearTiempo}</strong><span>Tiempo visto</span></div>
                  </div>

                  <section className="section">
                    <div className="section-title">
                      <h2>Tu actividad</h2>
                    </div>
                    <div className="cards">
                      <div className="card" onClick={() => { setTipoColeccion('peliculas'); setFiltro('vistas'); setPagina('coleccion') }} style={{ cursor: 'pointer' }}>
                        <div className="poster">▣</div>
                        <h3>{vistasTMDB.length} películas</h3>
                        <p>Marcadas como vistas</p>
                      </div>
                      <div className="card" onClick={() => { setTipoColeccion('series'); setFiltro('vistas'); setPagina('coleccion') }} style={{ cursor: 'pointer' }}>
                        <div className="poster">◫</div>
                        <h3>{vistasSeriesTMDB.length} series</h3>
                        <p>Marcadas como vistas</p>
                      </div>
                      <div className="card" onClick={() => { setFiltro('favoritas'); setPagina('coleccion') }} style={{ cursor: 'pointer' }}>
                        <div className="poster">♡</div>
                        <h3>{favoritasTMDB.length + favoritasSeriesTMDB.length} favoritos</h3>
                        <p>Tu lista personal</p>
                      </div>
                    </div>
                  </section>

                  <section className="section">
                    <div className="section-title">
                      <h2>Tus amigos</h2>
                      <button className="secondary" onClick={() => setPagina('amigos')}>Ver amigos</button>
                    </div>
                    <div className="cards">
                      {friends.filter((amigo) => amigosActuales.includes(amigo.id)).map((amigo) => (
                        <div className="card" key={amigo.name} onClick={() => abrirPerfil(amigo)} style={{ cursor: 'pointer' }}>
                          <div className="poster">{amigo.avatar}</div>
                          <h3>{amigo.name}</h3>
                          <p>{amigo.movies} películas · {amigo.series} series</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )
            })()}
          </section>
        )}

        {pagina === 'perfil' && amigoSeleccionado && (
          <section className="welcome">
            <button className="secondary" onClick={volverAmigos}>
              ← Volver a amigos
            </button>

            <p className="small-title">PERFIL</p>

            <div className="profile-header">
              <div className="big-avatar">{amigoSeleccionado.avatar}</div>

              <div>
                <h1>{amigoSeleccionado.name}</h1>
                <p>
                  <span
                    style={{
                      color: amigoSeleccionado.status === 'Online' ? '#4ade80' : '#aaa',
                    }}
                  >
                    ● {amigoSeleccionado.status}
                  </span>
                </p>
              </div>
            </div>

            <div className="stats">
              <div className="stat">
                <strong>{amigoSeleccionado.movies}</strong>
                <span>Películas</span>
              </div>

              <div className="stat">
                <strong>{amigoSeleccionado.series}</strong>
                <span>Series</span>
              </div>

              <div className="stat">
                <strong>{amigoSeleccionado.favorites}</strong>
                <span>Favoritos ❤️</span>
              </div>
            </div>

            <div className="currently-watching">
              <p className="small-title">ESTÁ VIENDO AHORA</p>
              <h2>📊 {amigoSeleccionado.movies} películas · 📺 {amigoSeleccionado.series} series · ❤️ {amigoSeleccionado.favorites} favoritos</h2>
              <p>
                Estos datos se cargan directamente desde la cuenta de tu amigo en WeGeekTV.
              </p>
            </div>

            <section className="section">
              <div className="section-title">
                <h2>🎬 Últimas películas</h2>
              </div>

              <div className="cards">
                <div className="card">
                  <div className="poster">▣</div>
                  <h3>Actividad de {amigoSeleccionado.name}</h3>
                  <p>Perfil de amigo</p>
                </div>

                <div className="card">
                  <div className="poster">⭐</div>
                  <h3>❤️ Favoritos</h3>
                  <p>Añadida a favoritos</p>
                </div>

                <div className="card">
                  <div className="poster">🎞️</div>
                  <h3>🎬 Películas vistas</h3>
                  <p>Vista recientemente</p>
                </div>
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
