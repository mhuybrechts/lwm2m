declare module 'smartobject' {
  export = SmartObject

  type KEY = string | number

  interface Opt {
    restrict: boolean
  }

  class ObjInstance {
    constructor(oidKey: KEY, iid: KEY, parent: ObjInstance)

    init(resrcs: object, setup: Function): void
    has(rid: KEY): boolean
    get(rid: KEY): any
    set(rid: KEY, value: any): this
    clear(): this

    dump(opt: Opt, callback: Function): this
    dump(callback: Function): this
    dumpSync(): object

    read(rid: KEY, opt: Opt, callback: Function): any
    read(rid: KEY, callback: Function): any

    write(rid: KEY, value: any, callback: Function): void
    write(rid: KEY, value: any, opt: Opt, callback: Function): void

    exec(rid: KEY, argus: any[], callback: Function): void
  }

  class SmartObject {
    constructor(hal: object, setup?: Function)
    constructor(setup?: Function)

    init(oid: KEY, iid: KEY, resrcs: object, setup: Function): ObjInstance
    init(oid: KEY, iid: KEY, resrcs: object): ObjInstance
    init(oid: KEY, iid: KEY, setup: Function): ObjInstance

    create(oid: KEY, iid: KEY): ObjInstance
    remove(oid: KEY, iid: KEY): boolean

    objectList(): any[]

    has(oid: KEY, iid: KEY, rid?: KEY): boolean

    dump(oid: KEY, iid: KEY, opt: object, callback?: Function): this

    dump(oid: KEY, opt: object, callback?: Function): this
    dump(oid: KEY, iid: KEY, callback?: Function): this

    dump(opt: object, callback?: Function): this
    dump(oid: KEY, callback?: Function): this

    dump(callback?: Function): this

    dumpSync(oid?: KEY, iid?: KEY, ...args: any[]): Record<KEY, any>

    findObject(oid: KEY): any

    findObjectInstance(oid: KEY, iid: KEY): ObjInstance | undefined

    get(oid: KEY, iid: KEY, rid: KEY): any
    set(oid: KEY, iid: KEY, rid: KEY, value: any): boolean

    isExecutable(oid: KEY, iid: KEY, rid: KEY): boolean
    isReadable(oid: KEY, iid: KEY, rid: KEY): boolean
    isWritable(oid: KEY, iid: KEY, rid: KEY): boolean

    read(oid: KEY, iid: KEY, rid: KEY, opt: Opt, callback?: Function): any

    write(oid: KEY, iid: KEY, rid: KEY, value: any, callback: Function): void
    write(oid: KEY, iid: KEY, rid: KEY, value: any, opt: Opt, callback: Function): void

    exec(oid: KEY, iid: KEY, rid: KEY, argus: any, callback: Function): void
  }
}
