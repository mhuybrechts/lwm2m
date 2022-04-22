import EventEmitter from 'events'
import Q from 'q'
import proving from 'proving'
import _ from 'lodash'
import {Storage} from './Storage'
import {StorageNeDB} from './StorageNeDB'
import {helpers, CONSTANTS} from '@hollowy/coap-helpers'

import defaultConfig from './config'
import {setupShepherd} from './setupShepherd'
import {Callback, IAcceptDeviceIncoming, ICoapRequestParams, IConfig, IDeviceInfo, INet, IStatus} from './types'

import {globalAgent, updateTiming, Agent, IncomingMessage, Server, request} from 'coap'
import {CoapNode} from './CoapNode'

const debug = require('debug')('@hollowy/Shepherd')

export class CoapShepherd extends EventEmitter {
  public clientIdCount: number
  public netInfo: INet
  public config: IConfig
  public agent: Agent
  public registry: Record<string, CoapNode>
  public server: Server
  public enabled: boolean
  public joinable: boolean
  public storage: Storage
  public acceptDeviceIncoming: IAcceptDeviceIncoming

  _hbChecker: NodeJS.Timeout
  _permitJoinTime: number
  _permitJoinTimer: NodeJS.Timeout | any
  _messageDisposer: () => void

  constructor(config?: Partial<IConfig>) {
    super()

    this.clientIdCount = 1
    this._setConfig(config)

    this.netInfo = {
      intf: '',
      ip: this.config.ip,
      port: this.config.port,
      mac: '',
      routerIp: '',
    }

    this.agent = globalAgent
    this.registry = {}
    this.server = null

    this.enabled = false
    this.joinable = false
    this._hbChecker = null
    this._permitJoinTime = 0
    this._permitJoinTimer = null

    updateTiming({
      maxLatency: (this.config.reqTimeout - 47) / 2,
    })

    this.acceptDeviceIncoming = (devInfo, callback) => {
      // Override at will.
      setImmediate(() => callback(null, true /*accepted = true*/))
    }
  }

  start(callback?: Callback<void>): Q.Promise<void> {
    const deferred = Q.defer<void>()

    if (!this.enabled) {
      setupShepherd(this)
        .then(() => {
          this.hbCheck(true)
          this._fire('ready')
          deferred.resolve()
        })
        .fail((err) => {
          this.server = null
          this.enabled = false
          deferred.reject(err)
        })
        .done(() => {
          this._messageDisposer = distributeMessage(this)
        })
    } else {
      deferred.resolve()
    }

    return deferred.promise.nodeify(callback)
  }

  stop(callback?: Callback<void>): Q.Promise<void> {
    const deferred = Q.defer<void>()

    if (!this.enabled) {
      deferred.resolve()
    } else {
      if (!this.server) {
        deferred.reject(new Error('server does not exist.'))
      } else {
        this.server.close(() => {
          this.server = null
          this.enabled = false
          this.agent._doClose() // [FIXIT]
          this.hbCheck(false)
          this._messageDisposer?.()
          this._messageDisposer = null
          deferred.resolve()
        })
      }
    }

    return deferred.promise.nodeify(callback)
  }

  reset(mode?: boolean, callback?: Callback<void>): Q.Promise<void> {
    const deferred = Q.defer<void>()

    if (_.isFunction(mode)) {
      callback = mode as any as Callback<void>
      mode = false
    }

    mode = !!mode

    this.stop()
      .then(() => {
        if (mode === true) {
          return this.storage.reset().then(() => {
            debug('Database cleared.')
            return this.start()
          })
        } else return this.start()
      })
      .done(deferred.resolve, deferred.reject)

    return deferred.promise.nodeify(callback)
  }

  find(clientName: string): CoapNode {
    proving.string(clientName, 'clientName should be a string.')

    return this.registry[clientName]
  }

  findByMacAddr(macAddress: string): CoapNode[] {
    proving.string(macAddress, 'macAddr should be a string.')

    return _.filter(this.registry, (cnode: CoapNode) => cnode.mac === macAddress)
  }

  findByClientId(id: string | number): CoapNode {
    proving.stringOrNumber(id, 'id should be a string or a number.')

    return _.find(this.registry, (cnode: CoapNode) => cnode.clientId == id)
  }

  findByLocationPath(path: string): CoapNode {
    proving.string(path, 'path should be a string.')

    return _.find(this.registry, (cnode) => cnode.locationPath === path)
  }

