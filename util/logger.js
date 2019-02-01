const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

/**
 * Logger.
 * A wrapper for the winston logger.
 * Provides a convenient log handle creator.
 * Has wrappers for each log type.
 * Will print objects directly to the console.
 * Also has a static log method via Logger.log(level, msg);
 */
class Logger {

	/**
	 * Constructor
	 * @param {string} name - the name of the handle; appears as [Handle]
	 * @param {object} object - the name of the object being logged.
	 * If an object is passed, uses the constructor name.
	 * @param {object} [options={}]
	 * @param {string} [options.level="debug"] - what level of logs to print
	 * @param {boolean} [options.timestamp=false] - whether to print timestamps
	 * @return {Logger}
	 */
	constructor(name, object, options = {}){
		this.name = name;

		// print with timestamp
		if(options.timestamp){
			this.format = printf(info => {
				return `${info.timestamp} ${info.level}: ${info.message}`;
			});
			this.format = combine(timestamp(), this.format);
		}
		// print without timestamp
		else {
			this.format = printf(info => {
				return `${info.level}: ${info.message}`;
			});
		}

		this.logger = createLogger({
			level: options.level || 'debug',
			format: this.format,
			transports: [new transports.Console()]
		});;
		this.logHandle = this.createLogHandle(this.name, object);
		return this;
	}

	/**
	 * Log to the global Logger.
	 * Use this if you don't feel like creating a new Logger.
	 * @param {string} handle 
	 * @param {string} level 
	 * @param {string} msg 
	 */
	static log(handle, level, msg){
		let log = `[${handle}]: ${msg}`;
		switch(level){
			case 'debug':
				Logger.global.debug(log);
				break;
			case 'error':
				Logger.global.error(log);
				break;
			case 'warn':
				Logger.global.warn(log);
				break;
			case 'verbose':
				Logger.global.verbose(log);
				break;
			case 'silly':
				Logger.global.silly(log);
				break;
			case 'info':
			default:
				Logger.global.info(log);
				break;
		}
	}

	/**
	 * Create a log handle for the Logger.
	 * @param {string} name - the name of the handle; appears as [Handle]
	 * @param {object|string} object - the name of the object being logged.
	 * If an object is passed, uses the constructor name.
	 * @return {string}
	 */
	createLogHandle(name, object){
		if(typeof object === 'string'){
			return `[${name}] ${object}:`;	
		}
		else if(typeof object === 'object'){
			return `[${name}] ${object.constructor.name}:`;
		}
		else {
			return name;
		}
	}

	/**
	 * Set a log handle for the Logger.
	 * @param {string} name - the name of the handle; appears as [Handle]
	 * @param {object|string} object - the name of the object being logged.
	 * If an object is passed, uses the constructor name.
	 * @return {Logger}
	 */
	setLogHandle(name, object){
		this.name = name;
		this.logHandle = this.createLogHandle(name, object);
		return this;
	}

	/**
	 * Actual log wrapper.
	 * If an object is passed, it is 
	 * printed directly to the console.
	 * @param {string} level 
	 * @param {object|string} msg 
	 */
	_log(level, msg){
		let log = "";
		let isObject = false
		if(typeof msg === "string" || typeof msg === "number"){
			log = `${this.logHandle} ${msg}`;
		}
		else {
			isObject = true;
			log = `${this.logHandle} Logging object:`;
		}

		let res = null;
		switch(level){
			case 'debug':
				res = this.logger.debug(log);
				break;
			case 'error':
				res = this.logger.error(log);
				break;
			case 'warn':
				res = this.logger.warn(log);
				break;
			case 'verbose':
				res = this.logger.verbose(log);
				break;
			case 'silly':
				res = this.logger.silly(log);
				break;
			case 'info':
			default:
				res = this.logger.info(log);
				break;
		}

		if(isObject){
			console.log(msg);
		}

		return res;
	}

	info(msg){
		return this._log("info", msg);
	}

	debug(msg){
		return this._log("debug", msg);
	}

	error(msg){
		return this._log("error", msg);
	}
	
	warn(msg){
		return this._log("warn", msg);
	}
	
	verbose(msg){
		return this._log("verbose", msg);
	}
	
	silly(msg){
		return this._log("silly", msg);
	}
}
Logger.global = new Logger();

module.exports = Logger;