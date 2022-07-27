/***************************************************
 * Created by nanyuantingfeng on 2022/3/11 15:19. *
 ***************************************************/
import {helpers, CONSTANTS} from '@hollowy/coap-helpers'
import {CoapNode} from './CoapNode'
import {IncomingMessage, OutgoingMessage} from 'coap'
import _ from 'lodash'
import {heartbeat} from './helpers'
import {IOptType, IRSInfo, IServerInfo, KEY} from './types'

const debug = require('debug')('coap-node:reqHdlr')

const {TTYPE, TAG, RSP} = CONSTANTS

export default function reqHandler(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage) {
  let optType = reqParser(req)
  let bootstrapping = cn._bootstrapping && req.rsinfo.address === cn.bsServer.ip && req.rsinfo.port === cn.bsServer.port
  let serverInfo = findServer(cn, req.rsinfo)
  let bsSequence = false
  let reqHandler

  switch (optType) {
    case 'read':
      reqHandler = forRead
      break
    case 'discover':
      reqHandler = forDiscover
      break
    case 'write':
      if (bootstrapping) {
        bsSequence = true
        reqHandler = forBsWrite
      } else {
        reqHandler = forWrite
      }
      break
    case 'writeAttr':
      reqHandler = forWriteAttr
      break
    case 'execute':
      reqHandler = forExecute
      break
    case 'observe':
      reqHandler = forObserve
      break
    case 'cancelObserve':
      reqHandler = forCancelObserve
      break
    case 'ping':
      reqHandler = forPing
      break
    case 'create':
      reqHandler = forCreate
      break
    case 'delete':
      if (bootstrapping) {
        bsSequence = true
        reqHandler = forBsDelete
      } else {
        reqHandler = forDelete
      }
      break
    case 'finish':
      if (bootstrapping) {
        bsSequence = true
        reqHandler = forFinish
      } else {
        rsp.reset()
      }
      break
    case 'announce':
      reqHandler = forAnnounce
      break
    case 'empty':
      rsp.reset()
      break
    default:
      break
  }

  if (!serverInfo || (cn._bootstrapping && !bsSequence))
    // [FIXIT]
    rsp.reset()
  else if (reqHandler) setImmediate(() => reqHandler(cn, req, rsp, serverInfo))
}

function forRead(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage) {
  let pathObj = helpers.getPathIdKey(req.url)
  let target = cn._target(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid)
  let dataAndOpt

  function readCallback(err, data) {
    if (err) {
      rsp.code = data === TAG.unreadable || data === TAG.exec ? RSP.notallowed : RSP.badreq
      rsp.end(data)
    } else {
      rsp.code = RSP.content
      dataAndOpt = getRspDataAndOption(req, data)
      rsp.setOption('Content-Format', dataAndOpt.option['Content-Format'])
      rsp.end(dataAndOpt.data)
    }
  }

  if (pathObj.oid === 0 || pathObj.oid === 'lwm2mSecurity') {
    rsp.code = RSP.notallowed
    rsp.end()
  } else if (!target.exist) {
    rsp.code = RSP.notfound
    rsp.end()
  } else if (target.type === TTYPE.obj) {
    cn.so.dump(pathObj.oid as KEY, {restrict: true}, readCallback)
  } else if (target.type === TTYPE.inst) {
    cn.so.dump(pathObj.oid as KEY, pathObj.iid as KEY, {restrict: true}, readCallback)
  } else if (target.type === TTYPE.rsc) {
    cn.so.read(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid as KEY, {restrict: true}, readCallback)
  }
}

function forDiscover(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage, serverInfo: IServerInfo) {
  let pathObj = helpers.getPathIdKey(req.url)
  let target = cn._target(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid)
  let rspPayload

  if (!target.exist) {
    rsp.code = RSP.notfound
    rsp.end()
  } else {
    rspPayload = buildAttrsAndResource(cn, serverInfo.shortServerId, pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid as KEY)
    rsp.code = RSP.content
    rsp.setOption('Content-Format', 'application/link-format')
    rsp.end(rspPayload)
  }
}

