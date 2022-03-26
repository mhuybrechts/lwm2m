/***************************************************
 * Created by gongyanyu on 2022/3/16 19:57. *
 ***************************************************/
import { expect } from 'chai'
import * as helpers from '../src/helpers'

describe('helpers', () => {
  describe('Signature Check', () => {
    it('#.getTime()', () => {
      expect(() => {
        helpers.getTime()
      }).not.to.throw()
    })

    it('#.oidKey()', () => {
      expect(() => {
        helpers.oidKey({} as any)
      }).to.throw()
      expect(() => {
        helpers.oidKey([] as any)
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.oidKey()
      }).to.throw()

      expect(() => {
        helpers.oidKey('x')
      }).not.to.throw()
      expect(() => {
        helpers.oidKey(5)
      }).not.to.throw()
    })

    it('#.oidNumber()', () => {
      expect(() => {
        helpers.oidNumber({} as any)
      }).to.throw()
      expect(() => {
        helpers.oidNumber([] as any)
      }).to.throw()
      // @ts-ignore
      expect(() => {
        // @ts-ignore
        helpers.oidNumber()
      }).to.throw()

      expect(() => {
        helpers.oidNumber('x')
      }).not.to.throw()
      expect(() => {
        // @ts-ignore
        helpers.oidNumber(5)
      }).not.to.throw()
    })

    it('#.ridKey()', () => {
      expect(() => {
        // @ts-ignore
        helpers.ridNumber({}, 'x')
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.ridNumber([], 'x')
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.ridNumber('x', [])
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.ridNumber('x', {})
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.ridNumber()
      }).to.throw()

      expect(() => {
        helpers.ridNumber('x', 'y')
      }).not.to.throw()
      expect(() => {
        helpers.ridNumber(5, 'y')
      }).not.to.throw()
      expect(() => {
        helpers.ridNumber('x', 5)
      }).not.to.throw()
      expect(() => {
        helpers.ridNumber(1, 5)
      }).not.to.throw()
    })

    it('#.ridNumber()', () => {
      expect(() => {
        // @ts-ignore
        helpers.ridNumber({}, 'x')
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.ridNumber([], 'x')
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.ridNumber('x', [])
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.ridNumber('x', {})
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.ridNumber()
      }).to.throw()

      expect(() => {
        helpers.ridNumber('x', 'y')
      }).not.to.throw()
      expect(() => {
        helpers.ridNumber(5, 'y')
      }).not.to.throw()
      expect(() => {
        helpers.ridNumber('x', 5)
      }).not.to.throw()
      expect(() => {
        helpers.ridNumber(1, 5)
      }).not.to.throw()
    })

    it('#.getPathArray()', () => {
      expect(() => {
        // @ts-ignore
        helpers.getPathArray(5)
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.getPathArray({})
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.getPathArray([])
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.getPathArray()
      }).to.throw()

      expect(() => {
        helpers.getPathArray('x')
      }).not.to.throw()
    })

    it('#.getPathIdKey()', () => {
      expect(() => {
        // @ts-ignore
        helpers.getPathIdKey(5)
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.getPathIdKey({})
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.getPathIdKey([])
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.getPathIdKey()
      }).to.throw()

      expect(() => {
        helpers.getPathIdKey('x')
      }).not.to.throw()
    })

    it('#.getNumPath()', () => {
      expect(() => {
        // @ts-ignore
        helpers.getNumPath(5)
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.getNumPath({})
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.getNumPath([])
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.getNumPath()
      }).to.throw()

      expect(() => {
        helpers.getNumPath('x')
      }).not.to.throw()
    })

    it('#.decodeLinkFormat()', () => {
      expect(() => {
        helpers.decodeLinkFormat(5)
      }).to.throw()
      expect(() => {
        helpers.decodeLinkFormat({})
      }).to.throw()
      expect(() => {
        helpers.decodeLinkFormat([])
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.decodeLinkFormat()
      }).to.throw()

      expect(() => {
        helpers.decodeLinkFormat('x')
      }).not.to.throw()
    })

    it('#.dotPath()', () => {
      expect(() => {
        // @ts-ignore
        helpers.dotPath(5)
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.dotPath({})
      }).to.throw() // @ts-ignore
      expect(() => {
        // @ts-ignore
        helpers.dotPath([])
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.dotPath()
      }).to.throw()

      expect(() => {
        helpers.dotPath('xyz')
      }).not.to.throw()
    })

    it('#.createPath()', () => {
      expect(() => {
        // @ts-ignore
        helpers.createPath(5)
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.createPath({})
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.createPath([])
      }).to.throw()
      expect(() => {
        helpers.createPath()
      }).to.throw()

      expect(() => {
        // @ts-ignore
        helpers.createPath('xyz')
      }).not.to.throw()
    })

    it('#.buildPathValuePairs()', () => {
      expect(() => {
        // @ts-ignore
        helpers.buildPathValuePairs(3, { a: { b: 1 } })
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.buildPathValuePairs([], { a: { b: 1 } })
      }).to.throw()
      expect(() => {
        // @ts-ignore
        helpers.buildPathValuePairs({}, { a: { b: 1 } })
      }).to.throw()
      expect(() => {
        helpers.buildPathValuePairs(undefined, { a: { b: 1 } })
      }).to.throw()
      expect(() => {
        helpers.buildPathValuePairs(null, { a: { b: 1 } })
      }).to.throw()

      expect(() => {
        helpers.buildPathValuePairs('/xyz', { a: { b: 1 } })
      }).not.to.throw()
    })

    it('#.buildRptAttr()', function () {})

    it('#.buildUpdateQuery()', function () {})

    it('#.getArrayArgus()', function () {})

    it('#.getPathArray()', function () {
      expect(function () {
        // @ts-ignore
        helpers.getPathArray(5)
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.getPathArray({})
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.getPathArray([])
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.getPathArray()
      }).to.throw()

      expect(function () {
        helpers.getPathArray('x')
      }).not.to.throw()
    })

    it('#.getPathIdKey()', function () {
      expect(function () {
        // @ts-ignore
        helpers.getPathIdKey(5)
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.getPathIdKey({})
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.getPathIdKey([])
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.getPathIdKey()
      }).to.throw()

      expect(function () {
        helpers.getPathIdKey('x')
      }).not.to.throw()
    })

    it('#.encodeJson()', function () {
      expect(function () {
        helpers.encodeJson('x', 'y')
      }).to.throw()
      expect(function () {
        helpers.encodeJson('x/y', 'y')
      }).to.throw()
      expect(function () {
        helpers.encodeJson('x', 5)
      }).to.throw()
      expect(function () {
        helpers.encodeJson('x/y', 5)
      }).to.throw()
      expect(function () {
        helpers.encodeJson('x', [])
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.encodeJson(5, 'y')
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.encodeJson(1, 5)
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.encodeJson({}, 'x')
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.encodeJson([], 'x')
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.encodeJson()
      }).to.throw()

      expect(function () {
        helpers.encodeJson('x/y/z', 'y')
      }).not.to.throw()
      expect(function () {
        helpers.encodeJson('x/y/z', 5)
      }).not.to.throw()
      expect(function () {
        helpers.encodeJson('x', {})
      }).not.to.throw()
    })

    it('#.decodeJson()', function () {
      expect(function () {
        helpers.decodeJson('x', 'y')
      }).to.throw()
      expect(function () {
        helpers.decodeJson('x/y', 'y')
      }).to.throw()
      expect(function () {
        helpers.decodeJson('x', 5)
      }).to.throw()
      expect(function () {
        helpers.decodeJson('x/y', 5)
      }).to.throw()
      expect(function () {
        helpers.decodeJson('x', [])
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.decodeJson(5, 'y')
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.decodeJson(1, 5)
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.decodeJson({}, 'x')
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.decodeJson([], 'x')
      }).to.throw()
      expect(function () {
        // @ts-ignore
        helpers.decodeJson()
      }).to.throw()

      expect(function () {
        helpers.decodeJson('x/y/z', { e: [] })
      }).not.to.throw()
      expect(function () {
        helpers.decodeJson('x', { e: [] })
      }).not.to.throw()
    })
  })

  describe('Functional Check', () => {
    it('#.oidKey()', () => {
      expect(helpers.oidKey('x')).to.be.eql('x')
      expect(helpers.oidKey(9999)).to.be.eql(9999)
      expect(helpers.oidKey(2051)).to.be.eql('cmdhDefEcValues')
      expect(helpers.oidKey('2051')).to.be.eql('cmdhDefEcValues')
      expect(helpers.oidKey('cmdhDefEcValues')).to.be.eql('cmdhDefEcValues')
    })

    it('#.oidNumber()', () => {
      expect(helpers.oidNumber('x')).to.be.eql('x') // @ts-ignore
      expect(helpers.oidNumber(9999)).to.be.eql(9999) // @ts-ignore
      expect(helpers.oidNumber(2051)).to.be.eql(2051) // @ts-ignore
      expect(helpers.oidNumber('2051')).to.be.eql(2051)
      expect(helpers.oidNumber('cmdhDefEcValues')).to.be.eql(2051)
    })

    it('#.ridKey()', () => {
      expect(helpers.ridKey('x', 1)).to.be.eql(1)
      expect(helpers.ridKey('x', 1)).to.be.eql(1) // @ts-ignore
      expect(helpers.ridKey(9999)).to.be.eql(9999) // @ts-ignore
      expect(helpers.ridKey(9999, 1)).to.be.eql(1)
      expect(helpers.ridKey(1, 9999)).to.be.eql(9999)
      expect(helpers.ridKey(1, 'xxx')).to.be.eql('xxx')
      // @ts-ignore
      expect(helpers.ridKey(5602)).to.be.eql('maxMeaValue') // @ts-ignore
      expect(helpers.ridKey('5602')).to.be.eql('maxMeaValue') // @ts-ignore
      expect(helpers.ridKey('maxMeaValue')).to.be.eql('maxMeaValue') // @ts-ignore
      expect(helpers.ridKey('lwm2mServer', 5)).to.be.eql('disableTimeout')
      expect(helpers.ridKey('lwm2mServer', '5')).to.be.eql('disableTimeout')
      expect(helpers.ridKey(1, 5)).to.be.eql('disableTimeout')
      expect(helpers.ridKey(1, '5')).to.be.eql('disableTimeout')
      expect(helpers.ridKey(1, 'disableTimeout')).to.be.eql('disableTimeout')
      expect(helpers.ridKey('1', 'disableTimeout')).to.be.eql('disableTimeout')
    })

    it('#.ridNumber()', () => {
      expect(helpers.ridNumber('x', 1)).to.be.eql(1)
      expect(helpers.ridNumber('x', 1)).to.be.eql(1) // @ts-ignore
      expect(helpers.ridNumber(9999)).to.be.eql(9999)
      expect(helpers.ridNumber(9999, 1)).to.be.eql(1)
      expect(helpers.ridNumber(1, 9999)).to.be.eql(9999)
      expect(helpers.ridNumber(1, 'xxx')).to.be.eql('xxx') // @ts-ignore

      expect(helpers.ridNumber(5602)).to.be.eql(5602) // @ts-ignore
      expect(helpers.ridNumber('5602')).to.be.eql(5602) // @ts-ignore
      expect(helpers.ridNumber('maxMeaValue')).to.be.eql(5602)
      expect(helpers.ridNumber('lwm2mServer', 5)).to.be.eql(5)
      expect(helpers.ridNumber('lwm2mServer', '5')).to.be.eql(5)
      expect(helpers.ridNumber(1, 5)).to.be.eql(5)
      expect(helpers.ridNumber(1, '5')).to.be.eql(5)
      expect(helpers.ridNumber(1, 'disableTimeout')).to.be.eql(5)
      expect(helpers.ridNumber('1', 'disableTimeout')).to.be.eql(5)
    })

    it('#.getPathArray()', () => {
      expect(helpers.getPathArray('/x/y/z')).to.be.eql(['x', 'y', 'z'])
      expect(helpers.getPathArray('/x/y/z/')).to.be.eql(['x', 'y', 'z'])
      expect(helpers.getPathArray('x/y/z/')).to.be.eql(['x', 'y', 'z'])
      expect(helpers.getPathArray('x/y/z')).to.be.eql(['x', 'y', 'z'])
    })

    it('#.getPathIdKey()', () => {
      expect(helpers.getPathIdKey('/1/2/3')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' })
      expect(helpers.getPathIdKey('/lwm2mServer/2/3')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' })
      expect(helpers.getPathIdKey('/1/2/defaultMaxPeriod')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' })
      expect(helpers.getPathIdKey('/lwm2mServer/2/defaultMaxPeriod')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' })
    })

    it('#.getNumPath()', () => {
      expect(helpers.getNumPath('/1/2/3')).to.be.eql('/1/2/3')
      expect(helpers.getNumPath('/lwm2mServer/2/3')).to.be.eql('/1/2/3')
      expect(helpers.getNumPath('/1/2/defaultMaxPeriod')).to.be.eql('/1/2/3')
      expect(helpers.getNumPath('/lwm2mServer/2/defaultMaxPeriod')).to.be.eql('/1/2/3')
    })

    it('#.decodeLinkFormat()', () => {
      expect(helpers.decodeLinkFormat('</1/2>;pmin=10;pmax=60,</1/2/1>,</1/2/2>')).to.be.eql({
        path: '/1/2',
        attrs: { pmin: 10, pmax: 60 },
        resrcList: ['/1/2/1', '/1/2/2'],
      })
      expect(helpers.decodeLinkFormat('</1/2/1>;pmin=10;pmax=60;gt=1;lt=100;st=1')).to.be.eql({
        path: '/1/2/1',
        attrs: { pmin: 10, pmax: 60, gt: 1, lt: 100, st: 1 },
      })
    })

    it('#.dotPath()', () => {
      expect(helpers.dotPath('.x.y.z')).to.be.eql('x.y.z')
      expect(helpers.dotPath('x.y.z.')).to.be.eql('x.y.z')
      expect(helpers.dotPath('/x.y.z.')).to.be.eql('x.y.z')
      expect(helpers.dotPath('/x.y/z.')).to.be.eql('x.y.z')
      expect(helpers.dotPath('/x/y/z')).to.be.eql('x.y.z')
      expect(helpers.dotPath('x/y/z/')).to.be.eql('x.y.z')
      expect(helpers.dotPath('/x.y/z.')).to.be.eql('x.y.z')
      expect(helpers.dotPath('/x.y/z/')).to.be.eql('x.y.z')
    })

    it('#.createPath()', () => {
      // @ts-ignore
      expect(helpers.createPath('/', 'x', 'y', 'z')).to.be.eql('x/y/z') // @ts-ignore
      expect(helpers.createPath('.', 'x', 'y', 'z')).to.be.eql('x.y.z') // @ts-ignore
      expect(helpers.createPath('', 'x', 'y', 'z')).to.be.eql('xyz') // @ts-ignore
      expect(helpers.createPath('')).to.be.eql('') // @ts-ignore
    })

    it('#.buildPathValuePairs()', () => {
      expect(helpers.buildPathValuePairs('/x/y/z', { a: { b: 3 } })).to.be.eql({ 'x.y.z.a.b': 3 })
      expect(helpers.buildPathValuePairs('/x/y/z', 3)).to.be.eql({ 'x.y.z': 3 })
      expect(helpers.buildPathValuePairs('/x/y/z', 'hello.world')).to.be.eql({ 'x.y.z': 'hello.world' })
      expect(helpers.buildPathValuePairs('/x/y/z', [3, 2, 1])).to.be.eql({ 'x.y.z.0': 3, 'x.y.z.1': 2, 'x.y.z.2': 1 })
      expect(helpers.buildPathValuePairs('/x/y/z', [{ m: 3 }, { m: 2 }])).to.be.eql({ 'x.y.z.0.m': 3, 'x.y.z.1.m': 2 })
    })

    it('#.buildRptAttr()', function () {})

    it('#.buildUpdateQuery()', function () {})

    it('#.getArrayArgus()', function () {})
  })
})
