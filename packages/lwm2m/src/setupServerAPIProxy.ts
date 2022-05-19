/***************************************************
 * Created by nanyuantingfeng on 2022/5/17 20:44. *
 ***************************************************/
import {CoapShepherd} from '@hollowy/coap-shepherd'
import {Server as WebSocketServer} from 'rpc-websockets'

export function setupServerAPIProxy(shepherd: CoapShepherd, wss: WebSocketServer) {
  wss.register('start', () => shepherd.start())
  wss.register('stop', () => shepherd.stop())
  wss.register('reset', (params: {mode?: boolean}) => shepherd.reset(params.mode))

  wss.register('find', (params: {clientName: string}) => shepherd.find(params.clientName))
  wss.register('findByMacAddr', (params: {macAddress: string}) => shepherd.findByMacAddr(params.macAddress))
  wss.register('findByClientId', (params: {id: string | number}) => shepherd.findByClientId(params.id))
  wss.register('findByLocationPath', (params: {path: string}) => shepherd.findByLocationPath(params.path))

  wss.register('permitJoin', (params: {time: number}) => shepherd.permitJoin(params.time))
  wss.register('alwaysPermitJoin', (params: {permit: boolean}) => shepherd.alwaysPermitJoin(params.permit))

  wss.register('list', () => shepherd.list())

  wss.register('announce', (params: {msg: string}) => shepherd.announce(params.msg))
  wss.register('remove', (params: {clientName: string}) => shepherd.remove(params.clientName))
  wss.register('newClientId', (params?: {id?: number}) => shepherd.newClientId(params?.id))
}
