/***************************************************
 * Created by nanyuantingfeng on 2022/3/11 15:19. *
 ***************************************************/
import url from 'url'
import net from 'net'
import EventEmitter from 'events'
import _ from 'lodash'
import SmartObject from 'smartobject'
import network from 'network'
import {Agent, createServer, IncomingMessage, OutgoingMessage, Server, CoapRequestParams} from 'coap'

import reqHandler from './reqHandler'
import {helpers, CONSTANTS} from '@hollowy/coap-helpers'
import config from './config'
import {setupNode} from './init'
import {Callback, ICoapRequestParams, IConfig, IDevAttrs, INet, IServerInfo, KEY} from './types'
import {checkAndBuildObjList, heartbeat} from './helpers'
import ErrnoException = NodeJS.ErrnoException;

const DEBUG = require('debug')('coap-node')
const DEBUG_REQ = require('debug')('coap-node:REQ')
const DEBUG_RSP = require('debug')('coap-node:RSP')

/*if (process.env.npm_lifecycle_event === 'test') {
  let network = {
    get_active_interface: function (cb) {
      setTimeout(function () {
        if (config.connectionType === 'udp6') {
          cb(null, {
            ip_address: '::1',
            gateway_ip: '::c0a8:0101',
            mac_address: '00:00:00:00:00:00',
          })
        } else {
          cb(null, {
            ip_address: '127.0.0.1',
            gateway_ip: '192.168.1.1',
            mac_address: '00:00:00:00:00:00',
          })
        }
      }, 100)
    },
  }
} else {
  let network = require('network')
}*/
const {TTYPE, TAG, ERR, RSP} = CONSTANTS

export class CoapNode extends EventEmitter {
  public servers: Record<number, Server>
  public serversIdTable: Record<string, {securityIid: string; serverIid: string; shortServerId: string}>
  public serversInfo: Record<KEY, IServerInfo>
  public clientName: string
  public locationPath: string
  public ip: string
  public mac: string
  public port: number
  public version: string
  public lifetime: number
  public bsServer: {ip: string; port: number}
  public objList: any
  public so: SmartObject
  public autoReRegister: boolean
  public _bootstrapping: boolean
  public _sleep: boolean
  public _updater: NodeJS.Timer | null
  public _socketServerChecker: NodeJS.Timer | null
  public _config: IConfig

  constructor(clientName: string, smartObj: SmartObject, devAttrs: Partial<IDevAttrs>) {
    super()

    if (!_.isString(clientName)) throw new TypeError('clientName should be a string.')

    if (!_.isObject(smartObj)) throw new TypeError('smartObj should be a instance of SmartObject Class.')

    devAttrs = devAttrs || ({} as any)

    this.servers = {} // CoAP Server
    this.serversIdTable = {} // LwM2M Servers URI-iid table
    this.serversInfo = {} // LwM2M Servers info
    /*
            shoutId: {
                shortServerId: 10,
                ip: '192.168.1.119',
                port: 5683,
                locationPath: '1a2b',
                registered: true,
                repAttrs: {},
                reporters: {},
                hbPacemaker = null,
                hbStream = { stream: null, port: null, finishCb: null },
                lfsecs = 0
            }
        */

    this.clientName = clientName
    this.locationPath = 'unknown'
    this.ip = 'unknown'
    this.mac = 'unknown'
    this.port = 'unknown' as any
    this.version = devAttrs.version || '1.0'
    this.lifetime = devAttrs.lifetime || 86400
    this.bsServer = {} as any

    this.objList = null
    this.so = smartObj
    this.autoReRegister = devAttrs.autoReRegister || true

    this._bootstrapping = false
    this._sleep = false
    this._updater = null
    this._socketServerChecker = null

    this._config = {...config}

    setupNode(this, devAttrs)
  }

  private _updateNetInfo(callback: Callback<INet | null>) {
    network.get_active_interface((err, obj) => {
      if (err) {
        callback(err, null)
      } else {
        this.ip = obj.ip_address
        this.mac = obj.mac_address
        this.so.set('connMonitor', 0, 'ip', this.ip)
        this.so.set('connMonitor', 0, 'routeIp', obj.gateway_ip || 'unknown')
        callback(null, {
          ip: obj.ip_address,
          mac: obj.mac_address,
          routeIp: obj.gateway_ip,
        } as any)
      }
    })
  }

  getSmartObject(): SmartObject {
    return this.so
  }

