import { useState } from "react";
import { PlayView } from "./components/PlayView.tsx";
import { ResultView } from "./components/ResultView.tsx";
import { StartView } from "./components/StartView.tsx";
import type { Duration, Mode, PlayStats } from "./lib/types.ts";

type Screen =
  | { name: "start" }
  | { name: "play"; mode: Mode; duration: Duration }
  | { name: "result"; mode: Mode; duration: Duration; stats: PlayStats; resultId: string | null };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "start" });

  return (
    <>
      <div className="scan" />
      {screen.name === "start" ? (
        <StartView onStart={(mode, duration) => setScreen({ name: "play", mode, duration })} />
      ) : null}
      {screen.name === "play" ? (
        <PlayView
          mode={screen.mode}
          duration={screen.duration}
          onFinish={(stats, resultId) =>
            setScreen({
              name: "result",
              mode: screen.mode,
              duration: screen.duration,
              stats,
              resultId,
            })
          }
        />
      ) : null}
      {screen.name === "result" ? (
        <ResultView
          mode={screen.mode}
          duration={screen.duration}
          stats={screen.stats}
          resultId={screen.resultId}
          onBack={() => setScreen({ name: "start" })}
        />
      ) : null}
    </>
  );
}
