import _ from "lodash";
import Q from "q";
import * as sinon from "sinon";
import * as chai from "chai";

const expect = chai.expect;
const sinonChai = require("sinon-chai");
chai.use(sinonChai);

import { StorageNeDB } from "../src/StorageNeDB";
import { CoapNode } from "../src/CoapNode";
import { helpers as cutils } from "@hollowy/coap-helpers";

import defaultConfig from "../src/config";
import fixture from "./fixture";
const _verifySignatureSync = fixture._verifySignatureSync;
const _verifySignatureAsync = fixture._verifySignatureAsync;

const devAttrs = {
  clientName: "coap-client",
  lifetime: 86400,
  ip: "192.168.1.100",
  port: "5685",
  mac: "AA:BB:CC:DD:EE:00",
  version: "1.0.0",
  objList: { x: [0, 1] },
  ct: "11543",
  heartbeatEnabled: true,
};

const sObj = {
  0: {
    x0: 10,
    x1: 20,
  },
  1: {
    x0: 100,
    x1: 200,
  },
};

let fakeShp, node: CoapNode, reqObj, rspObj;

describe("coap-node", () => {
  before(() => {
    fakeShp = {
      emit: function () {},
      request: function (req, callback) {
        const deferred = Q.defer();
        if (_.isEqual(req, reqObj)) deferred.resolve(rspObj);

        return deferred.promise.nodeify(callback);
      },
      newClientId: function () {
        return 1;
      },
      config: Object.assign({}, defaultConfig),
      storage: new StorageNeDB(""),
    };
    node = new CoapNode(fakeShp, devAttrs);

    node.so.init("x", 0, sObj[0]);
    node.so.init("x", 1, sObj[1]);
  });

  describe("Constructor Check", () => {
    it("new CoapNode()", () => {
      expect(node.shepherd).to.be.equal(fakeShp);
      expect(node.clientName).to.be.eql("coap-client");
      expect(node.ip).to.be.eql("192.168.1.100");
      expect(node.version).to.be.eql("1.0.0");
      expect(node.lifetime).to.be.eql(86400);
      expect(node.status).to.be.eql("offline");
      expect(node.objList).to.be.eql({ x: [0, 1] });
      expect(node.observedList).to.be.eql([]);
      expect(node._registered).to.be.false;
      expect(node._streamObservers).to.be.eql({});
      expect(node._lifeChecker).to.be.eql(null);
      expect(node._heartbeat).to.be.eql(null);
    });
  });

  describe("Signature Check", () => {
    it("new CoapNode()", () => {
      _verifySignatureSync((arg) => new CoapNode(arg, {}), [fakeShp]);
      _verifySignatureSync((arg) => new CoapNode(fakeShp, arg), ["object"]);
    });

    it("#.lifeCheck()", () => {
      _verifySignatureSync(
        (arg) => {
          node.lifeCheck(arg);
        },
        ["boolean"]
      );
    });

    it("#.sleepCheck()", () => {
      _verifySignatureSync(
        (arg) => {
          node.sleepCheck(arg);
        },
        ["boolean"]
      );
    });

    it("#._reqObj()", () => {
      _verifySignatureSync(
        (arg) => {
          // @ts-ignore
          node._reqObj(arg, arg);
        },
        ["string"]
      );
    });

    it("#.setStatus()", () => {
      _verifySignatureSync(
        (arg) => {
          node.setStatus(arg);
        },
        [["online", "offline", "sleep"]]
      );
    });

    // Asynchronous APIs
    describe("#.read()", () => {
      it("should throw err if path is not a string", () => {
        _verifySignatureSync(
          (arg) => {
            node.read(arg).done();
          },
          ["string"]
        );
      });

      it("should return err if not registered", (done) => {
        node._registered = false;
        node.read("x").fail((err) => {
          done();
        });
      });

      it("should return err if status is offline", (done) => {
        node._registered = true;
        node.read("x").fail((err) => {
          done();
        });
      });
    });

    describe("#.writeReq()", () => {
      it("should throw err if path is not a string", () => {
        _verifySignatureSync(
          (arg) => {
            node.write(arg, 1).done();
          },
          ["string"]
        );
      });

      it("should throw err if value is undefined", () => {
        expect(() => node.write("x/y/z", undefined)).to.throw();
      });

      it("should return err if not registered", (done) => {
        node._registered = false;
        node.write("x/y", {}).fail((err) => {
          done();
        });
      });

      it("should return err if status is offline", (done) => {
        node._registered = true;
        node.write("x/y", {}).fail((err) => {
          done();
        });
      });
    });

    describe("#.execute()", () => {
      it("should throw err if path is not a string", () => {
        _verifySignatureSync(
          (arg) => {
            node.execute(arg, []).done();
          },
          ["string"]
        );
      });

      it("should return err if not registered", (done) => {
        node._registered = false;
        node.execute("x/y/z", []).fail((err) => {
          done();
        });
      });

      it("should return err if status is offline", (done) => {
        node._registered = true;
        node.execute("x/y/z", []).fail((err) => {
          done();
        });
      });

      it("should return err if args is not an array", () =>
        _verifySignatureAsync(
          (arg) => node.execute("x/y/z", arg, undefined),
          ["undefined", "null", "array"]
        ));
    });

    describe("#.discoverReq()", () => {
      it("should throw err if path is not a string", () => {
        _verifySignatureSync(
          (arg) => {
            node.discover(arg).done();
          },
          ["string"]
        );
      });

      it("should return err if not registered", (done) => {
        node._registered = false;
        node.discover("x/y").fail((err) => {
          done();
        });
      });

      it("should return err if status is offline", (done) => {
        node._registered = true;
        node.discover("x/y").fail((err) => {
          done();
        });
      });
    });

    describe("#.writeAttrReq()", () => {
      it("should throw err if path is not a string", () => {
        _verifySignatureSync(
          (arg) => {
            node.writeAttrs(arg, {}).done();
          },
          ["string"]
        );
      });

      it("should throw err if attrs is not an object", () => {
        _verifySignatureSync(
          (arg) => {
            node.writeAttrs("x/y", arg).done();
          },
          ["object"]
        );
      });

      it("should return err if not registered", (done) => {
        node._registered = false;
        node.writeAttrs("x/y", {}).fail((err) => {
          done();
        });
      });

      it("should return err if status is offline", (done) => {
        node._registered = true;
        node.writeAttrs("x/y", {}).fail((err) => {
          done();
        });
      });
    });

    describe("#.observeReq()", () => {
      it("should throw err if path is not a string", () => {
        _verifySignatureSync(
          (arg) => {
            node.observe(arg).done();
          },
          ["string"]
        );
      });

      it("should return err if not registered", (done) => {
        node._registered = false;
        node.observe("x/y/z").fail((err) => {
          done();
        });
      });

      it("should return err if status is offline", (done) => {
        node._registered = true;
        node.observe("x/y/z").fail((err) => {
          done();
        });
      });
    });

    describe("#.cancelobserve()", () => {
      it("should throw err if path is not a string", () => {
        _verifySignatureSync(
          (arg) => {
            node.cancelObserve(arg).done();
          },
          ["string"]
        );
      });

      it("should return err if not registered", (done) => {
        node._registered = false;
        node.cancelObserve("x/y/z").fail((err) => {
          done();
        });
      });

      it("should return err if status is offline", (done) => {
        node._registered = true;
        node.cancelObserve("x/y/z").fail((err) => {
          done();
        });
      });
    });

    describe("#.ping()", () => {
      it("should return err if not registered", (done) => {
        node._registered = false;
        node.ping().fail((err) => {
          done();
        });
      });
    });

    describe("#.updateAttrs()", () => {
      it("should return err if attrs is not an object", () =>
        _verifySignatureAsync((arg) => node.updateAttrs(arg), ["object"]));
    });
  });

  describe("Functional Check", () => {
    before(() => {
      node._registered = true;
      node.status = "online";
    });

    describe("#.lifeCheck()", () => {
      it("should open lifeCheck", (done) => {
        node.lifeCheck(true);
        if (node._lifeChecker !== null) done();
      });

      it("should close lifeCheck", (done) => {
        node.lifeCheck(false);
        if (node._lifeChecker === null) done();
      });
    });

    describe("#.sleepCheck()", () => {
      it("should open sleepCheck", (done) => {
        node.sleepCheck(true);
        if (node._sleepChecker === null) done();
      });

      it("should open sleepCheck", (done) => {
        node.sleepCheck(true, 10);
        if (node._sleepChecker !== null) done();
      });

      it("should close sleepCheck", (done) => {
        node.sleepCheck(false);
        if (node._sleepChecker === null) done();
      });
    });

    describe("#._reqObj()", () => {
      it("should return reqObj", () => {
        const obj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "x",
          method: "GET",
        };

        // @ts-ignore
        expect(node._reqObj("GET", "x")).to.be.eql(obj);
      });
    });

    describe("#.read()", () => {
      it("should read Resource and return status 2.05", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "GET",
          options: { Accept: "application/json" },
        };
        rspObj = {
          code: "2.05",
          payload: 10,
        };

        node
          .read("/x/0/x0")
          .then((rsp) => {
            expect(rsp.status).to.equal("2.05");
            expect(rsp.data).to.equal(10);
            done();
          })
          .done();
      });

      it("should read Object Instance and return status 2.05", (done) => {
        const obj = {
          x0: 10,
          x1: 20,
        };

        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0",
          method: "GET",
          options: { Accept: "application/json" },
        };
        rspObj = {
          code: "2.05",
          payload: obj,
        };

        node.read("/x/0").then((rsp) => {
          if (rsp.status === "2.05" && rsp.data === obj) done();
        });
      });

      it("should read Object and return status 2.05", (done) => {
        const obj = {
          0: {
            x0: 10,
            x1: 20,
          },
          1: {
            x0: 100,
            x1: 200,
          },
        };

        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x",
          method: "GET",
          options: { Accept: "application/json" },
        };
        rspObj = {
          code: "2.05",
          payload: obj,
        };

        node.read("/x").then((rsp) => {
          if (rsp.status === "2.05" && rsp.data === obj) done();
        });
      });
    });

    describe("#.writeReq()", () => {
      it("should write Resource and return status 2.04", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "PUT",
          payload: new Buffer([
            0x7b, 0x22, 0x62, 0x6e, 0x22, 0x3a, 0x22, 0x2f, 0x78, 0x2f, 0x30,
            0x2f, 0x78, 0x30, 0x22, 0x2c, 0x22, 0x65, 0x22, 0x3a, 0x5b, 0x7b,
            0x22, 0x6e, 0x22, 0x3a, 0x22, 0x22, 0x2c, 0x22, 0x76, 0x22, 0x3a,
            0x31, 0x30, 0x7d, 0x5d, 0x7d,
          ]),
          options: {
            "Content-Format": "application/json",
          },
        };
        rspObj = {
          code: "2.04",
        };

        node.write("/x/0/x0", 10).then((rsp) => {
          if (rsp.status === "2.04") done();
        });
      });

      it("should write Object Instance and return status 2.04", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0",
          method: "PUT",
          payload: new Buffer([
            0x7b, 0x22, 0x62, 0x6e, 0x22, 0x3a, 0x22, 0x2f, 0x78, 0x2f, 0x30,
            0x22, 0x2c, 0x22, 0x65, 0x22, 0x3a, 0x5b, 0x7b, 0x22, 0x6e, 0x22,
            0x3a, 0x22, 0x78, 0x30, 0x22, 0x2c, 0x22, 0x76, 0x22, 0x3a, 0x31,
            0x30, 0x7d, 0x2c, 0x7b, 0x22, 0x6e, 0x22, 0x3a, 0x22, 0x78, 0x31,
            0x22, 0x2c, 0x22, 0x76, 0x22, 0x3a, 0x32, 0x30, 0x7d, 0x5d, 0x7d,
          ]),
          options: {
            "Content-Format": "application/json",
          },
        };
        rspObj = {
          code: "2.04",
        };

        node.write("/x/0", { x0: 10, x1: 20 }).then((rsp) => {
          if (rsp.status === "2.04") done();
        });
      });
    });

    describe("#.execute()", () => {
      it("should execute Resource and return status 2.04", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "POST",
          payload: "10,20",
        };
        rspObj = {
          code: "2.04",
        };

        node.execute("/x/0/x0", [10, 20]).then((rsp) => {
          if (rsp.status === "2.04") done();
        });
      });
    });

    describe("#.discoverReq()", () => {
      it("should discover Resource and return status 2.05", (done) => {
        const obj = {
          path: "/x/0/x0",
          attrs: {
            pmin: 10,
            pmax: 60,
          },
        };

        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "GET",
          options: {
            Accept: "application/link-format",
          },
        };
        rspObj = {
          headers: {
            "Content-Format": "application/link-format",
          },
          code: "2.05",
          payload: obj,
        };

        node.discover("/x/0/x0").then((rsp) => {
          if (rsp.status === "2.05" && _.isEqual(rsp.data, obj)) done();
        });
      });

      it("should discover Object Instance and return status 2.05", (done) => {
        const obj = {
          path: "/x/0",
          attrs: {
            pmin: 10,
            pmax: 60,
          },
          resrcList: ["/x/0/x0", "/x/0/x1"],
        };

        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0",
          method: "GET",
          options: {
            Accept: "application/link-format",
          },
        };
        rspObj = {
          headers: {
            "Content-Format": "application/link-format",
          },
          code: "2.05",
          payload: obj,
        };

        node.discover("/x/0").then((rsp) => {
          if (rsp.status === "2.05" && _.isEqual(rsp.data, obj)) done();
        });
      });

      it("should discover Object and return status 2.05", (done) => {
        const obj = {
          path: "/x",
          attrs: {
            pmin: 10,
            pmax: 60,
          },
          resrcList: ["/x/0/x0", "/x/0/x1", "/x/1/x0", "/x/1/x1"],
        };

        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x",
          method: "GET",
          options: {
            Accept: "application/link-format",
          },
        };
        rspObj = {
          headers: {
            "Content-Format": "application/link-format",
          },
          code: "2.05",
          payload: obj,
        };

        node.discover("/x").then((rsp) => {
          if (rsp.status === "2.05" && _.isEqual(rsp.data, obj)) done();
        });
      });
    });

    describe("#.writeAttrs()", () => {
      it("should write Resource Attrs and return status 2.05", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "PUT",
          query: "pmin=10&pmax=60",
        };
        rspObj = {
          code: "2.04",
        };

        node.writeAttrs("/x/0/x0", { pmin: 10, pmax: 60 }).then((rsp) => {
          if (rsp.status === "2.04") done();
        });
      });

      it("should write Object Instance Attrs and return status 2.05", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0",
          method: "PUT",
          query: "pmin=10&pmax=60",
        };
        rspObj = {
          code: "2.04",
        };

        node.writeAttrs("/x/0", { pmin: 10, pmax: 60 }).then((rsp) => {
          if (rsp.status === "2.04") done();
        });
      });

      it("should write Object Attrs and return status 2.05", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x",
          method: "PUT",
          query: "pmin=10&pmax=60",
        };
        rspObj = {
          code: "2.04",
        };

        node.writeAttrs("/x", { pmin: 10, pmax: 60 }).then((rsp) => {
          if (rsp.status === "2.04") done();
        });
      });
    });

    describe("#.observe()", () => {
      it("should observe Resource and return status 2.05 for number data", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "GET",
          options: { Accept: "application/json" },
          observe: true,
        };
        rspObj.headers = { "Content-Format": "application/tlv" };
        rspObj.code = "2.05";
        rspObj.payload = 10;
        rspObj.close = () => {};
        rspObj.once = () => {};

        node.observe("/x/0/x0").then((rsp) => {
          if (rsp.status === "2.05" && rsp.data === 10) done();
        });
      });

      it("should observe Resource and return status 2.05 for object data", (done) => {
        const obj = {
          x0: 10,
          x1: 20,
        };

        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0",
          method: "GET",
          options: { Accept: "application/json" },
          observe: true,
        };
        rspObj.headers = { "Content-Format": "application/tlv" };
        rspObj.code = "2.05";
        rspObj.payload = obj;
        rspObj.close = () => {};
        rspObj.once = () => {};

        node.observe("/x/0").then((rsp) => {
          if (rsp.status === "2.05" && _.isEqual(rsp.data, obj)) done();
        });
      });

      it("should set observeStream._disableFiltering to false by default", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "GET",
          options: { Accept: "application/json" },
          observe: true,
        };
        rspObj.headers = { "Content-Format": "application/tlv" };
        rspObj.code = "2.05";
        rspObj.payload = 10;
        rspObj.close = () => {};
        rspObj.once = () => {};

        node.observe("/x/0/x0").then((rsp) => {
          expect(rspObj._disableFiltering).to.equal(false);
          if (rsp.status === "2.05" && rsp.data === 10) done();
        });
      });

      it("should set observeStream._disableFiltering to true when shepherd config is set so", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "GET",
          options: { Accept: "application/json" },
          observe: true,
        };
        rspObj.headers = { "Content-Format": "application/tlv" };
        rspObj.code = "2.05";
        rspObj.payload = 10;
        rspObj.close = () => {};
        rspObj.once = () => {};
        node.shepherd.config.disableFiltering = true;

        node.observe("/x/0/x0").then((rsp) => {
          node.shepherd.config.disableFiltering =
            defaultConfig.disableFiltering;
          expect(rspObj._disableFiltering).to.equal(true);
          if (rsp.status === "2.05" && rsp.data === 10) done();
        });
      });

      it("should call notifyHandler with latest Content-Format", (done) => {
        // @ts-ignore
        const value = { hello: "world" },
          _updateSoAndDbStub = sinon
            .stub(node, "_updateSoAndDB")
            // @ts-ignore
            .callsFake((path: any, data: any) => {
              _updateSoAndDbStub.restore();
              expect(data).to.eql(value);
              return { done: function () {} };
            });

        // @ts-ignore
        const decodeJsonStub = sinon
          .stub(cutils, "decodeJson")
          .callsFake((path, value) => {
            decodeJsonStub.restore();
            return JSON.parse(value);
          });
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "GET",
          options: { Accept: "application/json" },
          observe: true,
        };
        rspObj.headers = { "Content-Format": "text/plain" };
        rspObj.code = "2.05";
        rspObj.payload = 10;
        rspObj.close = () => {};
        rspObj.once = (event, handler) => {
          handler();
        };
        rspObj.on = (event, handler) => {
          rspObj.headers["Content-Format"] = "application/json";
          handler(JSON.stringify(value));
        };
        node.shepherd.enabled = true;

        node.observe("/x/0/x0").then((rsp) => {
          delete node.shepherd.enabled;
          expect(rsp.status).to.eql("2.05");
          expect(rsp.data).to.eql(10);
          done();
        });
      });
    });

    describe("#.cancelobserve()", () => {
      it("should cancel Resource observe and return status 2.05", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0/x0",
          method: "GET",
          observe: false,
        };
        rspObj = {
          code: "2.05",
        };

        node.cancelObserve("/x/0/x0").then((rsp) => {
          if (rsp.status === "2.05") done();
        });
      });

      it("should cancel Object Instance observe and return status 2.05", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/x/0",
          method: "GET",
          observe: false,
        };
        rspObj = {
          code: "2.05",
        };

        node.cancelObserve("/x/0").then((rsp) => {
          if (rsp.status === "2.05") done();
        });
      });
    });

    describe("#.ping()", () => {
      it("should ping cnode and return status 2.05", (done) => {
        reqObj = {
          hostname: "192.168.1.100",
          port: "5685",
          pathname: "/ping",
          method: "POST",
        };
        rspObj = {
          code: "2.05",
        };

        node.ping().then((rsp) => {
          if (rsp.status === "2.05") done();
        });
      });
    });

    describe("#.dump()", () => {
      it("should return node record", () => {
        const dumper = {
            clientName: "coap-client",
            clientId: 1,
            ip: "192.168.1.100",
            port: "5685",
            mac: "AA:BB:CC:DD:EE:00",
            lifetime: 86400,
            version: "1.0.0",
            objList: { x: [0, 1] },
            observedList: ["/x/0/x0", "/x/0", "/x/0/x0", "/x/0/x0", "/x/0/x0"],
            heartbeatEnabled: true,
            so: {
              x: sObj,
            },
          },
          nDump = node.dump();

        delete nDump.joinTime;

        expect(nDump).to.be.eql(dumper);
      });
    });

    describe("#.setStatus()", () => {
      it("should set node status to online", (done) => {
        node.setStatus("online");
        if (node.status === "online") done();
      });

      it("should set node status to offline", (done) => {
        node.setStatus("offline");
        if (node.status === "offline") done();
      });
    });

    describe("#.updateAttrs()", () => {
      before((done) => {
        const dumper = {
          clientName: "coap-client",
          clientId: 1,
          ip: "192.168.1.100",
          port: "5685",
          mac: "AA:BB:CC:DD:EE:00",
          lifetime: 86400,
          version: "1.0.0",
          objList: { x: [0, 1] },
          observedList: ["/x/0/x0", "/x/0", "/x/0/x0", "/x/0/x0", "/x/0/x0"],
          heartbeatEnabled: true,
          so: {
            x: sObj,
          },
        };

        node.shepherd.storage
          .save(node)
          .then((data) => {
            expect(data).to.deep.equal(dumper);
            done();
          })
          .done();
      });

      it("should update node attrs, and return diff", (done) => {
        const attrs = { lifetime: 60000, version: "1.0.1" },
          oldClientName = node.clientName;
        node
          .updateAttrs(attrs)
          .then((diff) => {
            expect(diff).to.deep.equal(attrs);
            expect(node.lifetime).to.equal(attrs.lifetime);
            expect(node.version).to.equal(attrs.version);
            expect(node.clientName).to.equal(oldClientName);
            done();
          })
          .done();
      });
    });

    describe("#._updateSoAndDB()", () => {
      it("should update Object and db, and return diff", (done) => {
        const data = {
            1: {
              x0: 33,
              x1: 333,
            },
          },
          expected = {
            x: {
              0: { x0: 10, x1: 20 },
              1: { x0: 33, x1: 333 },
            },
          };
        node
          ._updateSoAndDB("/x", data)
          .then((diff) => {
            expect(diff).to.deep.equal({ x: data });
            const loaded = new CoapNode(node.shepherd, {
              clientName: node.clientName,
            });
            node.shepherd.storage
              .load(loaded)
              .then(() => {
                expect(loaded.dump().so).to.deep.equal(expected);
                done();
              })
              .done();
          })
          .done();
      });

      it("should update Object Instance and db, and return diff", (done) => {
        const data = {
            x0: 109,
            x1: 209,
          },
          expected = {
            x: {
              0: { x0: 10, x1: 20 },
              1: { x0: 109, x1: 209 },
            },
          };
        node
          ._updateSoAndDB("/x/1", data)
          .then((diff) => {
            expect(diff).to.deep.equal({ x: { 1: data } });
            const loaded = new CoapNode(node.shepherd, {
              clientName: node.clientName,
            });
            node.shepherd.storage
              .load(loaded)
              .then(() => {
                expect(loaded.dump().so).to.deep.equal(expected);
                done();
              })
              .done();
          })
          .done();
      });

      it("should update Resource and db, and return diff", (done) => {
        const data = 199,
          expected = {
            x: {
              0: { x0: 10, x1: 20 },
              1: { x0: 199, x1: 209 },
            },
          };
        node
          ._updateSoAndDB("/x/1/x0", data)
          .then((diff) => {
            expect(diff).to.deep.equal({ x: { 1: { x0: data } } });
            const loaded = new CoapNode(node.shepherd, {
              clientName: node.clientName,
            });
            node.shepherd.storage
              .load(loaded)
              .then(() => {
                expect(loaded.dump().so).to.deep.equal(expected);
                done();
              })
              .done();
          })
          .done();
      });
    });
  });
});
