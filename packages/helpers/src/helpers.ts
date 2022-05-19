/***************************************************
 * Created by nanyuantingfeng on 2022/3/11 16:50. *
 ***************************************************/
import lwm2mId from 'lwm2m-id'
import lwm2mCodec from 'lwm2m-codec'
import proving from 'proving'
import _ from 'lodash'

export function getTime(): number {
  return Math.round(new Date().getTime() / 1000)
}

type KEY = string | number

export function oidKey(oid: KEY): KEY {
  let oidItem = lwm2mId.getOid(oid)
  return oidItem ? oidItem.key : oid
}

export function oidNumber(oid: string): number {
  let oidItem = lwm2mId.getOid(oid)

  oidItem = oidItem ? oidItem.value : parseInt(oid)

  if (_.isNaN(oidItem)) oidItem = oid

  return oidItem
}

export function ridKey(oid: KEY, rid: KEY): KEY {
  let ridItem = lwm2mId.getRid(oid, rid)

  if (_.isUndefined(rid)) rid = oid

  return ridItem ? ridItem.key : rid
}

export function ridNumber(oid: KEY, rid: KEY): number {
  let ridItem = lwm2mId.getRid(oid, rid)

  if (_.isUndefined(rid)) rid = oid

  ridItem = ridItem ? ridItem.value : parseInt(rid as string)

  if (_.isNaN(ridItem)) ridItem = rid

  return ridItem
}

export function buildRptAttr(req: {url: string}): Partial<{
  pmin: number
  pmax: number
  gt: number
  lt: number
  stp: number
}> {
  // 'pmin=10&pmax=60'
  let allowedAttrs = ['pmin', 'pmax', 'gt', 'lt', 'stp']

  let attrs = {}
  let query: string = urlParser(req.url).query
  let queryParams: any[] = query.split('&')

  _.forEach(queryParams, (queryParam, idx) => {
    queryParams[idx] = queryParam.split('=') // [[ pmin, 10 ], [ pmax, 60 ]]
  })

  _.forEach(queryParams, (queryParam) => {
    if (_.includes(allowedAttrs, queryParam[0])) {
      attrs[queryParam[0]] = Number(queryParam[1])
    } else {
      return false
    }
  })

  return attrs // { pmin: 10, pmax:60 }
}

export function buildUpdateQuery(attrs: Record<string, any>): string {
  // { lifetime: 81000, version: 'v0.1.2' }
  let query = ''

  _.forEach(attrs, (val, key) => {
    if (key === 'lifetime' || key === 'lt') query += 'lt=' + val + '&'
    else if (key === 'version' || key === 'lwm2m') query += 'lwm2m=' + val + '&'
  })

  if (query[query.length - 1] === '&') query = query.slice(0, query.length - 1)

  return query // 'lt=81000&lwm2m=v0.1.2'
}

export function getArrayArgs(argsInPlain: string): KEY[] | boolean {
  // 10,15,'xx'
  let argusInArray = []

  let notallowed = [' ', '"', "'", '\\']
  let isAnyNotallowed = false

  function chkCharSyntax(string) {
    _.forEach(notallowed, function (val) {
      if (_.includes(string, val)) isAnyNotallowed = true
    })
  }

  if (argsInPlain.length === 0) return []

  if (Number(argsInPlain)) argsInPlain = argsInPlain.toString()

  _.forEach(argsInPlain.split(','), (argu: string) => {
    if (Number(argu)) {
      argusInArray.push(Number(argu))
    } else if (_.includes(argu, '=')) {
      argusInArray.push(argu.split('=')[1].slice(1, argu.length - 1))
      chkCharSyntax(argusInArray[argusInArray.length - 1])
    } else {
      argusInArray.push(argu.slice(1, argu.length - 1))
      chkCharSyntax(argusInArray[argusInArray.length - 1])
    }
  })

  if (isAnyNotallowed) return false
  else return argusInArray // [10, 15, 'xx']
}

export function chkPathSlash(path: string): string {
  if (path.charAt(0) === '/') {
    return path
  } else {
    return '/' + path
  }
}

