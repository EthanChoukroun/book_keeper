import express from 'express';
import morgan from 'morgan';
import axios from 'axios';
import bodyParser from 'body-parser';
import pg from 'pg';

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('tiny'));

class Book {
    constructor(title, author, notes) {
        this.title = title;
        this.author = author;
        this.notes = notes;
    }
}

async function getBooks(db, id = 0) {
    if (id === 0) {
        try {
            const res = await db.query("SELECT * FROM books");
            return res.rows;  // This contains the array of book records
        } catch (err) {
            console.error("Error executing query", err.stack);
            return [];  // Return an empty array or handle the error as needed
        };
    } else {
        try {
            const res = await db.query('SELECT * FROM books WHERE id = $1', [id]);
            console.log(`res rows: ${res.rows}`);
            return res.rows;
        } catch (err) {
            console.error("Error executing query", err.stack);
            return []
        };
    };
    
};

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Book",
    password: "root",
    port: 5432,
});

db.connect();

app.get('/', async (req, res) => {
    try {
        const books = await getBooks(db);
        res.render('index.ejs', { data: books });
    } catch (error) {
        console.error('Error on GET /', error);
        res.sendStatus(500);
    }
});

app.get('/new_book', (req, res) => {
    res.render('book.ejs');
});

app.post('/', async (req, res) => {
    let newBook = new Book(req.body.title, req.body.author, req.body.notes);
    try {
        const query = 'INSERT INTO books (title, author, notes) VALUES ($1, $2, $3)';
        await db.query(query, [newBook.title, newBook.author, newBook.notes]);
        console.log('Book added successfully');
        // Fetch updated books list
        const books = await getBooks(db);
        res.render('index.ejs', { data: books });
    } catch (error) {
        console.error('Error on POST /', error);
        res.sendStatus(500);
    }
});

app.get('/book/:id', async (req, res) => {
    const bookID = req.params.id;
    console.log(bookID);
    try {
        let books = await getBooks(db, bookID);
        console.log(books);
        res.render('book_specific.ejs', { data: books[0] });
    } catch (error) {
        console.error('Error on GET /book', error);
        res.sendStatus(500);
    }
});

app.post('/delete', async (req, res) => {
    const bookId = req.body.bookId;

    try {
        const result = await db.query('DELETE FROM books WHERE id = $1', [bookId]);
        if (result.rowCount > 0) {
            console.log(`Book with ID ${bookId} was deleted.`);
            res.redirect('/'); // Redirecting back to the homepage or wherever you list the books
        } else {
            console.log(`Book with ID ${bookId} not found.`);
            res.status(404).send('Book not found');
        }
    } catch (err) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Error deleting the book');
    };
});

app.post('/new_book/:id', async (req, res) => {
    const bookID = req.params.bookID;
    console.log(bookID);
    try {
        let books = getBooks(db, id=bookID);
        console.log(books);
        res.render('book.ejs', {
            data: books[0] 
        });
    } catch (err) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Error editing book');
    };
    
});

app.post('/edited', async (req, res) => {
    const { id, title, author, notes } = req.body;
    if (!id) {
        res.status(400).send('Book ID is missing.');
        return;
    }

    try {
        const updateQuery = `
            UPDATE books
            SET title = $1, author = $2, notes = $3
            WHERE id = $4
        `;

        const result = await db.query(updateQuery, [title, author, notes, id]);

        if (result.rowCount === 0) {
            // No rows were updated, which means no book exists with the provided id
            res.status(404).send('Book not found.');
        } else {
            console.log(`Book with ID ${id} was updated.`);
            res.redirect('/'); // Redirecting back to the homepage or wherever appropriate
        }
    } catch (err) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Failed to update the book');
    };
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
