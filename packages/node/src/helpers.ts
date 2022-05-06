/***************************************************
 * Created by nanyuantingfeng on 2022/3/11 15:19. *
 ***************************************************/
import _ from 'lodash'
import {CONSTANTS} from '@hollowy/coap-helpers'
import CoapNode from './CoapNode'
import {KEY} from './types'
import {OutgoingMessage} from 'coap'

export function lifetimeUpdate(cn: CoapNode, enable: boolean) {
  clearInterval(cn._updater)
  cn._updater = null
  if (enable) {
    cn._updater = setInterval(() => {
      _.forEach(cn.serversInfo, (serverInfo, ssid) => {
        if (serverInfo.registered) {
          serverInfo.lfsecs += 1
          if (serverInfo.lfsecs >= cn.lifetime - 10) {
            cn.update({}, (err, msg) => {
              if (err) {
                cn.emit('error', err)
              } else {
                // if (msg.status === RSP.notfound)
                //     lifetimeUpdate(cn, false);
              }
            })

            serverInfo.lfsecs = 0
          }
        }
      })
    }, 1000)
  }
}

export function heartbeat(cn: CoapNode, ssid: KEY, enable?: boolean, rsp?: OutgoingMessage) {
  let serverInfo = cn.serversInfo[ssid]

  clearInterval(serverInfo.hbPacemaker)
  serverInfo.hbPacemaker = null

  if (serverInfo.hbStream.stream) {
    serverInfo.hbStream.stream.removeListener('finish', serverInfo.hbStream.finishCb)
    serverInfo.hbStream.stream.end()
    serverInfo.hbStream.stream = null
    cn.emit('logout')
  }

  if (enable) {
    serverInfo.hbStream.stream = rsp
    serverInfo.hbStream.finishCb = function () {
      clearInterval(serverInfo.hbPacemaker)
      cn.emit('offline')
      if (cn.autoReRegister === true) reRegister(cn, ssid)
    }

    rsp.on('finish', serverInfo.hbStream.finishCb)

    serverInfo.hbPacemaker = setInterval(function () {
      try {
        serverInfo.hbStream.stream.write('hb')
      } catch (e) {
        cn.emit('error', e)
      }
    }, cn._config.heartbeatTime * 1000)
    cn.emit('login')
  }
}

export function reRegister(cn: CoapNode, ssid: KEY) {
  const serverInfo = cn.serversInfo[ssid]

  cn.emit('reconnect')

  cn._register(serverInfo.ip, serverInfo.port, ssid, (err, msg) => {
    if (!msg || !(msg.status === CONSTANTS.RSP.created)) {
      setTimeout(() => reRegister(cn, ssid), 5000)
    }
  })
}

export function checkAndBuildObjList(cn: CoapNode, check: boolean, opts?: any) {
  let objList = cn.getSmartObject().objectList()
  let objListInPlain = ''
  let newObjList = {}

  _.forEach(objList, (rec) => {
    newObjList[rec.oid] = rec.iid
  })

  if (!_.isEmpty(cn.objList) && _.isEqual(cn.objList, newObjList) && check === true) return null // not diff

  cn.objList = newObjList

  if (opts) {
    objListInPlain += '</>;rt="oma.lwm2m"'

    _.forEach(opts, function (val, key) {
      if (key === 'ct' && val === 'application/json') objListInPlain += ';ct=11543'
      else if (key === 'hb' && val === true) objListInPlain += ';hb'
    })

    objListInPlain += ','
  }

  _.forEach(newObjList, (iidArray, oidNum: string | number) => {
    let oidNumber = oidNum

    if (oidNum === 0 || oidNum === '0') return

    if (_.isEmpty(iidArray)) {
      objListInPlain += '</' + oidNumber + '>,'
    } else {
      _.forEach(iidArray, function (iid) {
        objListInPlain += '</' + oidNumber + '/' + iid + '>,'
      })
    }
  })

  if (objListInPlain[objListInPlain.length - 1] === ',')
    objListInPlain = objListInPlain.slice(0, objListInPlain.length - 1)

  return objListInPlain
}

