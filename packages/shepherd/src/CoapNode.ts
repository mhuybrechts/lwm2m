import Q from 'q'
import _ from 'lodash'
import proving from 'proving'
import SmartObject from 'smartobject'
import {helpers, CONSTANTS} from '@hollowy/coap-helpers'
import {Callback, ICoapRequestParams, IDeviceAttrs, IDeviceInfo, IStatus, Result} from './types'
import {CoapShepherd} from './CoapShepherd'
import {IncomingMessage, OptionValue, ObserveReadStream} from 'coap'

const debug = require('debug')('@hollowy/Shepherd:NODE')

export class CoapNode {
  public shepherd: CoapShepherd

  public dataFormat: string[]
  public so: SmartObject

  public locationPath: string
  public clientId: string | number
  public status: IStatus

  public observedList: string[]
  public _registered: boolean
  public _streamObservers: Record<string, ObserveReadStream>
  public _lifeChecker: NodeJS.Timeout
  public _sleepChecker: NodeJS.Timeout
  public _heartbeat: number
  public _extra: any
  public lifetime: number
  public clientName: string
  public version: string
  public ip: string
  public mac: string
  public port: number
  public joinTime: number
  public objList: object
  public heartbeatEnabled: boolean

  constructor(shepherd: CoapShepherd, devAttrs: Partial<IDeviceAttrs>) {
    this.shepherd = shepherd
    this.dataFormat = []
    // [TODO] clientName locationPath check
    this.so = new SmartObject()
    this.assignAttrs(devAttrs)
    this.locationPath = '/rd/' + this.clientId.toString()

    this.status = 'offline'
    this.observedList = []

    this._registered = false
    this._streamObservers = {}
    this._lifeChecker = null
    this._sleepChecker = null

    this._heartbeat = null
  }

  lifeCheck(enable: boolean): this {
    proving.boolean(enable, 'enable should be a boolean.')

    if (this._lifeChecker) clearTimeout(this._lifeChecker)

    if (enable) {
      this._lifeChecker = setTimeout(() => {
        this.shepherd.remove(this.clientName)
      }, this.lifetime * 1000 + 500)
    } else {
      this._lifeChecker = null
    }

    return this
  }

  sleepCheck(enable: boolean, duration?: number): this {
    proving.boolean(enable, 'enable should be a boolean.')
    if (!_.isUndefined(duration)) proving.number(duration, 'duration should be a number.')

    if (this._sleepChecker) clearTimeout(this._sleepChecker)

    if (enable) {
      if (duration) {
        this._sleepChecker = setTimeout(() => this.setStatus('offline'), duration * 1000 + 500)
      }
    } else {
      this._sleepChecker = null
    }

    return this
  }

  read<T>(path: string, callback?: Callback<T>): Q.Promise<Result<T>> {
    const deferred = Q.defer<Result<T>>()
    const chkErr = this._reqCheck('read', path)
    let reqObj
    let rspObj

    if (chkErr) {
      deferred.reject(chkErr)
    } else {
      reqObj = this._reqObj('GET', helpers.getNumPath(path))
      if (this.dataFormat.includes('application/json')) reqObj.options = {Accept: 'application/json'}
      else reqObj.options = {Accept: 'application/tlv'} // Default format is tlv

      this.shepherd
        .request(reqObj)
        .then((rsp) => {
          rspObj = {status: rsp.code}

          this._isRspTimeout(rsp)
          if (rsp.code === CONSTANTS.RSP.content) {
            // only 2.05 is with data
            rspObj.data = rsp.payload
            return this._updateSoAndDB(path, rspObj.data)
          } else if (rsp.code === CONSTANTS.RSP.notallowed) {
            rspObj.data = rsp.payload
          }

          return 'notUpdate' as any
        })
        .done(
          () => {
            deferred.resolve(rspObj)
          },
          (err) => {
            deferred.reject(err)
          },
        )
    }
    return deferred.promise.nodeify(callback)
  }

  discover<T>(path: string, callback?: Callback<T>): Q.Promise<Result<T>> {
    const deferred = Q.defer<Result<T>>()
    const chkErr = this._reqCheck('discover', path)
    let reqObj
    let rspObj

    if (chkErr) {
      deferred.reject(chkErr)
    } else {
      reqObj = this._reqObj('GET', helpers.getNumPath(path))
      reqObj.options = {Accept: 'application/link-format'}

      this.shepherd.request(reqObj).done(
        (rsp) => {
          rspObj = {status: rsp.code}

          this._isRspTimeout(rsp)
          if (rsp.code === CONSTANTS.RSP.content) {
            // only 2.05 is with data
            rspObj.data = rsp.payload
          }

          deferred.resolve(rspObj)
        },
        (err) => {
          deferred.reject(err)
        },
      )
    }
    return deferred.promise.nodeify(callback)
  }

