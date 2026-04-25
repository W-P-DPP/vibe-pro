const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

function parseArgs(argv) {
  const [, , command = 'all', ...rest] = argv
  const options = {}

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token.startsWith('--')) continue

    const eqIndex = token.indexOf('=')
    if (eqIndex >= 0) {
      options[token.slice(2, eqIndex)] = token.slice(eqIndex + 1)
      continue
    }

    const key = token.slice(2)
    const next = rest[index + 1]
    if (!next || next.startsWith('--')) {
      options[key] = 'true'
      continue
    }

    options[key] = next
    index += 1
  }

  return { command, options }
}

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

function normalizeSlashPath(value) {
  if (!value) return ''
  return value.replace(/^\/+|\/+$/g, '')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function walkForPackages(repoDir) {
  const packageDirs = []
  const skipNames = new Set(['.git', '.turbo', '.claude', '.codex', 'node_modules', 'dist', 'coverage'])

  function visit(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    const hasPackageJson = entries.some((entry) => entry.isFile() && entry.name === 'package.json')

    if (hasPackageJson && currentDir !== repoDir) {
      packageDirs.push(currentDir)
      return
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (skipNames.has(entry.name)) continue
      visit(path.join(currentDir, entry.name))
    }
  }

  visit(repoDir)
  return packageDirs.sort((left, right) => left.localeCompare(right))
}

function loadWorkspacePackages(repoDir) {
  return walkForPackages(repoDir).map((packageDir) => {
    const packageJsonPath = path.join(packageDir, 'package.json')
    const packageJson = readJson(packageJsonPath)
    const relativeDir = path.relative(repoDir, packageDir)
    const deployConfig = packageJson.superPro?.deploy || {}
    const scripts = packageJson.scripts || {}

    return {
      dir: packageDir,
      dirName: path.basename(packageDir),
      relativeDir,
      packageJson,
      packageJsonPath,
      scripts,
      deployConfig,
    }
  })
}

function isServerPackage(pkg) {
  if (pkg.deployConfig.enabled === false) return false
  if (pkg.deployConfig.type === 'server') return true
  const startScript = pkg.scripts.start || ''
  return /(?:^|\s)node(?:\.exe)?\s+.*dist[\\/].*main\.(?:cjs|mjs|js)\b/i.test(startScript)
}

function isFrontendPackage(pkg) {
  if (pkg.deployConfig.enabled === false) return false
  if (pkg.deployConfig.type === 'frontend') return true
  if (!pkg.scripts.build) return false
  if (pkg.relativeDir.startsWith(`packages${path.sep}`)) return false
  return !isServerPackage(pkg)
}

function loadDeploymentPlan(repoDir) {
  const packages = loadWorkspacePackages(repoDir)
  const frontends = packages.filter(isFrontendPackage)
  const servers = packages.filter(isServerPackage)

  return {
    packages,
    frontends,
    servers,
  }
}

function parseFrontendSubdirFromDist(pkg) {
  const indexHtmlPath = path.join(pkg.dir, 'dist', 'index.html')
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`dist/index.html not found for ${pkg.packageJson.name}`)
  }

  const html = fs.readFileSync(indexHtmlPath, 'utf8')
  const assetMatches = [...html.matchAll(/(?:src|href)=["']\/([^"']+\/assets\/[^"']+)["']/g)]
  for (const match of assetMatches) {
    const normalized = normalizeSlashPath(match[1])
    const assetIndex = normalized.indexOf('/assets/')
    if (assetIndex >= 0) {
      return normalizeSlashPath(normalized.slice(0, assetIndex))
    }
    if (normalized.startsWith('assets/')) {
      return ''
    }
  }

  const absoluteMatches = [...html.matchAll(/(?:src|href)=["']\/([^"']+)["']/g)]
  for (const match of absoluteMatches) {
    const normalized = normalizeSlashPath(match[1])
    if (!normalized) return ''
    const segments = normalized.split('/')
    if (segments[0] === 'assets') return ''
    return normalizeSlashPath(segments[0])
  }

  return normalizeSlashPath(pkg.deployConfig.nginxSubdir || pkg.dirName)
}

function getFrontendTargetSubdir(pkg) {
  const configured = normalizeSlashPath(pkg.deployConfig.nginxSubdir)
  if (configured || pkg.deployConfig.nginxSubdir === '') {
    return configured
  }
  return parseFrontendSubdirFromDist(pkg)
}

function buildPm2Apps(repoDir) {
  return loadDeploymentPlan(repoDir).servers.map((pkg) => ({
    name: pkg.deployConfig.pm2Name || `super-pro-${pkg.dirName}`,
    cwd: `./${toPosixPath(pkg.relativeDir)}`,
    script: pkg.deployConfig.script || './dist/main.cjs',
    interpreter: pkg.deployConfig.interpreter || 'node',
    instances: Number.isInteger(pkg.deployConfig.instances) ? pkg.deployConfig.instances : 1,
    exec_mode: pkg.deployConfig.execMode || 'fork',
    autorestart: pkg.deployConfig.autorestart ?? true,
    watch: pkg.deployConfig.watch ?? false,
    kill_timeout: Number.isInteger(pkg.deployConfig.killTimeoutMs) ? pkg.deployConfig.killTimeoutMs : 20000,
    max_restarts: Number.isInteger(pkg.deployConfig.maxRestarts) ? pkg.deployConfig.maxRestarts : 10,
    env: {
      NODE_ENV: 'production',
      ...(pkg.deployConfig.env || {}),
    },
  }))
}

function parseEnvFile(envFilePath) {
  if (!fs.existsSync(envFilePath)) {
    return {}
  }

  const result = {}
  const lines = fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

function getCleanupMetadata(repoDir) {
  const apps = buildPm2Apps(repoDir)
  const uniquePorts = new Set()

  for (const app of apps) {
    const appDir = path.resolve(repoDir, app.cwd.replace(/^[.][/\\]/, ''))
    const envFilePath = path.join(appDir, '.env.production')
    const envValues = parseEnvFile(envFilePath)
    const port = Number(envValues.PORT)
    if (Number.isFinite(port) && port > 0) {
      uniquePorts.add(String(port))
    }
  }

  return {
    pm2Apps: apps.map((app) => app.name),
    backendPorts: [...uniquePorts].sort((left, right) => Number(left) - Number(right)),
  }
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function quoteCmdArg(value) {
  if (value === '') return '""'
  if (!/[\s"&^<>|()]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

function runCommand(command, args, options = {}) {
  const baseOptions = {
    stdio: 'inherit',
    cwd: options.cwd,
    env: options.env || process.env,
  }

  const isCmdWrapper = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)
  const result = isCmdWrapper
    ? spawnSync(
        `"${command}" ${args.map(quoteCmdArg).join(' ')}`,
        [],
        {
          ...baseOptions,
          shell: process.env.ComSpec || true,
        },
      )
    : spawnSync(command, args, baseOptions)

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}`)
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function syncDirectory(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`)
  }

  fs.rmSync(targetDir, { recursive: true, force: true })
  ensureDirectory(path.dirname(targetDir))
  fs.cpSync(sourceDir, targetDir, { recursive: true })
}

function installDependencies(repoDir, pnpmCmd) {
  console.log('[STEP 1/6] Install workspace dependencies')
  runCommand(pnpmCmd, ['--dir', repoDir, 'install', '--frozen-lockfile', '--prod=false'])
  console.log()
}

function buildFrontends(repoDir, pnpmCmd, frontends) {
  console.log('[STEP 2/6] Build frontend apps')
  for (const pkg of frontends) {
    console.log(`  [BUILD] ${pkg.packageJson.name}`)
    runCommand(pnpmCmd, ['--dir', repoDir, '--filter', pkg.packageJson.name, 'build'])
  }
  console.log()
}

function syncFrontends(deployRoot, frontends) {
  console.log('[STEP 3/6] Sync frontend bundles to nginx html')
  for (const pkg of frontends) {
    const targetSubdir = getFrontendTargetSubdir(pkg)
    const sourceDir = path.join(pkg.dir, 'dist')
    const targetDir = targetSubdir ? path.join(deployRoot, targetSubdir) : deployRoot
    console.log(`  [SYNC ] ${pkg.relativeDir}\\dist -> ${targetSubdir || '.'}`)
    syncDirectory(sourceDir, targetDir)
  }
  console.log()
}

function buildServers(repoDir, pnpmCmd, servers) {
  console.log('[STEP 4/6] Build backend services')
  for (const pkg of servers) {
    console.log(`  [BUILD] ${pkg.packageJson.name}`)
    runCommand(pnpmCmd, ['--dir', repoDir, '--filter', pkg.packageJson.name, 'build'])
  }
  console.log()
}

function reloadPm2(repoDir, pm2Cmd, apps) {
  console.log('[STEP 5/6] Reload backend services with PM2')
  const ecosystemPath = path.join(repoDir, 'ecosystem.config.cjs')
  runCommand(pm2Cmd, ['startOrReload', ecosystemPath, '--update-env'], { cwd: repoDir })
  runCommand(pm2Cmd, ['save'], { cwd: repoDir })

  console.log('[OK] PM2 services reloaded.')
  console.log()
}

function restartNginx(nginxExe, nginxDir, nginxConf) {
  console.log('[STEP 6/6] Restart nginx')
  spawnSync('taskkill', ['/F', '/IM', 'nginx.exe'], { stdio: 'ignore' })
  sleep(2000)

  runCommand(nginxExe, ['-t', '-p', nginxDir, '-c', nginxConf])

  const child = spawn(nginxExe, ['-p', nginxDir, '-c', nginxConf], {
    cwd: nginxDir,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  console.log('[OK] nginx restarted successfully.')
  console.log()
}

function printPlan(plan) {
  console.log('[INFO] Frontend apps  :', plan.frontends.map((pkg) => pkg.packageJson.name).join(', ') || '(none)')
  console.log('[INFO] Backend apps   :', plan.servers.map((pkg) => pkg.packageJson.name).join(', ') || '(none)')
  console.log()
}

function runFrontendMode(repoDir, deployRoot, pnpmCmd) {
  const plan = loadDeploymentPlan(repoDir)
  printPlan(plan)
  ensureDirectory(deployRoot)

  console.log('[STEP 1/2] Install workspace dependencies')
  runCommand(pnpmCmd, ['--dir', repoDir, 'install', '--frozen-lockfile', '--prod=false'])
  console.log()

  console.log('[STEP 2/2] Build and sync frontend apps')
  for (const pkg of plan.frontends) {
    console.log(`  [BUILD] ${pkg.packageJson.name}`)
    runCommand(pnpmCmd, ['--dir', repoDir, '--filter', pkg.packageJson.name, 'build'])
    const targetSubdir = getFrontendTargetSubdir(pkg)
    const sourceDir = path.join(pkg.dir, 'dist')
    const targetDir = targetSubdir ? path.join(deployRoot, targetSubdir) : deployRoot
    console.log(`  [SYNC ] ${pkg.relativeDir}\\dist -> ${targetSubdir || '.'}`)
    syncDirectory(sourceDir, targetDir)
  }
  console.log()
  console.log('[OK] All frontend bundles were deployed to nginx successfully.')
}

function runAllMode(repoDir, deployRoot, pnpmCmd, pm2Cmd, nginxExe, nginxDir, nginxConf) {
  const plan = loadDeploymentPlan(repoDir)
  printPlan(plan)
  ensureDirectory(deployRoot)
  installDependencies(repoDir, pnpmCmd)
  buildFrontends(repoDir, pnpmCmd, plan.frontends)
  syncFrontends(deployRoot, plan.frontends)
  buildServers(repoDir, pnpmCmd, plan.servers)
  reloadPm2(repoDir, pm2Cmd, buildPm2Apps(repoDir))
  restartNginx(nginxExe, nginxDir, nginxConf)
  console.log('[OK] Jenkins build and deploy completed successfully.')
}

function main() {
  const { command, options } = parseArgs(process.argv)
  const repoDir = path.resolve(options['repo-dir'] || process.cwd())
  const pnpmCmd = options.pnpm

  if (!pnpmCmd) {
    throw new Error('Missing required option: --pnpm')
  }

  if (command === 'frontends') {
    const deployRoot = path.resolve(options['deploy-root'] || path.join(repoDir, 'dist'))
    runFrontendMode(repoDir, deployRoot, pnpmCmd)
    return
  }

  if (command === 'plan') {
    const plan = loadDeploymentPlan(repoDir)
    console.log(JSON.stringify({
      frontends: plan.frontends.map((pkg) => ({
        name: pkg.packageJson.name,
        dir: pkg.relativeDir,
      })),
      servers: buildPm2Apps(repoDir),
    }, null, 2))
    return
  }

  if (command === 'cleanup-vars') {
    const cleanupMetadata = getCleanupMetadata(repoDir)
    console.log(`BACKEND_PORTS=${cleanupMetadata.backendPorts.join(' ')}`)
    console.log(`PM2_APPS=${cleanupMetadata.pm2Apps.join(' ')}`)
    return
  }

  if (command !== 'all') {
    throw new Error(`Unsupported command: ${command}`)
  }

  const deployRoot = path.resolve(options['deploy-root'] || path.join(repoDir, 'dist'))
  const pm2Cmd = options.pm2
  const nginxExe = options['nginx-exe']
  const nginxDir = options['nginx-dir']
  const nginxConf = options['nginx-conf']

  if (!pm2Cmd || !nginxExe || !nginxDir || !nginxConf) {
    throw new Error('Missing required options for all mode: --pm2 --nginx-exe --nginx-dir --nginx-conf')
  }

  runAllMode(repoDir, deployRoot, pnpmCmd, pm2Cmd, nginxExe, nginxDir, nginxConf)
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error('[ERROR]', error.message)
    process.exit(1)
  }
}

module.exports = {
  buildPm2Apps,
  getFrontendTargetSubdir,
  loadDeploymentPlan,
}
