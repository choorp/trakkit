var carrierColors = {
	fedex: "#8C22F0",
	ups: "#734722",
	usps: "#223AF0"
};

var packageList = [];

enyo.kind({
	name: "Trakkit",
	kind: "FittableRows",
	fit: true,
	components:[
		{name: "appPanels", kind: "Panels", fit: true, arrangerKind: "CarouselArranger", draggable: true, index: 1, onTransitionFinish: "panelChanged", components: [
			{name: "addPackagePanel", kind: "FittableRows", classes: "panel", fit: true, components: [
				{classes: "title-bar", content: "Add Package"},
				{kind: "onyx.InputDecorator", alwaysLooksFocused: true, classes: "input", components: [
					{name: "inpName", kind: "onyx.Input", placeholder: "Name", style: "width: 100%;"}
				]},
				{kind: "onyx.InputDecorator", alwaysLooksFocused: true, classes: "input", components: [
					{name: "inpTracking", kind: "onyx.Input", placeholder: "Tracking #", style: "width: 100%;"}
				]},
				{name: "btnAddPackage", kind: "onyx.Button", classes: "add-pkg-button", content: "Add Package", ontap: "addPackage"},
				{name: "addPackageStatus", classes: "add-package-status", fit: true},
				{name: "btnClearStorage", kind: "onyx.Button", classes: "add-pkg-button", content: "Clear Storage", ontap: "clearStorage"}
				
			]},
			{name: "mainPanel", kind: "FittableRows", classes: "panel", fit: true, components: [
				{kind: "enyo.Scroller", fit: true, horizontal: "hidden", components: [
					{classes: "title-bar", onhold: "refresh", content: "Active Packages"},
					{name: "activePackages", components: [

					]},
					{classes: "title-bar", content: "Inactive Packages"},
					{name: "inactivePackages", components: [

					]}
				]},
				{name: "lastUpdated", classes: "last-updated", content: "Unknown"}
				// {name: "lastUpdatedContainer", kind: "FittableColumns", components: [
				// 	{fit: true},
				// 	{name: "lastUpdated", classes: "last-updated", content: "Unknown"}
				// ]}
			]},
			{name: "packagePanel", kind: "FittableRows", classes: "panel", fit: true, horizontal: "hidden", components: [
				{name: "packageContainer", style: "height: 100%;", components: [
					{content: "No package selected."}
				]}
			]},
			// {name: "popupDelete", classes: "menu-popup", kind: "onyx.Popup", centered: true, modal: true, floating: true, scrim: true, components: [

			// ]}
		]}
	],
	rendered: function() {
		this.inherited(arguments);
		this.loadPrefs();
	},
	savePrefs: function() {
		// console.log("Saving prefs...");
		// console.log(packageList);

		if (chrome.storage) {
			chrome.storage.local.set({'packageList': packageList}, enyo.bind(this, function() {
				console.log('Saved packageList...');
			}));
		} else {
			window.localStorage.packageList = packageList;
		}
	},
	loadPrefs: function() {
		if (chrome.storage) {
			chrome.storage.local.get("packageList", enyo.bind(this, function(response){
				if(response.packageList) {
					console.log("Loaded packageList...");
					packageList = response.packageList;
					console.log(packageList);
				}
				this.setupOverview(true);
				// this.refresh();
			}));
		} else {
			if (window.localStorage.packageList) {
				console.log(packageList);
				packageList = window.localStorage.packageList;
			}
			console.log(packageList);
			this.setupOverview(true);
		}
	},
	setupOverview: function(getNewStatus) {
		// console.log("Setting up main panel...");

		packageList.sort(function(a, b) {
		    a = new Date(a.deliveryDate);
		    b = new Date(b.deliveryDate);
		    return a>b ? -1 : a<b ? 1 : 0;
		});
		this.savePrefs();

		this.$.activePackages.destroyClientControls();
		this.$.inactivePackages.destroyClientControls();
		for (var i=0; i<packageList.length; i++) {
			var days = parseInt(packageList[i].daysLeft, 10);
			if (days >= 0) {
				this.$.activePackages.createComponent({kind: "PackageRow", data: packageList[i], ontap: "openPackageDetail", owner: this});
			} else {
				this.$.inactivePackages.createComponent({kind: "PackageRow", data: packageList[i], ontap: "openPackageDetail", onhold: "deletePackage", owner: this});
			}
		}
		if (this.$.activePackages.children.length == 0) {
			this.$.activePackages.createComponent({name: "aPlaceholder", content: "No packages.", style: "margin-bottom: 15px;"});
		}
		if (this.$.inactivePackages.children.length == 0) {
			this.$.inactivePackages.createComponent({name: "iPlaceholder", content: "No packages.", style: "margin-bottom: 15px;"});
		}
		this.$.activePackages.render();
		this.$.inactivePackages.render();

		if (getNewStatus) {
			this.refresh();
		}
	},
	refresh: function(sender, event) {
		console.log("'Refresh All' requested.");
		// return;
		this.$.lastUpdated.setContent("Updating...");

		var actives = this.$.activePackages.children;
		if (actives[0].name != "aPlaceholder" && actives[0].name != "iPlaceholder") {
			for (var i=0; i<actives.length; i++) {
				// this.log(actives[i]);
				if (actives[i].name != "aPlaceholder" && actives[i].name != "iPlaceholder") {
					console.log("   Refreshing " + actives[i].data.name);
					this.getStatus(actives[i].data.id, true);
				}
			}
		} else {
			this.updateLastUpdated();
		}
	},
	addPackage: function() {
		var id = new Date().getTime();
		var name = this.$.inpName.getValue();
		var tracking = this.$.inpTracking.getValue();
		var carrier;
		var check = tracking.substr(0, 2);
		if (check == "1Z" || check == "1z") {
			carrier = "ups";
		} else {
			carrier = "usps";
		}

		packageList.push({id: id, name: name, tracking: tracking, carrier: carrier});

		packageList.sort(function(a, b) {
		    a = new Date(a.deliveryDate);
		    b = new Date(b.deliveryDate);
		    return a>b ? -1 : a<b ? 1 : 0;
		});

		this.savePrefs();
		this.getStatus(id, false, true);
		// this.$.appPanels.setIndex(1);
		// this.setupOverview();
	},
	deletePackage: function(sender, event) {
		this.log(typeof sender);
		var toDelete;
		if (typeof sender == "object") {
			toDelete = sender.data.id;
		} else if (typeof sender == "number") {
			toDelete = sender;
		} else {
			toDelete = -1;
		}
		this.log(toDelete);
		// return;

		var index;
		for (var i=0; i<packageList.length; i++) {
			if (toDelete == packageList[i].id) {
				index = i;
			}
		}

		if (index >= 0) {
			console.log("Removing " + packageList[index].name);
			packageList.splice(index, 1);
			this.savePrefs();
			// this.$.appPanels.setIndex(1);
			if (typeof sender == "object" && sender.kind == "Package") {
				this.$.appPanels.setIndex(1);
			}
			this.setupOverview();
		} else {
			console.log("Couldn't find element to delete.");
		}
	},
	clearStorage: function() {
		if (chrome.storage) {
			chrome.storage.local.clear();
		} else {
			window.localStorage.packageList = [];
		}
		
	},
	panelChanged: function(sender, event) {
		// console.log(event.toIndex);
	},
	openPackageDetail: function(sender) {
		// console.log(sender);

		var selected;
		for (var i=0; i<packageList.length; i++) {
			if (sender.data.id == packageList[i].id) {
				selected = packageList[i];
			}
		}
		// console.log(selected);

		if (selected) {
			this.$.packageContainer.destroyClientControls();
			this.$.packageContainer.createComponent({kind: "Package", data: selected, onDeletePackage: "deletePackage", owner: this});
			this.$.packageContainer.render();
			this.$.appPanels.setIndex(2);
		}
	},
	getStatus: function(id, updateData, refreshList) {
		// id = 123;
		var current, index;
		for (var i=0; i<packageList.length; i++) {
			if (id == packageList[i].id) {
				current = packageList[i];
				index = i;
			}
		}

		// this.log(current);
		if (current.carrier == "usps") {
			// this.log("USPS");
			var url = "http://production.shippingapis.com/ShippingAPI.dll?API=TrackV2&XML=";
			var xml = "<TrackRequest USERID='561CHOOR7303'><TrackID ID='" + current.tracking + "'></TrackID></TrackRequest>";
			url += xml;

			var callUSPS = new enyo.Ajax({
				url: url,
				handleAs: "xml",
				cacheBust: false
			});
			callUSPS.response(this, function(sender, response) {
				console.log(response);
				var r = response;
				var shipDate, deliveryDate, daysLeft, weight, service, date = "---";

				var activity = [];
				var summary = r.getElementsByTagName("TrackSummary")[0].textContent;
				this.log(summary);

				if (summary.search("no record of that mail item") >= 0) {
					var today = new Date();
					var y, m, d;
					var date = "";
					y = today.getFullYear().toString();
					m = (today.getMonth() + 1).toString();
					d = today.getDate().toString();
					if (m.length == 1) {
						m = "0" + m;
					}
					if (d.length == 1) {
						d = "0" + d;
					}
					date = y + m + d;
					date = this.formatDate(date);

					var time = this.formatTime("", today.getHours(), today.getMinutes());
					console.log(time);

					var status = "Unknown. Try again later."


					// return;
					activity.push({
						date: date,
						time: time,
						status: status,
						location: location
					});
				} else if (summary.search("out for delivery") >= 0) {
					var comma = summary.indexOf(":");
					var time = summary.slice(comma-2, comma+6);
					summary = summary.substr(comma+10);
					// console.log(time);
					// console.log(summary);

					comma = summary.indexOf(",") + 6;
					var date = summary.slice(0, comma);
					// console.log(date);
					summary = summary.substr(comma+4);
					// console.log(summary);

					comma = summary.indexOf(",");
					var city = this.formatLocation(summary.slice(0, comma));
					// console.log(city);
					summary = summary.substr(comma+2);
					// console.log(summary);
					var state = summary.slice(0, 2);
					// console.log(state);
					var location = city + ", " + state;
					// console.log("---");

					activity.push({
						date: date,
						time: time,
						status: "Delivered",
						location: location
					});
				} else if (summary.search("item was delivered") >= 0) {
					var comma = summary.indexOf(":");
					var time = summary.slice(comma-2, comma+6);
					summary = summary.substr(comma+10);
					// console.log(time);
					// console.log(summary);

					comma = summary.indexOf(",") + 6;
					var date = summary.slice(0, comma);
					// console.log(date);
					summary = summary.substr(comma+4);
					// console.log(summary);

					comma = summary.indexOf(",");
					var city = this.formatLocation(summary.slice(0, comma));
					// console.log(city);
					summary = summary.substr(comma+2);
					// console.log(summary);
					var state = summary.slice(0, 2);
					// console.log(state);
					var location = city + ", " + state;
					// console.log("---");

					activity.push({
						date: date,
						time: time,
						status: "Delivered",
						location: location
					});
				}

				if (activity.length > 0)
					deliveryDate = activity[0].date;
				


				var a = r.getElementsByTagName("TrackDetail");
				for (var i=0; i<a.length; i++) {
					// console.log(a[i].textContent);
					var text = a[i].textContent;

					var comma = text.indexOf(",");
					var status = text.slice(0, comma);
					// console.log(status);
					text = text.substr(comma+2);

					comma = text.indexOf(",") + 6;
					var d = text.slice(0, comma);
					// console.log(d);
					text = text.substr(comma+2);
					// console.log(text);

					comma = text.indexOf(",");
					var time = text.slice(0, comma);
					// console.log(time);
					text = text.substr(comma+2);
					// console.log(text);

					comma = text.indexOf(",");
					var city = this.formatLocation(text.slice(0, comma));
					// console.log(city);
					text = text.substr(comma+2);
					var state = text.slice(0, 2);
					// console.log(state);
					var location = city + ", " + state;
					// console.log("---");

					activity.push({
						date: d,
						time: time,
						status: status,
						location: location
					});
				}

				var status;
				// this.log(activity[0].location);
				this.log(activity);
				if (activity[0].location.length > 2) {
					status = activity[0].status + " @ " + activity[0].location;
				} else {
					status = activity[0].status;
				}

				var date;
				if (activity[0].time) {
					date = activity[0].date + " - " + activity[0].time;
				} else {
					date = activity[0].date;
				}

				// if (activity[0].location) {
				// 	var status = activity[0].status + " @ " + activity[0].location;
				// } else {
				// 	var status = activity[0].status;
				// }
				


				// var date = activity[0].date + " - " + activity[0].time;
				if (activity[0].status == "Delivered") {
					daysLeft = -1;
				} else {
					daysLeft = 99;
				}

				var item = {
					tracking: current.tracking,
					shipDate: shipDate,
					deliveryDate: deliveryDate,
					daysLeft: daysLeft,
					weight: 0,
					service: service,
					status: status,
					date: date,
					activity: activity
				};
				var data = enyo.mixin(current, item);
				console.log(data);

				packageList[index] = data;
				this.savePrefs();

				if (refreshList) {
					this.$.appPanels.setIndex(1);
					this.setupOverview();
				}

			});
			callUSPS.error(this, function(sender, response) {
				console.log(sender);
				console.log(response);
			});
			callUSPS.go();
		} else {
			// this.log("UPS");
			var security = "<?xml version='1.0'?><AccessRequest xml:lang='en-US'><AccessLicenseNumber>ECC33A0CD92CDE4A</AccessLicenseNumber><UserId>Choorp</UserId><Password>usrdev.1</Password></AccessRequest>";
			var content = "<?xml version='1.0'?><TrackRequest><Request><TransactionReference><CustomerContext>guidlikesubstance</CustomerContext></TransactionReference><RequestAction>Track</RequestAction><RequestOption>activity</RequestOption></Request><TrackingNumber>"+current.tracking+"</TrackingNumber></TrackRequest>";
			var callUPS = new enyo.JsonpRequest({
				url: 'https://wwwcie.ups.com/ups.app/xml/Track',
				method: 'POST',
				handleAs: "xml",
				headers: {
					'Content-Type' : 'application/x-www-form-urlencoded'
				},
				postBody: security+content
			});
			callUPS.response(this, function(sender, response) {
				console.log(response);

				// var r = (new DOMParser()).parseFromString(response, "text/xml");
				var r = response;
				var tracking, shipDate, deliveryDate, daysLeft, weight, service = "---";

				var request = r.getElementsByTagName("ResponseStatusDescription")[0].textContent;
				// this.log(request)
				if (request == "Failure") {
					this.$.addPackageStatus.setContent(r.getElementsByTagName("ErrorDescription")[0].textContent);
					this.deletePackage(id);
					return;
				}


				var tracking = r.getElementsByTagName("TrackingNumber")[0].textContent;
				var shipDate = this.formatDate(r.getElementsByTagName("PickupDate")[0].textContent);

				if (r.getElementsByTagName("ScheduledDeliveryDate")[0]) {
					deliveryDate = this.formatDate(r.getElementsByTagName("ScheduledDeliveryDate")[0].textContent);
					daysLeft = this.findDaysLeft(r.getElementsByTagName("ScheduledDeliveryDate")[0].textContent);
				} else {
					if (r.getElementsByTagName("Activity")[0].childNodes[2]) {
						deliveryDate = this.formatDate(r.getElementsByTagName("Activity")[0].childNodes[2].textContent);
					} else {
						deliveryDate = "0/0/0000";
					}
					daysLeft = -1;
				}
				var weight = r.getElementsByTagName("ShipmentWeight")[0];
				weight = weight.childNodes[1].textContent + " " + weight.childNodes[0].childNodes[0].textContent;
				var service = r.getElementsByTagName("Service")[0].childNodes[1].textContent;


				var activity = [];
				var a = r.getElementsByTagName("Activity");
				for (var i=0; i<a.length; i++) {
					var date = this.formatDate(a[i].childNodes[2].textContent);
					var time = this.formatTime(a[i].childNodes[3].textContent);
					var status = this.formatLocation(a[i].childNodes[1].childNodes[0].childNodes[1].textContent);
					var location = "";
					if (a[i].childNodes[0].childNodes[0].childNodes.length > 1)
						location = this.formatLocation(a[i].childNodes[0].childNodes[0].childNodes[0].textContent) + ", " + a[i].childNodes[0].childNodes[0].childNodes[1].textContent;
					
					activity.push({
						date: date,
						time: time,
						status: status,
						location: location
					});
				}

				var status;
				if (activity[0].location) {
					status = activity[0].status + " @ " + activity[0].location;
				} else {
					status = activity[0].status;
				}

				var date;
				if (activity[0].time) {
					date = activity[0].date + " - " + activity[0].time;
				} else {
					date = activity[0].date;
				}

				var item = {
					tracking: tracking,
					shipDate: shipDate,
					deliveryDate: deliveryDate,
					daysLeft: daysLeft,
					weight: weight,
					service: service,
					status: status,
					date: date,
					activity: activity
				};
				var data = enyo.mixin(current, item);
				// console.log(data);

				packageList[index] = data;
				this.savePrefs();

				// if (updateData && daysLeft >= 0) {
				if (updateData) {
					var div;
					var elements = this.$.activePackages.children;
					for (var i=0; i<elements.length; i++) {
						if (elements[i].data.id == id) {
							console.log("Pushing new data to " + current.name);
							this.$[elements[i].name].setData(data);
						}
					}

					this.updateLastUpdated();

					// var now = new Date();
					// var h = now.getHours().toString();
					// var m = now.getMinutes().toString();
					// if (h.length == 1) {
					// 	h = "0" + h;
					// }
					// if (m.length == 1) {
					// 	m = "0" + m;
					// }
					// var time = this.formatTime(h+m);
					// this.$.lastUpdated.setContent("Updated at " + time);
				}

				if (refreshList) {
					this.$.appPanels.setIndex(1);
					this.setupOverview();
				}

				
				// console.log(time);

				// var m = now.getMonth();
				// var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
				// m = months[m];
				// var d = now.getDate();

				// now = m + " " + d + ", " + time;
				
			});
			callUPS.error(this, function(sender, response) {
				console.log(response);
			});
			callUPS.go();
		}
	},
	updateLastUpdated: function() {
		var now = new Date();
		var h = now.getHours().toString();
		var m = now.getMinutes().toString();
		if (h.length == 1) {
			h = "0" + h;
		}
		if (m.length == 1) {
			m = "0" + m;
		}
		var time = this.formatTime(h+m);
		this.$.lastUpdated.setContent("Updated at " + time);
	},
	formatDate: function(date) {
		var y = parseInt(date.substr(0,4), 10);
		var m = parseInt(date.substr(4,2), 10);
		var d = parseInt(date.substr(6,2), 10);

		var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		// var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		var response = months[m-1] + " " + d + ", " + y;
		// var response = months[m-1] + " " + d;
		return response;
	},
	formatTime: function(time, h, m) {
		// this.log(time, h, m);
		var ampm;
		if (time) {
			h = parseInt(time.substr(0,2), 10);
			m = time.substr(2,2);
		} else {
			if (m.toString().length == 1) {
				m = "0" + m;
			}
		}

		if (h > 12) {
			h -= 12;
			ampm = "pm";
		} else if (h == 12) {
			ampm = "pm";
		} else if (h == 0) {
			h = 12;
			ampm = "am";
		} else {
			ampm = "am";
		}

		var t = h + ":" + m + ampm;
		return t;

	},
	formatLocation: function(str) {
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	},
	findDaysLeft: function(date) {
		var y = parseInt(date.substr(0,4), 10);
		var m = parseInt(date.substr(4,2), 10);
		var d = parseInt(date.substr(6,2), 10);

		var deliver = new Date(y,m-1,d);
		var today = new Date();

		today.setHours(0);
		today.setMinutes(0);
		today.setSeconds(0);
		today.setMilliseconds(0);

		today.setHours(0);
		today.setMinutes(0);

		var delta = deliver - today;

		var a = Math.round(delta / 1000 / 60 / 60/ 24);

		return a;
	}
});