  write<T>(path: string, value: any, callback?: Callback<T>): Q.Promise<Result<T>>
  write<T>(path: string, value: any, transparent?: boolean, callback?: Callback<T>): Q.Promise<Result<T>>
  write<T>(path: string, value: any, transparent?: any, callback?: Callback<T>): Q.Promise<Result<T>> {
    if (typeof transparent === 'function' && !callback) {
      callback = transparent
      transparent = false
    }

    const deferred = Q.defer<Result<T>>()
    const chkErr = this._reqCheck('write', path, value)
    let reqObj
    let rspObj

    if (chkErr) {
      deferred.reject(chkErr)
    } else {
      reqObj = this._reqObj('PUT', helpers.getNumPath(path))

      if (transparent) {
        reqObj.payload = Buffer.from(value)
        reqObj.options = {'Content-Format': 'application/octet-stream'}
      } else if (this.dataFormat.includes('application/json')) {
        reqObj.payload = helpers.encodeJson(path, value)
        reqObj.options = {'Content-Format': 'application/json'}
      } else {
        reqObj.payload = helpers.encodeTlv(path, value)
        reqObj.options = {'Content-Format': 'application/tlv'}
      }

      debug('reqObj: %s', JSON.stringify(reqObj))

      this.shepherd
        .request(reqObj)
        .then((rsp) => {
          rspObj = {status: rsp.code, data: rsp.payload}

          this._isRspTimeout(rsp)
          if (rsp.code === CONSTANTS.RSP.changed) {
            // consider only 2.04 with the written value
            return this._updateSoAndDB(path, value)
          }
          return 'notUpdate' as any
        })
        .done(
          () => {
            deferred.resolve(rspObj)
          },
          (err) => {
            deferred.reject(err)
          },
        )
    }

    return deferred.promise.nodeify(callback)
  }

  writeAttrs<T>(path: string, attrs: object, callback?: Callback<T>): Q.Promise<Result<T>> {
    const deferred = Q.defer<Result<T>>()
    const chkErr = this._reqCheck('writeAttrs', path, attrs)
    let reqObj

    if (chkErr) {
      deferred.reject(chkErr)
    } else {
      reqObj = this._reqObj('PUT', helpers.getNumPath(path))
      reqObj.query = getAttrQuery(attrs)

      this.shepherd.request(reqObj).done(
        (rsp) => {
          this._isRspTimeout(rsp)
          deferred.resolve({status: rsp.code})
        },
        (err) => {
          deferred.reject(err)
        },
      )
    }

    return deferred.promise.nodeify(callback)
  }

  execute<T>(path: string, args: any[], callback?: Callback<T>): Q.Promise<Result<T>> {
    const deferred = Q.defer<Result<T>>()
    let chkErr
    let reqObj
    let argusInPlain = null

    if (arguments.length === 2 && _.isFunction(args)) {
      callback = args as any as Callback<T>
      args = []
    }

    chkErr = this._reqCheck('execute', path, args)

    if (!_.isEmpty(args)) argusInPlain = getPlainTextArgs(args) // argus to plain text format

    if (chkErr) {
      deferred.reject(chkErr)
    } else {
      reqObj = this._reqObj('POST', helpers.getNumPath(path))
      reqObj.payload = argusInPlain

      this.shepherd.request(reqObj).done(
        (rsp) => {
          this._isRspTimeout(rsp)
          deferred.resolve({status: rsp.code, data: rsp.payload as any as T})
        },
        (err) => {
          deferred.reject(err)
        },
      )
    }

    return deferred.promise.nodeify(callback)
  }

