import Q from 'q'
import _ from 'lodash'

import {helpers, CONSTANTS} from '@hollowy/coap-helpers'
import {CoapNode} from './CoapNode'
import {CoapShepherd} from './CoapShepherd'

import {IncomingMessage, OutgoingMessage} from 'coap'
import {IDeviceAttrs} from './types'

const debug = require('debug')('@hollowy/coap-shepherd:reqHandler')

export function reqHandler(shepherd: CoapShepherd, req: IncomingMessage, rsp: OutgoingMessage) {
  const optType = reqParser(req)
  let handler: (shepherd: CoapShepherd, req: IncomingMessage, rsp: OutgoingMessage) => void = null

  switch (optType) {
    case 'register':
      handler = forRegister
      break
    case 'update':
      handler = forUpdate
      break
    case 'deregister':
      handler = forDeregister
      break
    case 'check':
      handler = forCheck
      break
    case 'lookup':
      handler = forLookup
      break
    case 'test':
      handler = forTest
      break
    case 'empty':
      rsp.reset()
      break
    default:
      break
  }

  if (handler) setImmediate(() => handler(shepherd, req, rsp))
}

function forRegister(shepherd: CoapShepherd, req: IncomingMessage, rsp: OutgoingMessage) {
  const devAttrs: any = buildDeviceAttrs(shepherd, req)

  let cnode = devAttrs && devAttrs.clientName ? shepherd.find(devAttrs.clientName) : null

  let errCount = 0

  debug('REQ <-- register, token: %s', req._packet ? req._packet.token.toString('hex') : undefined)

  if (devAttrs === false || !devAttrs.clientName || !devAttrs.objList)
    return sendRsp(rsp, CONSTANTS.RSP.badreq, '', 'register')
  else if (shepherd.joinable === false) return sendRsp(rsp, CONSTANTS.RSP.notallowed, '', 'register')

  function getClientDetails(notFire?: boolean) {
    setTimeout(() => {
      cnode = shepherd.find(devAttrs.clientName)
      if (cnode) {
        let promise
        if (shepherd.config.autoReadResources)
          promise = cnode.readAllResource().then(() => shepherd.storage.save(cnode))
        else promise = Q.fcall(() => {})
        promise
          .then(() => {
            if (cnode.heartbeatEnabled) return cnode.observe('/heartbeat')
          })
          .then(() => {
            if (!notFire) {
              setImmediate(() => shepherd.emit('message', {type: 'device::incoming', cnode: cnode}))
            }
            // [TODO] else
            cnode.setStatus('online')
            if (shepherd.config.dontReinitiateObserve) cnode.observedList = []
            return cnode.reinitiateObserve()
          })
          .fail((err) => {
            if (errCount < 2) {
              errCount += 1
              return getClientDetails()
            } else {
              errCount = 0
              return shepherd.emit('error', err)
            }
          })
          .done()
      } else {
        // [TODO]
      }
    }, 100)
  }

  if (!cnode) {
    Q.fcall(() => {
      let allowDevIncoming
      if (_.isFunction(shepherd.acceptDeviceIncoming)) {
        allowDevIncoming = Q.nbind(shepherd.acceptDeviceIncoming, shepherd)
        return allowDevIncoming(devAttrs)
      } else {
        return true
      }
    })
      .then(
        (accepted) => {
          let extra = undefined
          if (Array.isArray(accepted)) {
            extra = accepted[1]
            accepted = accepted[0]
          }
          if (accepted) {
            cnode = new CoapNode(shepherd, devAttrs)
            cnode._extra = extra
            shepherd.registry[devAttrs.clientName] = cnode
            patchClientMeta(cnode, rsp)
            sendRsp(rsp, CONSTANTS.RSP.created, '', 'register')
            return getClientDetails()
          } else {
            sendRsp(rsp, CONSTANTS.RSP.notallowed, '', 'register')
            return accepted
          }
        },
        (err) => {
          sendRsp(rsp, CONSTANTS.RSP.serverError, '', 'register')
          shepherd.emit('error', err)
        },
      )
      .done()
  } else {
    // [TODO] delete cnode and add a new cnode
    cnode
      .updateAttrs(devAttrs)
      .then(
        () => {
          patchClientMeta(cnode, rsp)
          sendRsp(rsp, CONSTANTS.RSP.created, '', 'register')
          return getClientDetails(!shepherd.config.alwaysFireDevIncoming)
        },
        (err) => {
          sendRsp(rsp, CONSTANTS.RSP.serverError, '', 'register')
          shepherd.emit('error', err)
        },
      )
      .done()
  }
}

