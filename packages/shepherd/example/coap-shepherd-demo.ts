import {CoapShepherd} from '../src'
import fs from 'fs'
import path from 'path'

try {
  fs.unlinkSync(path.resolve('../dist/database/coap.db'))
} catch (e) {
  console.log(e)
}

const shepherd = new CoapShepherd({
  port: 59999,
  autoReadResources: false,
  alwaysFireDevIncoming: true,
  dontReinitiateObserve: true,
  disableFiltering: true,
})

shepherd.on('ready', () => {
  console.log('>> coap-shepherd server start!')
  shepherd.alwaysPermitJoin(true)
})

shepherd.on('device::status', (cnode, status) => {
  console.log('status', cnode.clientName, status)
})

shepherd.on('device::leaving', (clientName: string, mac: string) => {
  console.log('leaving', clientName, mac)
})

shepherd.on('device::incoming', (cnode, data: any) => {
  console.log('incoming', cnode.clientName, JSON.stringify(data))

  cnode.observe('/19/0/0', (err, rsp) => {
    if (err) console.log('ERROR', err)
    console.log('observe: /19/0/0', JSON.stringify(rsp))
  })

  setInterval(() => {
    if (cnode.status === 'online')
      cnode.write('/19/1/0', `DEMO::1233556778::` + Math.random(), true, (err) => {
        if (err) console.log('ERROR', err)
        console.log('write: /19/1/0', 'DEMO::1233556778::???')
      })
  }, 2000)

  /*  setTimeout(() => {
    cnode.write('/1/0/1', 400, (err) => {
      if (err) console.log('ERROR', err)
      console.log('write: /1/0/1')
    })

  }, 3000)*/

  /*  setTimeout(function () {
    cnode.discover('/3303/0/5700', (data) => {
      console.log('discover', data)
    })
  }, 5000)*/
  // setTimeout(function () { cnode.discoverReq('/3303/0/5701', reqHandler); }, 10000);
  // setTimeout(function () { cnode.discoverReq('/3303/0/5702', reqHandler); }, 15000);
  // setTimeout(function () { cnode.discoverReq('/3303/0/5703', reqHandler); }, 20000);
  // setTimeout(function () { cnode.discoverReq('/3303/0/5704', reqHandler); }, 25000);
  // setTimeout(function () { cnode.discoverReq('/3303/0', reqHandler); }, 30000);
  // setTimeout(function () { cnode.discoverReq('/3303', reqHandler); }, 35000);

  /*  setTimeout(() => {
    cnode.write('/3303/0/5703', 'Hum', (err, data) => {
      console.log('writeReq: /3303/0/5703', err, data)
    })
  }, 5000)*/
  // setTimeout(function () { cnode.writeReq('/3303/0/5704', 'Hum', reqHandler); }, 23000);
  // setTimeout(function () { cnode.writeReq('/3303/0', { 5700: 87, 5701: 'F' }, reqHandler); }, 28000);

  // writeAttr test
  // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5700', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 3000);
  // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5701', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 8000);
  // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5702', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 13000);
  // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5703', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 18000);
  // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5704', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 23000);
  // setTimeout(function () { cnode.writeAttrsReq('/3303/0', { 'pmin': 10, 'pmax': 30 }, reqHandler); }, 28000);
  // setTimeout(function () { cnode.writeAttrsReq('/3303', { 'pmin': 10, 'pmax': 30 }, reqHandler); }, 33000);

  // exec test
  // setTimeout(function () { cnode.executeReq('/3303/0/5700', ['Peter', 'world'], reqHandler); }, 5000);
  // setTimeout(function () { cnode.executeReq('/3303/0/5701', ['Peter', 'world'], reqHandler); }, 10000);
  // setTimeout(function () { cnode.executeReq('/3303/0/5702', ['Peter', 'world'], reqHandler); }, 15000);
  // setTimeout(function () { cnode.executeReq('/3303/0/5703', ['Peter', 'world'], reqHandler); }, 20000);
  /*  setTimeout(() => {
    cnode.execute('/3303/0/5704', ['Peter', 'world'], (err, data) => {
      console.log('execute: /3303/0/5704', err, data)
    })
  }, 5000)*/

  // observe test
  // setTimeout(function () { cnode.observeReq('/3303/0/5700', reqHandler); }, 5000);
  // setTimeout(function () { cnode.observeReq('/3303/0/5701', reqHandler); }, 10000);
  // setTimeout(function () { cnode.observeReq('/3303/0/5702', reqHandler); }, 15000);
  // setTimeout(function () { cnode.observeReq('/3303/0/5703', reqHandler); }, 20000);
  // setTimeout(function () { cnode.observeReq('/3303/0/5704', reqHandler); }, 25000);
  // setTimeout(function () { cnode.observeReq('/3303/0', reqHandler); }, 30000);

  // cancelObserve test
  // setTimeout(function () { cnode.cancelObserveReq('/3303/0/5702', reqHandler); }, 10000);

  // ping test
  // setTimeout(function () { cnode.pingReq(reqHandler); }, 3000);

  // remove test
  //        setTimeout(function () { shepherd.remove('nodeTest'); }, 10000);
})

shepherd.on('device::notify', (cnode, data: any) => {
  console.log('notify', cnode.clientName, JSON.stringify(data))
})

shepherd.on('error', (err) => {
  throw err
})

shepherd.start((err) => {
  if (err) throw err
})

// // stop test
// setTimeout(function () {
//     shepherd.stop(function (err, rsp) {
//         if (err) throw err;
//     });
// }, 5000);

// // reset test
// setTimeout(function () {
//     shepherd.reset(function (err) {
//         if (err) throw err;
//     });
// }, 10000);

// // announce test
// setTimeout(function () {
//     shepherd.announce('Awesome!', function (err, rsp) {
//         if (err) throw err;
//     });
// }, 15000);
