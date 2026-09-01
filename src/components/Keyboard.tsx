const ROWS = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"],
  ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
];

function extra(row: number): string {
  if (row === 1) return "TAB";
  if (row === 2) return "CAPS";
  if (row === 3) return "SHIFT";
  return "";
}

type Props = {
  lit: string | null;
};

export function Keyboard({ lit }: Props) {
  const litKey = lit?.toLowerCase() ?? null;
  return (
    <div className="kb-wrap">
      <div className="kb">
        {ROWS.map((row, index) => (
          <div className="kb-row" key={row.join("")}>
            {extra(index) ? <div className="key wide">{extra(index)}</div> : null}
            {row.map((label) => {
              const data = label.toLowerCase();
              return (
                <div key={label} className={data === litKey ? "key lit" : "key"}>
                  {label}
                </div>
              );
            })}
          </div>
        ))}
        <div className="kb-row">
          <div className={litKey === " " ? "key space lit" : "key space"}>SPACE</div>
        </div>
      </div>
    </div>
  );
}