function forUpdate(shepherd: CoapShepherd, req: IncomingMessage, rsp: OutgoingMessage) {
  const devAttrs = buildDeviceAttrs(shepherd, req)
  const locationPath = helpers.urlParser(req.url).pathname
  const cnode = shepherd.findByLocationPath(locationPath)
  let diff
  const msg = {}

  debug('REQ <-- update, token: %s', req._packet ? req._packet.token.toString('hex') : undefined)

  if (devAttrs === false) return sendRsp(rsp, CONSTANTS.RSP.badreq, '', 'update')

  if (cnode) {
    cnode
      .updateAttrs(devAttrs)
      .then((diffAttrs) => {
        diff = diffAttrs
        cnode.setStatus('online')
        cnode._heartbeat = helpers.getTime()
        cnode.lifeCheck(true)
        if (shepherd.config.autoReadResources && diff.objList) {
          return cnode.readAllResource().then(() => shepherd.storage.save(cnode))
        }
      })
      .then(
        () => {
          sendRsp(rsp, CONSTANTS.RSP.changed, '', 'update')

          _.forEach(diff, (val, key) => {
            msg[key] = val
          })

          setImmediate(() => shepherd.emit('message', {type: 'device::update', cnode: cnode, data: msg}))
        },
        (err) => {
          sendRsp(rsp, CONSTANTS.RSP.serverError, '', 'update')
          shepherd.emit('error', err)
        },
      )
      .done()
  } else {
    sendRsp(rsp, CONSTANTS.RSP.notfound, '', 'update')
  }
}

function forDeregister(shepherd: CoapShepherd, req: IncomingMessage, rsp: OutgoingMessage) {
  const locationPath = helpers.urlParser(req.url).pathname
  const cnode = shepherd.findByLocationPath(locationPath)
  const clientName = cnode.clientName

  debug('REQ <-- deregister, token: %s', req._packet ? req._packet.token.toString('hex') : undefined)

  if (cnode) {
    shepherd
      .remove(clientName)
      .then(
        () => {
          sendRsp(rsp, CONSTANTS.RSP.deleted, '', 'deregister')
        },
        () => {
          sendRsp(rsp, CONSTANTS.RSP.serverError, '', 'deregister')
        },
      )
      .done()
  } else {
    sendRsp(rsp, CONSTANTS.RSP.notfound, '', 'deregister')
  }
}

function forCheck(shepherd: CoapShepherd, req: IncomingMessage, rsp: OutgoingMessage) {
  const locationPath = helpers.urlParser(req.url).pathname
  const cnode = shepherd.findByLocationPath(locationPath)
  const chkAttrs: any = buildChkAttrs(req)
  const devAttrs: any = {}
  let errCount = 0

  debug('REQ <-- check, token: %s', req._packet ? req._packet.token.toString('hex') : undefined)

  if (chkAttrs === false) return sendRsp(rsp, CONSTANTS.RSP.badreq, '', 'check')

  function startHeartbeat() {
    _.delay(() => {
      cnode
        .observe('/heartbeat')
        .then(() => {
          cnode.setStatus('online')
        })
        .fail((err) => {
          if (errCount < 2) {
            errCount += 1
            startHeartbeat()
          } else {
            errCount = 0
            shepherd.emit('error', err)
          }
        })
        .done()
    }, 50)
  }

  if (cnode) {
    if (chkAttrs.sleep) {
      // check out
      cnode.cancelAllObservers()
      cnode.sleepCheck(true, chkAttrs.duration)
      sendRsp(rsp, CONSTANTS.RSP.changed, '', 'check')
      cnode.setStatus('sleep')
    } else {
      // check in
      cnode.lifeCheck(true)
      cnode.sleepCheck(false)
      devAttrs.ip = req.rsinfo.address
      devAttrs.port = req.rsinfo.port
      cnode._heartbeat = helpers.getTime()
      cnode
        .updateAttrs(devAttrs)
        .then(
          () => {
            sendRsp(rsp, CONSTANTS.RSP.changed, '', 'check')
            startHeartbeat()
          },
          (err) => {
            sendRsp(rsp, CONSTANTS.RSP.serverError, '', 'check')
            shepherd.emit('error', err)
          },
        )
        .done()
    }
  } else {
    sendRsp(rsp, CONSTANTS.RSP.notfound, '', 'check')
  }
}

function forLookup(shepherd: CoapShepherd, req: IncomingMessage, rsp: OutgoingMessage) {
  // const lookupType = helpers.getPathArray(req.url)[1]
  const devAttrs = buildDeviceAttrs(shepherd, req)
  const clientName = devAttrs ? devAttrs.clientName : ''
  const cnode = clientName ? shepherd.find(clientName) : null
  let data

  debug('REQ <-- lookup, token: %s', req._packet ? req._packet.token.toString('hex') : undefined)
  // [TODO] check pathname & lookupType
  if (cnode) {
    data = '<coap://' + cnode.ip + ':' + cnode.port + '>;ep=' + cnode.clientName
    sendRsp(rsp, CONSTANTS.RSP.content, data, 'lookup')
    setImmediate(() => shepherd.emit('message', {type: 'lookup', cnode: clientName, data: clientName}))
  } else {
    sendRsp(rsp, clientName ? CONSTANTS.RSP.notfound : CONSTANTS.RSP.badreq, '', 'lookup')
  }
}

