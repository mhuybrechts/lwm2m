import Q from 'q'
import { expect } from 'chai'

const _typedArguments = {
  undefined: undefined,
  null: null,
  number: 9527,
  nan: NaN,
  string: 'hello',
  array: [],
  boolean: true,
  function: function () {},
  object: {},
}

const _globalSetTimeout = global.setTimeout

function _verifySyncCall(func, arg, type, errorExpected?) {
  if (errorExpected)
    expect(() => {
      func(arg)
    }, 'for ' + type + ' argument').to.throw(TypeError)
  else
    expect(() => {
      func(arg)
    }, 'for ' + type + ' argument').not.to.throw(TypeError)
}

function _verifyAsyncCall(func, arg, type, errorExpected?) {
  const deferred = Q.defer()

  func(arg).done(
    () => {
      if (errorExpected)
        try {
          expect(() => {}, 'for ' + type + ' argument').to.throw(TypeError)
        } catch (err) {
          deferred.reject(err)
        }
      else deferred.resolve()
    },
    (err) => {
      if (err instanceof TypeError && !errorExpected)
        try {
          expect(() => {
            throw err
          }, 'for ' + type + ' argument').not.to.throw(TypeError)
        } catch (err) {
          deferred.reject(err)
        }
      else deferred.resolve()
    },
  )

  return deferred.promise
}

function _verifySignature(func, acceptedTypes, verifier) {
  acceptedTypes = acceptedTypes || []

  const results = [],
    invalids = acceptedTypes.filter((type) => typeof type === 'string' && Object.keys(_typedArguments).indexOf(type) < 0)
  if (invalids.length) throw new TypeError('Invalid acceptedTypes: ' + JSON.stringify(invalids))

  Object.keys(_typedArguments).forEach((type) => {
    results.push(verifier(func, _typedArguments[type], type, acceptedTypes.indexOf(type) < 0))
  })

  acceptedTypes
    .filter((type) => typeof type === 'object' && !Array.isArray(type))
    .forEach((type) => {
      results.push(verifier(func, type, 'custom', false))
    })

  acceptedTypes
    .filter((type) => Array.isArray(type))
    .forEach((types) => {
      types.forEach((type) => {
        results.push(verifier(func, type, type, false))
      })
    })

  return results
}

function _verifySignatureSync(func, acceptedTypes) {
  _verifySignature(func, acceptedTypes, _verifySyncCall)
}

function _verifySignatureAsync(func, acceptedTypes) {
  return Q.all(_verifySignature(func, acceptedTypes, _verifyAsyncCall))
}

function _fireSetTimeoutCallbackEarlier(counter?: number, delay?: number) {
  counter = counter || 1
  delay = delay || 50
  let timerCb, callTimerCb

  // @ts-ignore
  global.setTimeout = (cb, delay) => {
    if (!--counter) {
      timerCb = cb
      global.setTimeout = _globalSetTimeout
      return _globalSetTimeout(() => {}, delay)
    } else return _globalSetTimeout(cb, delay)
  }

  callTimerCb = () => {
    if (timerCb) timerCb()
    else _globalSetTimeout(callTimerCb, delay)
  }
  _globalSetTimeout(callTimerCb, delay)
}

export default {
  _verifySignatureSync: _verifySignatureSync,
  _verifySignatureAsync: _verifySignatureAsync,
  _fireSetTimeoutCallbackEarlier: _fireSetTimeoutCallbackEarlier,
}
