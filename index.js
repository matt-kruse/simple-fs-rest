var fs = require('fs');
var jsonpatch = require('jsonpatch');
var express = require('express');
var bodyParser = require('body-parser');

function directory_files(dir,sortField,filters) {
	var all_files=[];
	fs.readdirSync(dir).forEach(function(file){
		if (fs.lstatSync(dir+file).isFile()) {
			try {
				all_files.push( JSON.parse(fs.readFileSync(dir+file,"utf8")) );
			} catch(e){}
		}
	});
	// SORT - By filename (id) by default
	if (!sortField) { sortField="id"; }
	all_files = all_files.sort(function(a,b) {
		if (typeof a[sortField]=="undefined" && typeof b[sortField]=="undefined") { return 0; }
		if (a[sortField] < b[sortField]) { return -1; }
		if (a[sortField] > b[sortField]) { return 1; }
		return 0;
	});
	// FILTER - by any number of fields
	if (typeof filters=="object" && filters) {
		var filter, filtered_files=[];
		all_files.forEach(function(o) {
			var include = true;
			for (filter in filters) {
				if (o[filter]!=filters[filter]) {
					include = false;
				}
			}
			if (include) {
				filtered_files.push(o);
			}
		});
		all_files = filtered_files;
	}
	return all_files;
};

// Find the maximum object ID within a directory
function max_id(dir) {
	var files = directory_files(dir);
	if (files && files.length>0) {
		return files.pop().id;
	}
	return 0;
};

// Define the router that can be attached to express
function rest_server(data_dir,server) {
	if (!data_dir) {
		data_dir = __dirname + "/.data/";
	}
	if (!/\/$/.test(data_dir)) {
		data_dir += "/";
	}
	if (!fs.existsSync(data_dir) || !fs.statSync(data_dir).isDirectory()) {
		fs.mkdirSync(data_dir);
	}
	
	// Create a new express route
	server = server || express;
	var route = server.Router();
	
	// JSON body parsing
	route.use(bodyParser.urlencoded({ extended: true }));
	route.use(bodyParser.json());
	route.all('/*',function(req,res,next) {
		var path = req.params[0];
		var resource = data_dir + path;
		var is_dir=false, is_file=false;
		try { is_dir = fs.statSync(resource).isDirectory(); } catch(e) {}
		// If it's not a directory, test if it's a file
		if (!is_dir) {
			try { 
				if (fs.statSync(resource+".json").isFile()) {
					resource = resource+".json";
					is_file = true;
				}
			} catch(e) {}
		}
		
		var method = req.method;
		
		if ("GET"===method) {
			// If the resource is a directory, return the listing
			if (is_dir) {
				// Return all json records in an array
				var filter = {}, param;
				for (param in req.query) {
					if (param!="sort") {
						filter[param] = req.query[param];
					}
				}
				res.json( directory_files(resource, req.query.sort, filter) );
			}
			// If the resource is a file, return the file
			else if (is_file) {
				res.json( JSON.parse(fs.readFileSync(resource, "utf8")));
			}
			else {
				res.status(404).send("Resource not found");
			}
		}
		
		else if ("POST"===method) {
			var object = req.body;
			var add_record = function(o) {
				if (o && typeof o.id!="number") {
					o.id = max_id(resource)+1;
				}
				fs.writeFileSync(resource + o.id + ".json", JSON.stringify(o,null,3));
			};
			// If the resource is a directory, add a new record
			if (is_dir) {
				add_record(object);
				res.status(201).json(object);
			}
			// Otherwise create the path as needed
			else {
				var current_dir = data_dir;
				path.split('/').forEach(function(dir) {
					if (dir && dir.length>0) {
						current_dir += dir+"/";
						fs.mkdirSync(current_dir);
					}
				});
				add_record(object);
				res.status(201).json(object);
			}
		}
		
		else if ("PUT"===method) {
			// Update a resource
			var object = req.body;
			if (!object.id) { 
				res.status(422).send("Valid object not passed");
			}
			else if (is_file) {
				fs.writeFileSync(resource, JSON.stringify(object,null,3));
				res.status(200).send(object);
			}
			else {
				res.status(404).send("Not Found");
			}
		}
		
		else if ("PATCH"===method) {
			// the req.body holds the list of patch operations
			var patch = req.body;
			// First read in the resource
			if (is_file) {
				var data = JSON.parse(fs.readFileSync(resource, "utf8"));
				data = jsonpatch.apply_patch(data, patch);
				fs.writeFileSync(resource, JSON.stringify(data,null,3));
				res.status(200).send(data);
			}
			else {
				res.status(404).send("Resource not found");
			}
		}
		
		else if ("DELETE"===method) {
			// Won't delete directories
			fs.unlinkSync(resource);
			res.status(204).send(null);
		}
	});
	
	return route;
}

module.exports = rest_server;