export function urlParser(url: string): {pathname: string; query: string} {
  return {
    pathname: url.split('?')[0],
    query: url.split('?')[1],
  }
}

export function getPathArray(url: string): string[] {
  let path = urlParser(url).pathname // '/x/y/z'
  let pathArray = path.split('/')

  if (pathArray[0] === '') pathArray = pathArray.slice(1)

  if (pathArray[pathArray.length - 1] === '') pathArray = pathArray.slice(0, pathArray.length - 1)

  return pathArray // ['x', 'y', 'z']
}

export function getPathIdKey(url: string): {oid?: KEY; iid?: KEY; rid?: KEY} {
  let // '/1/2/3'
    pathArray = getPathArray(url)

  let pathObj: any = {}
  let oid
  let rid

  if (url) {
    if (pathArray[0]) {
      //oid
      oid = oidKey(pathArray[0])
      pathObj.oid = oid

      if (pathArray[1]) {
        //iid
        pathObj.iid = pathArray[1]

        if (pathArray[2]) {
          //rid
          rid = ridKey(oid, pathArray[2])
          pathObj.rid = rid
        }
      }
    }
  }

  return pathObj // {oid:'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod'}
}

export function getPathDateType(path: string): string {
  const pathArray = getPathArray(path)
  const dateType = ['so', 'object', 'instance', 'resource'][pathArray.length]
  return dateType
}

export function encodeLinkFormat(path: string, value: any, attrs: any): string {
  return lwm2mCodec.encode('link', path, value, attrs)
}

export function encodeTlv(path: string, value: any): string {
  return lwm2mCodec.encode('tlv', path, value)
}

export function decodeTlv(path: string, value: any): any {
  return lwm2mCodec.decode('tlv', path, value)
}

export function encodeJson(path: string, value: any): string {
  return lwm2mCodec.encode('json', path, value)
}

export function decodeJson(path: string, value: any): any {
  return lwm2mCodec.decode('json', path, value)
}

export function getObjListOfSo(objList: string): {opts: {ct: string; hb: boolean}; list: object} {
  const objListOfSo = {}

  const // ['</>;ct=11543;hb', '</1/2>', '</1/3>', '</2/0>']
    arrayOfObjList = objList.split(',')

  const opts: any = {}

  _.forEach(arrayOfObjList, (obj: any, idx: number) => {
    if (obj.startsWith('</>')) {
      obj = obj.split(';').slice(1)

      _.forEach(obj, (attr, idx) => {
        obj[idx] = obj[idx].split('=')

        if (obj[idx][0] === 'ct') {
          opts.ct = obj[idx][1]
        } else if (obj[idx][0] === 'hb') {
          opts.hb = true
        } else {
          opts[obj[idx][0]] = obj[idx][1]
        }
      })
    } else {
      obj = obj.trim().slice(1, -1).split('/')

      if (obj[0] === '') obj = obj.slice(1)

      if (obj[0] && !_.has(objListOfSo, obj[0])) objListOfSo[obj[0]] = []

      if (obj[1]) objListOfSo[obj[0]].push(obj[1])
    }
  })

  return {opts: opts, list: objListOfSo} // { '0':[] '1': ['2', '3'], '2':['0'] }
}

export function getKeyPath(url: string): string {
  const // '/1/2/3'
    pathArray = getPathArray(url)

  let soPath = ''
  let oid
  let rid

  if (pathArray[0]) {
    //oid
    oid = oidKey(pathArray[0])
    soPath += '/' + oid

    if (pathArray[1]) {
      //iid
      soPath += '/' + pathArray[1]

      if (pathArray[2]) {
        //rid
        rid = ridKey(oid, pathArray[2])
        soPath += '/' + rid
      }
    }
  }

  return soPath // '/lwm2mServer/2/defaultMaxPeriod'
}

