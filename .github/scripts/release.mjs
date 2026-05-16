import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'))
const labels = new Set((event.pull_request?.labels ?? []).map((label) => label.name))

const bump = labels.has('semver:major')
  ? 'major'
  : labels.has('semver:minor')
    ? 'minor'
    : 'patch'

const latestTag = execFileSync('git', ['tag', '--list', 'v*.*.*', '--sort=-v:refname'], {
  encoding: 'utf8',
}).trim().split('\n').find(Boolean) ?? 'v0.0.0'

const nextVersion = bumpVersion(latestTag.slice(1), bump)

await updatePackageJson('packages/config/package.json', nextVersion)
await updatePackageJson('packages/lib/package.json', nextVersion)

execFileSync('git', ['config', 'user.name', 'github-actions[bot]'])
execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'])
execFileSync('git', ['add', 'packages/config/package.json', 'packages/lib/package.json'])
execFileSync('git', ['commit', '-m', `chore(release): v${nextVersion}`])
execFileSync('git', ['tag', `v${nextVersion}`])
execFileSync('git', ['push', 'origin', 'HEAD:main', '--follow-tags'])

function bumpVersion(version, level) {
  const [major, minor, patch] = version.split('.').map((part) => Number.parseInt(part, 10))

  if (level === 'major') {
    return `${major + 1}.0.0`
  }

  if (level === 'minor') {
    return `${major}.${minor + 1}.0`
  }

  return `${major}.${minor}.${patch + 1}`
}

async function updatePackageJson(filePath, version) {
  const contents = JSON.parse(await readFile(filePath, 'utf8'))
  contents.version = version
  await writeFile(filePath, `${JSON.stringify(contents, null, '\t')}\n`)
}
