const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

const BASE_URL = "http://localhost:5000";

// ---------- Server side: Promise / async-await helpers ----------
const getBooks = () => new Promise((resolve) => resolve(books));

const searchBooks = async (field, value) => {
  const allBooks = await getBooks();
  return Object.keys(allBooks)
    .filter((isbn) => allBooks[isbn][field].toLowerCase() === value.toLowerCase())
    .map((isbn) => ({ isbn, ...allBooks[isbn] }));
};

const sendJson = (res, data) => res.status(200).type('json').send(JSON.stringify(data, null, 2));

// ---------- Routes ----------
public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (!isValid(username)) {
    return res.status(409).json({ message: "User already exists!" });
  }
  users.push({ username, password });
  return res.status(200).json({ message: "User successfully registered. Now you can login" });
});

// Get the book list available in the shop
public_users.get('/', async (req, res) => {
  const allBooks = await getBooks();
  return sendJson(res, allBooks);
});

// Get book details based on ISBN
public_users.get('/isbn/:isbn', async (req, res) => {
  const allBooks = await getBooks();
  const book = allBooks[req.params.isbn];
  if (!book) {
    return res.status(404).json({ message: "Book with ISBN " + req.params.isbn + " not found" });
  }
  return sendJson(res, { isbn: req.params.isbn, ...book });
});

// Get book details based on author
public_users.get('/author/:author', async (req, res) => {
  const result = await searchBooks('author', req.params.author);
  if (result.length === 0) {
    return res.status(404).json({ message: "No books found for author " + req.params.author });
  }
  return sendJson(res, { booksbyauthor: result });
});

// Get all books based on title
public_users.get('/title/:title', async (req, res) => {
  const result = await searchBooks('title', req.params.title);
  if (result.length === 0) {
    return res.status(404).json({ message: "No books found with title " + req.params.title });
  }
  return sendJson(res, { booksbytitle: result });
});

// Get book review
public_users.get('/review/:isbn', async (req, res) => {
  const allBooks = await getBooks();
  const book = allBooks[req.params.isbn];
  if (!book) {
    return res.status(404).json({ message: "Book with ISBN " + req.params.isbn + " not found" });
  }
  return sendJson(res, { isbn: req.params.isbn, reviews: book.reviews });
});

// ---------- Client side: Axios with async/await and promise callbacks ----------
const getAllBooks = async () => {
  const response = await axios.get(BASE_URL + "/");
  return response.data;
};

const getBookByISBN = (isbn) =>
  axios.get(BASE_URL + "/isbn/" + isbn).then((response) => response.data);

const getBooksByAuthor = async (author) => {
  const response = await axios.get(BASE_URL + "/author/" + encodeURIComponent(author));
  return response.data;
};

const getBooksByTitle = (title) =>
  axios.get(BASE_URL + "/title/" + encodeURIComponent(title)).then((response) => response.data);

// Run `node router/general.js` while the server is running to try the Axios calls
if (require.main === module) {
  (async () => {
    try {
      console.log("All books:", await getAllBooks());
      console.log("By ISBN 1:", await getBookByISBN(1));
      console.log("By author:", await getBooksByAuthor("Jane Austen"));
      console.log("By title:", await getBooksByTitle("Pride and Prejudice"));
    } catch (error) {
      console.error("Request failed:", error.message);
    }
  })();
}

module.exports.general = public_users;
module.exports.axiosClient = { getAllBooks, getBookByISBN, getBooksByAuthor, getBooksByTitle };