function forBsWrite(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage) {
  let pathObj = helpers.getPathIdKey(req.url)
  let target = cn._target(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid)
  let value = getReqData(req, target.pathKey as unknown as string)
  let obj = {}

  // if req come from bootstrap server, should create object instance
  if (target.type === TTYPE.obj) {
    rsp.code = RSP.notallowed
    rsp.end()
  } else if (target.type === TTYPE.inst) {
    cn.create(pathObj.oid as KEY, pathObj.iid as KEY, value)
    rsp.code = RSP.changed
    rsp.end()
  } else {
    obj[pathObj.rid as KEY] = value
    cn.create(pathObj.oid as KEY, pathObj.iid as KEY, obj)
    rsp.code = RSP.changed
    rsp.end()
  }
}

function forWrite(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage) {
  let pathObj = helpers.getPathIdKey(req.url)
  let target = cn._target(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid)
  let value = getReqData(req, target.pathKey as unknown as string)

  function writeCallback(err, data) {
    if (err) rsp.code = data === TAG.unwritable || data === TAG.exec ? RSP.notallowed : RSP.badreq
    else rsp.code = RSP.changed

    req.headers.Accept = 'application/json'
    let dataAndOpt = getRspDataAndOption(req, data)
    rsp.setOption('Content-Format', dataAndOpt.option['Content-Format'])
    rsp.end(dataAndOpt.data)
    // rsp.end();
  }

  if (!target.exist) {
    rsp.code = RSP.notfound
    rsp.end()
  } else if (target.type === TTYPE.obj) {
    rsp.code = RSP.notallowed
    rsp.end()
  } else if (target.type === TTYPE.inst) {
    cn._writeInst(pathObj.oid as KEY, pathObj.iid as KEY, value, writeCallback)
  } else {
    cn.so.write(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid as KEY, value, {restrict: true}, writeCallback)
  }
}

function forWriteAttr(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage, serverInfo: IServerInfo) {
  let pathObj = helpers.getPathIdKey(req.url)
  let target = cn._target(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid)
  let attrs = helpers.buildRptAttr(req)

  if (!target.exist) {
    rsp.code = RSP.notfound
    rsp.end()
  } else if (attrs === false) {
    rsp.code = RSP.badreq
    rsp.end()
  } else {
    cn._setAttrs(serverInfo.shortServerId, pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid as KEY, attrs)
    rsp.code = RSP.changed
    rsp.end()
  }
}

function forExecute(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage) {
  let pathObj = helpers.getPathIdKey(req.url)
  let target = cn._target(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid)
  let argus = helpers.getArrayArgs(String(req.payload))

  if (!target.exist) {
    rsp.code = RSP.notfound
    rsp.end()
  } else if (argus === false) {
    rsp.code = RSP.badreq
    rsp.end()
  } else if (target.type === TTYPE.obj || target.type === TTYPE.inst) {
    rsp.code = RSP.notallowed
    rsp.end()
  } else {
    cn.execute(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid as KEY, argus as any[], (err, data) => {
      if (err) rsp.code = data === TAG.unexecutable ? RSP.notallowed : RSP.badreq
      else rsp.code = RSP.changed

      req.headers.Accept = 'application/json'
      let dataAndOpt = getRspDataAndOption(req, data)
      rsp.setOption('Content-Format', dataAndOpt.option['Content-Format'])
      rsp.end(dataAndOpt.data)
      // rsp.end();
    })
  }
}