enyo.kind({
	name: "PackageRow",
	kind: "FittableColumns",
	classes: "package-row",
	published: {
		data: ""
	},
	components:[
		{name: "content", kind: "FittableRows", classes: "content-box", fit: true, components: [
			{name: "title", classes: "title", content: "Nexus 5"},
			{name: "status", classes: "status", content: "Arrival Scan @ Philadelphia, PA"},
			{name: "date", classes: "date", content: "November 2, 2013 - 12:05pm"},
			{name: "eta", classes: "eta", content: "ETA: 3 days"},
		]}		
	],
	create: function() {
		this.inherited(arguments);

		var color;
		if (this.data.carrier == "ups") {
			color = carrierColors.ups;
		} else if (this.data.carrier == "fedex") {
			color = carrierColors.fedex;
		} else {
			color = carrierColors.usps;
		}

		this.$.content.applyStyle("border-left", "5px solid " + color);

		this.dataChanged();
	},
	dataChanged: function() {
		// this.log()

		this.log(this.data);
		if (this.data.name)
			this.$.title.setContent(this.data.name);
		if (this.data.status)
			this.$.status.setContent(this.data.status);
		if (this.data.date)
			this.$.date.setContent(this.data.date);
		// if (this.data.daysLeft) {
			if (this.data.daysLeft > 1 && this.data.daysLeft < 99) {
				this.$.eta.setContent("Should arrive in " + this.data.daysLeft + " days");
			} else if (this.data.daysLeft == 1) {
				this.$.eta.setContent("Should arrive tomorrow!");
			} else if (this.data.daysLeft == 0) {
				this.$.eta.setContent("Should arrive today!");
			} else {
				this.$.eta.setShowing(false);
			}
		// }
	}
});

