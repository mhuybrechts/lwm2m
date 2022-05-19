/***************************************************
 * Created by nanyuantingfeng on 2022/5/17 21:00. *
 ***************************************************/
import {CoapShepherd} from '@hollowy/coap-shepherd'
import {Server as WebSocketServer} from 'rpc-websockets'
import {IDeviceAttrs, IStatus} from '@hollowy/coap-shepherd/dist/types'

export function setupNodeAPIProxy(shepherd: CoapShepherd, wss: WebSocketServer) {
  wss.register('lifeCheck', (params: {clientName: string; enable: boolean}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.lifeCheck(params.enable)
  })

  wss.register('sleepCheck', (params: {clientName: string; enable: boolean; duration?: number}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.sleepCheck(params.enable, params.duration)
  })

  wss.register('read', (params: {clientName: string; path: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.read(params.path)
  })

  wss.register('discover', (params: {clientName: string; path: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.discover(params.path)
  })

  wss.register('write', (params: {clientName: string; path: string; value: any; transparent?: boolean}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.write(params.path, params.value, params.transparent)
  })

  wss.register('writeAttrs', (params: {clientName: string; path: string; attrs: object}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.writeAttrs(params.path, params.attrs)
  })

  wss.register('execute', (params: {clientName: string; path: string; args: any[]}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.execute(params.path, params.args)
  })

  wss.register('observe', (params: {clientName: string; path: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.observe(params.path)
  })

  wss.register('cancelObserve', (params: {clientName: string; path: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.cancelObserve(params.path)
  })

  wss.register('ping', (params: {clientName: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.ping()
  })

  wss.register('dump', (params: {clientName: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.dump()
  })

  wss.register('dumpSummary', (params: {clientName: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.dumpSummary()
  })

  wss.register('assignAttrs', (params: {clientName: string; devAttrs: Partial<IDeviceAttrs>}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.assignAttrs(params.devAttrs)
  })

  wss.register('setStatus', (params: {clientName: string; status: IStatus}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.setStatus(params.status)
  })

  wss.register('readAllResource', (params: {clientName: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.readAllResource()
  })

  wss.register('reinitiateObserve', (params: {clientName: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.reinitiateObserve()
  })

  wss.register('cancelObserver', (params: {clientName: string; path: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.cancelObserve(params.path)
  })

  wss.register('cancelAllObservers', (params: {clientName: string}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.cancelAllObservers()
  })

  wss.register('updateAttrs', (params: {clientName: string; attrs: object}) => {
    const cnode = shepherd.find(params.clientName)
    return cnode?.updateAttrs(params.attrs)
  })
}
