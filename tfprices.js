// requires
var request = require('request');
var mkdirp = require('mkdirp');
var fs = require('fs');
var _this;

// constructor
function tfprices(key) {
	_this = this;
	_this.key = key;
	_this.assetsDir = __dirname + "/assets/";
	mkdirp(_this.assetsDir, function(err) {
		// path was created unless there was error
	});
}

// prototype
var p = tfprices.prototype;

p.init = function() {
	var now = new Date();
	var year = now.getFullYear();
	var month = now.getMonth();
	var day = now.getDay();
	var hour = now.getHours();

	_this.pricesFile = _this.assetsDir + "prices_" + year + "-" + month + "-" + day + "-" + hour + ".json";

	_this.priceList = {};
}

p.fetchPrices = function(callback) {
	if(!fs.existsSync(_this.pricesFile)) {
		//console.log("Prices file does not exist: " + _this.pricesFile);
		j = request.jar();
		request = request.defaults({jar:j});

		request.get({
			uri: "http://backpack.tf/api/IGetPrices/v3/?names=1&format=json&key=" + _this.key,
			json: true
		}, function(error, response, data) {
			if (error) {
				console.log("ERROR: " + error);
				return;
			}
			if(data.response) {
				//console.log(_this.pricesFile);
				fs.writeFile(_this.pricesFile, JSON.stringify(data.response), function (err) {
					if (err) throw err;
					_this.getPricesFromFile(callback);
				});
			} else {
				//console.log("data.response does not exist - not writing file");
				_this.getNewestFile(_this.getPricesFromFile(callback));
			}
		});
	} else {
		//console.log("Prices file exists: " + _this.pricesFile);
		_this.getPricesFromFile(callback);
	}
}

p.getItemPrice = function(item_id, callback) {
	this.init();
	//console.log("Getting item price");
	this.fetchPrices(function() {
		if(_this.priceList.prices[item_id]) {
			_this.item = _this.priceList.prices[item_id];
			_this.name = _this.item.item_info.item_name;
			_this.currency = _this.item[6][0].current.currency;
			_this.price = _this.item[6][0].current.value;
			
			//console.log(_this.name);
			//console.log(_this.price+" "+_this.currency);
		} else {
			//console.log("Item ID "+item_id+" does not exist");
			_this.item = false;
			_this.name = false;
			_this.currency = false;
			_this.price = false;
		}

		if(typeof(callback) == "function") {
			callback && callback(_this);
		}
	});
}

p.getPricesFromFile = function(callback) {
	if(fs.existsSync(_this.pricesFile)) {
		//console.log("Getting prices from file: " + _this.pricesFile);
		var data = fs.readFileSync(_this.pricesFile, 'utf8');
		if(data != undefined) {
			_this.priceList = JSON.parse(data);
			callback();
		}
	} else {
		//console.log("Prices file does not exist: " + _this.pricesFile);
	}
}

p.getNewestFile = function(callback) {
	//console.log("Getting newest file");
	var files = fs.readdirSync(_this.assetsDir);
	var stats;
	var filetime;
	var ts;
	var newest = 0;
	for(var i in files) {
		stats = fs.statSync(_this.assetsDir + files[i]);
		filetime = new Date(stats.mtime);
		ts = filetime.getTime();
		if (ts > newest) {
			newest = ts;
			_this.pricesFile = _this.assetsDir + files[i];
		}
	}
	if(i >= files.length - 1) {
		//console.log("Callback");
		callback();
	}
}

module.exports = tfprices;
