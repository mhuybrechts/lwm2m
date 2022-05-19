import fs from 'fs'
import path from 'path'
import proving from 'proving'
import Q from 'q'
import _ from 'lodash'
import Datastore from 'nedb'
import {Storage} from './Storage'
import {CoapNode} from './CoapNode'

export class StorageNeDB extends Storage {
  private _db: Datastore

  constructor(dbPath?: string) {
    super()
    proving.string(dbPath, 'dbPath should be a string.')

    let fullPath
    let dir

    if (dbPath) {
      fullPath = path.resolve(dbPath)
      dir = path.dirname(fullPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true})
    } else {
      fullPath = null // implies inMemoryOnly
    }

    this._db = this._createDatabase(fullPath)
  }

  save(cnode: CoapNode): Q.Promise<any> {
    _provingCoapNode(cnode)
    const deferred = Q.defer<any>()

    this._db.update(
      {clientName: cnode.clientName},
      cnode.dump(),
      {upsert: true},
      (err, numberOfUpdated, affectedDocuments, upsert) => {
        if (err) return deferred.reject(err)

        if (affectedDocuments) delete affectedDocuments._id
        deferred.resolve(affectedDocuments)
      },
    )

    return deferred.promise
  }

  load(cnode: CoapNode): Q.Promise<any> {
    _provingCoapNode(cnode)

    const deferred = Q.defer()

    this._db.findOne({clientName: cnode.clientName}, {_id: 0}, (err, doc) => {
      if (err) return deferred.reject(err)
      if (!doc) return deferred.reject(new Error('coap node data not found'))
      cnode.assignAttrs(doc)
      deferred.resolve(doc)
    })

    return deferred.promise
  }

  loadAll(): Q.Promise<any[]> {
    const deferred = Q.defer<any[]>()

    this._db.find({}, {_id: 0}, (err, docs) => {
      if (err) return deferred.reject(err)
      deferred.resolve(docs)
    })

    return deferred.promise
  }

  remove(cnode: CoapNode): Q.Promise<any> {
    _provingCoapNode(cnode)

    const deferred = Q.defer()

    this._db.remove({clientName: cnode.clientName}, {multi: true}, (err, numRemoved) => {
      if (err) return deferred.reject(err)
      deferred.resolve(numRemoved > 0)
    })

    return deferred.promise
  }

  updateAttrs(cnode: CoapNode, diff: Record<string, any>): Q.Promise<any> {
    _provingCoapNode(cnode)
    if (diff !== null && !_.isPlainObject(diff)) throw new TypeError('diff should be an object if not null.')

    const deferred = Q.defer()

    if (diff === null || Object.keys(diff).length === 0) deferred.resolve(null)
    else if (diff.clientName) deferred.reject(new Error('clientName can not be modified.'))
    else
      this._db.update(
        {clientName: cnode.clientName},
        {$set: diff},
        {
          returnUpdatedDocs: true,
          multi: false,
        },
        (err, count, doc) => {
          if (err) return deferred.reject(err)
          deferred.resolve(diff)
        },
      )

    return deferred.promise
  }

  patchSo(cnode: CoapNode, diff: Record<string, any>): Q.Promise<any> {
    _provingCoapNode(cnode)
    if (diff !== null && !_.isPlainObject(diff)) throw new TypeError('diff should be an object if not null.')

    const deferred = Q.defer()

    if (diff === null || Object.keys(diff).length === 0) deferred.resolve(null)
    else
      this._db.update(
        {clientName: cnode.clientName},
        {$set: _flatten(diff, 'so')},
        {
          returnUpdatedDocs: true,
          multi: false,
        },
        (err, count, doc) => {
          if (err) return deferred.reject(err)
          deferred.resolve(diff)
        },
      )

    return deferred.promise
  }

  reset(): Q.Promise<any> {
    const deferred = Q.defer()
    this._db.remove({}, {multi: true}, (err, numRemoved) => {
      if (err) return deferred.reject(err)
      this._db.loadDatabase((err) => {
        if (err) return deferred.reject(err)
        deferred.resolve(numRemoved)
      })
    })
    return deferred.promise
  }

  _createDatabase(fullPath: string) {
    const store = new Datastore({filename: fullPath, autoload: true})
    store.ensureIndex({fieldName: 'clientName', unique: true}, (err) => {
      if (err) throw err
    })
    return store
  }
}

function _flatten(diff: object, path: string) {
  const result = {}
  const prefix = path ? path + '.' : ''
  let subObj
  Object.keys(diff).forEach((key) => {
    if (!_.isPlainObject(diff[key])) result[prefix + key] = diff[key]
    else {
      subObj = _flatten(diff[key], prefix + key)
      Object.keys(subObj).forEach((subKey) => {
        result[subKey] = subObj[subKey]
      })
    }
  })
  return result
}

function _provingCoapNode(cnode: CoapNode) {
  proving.object(cnode, 'cnode should be a CoapNode instance.')
  proving.string(cnode.clientName, 'cnode should be a CoapNode instance.')
  proving.fn(cnode.dump, 'cnode should be a CoapNode instance.')
}
