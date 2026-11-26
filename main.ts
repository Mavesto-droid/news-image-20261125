// news-image-20261125 — "The World in One Day", Wednesday 25 November 2026.
//
// The entry image is the entry.png beside this file: a newspaper-style front
// page summing up 25 November 2026. Lead story: two oil tankers struck naval
// mines and caught fire in the Strait of Hormuz. Also covered: the Houthi
// attack on Saudi Arabia's Ras Tanura refinery, the killing of Hamas security
// chief Mohammad Abuelouf in Gaza, RSF drone strikes killing 19 civilians in
// Sudan, the Australia–Solomon Islands treaty, Pope Leo XIV on the COP31
// failure, Shenzhou-24 docking with Pakistan's first astronaut, and sport
// (Sinner's knee surgery; Lakers beat Jazz).
//
// The program copies that image to /output/entry.png. Node 22, standard
// library only, no network.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

copyFileSync(new URL('./entry.png', import.meta.url), join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png'));
