'use strict';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (process.env.GIT_VERSIONING_HOOK === 'true') process.exit(0);
const pkg = JSON.parse(git('show', 'HEAD:package.json'));
const subject = git('log', '-1', '--pretty=%s');
if (/^(Merge|release:|chore\(release\):)/.test(subject)) process.exit(0);
try {
    const parent = JSON.parse(git('show', 'HEAD~1:package.json'));
    if (parent.version !== pkg.version) process.exit(0);
} catch (error) {
    // Initial commits have no parent version to compare.
}
const match = subject.match(/^(\w+)(?:\([^)]+\))?(!)?:\s+(.+)$/);
if (!match) throw new Error('Use a Conventional Commit subject for automatic versioning.');
const oldVersion = pkg.version;
const parts = oldVersion.split('.').map(Number);
if (match[2] || git('log', '-1', '--pretty=%B').includes('BREAKING CHANGE:')) {
    parts[0] += 1; parts[1] = 0; parts[2] = 0;
} else if (match[1] === 'feat') {
    parts[1] += 1; parts[2] = 0;
} else parts[2] += 1;
pkg.version = parts.join('.');
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const category = match[1] === 'feat' ? 'Added' : match[1] === 'fix' ? 'Fixed' : 'Changed';
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const index = changelog.indexOf('\n## [');
if (index < 0) throw new Error('Missing changelog release section.');
const entry = `\n## [${pkg.version}] — ${date}\n### ${category}\n- ${match[3]}\n`;
fs.writeFileSync('CHANGELOG.md', changelog.slice(0, index) + entry + changelog.slice(index));
git('add', 'package.json', 'CHANGELOG.md');
execFileSync('git', ['commit', '--amend', '--no-verify', '--no-edit'], {
    stdio: 'inherit', env: { ...process.env, GIT_VERSIONING_HOOK: 'true' }
});
console.log(`Version synchronized: ${oldVersion} -> ${pkg.version}`);
