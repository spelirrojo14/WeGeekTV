export type Movie = {
  id: number
  title: string
  year: number
  genre: string
  rating: number
  emoji: string
  poster: string
  watched: boolean
  favorite: boolean
}

export const movies: Movie[] = [
  {
    id: 1,
    title: 'Incantation',
    year: 2022,
    genre: 'Terror',
    rating: 7.0,
    emoji: '👁️',
    poster: '',
    watched: false,
    favorite: false,
  },
  {
    id: 2,
    title: 'El Conjuro',
    year: 2013,
    genre: 'Terror',
    rating: 7.5,
    emoji: '👻',
    poster: '',
    watched: true,
    favorite: true,
  },
  {
    id: 3,
    title: 'Interstellar',
    year: 2014,
    genre: 'Ciencia ficción',
    rating: 8.7,
    emoji: '🚀',
    poster: '',
    watched: false,
    favorite: false,
  },
  {
    id: 4,
    title: 'Scream',
    year: 1996,
    genre: 'Terror',
    rating: 7.4,
    emoji: '🔪',
    poster: '',
    watched: true,
    favorite: true,
  },
  {
    id: 5,
    title: 'Smile',
    year: 2022,
    genre: 'Terror',
    rating: 6.5,
    emoji: '🙂',
    poster: '',
    watched: false,
    favorite: true,
  },
  {
    id: 6,
    title: 'Deadpool',
    year: 2016,
    genre: 'Acción / Comedia',
    rating: 8.0,
    emoji: '💥',
    poster: '',
    watched: true,
    favorite: false,
  },
  {
    id: 7,
    title: 'El Conjuro 2',
    year: 2016,
    genre: 'Terror',
    rating: 7.3,
    emoji: '🏚️',
    poster: '',
    watched: false,
    favorite: false,
  },
  {
    id: 8,
    title: 'La Monja',
    year: 2018,
    genre: 'Terror',
    rating: 5.3,
    emoji: '⛪',
    poster: '',
    watched: false,
    favorite: false,
  },
]