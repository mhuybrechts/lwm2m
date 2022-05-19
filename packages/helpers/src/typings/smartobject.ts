declare module 'smartobject' {
  export = SmartObject

  type KEY = string | number

  interface IOptions {
    restrict: boolean
  }

  interface Callback<T = unknown> {
    (error: null, data: T): void
    (error: NodeJS.ErrnoException, data: '_notfound_' | '_unreadable_' | '_exec_'): void
  }

  class ObjInstance {
    constructor(oidKey: KEY, iid: KEY, parent: ObjInstance)

    init(resrcs: object, setup: Function): void
    has(rid: KEY): boolean
    get(rid: KEY): any
    set(rid: KEY, value: any): this
    clear(): this

    dump(opt: IOptions, callback: Function): this
    dump(callback: Function): this
    dumpSync(): object

    read(rid: KEY, opt: IOptions, callback: Function): any
    read(rid: KEY, callback: Function): any

    write(rid: KEY, value: any, callback: Function): void
    write(rid: KEY, value: any, opt: IOptions, callback: Function): void

    exec(rid: KEY, argus: any[], callback: Function): void
  }

  class SmartObject {
    constructor(hal: object, setup?: Function)
    constructor(setup?: Function)

    init(oid: KEY, iid: KEY, resrcs: object, setup?: Function): ObjInstance

    create(oid: KEY, iid: KEY): ObjInstance
    remove(oid: KEY, iid: KEY): boolean

    objectList(): Array<{oid: KEY; iid: KEY[]}>

    has(oid: KEY, iid?: KEY, rid?: KEY): boolean

    dump(oid: KEY, iid: KEY, opt: IOptions, callback: Callback<any>): this
    dump(oid: KEY, opt: IOptions, callback: Callback<any>): this
    dump(oid: KEY, iid: KEY, callback: Callback<any>): this
    dump(opt: IOptions, callback: Callback<any>): this
    dump(oid: KEY, callback: Callback<any>): this
    dump(callback: Callback<any>): this

    dumpSync(oid?: KEY, iid?: KEY): Record<KEY, any>

    get<T>(oid: KEY, iid: KEY, rid: KEY): T | undefined
    set<T>(oid: KEY, iid: KEY, rid: KEY, value: T): boolean

    isExecutable(oid: KEY, iid: KEY, rid: KEY): boolean
    isReadable(oid: KEY, iid: KEY, rid: KEY): boolean
    isWritable(oid: KEY, iid: KEY, rid: KEY): boolean

    read<T>(oid: KEY, iid: KEY, rid: KEY, opt: IOptions, callback: Callback<T>): any
    read<T>(oid: KEY, iid: KEY, rid: KEY, callback: Callback<T>): any

    write<T>(oid: KEY, iid: KEY, rid: KEY, value: any, opt: IOptions, callback: Callback<T>): void
    write<T>(oid: KEY, iid: KEY, rid: KEY, value: any, callback: Callback<T>): void

    exec<T>(oid: KEY, iid: KEY, rid: KEY, args: any[], callback: Callback<T>): void

    findObject(oid: KEY): any
    findObjectInstance(oid: KEY, iid: KEY): ObjInstance | undefined
  }
}