  _writeInst(oid: KEY, iid: KEY, value: any, callback: Callback<string | null>) {
    let exist = this.so.has(oid, iid)
    let okey = helpers.oidKey(oid)
    let dump = {}
    let chkErr: null | Error = null
    let count = _.keys(value).length

    if (!exist) {
      callback(ERR.notfound, null)
    } else {
      _.forEach(value, (_rsc, rid) => {
        if (!this.so.isWritable(oid, iid, rid) && oid != 'lwm2mSecurity' && oid != 'lwm2mServer')
          chkErr = chkErr || new Error('Resource is unwritable.')
      })

      if (chkErr) return callback(chkErr, TAG.unwritable)

      _.forEach(value, (rsc, rid) => {
        this.so.write(oid, iid, rid, rsc, (err, data) => {
          count -= 1

          if (err) {
            // [TODO] reply to the original data?
            chkErr = chkErr || err
            dump = data
            count = 0
          } else {
            dump[helpers.ridNumber(oid, rid)] = data
          }

          if (count === 0 && _.isFunction(callback)) return callback(chkErr, dump)
        })
      })
    }
  }

  execute(oid: KEY, iid: KEY, rid: KEY, args: any[], callback: Callback<any>) {
    return this.so.exec(oid, iid, rid, args, callback)
  }

  create(oid: KEY, iid: KEY, resource: object, callback?: Callback<any>) {
    try {
      const oo = this.so.init(oid, iid, resource)
      callback?.(null, oo)
    } catch (e) {
      callback?.(e as ErrnoException, null)
    }
  }

  delete(oid: KEY, iid: KEY, callback?: Callback<any>) {
    try {
      const oo = this.so.remove(oid, iid)
      callback?.(null, oo)
    } catch (e) {
      callback?.(e as ErrnoException, null)
    }
  }

  configure(ip: string, port: number, opts?: any) {
    // opts: { lifetime, pmax, pmin }
    if (!_.isString(ip)) throw new TypeError('ip should be a string.')

    if ((!_.isString(port) && !_.isNumber(port)) || _.isNaN(port))
      throw new TypeError('port should be a string or a number.')

    if (net.isIPv6(ip)) ip = '[' + ip + ']'

    let securityIid
    let serverIid
    let shortServerId
    let serversIdInfo = this.serversIdTable['coap://' + ip + ':' + port]

    if (!opts) opts = {}

    if (serversIdInfo) {
      securityIid = serversIdInfo.securityIid
      serverIid = serversIdInfo.serverIid
      shortServerId = serversIdInfo.shortServerId
    } else {
      securityIid = this._idCounter('securityIid')
      serverIid = this._idCounter('serverIid')
      shortServerId = this._idCounter('shortServerId')

      this.serversIdTable['coap://' + ip + ':' + port] = {
        securityIid: securityIid,
        serverIid: serverIid,
        shortServerId: shortServerId,
      }
    }

    this.so.init('lwm2mSecurity', securityIid, {
      lwm2mServerURI: 'coap://' + ip + ':' + port,
      bootstrapServer: false,
      securityMode: 3,
      pubKeyId: '',
      serverPubKeyId: '',
      secretKey: '',
      shortServerId: shortServerId,
    })

    this.so.init('lwm2mServer', serverIid, {
      shortServerId: shortServerId,
      lifetime: opts.lifetime || this.lifetime,
      defaultMinPeriod: opts.pmax || this._config.defaultMinPeriod,
      defaultMaxPeriod: opts.pmin || this._config.defaultMaxPeriod,
      notificationStoring: false,
      binding: 'U',
    })

    return shortServerId
  }

  bootstrap(ip: string, port: number, callback: Callback<any>) {
    if (!_.isString(ip)) throw new TypeError('ip should be a string.')

    if ((!_.isString(port) && !_.isNumber(port)) || _.isNaN(port))
      throw new TypeError('port should be a string or a number.')

    let self = this

    let reqObj: any = {
      hostname: ip,
      port: port,
      pathname: '/bs',
      method: 'POST',
    }

    let agent = this._createAgent()
    let securityIid = this._idCounter('securityIid')
    let shortServerId = this._idCounter('shortServerId')
    let resetCount = 0
    let rsps = {status: null, data: []}
    let msg

    function setListenerStart(port, msg) {
      if (!agent._sock) {
        startListener(self, port, function (err) {
          if (err) {
            invokeCallBackNextTick(err, null, callback)
          } else {
            self._sleep = false
            // [TODO] .on('_register', cb)
            invokeCallBackNextTick(null, msg, callback)
          }
        })
      } else {
        if (resetCount < 10) {
          resetCount += 1
          setTimeout(() => setListenerStart(port, msg), 10)
        } else {
          invokeCallBackNextTick(new Error('Socket can not be create.'), null, callback)
        }
      }
    }

    reqObj.query = 'ep=' + self.clientName

    self.request(reqObj, agent, function (err, rsp) {
      if (err) {
        invokeCallBackNextTick(err, null, callback)
      } else {
        msg = {status: rsp.code}
        if (rsp.code === RSP.changed) {
          self.bsServer = {
            ip: rsp.rsinfo.address,
            port: rsp.rsinfo.port,
          }

          self.ip = rsp.outSocket.ip
          self.port = rsp.outSocket.port
          self._bootstrapping = true
          setListenerStart(rsp.outSocket.port, msg)
        } else {
          invokeCallBackNextTick(null, msg, callback)
        }
      }
    })
  }