  permitJoin(time: number): boolean {
    if (!_.isUndefined(time)) proving.number(time, 'time should be a number if given.')

    if (!this.enabled) {
      this._permitJoinTime = 0
      return false
    }

    time = time || 0

    if (!time) {
      this.joinable = false
      this._permitJoinTime = 0
      this._fire('permitJoining', this._permitJoinTime)

      if (this._permitJoinTimer) {
        clearInterval(this._permitJoinTimer)
        this._permitJoinTimer = null
      }

      return true
    }

    if (this.joinable && this._permitJoinTimer && this._permitJoinTimer._idleTimeout !== -1) {
      clearInterval(this._permitJoinTimer)
      this._permitJoinTimer = null
    }

    this.joinable = true
    this._permitJoinTime = Math.floor(time)
    this._fire('permitJoining', this._permitJoinTime)

    this._permitJoinTimer = setInterval(() => {
      this._permitJoinTime -= 1

      if (this._permitJoinTime === 0) {
        this.joinable = false
        clearInterval(this._permitJoinTimer)
        this._permitJoinTimer = null
      }

      this._fire('permitJoining', this._permitJoinTime)
    }, 1000)

    return true
  }

  alwaysPermitJoin(permit: boolean): boolean {
    proving.boolean(permit, 'permit should be a boolean.')

    if (!this.enabled) return false

    this.joinable = permit

    if (this._permitJoinTimer) {
      clearInterval(this._permitJoinTimer)
      this._permitJoinTimer = null
    }

    return true
  }

  list(): IDeviceInfo[] {
    const devList = []

    _.forEach(this.registry, (cnode: CoapNode) => {
      const rec = cnode.dumpSummary()
      rec.status = cnode.status
      devList.push(rec)
    })

    return devList
  }

  request(reqObj: ICoapRequestParams, callback?: Callback): Q.Promise<IncomingMessage> {
    proving.object(reqObj, 'reqObj should be an object.')

    const deferred = Q.defer<IncomingMessage>()

    if (!reqObj.hostname || !reqObj.port || !reqObj.method) {
      deferred.reject(new Error('bad reqObj.'))
      return deferred.promise.nodeify(callback)
    }

    if (!this.enabled) {
      deferred.reject(new Error('server does not enabled.'))
    } else {
      if (!_.isNil(reqObj.payload)) {
        /* reqObj.payload = reqObj.payload*/
      } else reqObj.payload = null

      coapRequest(reqObj, this.agent).done(deferred.resolve, deferred.reject)
    }

    return deferred.promise.nodeify(callback)
  }

  announce(msg: string, callback?: Callback<string>): Q.Promise<string> {
    proving.string(msg, 'msg should be an string.')

    const deferred = Q.defer<string>()

    let count = Object.keys(this.registry).length

    const reqObj = {
      hostname: null,
      port: null,
      pathname: '/announce',
      method: 'POST',
      payload: msg,
    }

    const reqWithoutRsp = (reqObj) => {
      const req = this.agent.request(reqObj)

      req.end(reqObj.payload)
      this.agent.abort(req)
      count -= 1

      if (count === 0) deferred.resolve(msg)
    }

    _.forEach(this.registry, (cnode) => {
      reqObj.hostname = cnode.ip
      reqObj.port = cnode.port
      setImmediate(() => reqWithoutRsp(reqObj))
    })

    return deferred.promise.nodeify(callback)
  }

  remove(clientName: string, callback?: Callback<string>): Q.Promise<string> {
    const deferred = Q.defer<string>()
    const cnode = this.find(clientName)
    let mac: string

    if (cnode) {
      mac = cnode.mac
      cnode.setStatus('offline')
      cnode.lifeCheck(false)
      this.storage.remove(cnode).done(
        () => {
          cnode._registered = false
          cnode.so = null
          cnode.cancelAllObservers()
          this.registry[cnode.clientName] = null
          delete this.registry[cnode.clientName]
          this.clientIdCount -= 1
          this._fire('message', {
            type: 'device::leaving',
            cnode: clientName,
            data: mac,
          })

          deferred.resolve(clientName)
        },
        (err) => {
          deferred.reject(err)
        },
      )
    } else {
      deferred.resolve()
    }

    return deferred.promise.nodeify(callback)
  }

  setAcceptDeviceIncoming(predicate: IAcceptDeviceIncoming): boolean {
    proving.fn(predicate, 'predicate must be a function')
    this.acceptDeviceIncoming = predicate
    return true
  }

  newClientId(id?: number): number {
    if (!_.isUndefined(id)) proving.number(id, 'id should be a number.')

    const clientId = id || this.clientIdCount

    if (this.findByClientId(clientId)) {
      this.clientIdCount += 1
      return this.newClientId()
    } else {
      this.clientIdCount += 1
      return clientId
    }
  }

  private _fire(msg: string, data?: any) {
    setImmediate(() => this.emit(msg, data))
  }

