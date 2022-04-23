import {CoapShepherd, CoapNode} from '../src'
import * as fs from 'fs'
import * as path from 'path'

try {
  fs.unlinkSync(path.resolve('../dist/database/coap.db'))
} catch (e) {
  console.log(e)
}

const shepherd = new CoapShepherd({
  port: 59999,
  autoReadResources: false,
  alwaysFireDevIncoming: true,
})

shepherd.on('ready', () => {
  console.log('>> coap-shepherd server start!')
  shepherd.permitJoin(180)
  shepherd.alwaysPermitJoin(true)
})

shepherd.on('device::status', (cnode: CoapNode, status) => {
  console.log('status', cnode.clientName, status)
})

shepherd.on('device::leaving', (clientName: string, mac: string) => {
  console.log('leaving', clientName, mac)
})

shepherd.on('device::incoming', (cnode: CoapNode, data: any) => {
  console.log('incoming', cnode.clientName, JSON.stringify(data))

  setTimeout(() => {
    cnode.observe('/3303/0/5700', (err, rsp) => {
      if (err) console.log('ERROR', err)
      console.log('observe: /3303/0/5700', rsp)
    })
  }, 1000)
})

shepherd.on('device::notify', (cnode: CoapNode, data: any) => {
  console.log('notify', cnode.clientName, JSON.stringify(data))
})

shepherd.on('error', (err) => {
  throw err
})

shepherd.start((err) => {
  if (err) throw err
})
