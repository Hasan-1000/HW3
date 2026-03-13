require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

router.post('/signup', async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({
      success: false,
      msg: 'Please include both username and password to signup.'
    });
  }

  try {
    const user = new User({
      name: req.body.name,
      username: req.body.username,
      password: req.body.password
    });

    await user.save();

    return res.status(201).json({
      success: true,
      msg: 'Successfully created new user.'
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with that username already exists.'
      });
    } else {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again later.'
      });
    }
  }
});

router.post('/signin', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username }).select('name username password');

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: 'Authentication failed. User not found.'
      });
    }

    const isMatch = await user.comparePassword(req.body.password);

    if (isMatch) {
      const userToken = { id: user._id, username: user.username };
      const token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: '1h' });

      return res.json({
        success: true,
        token: 'JWT ' + token
      });
    } else {
      return res.status(401).json({
        success: false,
        msg: 'Authentication failed. Incorrect password.'
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
});

router.route('/movies')
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movies = await Movie.find();
      return res.status(200).json(movies);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Error getting movies',
        error: err.message
      });
    }
  })
  .post(authJwtController.isAuthenticated, async (req, res) => {
    const { title, releaseDate, genre, actors } = req.body;

    if (!title || !releaseDate || !genre || !actors || !Array.isArray(actors) || actors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Movie must include title, releaseDate, genre, and at least one actor.'
      });
    }

    try {
      const movie = new Movie({
        title,
        releaseDate,
        genre,
        actors
      });

      const savedMovie = await movie.save();

      return res.status(201).json(savedMovie);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Error creating movie',
        error: err.message
      });
    }
  });

router.route('/movies/:movieparameter')
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movie = await Movie.findOne({ title: req.params.movieparameter });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      return res.status(200).json(movie);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Error getting movie',
        error: err.message
      });
    }
  })
  .put(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const updatedMovie = await Movie.findOneAndUpdate(
        { title: req.params.movieparameter },
        req.body,
        { new: true, runValidators: true }
      );

      if (!updatedMovie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      return res.status(200).json(updatedMovie);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Error updating movie',
        error: err.message
      });
    }
  })
  .delete(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const deletedMovie = await Movie.findOneAndDelete({ title: req.params.movieparameter });

      if (!deletedMovie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Movie deleted successfully'
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Error deleting movie',
        error: err.message
      });
    }
  });

app.use('/', router);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;