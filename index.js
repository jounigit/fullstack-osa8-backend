const { ApolloServer, gql } = require('apollo-server')
const mongoose = require('mongoose')
const Book = require('./models/book')
const Author = require('./models/author')
const uuid = require('uuid/v1')

mongoose.set('useFindAndModify', false)

const MONGODB_URI = 'mongodb://fullstack8:Fjwid2DttdeQ6Y2@ds231549.mlab.com:31549/graphql'

console.log('connecting to ', MONGODB_URI)

mongoose.connect(MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

const typeDefs = gql`
  type Mutation {
	  addBook(
  	   title: String!
  	   published: Int!
  	   author: String!
  	   genres: [String!]
    ): Book

    editAuthor(
      name: String!
      setBornTo: Int
    ): Author
  }

  type Book {
	  title: String!
	  published: Int!
	  author: Author!
	  genres: [String!]
      id: ID!
  }

  type Author {
	  name: String!
	  born: Int
	  id: ID!
	  bookCount: Int
  }

  type Query {
	  bookCount: Int!
	  authorCount: Int!
	  allBooks(author: String, genre: String): [Book!]!
	  allAuthors: [Author!]!
    findAuthor(name: String!): Author
  }
`

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      let booksWanted

      if (args.author && args.genre) {
        booksWanted = books.filter(b => b.author === args.author)
        return booksWanted.filter(b => b.genres.includes(args.genre))
      }
      else if (args.author) {
        return books.filter(b => b.author === args.author)
      }
      else if (args.genre) {
        const books = await Book.find( { genres: { $in: [ args.genre ] } } )
        return books
      }
      else {
        return Book.find({})
      }
    },
    allAuthors: () => Author.find({}),
    findAuthor: (root, args) =>  Author.findOne({name: args.name})
  },
  Author: {
    bookCount: async (root) => {
      const books = await Book.find( { author: { $in: [ root._id ] } } )
      return books.length
    }
  },
  Mutation: {
    addBook: async (root, args) => {
      console.log('AddBook:: ', args)
      const authorObj = await Author.findOne({name: args.author})
      console.log('Auth obj:: ', authorObj)
      const book = new Book({ ...args, author: authorObj })
      return book.save()
    },
    editAuthor: async (root, args) => {
      console.log('EDIT:: ', args)
      const author = await Author.findOne({name: args.name})
      if (!author) {
        return null
      }
      author.born = args.setBornTo
      console.log('NEW AUTHOR:: ', author)
      return author.save()
    }
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
