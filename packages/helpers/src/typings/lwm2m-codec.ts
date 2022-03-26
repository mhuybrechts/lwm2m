/** Declaration file generated by dts-gen */

declare module 'lwm2m-codec' {
  export function decode(type: string, path: string, value?: any): object
  export function encode(
    type: string,
    path: string,
    value: any,
    attrs?: {
      pmin?: number
      pmax?: number
      gt?: number
      lt?: number
      st?: string
    },
  ): string
}
