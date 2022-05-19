/***************************************************
 * Created by nanyuantingfeng on 2022/3/11 10:46. *
 ***************************************************/
import {Storage} from './Storage'
import {CoapRequestParams} from 'coap'

export interface Callback<T = unknown> {
  (error: NodeJS.ErrnoException | null, data: T): void
  (error: NodeJS.ErrnoException | null, data: T, ...extra: any[]): void
}

export interface Result<T = any> {
  data?: T
  status: string
}

export type IStatus = 'online' | 'offline' | 'sleep'

export interface IDeviceInfo {
  clientName: string
  lifetime: number
  ip: string
  mac: string
  port: number | string
  version: string
  objList: object
  ct: string
  heartbeatEnabled: boolean
  clientId: number
  observedList: any[]
  status: IStatus
  so: object
  joinTime: number
}

export interface IDeviceAttrs extends IDeviceInfo {}

export interface IConfig {
  connectionType: 'udp4' | 'udp6'
  ip: string
  port: number
  storage: Storage
  reqTimeout: number
  hbTimeout: number
  autoReadResources: boolean
  disableFiltering: boolean
  clientNameParser: (clientName: string) => string
  alwaysFireDevIncoming: boolean
  dontReinitiateObserve: boolean
  defaultDBPath: string
}

export interface INet {
  intf: string
  ip: string
  mac: string
  port: number
  routerIp: string
}

export interface ICoapRequestParams extends CoapRequestParams {
  payload?: any
}

export interface IAcceptDeviceIncoming {
  (deviceInfo: any, callback?: Callback<boolean>): void
}

export type IOptType = 'register' | 'update' | 'deregister' | 'check' | 'lookup' | 'test' | 'empty'
