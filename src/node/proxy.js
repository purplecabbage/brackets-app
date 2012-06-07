// proxy.js


var fs = require('fs'),
    child_process = require('child_process');

// add some stuff to fs because the return types are sometimes complicated objects that don't jsonify
fs.statBrackets = function(path, callback) {
	fs.stat(path, function(err, stats) {
		if (err) {
			callback(err, null);
		} else {
			result = {};
			result.isFile = stats.isFile();
			result.isDirectory = stats.isDirectory();
			result.mtime = stats.mtime;
			result.filesize = stats.size;
			callback(0, result); // TODO: hack, need handling of error being null in callbacks on client side
		}
	})
}

// A test namespace

var stupid = {};

stupid.reverse = function(s) {
	return s.split("").reverse().join("");
};

// end test namespace

// child_processes

var child_processes = {};

var namespaces = {
	fs : fs,
	stupid : stupid,
    child_process : child_process
};


function createCallback(id, ws) {
	return function() {
		var args = Array.prototype.slice.call(arguments);
		ws.send(JSON.stringify({id: id, result: args}));
	};
}

function handleConnection(ws) {
   ws.on('message', function(message) {
        console.log('received: %s', message);
        try {
        	var cp;

	   		m = JSON.parse(message);

	   		if (m.module_path) {
	   			cp = child_process.fork(m.module_path, m.args, m.options);
				ws.send(JSON.stringify({id: id, pid: cp.pid}));
	   // 			cp.on('message', function (message) {
	   // 				console.log("ChildProcess PID: " + m.pid + ", got message: " + message);
	   // 			});
	   // 			child_processes[cp.pid] = cp;
				// ws.send(JSON.stringify({id: id, result: args}));
	   // 		} else if (m.pid) {
	   // 			console.log("ChildProcess PID: " + m.pid + ", send message: " + message);
	   // 			child_processes[m.pid].send(m.message);
	   		} else if (m.id) {
	   			//console.log('parsed version:');
	   			//console.log(m);
		   		doCommand(m.id, m.namespace, m.command, m.args, m.isAsync, ws);
		   	}
	   	} catch (e) {
	   		console.log("Error: could't parse the message or something");
	   	}
	})
}

function doCommand(id, namespace, command, args, isAsync, ws) {
	try {
		var f = namespaces[namespace][command];
		var callback = createCallback(id, ws)
		if (isAsync) {
			args.push(callback)
			f.apply(global, args)
		} else {
			callback(f.apply(global, args))
		}
	} catch (e) {
		console.log("Error: Couldn't run the command " + namespace + "." + command + " with args " + JSON.stringify(args));
	}
}

exports.handleConnection = handleConnection;
