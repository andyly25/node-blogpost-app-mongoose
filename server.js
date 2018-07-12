const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Mongoose internally uses a promise-like object,
// but its better to make Mongoose use built in es6 promises
mongoose.Promise = global.Promise;

const { DATABASE_URL, PORT } = require('./config');
const { Blogpost } = require('./models');

const app = express();
// const blogpostRouter = require('./blogpostRouter');

// log http layer
app.use(morgan('common'));
// if we wanted css and etc we can change to express.static('public')
app.use(express.json());
// app.use('/blog-posts', blogpostRouter);

// GET requests to /blog-posts
app.get('/posts', (req, res) => {
  Blogpost
    .find()
    .then(blogposts => {
      // success callback: for each blogpost we got back, we'll
      // call the `.serialize` instance method we've created in
      // models.js in order to only expose the data we want the API return.
      res.json(blogposts.map(blogpost => blogpost.serialize()));
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'internal server error'});
    });
});

// Can request by id
app.get('/posts/:id', (req, res) => {
  Blogpost
    // this is a convenience method Mongoose provides for searching
    // by the object _id property
    .findById(req.params.id)
    .then(blogpost => res.json(blogpost.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'internal server error' });
    });
});

// POST: endpoint allows update title, content, author
app.post('/posts', (req, res) => {
  const requiredFields = ['title', 'content', 'author'];
  for (let i = 0; i < requiredFields.length; i += 1) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  Blogpost.create({
    title: req.body.title,
    content: req.body.content,
    author: req.body.author
  })
  .then(blogpost => res.status(201).json(blogpost.serialize()))
  .catch(err => {
    console.error(err);
    res.status(500).json({ message: 'internal server error' });
  });
});

app.put('/posts/:id', (req, res) => {
   // ensure that the id in the request path and the one in request body match
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message =
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`;
    console.error(message);
    return res.status(400).json({ message: message });
  }

  // we only support a subset of fields being updateable.
  // if the user sent over any of the updatableFields, we udpate those values
  // in document
  const toUpdate = {};
  const updateableFields = ['title', 'content', 'author'];
  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  Blogpost
    .findByIdAndUpdate(req.params.id, { $ser: toUpdate })
    .then(blogpost => res.status(204).end())
    .catch(err => res.status(500).json({ message: 'internal server error'}));
});

app.delete('/posts/:id', (req, res) => {
  Blogpost.findByIdAndRemove(req.params.id)
    .then(blogpost => res.status(204).end())
    .catch(err => res.status(500).json({ message: 'internal server error'}));
});

// catch-all endpoint if client makes request to non-existent endpoint
app.use('*', function (req, res) {
  res.status(404).json({ message: 'Not Found' });
});

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

// this function connects to our database, then starts the server
function runServer(databaseUrl, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve();
      })
        .on('error', err => {
          mongoose.disconnect();
          reject(err);
        });
    });
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { runServer, app, closeServer };