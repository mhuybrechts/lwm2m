import _ from 'lodash'
import {CONSTANTS} from '@hollowy/coap-helpers'
import CoapNode from './coap-node'

const {TTYPE, TAG, ERR, RSP} = CONSTANTS

export function lfUpdate(cn: CoapNode, enable: boolean) {
  clearInterval(cn._updater)
  cn._updater = null

  if (enable) {
    cn._updater = setInterval(function () {
      _.forEach(cn.serversInfo, function (serverInfo, ssid) {
        if (serverInfo.registered) {
          serverInfo.lfsecs += 1
          if (serverInfo._lfsecs >= cn.lifetime - 10) {
            cn.update({}, function (err, msg) {
              if (err) {
                cn.emit('error', err)
              } else {
                // if (msg.status === RSP.notfound)
                //     helper.lfUpdate(cn, false);
              }
            })

            serverInfo._lfsecs = 0
          }
        }
      })
    }, 1000)
  }
}

export function heartbeat(cn: CoapNode, ssid: string, enable?: boolean, rsp?) {
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

export function reRegister(cn: CoapNode, ssid: string) {
  let serverInfo = cn.serversInfo[ssid]

  cn.emit('reconnect')
  cn._register(serverInfo.ip, serverInfo.port, ssid, (err, msg) => {
    if (!msg || !(msg.status === RSP.created)) {
      setTimeout(() => reRegister(cn, ssid), 5000)
    }
  })
}

export function checkAndBuildObjList(cn: CoapNode, check, opts?) {
  let objList = cn.getSmartObject().objectList()
  let objListInPlain = ''
  let newObjList = {}

  _.forEach(objList, function (rec) {
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

export function checkAndReportResrc(cn: CoapNode, oid: string, iid: string, rid: string, val: any) {
  _.forEach(cn.serversInfo, (serverInfo, ssid) => {
    _checkAndReportResrc(cn, ssid, oid, iid, rid, val)
  })
}

// [FIXME]
export function _checkAndReportResrc(cn: CoapNode, ssid: string, oid, iid, rid, val) {
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

  chkRp = chackResourceAttrs(val, rAttrs.gt, rAttrs.lt, rAttrs.stp, lastRpVal)

  // chack Resource pmin and report
  if (rAttrs.mute && rAttrs.enable) {
    setTimeout(() => _checkAndReportResrc(cn, ssid, oid, iid, rid, val), rAttrs.pmin * 1000)
  } else if (!rAttrs.mute && chkRp && rAttrs.enable && _.isFunction(rpt.write)) {
    rpt.write(val)
  }

  // chack Object Instance pmin and report
  if (iAttrs.mute && iAttrs.enable) {
    setTimeout(() => {
      _checkAndReportResrc(cn, ssid, oid, iid, rid, val)
    }, iAttrs.pmin * 1000)
  } else if (!iAttrs.mute && chkRp && iAttrs.enable && _.isFunction(iRpt.write)) {
    iObj[ridKey] = val
    iRpt.write(iObj)
  }
}

export function checkAndCloseServer(cn: CoapNode, enable: boolean) {
  clearInterval(cn._socketServerChker)
  cn._socketServerChker = null

  if (enable) {
    cn._socketServerChker = setInterval(() => {
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

function chackResourceAttrs(val, gt, lt, step, lastRpVal) {
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
