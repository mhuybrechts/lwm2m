/***************************************************
 * Created by nanyuantingfeng on 2022/5/17 20:28. *
 ***************************************************/
import {CoapNode, CoapShepherd, IConfig, IStatus} from '@hollowy/coap-shepherd'
import {Server as WebSocketServer} from 'rpc-websockets'
import {Callback} from './types'
import {setupServerAPIProxy} from './setupServerAPIProxy'
import {setupNodeAPIProxy} from './setupNodeAPIProxy'
import {setupEvents} from './setupEvents'

export interface ILWM2MOptions extends IConfig {
  port: number
}

export class LWM2MServer {
  shepherd: CoapShepherd

  wss: WebSocketServer

  constructor(public options: Partial<ILWM2MOptions>) {
    this.shepherd = new CoapShepherd({
      autoReadResources: false,
      alwaysFireDevIncoming: true,
      disableFiltering: true,
      ...this.options,
    })
    this.wss = new WebSocketServer({port: this.options.port})

    setupServerAPIProxy(this.shepherd, this.wss)
    setupNodeAPIProxy(this.shepherd, this.wss)
    setupEvents(this.shepherd, this.wss)
  }

  start(callback: Callback<void>) {
    return this.shepherd.start(callback)
  }

  stop() {
    this.shepherd?.stop()
    this.wss?.close()
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
    this.shepherd.on(eventName as any, (cnode?: any, ...args: any[]) => {
      listener(cnode, ...args)
      this.wss.emit(eventName, cnode?.clientName ?? cnode, ...args)
    })
    return this
  }
}
