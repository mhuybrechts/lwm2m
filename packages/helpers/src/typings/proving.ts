declare module 'proving' {
  export function array(val: false, msg: string): never
  export function array(val: any, msg: string): asserts val

  export function defined(val: false, msg: any): never
  export function defined(val: any, msg: any): asserts val

  export function boolean(val: false, msg: any): never
  export function boolean(val: any, msg: any): asserts val

  export function fn(val: false, msg: any): never
  export function fn(val: any, msg: any): asserts val

  export function number(val: false, msg: any): never
  export function number(val: any, msg: any): asserts val

  export function object(val: false, msg: any): never
  export function object(val: any, msg: any): asserts val

  export function string(val: false, msg: any): never
  export function string(val: any, msg: any): asserts val

  export function stringOrNumber(val: false, msg: any): never
  export function stringOrNumber(val: any, msg: any): asserts val
}