function forTest(shepherd: CoapShepherd, req: IncomingMessage, rsp: OutgoingMessage) {
  debug('REQ <-- test, token: %s', req._packet ? req._packet.token.toString('hex') : undefined)
  sendRsp(rsp, CONSTANTS.RSP.content, '_test', 'test')
}

/*********************************************************
 * Private function                                      *
 *********************************************************/
function reqParser(req: IncomingMessage): string {
  let optType: string
  let pathArray: string[]

  if (req.code === '0.00' && req._packet.confirmable && req.payload.length === 0) return 'empty'

  switch (req.method) {
    case 'POST':
      pathArray = helpers.getPathArray(req.url)
      if (pathArray.length === 1 && pathArray[0] === 'rd') optType = 'register'
      else optType = 'update'
      break
    case 'PUT':
      optType = 'check'
      break
    case 'DELETE':
      optType = 'deregister'
      break
    case 'GET':
      pathArray = helpers.getPathArray(req.url)
      if (pathArray[0] === 'test') optType = 'test'
      else optType = 'lookup'
      break
    default:
      break
  }

  return optType
}

function sendRsp(
  rsp: OutgoingMessage,
  code: typeof CONSTANTS.RSP[keyof typeof CONSTANTS.RSP],
  data: any,
  optType: string,
) {
  rsp.code = code
  data === '' ? rsp.end() : rsp.end(data)
  debug('RSP --> %s, token: %s', optType, rsp._packet ? rsp._packet.token.toString('hex') : undefined)
}

function patchClientMeta(cnode: CoapNode, rsp: OutgoingMessage) {
  cnode._registered = true
  cnode._heartbeat = helpers.getTime()
  cnode.lifeCheck(true)

  rsp.setOption('Location-Path', [Buffer.from('rd'), Buffer.from(cnode.clientId.toString())])
}

function buildDeviceAttrs(shepherd: CoapShepherd, req: IncomingMessage): IDeviceAttrs | false {
  let devAttrs: any = {}

  // 'ep=clientName&lt=86400&lwm2m=1.0.0'
  const query = req.url ? req.url.split('?')[1] : undefined

  const queryParams: any[] = query ? query.split('&') : undefined
  const invalidAttrs = []
  let obj

  _.forEach(queryParams, (queryParam, idx) => {
    queryParams[idx] = queryParam.split('=')
  })

  _.forEach(queryParams, (queryParam) => {
    if (queryParam[0] === 'ep') {
      devAttrs.clientName = queryParam[1]
    } else if (queryParam[0] === 'lt') {
      devAttrs.lifetime = parseInt(queryParam[1])
    } else if (queryParam[0] === 'lwm2m') {
      devAttrs.version = queryParam[1]
    } else if (queryParam[0] === 'mac') {
      devAttrs.mac = queryParam[1]
    } else if (queryParam[0] === 'b') {
      // [TODO]
    } else {
      invalidAttrs.push(queryParam[0])
    }
  })

  devAttrs.ip = req.rsinfo.address
  devAttrs.port = req.rsinfo.port

  if (req.payload.length !== 0) {
    debug(`REGISTRY -> PAYLOAD :%s`, String(req.payload))
    obj = helpers.getObjListOfSo(String(req.payload))
    devAttrs.objList = obj.list
    devAttrs.ct = obj.opts.ct
    devAttrs.heartbeatEnabled = obj.opts.hb
  }

  if (devAttrs.clientName && 'function' === typeof shepherd.config.clientNameParser) {
    devAttrs.clientName = shepherd.config.clientNameParser(devAttrs.clientName)
  }

  if (invalidAttrs.length > 0) {
    devAttrs = false
  }

  return devAttrs // { clientName: 'clientName', lifetime: 86400, version: '1.0.0', objList: { "1": [] }}
}

function buildChkAttrs(req: IncomingMessage) {
  let chkAttrs: any = {}

  const // 'chk=out&t=300'
    query = req.url ? req.url.split('?')[1] : undefined

  const queryParams: any[] = query ? query.split('&') : undefined
  const invalidAttrs = []

  _.forEach(queryParams, (queryParam, idx) => {
    queryParams[idx] = queryParam.split('=')
  })

  _.forEach(queryParams, (queryParam) => {
    if (queryParam[0] === 'chk') {
      if (queryParam[1] === 'in') chkAttrs.sleep = false
      else if (queryParam[1] === 'out') chkAttrs.sleep = true
    } else if (queryParam[0] === 't') {
      chkAttrs.duration = Number(queryParam[1])
    } else {
      invalidAttrs.push(queryParam[0])
    }
  })

  if (invalidAttrs.length > 0) {
    chkAttrs = false
  }

  return chkAttrs
}