  registerAllCfg(callback: Callback<any>): void {
    let securityObjs = this.so.dumpSync('lwm2mSecurity')
    let serverObjs = this.so.dumpSync('lwm2mServer')
    let requestCount = 0
    let requestInfo: {uri: string, ssid: string}[] = []
    let serverInfo
    let rsps: {status: null | string, data: any[]} = {status: null, data: []}
    let chkErr

    _.forEach(serverObjs, (serverObj, _iid) => {
      _.forEach(securityObjs, (securityObj, _iid) => {
        if (
          !_.isNil(serverObj.shortServerId) &&
          !_.isNil(serverObj.shortServerId) &&
          serverObj.shortServerId === securityObj.shortServerId &&
          !securityObj.bootstrapServer
        ) {
          requestInfo.push({
            uri: securityObj.lwm2mServerURI,
            ssid: securityObj.shortServerId,
          })
          requestCount = requestCount + 1
        }
      })
    })

    if (requestCount === 0) {
      invokeCallBackNextTick(new Error('Do not have any allowed configuration.'), null, callback)
    } else {
      _.forEach(requestInfo, (info, _key) => {
        serverInfo = getServerUriInfo(info.uri)
        this._register(serverInfo.address, serverInfo.port, info.ssid, (err, msg) => {
          requestCount -= 1
          if (err) {
            chkErr = chkErr || err
            requestCount = 0
          } else {
            if (msg.status === RSP.created) rsps.status = rsps.status || RSP.created
            else rsps.status = msg.status
            rsps.data.push({shortServerId: info.ssid, status: msg.status})
          }

          if (requestCount === 0) {
            if (chkErr) invokeCallBackNextTick(chkErr, null, callback)
            else invokeCallBackNextTick(null, rsps, callback)
          }
        })
      })
    }
  }

  register(ip: string, port: number, callback: Callback<any>): void
  register(ip: string, port: number, opts: any, callback: Callback<any>): void
  register(ip: string, port: number, opts: any, callback?: any): void {
    if (_.isFunction(opts)) {
      callback = opts
      opts = undefined
    }

    const ssid = this.configure(ip, port, opts)

    this._register(ip, port, ssid, callback)
  }

  // [FIXME 'hb']
  _register(ip: string, port: number, ssid: KEY, callback: Callback<any>) {
    if (!_.isString(ip)) throw new TypeError('ip should be a string.')

    if ((!_.isString(port) && !_.isNumber(port)) || _.isNaN(port))
      throw new TypeError('port should be a string or a number.')

    let self = this

    let reqObj: ICoapRequestParams = {
      hostname: ip,
      port: port,
      pathname: '/rd',
      payload: checkAndBuildObjList(this, false, {}) as string,
      method: 'POST',
      options: {'Content-Format': 'application/link-format'},
    }

    let agent = this._createAgent()
    let resetCount = 0
    let msg

    function setListenerStart(port: number, msg: any) {
      if (!agent._sock) {
        startListener(self, port, (err) => {
          if (err) {
            invokeCallBackNextTick(err, null, callback)
          } else {
            self._sleep = false
            invokeCallBackNextTick(null, msg, callback)
            self.emit('registered')
          }
        })
      } else {
        if (resetCount < 10) {
          resetCount += 1
          setTimeout(() => setListenerStart(port, msg), 10)
        } else {
          invokeCallBackNextTick(new Error('Socket can not be create.'), null, callback)
        }
      }
    }

    // [TODO] server is exist
    this._updateNetInfo(() => {
      reqObj.query =
        'ep=' + self.clientName + '&lt=' + self.lifetime + '&lwm2m=' + self.version + '&mac=' + self.mac + '&b=U'
      self.request(reqObj, agent, (err, rsp) => {
        if (err) {
          invokeCallBackNextTick(err, null, callback)
        } else {
          msg = {status: rsp.code}

          if (rsp.code === RSP.created) {
            self.serversInfo[ssid] = {
              shortServerId: ssid,
              ip: rsp.rsinfo.address,
              port: rsp.rsinfo.port,
              locationPath: '/rd/' + rsp.headers['Location-Path'],
              registered: true,
              lfsecs: 0,
              repAttrs: {},
              reporters: {},
              hbPacemaker: null,
              hbStream: {stream: null, port: null, finishCb: null},
            }

            self.ip = rsp.outSocket.ip
            self.port = rsp.outSocket.port
            setListenerStart(rsp.outSocket.port, msg)
          } else {
            invokeCallBackNextTick(null, msg, callback)
          }
        }
      })
    })
  }

