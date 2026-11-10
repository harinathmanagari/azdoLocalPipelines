// In-house pipeline task. It talks to the agent the way every Node task does:
// inputs arrive as INPUT_<NAME> environment variables and results go back as
// ##vso logging commands on standard output. No dependencies, so it needs no install.
const fs = require('node:fs');
const path = require('node:path');

function input(name, required) {
  const value = (process.env[`INPUT_${name.toUpperCase()}`] ?? '').trim();
  if (required && !value) {
    console.log(`##vso[task.logissue type=error]Input required: ${name}`);
    console.log('##vso[task.complete result=Failed]Missing input');
    process.exit(0);
  }
  return value;
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

const sources = process.env.BUILD_SOURCESDIRECTORY || process.cwd();
const directory = path.resolve(sources, input('directory', true));
const budgetKb = Number(input('budgetKb') || '500');
const warnAtPercent = Number(input('warnAtPercent') || '80');

if (!fs.existsSync(directory)) {
  console.log(`##vso[task.logissue type=error]Directory not found: ${directory}`);
  console.log('##vso[task.complete result=Failed]Nothing to measure');
  process.exit(0);
}

const files = listFiles(directory)
  .map((file) => ({ file: path.relative(directory, file).split(path.sep).join('/'), bytes: fs.statSync(file).size }))
  .sort((a, b) => b.bytes - a.bytes);
const totalKb = files.reduce((sum, f) => sum + f.bytes, 0) / 1024;

console.log(`##[group]Files in ${directory}`);
for (const f of files) console.log(`${String(f.bytes).padStart(9)}  ${f.file}`);
console.log('##[endgroup]');
console.log(`Total: ${totalKb.toFixed(1)} KB of a ${budgetKb} KB budget`);
console.log(`##vso[task.setvariable variable=bundleKb;isOutput=true]${totalKb.toFixed(1)}`);

if (totalKb > budgetKb) {
  console.log(`##vso[task.logissue type=error]Bundle is ${totalKb.toFixed(1)} KB, over the ${budgetKb} KB budget`);
  console.log('##vso[task.complete result=Failed]Over budget');
} else if (totalKb > (budgetKb * warnAtPercent) / 100) {
  console.log(`##vso[task.logissue type=warning]Bundle is at ${Math.round((totalKb / budgetKb) * 100)}% of its budget`);
  console.log('##vso[task.complete result=SucceededWithIssues]Close to budget');
} else {
  console.log('##vso[task.complete result=Succeeded]Within budget');
}