export function checkAndReportResource(cn: CoapNode, oid: KEY, iid: KEY, rid: KEY, val: any) {
  _.forEach(cn.serversInfo, (serverInfo, ssid) => {
    _checkAndReportResource(cn, ssid, oid, iid, rid, val)
  })
}

// TODO [FIXME]
export function _checkAndReportResource(cn: CoapNode, ssid: KEY, oid: KEY, iid: KEY, rid: KEY, val: any) {
  let serverInfo = cn.serversInfo[ssid]
  let target = cn._target(oid, iid, rid)
  let oidKey = target.oidKey
  let ridKey = target.ridKey
  let rAttrs = cn._getAttrs(ssid, oid, iid, rid)
  let iAttrs = cn._getAttrs(ssid, oid, iid)
  let rpt = serverInfo.reporters[target.pathKey]
  let iRpt = serverInfo.reporters[oidKey + '/' + iid]
  let iObj = {}
  let lastRpVal
  let chkRp

  if (!rAttrs.enable && !iAttrs.enable) return false

  if (_.isNil(rAttrs.lastRpVal) && iAttrs.lastRpVal) lastRpVal = iAttrs.lastRpVal[ridKey]
  else lastRpVal = rAttrs.lastRpVal

  chkRp = checkResourceAttrs(val, rAttrs.gt, rAttrs.lt, rAttrs.stp, lastRpVal)

  // chack Resource pmin and report
  if (rAttrs.mute && rAttrs.enable) {
    setTimeout(() => _checkAndReportResource(cn, ssid, oid, iid, rid, val), rAttrs.pmin * 1000)
  } else if (!rAttrs.mute && chkRp && rAttrs.enable && _.isFunction(rpt.write)) {
    rpt.write(val)
  }

  // chack Object Instance pmin and report
  if (iAttrs.mute && iAttrs.enable) {
    setTimeout(() => {
      _checkAndReportResource(cn, ssid, oid, iid, rid, val)
    }, iAttrs.pmin * 1000)
  } else if (!iAttrs.mute && chkRp && iAttrs.enable && _.isFunction(iRpt.write)) {
    iObj[ridKey] = val
    iRpt.write(iObj)
  }
}

export function checkAndCloseServer(cn: CoapNode, enable: boolean) {
  clearInterval(cn._socketServerChecker)
  cn._socketServerChecker = null

  if (enable) {
    cn._socketServerChecker = setInterval(() => {
      _.forEach(cn.servers, (server, key) => {
        let using = false

        _.forEach(cn.serversInfo, (serverInfo) => {
          _.forEach(serverInfo.reporters, (reporter, path) => {
            // @ts-ignore
            if (server._port === reporter.port) using = true
          })
        })

        // @ts-ignore
        if (using === false && server._port !== cn.port) {
          server.close()
          cn.servers[key] = null
          delete cn.servers[key]
        }
      })
    }, cn._config.serverChkTime * 1000)
  }
}

function checkResourceAttrs(val: any, gt: number, lt: number, step: number, lastRpVal: any) {
  let chkRp = false

  if (_.isObject(val)) {
    if (_.isObject(lastRpVal)) {
      _.forEach(lastRpVal, function (v, k) {
        chkRp = chkRp || v !== lastRpVal[k]
      })
    } else {
      chkRp = true
    }
  } else if (!_.isNumber(val)) {
    chkRp = lastRpVal !== val
  } else {
    // check Recource notification class attributes
    if (_.isNumber(gt) && _.isNumber(lt) && lt > gt) {
      chkRp = lastRpVal !== val && val > gt && val < lt
    } else if (_.isNumber(gt) && _.isNumber(lt)) {
      chkRp = _.isNumber(gt) && lastRpVal !== val && val > gt
      chkRp = chkRp || (_.isNumber(lt) && lastRpVal !== val && val < lt)
    } else {
      chkRp = lastRpVal !== val
    }

    if (_.isNumber(step)) chkRp = Math.abs(val - lastRpVal) > step
  }

  return chkRp
}