  update(attrs: Partial<IDevAttrs>, callback: Callback<any>) {
    if (!_.isPlainObject(attrs)) throw new TypeError('attrs should be an object.')

    let requestCount = Object.keys(this.serversInfo).length
    let rsps: {status: string | null, data: any[]} = {status: null, data: []}
    let updateObj: any = {}
    let objListInPlain
    let chkErr

    _.forEach(attrs, (_val, key) => {
      if (key === 'lifetime') {
        // self.so.set('lwm2mServer', 0, 'lifetime', attrs.lifetime);  // [TODO] need to check / multi server
        if (attrs.lifetime !== this.lifetime) {
          this.lifetime = updateObj.lifetime = (attrs.lifetime as number)
        } else {
          chkErr = new Error('The given lifetime is the same as cnode current lifetime.')
        }
      } else {
        chkErr = new Error('There is an unrecognized attribute within the attrs.')
      }
    })

    objListInPlain = checkAndBuildObjList(this, true)

    if (!_.isNil(objListInPlain)) updateObj.objList = objListInPlain

    if (chkErr) {
      invokeCallBackNextTick(chkErr, null, callback)
    } else {
      _.forEach(this.serversInfo, (serverInfo, ssid) => {
        this._update(serverInfo, updateObj, (err, msg) => {
          requestCount -= 1
          if (err) {
            chkErr = chkErr || err
            requestCount = 0
          } else {
            if (msg.status === RSP.changed) rsps.status = rsps.status || RSP.changed
            else rsps.status = msg.status
            rsps.data.push({shortServerId: ssid, status: msg.status})
          }

          if (requestCount === 0) {
            if (chkErr) invokeCallBackNextTick(chkErr, null, callback)
            else invokeCallBackNextTick(null, rsps, callback)
          }
        })
      })
    }
  }

  private _update(serverInfo, attrs, callback: Callback<any>) {
    if (!_.isPlainObject(attrs)) throw new TypeError('attrs should be an object.')

    let self = this

    let reqObj: any = {
      hostname: serverInfo.ip,
      port: serverInfo.port,
      pathname: serverInfo.locationPath,
      query: helpers.buildUpdateQuery(attrs),
      payload: attrs.objList,
      method: 'POST',
    }

    let agent = this._createAgent()
    let resetCount = 0
    let msg

    function setListenerStart(port, msg) {
      if (!agent._sock) {
        startListener(self, port, function (err) {
          if (err) {
            invokeCallBackNextTick(err, null, callback)
          } else {
            self._sleep = false
            invokeCallBackNextTick(null, msg, callback)
          }
        })
      } else {
        if (resetCount < 10) {
          resetCount += 1
          setTimeout(() => setListenerStart(port, msg), 10)
        } else {
          invokeCallBackNextTick(new Error('Socket can not be create.'), null, callback)
        }
      }
    }

    if (attrs.objList) reqObj.options = {'Content-Format': 'application/link-format'}

    if (serverInfo.registered) {
      this.request(reqObj, agent, (err, rsp) => {
        if (err) {
          invokeCallBackNextTick(err, null, callback)
        } else {
          msg = {status: rsp.code}

          if (rsp.code === RSP.changed) {
            self.ip = rsp.outSocket.address
            self.port = rsp.outSocket.port
            setListenerStart(rsp.outSocket.port, msg)
          } else {
            invokeCallBackNextTick(null, msg, callback)
          }
        }
      })
    } else {
      invokeCallBackNextTick(null, {status: RSP.notfound}, callback)
    }
  }

