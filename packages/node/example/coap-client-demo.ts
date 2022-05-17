import {CoapNode} from '../src/CoapNode'
import SmartObject from 'smartobject'

const so = new SmartObject()

so.init(3303, 0, {
  sensorValue: 21,
  units: 'C',
  5702: {
    read: function (cb) {
      cb(null, new Date().toString())
    },
  },
  5703: {
    write: function (val, cb) {
      console.log('write ' + val)
      cb(null, val)
    },
  },
  5704: {
    exec: function (val1, val2, cb) {
      console.log(val1 + ': Hello ' + val2 + '!')
      cb(null, 444444)
    },
  },
})

so.init(3303, 1, {
  5700: 70,
  5701: 'F',
})

so.init(3312, 0, {
  5850: false,
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

  so.set(3303, 0, 5700, Math.random() * 100)

  setTimeout(() => {
    so.set(3303, 0, 5700, Math.random() * 100)
  }, 5000)
})

coapNode.register(
  '221.229.214.202', 5683,
  {
    defaultMaxPeriod: 3,
  },
  (err, rsp) => {
    console.log('register', rsp)
  },
)

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
