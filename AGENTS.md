# NeonType

制限時間制のタイピングゲーム。長文（ローマ字）とコード 1 行を打ち、部門別ランキングに登録する。

## コマンド

開発シェルは Nix flake + direnv。JS ツールは Vite+（`vp`）。

| コマンド                                   | 内容                                |
| ------------------------------------------ | ----------------------------------- |
| `just dev`                                 | ローカル開発サーバ                  |
| `just check`                               | `vp check` + `vp test` + `vp build` |
| `just deploy`                              | ビルドして Wrangler でデプロイ      |
| `just db-migrate` / `just db-migrate-prod` | D1 migration                        |
| `just db-seed` / `just db-seed-prod`       | 問題データの投入                    |
| `just db-reset`                            | ローカル D1 を作り直す              |

`vp` が無い場合は `curl -fsSL https://vite.plus | bash`。

## 構成

- フロント: `src/`（React SPA。ルータなし。Start / Play / Result）
- Worker: `worker/`（Hono。`/api/*`）
- 問題: `src/data/problems.ts`。seed は `just db-seed`
- 仕様: `docs/specs/mvp.md`

キー入力はプレイ中に送らない。終了時に `POST /api/results` だけ。匿名 ID は localStorage。

## コミット

`[type]: [日本語説明] [gitmoji]`