  deregister(callback: Callback<any>): void
  deregister(ssid: KEY, callback: Callback<any>): void
  deregister(ssid: any, callback?: any) {
    let self = this
    let requestCount = Object.keys(this.serversInfo).length
    let rsps: {status: string | null, data: any[]} = {status: null, data: []}
    let chkErr

    function deregister(serverInfo, cb) {
      let reqObj: CoapRequestParams = {
        hostname: serverInfo.ip,
        port: serverInfo.port,
        pathname: serverInfo.locationPath,
        method: 'DELETE',
      }

      if (serverInfo.registered === true) {
        self.request(reqObj, function (err, rsp) {
          if (err) {
            invokeCallBackNextTick(err, null, cb)
          } else {
            let msg = {status: rsp.code}

            if (rsp.code === RSP.deleted) {
              self._disableAllReport(serverInfo.shortServerId)

              // [TODO]
              // _.forEach(self.servers, function (server, key) {
              //     server.close();
              // });

              serverInfo.registered = false
              self.emit('deregistered')
            }

            invokeCallBackNextTick(null, msg, cb)
          }
        })
      } else {
        invokeCallBackNextTick(null, {status: RSP.notfound}, cb)
      }
    }

    if (_.isFunction(ssid)) {
      callback = ssid as any as Callback<any>
      ssid = undefined
    }

    if (_.isNil(ssid)) {
      _.forEach(this.serversInfo, function (serverInfo, ssid) {
        deregister(serverInfo, function (err, msg) {
          requestCount -= 1
          if (err) {
            chkErr = chkErr || err
            requestCount = 0
          } else {
            if (msg.status === RSP.deleted) rsps.status = rsps.status || RSP.deleted
            else rsps.status = msg.status
            rsps.data.push({shortServerId: ssid, status: msg.status})
          }

          if (requestCount === 0) {
            if (chkErr) invokeCallBackNextTick(chkErr, null, callback)
            else invokeCallBackNextTick(null, rsps, callback)
          }
        })
      })
    } else if (this.serversInfo[ssid]) {
      deregister(this.serversInfo[ssid], callback)
    } else {
      invokeCallBackNextTick(null, {status: RSP.notfound}, callback)
    }
  }

  checkin(callback: Callback<any>) {
    let self = this
    let agent = this._createAgent()
    let requestCount = Object.keys(this.serversInfo).length
    let resetCount = 0
    let rsps: {status: null | string, data: any[]} = {status: null, data: []}
    let chkErr

    function setListenerStart(port, msg, cb) {
      if (!agent._sock) {
        startListener(self, port, function (err) {
          if (err) {
            invokeCallBackNextTick(err, null, cb)
          } else {
            invokeCallBackNextTick(null, msg, cb)
          }
        })
      } else {
        if (resetCount < 10) {
          resetCount += 1
          setTimeout(function () {
            setListenerStart(port, msg, cb)
          }, 10)
        } else {
          invokeCallBackNextTick(new Error('Socket can not be create.'), null, cb)
        }
      }
    }

    function checkin(serverInfo, cb) {
      let reqObj: CoapRequestParams = {
        hostname: serverInfo.ip,
        port: serverInfo.port,
        pathname: serverInfo.locationPath,
        query: 'chk=in',
        method: 'PUT',
      }

      if (serverInfo.registered === true) {
        self.request(reqObj, agent, function (err, rsp) {
          if (err) {
            invokeCallBackNextTick(err, null, cb)
          } else {
            let msg = {status: rsp.code}

            if (rsp.code === RSP.changed) {
              self.ip = rsp.outSocket.address
              self.port = rsp.outSocket.port
              self._sleep = false
              setListenerStart(rsp.outSocket.port, msg, cb)
            } else {
              invokeCallBackNextTick(null, msg, cb)
            }
          }
        })
      } else {
        invokeCallBackNextTick(null, {status: RSP.notfound}, cb)
      }
    }

    _.forEach(this.serversInfo, function (serverInfo, ssid) {
      checkin(serverInfo, (err, msg) => {
        requestCount -= 1
        if (err) {
          chkErr = chkErr || err
          requestCount = 0
        } else {
          if (msg.status === RSP.changed) rsps.status = rsps.status || RSP.changed
          else rsps.status = msg.status
          rsps.data.push({shortServerId: ssid, status: msg.status})
        }

        if (requestCount === 0) {
          if (chkErr) invokeCallBackNextTick(chkErr, null, callback)
          else invokeCallBackNextTick(null, rsps, callback)
        }
      })
    })
  }

