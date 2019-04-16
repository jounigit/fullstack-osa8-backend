const { ApolloServer, UserInputError, AuthenticationError, gql } = require('apollo-server')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')

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

  type User {
  username: String!
  favoriteGenre: String!
  id: ID!
}

type Token {
  value: String!
}

  type Query {
	  bookCount: Int!
	  authorCount: Int!
	  allBooks(author: String, genre: String): [Book!]!
	  allAuthors: [Author!]!
    findAuthor(name: String!): Author
    me: User
  }
  
  input AuthorInput {
  	_id: ID!
  }

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

    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
    createAuthor(
    	name: String!
    ): Author
  }
`

const JWT_SECRET = 'NEED_HERE_A_SECRET_KEY'

const resolvers = {
  //****** QUERIES  *********/ 
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allAuthors: () => Author.find({}),
    findAuthor: (root, args) =>  Author.findOne({name: args.name}),
    me: (root, args, context) => {
      return context.currentUser
    },
    allBooks: async (root, args) => {

      if (args.genre) {
        const books = await Book.find( { genres: { $in: [ args.genre ] } } )
        return books
      }
      else {
        return Book.find({})
      }
    },
  },
  Author: {
    bookCount: async (root) => {
      const books = await Book.find( { author: { $in: [ root._id ] } } )
      return books.length
    }
  },
  //****** MUTATIONS  *********/
  Mutation: {
    createUser: (root, args) => {
      const user = new User({ ...args })
  
      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        })
    },
    createAuthor: (root, args) => {
      const author = new Author({ ...args })
  
      return author.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })
  
      if ( !user || args.password !== 'secred' ) {
        throw new UserInputError("wrong credentials")
      }
  
      const userForToken = {
        username: user.username,
        id: user._id,
      }
  
      return { value: jwt.sign(userForToken, JWT_SECRET) }
    },
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser
 
      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }
      
      
      let authorObj = await Author.findOne({name: args.author})
/**/
      if (!authorObj) {
        const newAuthor = new Author({name: args.author})
        console.log('NEW:: ', newAuthor)
        try {
          const addedA = await newAuthor.save()
          console.log('Added Auth:: ', addedA)
          authorObj = addedA
        } catch (error) {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        }     
      }
      
      console.log('Auth obj:: ', authorObj)
      const book = new Book({ ...args, author: authorObj  })

      try {
        await book.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      return book
    },
    editAuthor: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }
      const author = await Author.findOne({name: args.name})
      if (!author) {
        return null
      }
      author.born = args.setBornTo
      console.log('NEW AUTHOR:: ', author)

      try {
        await author.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      return author
    }
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), JWT_SECRET
      )
      const currentUser = await User.findById(decodedToken.id)
      return { currentUser }
    }
  }
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