  observe<T>(path: string, callback?: Callback<T>): Q.Promise<Result<T>> {
    const deferred = Q.defer<Result<T>>()
    const chkErr = this._reqCheck('observe', path)
    let reqObj
    let rspObj

    if (chkErr && path !== '/heartbeat') {
      deferred.reject(chkErr)
    } else {
      reqObj = this._reqObj('GET', helpers.getNumPath(path))
      reqObj.observe = true
      if (this.dataFormat.includes('application/json')) {
        reqObj.options = {Accept: 'application/json'}
      } else if (this.dataFormat.includes('application/tlv')) {
        reqObj.options = {Accept: 'application/tlv'}
      } else {
        reqObj.options = {Accept: 'text/plain'} // Default format is tlv
      }

      debug(`OBSERVE -> %s`, JSON.stringify(reqObj))
      this.shepherd.request(reqObj).done(
        (observeStream: ObserveReadStream) => {
          rspObj = {status: observeStream.code}
          this._isRspTimeout(observeStream)

          if (observeStream.code === CONSTANTS.RSP.content) {
            rspObj.data = observeStream.payload
            observeStream._disableFiltering = this.shepherd.config.disableFiltering

            if (path !== '/heartbeat') this.observedList.push(helpers.getKeyPath(reqObj.pathname))

            this._streamObservers[helpers.getKeyPath(reqObj.pathname)] = observeStream

            observeStream.once('data', () => {
              observeStream.on('data', (value) => {
                const type = observeStream.headers['Content-Format']
                debug(`observeStream:value -> %s : %s`, type, value)
                this._notifyHandler(path, value, type)
              })
            })
          }

          deferred.resolve(rspObj)
        },
        (err) => {
          deferred.reject(err)
        },
      )
    }

    return deferred.promise.nodeify(callback)
  }

  cancelObserve(path: string, callback?: Callback<void>): Q.Promise<Result<void>> {
    const deferred = Q.defer<Result<void>>()
    const chkErr = this._reqCheck('cancelObserve', path)
    let reqObj

    if (chkErr) {
      deferred.reject(chkErr)
    } else {
      reqObj = this._reqObj('GET', helpers.getNumPath(path))
      reqObj.observe = false

      this.shepherd.request(reqObj).done(
        (rsp) => {
          this._isRspTimeout(rsp)

          if (rsp.code === CONSTANTS.RSP.content) this.cancelObserver(helpers.getKeyPath(reqObj.pathname))

          deferred.resolve({status: rsp.code})
        },
        (err) => {
          deferred.reject(err)
        },
      )
    }

    return deferred.promise.nodeify(callback)
  }

  ping(callback?: Callback<void>): Q.Promise<Result<void>> {
    const deferred = Q.defer<Result<void>>()
    const txTime = new Date().getTime()

    const reqObj = this._reqObj('POST', '/ping')

    if (!this._registered) {
      deferred.reject(new Error(this.clientName + ' was deregistered.'))
    } else {
      this.shepherd.request(reqObj).done(
        (rsp) => {
          const rspObj: any = {status: rsp.code}

          this._isRspTimeout(rsp)
          if (rsp.code === CONSTANTS.RSP.content) {
            rspObj.data = new Date().getTime() - txTime
          }

          deferred.resolve(rspObj)
        },
        (err) => {
          deferred.reject(err)
        },
      )
    }

    return deferred.promise.nodeify(callback)
  }

  dump() {
    const dumped = this.dumpSummary()
    dumped['so'] = this.so.dumpSync()
    return dumped
  }

  dumpSummary(): IDeviceInfo {
    const dumped = {}

    const includedKeys = [
      'clientName',
      'clientId',
      'lifetime',
      'version',
      'ip',
      'mac',
      'port',
      'objList',
      'observedList',
      'heartbeatEnabled',
    ]

    _.forEach(includedKeys, (key) => {
      dumped[key] = _.cloneDeep(this[key])
    })

    return dumped as IDeviceInfo
  }

  assignAttrs(devAttrs: Partial<IDeviceAttrs>): void {
    proving.object(devAttrs, 'devAttrs should be an object.')

    this.clientName = devAttrs.clientName
    this.clientId = this.shepherd.newClientId(devAttrs.clientId)
    this.version = devAttrs.version || '1.0.0'
    this.lifetime = devAttrs.lifetime || 86400

    this.ip = devAttrs.ip || 'unknown'
    this.mac = devAttrs.mac || 'unknown'
    //@ts-ignore
    this.port = devAttrs.port || 'unknown'

    this.joinTime = devAttrs.joinTime || Date.now()
    this.objList = devAttrs.objList

    if (devAttrs.ct == '11543' && this.dataFormat.indexOf('application/json') < 0)
      this.dataFormat.push('application/json')

    this.heartbeatEnabled = !!devAttrs.heartbeatEnabled

    if (typeof devAttrs.so === 'object') this._assignSo(devAttrs.so)
  }

  private _assignSo(src: object): void {
    const so = new SmartObject()
    _.forEach(src, (obj, oid) => {
      _.forEach(obj, (iObj, iid) => {
        so.init(oid, iid, iObj as object)
      })
    })
    this.so = so
  }

