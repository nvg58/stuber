// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.job("hello", function(request, response) {
	response.success("Hello world!");
});


Parse.Cloud.define('addgeoponits', function(request, response) {
	// var user = Parse.Query(Parse.User)
	var query = new Parse.Query(Parse.User);

	var users = [];

	query.find({
		success: function(results) {
			results.forEach(function(result) {

				var delayUntil;
				var delayPromise;

				var _delay = function() {
					if (Date.now() >= delayUntil) {
						delayPromise.resolve();
						return;
					} else {
						process.nextTick(_delay);
					}
				}

				var delay = function(delayTime) {
					delayUntil = Date.now() + delayTime;
					delayPromise = new Parse.Promise();
					_delay();
					return delayPromise;
				};

				delay(1000).then(function() {

					Parse.Cloud.httpRequest({
						url: 'https://maps.googleapis.com/maps/api/geocode/json',
						params: {
							address: result.get("Address"),
							key: 'AIzaSyA7AMtlBVYF-pvWM4HV6o5VBtT2vBHurIw'
						},
						success: function(httpResponse) {
							var obj = JSON.parse(httpResponse.text);
							var geo = obj.results[0].geometry;
							var point = new Parse.GeoPoint({
								latitude: geo.location.lat,
								longitude: geo.location.lng
							});

							result.set("geo_point", point);
							result.save();
							users.push(result);
						},
						error: function(httpResponse) {
							console.error("Error: " + httpResponse.code + " " + httpResponse.message);
						}
					});

				}, this);
			});

			response.success(users.length + " users has been updated!");
		},
		error: function(error) {
			alert("Error: " + error.code + " " + error.message);
		}

	});
});

Parse.Cloud.define("getgeopoint", function(request, response) {
	Parse.Cloud.httpRequest({
		url: 'https://maps.googleapis.com/maps/api/geocode/json',
		params: {
			address: request.params.location,
			key: 'AIzaSyA7AMtlBVYF-pvWM4HV6o5VBtT2vBHurIw'
		},
		success: function(httpResponse) {
			var obj = JSON.parse(httpResponse.text);
			var geo = obj.results[0].geometry;
			var point = new Parse.GeoPoint({
				latitude: geo.location.lat,
				longitude: geo.location.lng
			});
			response.success(point);
		},
		error: function(httpResponse) {
			response.error("Error: " + httpResponse.code + " " + httpResponse.message);
		}
	});
});

Parse.Cloud.afterSave(Parse.User, function(request, response) {
	Parse.Cloud.httpRequest({
		url: 'https://maps.googleapis.com/maps/api/geocode/json',
		params: {
			address: request.object.get("Address"),
			key: 'AIzaSyA7AMtlBVYF-pvWM4HV6o5VBtT2vBHurIw'
		},
		success: function(httpResponse) {
			var obj = JSON.parse(httpResponse.text);
			var geo = obj.results[0].geometry;
			var point = new Parse.GeoPoint({
				latitude: geo.location.lat,
				longitude: geo.location.lng
			});
			request.object.set("geo_point", point);
			request.object.save();
			// response.success(request.object);
		},
		error: function(httpResponse) {
			response.error("Error: " + httpResponse.code + " " + httpResponse.message);
		}
	});
});

Parse.Cloud.define('getUsersGeoPoint', function(request, response) {
	var query = new Parse.Query(Parse.User);
	var geopoints = [];
	var question = (request.params.question != null) ? request.params.question : "";
	var sender = (request.params.sender != null) ? request.params.sender : "";
	var fields = (request.params.fields != null) ? request.params.fields : "";

	query.find({
		success: function(users) {
			users.forEach(function(user) {
				if (user.get('geo_point') != null && sender != user.get('email')) {
					geopoints.push(user.get('geo_point'));

					var query = new Parse.Query(Parse.Installation);
					query.equalTo('email', user.get('email'));

					Parse.Push.send({
						where: query, // Set our Installation query
						// "aps": {
						data: {
							alert: "Check out the new offer for you! ",
							"message": sender,
							"question": question,
							"fields": fields
						}
						// }
					});
				}

			});

			response.success(geopoints);
		},
		error: function(error) {
			alert("Error: " + error.code + " " + error.message);
		}
	});
});

Parse.Cloud.define("sendConfirm", function(request, response) {
	var tutor = request.params.tutor;
	var tutee = request.params.tutee;

	var query = new Parse.Query(Parse.Installation);
	query.equalTo('email', tutee);

	Parse.Push.send({
		where: query, // Set our Installation query
		// "aps": {
		data: {
			alert: "We have found your perfect tutor!",
			"message": tutor,
			"confirmation": true
		}
		// }
	}, {
		success: function() {
			// Push was successful
			response.success(tutor);
		},
		error: function(error) {
			// Handle error
			response.error("Push failed to send with error");
		}
	});
});
