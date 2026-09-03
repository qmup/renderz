const GITHUB_URL = 'https://github.com/qmup'
const NAME = 'Quân Mụp'

export function MadeByCredit() {
  return (
    <p className="text-xs leading-relaxed text-neutral-500">
      Made by{' '}
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="credit-name font-semibold"
        aria-label="Quân Mụp on GitHub"
      >
        {Array.from(NAME).map((char, index) =>
          char === ' ' ? (
            <span key={index} className="credit-letter-space">
              {' '}
            </span>
          ) : (
            <span
              key={index}
              className="credit-letter"
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              {char}
            </span>
          ),
        )}
      </a>{' '}
      for player tracking.
    </p>
  )
}
