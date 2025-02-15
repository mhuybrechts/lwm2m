/***************************************************
 * Created by nanyuantingfeng on 2022/3/11 15:19. *
 ***************************************************/
import {IConfig} from './types'

export default {
  // Minimum time in seconds the Client Device should wait between two notifications.
  // default is 0 secs.
  defaultMinPeriod: 0,

  // Maximum Period. Maximum time in seconds the Client Device should wait between two notifications.
  // When maximum time expires after the last notification, a new notification should be sent.
  // default is 60 secs.
  defaultMaxPeriod: 60,

  // indicates if the server should create IPv4 connections (udp4) or IPv6 connections (udp6).
  // default is udp4.
  connectionType: 'udp4',

  // request should get response in the time.
  // default is 60 secs.
  reqTimeout: 60,

  // how often to sent heartbeat.
  // default is 30 secs.
  heartbeatTime: 30,

  // how often to check the socket is not used.
  // default is 60 secs.
  serverChkTime: 60,
} as IConfig
