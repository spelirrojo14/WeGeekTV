const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function buscarPeliculas(query: string) {
  const respuesta = await fetch(
    `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=es-ES&query=${encodeURIComponent(query)}`
  )

  if (!respuesta.ok) {
    throw new Error('No se pudieron obtener las películas de TMDB')
  }

  const datos = await respuesta.json()

  return datos.results
}