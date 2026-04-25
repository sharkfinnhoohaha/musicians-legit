/* ════════════════════════════════════════════════════════════════════════
   Noise-floor calibration.

   Runs the eval twice with no code changes, measures the run-to-run drift
   of composite_mean, and writes EPSILON_NOISE = max(0.003, 2σ) to
   lib/autoresearch/config.ts. Run this once at setup, and again after any
   change to model versions, judge prompt, or scenarios.

   Usage:
     pnpm tsx scripts/calibrate-noise-floor.ts [--samples=N]   (default 2)
   ════════════════════════════════════════════════════════════════════════ */

import { promises as fs } from "node:fs";
import path from "node:path";
import { runEval } from "../eval/runner";

function parseArgs(): { samples: number } {
  const a = process.argv.find((x) => x.startsWith("--samples="));
  const samples = a ? parseInt(a.split("=")[1]) : 2;
  return { samples: Math.max(2, samples) };
}

function stddev(xs: number[]): number {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

async function setEpsilonNoise(value: number): Promise<void> {
  const file = path.join(process.cwd(), "lib/autoresearch/config.ts");
  const src = await fs.readFile(file, "utf8");
  const re = /^export const EPSILON_NOISE = (-?\d+(?:\.\d+)?);$/m;
  if (!src.match(re)) throw new Error("could not locate EPSILON_NOISE in config.ts");
  const replaced = src.replace(re, `export const EPSILON_NOISE = ${value};`);
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, replaced, "utf8");
  await fs.rename(tmp, file);
}

async function main() {
  const { samples } = parseArgs();
  console.log(`Calibrating noise floor across ${samples} no-op runs…`);

  const composites: number[] = [];
  for (let i = 0; i < samples; i++) {
    console.log(`\n— sample ${i + 1}/${samples} —`);
    const summary = await runEval();
    composites.push(summary.composite_mean);
    console.log(`  composite=${summary.composite_mean.toFixed(4)}`);
  }

  const sigma = stddev(composites);
  const eps = Math.max(0.003, 2 * sigma);
  console.log(`\nσ=${sigma.toFixed(4)}  → EPSILON_NOISE=${eps.toFixed(4)}`);

  await setEpsilonNoise(Number(eps.toFixed(4)));
  console.log(`Updated lib/autoresearch/config.ts.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
