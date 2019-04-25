// helpers
function isArray(x){
	return Array.isArray(x);
}
function isDefined(x){
	return typeof x !== 'undefined';
}
function isNull(x){
	return x === null;
}
function isFunction(x){
	return typeof x === 'function';
}
function isString(x){
	return typeof x === 'string';
}
function isNumber(x){
	return typeof x === 'number';
}
function isObject(x) {
	return x !== null && typeof x === 'object';
}
/**
 * Returns a random number between min (inclusive) and max (exclusive)
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 */
function getRandomArbitrary(min, max) {
	return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 */
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

//http://stackoverflow.com/questions/332422/how-do-i-get-the-name-of-an-objects-type-in-javascript
function getType(x) {
	if (x === null)
		return "[object Null]";
	return Object.prototype.toString.call(x);
}
// array
if(typeof Array.diff === 'undefined'){
	Array.diff = function(a,b) {
		return a.filter(function(i) {
			return b.indexOf(i) < 0;
		});
	};
}
if(typeof Array.min === 'undefined'){
	Array.min = function(array){
		return Math.min.apply(Math, array)
	}
}
if(typeof Array.max === 'undefined'){
	Array.max = function(array){
		return Math.max.apply(Math, array)
	}
}

//https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (typeof Object.assign != 'function') {
	Object.assign = function(target) {
		'use strict';
		if (target == null) {
			throw new TypeError('Cannot convert undefined or null to object');
		}

		target = Object(target);
		for (let index = 1; index < arguments.length; index++) {
			let source = arguments[index];
			if (source != null) {
				for (let key in source) {
					if (Object.prototype.hasOwnProperty.call(source, key)) {
						target[key] = source[key];
					}
				}
			}
		}
		return target;
	};
}

// like jquery extend
// https://jsfiddle.net/1vrkw1pc/
if(typeof Object.extend != 'function'){
	Object.extend = function(){
		for(let i = 1; i < arguments.length; i++){
			for(let key in arguments[i]){
				if(arguments[i].hasOwnProperty(key)) { 
					if (typeof arguments[0][key] === 'object' && typeof arguments[i][key] === 'object') {
						Object.extend(arguments[0][key], arguments[i][key]);
					}
					else{
						arguments[0][key] = arguments[i][key];
					}
				}
			}
		}
		return arguments[0];	
	}
}

// https://jsperf.com/ed-3-vs-es-2015-vs-es-2016/1
if(typeof Object.filter !== 'function'){
    Object.filter = function(obj, predicate){
        return Object.keys(obj).reduce(function(acc, key){
            if (predicate(obj[key])) {
                acc[key] = obj[key];
            }
            return acc;
        }, {});
    };
}

/**
 * Wraps a for in loop.
 * For each object it will pass the
 * property name and value to a callback.
 * @param {object} data - data to loop through
 * @param {function} cb - callback
 */
function each(data, cb){
	for(let i in data){
		let e = data[i];
		cb(i, e);
	}
}

exports.each = each;
exports.isArray = isArray;
exports.isDefined = isDefined;
exports.isNull = isNull;
exports.isFunction = isFunction;
exports.isString = isString;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.getType = getType;
exports.getRandomArbitrary = getRandomArbitrary;
exports.getRandomInt = getRandomInt;