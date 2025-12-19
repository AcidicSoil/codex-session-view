export function inherits(ctor: Function, superCtor: Function) {
  if (superCtor !== null && typeof superCtor !== 'function') {
    throw new TypeError('The super constructor must either be null or a function')
  }
  ctor.super_ = superCtor
  if (superCtor === null) {
    ctor.prototype = Object.create(null)
    ctor.prototype.constructor = ctor
    return
  }
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  })
}

export default {
  inherits,
}