enyo.kind({
	name: "Package",
	kind: "FittableRows",
	classes: "package",
	published: {
		data: ""
	},
	events: {
		onDeletePackage: ""
	},
	components:[
		{kind: "FittableColumns", components: [
			{name: "title", classes: "title", fit: true},
			{name: "daysLeft", classes: "days-left", content: "3"}
		]},
		{kind: "enyo.Scroller", fit: true, horizontal: "hidden", thumb: false, touch: true, components: [
			{name: "content", classes: "content", components: [
				{classes: "group-title", content: "Overview"},
				{name: "tracking", kind: "DetailItem", label: "Tracking #", data: ""},
				{name: "shipDate", kind: "DetailItem", label: "Ship Date", data: ""},
				{name: "deliveryDate", kind: "DetailItem", label: "Delivery Date", data: ""},
				{name: "weight", kind: "DetailItem", label: "Weight", data: ""},
				{name: "services", kind: "DetailItem", label: "Services", data: "", classes: "detail-item last"},
				{classes: "group-title", content: "Activity"},
				{name: "activities"},
				{kind: "onyx.Button", style: "width: 100%;", content: "Delete Package", ontap: "doDeletePackage"},
			]}
		]}
	],
	create: function() {
		this.inherited(arguments);
		this.dataChanged();
		// this.$.title.setContent(this.data.name);
		// this.$.daysLeft.setContent(this.data.daysLeft);
		// this.$.tracking.setData(this.data.tracking);
		// this.$.shipDate.setData(this.data.shipDate);
		// this.$.deliveryDate.setData(this.data.deliveryDate);
		// this.$.weight.setData(this.data.weight);
		// this.$.services.setData(this.data.service);

		// if (this.data.carrier == "ups") {
		// 	this.color = carrierColors.ups;
		// } else if (this.data.carrier == "fedex") {
		// 	this.color = carrierColors.fedex;
		// } else {
		// 	this.color = carrierColors.usps;
		// }

		// this.$.title.applyStyle("border-bottom", "2px solid " + this.color);
		// this.$.daysLeft.applyStyle("background", this.color);	
	},
	rendered: function() {
		this.inherited(arguments);

		// var a = this.data.activity;
		// for (var i=0; i<a.length; i++) {
		// 	this.$.activities.createComponent({kind: "EventItem", date: a[i].date, time: a[i].time, location: a[i].location, status: a[i].status, color: this.color});
		// }
		// this.$.activities.render();
	},
	dataChanged: function() {
		if (this.data.carrier == "ups") {
			this.color = carrierColors.ups;
		} else if (this.data.carrier == "fedex") {
			this.color = carrierColors.fedex;
		} else {
			this.color = carrierColors.usps;
		}

		this.$.title.applyStyle("border-bottom", "2px solid " + this.color);
		this.$.daysLeft.applyStyle("background", this.color);

		this.$.title.setContent(this.data.name);
		this.$.daysLeft.setContent(this.data.daysLeft);
		this.$.tracking.setData(this.data.tracking);
		this.$.shipDate.setData(this.data.shipDate);
		this.$.deliveryDate.setData(this.data.deliveryDate);
		this.$.weight.setData(this.data.weight);
		this.$.services.setData(this.data.service);

		var a = this.data.activity;
		for (var i=0; i<a.length; i++) {
			this.$.activities.createComponent({kind: "EventItem", date: a[i].date, time: a[i].time, location: a[i].location, status: a[i].status, color: this.color});
		}
		this.$.activities.render();
	}
});

enyo.kind({
	name: "DetailItem",
	kind: "FittableColumns",
	classes: "detail-item",
	published: {
		label: "",
		data: ""
	},
	components:[
		{name: "label", classes: "label", fit: true},
		{name: "data", classes: "data"}
	],
	create: function() {
		this.inherited(arguments);
		this.$.label.setContent(this.label);
		this.$.data.setContent(this.data);
	},
	dataChanged: function() {
		this.$.data.setContent(this.data);
	}
});

enyo.kind({
	name: "EventItem",
	kind: "FittableRows",
	classes: "event-item",
	published: {
		date: "",
		time: "",
		location: "",
		status: "",
		color: ""
	},
	components:[
		{name: "date", classes: "date"},
		{name: "location", classes: "location"},
		{name: "status", classes: "status"}
	],
	create: function() {
		this.inherited(arguments);
		this.$.date.setContent(this.date + " - " + this.time);
		this.$.date.applyStyle("color", this.color);
		// this.$.location.setContent(this.status + " @ " + this.location);
		if (this.location) {
			this.status = this.status + " @ " + this.location;
		}
		this.$.status.setContent(this.status);
	}
});