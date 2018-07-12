// const uuid = require('uuid');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema to represent blogposts
const blogpostSchema = mongoose.Schema({
  title: {type: String, required: true},
  content: {type: String},
  author: {
    firstName: String,
    lastName: String
  },
  created: {type: Date, default: Date.now} 
});

// the API does not return an object for the author property, 
// but instead the author's first and last name separated by a space
// we'll use virtual to return string value for author
blogpostSchema.virtual('authorName').get(function () {
  return `${this.author.firstName} ${this.author.lastName}`.trim();
});

// this is an *instance method* which will be available on all instances
// of the model. This method will be used to return an object that only
// exposes *some* of the fields we want from the underlying data
blogpostSchema.methods.serialize = function () {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    author: this.authorName,
    created: this.created
  };
};

// note that all instance methods and virtual properties on our
// schema must be defined *before* we make the call to `.model`
const Blogpost = mongoose.model('Blogpost', blogpostSchema);

module.exports = { Blogpost };