  setStatus(status: IStatus): void {
    if (status !== 'online' && status !== 'offline' && status !== 'sleep') throw new TypeError('bad status.')

    const shepherd = this.shepherd

    if (this.status !== status) {
      this.status = status

      setImmediate(() => shepherd.emit('message', {type: 'device::status', cnode: this, data: status}))
    }
  }

  private _reqObj(method: ICoapRequestParams['method'], pathname: string): ICoapRequestParams {
    proving.string(method, 'method should be a string.')
    proving.string(pathname, 'pathname should be a string.')

    return {
      hostname: this.ip,
      port: this.port,
      pathname: pathname,
      method: method,
    }
  }

  private _reqCheck(type: string, path: string, data?: any) {
    let chkErr = null
    const allowedAttrs = ['pmin', 'pmax', 'gt', 'lt', 'stp', 'step']
    let pathItems

    proving.string(path, 'path should be a string.')

    switch (type) {
      case 'read':
        break

      case 'write':
        pathItems = helpers.getPathArray(path)

        if (!pathItems[1]) throw Error('path should contain Object ID and Object Instance ID.')
        else if (pathItems.length === 2 && !_.isObject(data)) throw TypeError('value should be an object.')
        else if (_.isFunction(data) || _.isNil(data)) throw TypeError('value is undefined.')
        break

      case 'execute':
        pathItems = helpers.getPathArray(path)

        if (!pathItems[1] || !pathItems[2])
          throw Error('path should contain Object ID, Object Instance ID and Resource ID.')
        else if (!_.isArray(data) && !_.isNil(data)) chkErr = new TypeError('argus should be an array.')
        break

      case 'discover':
        break

      case 'writeAttrs':
        proving.object(data, 'data should be an object.')

        _.forEach(data, (val, key) => {
          if (!_.includes(allowedAttrs, key)) chkErr = chkErr || new TypeError(key + ' is not allowed.')
        })
        break

      case 'observe':
        break

      case 'cancelObserve':
        break

      default:
        chkErr = new Error('unknown method.')
    }

    if (!this._registered) chkErr = chkErr || new Error(this.clientName + ' was deregistered.')
    else if (this.status === 'offline') chkErr = chkErr || new Error(this.clientName + ' is offline.')
    else if (this.status === 'sleep') chkErr = chkErr || new Error(this.clientName + ' is sleeping.')

    return chkErr
  }

  readAllResource<T>(callback?: Callback<Result<T>>): Q.Promise<Result<T>> {
    const deferred = Q.defer<Result<T>>()
    const oids = []
    let reqObj
    const readAllResourcePromises = []

    _.forEach(this.objList, (iids, oid) => {
      reqObj = this._reqObj('GET', helpers.getNumPath(oid))
      // [TODO]
      reqObj.options = {Accept: 'application/tlv'}
      debug(`readAllResource -> :%s`, JSON.stringify(reqObj))
      readAllResourcePromises.push(this.shepherd.request(reqObj))
      oids.push(oid)
    })

    Q.all(readAllResourcePromises)
      .then((responses) => {
        let isAnyFail = false
        const rspObj: any = {}

        _.forEach(responses, (rsp, idx) => {
          const obj = rsp.payload
          const oid = oids[idx]

          debug(`readAllResource <- : %s : %s`, rsp.code, JSON.stringify(rsp.payload))

          if (rsp.code === CONSTANTS.RSP.content) {
            _.forEach(obj, (iObj, iid) => {
              const rsc = {}

              _.forEach(iObj, (val, rid) => {
                rsc[rid] = val
              })

              this.so.init(oid, iid, rsc)
            })
          } else {
            rspObj.status = rspObj.status || rsp.code
            rspObj.data = rspObj.data || '/' + oids[idx]
            isAnyFail = true
          }
        })

        if (isAnyFail) {
          deferred.reject(new Error('object requests fail.'))
        } else {
          rspObj.status = CONSTANTS.RSP.content
          rspObj.data = this.so
          deferred.resolve(rspObj)
        }
      })
      .fail((err) => {
        deferred.reject(err)
      })
      .done()

    return deferred.promise.nodeify(callback)
  }

