import fs from "fs";
import path from "path";
import type { Variant } from "./i18n";

const STATE_PATH = path.join(process.cwd(), "data/ab-state.json");
const VARIANTS: Variant[] = ["a", "b", "c"];

interface AbState {
  counter: number;
}

function readState(): AbState {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) as AbState;
  } catch {
    return { counter: 0 };
  }
}

function writeState(s: AbState): void {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(s));
}

/** Get next variant in round-robin and increment counter */
export function nextVariant(): Variant {
  const state = readState();
  const v = VARIANTS[state.counter % VARIANTS.length]!;
  writeState({ counter: state.counter + 1 });
  return v;
}

export function isValidVariant(v: string): v is Variant {
  return VARIANTS.includes(v as Variant);
}
