var tfprices = require('./');

var options = {key: "## YOUR KEY HERE ##", currency: "metal"};
var prices = new tfprices(options);

function getPrice(item, callback) {
	prices.getItemPriceHigh(item, function(ret) {
		if(ret !== undefined) {
			console.log(item.name + " High: " + ret.price + " " + ret.currency);
			console.log(item.name + " Scrap: " + Math.ceil(ret.price * 9));
		} else {
			console.log(item.name + " Unable to find high price for item: " + item);
		}

		prices.getItemPriceLow(item, function(ret) {
			if(ret !== undefined) {
				console.log(item.name + " Low: " + ret.price + " " + ret.currency);
				console.log(item.name + " Scrap: " + Math.ceil(ret.price * 9));
			} else {
				console.log(item.name + " Unable to find low price for item: " + item);
			}

			if(typeof(callback) == "function") {
				callback();
			}
		});
	});
}

var item1 = {name: "disc", defindex: 447};
var item2 = {name: "strange disc", defindex: 447, quality:11};
var fish1 = {name: "fish", defindex: 221};
var fish2 = {name: "strange fish", defindex: 221, quality:11};
var key = {name: "key", defindex: 5021};
var earbud = {name: "earbud", defindex: 143};

getPrice(item1, function() {
	getPrice(item2, function() {
		getPrice(fish1, function() {
			getPrice(fish2, function() {
				getPrice(key, function(price) {
					getPrice(earbud);
				});
			});
		});
	});
});