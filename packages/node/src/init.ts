import * as coap from 'coap'
import _ from 'lodash'
import CoapNode from './coap-node'
import {checkAndCloseServer, checkAndReportResrc, lfUpdate} from './helpers'

const init: any = {}

init.setupNode = function (cn: CoapNode, devResrcs) {
  let propWritable = {writable: true, enumerable: false, configurable: false}
  let maxLatency = (cn._config.reqTimeout - 47) / 2
  let so = cn.getSmartObject()

  coap.updateTiming({
    maxLatency: maxLatency,
  })
  coap.registerFormat('application/tlv', 11542) // Leshan TLV binary Content-Formats
  coap.registerFormat('application/json', 11543) // Leshan JSON Numeric Content-Formats

  so.init('device', 0, {
    // oid = 3
    manuf: devResrcs.manuf || 'sivann', // rid = 0
    model: devResrcs.model || 'cnode-01', // rid = 1
    serial: devResrcs.serial || 'c-0000', // rid = 2
    firmware: devResrcs.firmware || '1.0', // rid = 3
    devType: devResrcs.devType || 'generic', // rid = 17
    hwVer: devResrcs.hwVer || '1.0', // rid = 18
    swVer: devResrcs.swVer || '1.0', // rid = 19
    availPwrSrc: devResrcs.availPwrSrc || 0,
    pwrSrcVoltage: devResrcs.pwrSrcVoltage || 100,
  })

  so.init('connMonitor', 0, {
    // oid = 4
    ip: cn.ip, // rid = 4
    routeIp: 'unknown', // rid = 5
  })

  Object.defineProperty(so, '__read', {...propWritable, value: so.read}) // __read is the original read
  Object.defineProperty(so, 'read', {
    ...propWritable,
    value: function (oid, iid, rid, opt, callback) {
      let dataToCheck

      if (_.isFunction(opt)) {
        callback = opt
        opt = undefined
      }

      // @ts-ignore
      return so.__read(oid, iid, rid, opt, function (err, data) {
        dataToCheck = data
        setImmediate(function () {
          checkAndReportResrc(cn, oid, iid, rid, dataToCheck)
        })

        callback(err, data)
      })
    },
  })

  Object.defineProperty(so, '__write', {...propWritable, value: so.write}) // __write is the original write
  Object.defineProperty(so, 'write', {
    ...propWritable,
    value: function (oid, iid, rid, value, opt, callback) {
      let dataToCheck

      if (_.isFunction(opt)) {
        callback = opt
        opt = undefined
      }

      // @ts-ignore
      return so.__write(oid, iid, rid, value, opt, function (err, data) {
        dataToCheck = data || value
        setImmediate(function () {
          checkAndReportResrc(cn, oid, iid, rid, dataToCheck)
        })

        callback(err, data)
      })
    },
  })

  lfUpdate(cn, true)
  checkAndCloseServer(cn, false) // [TODO]
}

export default init
