import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
const { scanZstdFrames, decompressZstdFrame } = await import('./packages/session/session-persistence-jsonl/src/zstd.ts')
const root = '/Users/mac/.dsh/sessions'
for (const proj of readdirSync(root).sort()) {
  const projPath = join(root, proj)
  if (!readdirSync(projPath,{withFileTypes:true}).some(d=>d.isDirectory())) continue
  for (const sid of readdirSync(projPath)) {
    const p = join(projPath, sid, 'session.jsonl.zstd')
    let buf
    try { buf = readFileSync(p) } catch { continue }
    const { frames } = scanZstdFrames(buf, 1)
    if (!frames.length) continue
    const header = (await decompressZstdFrame(buf.subarray(frames[0].start, frames[0].end))).toString('utf8').trim()
    let h; try { h = JSON.parse(header) } catch { continue }
    console.log(`dir=${proj}  cwd=${h.cwd ?? '(none)'}  id=${sid}`)
  }
}
