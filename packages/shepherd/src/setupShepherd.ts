import Q from 'q'
import _ from 'lodash'
import {registerFormat, Server, updateTiming, createServer, Agent} from 'coap'
import network from 'network'

import {reqHandler} from './reqHandler'
import {CoapNode} from './CoapNode'
import {CONSTANTS} from '@hollowy/coap-helpers'
import {CoapShepherd} from './CoapShepherd'
import {Callback, ICoapRequestParams, INet} from './types'
import {IncomingMessage, OutgoingMessage, setGlobalAgent, setGlobalAgentV6} from 'coap'
import {Socket} from 'dgram'

const debug = require('debug')('@hollowy/Shepherd:INIT')

export function setupShepherd(shepherd: CoapShepherd, callback?: Callback<void>): Q.Promise<void> {
  const deferred = Q.defer<void>()

  debug('CoapShepherd Booting...')

  registerFormat('application/tlv', 11542) // Leshan TLV binary Content-Formats
  registerFormat('application/json', 11543) // Leshan JSON Numeric Content-Formats

  updateTiming({
    ackTimeout: 0.25,
    ackRandomFactor: 1.0,
    maxRetransmit: 3,
    maxLatency: 2,
  })

  _coapServerStart(shepherd)
    .then((server) => {
      debug('Create a coap server for shepherd.')
      shepherd.enabled = true
      shepherd.server = server
      return _testRequestServer(shepherd)
    })
    .then(() => {
      debug('CoapServer Testing Done.')
      return _loadNodesFromDB(shepherd)
    })
    .then(() => {
      debug('Loading cnodes from database done.')
      return _updateNetInfo(shepherd)
    })
    .then(() => {
      debug('CoapShepherd is up and ready.')
      deferred.resolve()
    })
    .fail((err) => {
      debug(err)
      deferred.reject(err)
    })
    .done()

  return deferred.promise.nodeify(callback)
}

function _coapServerStart(shepherd: CoapShepherd, callback?: Callback<Server>): Q.Promise<Server> {
  const deferred = Q.defer<Server>()

  const server = createServer({type: shepherd.config.connectionType})

  server.on('request', (req: IncomingMessage, rsp: OutgoingMessage) => {
    if (!_.isEmpty(req.payload)) {
      // @ts-ignore
      req.payload = req.payload.toString()
    }

    reqHandler(shepherd, req, rsp)
  })

  server.listen(Number(shepherd.netInfo.port), (err) => {
    if (err) deferred.reject(err)
    else deferred.resolve(server)
  })

  if (shepherd.config.connectionType === 'udp6') {
    const agentV6 = new Agent({
      type: shepherd.config.connectionType,
      socket: server._sock as Socket,
    })
    setGlobalAgentV6(agentV6)
    shepherd.agent = agentV6
  } else {
    const agent = new Agent({
      type: shepherd.config.connectionType,
      socket: server._sock as Socket,
    })
    setGlobalAgent(agent)
    shepherd.agent = agent
  }

  return deferred.promise.nodeify(callback)
}

function _testRequestServer(shepherd: CoapShepherd): Q.Promise<void> {
  const deferred = Q.defer<void>()

  let reqOdj: ICoapRequestParams = {
    hostname: shepherd.netInfo.ip,
    port: shepherd.netInfo.port,
    pathname: '/test',
    method: 'GET',
  }

  debug('Coap Server Testing Start.')
  shepherd
    .request(reqOdj)
    .then((rsp) => {
      debug('Coap server testing request done.')
      if (rsp.code === CONSTANTS.RSP.content && String(rsp.payload) === '_test') {
        reqOdj = null
        deferred.resolve()
      } else {
        deferred.reject(new Error('shepherd client test error'))
      }
    })
    .fail((err) => {
      deferred.reject(err)
    })
    .done()

  return deferred.promise
}

function _loadNodesFromDB(shepherd: CoapShepherd, callback?: Callback<CoapShepherd>): Q.Promise<CoapShepherd> {
  const deferred = Q.defer<CoapShepherd>()

  shepherd.storage
    .loadAll()
    .then((devAttrsList) => {
      devAttrsList.forEach((devAttrs) => {
        shepherd.registry[devAttrs.clientName] = new CoapNode(shepherd, devAttrs)
      })
    })
    .done(
      () => {
        deferred.resolve(shepherd)
      },
      (err) => {
        deferred.reject(err)
      },
    )

  return deferred.promise.nodeify(callback)
}

function _updateNetInfo(shepherd: CoapShepherd, callback?: Callback): Q.Promise<INet> {
  const deferred = Q.defer<INet>()

  network.get_active_interface((err, obj) => {
    if (err) return deferred.reject(err)

    shepherd.netInfo.intf = obj.name
    shepherd.netInfo.ip = obj.ip_address
    shepherd.netInfo.mac = obj.mac_address
    shepherd.netInfo.routerIp = obj.gateway_ip
    deferred.resolve(_.cloneDeep(shepherd.netInfo))
  })

  return deferred.promise.nodeify(callback)
}
