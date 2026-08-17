const registry = {};

exports.register = (type, handler) => { registry[type] = handler; };
exports.get = (type) => registry[type];
exports.has = (type) => !!registry[type];
