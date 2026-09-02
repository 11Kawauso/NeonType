const ROWS = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"],
  ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
];

const SHIFTED: Record<string, string> = {
  "~": "`",
  "!": "1",
  "@": "2",
  "#": "3",
  $: "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  _: "-",
  "+": "=",
  "{": "[",
  "}": "]",
  ":": ";",
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
};

function extra(row: number): string {
  if (row === 1) return "TAB";
  if (row === 2) return "CAPS";
  if (row === 3) return "SHIFT";
  return "";
}

export function keycapFor(ch: string | null): string | null {
  if (ch == null || ch.length === 0) return null;
  if (ch === " ") return " ";
  return (SHIFTED[ch] ?? ch).toLowerCase();
}

function keyClass(data: string, litKey: string | null, nextKey: string | null, extraCls?: string) {
  const parts = ["key"];
  if (extraCls) parts.push(extraCls);
  if (data === nextKey) parts.push("next");
  if (data === litKey) parts.push("lit");
  return parts.join(" ");
}

type Props = {
  lit: string | null;
  next: string | null;
};

export function Keyboard({ lit, next }: Props) {
  const litKey = keycapFor(lit);
  const nextKey = keycapFor(next);
  return (
    <div className="kb-wrap">
      <div className="kb">
        {ROWS.map((row, index) => (
          <div className="kb-row" key={row.join("")}>
            {extra(index) ? <div className="key wide">{extra(index)}</div> : null}
            {row.map((label) => {
              const data = label.toLowerCase();
              return (
                <div key={label} className={keyClass(data, litKey, nextKey)}>
                  {label}
                </div>
              );
            })}
          </div>
        ))}
        <div className="kb-row">
          <div className={keyClass(" ", litKey, nextKey, "space")}>SPACE</div>
        </div>
      </div>
    </div>
  );
}
