/***************************************************
 * Created by nanyuantingfeng on 2022/3/11 15:19. *
 ***************************************************/
import {updateTiming, registerFormat} from 'coap'
import _ from 'lodash'

import {CoapNode} from './CoapNode'
import {checkAndCloseServer, checkAndReportResource, lifetimeUpdate} from './helpers'
import {IDevAttrs} from './types'

export function setupNode(cn: CoapNode, devAttrs: Partial<IDevAttrs>) {
  const propWritable = {writable: true, enumerable: false, configurable: false}
  const maxLatency = (cn._config.reqTimeout - 47) / 2
  const so = cn.getSmartObject()

  updateTiming({maxLatency})
  registerFormat('application/tlv', 11542) // Leshan TLV binary Content-Formats
  registerFormat('application/json', 11543) // Leshan JSON Numeric Content-Formats

  so.init('device', 0, {
    // oid = 3
    manuf: devAttrs.manuf || 'sivann', // rid = 0
    model: devAttrs.model || 'cnode-01', // rid = 1
    serial: devAttrs.serial || 'c-0000', // rid = 2
    firmware: devAttrs.firmware || '1.0', // rid = 3
    devType: devAttrs.devType || 'generic', // rid = 17
    hwVer: devAttrs.hwVer || '1.0', // rid = 18
    swVer: devAttrs.swVer || '1.0', // rid = 19
    availPwrSrc: devAttrs.availPwrSrc || 0,
    pwrSrcVoltage: devAttrs.pwrSrcVoltage || 100,
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
      return so.__read(oid, iid, rid, opt, (err, data) => {
        dataToCheck = data
        setImmediate(() => {
          checkAndReportResource(cn, oid, iid, rid, dataToCheck)
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
      return so.__write(oid, iid, rid, value, opt, (err, data) => {
        dataToCheck = data || value
        setImmediate(() => {
          checkAndReportResource(cn, oid, iid, rid, dataToCheck)
        })

        callback(err, data)
      })
    },
  })

  lifetimeUpdate(cn, true)
  checkAndCloseServer(cn, false) // [TODO]
}
