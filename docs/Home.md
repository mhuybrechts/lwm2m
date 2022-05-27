<a name="Overview"></a>
<br />
********************************************

## 1. Overview

[**OMA Lightweight
M2M**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) (
LWM2M) is a resource constrained device management protocol relies on [**CoAP**](https://tools.ietf.org/html/rfc7252).
And **CoAP** is an application layer protocol that allows devices to communicate with each other RESTfully over the
Internet.

**@hollowy/coap-shepherd**, **@hollowy/coap-node**,**@hollowy/lwm2m** modules aim to provide a simple way to build and
manage a **LWM2M** machine network.

### LWM2M Server: @hollowy/coap-shepherd

* It is a **LWM2M** Server application framework running on node.js.
* It follows most parts of **LWM2M** specification to meet the requirements of a machine network and devices management.
* It works well with [**Leshan**](https://github.com/eclipse/leshan) and [**
  Wakaama**](https://github.com/eclipse/wakaama).
* Supports functionalities, such as permission of device joining, reading resources, writing resources, observing
  resources, and executing a procedure on a remote device.
* It follows [**IPSO**](http://www.ipso-alliance.org/smart-object-guidelines/) data model to let you allocate and query
  resources on remote devices with semantic URIs in a comprehensive manner. Here is an example, all these requests is to
  read a value from the same resource but with different addressing style.

```js
// numeric style
cnode.read('/3303/0/5700', (err, rsp) => {
  console.log(rsp);   // { status: '2.05', data: 21 }
});

// semantic style
cnode.read('/temperature/0/sensedValue', (err, rsp) => {
  console.log(rsp);   // { status: '2.05', data: 21 }
});

// hybrid style
cnode.read('/temperature/0/5700', (err, rsp) => {
  console.log(rsp);   // { status: '2.05', data: 21 }
});
```

**Note**:

* You can find all pre-defined IPSO/OMA-LWM2M identifiers
  from [lwm2m-id](https://github.com/simenkid/lwm2m-id#5-table-of-identifiers) module. You are also welcome to use your
  own private identifiers in **coap-shepherd**.
* Here is the client-side module [**
  @hollowy/coap-node**](https://github.com/nanyuantingfeng/lwm2m/tree/master/packages/node) that can help you with
  implementing a LWM2M client node. *coap-node* uses **IPSO** data model to well organize and define resources on a
  machine node.

<br />

#### Acronyms and Abbreviations

* **Server**: LWM2M Server (server running
  with [@hollowy/coap-shepherd](https://github.com/nanyuantingfeng/lwm2m/tree/master/packages/shepherd))
* **Client** or **Client Device**: LWM2M Client (machine running
  with [@hollowy/coap-node](https://github.com/nanyuantingfeng/lwm2m/tree/master/packages/node))
* **Bootstrap Server**: LWM2M Bootstrap Server (bootstrap server running
  with [lwm2m-bs-server](https://github.com/PeterEB/lwm2m-bs-server))

<a name="Features"></a>
<br />
********************************************

## 2. Features

* Constrained Application Protocol (CoAP)
* Based on [@hollowy/node-coap](https://github.com/mcollina/node-coap), a node.js CoAP client/server library
* CoAP network and devices management
* Hierarchical data model in Smart-Object-style (IPSO)
* Client/server interaction through LWM2M-defined interfaces

<a name="Installation"></a>
<br />
********************************************

## 3. Installation

> $ npm install @hollowy/coap-shepherd

<a name="Usage"></a>
<br />
********************************************

## 4. Usage

This example shows how to start a server and allow devices to join the network within 180 seconds after the server is
ready:

```ts
import { CoapShepherd } from '@hollowy/coap-shepherd'

const shepherd = new CoapShepherd()

shepherd.on('ready', () => {
  console.log('Server is ready.');
  // when server is ready, allow devices to join the network within 180 secs
  shepherd.permitJoin(180);
});

shepherd.start((err) => {  // start the server
  if (err) console.log(err);
});

// That's all to start a LWM2M server.
// Now shepherd is going to automatically tackle most of the network managing things.
```

Or you can pass a config object as an argument to the CoapShepherd constructor and instance the CoapShepherd by
yourself:

```ts
import { CoapShepherd } from '@hollowy/coap-shepherd'
import * as path from 'path'

const shepherd = new CoapShepherd({
  port: 5500,
  connectionType: 'udp6',
  defaultDBPath: path.join(__dirname, `myShepherd.db`)
});
```

<a name="CoapShepherdClass"></a>
<br />
********************************************

## 5. CoapShepherd Class

Exposed by `require('@hollowy/coap-shepherd').CoapShepherd`

* This class brings you a LWM2M Server with network managing facilities. This document uses `shepherd` to denote the
  instance of this class.
* Server default port is `5683`.
* Server configuration is read from file `config.js` in the `dist` folder of this module.

<a name="API_start"></a>
<br />
********************************************

### shepherd.start([callback])

Start the `shepherd`.

**Arguments:**

1. `callback` (_Function_): `function (err) { }`. Get called after starting procedure is done.

**Returns:**

* (none)

**Examples:**

```js
shepherd.start((err) => {
  console.log('server is started.');
});
```

<a name="API_stop"></a>
<br />
********************************************

### shepherd.stop([callback])

Stop the `shepherd`.

**Arguments:**

1. `callback` (_Function_): `function (err) { }`. Get called after stopping procedure is done.

**Returns:**

* (none)

**Examples:**

```js
shepherd.stop((err) => {
  console.log('server stopped.');
});
```

<a name="API_reset"></a>
<br />
********************************************

### shepherd.reset([callback])

Reset the `shepherd`.

**Arguments:**

1. `callback` (_Function_): `function (err) { }`. Get called after the server restarted.

**Returns:**

* (none)

**Examples:**

```js
shepherd.reset((err) => {
  if (!err) console.log('server restarted.');
});
```

<a name="API_permitJoin"></a>
<br />
********************************************

### shepherd.permitJoin(time)

Allow or disallow devices to join the network.

**Arguments:**

1. `time` (_Number_): Time in seconds for shepherd to allow devices to join the network. Set `time` to `0` can
   immediately close the admission.

**Returns:**

* (_Boolea_n): `true` for a success, otherwise `false` if shepherd is not enabled.

**Examples:**

```js
shepherd.permitJoin(180);    // true 
```

<a name="API_list"></a>
<br />
********************************************

### shepherd.list()

List records of the registered Client Devices.

**Arguments:**

1. none

**Returns:**

* (_Array_): Information of Client Devices. Each record in the array is an object with the properties shown in the
  following table.

  |    Property   |  Type   |  Description                                                                |
        |---------------|---------|-----------------------------------------------------------------------------|
  |  clientName   | String  | Client name of the device.                                                  |
  |  clientId     | String  | Client id of the device.                                                    |
  |  lifetime     | Number  | Lifetime of the device.                                                     |
  |  version      | String  | LWM2M version.                                                              |
  |  ip           | String  | Ip address of the device.                                                   |
  |  mac          | String  | Mac adderss of the device.                                                  |
  |  port         | Number  | Port of the device.                                                         |
  |  objList      | Object  | The list of Objects supported and Object Instances available on the device. |
  |  observedList | Object  | The list of observing Object Instance or Resource on the device.            |
  |  status       | String  | `'online'`, `'offline'`, or `'sleep'`                                       |

**Examples:**

```js
console.log(shepherd.list());

/*
[
    { 
        clientName: 'node1',
        clientId: 1,
        lifetime: 86400,
        version: '1.0.0',
        ip: '192.168.1.112',
        mac: '00:0c:29:3c:fc:7d',
        port: 56643,
        objList: {
            '1': ['0'],
            '3303': ['0']
        },
        observedList: [ '/temperature/0/sensorValue' ],
        status: 'online'
    }, { 
        clientName: 'node2',
        clientId: 2,
        lifetime: 86400,
        version: '1.0.0',
        ip: '192.168.1.111',
        mac: '30:1a:9f:5d:af:c8',
        port: 56643,
        objList: {
            '1': ['0'],
            '3303': ['0']
        },
        observedList: [],
        status: 'offline'
    }
] 
*/
```

<a name="API_find"></a>
<br />
********************************************

### shepherd.find(clientName)

Find a registered Client Device (cnode) on shepherd.

**Arguments:**

1. `clientName` (_String_): Name of the Client Device to find for.

**Returns:**

* (Object): cnode. Returns `undefined` if not found.

**Examples:**

```js
var cnode = shepherd.find('foo_name');

if (cnode) {
  // do something upon the cnode, like cnode.readReq()
}
```

<a name="API_remove"></a>
<br />
********************************************

### shepherd.remove(clientName[, callback])

Deregister and remove a cnode from shepherd.

**Arguments:**

1. `clientName` (_String_): Name of the Client Device to be removed.
2. `callback` (_Function_): `function (err, clientName) { }`. Get called after the removal is done. `clientName` is
   client name of the removed cnode.

**Returns:**

* (none)

**Examples:**

```js
shepherd.remove('foo_name', (err, clientName) => {
  if (!err) console.log(clientName);
});
```

<a name="API_announce"></a>
<br />
********************************************

### shepherd.announce(msg[, callback])

The shepherd can use this method to announce(/broadcast) any message to all Client Devices.

**Arguments:**

1. `msg` (_String_): The message to announce.
2. `callback` (_Function_): `function (err) { }`. Get called after message announced.

**Returns:**

* (none)

**Examples:**

```js
shepherd.announce('Hum!');
```

<a name="API_acceptDevIncoming"></a>
<br />
********************************************

### shepherd.acceptDeviceIncoming(predicate)

**coap-shepherd** default accept all registered devices to join the network. If you only want to accept some devices.
You can use this api to set a predicate function to decide whether to register the Client Device to join the network.

**Arguments:**

1. `predicate` (_Function_): `function (devInfo, callback) {}`. Predicate function.
    * `deviceInfo`: An object with Client Device information shown in the following table.

   |    Property   |  Type   |  Description                                                                |
          |---------------|---------|-----------------------------------------------------------------------------|
   |  clientName   | String  | Client name of the device.                                                  |
   |  lifetime     | Number  | Lifetime of the device.                                                     |
   |  version      | String  | LWM2M version.                                                              |
   |  ip           | String  | Ip address of the device.                                                   |
   |  mac          | String  | Mac adderss of the device.                                                  |
   |  port         | Number  | Port of the device.                                                         |
   |  objList      | Object  | The list of Objects supported and Object Instances available on the device. |

    * `callback`: `function (err, accept) {}` It should fill `true` or `false` to `accept` to let cserver know whether
      or not to add the Client Device to the network.

**Returns:**

* (none)

**Examples:**

```js
shepherd.acceptDeviceIncoming((devInfo, callback) => {
  if (devInfo.ip === '192.168.10.21') {
    callback(null, false);   // Not accept dev incoming
  }

  callback(null, true);  // Accept dev incoming
});
```

<a name="EVT_ready"></a>
<br />
********************************************

### Event: 'ready'

`function () { }`  
Fired when shepherd is ready.

<a name="EVT_error"></a>
<br />
********************************************

### Event: 'error'

`function (err) { }`  
Fired when there is an error occurs.

<a name="EVT_permitJoining"></a>
<br />
********************************************

### Event: 'permitJoining'

`function (permitJoinTime) { }`  
Fired when shepherd is allowing for devices to join the network, where `joinTimeLeft` is number of seconds left to allow
devices to join the network. This event will be triggered at each tick of countdown.

<a name="EVT_message"></a>
<br />
********************************************

### Event: 'message'

`function (msg) { }`  
Fired when there is an incoming indication message. There are 5 types of indication including `'device::incoming'`
, `'device::leaving'`, `'device::update'`, `'device::status'`, and `'device::notify'`.

* **device::incoming**  
  Fired when a Client Device registers to shepherd.

    * msg.type: `'device::incoming'`
    * msg.cnode: `cnode`, the cnode instance of which cnode is incoming
    * msg.data: `undefined`
    * message examples

        ```js
         shepherd.on("device::incoming", (cnode, data) => {
            // ...
          })
        ```

* **device::leaving**  
  Fired when a Client Device deregisters from shepherd.

    * msg.type: `'device::leaving'`
    * msg.cnode: `'foo_name'`, the clientName of which cnode is leaving
    * msg.data: `30:1a:9f:5d:af:c8`, the mac address of which cnode is leaving.
    * message examples

        ```js
         shepherd.on("device::leaving", (cnode, mac) => {
            // ...
          })
        ```
* **device::update**  
  Fired when a Client Device updates its device attributes.
    * msg.type: `'device::update'`
    * msg.cnode: `cnode`
    * msg.data: this object at least has a `device` field to denote the name of a Client Device, and it may have fields
      of `lifetime`, `objList`, `ip`, and `port`.
    * message examples

        ```js
          shepherd.on("device::update", (cnode, attrs) => {
            // ...
          })
        ```

* **device::status**  
  Fired when there is a cnode going online, going offline, or going to sleep.

    * msg.type: `'device::status'`
    * msg.cnode: `cnode`
    * msg.data: `'online'`, `'offline'`, or `'sleep'`
    * message examples

        ```js
          shepherd.on("device::status", (cnode, status) => {
            // ...
          })
        ```

* **device::notify**  
  Fired upon receiving an notification of Object Instance or Resource from a Client Device.

    * msg.type: `'device::notify'`
    * msg.cnode: `cnode`
    * msg.data: notification from a Client Device. This object has fields of `device`, `path`, and `value`.
    * message examples

        ```js
        // A Resource notification
          shepherd.on("device::notify", (cnode, data) => {
            // ...
            // data: {
            //    path: '/temperature/0/sensorValue',
            //    value: 21
            // }
          })
        ```

<a name="CoapNodeClass"></a>
<br />
*************************************************

## CoapNode Class

* This class provides you with methods to perform remote operations upon a registered Client Device. This document
  uses `shepherd` to denote the instance of this class.
* You can use `shepherd.find()` with a clientName to find the registered `cnode` on `shepherd`. And you can invoke
  methods on the `cnode` to operate the remote device.

<a name="API_read"></a>
<br />
********************************************

### cnode.read(path[, callback])

Remotely read an Object, an Object Instance, or a Resource from the Client Device.

**Arguments:**

1. `path` (_String_): path of the allocated Object, Object Instance or Resource on the remote Client Device.
2. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the
   operation is successful.

    * `rsp.status` (_String_): [Status code](#StatusCode) of the response. Possible status code is '2.05', '4.04', '
      4.05' and '4.08'.

      | rsp.status | Status | Description |
      |------------|-------------|-----------------|
      | '2.05' | Content | Read operation is completed successfully. |
      | '4.04' | Not Found | Target is not found on the Client. |
      | '4.05' | Not Allowed | Target is not allowed for Read operation. |
      | '4.08' | Timeout | No response from the Client in 60 secs. |

    * `rsp.data` (_Depends_): `data` can be the value of an Object, an Object Instance, or a Resource. Note that when an
      unreadable Resource is read, the status code will be '4.05' and the returned value will be a string '
      \_unreadable\_'.

**Returns:**

* (none)

**Examples:**

```js
// read a Resource
cnode.read('/temperature/0/sensedValue', function(err, rsp) {
  console.log(rsp);   // { status: '2.05', data: 21 }
});

// read an Object Instance
cnode.read('/temperature/0', function(err, rsp) {
  console.log(rsp);

  // {
  //    status: '2.05',
  //    data: { 
  //      sensedValue: 21 
  //    } 
  // }
});

// read an Object
cnode.read('/temperature', function(err, rsp) {
  console.log(rsp);

  // {
  //    status: '2.05',
  //    data: { 
  //      0: { 
  //            sensedValue: 21 
  //         } 
  //    }
  // }
});

// target not found
cnode.read('/temperature/0/foo', function(err, rsp) {
  console.log(rsp);   // { status: '4.04' }
});

// target is unreadable
cnode.read('/temperature/0/bar', function(err, rsp) {
  console.log(rsp);   // { status: '4.05', data: '_unreadable_' }
});
```

<a name="API_discover"></a>
<br />
********************************************

### cnode.discover(path[, callback])

Discover report settings of an Object, an Object Instance, or a Resource on the Client Device.

**Arguments:**

1. `path` (_String_): path of the allocated Object, Object Instance, or Resource on the remote Client Device.
2. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the
   operation is successful.

    * `rsp.status` (_String_): [Status code](#StatusCode) of the response. Possible status code is '2.05', '4.04' and '
      4.08'.

      | rsp.status | Status      | Description                                   |
      |------------|-------------|-----------------------------------------------|
      | '2.05'     | Content     | Discover operation is completed successfully. |
      | '4.04'     | Not Found   | Target is not found on the Client.            |
      | '4.08'     | Timeout     | No response from the Client in 60 secs.       |

    * `rsp.data` (_Object_): This is an object of the report settings. `data.attrs` contains parameters of the setting.
      If the discovered target is an Object, there will be an additional field `data.resrcList` to list all its Resource
      identifiers under each Object Instance.

**Returns:**

* (none)

**Examples:**

```js
// discover a Resource
cnode.discover('/temperature/0/sensedValue', function(err, rsp) {
  console.log(rsp);

  // {
  //    status: '2.05',
  //    data: {
  //      attrs: { 
  //        pmin: 10, 
  //        pmax: 90,
  //        gt: 0
  //      }
  //    }
  // }
});

// discover an Object
cnode.discover('/temperature', function(err, rsp) {
  console.log(rsp);

  // {
  //    status: '2.05',
  //    data: {
  //      attrs: { 
  //        pmin: 1, 
  //        pmax: 60
  //      },
  //      resrcList: {
  //          0: [ 'sensorValue', 'units' ]
  //      }
  //    }
  // }

// target not found
  cnode.discover('/temperature/0/foo', function(err, rsp) {
    console.log(rsp);   // { status: '4.04' }
  })
```

<a name="API_write"></a>
<br />
********************************************

### cnode.write(path, data[, callback])

Remotely write a data to an Object Instance or a Resource on the Client Device.

**Arguments:**

1. `path` (_String_): path of the allocated Object Instance or Resource on the remote Client Device.
2. `data` (_Depends_): data to write to the Object Instance or the Resource. If target is a Object Instance, then
   the `data` is an Object Instance containing the Resource values.
3. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the
   operation is successful.

    * `rsp.status` (_String_): [Status code](#StatusCode) of the response. Possible status code is '2.04', '4.00', '
      4.04', '4.05' and '4.08'.

**Returns:**

* (none)

**Examples:**

```js
// target is a Resource
cnode.write('/temperature/0/sensedValue', 19, function(err, rsp) {
  console.log(rsp);   // { status: '2.04' }
});

// target is a Object Instance
cnode.write('/temperature/0', { sensedValue: 87, units: 'F' }, function(err, rsp) {
  console.log(rsp);   // { status: '2.04' }
});

// target not found
cnode.write('/temperature/0/foo', 19, function(err, rsp) {
  console.log(rsp);   // { status: '4.04' }
});

// target is unwritable
cnode.write('/temperature/0/bar', 19, function(err, rsp) {
  console.log(rsp);   // { status: '4.05' }
});
```

<a name="API_writeAttrs"></a>
<br />
********************************************

### cnode.writeAttrs(path, attrs[, callback])

Configure the parameters of the report settings of an Object, an Object Instance, or a Resource.

**Arguments:**

1. `path` (_String_): path of the allocated Object, Object Instance, or Resource on the remote Client Device.
2. `attrs` (_Object_): parameters of the report settings.

   | Property | Type   | Required | Description |
   |----------|--------|----------|-------------|
   | pmin     | Number | No       | Minimum Period. Minimum time in seconds the Client Device should wait between two notifications. |
   | pmax     | Number | No       | Maximum Period. Maximum time in seconds the Client Device should wait between two notifications. When maximum time expires after the last notification, a new notification should be sent. |
   | gt       | Number | No       | Greater Than. The Client Device should notify the Server each time the Observed Resource value greater than this setting with respect to pmin parameter. Only valid for the Resource typed as a number. |
   | lt       | Number | No       | Less Than. The Client Device should notify the Server each time the Observed Resource value less than this setting with respect to pmin parameter. Only valid for the Resource typed as a number. |
   | stp      | Number | No       | Step. The Client Device should notify the Server when the change of the Resource value, since the last report happened, is greater or equal to this setting. Only valid for the Resource typed as a number. |

3. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the
   operation is successful.

    * `rsp.status` (_String_): [Status code](#StatusCode) of the response. Possible status code is '2.04', '4.04', '
      4.05' and '4.08'.

**Returns:**

* (none)

**Examples:**

```js
cnode.writeAttrs('/temperature/0/sensedValue', { pmin: 10, pmax: 90, gt: 0 }, function(err, rsp) {
  console.log(rsp);   // { status: '2.04' }
});

// target not found
cnode.writeAttrs('/temperature/0/foo', { lt: 100 }, function(err, rsp) {
  console.log(rsp);   // { status: '4.04' }
});

// parameter cannot be recognized
cnode.writeAttrs('/temperature/0/sensedValue', { foo: 0 }, function(err, rsp) {
  console.log(rsp);   // { status: '4.00' }
});
```

<a name="API_execute"></a>
<br />
********************************************

### cnode.execute(path[, args][, callback])

Invoke an executable Resource on the Client Device. An executable Resource is like a remote procedure call.

**Arguments:**

1. `path` (_String_): path of the allocated Resource on the remote Client Device.
2. `args` (_Array_): arguments to the procedure.
3. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the
   operation is successful.

    * `rsp.status` (_String_): [Status code](#StatusCode) of the response. Possible status code is '2.04', '4.00', '
      4.04', '4.05' and '4.08'.

**Returns:**

* (none)

**Examples:**

```js
// assume there in an executable Resource with the signature
// function(t) { ... } to blink an LED t times.
cnode.execute('/led/0/blink', [10], function(err, rsp) {
  console.log(rsp);   // { status: '2.04' }
});

// target not found
cnode.execute('/temperature/0/foo', function(err, rsp) {
  console.log(rsp);   // { status: '4.04' }
});

// target is unexecutable
cnode.execute('/temperature/0/bar', function(err, rsp) {
  console.log(rsp);   // { status: '4.05' }
});
```

<a name="API_observe"></a>
<br />
********************************************

### cnode.observe(path[, callback])

Start observing an Object Instance or a Resource on the Client Device. **coap-shepherd** don't support the observation
on an Object at this moment.

**Note**

* Server always re-initiate observation requests for the previous observations whenever client registers.
* When a client deregisters, server will assume past states are nullified including the previous observations.

**Arguments:**

1. `path` (_String_): path of the allocated Object Instance or Resource on the remote Client Device.
2. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the
   operation is successful.

    * `rsp.status` (_String_): [Status code](#StatusCode) of the response. Possible status code is '2.05', '4.04', '
      4.05' and '4.08'.
    * `rsp.data` (_Depends_): `data` can be the value of an Object Instance or a Resource. Note that when an unreadable
      Resource is observe, the returned value will be a string '\_unreadble\_'.

**Returns:**

* (none)

**Examples:**

```js
cnode.observe('/temperature/0/sensedValue', function(err, rsp) {
  console.log(rsp);   // { status: '2.05', data: 27 }
});

// target not found
cnode.observe('/temperature/0/foo', function(err, rsp) {
  console.log(rsp);   // { status: '4.04' }
});

// target is not allowed for observation
cnode.observe('/temperature/0/bar', function(err, rsp) {
  console.log(rsp);   // { status: '4.05' }
});
```

<a name="API_cancelObserve"></a>
<br />
********************************************

### cnode.cancelObserve(path[, callback])

Stop observing an Object Instance or a Resource on the Client Device. **coap-shepherd** don't support the observation on
an Object at this moment.

**Arguments:**

1. `path` (_String_): path of the allocated Object Instance or Resource on the remote Client Device.
2. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the
   operation is successful.

    * `rsp.status` (_String_): [Status code](#StatusCode) of the response. Possible status code is '2.05', '4.04', '
      4.05' and '4.08'.

**Returns:**

* (none)

**Examples:**

```js
cnode.cancelObserve('/temperature/0/sensedValue', function(err, rsp) {
  console.log(rsp);   // { status: '2.05' }
});

// target has not yet been observed
cnode.cancelObserve('/temperature/0/foo', function(err, rsp) {
  console.log(rsp);   // { status: '4.05' }
});
```

<a name="API_ping"></a>
<br />
********************************************

### cnode.ping([callback])

Ping the Client Device.

**Arguments:**

1. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the
   operation is successful.

    * `rsp.status` (_String_): [Status code](#StatusCode) of the response. Possible status code is '2.05' and '4.08'.
    * `rsp.data` (_Number_): The approximate round trip time in milliseconds.

**Returns:**

* (none)

**Examples:**

```js
cnode.ping(function(err, rsp) {
  console.log(rsp);   // { status: '2.05', data: 10 }
});
```

<a name="API_dump"></a>
<br />
********************************************

### cnode.dump()

Dump record of the Client Device.

**Arguments:**

1. none

**Returns:**

* (_Object_): A data object of cnode record.

  |    Property   |  Type   |  Description                                                                |
  |---------------|---------|-----------------------------------------------------------------------------|
  |  clientName   | String  | Client name of the device.                                                  |
  |  clientId     | String  | Client id of the device.                                                    |
  |  lifetime     | Number  | Lifetime of the device.                                                     |
  |  version      | String  | LWM2M version.                                                              |
  |  ip           | String  | Ip address of the device.                                                   |
  |  mac          | String  | Mac adderss of the device.                                                  |
  |  port         | Number  | Port of the device.                                                         |
  |  objList      | Object  | The list of Objects supported and Object Instances available on the device. |
  |  observedList | Object  | The list of observing Object Instance or Resource on the device.            |
  |  so           | Object  | All of the Objects, Object Instances and Resources.                         |

**Examples:**

```js
console.log(cnode.dump());

/*
{
    'clientName': 'foo_Name',
    'clientId': 1,
    'lifetime': 86400,
    'version': '1.0.0',
    'ip': '127.0.0.1',
    'mac': '00:0c:29:3c:fc:7d',
    'port': 56643,
    'objList': {
        '1':['0'],
        '3303':['0']
    },
    'observedList': [ '/temperature/0/sensorValue' ]
    'so': {
        'lwm2mServer': {
            '0': { 
                'lifetimev:86400,
                'defaultMinPeriod':1,
                'defaultMaxPeriod':60
            }
        },
        'temperature': {
            '0': { 
                'sensorValue':19,
                'units':'C'
            }
        }
    }
}
*/
```

<a name="StatusCode"></a>
<br />
********************************************

## 6. Status Code

|  Code  | Status                | Description                                                                                                                                                                                |
|--------|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| '2.00' | OK                    | Everything is fine                                                                                                                                                                         |
| '2.04' | Changed               | The remote cnode accepted this writing request successfully                                                                                                                                |
| '2.05' | Content               | The remote cnode accepted this reading request successfully                                                                                                                                |
| '4.00' | Bad Request           | There is an unrecognized attribute/parameter within the request message                                                                                                                    |
| '4.04' | Not Found             | The cnode is not found                                                                                                                                                                     |
| '4.05' | Method Not Allowed    | If you are trying to change either `clientName` or `mac`, to read something unreadable, to write something unwritable, and execute something unexecutable, then you will get this response |
| '4.08' | Timeout               | Request timeout                                                                                                                                                                            |
| '5.00' | Internal Server Error | The remote cnode has some trouble                                                                                                                                                          |

