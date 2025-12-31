// src/server.js


//We wanna shutdown our server gracefully
const stoppable = require('stoppable');

//Get our logger instance
const logger = require('./logger');

//Get our express app instance
const app = require('./app');

// 👇 Added this block before starting the server
if (process.env.LOG_LEVEL === 'debug') {
  console.log('Environment Variables:', process.env);
}

//Get the desired port from the process' environment. Default to '8080'
const port = parseInt(process.env.PORT || '8080', 10);


//Start a server listening on this port
const server = stoppable(
  app.listen(port, () => {
    //log a message that the server has started, and which port it's using.
    logger.info(`Server is running on port ${port}`);
  })
);

// Export our server instance so other parts of our code can access it if necessary.
module.exports = server;


