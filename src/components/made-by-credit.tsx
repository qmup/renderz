import { messages } from '@/lib/i18n/messages'
import { getLocale } from '@/lib/i18n/server'

const GITHUB_URL = 'https://github.com/qmup'
const NAME = 'Quân Mụp'

export async function MadeByCredit() {
  const copy = messages[await getLocale()]
  return (
    <p className="text-xs leading-relaxed text-neutral-500">
      {copy.madeByBefore}{' '}
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="credit-name font-semibold"
        aria-label={copy.madeByLabel}
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
      {copy.madeByAfter}
    </p>
  )
}