export function getNumPath(url: string): string {
  const // '/lwm2mServer/2/defaultMaxPeriod'
    pathArray = getPathArray(url)

  let soPath = ''
  let oid
  let rid

  if (pathArray[0]) {
    //oid
    oid = oidNumber(pathArray[0])
    soPath += '/' + oid

    if (pathArray[1]) {
      //iid
      soPath += '/' + pathArray[1]

      if (pathArray[2]) {
        //rid
        rid = ridNumber(oid, pathArray[2])
        soPath += '/' + rid
      }
    }
  }

  return soPath // '/1/2/3'
}

export function checkRescType(path: string, value: any): any {
  const pathArray = getPathArray(path)
  let oid
  let rid
  let dataDef
  let dataType
  let data

  if (pathArray.length < 3 || _.isObject(value)) return value

  oid = oidKey(pathArray[0])
  rid = ridKey(pathArray[0], pathArray[2])
  dataDef = lwm2mId.getRdef(oid, rid)

  if (dataDef) dataType = dataDef.type

  switch (dataType) {
    case 'string':
      data = value
      break
    case 'integer':
    case 'float':
      data = Number(value)
      break
    case 'boolean':
      if (value === '0') {
        data = false
      } else {
        data = true
      }
      break
    case 'time':
      data = value
      break
    default:
      if (Number(value)) data = Number(value)
      else data = value
      break
  }

  return data
}

export function decodeLinkFormat(value: any): any {
  return lwm2mCodec.decode('link', value)
}

export function dotPath(path: string): string {
  path = path.replace(/\//g, '.') // '/1/2/3'

  if (path[0] === '.') path = path.slice(1)

  if (path[path.length - 1] === '.') path = path.slice(0, path.length - 1)

  return path // 1.2.3
}

export function createPath(): string {
  const connector: string = arguments[0]
  let path = ''

  proving.string(connector, 'arguments[0] should be a string.')

  _.forEach(arguments as unknown as any[], (arg, i) => {
    if (i > 0) path = path + arg + connector
  })

  if (path[path.length - 1] === connector) path = path.slice(0, path.length - 1)

  return path
}

export function buildPathValuePairs(rootPath: string, obj: any): any {
  const result = {}

  rootPath = dotPath(rootPath)

  if (_.isObject(obj)) {
    if (rootPath !== '' && rootPath !== '.' && rootPath !== '/' && !_.isUndefined(rootPath)) rootPath = rootPath + '.'

    _.forEach(obj, (n, key: string) => {
      // Tricky: objList is an array, don't buid its full path, or updating new list will fail
      if (_.isObject(n) && key !== 'objList') _.assign(result, buildPathValuePairs(rootPath + key, n))
      else result[rootPath + key] = n
    })
  } else {
    result[rootPath] = obj
  }

  return result
}

export function invalidPathOfTarget(target: Object, objToUpdata: any): KEY[] {
  const invalidPath = []

  _.forEach(objToUpdata, (n, p) => {
    if (!_.has(target, p)) {
      invalidPath.push(p)
    }
  })

  return invalidPath
}

export function objectInstanceDiff(oldInst: object, newInst: object): object {
  const badPath = invalidPathOfTarget(oldInst, newInst)

  if (badPath.length !== 0) throw new Error('No such property ' + badPath[0] + ' in targeting object instance.')
  else return objectDiff(oldInst, newInst)
}

export function resourceDiff(oldVal: object, newVal: object): object {
  let badPath

  if (typeof oldVal !== typeof newVal) {
    return newVal
  } else if (_.isPlainObject(oldVal)) {
    // object diff
    badPath = invalidPathOfTarget(oldVal, newVal)
    if (badPath.length !== 0) throw new Error('No such property ' + badPath[0] + ' in targeting object.')
    else return objectDiff(oldVal, newVal)
  } else if (oldVal !== newVal) {
    return newVal
  } else {
    return null
  }
}

export function objectDiff(oldObj: object, newObj: object): object {
  const pvp = buildPathValuePairs('/', newObj)
  const diff = {}

  _.forEach(pvp, (val, path) => {
    if (!_.has(oldObj, path) || _.get(oldObj, path) !== val) _.set(diff, path, val)
  })

  return diff
}