function forObserve(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage, serverInfo: IServerInfo) {
  let pathObj = helpers.getPathIdKey(req.url)
  let ssid = serverInfo.shortServerId
  let target = cn._target(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid)
  let rAttrs = cn._getAttrs(ssid, pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid)
  let dataAndOpt

  function enableReport(oid, iid, rid, format, rsp) {
    cn._enableReport(ssid, oid, iid, rid, format, rsp, (err, val) => {
      if (err) {
        rsp.statusCode = val === TAG.unreadable || val === TAG.exec ? RSP.notallowed : RSP.notfound
        rsp.end(val)
      } else {
        rsp.statusCode = RSP.content
        dataAndOpt = getRspDataAndOption(req, val)
        rsp.setOption('Content-Format', dataAndOpt.option['Content-Format'])
        rsp.write(dataAndOpt.data)
        cn.emit('observe', {shortServerId: ssid, path: target.pathKey})
      }
    })
  }

  if (pathObj.oid === 'heartbeat') {
    heartbeat(cn, ssid, true, rsp)
    rsp.statusCode = RSP.content
    rsp.write('hb')
  } else if (!target.exist) {
    rsp.statusCode = RSP.notfound
    rsp.end()
  } else if (target.type === TTYPE.obj) {
    rsp.statusCode = RSP.notallowed
    rsp.end()
  } else if (serverInfo.reporters[target.pathKey as unknown as string]) {
    cn._disableReport(ssid, pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid as KEY, (_err) => {
      enableReport(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid, req.headers.Accept, rsp)
    })
  } else {
    enableReport(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid, req.headers.Accept, rsp)
  }
}

function forCancelObserve(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage, serverInfo: IServerInfo) {
  const pathObj = helpers.getPathIdKey(req.url)
  const target = cn._target(pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid)

  if (pathObj.oid === 'heartbeat') {
    heartbeat(cn, serverInfo.shortServerId, false)
    rsp.code = RSP.content
    rsp.end()
  } else if (!target.exist) {
    rsp.code = RSP.notfound
    rsp.end()
  } else if (target.type === TTYPE.obj) {
    rsp.statusCode = RSP.notallowed
    rsp.end()
  } else {
    cn._disableReport(serverInfo.shortServerId, pathObj.oid as KEY, pathObj.iid as KEY, pathObj.rid as KEY, function (err, _val) {
      if (err) rsp.code = RSP.notfound
      else rsp.code = RSP.content

      rsp.end()
    })
  }
}

function forPing(_cn: CoapNode, _req: IncomingMessage, rsp: OutgoingMessage, serverInfo: IServerInfo) {
  rsp.code = serverInfo.registered ? RSP.content : RSP.notallowed
  rsp.end()
}

function forCreate(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage) {
  let pathObj = helpers.getPathIdKey(req.url)
  let target = cn._target(pathObj.oid as KEY, pathObj.iid as KEY)
  let data = getReqData(req, target.pathKey as unknown as string)
  let iid = Object.keys(data)[0]
  let value = data[iid]

  if (!target.exist) {
    rsp.code = RSP.badreq
    rsp.end()
  } else {
    cn.create(pathObj.oid as KEY, iid, value, (err, _data) => {
      if (err) rsp.code = RSP.badreq
      else rsp.code = RSP.created
      rsp.end()
    })
  }
}

function forBsDelete(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage) {
  let pathObj = helpers.getPathIdKey(req.url)
  let objList
  let oid

  if (!_.isNil(pathObj.oid) && !_.isNil(pathObj.iid)) {
    cn.delete(pathObj.oid, pathObj.iid)
    rsp.code = RSP.deleted
    rsp.end()
  } else {
    objList = cn.so.objectList()
    _.forEach(objList, (obj) => {
      oid = obj.oid
      switch (oid) {
        case 0:
        case 1:
        case 2:
        case 4:
        case 5:
        case 6:
        case 7:
          _.forEach(obj.iid, (iid) => {
            cn.delete(oid, iid)
          })
          delete cn.so[helpers.oidKey(oid)]
          break

        default:
          break
      }
    })

    rsp.code = RSP.deleted
    rsp.end()
  }
}

function forDelete(cn: CoapNode, req: IncomingMessage, rsp: OutgoingMessage) {
  let pathObj = helpers.getPathIdKey(req.url)

  if (_.isNil(pathObj.oid) && _.isNil(pathObj.iid)) {
    cn.delete(pathObj.oid as unknown as KEY, pathObj.iid as unknown as KEY, (err) => {
      if (err) rsp.code = RSP.badreq
      else rsp.code = RSP.deleted
      rsp.end()
    })
  } else {
    rsp.code = RSP.notallowed
    rsp.end()
  }
}