  checkout(duration: number, callback: Callback<any>): void
  checkout(callback: Callback<any>): void
  checkout(duration: any, callback?: any): void {
    let self = this
    let requestCount = Object.keys(this.serversInfo).length
    let rsps: {status: string | null, data: any[]} = {status: null, data: []}
    let chkErr

    if (_.isFunction(duration)) {
      callback = duration as any as Callback<any>
      duration = undefined
    }

    if (!_.isUndefined(duration) && (!_.isNumber(duration) || _.isNaN(duration)))
      throw new TypeError('duration should be a number if given.')
    else if (!_.isUndefined(callback) && !_.isFunction(callback))
      throw new TypeError('callback should be a function if given.')

    function checkout(serverInfo, cb) {
      let reqObj: CoapRequestParams = {
        hostname: serverInfo.ip,
        port: serverInfo.port,
        pathname: serverInfo.locationPath,
        query: duration ? 'chk=out&t=' + duration : 'chk=out',
        method: 'PUT',
      }

      if (serverInfo.registered === true) {
        self.request(reqObj, function (err, rsp) {
          if (err) {
            invokeCallBackNextTick(err, null, cb)
          } else {
            let msg = {status: rsp.code}

            if (rsp.code === RSP.changed) {
              self._disableAllReport(serverInfo.shortServerId)
              self._sleep = true
              _.forEach(self.servers, function (server, _key) {
                server.close()
              })
            }

            invokeCallBackNextTick(null, msg, cb)
          }
        })
      } else {
        invokeCallBackNextTick(null, {status: RSP.notfound}, cb)
      }
    }

    _.forEach(this.serversInfo, function (serverInfo, ssid) {
      checkout(serverInfo, function (err, msg) {
        requestCount = requestCount - 1
        if (err) {
          chkErr = chkErr || err
          requestCount = 0
        } else {
          if (msg.status === RSP.changed) rsps.status = rsps.status || RSP.changed
          else rsps.status = msg.status
          rsps.data.push({shortServerId: ssid, status: msg.status})
        }

        if (requestCount === 0) {
          if (chkErr) invokeCallBackNextTick(chkErr, null, callback)
          else invokeCallBackNextTick(null, rsps, callback)
        }
      })
    })
  }

  lookup(ssid: KEY, clientName: string, callback: Callback<any>) {
    const serverInfo = this.serversInfo[ssid]

    const reqObj: CoapRequestParams = {
      hostname: serverInfo.ip,
      port: serverInfo.port,
      pathname: '/rd-lookup/ep',
      query: 'ep=' + clientName,
      method: 'GET',
    }

    this.request(reqObj, (err, rsp) => {
      if (err) {
        invokeCallBackNextTick(err, null, callback)
      } else {
        const msg: any = {status: rsp.code}

        if (rsp.code === RSP.content) {
          msg.data = rsp.payload
        }

        invokeCallBackNextTick(null, msg, callback)
      }
    })
  }

  request(reqObj: ICoapRequestParams, ownAgent: Agent, callback: Callback<any>)
  request(reqObj: ICoapRequestParams, callback: Callback<any>)
  request(reqObj: ICoapRequestParams, ownAgent: any, callback?: Callback<any>) {
    if (!_.isPlainObject(reqObj)) throw new TypeError('reqObj should be an object.')

    if (_.isFunction(ownAgent)) {
      callback = ownAgent
      ownAgent = undefined
    }

    let self = this
    let agent: Agent = ownAgent ?? new Agent({type: this._config.connectionType})

    const req = agent.request(reqObj)

    req.on('response', (rsp) => {
      if (!_.isEmpty(rsp.payload)) rsp.payload = rsp.payload.toString()

      if (_.isFunction(callback)) callback(null, rsp)
    })

    req.on('error', (err) => {
      if (!_.isFunction(callback)) self.emit('error', err)
      else if (err.retransmitTimeout) callback(null, {code: RSP.timeout})
      else callback(err, null)
    })

    req.end(reqObj.payload)
  }

  private _createAgent(): Agent {
    return new Agent({type: this._config.connectionType})
  }

  _target(oid: KEY, iid: KEY, rid?: KEY) {
    let okey = helpers.oidKey(oid)

    let trg: {
      type: null | number,
      exist: boolean,
      value: any,
      pathKey: KEY | null,
      oidKey: KEY,
      ridKey: null,
    } = {
      type: null,
      exist: this.so.has(oid, iid, rid),
      value: null,
      pathKey: null,
      oidKey: okey,
      ridKey: null,
    }

    let rkey

    if (!_.isNil(oid)) {
      trg.type = TTYPE.obj
      trg.pathKey = okey
      if (!_.isNil(iid)) {
        trg.type = TTYPE.inst
        trg.pathKey = okey + '/' + iid
        if (!_.isNil(rid)) {
          trg.type = TTYPE.rsc
          rkey = helpers.ridKey(oid, rid)
          trg.ridKey = rkey
          trg.pathKey = okey + '/' + iid + '/' + rkey
        }
      }
    }

    if (trg.exist) {
      if (trg.type === TTYPE.obj) trg.value = this.so.findObject(oid)
      else if (trg.type === TTYPE.inst) trg.value = this.so.findObjectInstance(oid, iid)
      else if (trg.type === TTYPE.rsc) trg.value = this.so.get(oid, iid, rid as KEY)
    }

    return trg
  }

