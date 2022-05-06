/***************************************************
 * Created by nanyuantingfeng on 2022/3/11 15:19. *
 ***************************************************/
import {CoapRequestParams} from 'coap'

export interface Callback<T> {
  (error: NodeJS.ErrnoException | number | null, data: T): void
}

export interface IDevAttrs {
  version: string
  lifetime: number
  autoReRegister: boolean

  manuf: string
  model: string // rid = 1
  serial: string // rid = 2
  firmware: string // '1.0', // rid = 3
  devType: string // 'generic', // rid = 17
  hwVer: string // '1.0', // rid = 18
  swVer: string //  '1.0', // rid = 19
  availPwrSrc: number // 0,
  pwrSrcVoltage: number // 100,
}

export interface INet {
  intf: string
  port: number | string
  ip: string
  mac: string
  routerIp: string
}

export type KEY = string | number

export interface ICoapRequestParams extends CoapRequestParams {
  payload?: string
}

export interface IServerInfo {
  shortServerId: KEY
  ip: string
  port: number
  locationPath: string
  registered: boolean
  lfsecs: number
  repAttrs: Partial<IDevAttrs>
  reporters: any
  hbPacemaker: any
  hbStream: any
}

export interface IRSInfo {
  address: string
  port: number
}

export interface IConfig {
  defaultMinPeriod: number
  defaultMaxPeriod: number
  connectionType: 'udp4' | 'udp6'
  reqTimeout: number
  heartbeatTime: number
  serverChkTime: number
}

export type IOptType =
  | 'discover'
  | 'read'
  | 'write'
  | 'writeAttr'
  | 'execute'
  | 'observe'
  | 'cancelObserve'
  | 'ping'
  | 'create'
  | 'delete'
  | 'finish'
  | 'announce'
  | 'empty'
