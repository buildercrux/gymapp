"use strict";

var _app = _interopRequireDefault(require("./src/app.js"));

var _env = require("./src/config/env.js");

var _mongoose = require("./src/db/mongoose.js");

var _http = require("http");

var _socket = require("./src/realtime/socket.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var startServer = function startServer() {
  var httpServer;
  return regeneratorRuntime.async(function startServer$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap((0, _mongoose.connectDatabase)());

        case 2:
          httpServer = (0, _http.createServer)(_app["default"]);
          (0, _socket.initSocket)(httpServer);
          httpServer.listen(_env.env.port, function () {
            console.log("Backend running on port ".concat(_env.env.port));
          });

        case 5:
        case "end":
          return _context.stop();
      }
    }
  });
};

startServer()["catch"](function (error) {
  console.error("Failed to start backend", error);
  process.exit(1);
});
//# sourceMappingURL=server.dev.js.map
