[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/news-image-20261125)

# news-image-20261125 — The World in One Day

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

## How it works

`main.ts` (Node 22, standard library only) copies the bundled `entry.png` to `/output/entry.png`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Bounty

[news-image-20261125 on make.fun](https://make.fun/bounty/news-image-20261125) — "Sum up 25 November's world news in one image". $100 prize, deadline 27 November 2026 00:00 UTC.
