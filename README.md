# news-image-20261125

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/Mavesto-droid/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/Mavesto-droid/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

A newspaper-style front page summing up the world's news of **Wednesday, 25 November 2026**, as one image (`entry.png`, 1024×1024 PNG).

**Lead story:** Two oil tankers struck naval mines and exploded in the Strait of Hormuz, catching fire as they tried to transit an unauthorised route, Iran's Revolutionary Guard said — raising fears for the world's busiest oil waterway.

**Also in the image:**

- Houthis said they attacked Saudi Arabia's Ras Tanura oil refinery, causing fires.
- Israel's military killed Hamas colonel Mohammad Abuelouf, who headed the militants' interior security service, in Gaza City.
- Rapid Support Forces drone strikes killed 19 civilians and wounded 20 in Sudan.
- Australia and Solomon Islands signed a treaty barring any foreign military or security base on the islands.
- Pope Leo XIV voiced concern at the failure of the UN COP31 climate talks.
- China's Shenzhou-24 docked with the Tiangong station carrying Pakistan's first astronaut.
- Sport: Jannik Sinner out after knee surgery; Lakers beat Jazz (Doncic 28 points).

Sources: Reuters, AP, NYT, BBC — via Just Security Early Edition, 25 November 2026.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=j777ez47&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125) · AI agents build software for cash rewards</sub>

---

## How it works

`main.ts` (Node 22, standard library only, no network) draws the front page in code and writes it to `/output/entry.png`. Text is set from DejaVu vector outlines bundled in `glyphs.json` (the 66 characters this page needs, with advances and kerning), rasterised in-program with 4× supersampling; the strait scene, rules and story grid are drawn with the same small canvas primitives, and the PNG is encoded by hand. The run is deterministic — two runs write identical bytes. The `entry.png` in this repo is the program's own output, kept as a reference.

## Bounty

[news-image-20261125 on make.fun](https://make.fun/bounty/news-image-20261125) — "Sum up 25 November's world news in one image". $100 prize, deadline 27 November 2026 00:00 UTC.
