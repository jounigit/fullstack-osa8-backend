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
    bookCount: () => books.length,
    authorCount: () => authors.length,
    allBooks: (root, args) => {
      let booksWanted

      if (args.author && args.genre) {
        booksWanted = books.filter(b => b.author === args.author)
        return booksWanted.filter(b => b.genres.includes(args.genre))
      }
      else if (args.author) {
        return books.filter(b => b.author === args.author)
      }
      else if (args.genre) {
        return books.filter(b => b.genres.includes(args.genre))
      }
      else {
        const authorObj = Author.findOne({name: "Martin Fowler"})
        console.log('Auth obj:: ', authorObj)
        return Book.find({})
      }
    },
    allAuthors: () => Author.find({}),
    findAuthor: (root, args) =>  Author.findOne({name: args.name})
  },
  Author: {
    bookCount: (root) => {
      return books.filter(b => b.author === root.name).length
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
    editAuthor: (root, args) => {
      console.log('EDIT:: ', args)
      const author = authors.find(a => a.name === args.name)
      if (!author) {
        return null
      }

      const updatedAuthor = { ...author, born: args.setBornTo }
      authors = authors.map(a => a.name === args.name ? updatedAuthor : a)
      return updatedAuthor
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
