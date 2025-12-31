// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const passport = require('passport');
const authenticate = require('./auth');




const logger = require('./logger');
const pino = require('pino-http')({
  // Use our default logger instance, which is already configured
  logger,
});
const { createErrorResponse } = require('./response');

/// Create an express app instance we can use to attach middleware and HTTP routes
const app = express();

// Attach all of our middleware to the express app instance
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(pino);
// Define our routes
app.use('/', require('./routes'));

passport.use(authenticate.strategy());
app.use(passport.initialize());



// Add a 404 middleware to handle any requests for resources that can't be found
app.use((req, res) => {
  res.status(404).json(createErrorResponse(404, 'not found'));
});

// Add error-handling middleware to deal with anything else
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // We may already have an error response we can use, but if not,
  // use a generic `500` server error and message.
  const status = err.status || 500;
  const message = err.message || 'unable to process request';

  // If this is a server error, log something so we can see what's going on.
  if (status > 499) {
    logger.error({ err }, `Error processing request`);
  }

  res.status(status).json({
    ...createErrorResponse(status, message),
  });
});

// Export our `app` so that it can be used by `server.js`
module.exports = app;