  reinitiateObserve(callback?: Callback<Result<void>>): Q.Promise<Result<void>> {
    const deferred = Q.defer<Result<void>>()
    const paths = []
    const reinitiateObservePromises = []

    if (_.isEmpty(this.observedList)) {
      deferred.resolve()
      return deferred.promise.nodeify(callback)
    }

    _.forEach(this.observedList, (path) => {
      paths.push(path)
      reinitiateObservePromises.push(this.observe(path))
    })

    Q.all(reinitiateObservePromises)
      .then((responses) => {
        _.forEach(responses, (rsp, idx) => {
          if (rsp.code !== CONSTANTS.RSP.content) _.remove(this.observedList, paths[idx])
        })

        deferred.resolve()
      })
      .fail((err) => {
        deferred.reject(err)
      })
      .done()

    return deferred.promise.nodeify(callback)
  }

  cancelObserver(path: string): void {
    const streamObservers = this._streamObservers
    streamObservers[path]?.close()
    streamObservers[path] = null
    delete streamObservers[path]

    if (path !== '/heartbeat') _.remove(this.observedList, path)
  }

  cancelAllObservers(): void {
    _.forEach(this._streamObservers, (observeStream, path) => this.cancelObserver(path))
  }

  _updateSoAndDB(path: string, data: any, callback?: Callback<object>): Q.Promise<object> {
    const deferred = Q.defer<object>()
    const dataType = helpers.getPathDateType(path)
    const dataObj = helpers.getPathIdKey(path)
    let diff = null

    if (!_.isNil(data)) {
      switch (dataType) {
        case 'object':
          diff = {}
          diff[dataObj.oid] = data
          break
        case 'instance':
          diff = {}
          diff[dataObj.oid] = {}
          diff[dataObj.oid][dataObj.iid] = data
          break
        case 'resource':
          diff = {}
          diff[dataObj.oid] = {}
          diff[dataObj.oid][dataObj.iid] = {}
          diff[dataObj.oid][dataObj.iid][dataObj.rid] = data
          break
        default:
          deferred.resolve()
          break
      }

      if (diff)
        this.shepherd.storage.patchSo(this, diff).done(
          (diff) => {
            deferred.resolve(diff)
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

  updateAttrs(attrs: object, callback?: Callback<object>) {
    const deferred = Q.defer()
    const diff = {}
    let chkErr = null

    if (!_.isPlainObject(attrs)) chkErr = new TypeError('attrs to update should be an object.')

    if (chkErr) {
      deferred.reject(chkErr)
    } else {
      _.forEach(attrs, (value, key) => {
        if (!_.isEqual(this[key], value) && key !== 'hb' && key !== 'ct') {
          diff[key] = value
        }
      })

      if (_.isEmpty(diff)) {
        deferred.resolve(diff)
      } else {
        this.shepherd.storage.updateAttrs(this, diff).done(
          () => {
            _.merge(this, diff)
            deferred.resolve(diff)
          },
          (err) => {
            deferred.reject(err)
          },
        )
      }
    }

    return deferred.promise.nodeify(callback)
  }

  private _notifyHandler(path: string, value: any, type: OptionValue): void {
    const shepherd = this.shepherd
    let data

    switch (type) {
      case 'application/json':
        data = helpers.decodeJson(path, value)
        break
      case 'application/tlv':
        data = helpers.decodeTlv(path, value)
        break
      default:
        data = helpers.checkRescType(path, value)
        break
    }

    if (shepherd.enabled && helpers.getPathArray(path)[0] === 'heartbeat') {
      this.setStatus('online')
      this._heartbeat = helpers.getTime()
    } else if (shepherd.enabled) {
      this.setStatus('online')
      this._updateSoAndDB(path, data).done(
        () => {
          setImmediate(() =>
            shepherd.emit('message', {
              type: 'device::notify',
              cnode: this,
              data: {path: helpers.getKeyPath(path), value: data},
            }),
          )
        },
        (err) => {
          shepherd.emit('error', err)
        },
      )
    }
  }

  private _isRspTimeout(rsp: IncomingMessage): void {
    if (rsp.code !== '4.08') {
      this.setStatus('online')
    } else if (this.status !== 'sleep') this.setStatus('offline')
  }
}

function getAttrQuery(attr: object): string {
  let query = ''

  _.forEach(attr, (value, key) => {
    if (key === 'step') query = query + 'stp=' + value + '&'
    else query = query + key + '=' + value + '&'
  })

  return query.slice(0, query.length - 1) // take off the last '&'
}

function getPlainTextArgs(args: any[]): string {
  let plainTextArgus = ''

  _.forEach(args, (arg) => {
    if (_.isString(arg)) plainTextArgus += "'" + arg + "'" + ','
    else if (_.isNumber(arg)) plainTextArgus += arg + ','
  })

  return plainTextArgus.slice(0, plainTextArgus.length - 1) // take off the last ','
}
