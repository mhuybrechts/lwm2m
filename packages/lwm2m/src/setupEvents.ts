/***************************************************
 * Created by nanyuantingfeng on 2022/5/18 11:52. *
 ***************************************************/
import {CoapShepherd} from '@hollowy/coap-shepherd'
import {Server as WebSocketServer} from 'rpc-websockets'

export function setupEvents(shepherd: CoapShepherd, wss: WebSocketServer) {
  wss.event('device::status')
  wss.event('device::incoming')
  wss.event('device::update')
  wss.event('device::notify')
  wss.event('device::leaving')
  wss.event('lookup')
  wss.event('ready')
  wss.event('error')
  wss.event('message')
}
