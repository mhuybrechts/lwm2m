import {CoapNode} from '../src/CoapNode'
import SmartObject from 'smartobject'

const so = new SmartObject()

so.init('19', '0', {
  '0': 0,
})

so.init('19', '1', {
  '0': {
    write(value, cb) {
      console.log('---|||||》write: /19/1/0', value)
      cb(null, 1)
    },
  },
})

const coapNode = new CoapNode('908752526375870', so, {
  lifetime: 300,
})

coapNode.on('registered', () => {
  console.log('registered')
})

coapNode.on('deregistered', () => {
  console.log('deregistered')
})

coapNode.on('offline', () => {
  console.log('offline')
})

coapNode.on('reconnect', () => {
  console.log('reconnect')
})

coapNode.on('error', (err) => {
  console.log(err)
})

coapNode.on('observe', (msg) => {
  console.log('observe', JSON.stringify(msg))
})

coapNode.register('127.0.0.1', 59999, (err, rsp) => {
  console.log('register', rsp)

  setInterval(() => {
    so.write('19', '0', '0', Math.random(), () => {})
  }, 2300)
})

/*  setInterval(function () {
      so.read(3303, 0, 5702, function () {});
  }, 3000);*/

// setTimeout(function () {
//     coapNode.register('127.0.0.1', 5683, function (err, rsp) {
//         console.log(rsp);
//     });
// }, 10000);

// update test
// setTimeout(function () {
//     coapNode.update({ lifetime: 12000 }, function (err, rsp) {
//         console.log(rsp);
//     });
// }, 15000);

/*
// // deregister test
setTimeout(() => {
  coapNode.deregister((err, rsp) => {
    console.log(rsp)
  })

  setTimeout(function () {
    coapNode.register('127.0.0.1', 59999, (err, rsp) => {
      console.log(rsp)
    })
  }, 5000)
}, 12000)
*/

// setTimeout(function () {
//     coapNode.checkout(10, function (err, rsp) {
//         console.log(rsp);
//     });
// }, 5000);

// setTimeout(function () {
//     coapNode.checkin(function (err, rsp) {
//         console.log(rsp);
//     });
// }, 15000);
