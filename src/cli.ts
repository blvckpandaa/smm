import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MarketerAgent, renderPlanMarkdown, type BrandBrief } from "./marketer/agent.js";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function main() {
  const briefPath =
    getArg("--brief") ??
    resolve(dirname(fileURLToPath(import.meta.url)), "../examples/casino-brief.json");

  const raw = readFileSync(briefPath, "utf8");
  const brief = JSON.parse(raw) as BrandBrief;

  const agent = new MarketerAgent(brief);
  const plan = agent.planWeek();
  const md = renderPlanMarkdown(plan);

  const outDir = resolve(process.cwd(), "output");
  mkdirSync(outDir, { recursive: true });
  const jsonOut = resolve(outDir, "content-plan.json");
  const mdOut = resolve(outDir, "content-plan.md");
  writeFileSync(jsonOut, JSON.stringify(plan, null, 2), "utf8");
  writeFileSync(mdOut, md, "utf8");

  console.log(agent.explainStrategy());
  console.log("\n---\n");
  console.log(md);
  console.log(`\nSaved:\n- ${jsonOut}\n- ${mdOut}`);
}

main();
