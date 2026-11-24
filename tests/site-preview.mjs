import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const prefix = '/herbal-planting-demo'
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml' }

createServer(async (request, response) => {
  try {
    let path = new URL(request.url, 'http://localhost').pathname
    if (path === prefix) {
      response.writeHead(308, { Location: prefix + '/' })
      response.end()
      return
    }
    if (path.startsWith(prefix + '/')) path = path.slice(prefix.length)
    const absolute = resolve(root, '.' + decodeURIComponent(path.endsWith('/') ? path + 'index.html' : path))
    if (!absolute.startsWith(resolve(root) + sep) || !(await stat(absolute)).isFile()) {
      response.writeHead(404).end()
      return
    }
    response.setHeader('Content-Type',mime[extname(absolute)] ?? 'application/octet-stream')
    createReadStream(absolute).on('error',()=>response.destroy()).pipe(response)
  } catch { response.writeHead(404).end() }
}).listen(4180, '127.0.0.1')
