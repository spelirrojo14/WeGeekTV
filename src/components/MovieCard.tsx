import type { Movie } from '../data/movies'

type MovieCardProps = {
  pelicula: Movie
  cambiarVista: (id: number) => void
  cambiarFavorito: (id: number) => void
}

function MovieCard({
  pelicula,
  cambiarVista,
  cambiarFavorito,
}: MovieCardProps) {
  return (
    <article className="movie-card">

      <div className="movie-poster">

        {pelicula.poster ? (
          <img
            src={pelicula.poster}
            alt={pelicula.title}
          />
        ) : (
          <div className="movie-emoji">
            {pelicula.emoji}
          </div>
        )}

        <button
          className="movie-favorite"
          onClick={() => cambiarFavorito(pelicula.id)}
        >
          {pelicula.favorite ? '❤️' : '🤍'}
        </button>

        {pelicula.watched && (
          <span className="watched-badge">
            ✓ Vista
          </span>
        )}

      </div>

      <div className="movie-info">

        <h3>
          {pelicula.title}
        </h3>

        <p className="movie-meta">
          {pelicula.year} · {pelicula.genre}
        </p>

        <div className="movie-footer">

          <span className="movie-rating">
            ⭐ {pelicula.rating}
          </span>

          <button
            className={
              pelicula.watched
                ? 'watched-button active'
                : 'watched-button'
            }
            onClick={() => cambiarVista(pelicula.id)}
          >
            {pelicula.watched
              ? '✓ Vista'
              : 'Marcar vista'}
          </button>

        </div>

      </div>

    </article>
  )
}

export default MovieCard