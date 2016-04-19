coap-shepherd
========================

## Table of Contents

1. [Overiew](#Overiew)    
2. [Features](#Features) 
3. [Installation](#Installation) 
4. [Usage](#Usage)
5. [APIs and Events](#APIs) 

<a name="Overiew"></a>
## 1. Overview

[---- WAITING FOR REVISING, Ignore this section ----]

[**CoAP**](https://tools.ietf.org/html/rfc7252) is an application layer protocol and architecture that offers a for communications, via, in a machine-to-machine (M2M) network.  in a constrained RESTful environment (CoRE).

[**OMA Lightweight M2M**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) (LWM2M) is a resource constrained device management protocol relies on **CoAP**. 
The goal of **coap-shepherd** is to provide a simple way to build and manage **CoAP** machine network ,it is implemented as a server-side application framework with many network management functions, e.g. permission of device joining, reading, writing and observing resources on a remote device, remotely executing a procedure on the Device. 


**coap-shepherd** is an implementation of **CoAP** device management server with node.js. It follows most parts of **LWM2M** specification to meet the requirements of machine network management. Here is another module [**coap-node**](https://github.com/PeterEB/coap-node) that can help you with implementing a LWM2M client node.  

Both **coap-shepherd** and *coap-node* uses [**IPSO**](http://www.ipso-alliance.org/smart-object-guidelines/) data model which can well organize and define resources on a machine node. With IPSO, you can allocate and query resources with semantic URIs in a comprehensive manner. Here is an example, all these requests is to read a value from the same resource but with different addressing style.  

```js
// number style
cnode.read('/3303/0/5700', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 21 }
});

// semantic style
cnode.read('/temperature/0/sensedValue', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 21 }
});

// hybrid style
cnode.read('/temperature/0/5700', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 21 }
});
```

**Note**: 
* You can find all pre-defined IPSO/OMA-LWM2M idetifiers from [lwm2m-id](https://github.com/simenkid/lwm2m-id#5-table-of-identifiers) module. You are also welcome to use your own private identifiers in **coap-shepherd**.  

###Acronym

* **Server**: LWM2M Server (server running with [coap-shepherd](https://github.com/PeterEB/coap-shepherd))
* **Client** or **Client Device**: LWM2M Client (machine running with [coap-node](https://github.com/PeterEB/coap-node))
* **oid**: identifier of an _Object_
* **iid**: identifier of an _Object Instance_
* **rid**: indetifier of a _Resource_
[---- END: WAITING FOR REVISING, Ignore this section ----]

<a name="Features"></a>
## 2. Features

* CoAP protocol  
* Based on [node-coap](https://github.com/mcollina/node-coap), a node.js CoAP client/server library  
* Hierarchical data model in Smart-Object-style (IPSO)  
* CoAP device and network management  
* LWM2M interfaces for client/server interaction  

<a name="Installation"></a>
## 3. Installation

> $ npm install coap-shepherd --save

<a name="Usage"></a>
## 4. Usage

This example shows how to start a server and allow devices to join the network for 300 seconds after the server is ready:

```js
var cserver = require('coap-shepherd');

cserver.on('ready', function () {
    console.log('Server is ready.');
    cserver.permitJoin(300);    // open for devices to join the network within 300 secs
});

cserver.start(function (err) {  // start the server
    if (err)
        console.log(err);
});
```

<a name="APIs"></a>
## 5. APIs and Events

#### 1. CoapShepherd APIs

In this document, **cserver** denotes an instance of CoapShepherd class. **cserver** is also a singleton exported by `require('coap-shepherd')`.  

* [cserver.start()](#API_start)
* [cserver.stop()](#API_stop)
* [cserver.permitJoin()](#API_permitJoin)
* [cserver.find()](#API_find)
* [cserver.removeNode()](#API_removeNode)
* [cserver.announce()](#API_announce)
* Events: [ready](#EVT_ready), [ind](#EVT_ind), and [error](#EVT_error)

#### 2. CoapNode APIs

CoapNode is the class to create software endpoints of the remote Client Devices at server-side. In this document, **cnode** denotes an instance of CoapNode class. You can invoke methods on a `cnode` to operate the remote device.  

* [cnode.read()](#API_read)
* [cnode.discover()](#API_discover)
* [cnode.write()](#API_write)
* [cnode.writeAttr()](#API_writeAttr)
* [cnode.execute()](#API_execute)
* [cnode.observe()](#API_observe)
* [cnode.cancelObserve()](#API_cancelObserve)
* [cnode.ping()](#API_ping)
* [cnode.dump()](#API_dump)

Note: The type _Depends_ meaning depends the type of target. [TBD, cannot understand ???]

*************************************************
## CoapShepherd Class
Server configuration is read from file `config.js` in the root folder of this module.  

<a name="API_start"></a>
### cserver.start([callback])
Start the cserver.  

**Arguments:**  

1. `callback` (_Function_): `function (err) { }`. Get called after starting procedure is done.  

**Returns:**  

* (none)

**Examples:** 

```js
cserver.start(function (err) {
    console.log('server is started.');
});
```

*************************************************
<a name="API_stop"></a>
### cserver.stop([callback])
Stop the cserver.

**Arguments:**  

1. `callback` (_Function_): `function (err) { }`. Get called after stopping procedure is done.  

**Returns:**  

* (none)

**Examples:** 

```js
cserver.stop(function (err) {
    console.log('server stopped.');
});
```

*************************************************
<a name="API_permitJoin"></a>
### cserver.permitJoin(time)
Allow or disallow devices to join the network.  

**Arguments:**  

1. `time` (_Number_): Time in seconds for csever to allow devices to join the network. Set `time` to `0` can immediately close the admission.  

**Returns:**  

* (none)

**Examples:** 

```js
cserver.permitJoin(300); 
```

*************************************************
<a name="API_find"></a>
### cserver.find(clientName)
Find a registered Client Device (cnode) on cserver.  

**Arguments:**  

1. `clientName` (_String_): Name of the Client Device to find for.  

**Returns:**  

* (Object): cnode. Returns `undefined` if not found.  

**Examples:** 

```js
var cnode = cserver.find('foo_name');

if (cnode) {
    // do something upon the cnode, like cnode.read()
}
```

*************************************************
<a name="API_removeNode"></a>
### cserver.remove(clientName[, callback]) -> removeNode to remove
Deregister and remove a cnode from cserver.  

**Arguments:**  

1. `clientName` (_String_): Name of the Client Device to be removed.  
2. `callback` (_Function_): `function (err) { }`. Get called after the removal is done.  

**Returns:**  

* (none)

**Examples:** 

```js
cserver.remove('foo_name');
```
*************************************************
<a name="API_announce"></a>
### cserver.announce(msg[, callback])
The cserver can use this method to announce any message to all Client Devices.  

**Arguments:**  

1. `msg` (_String_): The message to announce.  
2. `callback` (_Function_): `function (err) { }`. Get called after message announced.  

**Returns:**  

* (none)

**Examples:** 

```js
cserver.announce('Hum!');
```

*************************************************
<a name="EVT_ready"></a>
### Event: 'ready'
`function () { }`  
Fired when cserver is ready.

*************************************************
<a name="EVT_error"></a>
### Event: 'error'
`function (err) { }`  
Fired when there is an error occurs.

*************************************************
<a name="EVT_ind"></a>
### Event: 'ind'
`function (type, msg) { }`  
Fired when there is an incoming indication message. There are 6 types of indication including `registered`, `update`, `deregistered`, `online`, `offline`, and `notify`.  

* **registered**
    * type: `'registered'`
    * msg (_Object_): a cnode of which Client Device has successfuly registered to cserver.  


* **update**
    * type: `'update'`
    * msg (_Object_): this object at least has a `device` field to denote the name of a Client Device, and it may have fields of `lifetime`, `objList`, `ip`, and `port`.  

        ```js
        // example
        {
            device: 'foo_name',
            lifetime: 12000
        }
        ```

* **deregistered**
    * type: `'deregistered'`
    * msg (_String_): clientName of which Client Device has successfully deregistered from cserver.  

* **online**
    * type: `'online'`
    * msg (_String_): clientName of which Client Device is going online.  

* **offline**
    * type: `'offline'`
    * msg (_String_): clientName of which Client Device is going offline.  

* **notify**
    * type: `'notify'`
    * msg (_Object_): notification from a Client Device. This object has fileds of `device`, `path`, and `data`.  

        ```js
        // example of a Resource notification
        {
            device: 'foo_name',
            path: '/temperature/0/sensorValue',
            data: 21
        }

        // example of an Object Instance notification
        {
            device: 'foo_name',
            path: '/temperature/0',
            data: {
                sensorValue: 21
            }
        }
        ```

***********************************************

<br /> 

## CoapNode Class

This class provides you with methods to perform remote operations upon a registered Client Device. An instance of this class is denoted as `cnode` in this document. You can use `cserver.find()` with a clientName to find the registered cnode on cserver.  

<a name="API_read"></a>
### cnode.read(path[, callback])
Remotely read an Object, an Object Instance, or a Resource from the Client Device.

**Arguments:**  

1. `path` (_String_): path of the allocated Object, Object Instance or Resource on the remote Client Device.
2. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful.  

    * `rsp.status` (_String_)  

        | rsp.status | Status Code | Description                               |
        |------------|-------------|-------------------------------------------|
        | '2.05'     | Content     | Read operation is completed successfully. |
        | '4.04'     | Not Found   | Target is not found on the Client.        |
        | '4.05'     | Not Allowed | Target is not allowed for Read operation. |
        | '4.08'     | Timeout     | No response from the Client in 60 secs.   |

    * `rsp.data` (_Depends_): `data` can be the value of an Object, an Object Instance, or a Resource. Note that when an unreadable Resource is read, the status code will be '4.05' and the returned value will be a string '\_unreadable\_'.

**Returns:**  

* (none)

**Examples:** 

```js
// read a Resource
cnode.read('/temperature/0/sensedValue', function (err, rsp) {
    console.log(rsp);   // { status: '2.05', data: 21 }
});

// read an Object Instance
cnode.read('/temperature/0', function (err, rsp) {
    console.log(rsp);

    // {
    //    status: '2.05',
    //    data: { 
    //      sensedValue: 21 
    //    } 
    // }
});

// read an Object
cnode.read('/temperature', function (err, rsp) {
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
cnode.read('/temperature/0/foo', function (err, rsp) {
    console.log(rsp);   // { status: '4.04' }
});

// target is unreadable
cnode.read('/temperature/0/bar', function (err, rsp) {
    console.log(rsp);   // { status: '4.05', data: '_unreadable_' }
});
```
*************************************************
<a name="API_discover"></a>
### cnode.discover(path[, callback])
Discover report settings of an Object, an Object Instance, or a Resource on the Client Device.  

**Arguments:**  

1. `path` (_String_): path of the allocated Object, Object Instance, or Resource on the remote Client Device.  
2. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful.  

    * `rsp.status` (_String_)  

        | rsp.status | Status      | Description                                   |
        |------------|-------------|-----------------------------------------------|
        | '2.05'     | Content     | Discover operation is completed successfully. |
        | '4.04'     | Not Found   | Target is not found on the Client.            |
        | '4.08'     | Timeout     | No response from the Client in 60 secs.       |

    * `rsp.data` (_Object_): This is an object of the report settings. `data.attrs` contains parameters of the setthing. If the discoved target is an Object, there will be an additional field `data.resrcList` to list all its Resource idetifiers under each Object Instance.  

**Returns:**  

* (none)

**Examples:** 

```js
// discover a Resource
cnode.discover('/temperature/0/sensedValue', function (err, rsp) {
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
cnode.discover('/temperature', function (err, rsp) {
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
cnode.discover('/temperature/0/foo', function (err, rsp) {
    console.log(rsp);   // { status: '4.04' }
});
```
*************************************************
<a name="API_write"></a>
### cnode.write(path, data[, callback])
Remotely write a data to a Resource on the Client Device. [TBD] Support Resource(s) in an Object Instance? You should make it clear.  

**Arguments:**  

1. `path` (_String_): path of the allocated Object Instance or Resource on the remote Client Device.  
2. `data` (_Depends_): data to write to the target. [TBD] Support Resource(s) in an Object Instance?  
3. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful.  

    * `rsp.status` (_String_)  

        | rsp.status | Status      | Description                                    |
        |------------|-------------|------------------------------------------------|
        | '2.04'     | Changed     | Write operation is completed successfully      |
        | '4.00'     | Bad Request | The format of data to be written is different. |
        | '4.04'     | Not Found   | Target is not found on the Client.             |
        | '4.05'     | Not Allowed | Target is not allowed for Write operation.     |
        | '4.08'     | Timeout     | No response from the Client in 60 secs.        |

**Returns:**  

* (none)

**Examples:** 

```js
cnode.write('/temperature/0/sensedValue', 19, function (err, rsp) {
    console.log(rsp);   // { status: '2.04' }
});

// target not found
cnode.write('/temperature/0/foo', 19, function (err, rsp) {
    console.log(rsp);   // { status: '4.04' }
});

// target is unwritable
cnode.write('/temperature/0/bar', 19, function (err, rsp) {
    console.log(rsp);   // { status: '4.05' }
});
```
*************************************************
<a name="API_writeAttr"></a>
### cnode.writeAttr(path, attrs[, callback]) [TBD] it is better to use writeAttr**s** as the API name
Configure the parameters of the report settings of an Object, an Object Instance, or a Resource.  

**Arguments:**  

1. `path` (_String_): path of the allocated Object, Object Instance, or Resource on the remote Client Device.  
2. `attrs` (_Object_): parameters of the report settings.  

    [TBD] check your pmin and pmax behavior
        In spec 20151214C
            5.1.2 Attributes Classification, Table 4, Minimum Period
            5.5.2 Notify
        The new spec is weird.  

    | Property | Type   | Required | Description |
    |----------|--------|----------|-------------|
    | pmin     | Number | No       | Minimum Period. Minimum time in seconds the Client Device should wait between two notifications. |
    | pmax     | Number | No       | Maximum Period. Maximum time in seconds the Client Device should wait between two notifications. When maximum time expires after the last notification, a new notification should be sent. |
    | gt       | Number | No       | Greater Than. The Client Device should notify the Server each time the Observed Resource value crosses this setthing with respect to pmin parameter. Only valid for the Resource typed as a number. |
    | lt       | Number | No       | Less Than. The Client Device should notify the Server each time the Observed Resource value crosses this setting with respect to pmin parameter. Only valid for the Resource typed as a number. |
    | stp      | Number | No       | Step. The Client Device should notify the Server when the change of the Resource value, since the last report happened, is greater or equal to this setting. Only valid for the Resource typed as a number. |

3. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful.  

    * `rsp.status` (_String_)  

        | rsp.status | Status      | Description                                           |
        |------------|-------------|-------------------------------------------------------|
        | '2.04'     | Changed     | Write Attributes operation is completed successfully. |
        | '4.00'     | Bad Request | Parameter of the attribute(s) can't be recognized.    |
        | '4.04'     | Not Found   | Target is not found on the Client.                    |
        | '4.08'     | Timeout     | No response from the Client in 60 secs.               |

**Returns:**  

* (none)

**Examples:** 

```js
cnode.writeAttr('/temperature/0/sensedValue', { pmin: 10, pmax: 90, gt: 0 }, function (err, rsp) {
    console.log(rsp);   // { status: '2.04' }
});

// taget not found
cnode.writeAttr('/temperature/0/foo', { lt: 100 }, function (err, rsp) {
    console.log(rsp);   // { status: '4.04' }
});

// parameter cannot be recognized
cnode.writeAttr('/temperature/0/sensedValue', { foo: 0 }, function (err, rsp) {
    console.log(rsp);   // { status: '4.00' }
});
```
*************************************************
<a name="API_execute"></a>
### cnode.execute(path[, args][, callback])
Invoke an excutable Resource on the Client Device. An excutable Resource is like a remote procedure call.  

**Arguments:**  

1. `path` (_String_): path of the allocated Resource on the remote Client Device.  
2. `args` (_Array_): arguments to the procedure.  
3. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful. There will be a `data` field if the procedure does return something back, and the data type depends on the implementation at client-side.  

    * `rsp.status` (_String_)  

        | rsp.status   | Status      | Description                                                |
        |--------------|-------------|------------------------------------------------------------|
        | '2.04'       | Changed     | Execute operation is completed successfully.               |
        | '4.00'       | Bad Request | Client doesn’t understand the argument in the payload.     |
        | '4.04'       | Not Found   | Target is not found on the Client.                         |
        | '4.05'       | Not Allowed | Target is not allowed for Execute operation.               |
        | '4.08'       | Timeout     | No response from the Client in 60 secs.                    |

**Returns:**  

* (none)

**Examples:** 

```js
// assume there in an executable Resource with the singnatue
// function(t) { ... } to blink an LED t times.
cnode.execute('/led/0/blink', [ 10 ] ,function (err, rsp) {
    console.log(rsp);   // { status: '2.04' }
});

// target not found
cnode.execute('/temperature/0/foo', function (err, rsp) {
    console.log(rsp);   // { status: '4.04' }
});

// target is unexecuteable
cnode.execute('/temperature/0/bar', function (err, rsp) {
    console.log(rsp);   // { status: '4.05' }
});
```
*************************************************
<a name="API_observe"></a>
### cnode.observe(path[, callback])
Start observing a Resource on the Client Device.
[TBD] Do you support Object and Object Instance observation?

**Arguments:**  

1. `path` (_String_): path of the allocated Resource on the remote Client Device.
2. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful.  

    * `rsp.status` (_String_)  

        | rsp.status   | Status      | Description                                  |
        |--------------|-------------|----------------------------------------------|
        | '2.05'       | Content     | Observe operation is completed successfully. |
        | '4.04'       | Not Found   | The target is not found on the Client.       |
        | '4.05'       | Not Allowed | Target is not allowed for Observe operation. |
        | '4.08'       | Timeout     | No response from the Client in 60 secs.      |

   * `rsp.data` (_Depends_): `data` can be the value of an Object, an Object Instance or a Resource. Note that when an unreadable Resource is observe, the returned value will be a string '\_unreadble\_'. [TBD] unnecessary to return user a rsp.data, it is very confused

**Returns:**  

* (none)

**Examples:** 

```js
cnode.observe('/temperature/0/sensedValue', function (err, rsp) {
    console.log(rsp);   // { status: '2.05' }   [FIXME] unnecessary to return user a rsp.data, it is very confused
});

// target not found
cnode.observe('/temperature/0/foo', function (err, rsp) {
    console.log(rsp);   // { status: '4.04' }
});

// target is not allowed for observation
cnode.observe('/temperature/0/bar', function (err, rsp) {
    console.log(rsp);   // { status: '4.05' }
});

// target has been observed
cnode.observe('/temperature/0/sensedValue', function (err, rsp) {
    // [TBD] why err if something has been observed? do you need to cancel it first then re-observe it again?
    console.log(err);   // Error['/temperature/0/bar has been observed.']
});
```
*************************************************
<a name="API_cancelObserve"></a>
### cnode.cancelObserve(path[, callback])
Stop observing an Object, an Object Instance, or a Resource on the Client Device.  

**Arguments:**  

1. `path` (_String_): path of the allocated Object, Object Instance or Resource on the remote Client Device.  
2. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful.  

    * `rsp.status` (_String_)  

        | rsp.status   | Status      | Description                                         |
        |--------------|-------------|-----------------------------------------------------|
        | '2.05'       | Content     | Observation is successfully cancelled.              |
        | '4.04'       | Not Found   | The target is not found on the Client.              |
        | '4.08'       | Timeout     | No response from the Client in 60 secs.             |

**Returns:**  

* (none)

**Examples:** 

```js
cnode.cancelObserve('/temperature/0/sensedValue', function (err, rsp) {
    console.log(rsp);   // { status: '2.05' }
});

// target has not yet been observed
cnode.cancelObserve('/temperature/0/foo', function (err, rsp) {
    // [TBD] why err if something is not observed? why not telling user by rsp.status?
    console.log(err);   // Error['/temperature/0/bar has not yet been observed.']
});
```
*************************************************
<a name="API_ping"></a>
### cnode.ping([callback])
Ping the Client Device.  

**Arguments:**  

1. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful.  

    * `rsp.status` (_String_)

        | rsp.status | Status      | Description                               |
        |------------|-------------|-------------------------------------------|
        | '2.05'     | Content     | Ping operation is successful.             |
        | '4.08'     | Timeout     | No response from the Client in 60 secs.   |

    * `rsp.data` (_Number_): The approximate round trip time in milliseconds. [FIXME] data type should be a number

**Returns:**  

* (none)

**Examples:** 

```js
cnode.ping(function (err, rsp) {
    console.log(rsp);   // { status: '2.05', data: 10 }
});
```
*************************************************
<a name="API_dump"></a>
### cnode.dump()
Dump record of the Client Device.  

**Arguments:**  

1. none

**Returns:**  

* (_Object_): A data object of cnode record.

    |   Property   |  Type   |  Description                                                                |
    |--------------|---------|-----------------------------------------------------------------------------|
    | `clientName` | String  | Client name of the device.                                                  |
    | `ip`         | String  | Ip address of the device.                                                   |
    | `port`       | Number  | Port of the device.                                                         |
    | `lifetime`   | Number  | Lifetime of the device.                                                     |
    | `version`    | String  | LWM2M version.                                                              |
    | `objList`    | Object  | The list of Objects supported and Object Instances available on the device. |
    | `so`         | Object  | All of the Objects, Object Instances and Resources.                         |

**Examples:** 

```js
console.log(cnode.dump());

/*
{
    'clientName': 'foo_Name',
    'lifetime': 86400,
    'version': '1.0.0',
    'ip': '127.0.0.1',
    'port': 56643,
    'objList': {
        '1':['0'],
        '3303':['0']
    },
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