  _setAttrs(ssid: KEY, oid: KEY, iid: KEY, rid: KEY, attrs: any) {
    if (!_.isPlainObject(attrs)) throw new TypeError('attrs should be given as an object.')

    let target = this._target(oid, iid, rid)
    let rAttrs = this._getAttrs(ssid, oid, iid, rid)
    let key = target.pathKey

    rAttrs.pmin = _.isNumber(attrs.pmin) ? attrs.pmin : rAttrs.pmin
    rAttrs.pmax = _.isNumber(attrs.pmax) ? attrs.pmax : rAttrs.pmax
    rAttrs.gt = _.isNumber(attrs.gt) ? attrs.gt : rAttrs.gt
    rAttrs.lt = _.isNumber(attrs.lt) ? attrs.lt : rAttrs.lt
    rAttrs.stp = _.isNumber(attrs.stp) ? attrs.stp : rAttrs.stp

    return this
  }

  _getAttrs(ssid: KEY, oid: KEY, iid: KEY, rid?: KEY) {
    let serverInfo = this.serversInfo[ssid]
    let key = this._target(oid, iid, rid).pathKey as unknown as string
    let defaultAttrs

    defaultAttrs = {
      pmin: this._config.defaultMinPeriod, // [TODO] need to check
      pmax: this._config.defaultMaxPeriod, // [TODO] need to check
      mute: true,
      enable: false,
      lastRpVal: null,
    }

    serverInfo.repAttrs[key] = serverInfo.repAttrs[key] || defaultAttrs

    return serverInfo.repAttrs[key]
  }

  _enableReport(
    ssid: KEY,
    oid: KEY,
    iid: KEY,
    rid: KEY,
    format: string,
    rsp: OutgoingMessage,
    callback: Callback<any>,
  ) {
    let self = this
    let serverInfo = this.serversInfo[ssid]
    let target = this._target(oid, iid, rid)
    let key = target.pathKey as unknown as string
    let rAttrs = this._getAttrs(ssid, oid, iid, rid)
    let pmin = rAttrs.pmin * 1000
    let pmax = rAttrs.pmax * 1000
    let rpt
    let dumper

    if (target.type === TTYPE.inst) {
      dumper = function (cb) {
        self.so.dump(oid, iid, cb)
      }
    } else if (target.type === TTYPE.rsc) {
      dumper = function (cb) {
        self.so.read(oid, iid, rid, cb)
      }
    }

    function reporterMin() {
      rAttrs.mute = false
    }

    function reporterMax() {
      dumper(function (err, val) {
        return err ? self.emit('error', err) : rpt.write(val)
      })
    }

    function reporterWrite(val) {
      rAttrs.mute = true
      if (_.isObject(val)) {
        _.forEach(val, function (val, rid) {
          rAttrs.lastRpVal[rid] = val
        })
      } else {
        rAttrs.lastRpVal = val
      }

      DEBUG_RSP(val);
      if (format === 'text/plain') {
        if (_.isBoolean(val)) val = val ? '1' : '0'
        else val = val.toString()
      } else if (format === 'application/json') {
        val = helpers.encodeJson(key, val)
      } else {
        val = helpers.encodeTlv(key, val)
      }

      try {
        rsp.write(val)
      } catch (e) {
        self.emit('error', e)
      }

      if (!_.isNil(rpt.min)) clearTimeout(rpt.min)

      if (!_.isNil(rpt.max)) clearInterval(rpt.max)

      rpt.min = setTimeout(reporterMin, pmin)
      rpt.max = setInterval(reporterMax, pmax)
    }

    function finish() {
      removeReporter(self, ssid, oid, iid, rid)
    }

    dumper((err, data) => {
      if (!err && data !== TAG.unreadable && data !== TAG.exec) {
        rAttrs.mute = false
        rAttrs.enable = true
        rAttrs.lastRpVal = data

        rsp.once('finish', finish)

        rpt = serverInfo.reporters[key as string] = {
          min: setTimeout(reporterMin, pmin),
          max: setInterval(reporterMax, pmax),
          write: reporterWrite,
          stream: rsp,
          port: self.port,
          finishHandler: finish,
        }
      }

      if (_.isFunction(callback)) callback(err, data)
    })
  }

