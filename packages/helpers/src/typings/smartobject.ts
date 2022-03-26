declare module 'smartobject' {
  export = SmartObject

  type KEY = string | number

  class SmartObject {
    constructor(hal?: any, setup?: any)

    create(oid: KEY, iid: KEY): any

    dump(oid: KEY, iid: KEY, opt: any, callback?: any, ...args: any[]): any

    dumpSync(oid?: KEY, iid?: KEY, ...args: any[]): any

    exec(oid: KEY, iid: KEY, rid: KEY, argus: any, callback: any): any

    findObject(oid: KEY): any

    findObjectInstance(oid: KEY, iid: KEY): any

    get(oid: KEY, iid: KEY, rid: KEY): any

    has(oid: KEY, iid: KEY, rid?: KEY): boolean

    init(oid: KEY, iid: KEY, setup?: any): any

    init(oid: KEY, iid: KEY, resrcs: KEY, setup?: any): any

    isExecutable(oid: KEY, iid: KEY, rid: KEY): any

    isReadable(oid: KEY, iid: KEY, rid: KEY): any

    isWritable(oid: KEY, iid: KEY, rid: KEY): any

    objectList(): any

    read(oid: KEY, iid: KEY, rid: KEY, opt: any, callback?: any): any

    remove(oid: KEY, iid: KEY): any

    set(oid: KEY, iid: KEY, rid: KEY, value: any): any

    write(oid: KEY, iid: KEY, rid: KEY, value: any, callback: Function): any
    write(oid: KEY, iid: KEY, rid: KEY, value: any, opt: any, callback: Function): any
  }
}
