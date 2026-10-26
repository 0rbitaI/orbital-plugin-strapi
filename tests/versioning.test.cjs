const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const path = require('node:path');

test('post-commit updates versions and changelog without adding commits or pushing', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'orbital-version-test-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim();
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Version Test');
    git('config', 'user.email', 'version-test@example.invalid');
    mkdirSync(path.join(root, '.claude'));
    mkdirSync(path.join(root, '.githooks'));
    copyFileSync(path.join(__dirname, '../.claude/git-hook-version.js'), path.join(root, '.claude/git-hook-version.js'));
    copyFileSync(path.join(__dirname, '../.githooks/post-commit'), path.join(root, '.githooks/post-commit'));
    chmodSync(path.join(root, '.githooks/post-commit'), 0o755);
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'version-test', version: '1.0.0' }) + '\n');
    writeFileSync(path.join(root, 'CHANGELOG.md'), '# Changelog\n\n## [1.0.0] — 2026-10-26\n');
    git('config', 'core.hooksPath', '.githooks');
    const changes = [['feat: add widget', '1.1.0', 'Added'], ['fix: handle failure', '1.1.1', 'Fixed'], ['feat!: change contract', '2.0.0', 'Added']];
    changes.forEach(([subject, version, category], index) => {
      writeFileSync(path.join(root, 'example.txt'), subject);
      git('add', '.');
      git('commit', '-m', subject);
      assert.equal(JSON.parse(readFileSync(path.join(root, 'package.json'))).version, version);
      assert.ok(readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').includes(`## [${version}]`));
      assert.ok(readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').includes(`### ${category}`));
      assert.equal(git('rev-list', '--count', 'HEAD'), String(index + 1));
      assert.equal(git('status', '--porcelain'), '');
    });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
