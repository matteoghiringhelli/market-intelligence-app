const FORBIDDEN_TERMS = [
  "XXX"
];

export function validateEducationalText(text) {
  const normalizedText = String(text || "").toLowerCase();

  const matches = FORBIDDEN_TERMS.filter((term) =>
    normalizedText.includes(term.toLowerCase())
  );

  return {
    isValid: matches.length === 0,
    matches
  };
}