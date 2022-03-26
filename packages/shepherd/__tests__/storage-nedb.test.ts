import fs from "fs";
import path from "path";
import _ from "lodash";
import { expect } from "chai";
import chai from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import Datastore from "nedb";
import defaultConfig from "../src/config";
import { CoapNode, StorageNeDB, Storage } from "../src";
import fixture from "./fixture";
import Q from "q";
let _verifySignatureSync = fixture._verifySignatureSync;
let _verifySignatureAsync = fixture._verifySignatureAsync;
let baseDir = "./test/database_test";
let alterDir = baseDir + "/new_dir";
let alterPath = alterDir + "/test.db";
let storage;

chai.use(sinonChai);

const shepherd: any = {
  emit: function () {},
  request: function (req, callback) {
    const deferred = Q.defer();
    deferred.resolve({});
    return deferred.promise.nodeify(callback);
  },
  newClientId: function () {
    return 1;
  },
  config: Object.assign({}, defaultConfig),
};

const cnode1 = _createNode({
  clientName: "mock01",
  clientId: 1,
  locationPath: "1",
  lifetime: 86400,
  ip: "192.168.1.100",
  port: "5685",
  mac: "AA:BB:CC:DD:EE:11",
  version: "1.0.0",
  heartbeatEnabled: true,
  so: {
    lwm2mServer: {
      0: {
        lifetime: 86400,
        defaultMinPeriod: 1,
        defaultMaxPeriod: 60,
      },
    },
    connMonitor: {
      0: {
        ip: "192.168.1.100",
      },
    },
  },
  objList: {
    lwm2mServer: [0],
    connMonitor: [0],
  },
});

const cnode2 = _createNode({
  clientName: "mock02",
  clientId: 2,
  locationPath: "2",
  lifetime: 85741,
  ip: "192.168.1.110",
  port: "5686",
  mac: "AA:BB:CC:DD:EE:22",
  version: "1.0.0",
  heartbeatEnabled: false,
  so: {
    lwm2mServer: {
      0: {
        lifetime: 85741,
        defaultMinPeriod: 1,
        defaultMaxPeriod: 50,
      },
    },
  },
  objList: {
    lwm2mServer: [0],
  },
  observedList: ["/lwm2mServer/0/defaultMinPeriod"],
});

const cnode3 = _createNode({
  clientName: "mock03",
  clientId: 3,
  locationPath: "3",
  lifetime: 84321,
  ip: "192.168.1.120",
  port: "5687",
  mac: "AA:BB:CC:DD:EE:33",
  version: "1.0.0",
  heartbeatEnabled: true,
  so: {
    lwm2mServer: {
      0: {
        lifetime: 84321,
        defaultMinPeriod: 1,
        defaultMaxPeriod: 40,
      },
    },
  },
  objList: {
    lwm2mServer: [0],
  },
});

