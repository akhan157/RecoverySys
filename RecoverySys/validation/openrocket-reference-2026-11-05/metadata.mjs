import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const dir=path.dirname(fileURLToPath(import.meta.url))
const [out,jar,motor]=process.argv.slice(2)
const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim()
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const {spawnSync}=await import('node:child_process')
const runtime=spawnSync(process.env.JAVA_BIN||'java',['-version'],{encoding:'utf8'})
if(runtime.status!==0) throw new Error('Cannot identify Java runtime')
const metadata={
  timestamp:new Date().toISOString(),git_commit:git('rev-parse','HEAD'),
  git_status:git('status','--porcelain')?'dirty':'clean',
  runtime_identity:{node:process.version,java:runtime.stdout+runtime.stderr,platform:process.platform,arch:process.arch},
  provenance_limits:{jar:'Observed local hash; official release API has no digest',runtime:'Installed runtime identity observed; download archive checksum not independently captured',motor:'Record header states copyright Tripoli Motor Testing 1999, provided by ThrustCurve.org; redistribution license not established'},
  input_hashes:{jar:hash(jar),motor:hash(motor),...Object.fromEntries(fs.readdirSync(dir).filter(x=>/\.(mjs|java|json|sh)$/.test(x)).map(x=>[x,hash(path.join(dir,x))]))},
  invocation:'JAVA_HOME=<Java17 installation> ./RecoverySys/validation/openrocket-reference-2026-11-05/test-runner.sh',
}
fs.writeFileSync(path.join(out,'reproduction-manifest.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'})