function forFinish(cn: CoapNode, _req: IncomingMessage, rsp: OutgoingMessage) {
  let securityObjs = cn.so.dumpSync('lwm2mSecurity')
  let serverObjs = cn.so.dumpSync('lwm2mServer')
  let lwm2mServerURI
  let serverInfo

  rsp.code = RSP.changed
  rsp.end('finish')

  cn._bootstrapping = false
  cn.emit('bootstrapped')
}

function forAnnounce(cn: CoapNode, req: IncomingMessage, _rsp: OutgoingMessage) {
  cn.emit('announce', req.payload)
}

/*********************************************************
 * Private function                                      *
 *********************************************************/
function reqParser(req: IncomingMessage): IOptType {
  let optType

  if (req.code === '0.00' && req._packet.confirmable && req.payload.length === 0) {
    optType = 'empty'
  } else {
    switch (req.method) {
      case 'GET':
        if (req.headers.Observe === 0) optType = 'observe'
        else if (req.headers.Observe === 1) optType = 'cancelObserve'
        else if (req.headers.Accept === 'application/link-format') optType = 'discover'
        else optType = 'read'
        break
      case 'PUT':
        if (req.headers['Content-Format']) optType = 'write'
        else optType = 'writeAttr'
        break
      case 'POST':
        if (req.url === '/ping') optType = 'ping'
        else if (req.url === '/bs') optType = 'finish'
        else if (req.url === '/announce') optType = 'announce'
        else if (req.headers['Content-Format']) optType = 'create'
        else optType = 'execute'
        break
      case 'DELETE':
        optType = 'delete'
        break
      default:
        optType = 'empty'
        break
    }
  }

  return optType
}

// [TODO]
function getRspDataAndOption(req: IncomingMessage, originalData: any) {
  let format
  let data

  if (req.headers.Accept === 'text/plain') {
    format = 'text/plain'
    if (_.isBoolean(originalData)) data = originalData ? '1' : '0'
    else data = originalData.toString()
  } else if (req.headers.Accept === 'application/json') {
    format = 'application/json'
    data = helpers.encodeJson(req.url, originalData)
  } else {
    format = 'application/tlv'
    data = helpers.encodeTlv(req.url, originalData)
  }

  return {data, option: {'Content-Format': format}}
}

// [TODO]
function getReqData(req: IncomingMessage, path: string) {
  let data

  if (req.headers['Content-Format'] === 'application/json') {
    data = helpers.decodeJson(path, req.payload)
  } else if (req.headers['Content-Format'] === 'application/tlv') {
    data = helpers.decodeTlv(path, req.payload)
  } else {
    data = String(req.payload)
  }

  return data
}

function buildAttrsAndResource(cn: CoapNode, ssid: KEY, oid: KEY, iid: KEY, rid: KEY) {
  let attrs = cn._getAttrs(ssid, oid, iid, rid)
  let allowedAttrs = ['pmin', 'pmax', 'gt', 'lt', 'stp']
  let target = cn._target(oid, iid, rid)
  let value
  let data

  if (!_.isNil(iid)) value = cn.getSmartObject().dumpSync(oid, iid)
  else value = cn.getSmartObject().dumpSync(oid)

  data = helpers.encodeLinkFormat(target.pathKey as unknown as string, value, attrs)

  return data
}

function findServer(cn: CoapNode, rsinfo: IRSInfo) {
  let data

  _.forEach(cn.serversInfo, (serverInfo, _ssid) => {
    if (serverInfo.ip === rsinfo.address && serverInfo.port === rsinfo.port) data = serverInfo
  })

  if (!data) if (cn.bsServer.ip === rsinfo.address && cn.bsServer.port === rsinfo.port) data = cn.bsServer

  return data
}
