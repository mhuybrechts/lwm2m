# @hollowy/lwm2m
Network server and manager for lightweight M2M (LWM2M).

[![NPM](https://nodei.co/npm/coap-shepherd.png?downloads=true)](https://nodei.co/npm/coap-shepherd/)  

[![Build Status](https://travis-ci.org/PeterEB/coap-shepherd.svg?branch=develop)](https://travis-ci.org/PeterEB/coap-shepherd)
[![npm](https://img.shields.io/npm/v/coap-shepherd.svg?maxAge=2592000)](https://www.npmjs.com/package/coap-shepherd)
[![npm](https://img.shields.io/npm/l/coap-shepherd.svg?maxAge=2592000)](https://www.npmjs.com/package/coap-shepherd)

<br />

## Documentation  

Please visit the [DOC](https://github.com/nanyuantingfeng/lwm2m/blob/master/docs/Home.md).

<br />

## Overview

[**OMA Lightweight M2M**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) (LWM2M) is a resource constrained device management protocol relies on [**CoAP**](https://tools.ietf.org/html/rfc7252). And **CoAP** is an application layer protocol that allows devices to communicate with each other RESTfully over the Internet.  

**@hollowy/coap-shepherd**, **@hollowy/coap-node** and **lwm2m-bs-server** modules aim to provide a simple way to build and manage a **LWM2M** network.
* Connect library: **@hollowy/lwm2m**  
* Server-side library: **@hollowy/coap-shepherd**  
* Client-side library: **@hollowy/coap-node**
* Bootstrap server library: [**lwm2m-bs-server**](https://github.com/PeterEB/lwm2m-bs-server)
* [**A simple demo webapp**](https://github.com/PeterEB/quick-demo)

### LWM2M Server: @hollowy/coap-shepherd

* It is a **LWM2M** Server application framework running on node.js.  
* It follows most parts of **LWM2M** specification to meet the requirements of a machine network and devices management.  
* It works well with [**Leshan**](https://github.com/eclipse/leshan) and [**Wakaama**](https://github.com/eclipse/wakaama).
* Supports functionalities, such as permission of device joining, reading resources, writing resources, observing resources, and executing a procedure on a remote device.  
* It follows [**IPSO**](http://www.ipso-alliance.org/smart-object-guidelines/) data model to let you allocate and query resources on remote devices with semantic URIs in a comprehensive manner. 

<br />

## Installation

> $ npm install @hollowy/lwm2m --save

<br />

## Usage

This example shows how to start a server and allow devices to join the network within 180 seconds after the server is ready:

```js
import { LWM2MServer } from '@hollowy/lwm2m'

const server = new LWM2MServer({ port: 5683 })

server.on('ready', () => {
    console.log('Server is ready.');

    // when server is ready, allow devices to join the network within 180 secs
  server.permitJoin(180);  
});

server.start((err) => {  // start the server
    if (err) console.log(err);
});

// That's all to start a LWM2M server.
// Now cserver is going to automatically tackle most of the network managing things.
```

In your front-end project page

```js
import {LWM2MConnect} from '@hollowy/lwm2m'

const connect = new LWM2MConnect(5683, window.location.hostname)

connect.subscribe("device::notify", (clientName, data) => {
  console.log("device::notify", clientName, data)
})

connect.subscribe("device::status", (clientName, status) => {
  console.log("device::status",clientName, status)
})

// and write a value to device
connect.write(`@clientName`, "/19/1/0", "Some Message...").catch(e => {
  console.log("ERROR", e)
})

```

<br />

## LICENSE

Licensed under [MIT](https://github.com/nanyuantingfeng/lwm2m/blob/master/LICENSE).
