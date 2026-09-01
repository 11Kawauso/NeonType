set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

export PATH := env("HOME") + "/.local/share/vite-plus/bin:" + env("PATH")

# 開発サーバ（Vite+ + Cloudflare Worker ローカル）
dev:
    vp dev

# lint + typecheck + test + build
check:
    vp check
    vp test
    vp build

# 本番デプロイ（要 wrangler login）
deploy:
    vp build
    vp exec wrangler deploy

# ローカル D1 に migration を適用
db-migrate:
    vp exec wrangler d1 migrations apply neontype --local --yes

# 本番 D1 に migration を適用
db-migrate-prod:
    vp exec wrangler d1 migrations apply neontype --remote --yes

# 問題データを SQL 化してローカル D1 へ投入
db-seed:
    vp node scripts/generate-seed.ts
    vp exec wrangler d1 execute neontype --local --file=./seeds/seed.sql --yes

# 問題データを本番 D1 へ投入
db-seed-prod:
    vp node scripts/generate-seed.ts
    vp exec wrangler d1 execute neontype --remote --file=./seeds/seed.sql --yes

# ローカル D1 を作り直して seed し直す
db-reset:
    rm -rf .wrangler
    just db-migrate
    just db-seed
