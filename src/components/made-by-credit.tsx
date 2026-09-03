const GITHUB_URL = "https://github.com/qmup";

const LETTER_COLORS = [
  "#ea580c",
  "#f97316",
  "#fb923c",
  "#f59e0b",
  "#eab308",
  "#facc15",
  "#fde047",
  "#fbbf24",
];

function hopWord(
  text: string,
  delay: string,
  duration: string,
  colorOffset: number,
) {
  return (
    <span
      className="credit-word"
      style={{ animationDelay: delay, animationDuration: duration }}
    >
      {[...text].map((letter, index) => (
        <span
          key={`${text}-${index}`}
          className="credit-letter"
          style={{
            color: LETTER_COLORS[(colorOffset + index) % LETTER_COLORS.length],
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

export function MadeByCredit() {
  return (
    <p className="credit-line">
      {hopWord("Made", "0ms", "1.08s", 0)}{" "}
      {hopWord("by", "190ms", "1.46s", 4)}{" "}
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="credit-link"
      >
        {hopWord("Quân", "70ms", "0.94s", 1)}{" "}
        {hopWord("Mụp", "310ms", "1.62s", 5)}
      </a>
    </p>
  );
}
