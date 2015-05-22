# simple-fs-rest

A simple file-based REST service with no design, setup, or configuration required

# Installation

```bash
npm install simple-fs-rest --save
```

# Summary

simple-fs-rest allows you to easily run a REST server for use with quick POC's or to immediately build a UI without designing the corresponding REST service.

It is intended to be used for local test development. It is *not* to be used for production or on any internet-facing server.

# Usage

```javascript
var express = require('express');
var simpleFsRest = require('simple-fs-rest');
var app = express();

// Link the REST Service to anything under /api. ex: /api/users/
app.use('/api',simpleFsRest());
// Link a second api path, using the ".data2" directory to hold files
app.use('/api2',simpleFsRest('.data2/'));

app.listen(8080);
```

# Limitations

- No security or authorization
- No guards against malicious requests
- Not intended for multi-user scenarios, because race conditions are not handled
- Not a full REST implementation. Just the basics.

# Implementation Details

- Data is stored as files and directories under a ".data" directory by default. This can be customized by passing a directory name to the function.
- Records are stored as .json files
- All records must have a unique "id" field. If one is not specified, it will be generated and inserted into the object

# Example

```
POST /users {"name":"Bob"}
POST /users {"name":"Matt"}
GET /users
POST /users/1/foo/bar/fizz/buzz/comments {"content":"Boo"}
```

All of these calls will work without any setup, and will result in files being created in the ".data" directory.

1. A "users" directory does not exist to write to, so it is created. The passed object does not contain an "id" attribute, so one is created and inserted into the object. The "users" directory is scanned for records, and none are found, the the id:1 is used. The file ".data/users/1.json" is created containing {"id":1,"name":"Bob"}

2. Like step #1, but since 1.json already exists, the second object gets id:2 and is written to 2.json

3. The "users" directory is scanned for .json files, and the response is the array: [{"id":1,"name":"Bob"},{"id":2,"name":"Matt"}]. By default, it is sorted by id, but if you wanted the records returned in order of name, you could use GET /users?sort=name

4. This is a deeply nested endpoint, and none of the directories exist. They are each created so the entire directory structure, then the JSON content is written to the file ".data/users/1/foo/bar/fizz/buzz/comments/1.json".

# Supported REST Requests

## GET

```
GET /users
```

Returns an Array of the contents of files in the "users" directory.

```
GET /users?sort=name
```

Sorted by the "name" field in each object

```
GET /users?name=Bob&age=40
```

Filter the returned objects and only return matches

```
GET /users/1
```

Returns the contents of "users/1.json"

## POST

```
POST /users {"name":"Joe"}
```

Creates a new file in the "users" directory. Since no id is given in the object, it generates one to be the max(id) of files in the "users" directory and assigns it to the object.

```
POST /servers/windows/xp/ {"name":"server1"}
```

If a nested path is given, subdirectories will be automatically created as needed.

## PUT

```
PUT /users/1 {"id":1,"name":"Joe"}
```

Update an existing resource. The object passed must be a full representation of the object, including id.

## PATCH

```
PATCH /users/1 [ ... operations ... ]
```

Update an existing resource by adding, changing, removing, etc properties. A full representation of the object does not need to be given. The [jsonpatch](http://jsonpatchjs.com/) module is used to apply the patch. See that module's documentation for supported PATCH operations and syntax.

## DELETE

```
DELETE /users/1
```

Delete a record. The "users/1.json" file will be removed.