describe("nedb-storage", () => {
  before((done) => {
    storage = new StorageNeDB("");
    const dir = path.resolve(baseDir);
    if (!fs.existsSync(dir))
      fs.mkdir(dir, (err) => {
        expect(err).to.equal(null);
        done();
      });
    else done();
  });

  describe("Constructor Check", () => {
    before((done) => {
      _clearAlterPath(done);
    });

    it("should create an instance of Storage", () => {
      expect(storage).to.be.instanceOf(Storage);
    });

    it("should raise an error if dbPath is not a string", () => {
      const _createDatabaseStub = sinon.stub(
        StorageNeDB.prototype,
        "_createDatabase"
      );
      _verifySignatureSync(
        (arg) => {
          new StorageNeDB(arg);
        },
        ["string"]
      );
      _createDatabaseStub.restore();
      expect(_createDatabaseStub).to.have.been.calledOnce;
    });

    it("should create the directory of dbPath if not exists", () => {
      const ensureIndexStub = sinon
        .stub(Datastore.prototype, "ensureIndex")
        .callsFake((options, cb) => {
          cb(null);
        });

      new StorageNeDB(alterPath);

      ensureIndexStub.restore();
      expect(fs.existsSync(path.resolve(alterDir))).to.eql(true);
      expect(ensureIndexStub).has.been.calledWith({
        fieldName: "clientName",
        unique: true,
      });
    });

    it("should create a inMemoryOnly backend nedb when dbPath is empty", () => {
      const storage = new StorageNeDB("");
      // @ts-ignore
      expect(storage._db.inMemoryOnly).to.eql(true);
    });

    after((done) => {
      setTimeout(() => {
        _clearAlterPath(done);
      }, 100);
    });
  });

  describe("Signature Check", () => {
    it("#.save", () => {
      _verifySignatureSync(
        (arg) => {
          storage.save(arg);
        },
        [cnode1]
      );
    });

    it("#.load", () => {
      _verifySignatureSync(
        (arg) => {
          storage.load(arg);
        },
        [cnode1]
      );
    });

    it("#.remove", () => {
      _verifySignatureSync(
        (arg) => {
          storage.remove(arg);
        },
        [cnode1]
      );
    });

    it("#.updateAttrs", () => {
      _verifySignatureSync(
        (arg) => {
          storage.updateAttrs(arg, null);
        },
        [cnode1]
      );
      _verifySignatureSync(
        (arg) => {
          storage.updateAttrs(cnode1, arg);
        },
        ["null", "object"]
      );
    });

    it("#.patchSo", () => {
      _verifySignatureSync(
        (arg) => {
          storage.patchSo(arg, null);
        },
        [cnode1]
      );
      _verifySignatureSync(
        (arg) => {
          storage.patchSo(cnode1, arg);
        },
        ["null", "object"]
      );
    });
  });

  describe("Functional Check", () => {
    describe("#.save", () => {
      it("should reject when db error occurred", () => {
        const updateStub = _createUpdateStub("db error");

        const promise = storage.save(cnode1);

        return promise.catch((err) => {
          updateStub.restore();
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.eql("db error");
        });
      });

      it("should save the node", (done) => {
        const promise = storage.save(cnode1);

        promise
          .then((data) => {
            expect(data).to.deep.equal(cnode1.dump());
            storage._db.findOne(
              { clientName: cnode1.clientName },
              { _id: 0 },
              (err, doc) => {
                expect(err).to.eql(null);
                expect(doc).to.deep.equal(cnode1.dump());
                storage._db.count({}, (err, count) => {
                  expect(err).to.eql(null);
                  expect(count).to.eql(1);
                  done();
                });
              }
            );
          })
          .done();
      });

      it("should save a new node", (done) => {
        const promise = storage.save(cnode2);

        promise
          .then(() => {
            storage._db.findOne(
              { clientName: cnode2.clientName },
              { _id: 0 },
              (err, doc) => {
                expect(err).to.eql(null);
                expect(doc).to.deep.equal(cnode2.dump());
                storage._db.count({}, (err, count) => {
                  expect(err).to.eql(null);
                  expect(count).to.eql(2);
                  done();
                });
              }
            );
          })
          .done();
      });

      it("should save another node", (done) => {
        const promise = storage.save(cnode3);

        promise
          .then(() => {
            storage._db.findOne(
              { clientName: cnode3.clientName },
              { _id: 0 },
              (err, doc) => {
                expect(err).to.eql(null);
                expect(doc).to.deep.equal(cnode3.dump());
                storage._db.count({}, (err, count) => {
                  expect(err).to.eql(null);
                  expect(count).to.eql(3);
                  done();
                });
              }
            );
          })
          .done();
      });

      it("should actually update some value", (done) => {
        cnode1.version = "2.0.0";
        cnode1.so.init("connMonitor", 0, { ip: "192.168.1.110" });

        const promise = storage.save(cnode1);

        promise
          .then(() => {
            storage._db.findOne(
              { clientName: cnode1.clientName },
              { _id: 0 },
              (err, doc) => {
                expect(err).to.eql(null);
                expect(doc).to.deep.equal(cnode1.dump());
                expect(doc.version).to.eql("2.0.0");
                expect(doc.so.connMonitor[0].ip).to.eql("192.168.1.110");
                storage._db.count({}, (err, count) => {
                  expect(err).to.eql(null);
                  expect(count).to.eql(3);
                  done();
                });
              }
            );
          })
          .done();
      });
    });

    describe("#.load", () => {
      it("should reject when db error occurred", () => {
        // @ts-ignore
        const findOneStub = sinon
          .stub(Datastore.prototype, "findOne")
          // @ts-ignore
          .callsFake((query, proj, cb) => {
            cb(new Error("db error"));
          });
        const cnode = _createNode({ clientName: cnode1.clientName });

        const promise = storage.load(cnode);

        return promise.catch((err) => {
          findOneStub.restore();
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.eql("db error");
        });
      });

      it("should reject when node clientName can not be found", () => {
        const cnode = _createNode({ clientName: "mockXX" });

        const promise = storage.load(cnode);

        return promise.catch((err) => {
          expect(err).to.be.instanceOf(Error);
        });
      });

      it("should load cnode", () => {
        const cnode = _createNode({ clientName: cnode1.clientName });

        const promise = storage.load(cnode);

        return promise.then(() => {
          expect(cnode.dump()).to.deep.equal(cnode1.dump());
        });
      });
    });

    describe("#.loadAll", () => {
      it("should reject when db error occurred", () => {
        // @ts-ignore
        const findStub = sinon
          .stub(Datastore.prototype, "find")
          // @ts-ignore
          .callsFake((query, proj, cb) => {
            cb(new Error("db error"));
          });

        const promise = storage.loadAll();

        return promise.catch((err) => {
          findStub.restore();
          expect(findStub).to.have.been.called;
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.eql("db error");
        });
      });

      it("should return all node data if everything is ok", () => {
        const promise = storage.loadAll();

        return promise.then((attrs) => {
          attrs.sort((a, b) => {
            if (a.clientName < b.clientName) return -1;
            if (a.clientName > b.clientName) return 1;
            return 0;
          });
          expect(attrs).to.deep.equal([
            cnode1.dump(),
            cnode2.dump(),
            cnode3.dump(),
          ]);
        });
      });
    });

    describe("#.remove", () => {
      it("should reject when db error occurred", (done) => {
        // @ts-ignore
        const removeStub = sinon
          .stub(Datastore.prototype, "remove")
          // @ts-ignore
          .callsFake((query, options, cb) => {
            cb(new Error("db error"));
          });

        const promise = storage.remove(cnode3);

        promise
          .catch((err) => {
            removeStub.restore();
            expect(err).to.be.instanceOf(Error);
            expect(err.message).to.eql("db error");
            storage._db.count({}, (err, count) => {
              expect(err).to.eql(null);
              expect(count).to.eql(3);
              done();
            });
          })
          .done();
      });

      it("should not reject when node not found", (done) => {
        const cnode = _createNode({ clientName: "clientX" });

        const promise = storage.remove(cnode);

        promise
          .then((deleted) => {
            expect(deleted).to.eql(false);
            storage._db.count({}, (err, count) => {
              expect(err).to.eql(null);
              expect(count).to.eql(3);
              done();
            });
          })
          .done();
      });

      it("should delete a node when it can be found", (done) => {
        const promise = storage.remove(cnode3);

        promise
          .then((deleted) => {
            expect(deleted).to.eql(true);
            storage._db.findOne(
              { clientName: cnode3.clientName },
              (err, doc) => {
                expect(err).to.eql(null);
                expect(doc).to.eql(null);
                storage._db.count({}, (err, count) => {
                  expect(err).to.eql(null);
                  expect(count).to.eql(2);
                  done();
                });
              }
            );
          })
          .done();
      });
    });

    describe("#.updateAttrs", () => {
      it("should reject when db error occurred", () => {
        const updateStub = _createUpdateStub("db error");

        const promise = storage.updateAttrs(cnode2, { ip: "192.168.1.111" });

        return promise.catch((err) => {
          updateStub.restore();
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.eql("db error");
        });
      });

      it("should do nothing if diff is null", () => {
        const updateStub = _createUpdateStub("should not call me");

        const promise = storage.updateAttrs(cnode2, null);

        return promise.then((diff) => {
          updateStub.restore();
          expect(updateStub).not.to.been.called;
          expect(diff).to.eql(null);
        });
      });

      it("should do nothing if diff is {}}", () => {
        const updateStub = _createUpdateStub("should not call me");

        const promise = storage.updateAttrs(cnode2, {});

        return promise.then((diff) => {
          updateStub.restore();
          expect(updateStub).not.to.been.called;
          expect(diff).to.eql(null);
        });
      });

      it("should reject if clientName is included in diff", () => {
        const updateStub = _createUpdateStub("should not call me");

        const promise = storage.updateAttrs(cnode2, {
          clientName: "newClientName",
        });

        return promise.catch((err) => {
          updateStub.restore();
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.contains("clientName");
        });
      });

      it("should do update if everything is ok", (done) => {
        const diff = {
          ip: "192.168.1.112",
          lifetime: 85742,
          version: "1.0.2",
          objList: {
            lwm2mServer: [2, 3],
            connMonitor: [0],
          },
          observedList: ["/lwm2mServer/0/defaultMaxPeriod"],
        };
        const expected = _.merge(cnode2.dump(), diff);

        const promise = storage.updateAttrs(cnode2, diff);

        promise
          .then((arg) => {
            expect(arg).to.be.equal(diff);
            storage._db.findOne(
              { clientName: cnode2.clientName },
              { _id: 0 },
              (err, doc) => {
                expect(err).to.eql(null);
                expect(doc).to.deep.equal(expected);
                done();
              }
            );
          })
          .done();
      });
    });

    describe("#.patchSo", () => {
      it("should reject when db error occurred", () => {
        const diff = {
          lwm2mServer: {
            0: {
              lifetime: 85747,
            },
          },
        };
        const updateStub = _createUpdateStub("db error");

        const promise = storage.patchSo(cnode2, diff);

        return promise.catch((err) => {
          updateStub.restore();
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.eql("db error");
        });
      });

      it("should do nothing if diff is null", () => {
        const updateStub = _createUpdateStub("should not call me");

        const promise = storage.patchSo(cnode2, null);

        return promise.then((diff) => {
          updateStub.restore();
          expect(updateStub).not.to.been.called;
          expect(diff).to.eql(null);
        });
      });

      it("should do nothing if diff is {}}", () => {
        const updateStub = _createUpdateStub("should not call me");

        const promise = storage.patchSo(cnode2, {});

        return promise.then((diff) => {
          updateStub.restore();
          expect(updateStub).not.to.been.called;
          expect(diff).to.eql(null);
        });
      });

      it("should do update if everything is ok", (done) => {
        const diff = {
          lwm2mServer: {
            0: {
              defaultMaxPeriod: 57,
            },
          },
          connMonitor: {
            0: {
              ip: "192.168.1.110",
            },
          },
        };
        const expected = _.merge(cnode2.so.dumpSync(), diff);

        const promise = storage.patchSo(cnode2, diff);

        promise
          .then((arg) => {
            expect(arg).to.be.equal(diff);
            storage._db.findOne(
              { clientName: cnode2.clientName },
              { _id: 0 },
              (err, doc) => {
                expect(err).to.eql(null);
                expect(doc.so).to.deep.equal(expected);
                done();
              }
            );
          })
          .done();
      });
    });

    describe("#.reset", () => {
      it("should reject when db error occurred for remove", (done) => {
        // @ts-ignore
        const removeStub = sinon
          .stub(Datastore.prototype, "remove")
          // @ts-ignore
          .callsFake((query, options, cb) => {
            cb(new Error("db error"));
          });

        const promise = storage.reset();

        promise
          .catch((err) => {
            removeStub.restore();
            expect(removeStub).to.have.been.called;
            expect(err).to.be.instanceOf(Error);
            expect(err.message).to.eql("db error");
            storage._db.count({}, (err, count) => {
              expect(err).to.eql(null);
              expect(count).to.eql(2);
              done();
            });
          })
          .done();
      });

      it("should reject when db error occurred for loadDatabase", (done) => {
        // @ts-ignore
        const removeStub = sinon
          .stub(Datastore.prototype, "remove")
          // @ts-ignore
          .callsFake((query, options, cb) => {
            cb(null);
          });
        const loadDatabaseStub = sinon
          .stub(Datastore.prototype, "loadDatabase")
          .callsFake((cb) => {
            cb(new Error("db error"));
          });

        const promise = storage.reset();

        promise
          .catch((err) => {
            removeStub.restore();
            loadDatabaseStub.restore();
            expect(removeStub).to.have.been.called;
            expect(loadDatabaseStub).to.have.been.called;
            expect(err).to.be.instanceOf(Error);
            expect(err.message).to.eql("db error");
            storage._db.count({}, (err, count) => {
              expect(err).to.eql(null);
              expect(count).to.eql(2);
              done();
            });
          })
          .done();
      });

      it("should remove all nodes if everything is ok", (done) => {
        const promise = storage.reset();

        promise
          .then((numRemoved) => {
            expect(numRemoved).to.eql(2);
            storage._db.count({}, (err, count) => {
              expect(err).to.eql(null);
              expect(count).to.eql(0);
              done();
            });
          })
          .done();
      });
    });
  });

  after((done) => {
    const dir = path.resolve(baseDir);
    if (fs.existsSync(dir))
      fs.rmdir(dir, (err) => {
        // just ignore err
        done();
      });
    else done();
  });
});

function _clearAlterPath(done) {
  if (fs.existsSync(alterPath))
    fs.unlink(alterPath, (err) => {
      expect(err).to.equal(null);
      if (fs.existsSync(alterDir))
        fs.rmdir(alterDir, (err) => {
          expect(err).to.equal(null);
          done();
        });
      else done();
    });
  else done();
}

function _createNode(attr) {
  return new CoapNode(shepherd, attr);
}

function _createUpdateStub(msg) {
  return sinon
    .stub(Datastore.prototype, "update")
    .callsFake((query, update, options, cb) => {
      // @ts-ignore
      cb(new Error(msg));
    });
}
