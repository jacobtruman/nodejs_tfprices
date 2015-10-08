// requires
var request = require('request');
var mkdirp = require('mkdirp');
var fs = require('fs');

// constructor
function tfprices(options) {
	p.key = options.key;
	if(options.currency !== undefined) {
		p.currency = options.currency;
	}
	p.assetsDir = __dirname + "/assets/";
	mkdirp(p.assetsDir, function(err) {
		// path was created unless there was error
	});
}

// prototype
var p = tfprices.prototype;

p.init = function(callback) {
	var now = new Date();
	var year = now.getFullYear();
	var month = now.getMonth() + 1;
	var day = now.getDate();
	var hour = now.getHours();

	p.pricesFile = p.assetsDir + "prices_" + year + "-" + month + "-" + day + "-" + hour + ".json";

	if(typeof(callback) == "function") {
		callback();
	}
}

/**
 * Get the backpack.tf price list and build a local cache file to handle API failures. A new cache file is created every
 * hour. Read from the cache file if a one exists for the current hour.
 *
 * @param callback
 */
p.fetchPrices = function(callback) {
	if(!fs.existsSync(p.pricesFile)) {
		var j = request.jar();
		request = request.defaults({jar:j});

		request.get({
			uri: "http://backpack.tf/api/IGetPrices/v3/?names=1&format=json&key=" + p.key,
			json: true
		}, function(error, response, data) {
			if (error) {
				console.log("ERROR: " + error);
				return;
			}

			if(JSON.stringify(data.response).length > 0 && data.response.success == 1) {
				fs.writeFile(p.pricesFile, JSON.stringify(data.response), function (err) {
					if (err) throw err;
					p.getPricesFromFile(function(price_list) {
						if(typeof(callback) == "function") {
							callback(price_list);
						}
					});
				});
			} else {
				p.getNewestFile(function() {
					p.getPricesFromFile(function(price_list) {
						if(typeof(callback) == "function") {
							callback(price_list);
						}
					});
				});
			}
		});
	} else {
		p.getPricesFromFile(function(price_list) {
			if(typeof(callback) == "function") {
				callback(price_list);
			}
		});
	}
}

/**
 * Get the price of a given item
 *
 * @param item      tf2 item object - needs to have at least the defindex
 * @param callback
 */
p.getItemPriceObject = function(item, callback) {
	if(item.quality === undefined) {
		item.quality = 6;
	}

	p.init(function() {
		p.fetchPrices(function(price_list) {
			var price_object = undefined;
			if(price_list !== undefined) {
				if(price_list.prices !== undefined) {
					if(price_list.prices[item.defindex] !== undefined) {
						price_object = price_list.prices[item.defindex];
					}

					if(typeof(callback) == "function") {
						callback(price_object);
					}
				} else {
					console.log(item.name + " price_list.prices is undefined");
				}
			} else {
				console.log(item.name + " price_list is undefined");
			}
		});
	});
}

/**
 * Get the high price for item if it exists
 *
 * @param item
 * @param callback
 */
p.getItemPriceHigh = function(item, callback) {
	p.getItemPriceObject(item, function(price_object) {
		var ret = undefined;
		if(price_object !== undefined) {
			ret = {};
			if(price_object[item.quality][0].current.value_high) {
				ret.price = price_object[item.quality][0].current.value_high;
			} else {
				ret.price = price_object[item.quality][0].current.value;
			}
			ret.currency = price_object[item.quality][0].current.currency;
		}

		if(typeof(callback) == "function") {
			p.convertCurrency(ret, function(result) {
				callback(result);
			});
		}
	});
}

/**
 * Get the low price for item if it exists
 *
 * @param item
 * @param callback
 */
p.getItemPriceLow = function(item, callback) {
	p.getItemPriceObject(item, function(price_object) {
		var ret = undefined;
		if(price_object !== undefined) {
			ret = {
				price: price_object[item.quality][0].current.value,
				currency: price_object[item.quality][0].current.currency
			}
		}
		if(typeof(callback) == "function") {
			p.convertCurrency(ret, function(result) {
				callback(result);
			});
		}
	});
}

/**
 * Get prices list from cache file
 *
 * @param callback
 */
p.getPricesFromFile = function(callback) {
	var price_list;
	if(fs.existsSync(p.pricesFile)) {
		var data = fs.readFileSync(p.pricesFile, 'utf8');
		if(data !== undefined && data != null) {
			price_list = JSON.parse(data);
		}
	}

	if(typeof(callback) == "function") {
		callback(price_list);
	}
}

p.getNewestFile = function(callback) {
	var files = fs.readdirSync(p.assetsDir);
	var stats;
	var filetime;
	var ts;
	var newest = 0;
	for(var i in files) {
		stats = fs.statSync(p.assetsDir + files[i]);
		filetime = new Date(stats.mtime);
		ts = filetime.getTime();
		if (ts > newest) {
			newest = ts;
			p.pricesFile = p.assetsDir + files[i];
		}
	}

	if(i >= files.length - 1) {
		if(typeof(callback) == "function") {
			callback();
		}
	}
}

/**
 * Get the high end value for a key (defindex 5021)
 *
 * @param callback
 */
p.getKeyMetal = function(callback) {
	var item = {defindex: 5021};
	p.getItemPriceObject(item, function(price_object) {
		var ret = undefined;
		if(price_object !== undefined) {
			if(price_object[item.quality][0].current.value_high) {
				ret = price_object[item.quality][0].current.value_high;
			} else {
				ret = price_object[item.quality][0].current.value;
			}
		}

		if(typeof(callback) == "function") {
			callback(ret);
		}
	});
}

/**
 * Convert from one currency type to another. Possible currency types are:
 *  metal - defindex 5002
 *  keys - defindex 5021
 *  usd - will not convert to this one
 *
 * @param price_obj
 * @param callback
 */
p.convertCurrency = function(price_obj, callback) {
	if(p.currency !== undefined && price_obj.currency !== p.currency) {
		//console.log("Need to convert from " + price_obj.currency + " to " + p.currency);
		p.getKeyMetal(function(key_price) {
			price_obj.price = price_obj.price * key_price;
			price_obj.currency = p.currency;
			if(typeof(callback) == "function") {
				callback(price_obj);
			}
		});
	} else {
		if(typeof(callback) == "function") {
			callback(price_obj);
		}
	}
}

module.exports = tfprices;
