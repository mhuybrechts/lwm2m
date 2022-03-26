/***************************************************
 * Created by gongyanyu on 2022/3/11 15:19. *
 ***************************************************/

export interface Callback<T> {
  (error: NodeJS.ErrnoException | null, data: T): void
}

export interface IDevAttrs {
  version: string
  lifetime: number
  autoReRegister: boolean
}

export interface INet {
  intf: string
  port: number | string
  ip: string
  mac: string
  routerIp: string
}
