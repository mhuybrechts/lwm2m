/***************************************************
 * Created by nanyuantingfeng on 2022/5/17 20:29. *
 ***************************************************/
import {Client as WebSocket} from 'rpc-websockets'
import {IDeviceAttrs, IDeviceInfo, IStatus} from '@hollowy/coap-shepherd'

export class LWM2MConnect {
  ws: WebSocket

  waitForReady: Promise<void>

  constructor(public port: number, public host: string = 'localhost') {
    this.ws = new WebSocket(`ws://${host}:${port}`)
    this.waitForReady = new Promise((resolve) => this.ws.on('open', resolve))
  }

  async reset(mode?: boolean) {
    await this.waitForReady
    return this.ws.call('reset', {mode})
  }

  async list(): Promise<IDeviceInfo[]> {
    await this.waitForReady
    return this.ws.call('list') as any
  }

  async findByName(clientName: string) {
    await this.waitForReady
    return this.ws.call('find', {clientName})
  }

  async findByMacAddr(macAddress: string) {
    await this.waitForReady
    return this.ws.call('findByMacAddr', {macAddress})
  }

  async findByClientId(id: string | number) {
    await this.waitForReady
    return this.ws.call('findByClientId', {id})
  }

  async findByLocationPath(path: string) {
    await this.waitForReady
    return this.ws.call('findByLocationPath', {path})
  }

  async permitJoin(time: number) {
    await this.waitForReady
    return this.ws.call('permitJoin', {time})
  }

  async alwaysPermitJoin(permit: boolean): Promise<boolean> {
    await this.waitForReady
    return this.ws.call('alwaysPermitJoin', {permit}) as any
  }

  async announce(msg: string): Promise<string> {
    await this.waitForReady
    return this.ws.call('announce', {msg}) as any
  }

  async remove(clientName: string): Promise<string> {
    await this.waitForReady
    return this.ws.call('remove', {clientName}) as any
  }

  async newClientId(id?: number): Promise<number> {
    await this.waitForReady
    return this.ws.call('newClientId', {id}) as any
  }

  async lifeCheck(clientName: string, enable: boolean) {
    await this.waitForReady
    return this.ws.call('lifeCheck', {clientName, enable}) as any
  }

  async sleepCheck(clientName: string, enable: boolean, duration?: number) {
    await this.waitForReady
    return this.ws.call('sleepCheck', {clientName, enable, duration}) as any
  }

  async read(clientName: string, path: string): Promise<any> {
    await this.waitForReady
    return this.ws.call('read', {clientName, path}) as any
  }

  async discover(clientName: string, path: string) {
    await this.waitForReady
    return this.ws.call('discover', {clientName, path}) as any
  }

  async write(clientName: string, path: string, value: any, transparent?: boolean) {
    await this.waitForReady
    return this.ws.call('write', {clientName, path, value, transparent}) as any
  }

  async writeAttrs(clientName: string, path: string, attrs: object) {
    await this.waitForReady
    return this.ws.call('writeAttrs', {clientName, path, attrs}) as any
  }

  async execute(clientName: string, path: string, args: any[]) {
    await this.waitForReady
    return this.ws.call('execute', {clientName, path, args}) as any
  }

  async observe(clientName: string, path: string) {
    await this.waitForReady
    return this.ws.call('observe', {clientName, path}) as any
  }

  async cancelObserve(clientName: string, path: string) {
    await this.waitForReady
    return this.ws.call('cancelObserve', {clientName, path}) as any
  }

  async ping(clientName: string) {
    await this.waitForReady
    return this.ws.call('ping', {clientName}) as any
  }

  async dump(clientName: string) {
    await this.waitForReady
    return this.ws.call('dump', {clientName}) as any
  }

  async dumpSummary(clientName: string) {
    await this.waitForReady
    return this.ws.call('dumpSummary', {clientName}) as any
  }

  async assignAttrs(clientName: string, devAttrs: Partial<IDeviceAttrs>) {
    await this.waitForReady
    return this.ws.call('assignAttrs', {clientName, devAttrs}) as any
  }

  async setStatus(clientName: string, status: IStatus) {
    await this.waitForReady
    return this.ws.call('setStatus', {clientName, status}) as any
  }

  async readAllResource(clientName: string) {
    await this.waitForReady
    return this.ws.call('readAllResource', {clientName}) as any
  }

  async reinitiateObserve(clientName: string) {
    await this.waitForReady
    return this.ws.call('reinitiateObserve', {clientName}) as any
  }

  async cancelObserver(clientName: string, path: string) {
    await this.waitForReady
    return this.ws.call('cancelObserver', {clientName, path}) as any
  }

  async cancelAllObservers(clientName: string, path: string) {
    await this.waitForReady
    return this.ws.call('cancelAllObservers', {clientName, path}) as any
  }

  async updateAttrs(clientName: string, attrs: object) {
    await this.waitForReady
    return this.ws.call('updateAttrs', {clientName, attrs}) as any
  }

  async subscribe(eventName, listener: (...args: any[]) => void): Promise<() => void> {
    await this.waitForReady
    await this.ws.subscribe(eventName)
    this.ws.on(eventName, listener)
    return () => {
      this.ws.unsubscribe(eventName)
      this.ws.off(eventName, listener)
    }
  }
}
