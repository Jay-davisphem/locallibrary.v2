const BookInstance = require("../models/bookinstance");
const Book = require("../models/book");
const async = require("async");
const { body, validationResult } = require("express-validator");

exports.bookinstance_list = (req, res, next) => {
  BookInstance.find()
    .populate("book")
    .exec(function (err, list_bookinstances) {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render("bookinstance_list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    });
};

exports.bookinstance_detail = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec(function (err, bookinstance) {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        // No results.
        const err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("bookinstance_detail", {
        title: "Copy: " + bookinstance.book.title,
        bookinstance: bookinstance,
      });
    });
};

exports.bookinstance_create_get = (req, res, next) => {
  Book.find({}, "title").exec(function (err, books) {
    if (err) {
      return next(err);
    }
    res.render("bookinstance_form", {
      title: "Create BookInstance",
      book_list: books,
    });
  });
};

exports.bookinstance_create_post = [
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  (req, res, next) => {
    const errors = validationResult(req);

    var bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }
        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      });
      return;
    } else {
      bookinstance.save(function (err) {
        if (err) {
          return next(err);
        }
        res.redirect(bookinstance.url);
      });
    }
  },
];

exports.bookinstance_delete_get = (req, res, next) => {
  async.parallel(
    {
      bookinstance: (cb) => {
        BookInstance.findById(req.params.id).exec(cb);
      },
    },
    (err, results) => {
      if (err) return next(err);
      if (results.bookinstance == null) res.redirect("/catalog/bookinstances");
      res.render("bookinstance_delete", {
        title: "Delete Bookinstance",
        bookinstance: results.bookinstance,
      });
    }
  );
};

exports.bookinstance_delete_post = (req, res, next) => {
  async.parallel(
    {
      bookinstance: (cb) => {
        BookInstance.findById(req.body.bookinstanceid).exec(cb);
      },
    },
    (err, results) => {
      if (err) return next(err);
      BookInstance.findByIdAndRemove(req.body.bookinstanceid, (err) => {
        if (err) return next(err);
        res.redirect("/catalog/bookinstances");
      });
    }
  );
};

exports.bookinstance_update_get = function (req, res, next) {
  async.parallel(
    {
      bookinstance: function (callback) {
        BookInstance.findById(req.params.id).populate("book").exec(callback);
      },
      books: function (callback) {
        Book.find(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.bookinstance == null) {
        // No results.
        const err = new Error("Bookinstance not found");
        err.status = 404;
        return next(err);
      }

      res.render("bookinstance_form", {
        title: "Update Bookinstance",
        book_list: results.books,
        bookinstance: results.bookinstance,
      });
    }
  );
};

exports.bookinstance_update_post = [
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") req.body.genre = [];
      else req.body.genre = new Array(req.body.genre);
    }
    next();
  },

  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  (req, res, next) => {
    const errors = validationResult(req);
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id, //This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      async.parallel(
        {
          books: function (callback) {
            Book.find(callback);
          },
        },
        function (err, results) {
          if (err) {
            return next(err);
          }

          res.render("bookinstance_form", {
            title: "Update Bookinstance",
            book_list: results.books,
            booknstance: bookinstance,
            errors: errors.array(),
          });
        }
      );
      return;
    } else {
      BookInstance.findByIdAndUpdate(
        req.params.id,
        bookinstance,
        {},
        function (err, thebookinst) {
          if (err) {
            return next(err);
          }
          res.redirect(thebookinst.url);
        }
      );
    }
  },
];