  private _setConfig(config: Partial<IConfig>) {
    if (undefined !== config) proving.object(config, 'config should be an object if given.')

    this.config = {...defaultConfig, ...config}
    this.config.ip = this.config.ip ?? ''
    this.config.port = this.config.port ?? 5683
    this.config.reqTimeout = this.config.reqTimeout ?? 60
    this.config.hbTimeout = this.config.hbTimeout ?? 60

    if (this.config.storage !== undefined && this.config.storage !== null && !(this.config.storage instanceof Storage))
      throw new TypeError('config.storage should be an StorageInterface if given.')

    this.storage = this.config.storage ?? new StorageNeDB(this.config.defaultDBPath)
  }

  hbCheck(enabled: boolean) {
    clearInterval(this._hbChecker)
    this._hbChecker = null
    if (enabled) {
      this._hbChecker = setInterval(() => {
        _.forEach(this.registry, (cnode) => {
          const now = helpers.getTime()

          if (cnode.status === 'online' && cnode.heartbeatEnabled && now - cnode._heartbeat > this.config.hbTimeout) {
            cnode.setStatus('offline')

            cnode.ping().done(
              (rspObj) => {
                if (rspObj.status === CONSTANTS.RSP.content) {
                  cnode._heartbeat = now
                } else if (cnode.status !== 'online') {
                  cnode.cancelAllObservers()
                }
              },
              (err) => {
                cnode.cancelAllObservers()
                this._fire('error', err)
              },
            )
          }
        })
      }, this.config.hbTimeout * 1000)
    }
  }

  on(eventName: 'permitJoining', listener: (permitJoinTime: number) => void): this
  on(eventName: 'ready', listener: () => void): this
  on(eventName: 'error', listener: (error: Error) => void): this
  on(
    eventName: 'message',
    listener: (
      message:
        | {type: 'device::status'; cnode: CoapNode; data: IStatus}
        | {type: 'device::incoming' | 'device::update' | 'device::notify'; cnode: CoapNode; data?: any}
        | {type: 'device::leaving'; cnode: string; data: string}
        | {type: 'lookup'; cnode: string; data: string},
    ) => void,
  ): this
  on(eventName: 'device::status', listener: (cnode: CoapNode, data: IStatus) => void): this
  on(
    eventName: 'device::incoming' | 'device::update' | 'device::notify',
    listener: (cnode: CoapNode, data: any) => void,
  ): this
  on(eventName: 'device::leaving', listener: (clientName: string, mac: string) => void): this
  on(eventName: 'lookup', listener: (clientName: string) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(eventName, listener)
  }
}

function coapRequest(reqObj: ICoapRequestParams, agent: Agent): Q.Promise<IncomingMessage> {
  const deferred = Q.defer<IncomingMessage>()

  reqObj.agent = agent

  const req = request(reqObj)

  if (!_.isNil(reqObj.observe) && reqObj.observe === false) req.setOption('Observe', 1)

  req.on('response', (rsp: IncomingMessage) => {
    debug(
      'RSP <-- %s, token: %s, status: %s',
      reqObj.method,
      req._packet ? req._packet.token.toString('hex') : undefined,
      rsp.code,
    )

    if (!_.isEmpty(rsp.payload) && rsp.headers['Content-Format'] === 'application/json') {
      rsp.payload = helpers.decodeJson(reqObj.pathname, rsp.payload)
    } else if (!_.isEmpty(rsp.payload) && rsp.headers['Content-Format'] === 'application/tlv') {
      rsp.payload = helpers.decodeTlv(reqObj.pathname, rsp.payload)
    } else if (!_.isEmpty(rsp.payload) && rsp.headers['Content-Format'] === 'application/link-format') {
      rsp.payload = helpers.decodeLinkFormat(rsp.payload.toString())
    } else if (!_.isEmpty(rsp.payload)) {
      rsp.payload = helpers.checkRescType(reqObj.pathname, rsp.payload.toString())
    }

    deferred.resolve(rsp)
  })

  req.on('error', (err) => {
    if (err.retransmitTimeout) deferred.resolve({code: CONSTANTS.RSP.timeout} as any)
    else deferred.reject(err)
  })

  reqObj.payload ? req.end(reqObj.payload) : req.end()

  debug('REQ --> %s, token: %s', reqObj.method, req._packet ? req._packet.token.toString('hex') : undefined)
  return deferred.promise
}

function distributeMessage(shepherd: CoapShepherd) {
  const fn = (msg) => shepherd.emit(msg.type, msg.cnode, msg.data)
  shepherd.on('message', fn)
  return () => shepherd.off('message', fn)
}
