declare module 'network' {
  interface Callback<T = any> {
    (err: Error, data: T): void
  }

  export function gateway_ip_for(nic_name: string, cb: Callback<string>): void

  export function get_active_interface(
    cb: Callback<{
      name: string
      ip_address: string
      mac_address: string
      gateway_ip: string
      type: string
      netmask: string
    }>,
  ): void

  export function get_gateway_ip(cb: Callback<string>): void

  export function get_interfaces_list(
    cb: Callback<
      Array<{
        name: string // 'eth0',
        ip_address: string //'10.0.1.3',
        mac_address: string //'56:e5:f9:e4:38:1d',
        type: string //'Wired',
        netmask: string //'255.255.255.0',
        gateway_ip: string //'10.0.1.1'
      }>
    >,
  ): void

  export function get_private_ip(cb: Callback<string>): void

  export function get_public_ip(options: any, cb: Callback<string>): void

  export function mac_address_for(nic_name: string, cb: Callback<string>): void
}
