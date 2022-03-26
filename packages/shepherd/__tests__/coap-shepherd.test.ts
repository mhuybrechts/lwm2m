import fs from 'fs'
import path from 'path'
import Q from 'q'
import _ from 'lodash'
import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
const expect = chai.expect

chai.use(sinonChai)

import { CoapShepherd, CoapNode, StorageNeDB, Storage } from '../src'

import fixture from './fixture'
import { createServer } from 'coap'
import rimraf from 'rimraf'
const _verifySignatureSync = fixture._verifySignatureSync
const _verifySignatureAsync = fixture._verifySignatureAsync
const _fireSetTimeoutCallbackEarlier = fixture._fireSetTimeoutCallbackEarlier

const shepherd: CoapShepherd = new CoapShepherd()

const interface6 = {
    ip_address: '::1',
    gateway_ip: '::c0a8:0101',
    mac_address: '00:00:00:00:00:00',
  },
  interface4 = {
    ip_address: '127.0.0.1',
    gateway_ip: '192.168.1.1',
    mac_address: '00:00:00:00:00:00',
  }

describe('coap-shepherd', () => {
  describe('Constructor Check', () => {
    it('coapShepherd', () => {
      expect(shepherd.clientIdCount).to.be.eql(1)
      expect(shepherd.registry).to.be.eql({})
      expect(shepherd.enabled).to.be.false
      expect(shepherd.server).to.be.eql(null)
      // expect(shepherd._hbChecker).to.be.eql(null)
      expect(shepherd.storage).to.be.instanceOf(StorageNeDB)
    })
  })

  describe('Signature Check', () => {
    describe('#.constructor()', () => {
      it('should throw TypeError if config is given but not an object', () => {
        _verifySignatureSync((arg) => new CoapShepherd(arg), ['undefined', 'object'])
      })

      it('should throw TypeError if config.storage is given but not an instance of StorageInterface', () => {
        _verifySignatureSync(
          (arg) => {
            const options = { storage: arg }
            return new CoapShepherd(options)
          },
          ['undefined', 'null', Storage],
        )
      })
    })

    describe('#.find()', () => {
      it('should throw TypeError if clientName is not a string', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.find(arg)
          },
          ['string'],
        )
      })
    })

    describe('#.findByMacAddr()', () => {
      it('should throw TypeError if macAddr is not a string', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.findByMacAddr(arg)
          },
          ['string'],
        )
      })
    })

    describe('#._findByClientId()', () => {
      it('should throw TypeError if clientId is not a string or a number', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.findByClientId(arg)
          },
          ['string', 'number'],
        )
      })
    })

    describe('#._findByLocationPath()', () => {
      it('should throw TypeError if clientId is not a string', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.findByLocationPath(arg)
          },
          ['string'],
        )
      })
    })

    describe('#.permitJoin()', () => {
      it('should throw TypeError if time is not a number', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.permitJoin(arg)
          },
          ['undefined', 'number'],
        )
      })
    })

    describe('#.alwaysPermitJoin()', () => {
      it('should throw TypeError if permit is not a boolean', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.alwaysPermitJoin(arg)
          },
          ['boolean'],
        )
      })
    })

    describe('#.request()', () => {
      it('should throw TypeError if reqObj is not an object', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.request(arg)
          },
          ['object'],
        )
      })
    })

    describe('#.announce()', () => {
      it('should throw TypeError if msg is not a string', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.announce(arg)
          },
          ['string'],
        )
      })
    })

    describe('#.remove()', () => {
      it('should throw TypeError if clientName is not a string', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.remove(arg)
          },
          ['string'],
        )
      })
    })

    describe('#.acceptDevIncoming()', () => {
      it('should throw TypeError if predicate is not a function', () => {
        const savedPredicate = shepherd.acceptDeviceIncoming
        _verifySignatureSync(
          (arg) => {
            shepherd.setAcceptDeviceIncoming(arg)
          },
          ['function'],
        )
        shepherd.acceptDeviceIncoming = savedPredicate
      })
    })

    describe('#._newClientId()', () => {
      it('should throw TypeError if id is not a number', () => {
        _verifySignatureSync(
          (arg) => {
            shepherd.newClientId(arg)
          },
          ['undefined', 'number'],
        )
      })
    })
  })

  describe('Functional Check', () => {
    const testDBPath = path.resolve(__dirname, './database/test.db')

    after(() => {
      rimraf.sync(path.dirname(testDBPath))
    })

    describe('#.constructor()', () => {
      it('should create an instance when passing no arguments', () => {
        const created = new CoapShepherd()
        expect(created).to.be.not.null
        expect(created).to.be.instanceOf(CoapShepherd)
        expect(created.storage).to.be.instanceOf(StorageNeDB)
        expect(created.config).to.be.an('object')
        expect(created.config.connectionType).to.be.eql('udp4')
        expect(created.config.ip).to.be.eql('127.0.0.1')
        expect(created.config.port).to.be.eql(5683)
        expect(created.config.reqTimeout).to.be.eql(60)
        expect(created.config.hbTimeout).to.be.eql(60)
        expect(created.config.defaultDBPath).to.be.a('string')
        expect(created.config.defaultDBPath.split('/').pop()).to.be.eql('coap.db')
      })

      it('should create an instance when passing config argument', () => {
        // @ts-ignore
        const myStorage = new Storage()
        myStorage._myFlag = 'customized'
        const created = new CoapShepherd({
          connectionType: 'udp6',
          ip: '::2',
          port: 1234,
          hbTimeout: 45,
          storage: myStorage,
          defaultDBPath: testDBPath,
        })
        expect(created).to.be.not.null
        expect(created).to.be.instanceOf(CoapShepherd)
        expect(created.storage).to.equal(myStorage)
        // @ts-ignore
        expect(created.storage._myFlag).to.equal('customized')
        expect(created.config).to.be.an('object')
        expect(created.config.connectionType).to.be.eql('udp6')
        expect(created.config.ip).to.be.eql('::2')
        expect(created.config.port).to.be.eql(1234)
        expect(created.config.reqTimeout).to.be.eql(60)
        expect(created.config.hbTimeout).to.be.eql(45)
        expect(created.config.defaultDBPath).to.be.eql(testDBPath)
      })
    })

    describe('#.start()', () => {
      before(() =>
        Q.all(
          [1, 2, 3]
            .map((index) => new CoapNode(shepherd, { clientName: 'myCoapNode' + index }))
            .map((cnode) => shepherd.storage.save(cnode)),
        ),
      )

      it('should start shepherd', () =>
        shepherd.start().then(() => {
          expect(Object.keys(shepherd.registry)).to.have.lengthOf(3)
          expect(shepherd.registry).to.have.property('myCoapNode1')
          expect(shepherd.registry['myCoapNode1']).to.be.instanceOf(CoapNode)
          expect(shepherd.registry['myCoapNode1'].clientName).to.equal('myCoapNode1')
          expect(shepherd.registry).to.have.property('myCoapNode2')
          expect(shepherd.registry['myCoapNode2']).to.be.instanceOf(CoapNode)
          expect(shepherd.registry['myCoapNode2'].clientName).to.equal('myCoapNode2')
          expect(shepherd.registry).to.have.property('myCoapNode3')
          expect(shepherd.registry['myCoapNode3']).to.be.instanceOf(CoapNode)
          expect(shepherd.registry['myCoapNode3'].clientName).to.equal('myCoapNode3')
          expect(shepherd.enabled).to.equal(true)
        }))

      after(() => {
        shepherd.registry = {}
        return shepherd.storage.reset()
      })
    })

    describe('#.permitJoin()', () => {
      it('should open permitJoin when time > 0', () => {
        expect(shepherd.permitJoin(180)).to.be.eql(true)
        expect(shepherd.joinable).to.be.eql(true)
      })

      it('should close permitJoin when time == 0', () => {
        expect(shepherd.permitJoin(0)).to.be.eql(false)
        expect(shepherd.joinable).to.be.eql(false)
      })

      it('should open permitJoin when time > 0 after alwaysPermitJoin(false)', () => {
        shepherd.alwaysPermitJoin(false)
        shepherd.permitJoin(180)
        expect(shepherd.joinable).to.be.eql(true)
      })

      it('should close permitJoin when time == 0 after alwaysPermitJoin(true)', () => {
        shepherd.alwaysPermitJoin(true)
        shepherd.permitJoin(0)
        expect(shepherd.joinable).to.be.eql(false)
      })
    })

    describe('#.alwaysPermitJoin()', () => {
      it('should open permitJoin when permit is true', () => {
        const result = shepherd.alwaysPermitJoin(true)
        expect(result).to.be.eql(true)
        expect(shepherd.joinable).to.be.eql(true)
      })

      it('should close permitJoin when permit is false', () => {
        shepherd.alwaysPermitJoin(false)
        expect(shepherd.joinable).to.be.eql(false)
      })

      it('should clear _permitJoinTimer when permit is true', () => {
        shepherd.permitJoin(180)
        const result = shepherd.alwaysPermitJoin(true)
        expect(result).to.be.eql(true)
        expect(shepherd.joinable).to.be.eql(true)
        expect(shepherd._permitJoinTimer).to.be.eql(null)
      })

      it('should clear _permitJoinTimer when permit is false', () => {
        shepherd.permitJoin(180)
        const result = shepherd.alwaysPermitJoin(false)
        expect(result).to.be.eql(true)
        expect(shepherd.joinable).to.be.eql(false)
        expect(shepherd._permitJoinTimer).to.be.eql(null)
      })

      it('should not open permitJoin when server is not enabled', () => {
        shepherd.joinable = false
        shepherd.enabled = false
        const result = shepherd.alwaysPermitJoin(true)
        expect(result).to.be.eql(false)
        expect(shepherd.joinable).to.be.eql(false)
      })

      after(() => {
        shepherd.enabled = true
        shepherd.alwaysPermitJoin(true)
      })
    })

    describe('#register new cnode', () => {
      before(() => {
        shepherd.clientIdCount = 1
      })

      it('should not crash if "ep" not passed in', () => {
        const rsp: any = {}

        const req: any = {
          code: '0.01',
          method: 'POST',
          url: '/rd?lt=86400&lwm2m=1.0.0&mac=AA:AA:AA',
          rsinfo: {
            address: '127.0.0.1',
            port: '5686',
          },
          payload: '</x/0>,</x/1>,</y/0>,</y/1>',
          headers: {},
        }

        const oldSetImmediate = global.setImmediate
        let reqHandler
        rsp.setOption = sinon.spy()
        rsp.end = sinon.spy()
        // @ts-ignore
        global.setImmediate = sinon.spy()
        emitClientReqMessage(shepherd, req, rsp)
        expect(global.setImmediate).to.have.been.called
        // @ts-ignore
        reqHandler = global.setImmediate.args[0][0]
        global.setImmediate = oldSetImmediate

        expect(reqHandler).not.to.throw()

        expect(rsp.setOption).not.to.have.been.called
        expect(rsp.end).to.have.been.calledWith('')
        expect(rsp.code).to.eql('4.00')
        // @ts-ignore
        expect(shepherd.find('')).to.be.falsy
      })

      it('should register new cnode', (done) => {
        // @ts-ignore
        const _readAllResourceStub = sinon.stub(CoapNode.prototype, 'readAllResource').callsFake((path, callback) =>
          Q.resolve({
            status: '2.05',
            data: {
              x: { 0: { x0: 10, x1: 20 }, 1: { x0: 11, x1: 21 } },
              y: { 0: { y0: 20, y1: 40 }, 1: { y0: 22, y1: 44 } },
            },
          }),
        )

        const observeReqStub = sinon.stub(CoapNode.prototype, 'observe').callsFake((callback) =>
          Q.resolve({
            status: '2.05',
            data: 'hb',
          }),
        )

        const rsp: any = {}
        let cnode

        const regCallback = (msg) => {
          if (msg.type === 'device::incoming') {
            cnode = msg.cnode
            _readAllResourceStub.restore()
            observeReqStub.restore()
            expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'), new Buffer(cnode.clientId.toString())])
            expect(rsp.end).to.have.been.calledWith('')
            if (shepherd.find('cnode01') === cnode) {
              shepherd.removeListener('message', regCallback)
              done()
            }
          }
        }

        rsp.setOption = sinon.spy()
        rsp.end = sinon.spy()
        _fireSetTimeoutCallbackEarlier(2)

        shepherd.on('message', regCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.01',
            method: 'POST',
            url: '/rd?ep=cnode01&lt=86400&lwm2m=1.0.0&mac=AA:AA:AA',
            rsinfo: {
              address: '127.0.0.1',
              port: '5686',
            },
            payload: '</x/0>,</x/1>,</y/0>,</y/1>',
            headers: {},
          },
          rsp,
        )
      })

      it('should register 2nd new cnode', (done) => {
        // @ts-ignore
        const _readAllResourceStub = sinon.stub(CoapNode.prototype, 'readAllResource').callsFake((path, callback) =>
          Q.resolve({
            status: '2.05',
            data: {
              a: { 0: { a0: 10, a1: 20 }, 1: { a0: 11, a1: 21 } },
              b: { 0: { b0: 20, b1: 40 }, 1: { b0: 22, b1: 44 } },
            },
          }),
        )

        const observeReqStub = sinon.stub(CoapNode.prototype, 'observe').callsFake((callback) =>
          Q.resolve({
            status: '2.05',
            data: 'hb',
          }),
        )

        const rsp: any = {}
        let cnode

        const regCallback = (msg) => {
          if (msg.type === 'device::incoming') {
            cnode = msg.cnode
            expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'), new Buffer(cnode.clientId.toString())])
            expect(rsp.end).to.have.been.calledWith('')
            if (shepherd.find('cnode02') === cnode) {
              _readAllResourceStub.restore()
              observeReqStub.restore()
              shepherd.removeListener('message', regCallback)
              done()
            }
          }
        }

        rsp.setOption = sinon.spy()
        rsp.end = sinon.spy()
        _fireSetTimeoutCallbackEarlier(2)

        shepherd.on('message', regCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.01',
            method: 'POST',
            url: '/rd?ep=cnode02&lt=86400&lwm2m=1.0.0&mac=BB:BB:BB',
            rsinfo: {
              address: '127.0.0.1',
              port: '5687',
            },
            payload: '</a/0>,</a/1>,</b/0>,</b/1>',
            headers: {},
          },
          rsp,
        )
      })
    })

    describe('#config.clientNameParser', () => {
      before(() => {
        shepherd.config.clientNameParser = (clientName) => clientName.split(':')[1]
      })

      after((done) => {
        shepherd.config.clientNameParser = (clientName) => clientName
        shepherd.remove('cnode0X', done)
      })

      it('should keep the last part of clientName', (done) => {
        // @ts-ignore
        const _readAllResourceStub = sinon.stub(CoapNode.prototype, 'readAllResource').callsFake((path, callback) =>
          Q.resolve({
            status: '2.05',
            data: {
              a: { 0: { a0: 10, a1: 20 }, 1: { a0: 11, a1: 21 } },
              b: { 0: { b0: 20, b1: 40 }, 1: { b0: 22, b1: 44 } },
            },
          }),
        )

        const observeReqStub = sinon.stub(CoapNode.prototype, 'observe').callsFake((callback) =>
          Q.resolve({
            status: '2.05',
            data: 'hb',
          }),
        )

        const rsp: any = {}
        let cnode

        const regCallback = (msg) => {
          if (msg.type === 'device:incoming') {
            _readAllResourceStub.restore()
            observeReqStub.restore()
            shepherd.removeListener('message', regCallback)
            cnode = msg.cnode
            expect(cnode.clientName).to.eql('cnode0X')
            expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'), new Buffer(cnode.clientId.toString())])
            expect(rsp.end).to.have.been.calledWith('')
            expect(shepherd.find('cnode0X')).to.be.ok
            done()
          }
        }

        rsp.setOption = sinon.spy()
        rsp.end = sinon.spy()
        _fireSetTimeoutCallbackEarlier(2)

        shepherd.on('message', regCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.01',
            method: 'POST',
            url: '/rd?ep=urn:cnode0X&lt=86400&lwm2m=1.0.0&mac=FF:FF:FF',
            rsinfo: {
              address: '127.0.0.1',
              port: '5687',
            },
            payload: '</a/0>,</a/1>,</b/0>,</b/1>',
            headers: {},
          },
          rsp,
        )
      })
    })

    describe('#config.alwaysFireDevIncoming', () => {
      before(() => {
        shepherd.config.alwaysFireDevIncoming = true
      })

      after(() => {
        shepherd.config.alwaysFireDevIncoming = false
      })

      it('should fire device:incoming', (done) => {
        // @ts-ignore
        const _readAllResourceStub = sinon.stub(CoapNode.prototype, 'readAllResource').callsFake((path, callback) =>
          Q.resolve({
            status: '2.05',
            data: {
              a: { 0: { a0: 10, a1: 20 }, 1: { a0: 11, a1: 21 } },
              b: { 0: { b0: 20, b1: 40 }, 1: { b0: 22, b1: 44 } },
            },
          }),
        )

        const observeReqStub = sinon.stub(CoapNode.prototype, 'observe').callsFake((callback) =>
          Q.resolve({
            status: '2.05',
            data: 'hb',
          }),
        )

        const rsp: any = {}
        let cnode

        const regCallback = (msg) => {
          _readAllResourceStub.restore()
          observeReqStub.restore()
          shepherd.removeListener('ind', regCallback)
          expect(msg.type).to.eql('device::incoming')
          cnode = msg.cnode
          expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'), new Buffer(cnode.clientId.toString())])
          expect(rsp.end).to.have.been.calledWith('')
          expect(shepherd.find('cnode02')).to.eql(cnode)
          done()
        }

        expect(shepherd.find('cnode02')).to.be.ok
        rsp.setOption = sinon.spy()
        rsp.end = sinon.spy()
        _fireSetTimeoutCallbackEarlier(2)

        shepherd.on('message', regCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.01',
            method: 'POST',
            url: '/rd?ep=cnode02&lt=86400&lwm2m=1.0.0&mac=BB:BB:BB',
            rsinfo: {
              address: '127.0.0.1',
              port: '5687',
            },
            payload: '</a/0>,</a/1>,</b/0>,</b/1>',
            headers: {},
          },
          rsp,
        )
      })
    })

    describe('#update cnode', () => {
      it('should update cnode lifetime', (done) => {
        const rsp: any = {}
        let cnode

        const upCallback = (msg) => {
          if (msg.type === 'device::update') {
            const diff = msg.data
            expect(rsp.end).to.have.been.calledWith('')
            if (diff.lifetime == 87654) {
              shepherd.removeListener('ind', upCallback)
              done()
            }
          }
        }

        rsp.end = sinon.spy()

        shepherd.on('message', upCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.02',
            method: 'POST',
            url: '/rd/1?lt=87654',
            rsinfo: {
              address: '127.0.0.1',
              port: '5688',
            },
            payload: '',
            headers: {},
          },
          rsp,
        )
      })
    })

    describe('#config.autoReadResources', () => {
      let shepherd: CoapShepherd

      before((done) => {
        shepherd = new CoapShepherd({
          port: 5684,
          defaultDBPath: testDBPath,
          autoReadResources: false,
        })
        shepherd.start().then(() => {
          shepherd.alwaysPermitJoin(true)
          done()
        })
      })

      it('should not call cnode._readAllResource when autoReadResources is false for register', (done) => {
        const _readAllResourceStub = sinon.stub(CoapNode.prototype, 'readAllResource')

        const observeReqStub = sinon.stub(CoapNode.prototype, 'observe').callsFake((callback) =>
          Q.resolve({
            status: '2.05',
            data: 'hb',
          }),
        )

        const rsp: any = {}
        let cnode

        const regCallback = (msg) => {
          if (msg.type === 'device::incoming') {
            cnode = msg.cnode
            expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'), new Buffer(cnode.clientId.toString())])
            expect(rsp.end).to.have.been.calledWith('')
            expect(_readAllResourceStub).to.have.not.been.called
            if (shepherd.find('cnode02') === cnode) {
              _readAllResourceStub.restore()
              observeReqStub.restore()
              shepherd.removeListener('ind', regCallback)
              done()
            }
          }
        }

        rsp.setOption = sinon.spy()
        rsp.end = sinon.spy()
        _fireSetTimeoutCallbackEarlier(2)

        shepherd.on('message', regCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.01',
            method: 'POST',
            url: '/rd?ep=cnode02&lt=86400&lwm2m=1.0.0&mac=BB:BB:BB',
            rsinfo: {
              address: '127.0.0.1',
              port: '5687',
            },
            payload: '</a/0>,</a/1>,</b/0>,</b/1>',
            headers: {},
          },
          rsp,
        )
      })

      it('should not call cnode._readAllResource when autoReadResources is false for update', (done) => {
        const _readAllResourceStub = sinon.stub(CoapNode.prototype, 'readAllResource')

        const _updateAttrsStub = sinon.stub(CoapNode.prototype, 'updateAttrs').callsFake(() =>
          Q.fcall(() => ({
            lifetime: 87654,
            objList: {},
          })),
        )

        const rsp: any = {}
        let cnode

        const upCallback = (msg) => {
          if (msg.type === 'device::update') {
            const diff = msg.data
            expect(rsp.end).to.have.been.calledWith('')
            expect(_readAllResourceStub).to.have.not.been.called
            if (diff.lifetime == 87654) {
              _readAllResourceStub.restore()
              _updateAttrsStub.restore()
              shepherd.removeListener('message', upCallback)
              done()
            }
          }
        }

        rsp.end = sinon.spy()

        shepherd.on('message', upCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.02',
            method: 'POST',
            url: '/rd/1?lt=87654',
            rsinfo: {
              address: '127.0.0.1',
              port: '5688',
            },
            payload: '',
            headers: {},
          },
          rsp,
        )
      })
    })

    describe('#deregister cnode', () => {
      it('should deregister 2nd cnode ', (done) => {
        const rsp: any = {}
        let cnode

        const deCallback = (msg) => {
          if (msg.type === 'devLeaving') {
            const clientName = msg.cnode
            expect(rsp.end).to.have.been.calledWith('')
            if (clientName === 'cnode02' && !shepherd.find('cnode02')) {
              shepherd.removeListener('message', deCallback)
              done()
            }
          }
        }

        rsp.end = sinon.spy()

        shepherd.on('message', deCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.03',
            method: 'DELETE',
            url: '/rd/2',
            rsinfo: {
              address: '127.0.0.1',
              port: '5687',
            },
            payload: '',
            headers: {},
          },
          rsp,
        )
      })
    })

    describe('#checkOut cnode', () => {
      it('should check out and cnode status changed to sleep', (done) => {
        const rsp: any = {}
        let cnode

        const outCallback = (msg) => {
          if (msg.type === 'devStatus' || msg.data === 'sleep') {
            const clientName = msg.cnode.clientName
            expect(rsp.end).to.have.been.calledWith('')
            if (clientName === 'cnode01') {
              expect(shepherd.find('cnode01').status).to.be.eql('sleep')
              shepherd.removeListener('message', outCallback)
              done()
            }
          }
        }

        rsp.end = sinon.spy()
        _fireSetTimeoutCallbackEarlier()

        shepherd.on('message', outCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.04',
            method: 'PUT',
            url: '/rd/1?chk=out',
            rsinfo: {
              address: '127.0.0.1',
              port: '5688',
            },
            payload: '',
            headers: {},
          },
          rsp,
        )
      })

      it('should return error when device is sleeping', (done) => {
        const cnode = shepherd.find('cnode01')

        cnode.read('/x/0/x0', (err) => {
          if (err) done()
        })
      })

      it('should check out and cnode status changed to sleep with duration', (done) => {
        const rsp: any = {}
        let cnode

        const outCallback = (msg) => {
          if (msg.type === 'devStatus' || msg.data === 'offline') {
            const clientName = msg.cnode.clientName
            expect(rsp.end).to.have.been.calledWith('')
            if (clientName === 'cnode01') {
              expect(shepherd.find('cnode01').status).to.be.eql('offline')
              shepherd.removeListener('message', outCallback)
              done()
            }
          }
        }

        rsp.end = sinon.spy()

        shepherd.on('message', outCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.04',
            method: 'PUT',
            url: '/rd/1?chk=out&t=1',
            rsinfo: {
              address: '127.0.0.1',
              port: '5688',
            },
            payload: '',
            headers: {},
          },
          rsp,
        )
      })
    })

    describe('#checkIn cnode', () => {
      it('should check out and cnode status changed to online', (done) => {
        const observeReqStub = sinon.stub(CoapNode.prototype, 'observe').callsFake((callback) =>
          Q.resolve({
            status: '2.05',
            data: 'hb',
          }),
        )

        // @ts-ignore
        const delayStub = sinon.stub(_, 'delay').callsFake((cb) => {
          setImmediate(cb)
        })

        const rsp: any = {}
        let cnode

        const inCallback = (msg) => {
          if (msg.type === 'devStatus' || msg.data === 'online') {
            const clientName = msg.cnode.clientName
            expect(rsp.end).to.have.been.calledWith('')
            if (clientName === 'cnode01') {
              observeReqStub.restore()
              delayStub.restore()
              expect(shepherd.find('cnode01').status).to.be.eql('online')
              expect(shepherd.find('cnode01').port).to.be.eql('5690')
              shepherd.removeListener('message', inCallback)
              done()
            }
          }
        }

        rsp.end = sinon.spy()

        shepherd.on('message', inCallback)

        emitClientReqMessage(
          shepherd,
          {
            code: '0.04',
            method: 'PUT',
            url: '/rd/1?chk=in',
            rsinfo: {
              address: '127.0.0.1',
              port: '5690',
            },
            payload: '',
            headers: {},
          },
          rsp,
        )
      })
    })

    describe('#.lookup', () => {
      it('should not crash if "ep" not passed in', () => {
        const rsp: any = {}

        const req = {
          code: '0.01',
          method: 'GET',
          url: '/lookup?lt=86400&lwm2m=1.0.0&mac=AA:AA:AA',
          rsinfo: {
            address: '127.0.0.1',
            port: '5686',
          },
          payload: '</x/0>,</x/1>,</y/0>,</y/1>',
          headers: {},
        }

        const oldSetImmediate = global.setImmediate
        let reqHandler
        rsp.setOption = sinon.spy()
        rsp.end = sinon.spy()
        // @ts-ignore
        global.setImmediate = sinon.spy()
        emitClientReqMessage(shepherd, req, rsp)
        expect(global.setImmediate).to.have.been.called
        // @ts-ignore
        reqHandler = global.setImmediate.args[0][0]
        global.setImmediate = oldSetImmediate

        expect(reqHandler).not.to.throw()

        expect(rsp.setOption).not.to.have.been.called
        expect(rsp.end).to.have.been.calledWith('')
        expect(rsp.code).to.eql('4.00')
      })
    })

    describe('#.find()', () => {
      it('should find cnode01 by clientName and return cnode01', () => {
        const cnode01 = shepherd.find('cnode01')
        expect(cnode01.clientName).to.be.eql('cnode01')
      })

      it('should not find cnode02 and return undefined', () => {
        const cnode02 = shepherd.find('cnode02')
        expect(cnode02).to.be.eql(undefined)
      })
    })

    describe('#.findByMacAddr()', () => {
      it('should find cnode01 by MacAddr and return cnode01', () => {
        const cnode01 = shepherd.findByMacAddr('AA:AA:AA')[0]
        expect(cnode01.clientName).to.be.eql('cnode01')
      })

      it('should not find cnode02 and return undefined', () => {
        const cnode02 = shepherd.findByMacAddr('BB:BB:BB')
        expect(cnode02).to.be.eql([])
      })
    })

    describe('#.findByClientId()', () => {
      it('should find cnode01 by ClientId and return cnode01', () => {
        const cnode01 = shepherd.findByClientId(1)
        expect(cnode01.clientName).to.be.eql('cnode01')
      })

      it('should not find cnode02 and return undefined', () => {
        const cnode02 = shepherd.findByClientId(2)
        expect(cnode02).to.be.eql(undefined)
      })
    })

    describe('#.findByLocationPath()', () => {
      it('should find cnode01 by LocationPath and return cnode01', () => {
        const cnode01 = shepherd.findByLocationPath('/rd/1')
        expect(cnode01.clientName).to.be.eql('cnode01')
      })

      it('should not find cnode02 and return undefined', () => {
        const cnode02 = shepherd.findByLocationPath('/rd/2')
        expect(cnode02).to.be.eql(undefined)
      })
    })

    describe('#.list()', () => {
      it('should return devices list', () => {
        const list = shepherd.list()
        expect(list[0].clientName).to.be.eql('cnode01')
        expect(list[0].mac).to.be.eql('AA:AA:AA')
      })
    })

    // @ts-ignore
    describe('#.request()', (done) => {
      it('should announce a message', () => {
        const server = createServer()

        server.on('request', (req, rsp) => {
          if (req.payload.method === 'PUT') done()
        })

        server.listen(5690)
        shepherd.request({
          hostname: '127.0.0.1',
          port: 5690,
          method: 'PUT',
        })
      })
    })
    // @ts-ignore
    describe('#.announce()', (done) => {
      it('should announce a message', () => {
        const server = createServer()

        server.on('request', (req, rsp) => {
          if (req.payload.toString() === 'Hum') done()
        })

        server.listen(5688)
        shepherd.announce('Hum')
      })
    })

    describe('#.remove()', () => {
      it('should remove cnode01', () => {
        shepherd.remove('cnode01', () => {
          expect(shepherd.find('shepherd')).to.be.eql(undefined)
        })
      })
    })

    describe('#.acceptDevIncoming()', () => {
      it('should implement acceptDevIncoming and get not allow rsp', (done) => {
        const rsp: any = {}

        rsp.end = (msg) => {
          expect(rsp.code).to.be.eql('4.05')
          expect(msg).to.be.eql('')
          expect(shepherd.find('cnode03')).to.equal(undefined)
          done()
        }

        shepherd.setAcceptDeviceIncoming((devInfo, callback) => {
          if (devInfo.clientName === 'cnode03') {
            callback(null, false)
          } else {
            callback(null, true)
          }
        })

        emitClientReqMessage(
          shepherd,
          {
            code: '0.01',
            method: 'POST',
            url: '/rd?ep=cnode03&lt=86400&lwm2m=1.0.0&mac=BB:BB:BB',
            rsinfo: {
              address: '127.0.0.1',
              port: '5687',
            },
            payload: '</a/0>,</a/1>,</b/0>,</b/1>',
            headers: {},
          },
          rsp,
        )
      })

      it('should implement acceptDevIncoming and create dev', (done) => {
        const rsp: any = {},
          extra = { businessKey: 'hello_world' }

        rsp.setOption = sinon.spy()
        rsp.end = (msg) => {
          expect(rsp.code).to.be.eql('2.01')
          const node = shepherd.find('cnode03')
          expect(node).to.be.instanceOf(CoapNode)
          expect(node.clientName).to.equal('cnode03')
          expect(node._extra).to.equal(extra)
          done()
        }

        shepherd.setAcceptDeviceIncoming((devInfo, callback) => {
          callback(null, true, extra)
        })

        emitClientReqMessage(
          shepherd,
          {
            code: '0.01',
            method: 'POST',
            url: '/rd?ep=cnode03&lt=86400&lwm2m=1.0.0&mac=BB:BB:BB',
            rsinfo: {
              address: '127.0.0.1',
              port: '5687',
            },
            payload: '</a/0>,</a/1>,</b/0>,</b/1>',
            headers: {},
          },
          rsp,
        )
      })
    })

    describe('#.stop()', () => {
      it('should stop shepherd', () =>
        shepherd.stop().then(() => {
          expect(shepherd.enabled).to.equal(false)
          expect(shepherd.server).to.equal(null)
        }))
    })

    describe('#.reset()', () => {
      it('should reset shepherd', () => {
        const storageResetStub = sinon.stub(StorageNeDB.prototype, 'reset')
        return shepherd.reset().then(() => {
          storageResetStub.restore()
          expect(shepherd.enabled).to.equal(true)
          expect(storageResetStub).not.have.been.called
        })
      })

      it('should remove db and reset shepherd', () => {
        const storageResetStub = sinon.stub(StorageNeDB.prototype, 'reset')
        return shepherd.reset(true).then(() => {
          storageResetStub.restore()
          expect(shepherd.enabled).to.equal(true)
          expect(storageResetStub).have.been.called
        })
      })
    })
  })
})

function emitClientReqMessage(shepherd, req, rsp) {
  shepherd.server.emit('request', req, rsp)
}