  _disableReport(ssid: KEY, oid: KEY, iid: KEY, rid: KEY, callback: Callback<any>): void {
    let serverInfo = this.serversInfo[ssid as string]
    let key = this._target(oid, iid, rid).pathKey as unknown as string
    let rpt
    let chkErr

    if (serverInfo) rpt = serverInfo.reporters[key]

    if (rpt) {
      rpt.stream.removeListener('finish', rpt.finishHandler)
      rpt.stream.end()
      removeReporter(this, ssid, oid, iid, rid)
      chkErr = ERR.success
    } else {
      chkErr = ERR.notfound
    }

    if (_.isFunction(callback)) callback(chkErr, null)
  }

  private _disableAllReport(ssid: string | number): void {
    let self = this

    function disableReport(serverInfo) {
      heartbeat(self, serverInfo.shortServerId, false)

      _.forEach(serverInfo.reporters, function (_rpt, key) {
        let oid = key.split('/')[0]
        let iid = key.split('/')[1]
        let rid = key.split('/')[2]

        self._disableReport(serverInfo.shortServerId, oid, iid, rid, function (err, _result) {
          if (err) self.emit('error', err)
        })
      })
    }

    if (_.isNil(ssid)) {
      _.forEach(this.serversInfo, disableReport)
    } else if (this.serversInfo[ssid]) {
      disableReport(this.serversInfo[ssid])
    }
  }

  private _idCounter(type: string): number {
    let id: number = 0;
    let idUsed: boolean

    switch (type) {
      case 'securityIid':
        id = 1
        while (this.so.has('lwm2mSecurity', id)) {
          id = id + 1
        }
        break

      case 'serverIid':
        id = 1
        while (this.so.has('lwm2mServer', id)) {
          id = id + 1
        }
        break

      case 'shortServerId':
        id = 0
        do {
          id = id + 1
          idUsed = false
          _.forEach(this.so.dumpSync('lwm2mSecurity'), (iObj, _iid) => {
            if (iObj.shortServerId === id) idUsed = true
          })
        } while (idUsed)
        break

      default:
        break
    }

    return id
  }
}

function startListener(cn: CoapNode, port: number, callback: Callback<Server | null>) {
  const server = createServer({
    type: cn._config.connectionType,
    proxy: true,
  })

  ;(server as any)._port = port

  cn.servers[port] = server

  server.on('request', (req: IncomingMessage, rsp: OutgoingMessage) => {
    if (!_.isEmpty(req.payload) && req.headers['Content-Format'] === 'application/json') {
      req.payload = JSON.parse(String(req.payload))
    } else if (!_.isEmpty(req.payload) && req.headers['Content-Format'] === 'application/tlv') {
      /*  req.payload = req.payload*/
    } else if (!_.isEmpty(req.payload)) {
      // @ts-ignore
      req.payload = String(req.payload)
    }

    reqHandler(cn, req, rsp)
  })

  try {
    server.listen(port, (err) => {
      if (err) {
        if (_.isFunction(callback)) callback(err, null)
        else cn.emit('error', err)
      } else {
        callback(null, server)
      }
    })
  } catch (e) {
    callback(e as ErrnoException, null)
  }
}

function removeReporter(cn, ssid: KEY, oid: KEY, iid: KEY, rid: KEY) {
  let serverInfo = cn.serversInfo[ssid]
  let key = cn._target(oid, iid, rid).pathKey
  let rAttrs = cn._getAttrs(ssid, oid, iid, rid)
  let rpt

  if (!serverInfo) return

  rpt = serverInfo.reporters[key]

  if (rpt) {
    clearTimeout(rpt.min)
    clearInterval(rpt.max)
    rpt.min = null
    rpt.max = null
    rpt.write = null
    rpt.stream = null
    rpt.port = null
    delete serverInfo.reporters[key]
  }

  rAttrs.enable = false
  rAttrs.mute = true
}

function getServerUriInfo(uri: string) {
  const uriInfo = url.parse(uri)
  return {
    address: uriInfo.hostname,
    port: uriInfo.port,
  }
}

function invokeCallBackNextTick<T>(err: NodeJS.ErrnoException | number | null, val: any, cb: Callback<T>) {
  if (_.isFunction(cb)) process.nextTick(() => cb(err, val))
}
