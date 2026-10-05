# ParenWhy

Shows how C, JavaScript, Python and SQLite group one integer expression, and the value each gives.

Open `app.html` (GitHub Pages). Everything runs client side.

## Testing
`oracle.py <seed> <n> <out>` generates n random integer expressions per language (literals 0-5, depth up to 4, binary and unary operators, parentheses) and records what the real tool prints: gcc 11.4 for C (`printf("%d")`), Node 22 for JavaScript, Python 3.10 `eval`, SQLite 3.37.2 `SELECT`. `test-engine.js` compares `engine.js`.

- Seeds 2-7, 5,000 expressions per language each: 120,000 lines, 0 mismatches. Seed 1 (3,000 per language) was used while debugging.
- Bugs found by the oracle and fixed: Python's `not` is not allowed as an operand of a binary operator; `--` and `++` are decrement/increment tokens in C and JavaScript; `--` starts a comment in SQLite; JavaScript results beyond 2^53 are inexact.
- Skipped from comparison: expressions where the oracle gives no integer (errors, floats), C expressions with undefined behaviour (signed overflow beyond 32 bits, bad shifts), JavaScript results beyond 2^53. Counts are in the `test-engine.js` output.
- For C and JavaScript the generator inserts a space between doubled `-` or `+`; the engine's handling of `--` and `++` was checked by hand, not by the oracle.

## Limits
- SQLite `||` (text join) is parsed but not value-tested. Division and modulo are parsed, not evaluated. No assignment, ternary, strings, floats, or other languages.
- The precedence tables were written from my knowledge of the languages, not checked against their standards or manuals. Only the oracle runs check them.
